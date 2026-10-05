import os
import numpy as np
from app.dst_api.scripts import aggregate_seasonal_xrdata
from app.misc.scripts.telecon_proba import *
from app.misc.scripts.telecon_seasonal import (
    telecon_oni_seasonal,
    telecon_iod_seasonal,
    telecon_nao_seasonal,
    telecon_atl3_seasonal
)
from app.scripts.util import pretty
from app.scripts.maproom_items import parse_config_yaml_file
from app.scripts._global import GLOBAL_CONFIG
from app.misc.scripts.probabilities import ecdf_smooth_v1, ecdf_smooth_v2

def climate_teleconnections_ts(params):
    params = _create_params_ts(params)
    seas = aggregate_seasonal_xrdata(params)

    var_units = seas['data']['seas_var'].units
    if params['variable'] == 'temperature':
        if var_units in ['C', 'degC']:
            var_units = '°C'
    info_t = _get_info_teleconnections(params)
    info = {
        'geom': {
            'name': seas['data']['name'].values[0].item(),
            'lon': seas['data']['lon'].values[0].item(),
            'lat': seas['data']['lat'].values[0].item()
        },
        'var':{
            'name': info_t['name'],
            'units': var_units,
            'type': params['variable']
        },
        'legend_title': info_t['legend'],
        'time_res': params['temporalRes']
    }

    data_seas = _get_teleconnections_ts(params, seas['data'])
    data = data_seas['data']
    if params['chartType'] == 'telecon-tseries':
        data['info'] = data_seas['info'] | info
    else:
        xs = np.array(data['values'])
        xc = np.array(data['classes'])
        ix = ~np.isnan(xs)
        xs = xs[ix]
        xc = xc[ix]
        xg = {
            c.item(): xs[xc == c]
            for c in np.unique(xc)
        }
        xg[3] = xs
        data_seas['info']['classes'][3] = 'All Years'

        xmn = np.min(xs)
        xmx = np.max(xs)
        ex = 0.05 * (xmx - xmn)
        xmin = float(xmn - ex)
        xmax = float(xmx + ex)

        s_ecdf = {}
        for c in xg:
            xt = ecdf_smooth_v1(
                xg[c], xmin=xmin, xmax=xmax,
                adj=1.0, n=512
            )
            # xt = ecdf_smooth_v2(
            #     xg[c], xmin=xmin, xmax=xmax,
            #     adj=1.0, extend=True, n=512
            # )

            xt['x'] = [round(v, 4) for v in xt['x'].tolist()]
            xt['y'] = [round(v, 4) for v in xt['y'].tolist()]
            s_ecdf[c] = xt

        data['values'] = s_ecdf
        del data['classes']
        del data['time']
        data['info'] = data_seas['info'] | info

    return {'status': 0, 'data': data}

def _get_teleconnections_ts(params, xr_seas):
    terciles = _compute_terciles(xr_seas)

    info_class = map_telecon_classes(params)
    params['minYear'] = params['endYear'] - params['startYear']
    start_date = f"{params['startYear'] - 1}-01"
    end_date = f"{params['endYear'] + 1}-12"

    if params['teleconIndex'] == 'iod':
        sst_prod = 'ersstv5_ncei'
        # sst_prod = 'ersstv6_ncei'

        df_seas = telecon_iod_seasonal(
            params, sst_prod,
            start_date, end_date,
            False
        )

    if params['teleconIndex'] == 'nao':
        df_seas = telecon_nao_seasonal(
            params,
            start_date, end_date,
            False
        )

    if params['teleconIndex'] == 'atl3':
        df_seas = telecon_atl3_seasonal(
            params,
            start_date, end_date,
            False
        )

    if params['teleconIndex'] == 'enso':
        # sst_prod = 'oisstv21_cpc'
        sst_prod = 'ersstv5_cpc'
        # sst_prod = 'ersstv5_ncei'
        # sst_prod = 'ersstv6_ncei'

        df_seas = telecon_oni_seasonal(
            params, sst_prod,
            start_date, end_date,
            False
        )

    df_indices = classify_telecon_index(
        df_seas, info_class['telecon']['threshold']
    )
    years = np.intersect1d(
        xr_seas.year.values, df_indices['year'].values
    )
    df_indices = (
        df_indices.set_index('year')
                  .loc[years]
                  .reset_index()
    )

    xr_seas = xr_seas.sel(year=years)
    values = xr_seas['seas_var'].values[:, 0]
    vmin = np.nanmin(values)
    vmax = np.nanmax(values)
    breaks = pretty(vmin, vmax, 14).tolist()
    ylim = [breaks[0], breaks[-1]]
    ex = (ylim[1] - ylim[0]) * 0.01
    ylim[1] = ylim[1] + ex
    values = np.where(np.isnan(values), None, values)
    data = {
        'time': df_indices['year'].to_numpy().tolist(), 
        'classes': df_indices['class'].to_numpy().tolist(),
        'values': [round(x, 1) for x in values.tolist()],
        'yrange': ylim,
        'yticks': breaks,
        'terciles': terciles
    }
    return {
            'data': data,
            'info': {'classes': info_class['telecon']['classes']}
        }

def _compute_terciles(xr_seas):
    xr_ds = xr_seas.copy()
    # interpolated quantiles
    t1 = xr_ds.quantile(1/3, dim='year')
    t2 = xr_ds.quantile(2/3, dim='year')
    return [
            np.round(t1['seas_var'].values[0], 1).item(),
            np.round(t2['seas_var'].values[0], 1).item()
        ]

def _create_params_ts(params):
    if params['geomExtract'] == 'points':
        pars = {'padLon': 0, 'padLat': 0}

    if params['geomExtract'] == 'polygons':
        pars = {'spatialAvg': True, 'allPolygons': False}

    return pars | params

def _get_info_teleconnections(params):
    app_dir = GLOBAL_CONFIG['app_dir']
    telecon_dir = os.path.join(app_dir, 'climate', 'analysis')
    tmp = parse_config_yaml_file(telecon_dir, 'teleconnections.yaml')
    tmp_n = tmp['clim_variables']
    name = tmp_n[params['variable']][params['climVariable']]
    tmp_l = tmp['opt_variables_analysis']
    legend = tmp_l['phases'][params['teleconIndex']]['label']
    return {'name': name, 'legend': legend}
