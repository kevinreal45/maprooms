import numpy as np
from datetime import datetime

from app.dst_api.scripts import (
    download_rawdata,
    download_analysis
)
from app.dst_api.scripts import (
    get_zarr_dataset,
    get_zarr_clim
)
from app.scripts.util import parse_json_spatial_data

from app.scripts.colorbar import check_invalid_colors
from app.scripts.imagepng import create_imagePng
from app.scripts.util import pretty

def climate_monitoring_sp_data(params):
    check = check_invalid_colors(params['colorbar'])
    if check['status'] == -1: return check

    data = get_climate_monitoring_sp_data(params)
    if data['status'] == -1: return data

    anom = ['anom_dek', 'anom_cumul', 'anom_mon', 'anom_seas']
    anom_per = ['anom_per_dek', 'anom_per_cumul', 'anom_per_mon', 'anom_per_seas']
    if params['map_variable'] in anom + anom_per:
        if params['colorbar']['break_type'] == 'default':
            vmin = np.nanmin(data['data'])
            vmax = np.nanmax(data['data'])
            val_max = np.maximum(np.abs(vmin), np.abs(vmax))
            if params['map_variable'] in anom_per:
                if val_max > 500:
                    val_max = 500
            breaks = pretty(-val_max, val_max, 15).tolist()
            px = breaks[1] - breaks[0]
            bx = np.arange(px / 2, breaks[-1] + px, px)
            breaks = np.concatenate((-np.flip(bx), bx)).tolist()
            params['colorbar']['break_cbar'] = breaks

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

    map_png['date'] = data['date']
    if data['units'] == '':
        map_png['ckeys']['title'] = data['longname']
    else:
        map_png['ckeys']['title'] = f"{data['longname']} ({data['units']})"

    return {'status': 0, 'data': map_png}

def get_climate_monitoring_sp_data(params):
    if params['map_variable'] in ['rain_dek', 'rain_mon', 'rain_seas']:
        params = _create_params_sp_raw(params)
        json_data = download_rawdata(params)
        data = parse_json_spatial_data(json_data, 'Date')
    elif params['map_variable'] in [
        'anom_dek', 'anom_per_dek',
        'anom_mon', 'anom_per_mon',
        'anom_seas', 'anom_per_seas'
    ]:
        params = _create_params_sp_anom(params)
        json_data = download_analysis(params)
        data = parse_json_spatial_data(json_data, 'Date')
    elif params['map_variable'] in ['spi_dek', 'spi_mon', 'spi_seas']:
        params = _create_params_sp_spi(params)
        json_data = download_analysis(params)
        data = parse_json_spatial_data(json_data, 'Date')
    elif params['map_variable'] == 'rain_cumul':
        cumul, _ = _get_cumul_zarr_data(params)
        data = _get_cumul_spatial_data(
            cumul, cumul.values, params,
            'Cumulative Rainfall',
            'mm', 'rain_cumul'
        )
    elif params['map_variable'] == 'anom_cumul':
        cumul, mean = _get_cumul_zarr_data(params)
        data = _get_cumul_spatial_data(
            cumul, (cumul - mean).values, params,
            'Cumulative Rainfall Anomaly',
            'mm', 'anom_cumul'
        )
    elif params['map_variable'] == 'anom_per_cumul':
        cumul, mean = _get_cumul_zarr_data(params)
        miss = cumul.isnull()
        mask = mean < 10e-5
        mean = np.ma.masked_array(mean, mask=mask)
        anom = 100 * (cumul - mean)/mean
        anom = anom.where(~mask, 0.0)
        anom = anom.where(~miss)
        data = _get_cumul_spatial_data(
            cumul, anom.values, params,
            'Cumulative Rainfall Anomaly',
            '%', 'anom_cumul'
        )
    else:
        return {
            'status': -1,
            'message': 'Unknown variable'
        }

    return data

def _create_params_sp_raw(params):
    params['variable'] = params['variable'][0]
    pars = {
        'geomExtract': 'original',
        'outFormat': 'JSON-Format',
        'gridded': True,
        'webApp': True,
        'finalOutput': True,
        'httpMethod': 'POST'
    }
    return pars | params

def _create_params_sp_anom(params):
    params['variable'] = params['variable'][0]
    pars = {
        'startYear': 1991,
        'endYear': 2020,
        'minYear': 30,
        'analysis': 'anomaly',
        'geomExtract': 'original',
        'outFormat': 'JSON-Format',
        'climFunction': 'mean-stdev',
        'seasStats': 'mean-stdev',
        'fullYear': True,
        'climDate': None,
        'gridded': True,
        'webApp': True,
        'httpMethod': 'POST',
        'outFormat_0': 'JSON-Format'
    }
    return pars | params

def _create_params_sp_spi(params):
    params['variable'] = params['variable'][0]
    pars = {
        'geomExtract': 'original',
        'outFormat': 'JSON-Format',
        'gridded': True,
        'webApp': True,
        'httpMethod': 'POST',
        'outFormat_0': 'JSON-Format'
    }
    return pars | params

def _get_cumul_spatial_data(
    cumul, values, params,
    varname, varunit, varid
):
    return {
        'status': 0,
        'date': params['Date'],
        'lon': cumul['lon'].values,
        'lat': cumul['lat'].values,
        'data': values,
        'longname': f"{varname} from {params['startDekad']}",
        'units': varunit,
        'varid': varid,
        'dimensions': {
            'Latitude': cumul.sizes['lat'],
            'Longitude': cumul.sizes['lon']
        }
    }

def _get_cumul_zarr_data(params):
    params_var = {
        k: params[k]
        for k in ['temporalRes', 'dataset']
    }
    pvar = params['variable'][0]
    params_var['variable'] = pvar
    data_var = get_zarr_dataset(params_var)
    da_var = data_var[pvar]

    d1 = _dekad_to_days(params['startDekad'])
    d2 = _dekad_to_days(params['Date'])
    da_var = da_var.sel(time=slice(d1, d2))
    nomiss = da_var.notnull().sum(dim='time')
    frac = nomiss / da_var.sizes['time']
    sum_var = da_var.sum(dim='time', skipna=True)
    sum_var = sum_var.where(frac >= params['minFrac'], np.nan)

    data_clim = get_zarr_clim(
        params['dataset'],
        params['temporalRes'],
        pvar, 'mean-stdev'
    )
    data_clim = data_clim.sel(statistics=0)
    da_mean = data_clim[pvar]
    dek = _dekad_clim(
        params['startDekad'], params['Date']
    )
    da_mean = da_mean.sel(time=dek)
    da_mean = da_mean.sum(dim='time', skipna=True)
    return sum_var, da_mean

def _dekad_to_days(dekad):
    dek = datetime.strptime(dekad, '%Y-%m-%d')
    dk = int(dek.strftime('%d'))
    dek = dek.replace(day = (dk - 1) * 10 + 6)
    return  np.datetime64(dek)

def _dekad_position(dekad):
    dek = dekad.split('-')
    _, m, d = map(int, dek)
    return (m - 1) * 3 + d

def _dekad_next(year, month, dekad):
    if dekad < 3:
        return year, month, dekad + 1
    if month < 12:
        return year, month + 1, 1
    return year + 1, 1, 1

def _dekad_clim(start, end):
    y1, m1, d1 = map(int, start.split('-'))
    y2, m2, d2 = map(int, end.split('-'))
    y, m, d = y1, m1, d1

    dek = []
    while (y, m, d) <= (y2, m2, d2):
        dek.append((m - 1) * 3 + d)
        y, m, d = _dekad_next(y, m, d)
    return dek
