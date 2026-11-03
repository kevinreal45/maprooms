import os
import numpy as np
import xarray as xr
from datetime import datetime
from app.scripts._global import GLOBAL_CONFIG
from app.dst_api.scripts import get_zarr_clim
from app.scripts.util import load_yaml_file

from app.scripts.colorbar import check_invalid_colors
from app.scripts.imagepng import (
    create_imagePng,
    extremes_imagePng
)
from app.misc.scripts.blank_data import (
    blank_numpy_dict,
    blank_xarray_dataarray
)

def climate_forecast_10days_data(params):
    check = check_invalid_colors(params['colorbar'])
    if check['status'] == -1: return check

    if params['variable'] == 'rainfall':
        if params['parameter'] == 'TotRain':
            return create_forecast_10days_data(params)
        elif params['parameter'] == 'HeavyRain':
            return create_forecast_10days_extreme(params)
        elif params['parameter'] == 'AnomRain':
            return create_forecast_10days_anomaly(params)
        else:
            return {'status': -1, 'message': f'Unknown parameter: {params["parameter"]}'}
    elif params['variable'] == 'temperature':
        if params['parameter'] in ['MeanTemp', 'MinTemp', 'MaxTemp']:
            return create_forecast_10days_data(params)
        elif params['parameter'] == 'AnomTemp':
            return create_forecast_10days_anomaly(params)
        else:
            return {'status': -1, 'message': f'Unknown parameter: {params["parameter"]}'}
    else:
        return {'status': -1, 'message': f'Unknown variable: {params["variable"]}'}

def create_forecast_10days_extreme(params):
    info = GLOBAL_CONFIG['forecast_data']['tendays']
    fcst_pth = os.path.join(info['dir'], params['issued'])
    fcst_file = os.path.join(fcst_pth, 'PrecExtreme.nc')
    if not os.path.exists(fcst_file):
        msg = 'No file PrecExtreme.nc found'
        return {'status': -1, 'message': msg}

    ds = xr.open_dataset(fcst_file)
    data = {
        'lon': ds[info['dimname']['lon']].values,
        'lat': ds[info['dimname']['lat']].values
    }
    categories = ('f90', 'f95', 'f99')
    for name in categories:
        data[name] = ds[name].load().values

    dims = {'lon': 'lon', 'lat': 'lat', 'data': 'f90'}
    data = blank_numpy_dict(data, dims=dims, buffer=True)
    data['f95'][np.isnan(data['f90'])] = np.nan
    data['f99'][np.isnan(data['f90'])] = np.nan

    colors = {
        'f90': '#afeeee',
        'f95': '#1874cd',
        'f99': '#00008b',
    }
    labels = {
        'f90': 'Heavy Rainfall',
        'f95': 'Very Heavy Rainfall',
        'f99': 'Extremely Heavy Rainfall'
    }

    map_png = extremes_imagePng(data, categories, labels, colors)
    return {'status': 0, 'data': map_png}

def create_forecast_10days_data(params):
    fcst_obj = {
        'TotRain': {
            'file': 'PrecDaily.nc',
            'function': 'sum',
            'title': 'Total rainfall (mm)',
            'correction': 0
        },
        'MeanTemp': {
            'file': 'TavgDaily.nc',
            'function': 'mean',
            'title': 'Mean temperature (°C)',
            'correction': 0
        },
        'MinTemp': {
            'file': 'TminDaily.nc',
            'function': 'mean',
            'title': 'Minimum temperature (°C)',
            'correction': -5.0
        },
        'MaxTemp': {
            'file': 'TmaxDaily.nc',
            'function': 'mean',
            'title': 'Maximum temperature (°C)',
            'correction': 5.5
        }
    }
    obj = fcst_obj[params['parameter']]

    info = GLOBAL_CONFIG['forecast_data']['tendays']
    fcst_pth = os.path.join(info['dir'], params['issued'])
    fcst_file = os.path.join(fcst_pth, obj['file'])
    if not os.path.exists(fcst_file):
        msg = f'No file {obj["file"]} found'
        return {'status': -1, 'message': msg}

    data = _get_forecast_10days_data(
        fcst_file, info, obj['function'], obj['correction']
    )
    if data is None:
        msg = 'Unknown aggregation function'
        return {'status': -1, 'message': msg}

    data = blank_numpy_dict(data, buffer=True)
    map_png = _create_fcst_image(data, params)
    map_png['ckeys']['title'] = obj['title']
    map_png['date'] = f"Forecast for {data['start']} -> {data['end']}"
    return {'status': 0, 'data': map_png}

def create_forecast_10days_anomaly(params):
    fcst_obj = {
        'rainfall': {
            'file': 'PrecDaily.nc',
            'function': 'sum',
            'title': 'Total rainfall anomaly (mm)',
            'correction': 0
        },
        'temperature': {
            'file': 'TavgDaily.nc',
            'function': 'mean',
            'title': 'Mean temperature anomaly (°C)',
            'correction': 0
        }
    }
    obj = fcst_obj[params['variable']]
    params['function'] = obj['function']

    info = GLOBAL_CONFIG['forecast_data']['tendays']
    fcst_pth = os.path.join(info['dir'], params['issued'])
    fcst_file = os.path.join(fcst_pth, obj['file'])
    if not os.path.exists(fcst_file):
        msg = f'No file {obj["file"]} found'
        return {'status': -1, 'message': msg}

    data_fcst = _get_forecast_10days_data(
        fcst_file, info, obj['function'], obj['correction']
    )
    if data_fcst is None:
        msg = 'Unknown aggregation function (fcst)'
        return {'status': -1, 'message': msg}

    data_clim = _get_observation_10days_climatology(params)
    if data_clim is None:
        msg = 'Unknown aggregation function (obs)'
        return {'status': -1, 'message': msg}

    data_anom = _compute_10days_forecast_anomaly(
        data_fcst, data_clim, method='linear'
    )
    data_anom = blank_numpy_dict(data_anom, buffer=False)
    map_png = _create_fcst_image(data_anom, params)
    map_png['ckeys']['title'] = obj['title']
    map_png['date'] = f"Forecast for {data_fcst['start']} -> {data_fcst['end']}"
    return {'status': 0, 'data': map_png}

