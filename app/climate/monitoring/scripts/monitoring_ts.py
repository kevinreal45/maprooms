import json
import numpy as np
from app.dst_api.scripts import (
    download_rawdata,
    extract_climdata
)
from app.scripts.util import pretty

def climate_monitoring_ts_cumul(params):
    params = _create_params_ts(params)
    data_raw = download_rawdata(params)
    data_raw = json.loads(data_raw)
    if data_raw['status'] != 0: return data_raw
    data_raw['data'] = json.loads(data_raw['data'])
    time_ts = _format_ts_dates(data_raw['data']['Dates'])
    date_ts = ['-'.join(d.split('-')[1:]) for d in time_ts]

    params_mean = _create_params_ts_clim_mean(params)
    data_mean = extract_climdata(params_mean)
    data_mean = json.loads(data_mean)
    if data_mean['status'] != 0: return data_mean
    data_mean['data'] = json.loads(data_mean['data'])
    time_clim = _format_clim_dates(data_mean['data']['Dates'])
    dek_clim = ['-'.join(d.split('-')[1:]) for d in time_clim]

    params_perc = _create_params_ts_clim_perc(params)
    data_perc = extract_climdata(params_perc)
    data_perc = json.loads(data_perc)
    if data_perc['status'] != 0: return data_perc
    data_perc['data'] = json.loads(data_perc['data'])
    # time_clim = _format_clim_dates(data_perc['data']['Dates'])

    lookup_clim = {
        d: i for i, d in enumerate(dek_clim)
    }
    it = np.array([lookup_clim[d] for d in date_ts])
    clim_m = np.array(data_mean['data']['Data'][0]['Values'])
    clim_m = np.cumsum(clim_m[it])
    clim_p = np.column_stack(data_perc['data']['Data'][0]['Values'])
    clim_p = np.cumsum(clim_p[it, :], axis=0)
    ts_d = np.array(data_raw['data']['Data'][0]['Values'])
    ts_d = np.cumsum(ts_d)

    ymin = min(
        np.nanmin(ts_d),
        np.nanmin(clim_m),
        np.nanmin(clim_p)
    )
    ymax = max(
        np.nanmax(ts_d),
        np.nanmax(clim_m),
        np.nanmax(clim_p)
    )
    breaks = pretty(ymin, ymax, 14).tolist()

    ylim = [breaks[0], breaks[-1]]
    ex = (ylim[1] - ylim[0]) * 0.01
    ylim[1] = ylim[1] + ex
    if ylim[0] < 0:
        ylim[0] = 0

    values = np.vstack(
        (ts_d, clim_m, clim_p[:, 0], clim_p[:, 1])
    )
    values = np.where(np.isnan(values), None, values)

    info = {
        'geom': {
            'name': data_mean['data']['Data'][0]['Name'],
            'lon': data_mean['data']['Data'][0]['Longitude'],
            'lat': data_mean['data']['Data'][0]['Latitude']
        },
        'var':{
            'name': 'Cumulative Rainfall',
            'units': 'mm',
            'type': params['variable']
        },
        'time_res': params['temporalRes']
    }

    data = {
        'time': time_ts,
        'values': values.tolist(),
        'info': info,
        'yrange': ylim,
        'yticks': breaks
    }
    return {'status': 0, 'data': data}

def _create_params_ts(params):
    pars_0 = {
        'gridded': False,
        'outFormat': 'JSON-Format',
        'webApp': True,
        'finalOutput': True,
        'httpMethod': 'POST',
    }
    if params['geomExtract'] == 'points':
        pars = pars_0 | {'padLon': 0, 'padLat': 0}
    else:
        pars = pars_0 | {'spatialAvg': True, 'allPolygons': False}
    return pars | params

def _create_params_ts_clim_mean(params):
    pars_0 = {
        'climFunction': 'mean',
        'fullYear': True,
        'climDate': None,
        'outFormat': 'JSON-Format',
        'gridded': False,
        'webApp': True,
        'finalOutput': True,
        'httpMethod': 'POST',
    }
    if params['geomExtract'] == 'points':
        pars = pars_0 | {'padLon': 0, 'padLat': 0}
    else:
        pars = pars_0 | {'spatialAvg': True, 'allPolygons': False}
    return pars | params

def _create_params_ts_clim_perc(params):
    pars_0 = {
        'climFunction': 'percentile',
        'precentileValue': [5.0, 95.0],
        'fullYear': True,
        'climDate': None,
        'outFormat': 'JSON-Format',
        'gridded': False,
        'webApp': True,
        'finalOutput': True,
        'httpMethod': 'POST',
    }
    if params['geomExtract'] == 'points':
        pars = pars_0 | {'padLon': 0, 'padLat': 0}
    else:
        pars = pars_0 | {'spatialAvg': True, 'allPolygons': False}
    return pars | params

def _format_ts_dates(dates_l):
    y = [s[:4] for s in dates_l]
    m = [s[4:6] for s in dates_l]
    dk = [s[6:] for s in dates_l]
    dy = [
            '01' if d == '1'
            else 
            '11' if d == '2'
            else
            '21'
            for d in dk
        ]
    return ['-'.join(l) for l in zip(y, m, dy)]

def _format_clim_dates(dates_l):
    mdk = [t.split('_')[1] for t in dates_l]
    m = [t.split('-')[0] for t in mdk]
    dk = [t.split('-')[1] for t in mdk]
    dy = [
            '01' if d == '1'
            else 
            '11' if d == '2'
            else
            '21'
            for d in dk
        ]
    mdk = ['-'.join(l) for l in zip(m, dy)]
    return [f'2025-{t}' for t in mdk]