def _compute_10days_forecast_anomaly(data_fcst, data_clim, method='linear'):
    clim = xr.DataArray(
        data_clim['data'],
        dims=('lat', 'lon'),
        coords={
            'lat': data_clim['lat'],
            'lon': data_clim['lon'],
        },
    )
    clim_regridded = clim.interp(
        lat=data_fcst['lat'],
        lon=data_fcst['lon'],
        method=method,
    ).transpose('lat', 'lon')
    anom = np.asarray(data_fcst['data']) - clim_regridded.values
    return {
        'lon': data_fcst['lon'],
        'lat': data_fcst['lat'],
        'data': anom
    }

def _get_forecast_10days_data(fcst_file, info, function, correction):
    da = xr.open_dataarray(fcst_file)
    if function == 'sum':
        data = da.sum(info['dimname']['time'], skipna=True)
    elif function == 'mean':
        data = da.mean(info['dimname']['time'], skipna=True)
    else:
        return None

    data = (data + correction).load().values
    lon = da[info['dimname']['lon']].values
    lat = da[info['dimname']['lat']].values
    dates = da[info['dimname']['time']].values.astype('datetime64[D]')
    start = np.datetime_as_string(dates.min(), unit='D')
    end = np.datetime_as_string(dates.max(), unit='D')
    return {
        'lon': lon,
        'lat': lat,
        'data': data,
        'start': str(start),
        'end': str(end)
    }

def _get_observation_10days_climatology(params):
    dset = params['dataset_obs']
    variables = GLOBAL_CONFIG['datasets'][dset]['variables']
    if params['variable'] == 'rainfall':
        precip_var = variables['rainfall']
        data_clim = get_zarr_clim(
            dset, 'daily', precip_var, 'mean-stdev'
        )
        data_clim = data_clim.sel(statistics=0)
        data_clim = data_clim[precip_var]
    else:
        tmax_var = variables['maximum_temperature']
        tmax_clim = get_zarr_clim(
            dset, 'daily', tmax_var, 'mean-stdev'
        )
        tmax_clim = tmax_clim.sel(statistics=0)
        tmax_clim = tmax_clim[tmax_var]
        tmin_var = variables['minimum_temperature']
        tmin_clim = get_zarr_clim(
            dset, 'daily', tmin_var, 'mean-stdev'
        )
        tmin_clim = tmin_clim.sel(statistics=0)
        tmin_clim = tmin_clim[tmin_var]
        data_clim = ((tmax_clim + tmin_clim) / 2).rename('tmean')
        data_clim.attrs = {
            'units': 'C',
            'long_name': 'Mean temperature'
        }

    info = GLOBAL_CONFIG['forecast_data']['tendays']
    fcst_pth = os.path.join(info['dir'], params['issued'])
    info_file = os.path.join(fcst_pth, 'info.yaml')
    fcst_info = load_yaml_file(info_file)
    start_day = _day_of_year(fcst_info['start_date'])
    end_day = _day_of_year(fcst_info['end_date'])

    data_agg = _aggregate_day_range(
        data_clim, start_day, end_day, params['function']
    )

    if data_agg is not None:
        return {
            'lon': data_agg['lon'].values,
            'lat': data_agg['lat'].values,
            'data': data_agg.load().values
        }
    return None

def _create_fcst_image(data, params):
    if params['colorbar']['color_type'] == 'preset':
        map_png = create_imagePng(
            data,
            breaks=params['colorbar']['break_cbar'],
            color_name=params['colorbar']['color_cbar'],
            colors_ext=params['colorbar']['color_ext']
        )
    else:
        map_png = create_imagePng(
            data,
            breaks=params['colorbar']['break_cbar'],
            colors=params['colorbar']['color_cbar'],
            colors_ext=params['colorbar']['color_ext']
        )
    return map_png

def _day_of_year(date_str):
    date = datetime.strptime(date_str, '%Y-%m-%d')
    if date.month == 2 and date.day == 29:
        date = date.replace(day=28)
    return date.replace(year=2001).timetuple().tm_yday

def _aggregate_day_range(data_clim, start_day, end_day, function):
    day = data_clim['time']

    if start_day <= end_day:
        mask = (day >= start_day) & (day <= end_day)
    else:
        mask = (day >= start_day) | (day <= end_day)

    tmp = data_clim.where(mask, drop=True)
    if function == 'sum':
        agg = tmp.sum(dim='time', skipna=True, keep_attrs=True)
    elif function == 'mean':
        agg = tmp.mean(dim='time', skipna=True, keep_attrs=True)
    else:
        agg = None
    return agg
