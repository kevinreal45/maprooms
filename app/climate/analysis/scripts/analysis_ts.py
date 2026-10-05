import json
import numpy as np
from datetime import datetime
from dataclasses import asdict
from app.dst_api.scripts import (
    download_climdata,
    extract_climdata,
    download_analysis,
    download_rawdata,
    is_climato_normals,
    download_analysis_dailydata,
    download_analysis_dailyanom
)
from app.misc.scripts.probabilities import (
    ecdf_ts, kde_ts,
    ecdf_smooth_v1,
    ecdf_smooth_v2,
    fit_distributions,
    select_best_distribution
)
from app.misc.scripts.regression import linear_model
from app.scripts.util import pretty

def climate_analysis_ts_rawdata(params):
    raw_ts = _download_ts_rawdata(params)
    if raw_ts['status'] == -1: return raw_ts

    time = raw_ts['data']['time']
    values = raw_ts['data']['values']
    info = raw_ts['data']['info']

    if ~np.all(np.isnan(values)):
        vmin = np.nanmin(values)
        vmax = np.nanmax(values)
        if params['variable'] == 'precip': vmin = 0
        breaks = pretty(vmin, vmax, 14).tolist()
        ylim = [breaks[0], breaks[-1]]
        ex = (ylim[1] - ylim[0]) * 0.01
        ylim[1] = ylim[1] + ex
        values = np.where(np.isnan(values), None, values)
        data = {
            'time': time,
            'values': values.tolist(),
            'info': info,
            'yrange': ylim,
            'yticks': breaks
        }

        return {'status': 0, 'data': data}
    else:
        if params['geomExtract'] == 'points':
            lon = info['geom']['lon']
            lat = info['geom']['lat']
            crd = f'point (Longitude: {lon}, Latitude: {lat})'
        else:
            crd = f'polygon ({info['geom']['name']})'

        msg = f'All data are missing for {crd}'
        return {'status': -1, 'message': msg}

def climate_analysis_ts_anomaly(params):
    if not 'dailyAnalysis' in params:
        params['dailyAnalysis'] = False

    if params['dailyAnalysis']:
        params = _create_params_daily_anom(params)
        json_data = download_analysis_dailyanom(params)
    else:    
        params = _create_params_ts_anom(params)
        json_data = download_analysis(params)

    json_data = json.loads(json_data)
    if json_data['status'] != 0: return json_data
    json_data['data'] = json.loads(json_data['data'])

    time = json_data['data']['Dates']
    time = _format_ts_dates(time, params['temporalRes'])
    if time is None:
        return {
            'status': -1,
            'message': 'Unknown temporal resolution'
        }

    miss = json_data['data']['Missing']
    values = json_data['data']['Data'][0]['Values']
    values = np.array(values)
    values[values == miss] = np.nan

    seasL = None
    if params['temporalRes'] == 'seasonal':
        seasL = params['seasLength']

    seasDaily = None
    if params['dailyAnalysis']:
        seasDaily = json_data['data']['Dates'][0]

    info = {
        'geom': {
            'name': json_data['data']['Data'][0]['Name'],
            'lon': json_data['data']['Data'][0]['Longitude'],
            'lat': json_data['data']['Data'][0]['Latitude']
        },
        'var':{
            'name': json_data['data']['VariableName'],
            'units': json_data['data']['VariableUnits'],
            'type': params['variable']
        },
        'time_res': params['temporalRes'],
        'seas_len': seasL,
        'seas_daily': seasDaily
    }

    if ~np.all(np.isnan(values)):
        vmin = np.nanmin(values)
        vmax = np.nanmax(values)
        val_max = np.maximum(np.abs(vmin), np.abs(vmax))
        breaks = pretty(-val_max, val_max, 14).tolist()
        ylim = np.array([breaks[0], breaks[-1]])
        ylim = ylim + ((ylim[1] - ylim[0]) * 0.01) * np.array([-1, 1])
        values = np.where(np.isnan(values), None, values)
        data = {
            'time': time,
            'values': values.tolist(),
            'info': info,
            'yrange': ylim.tolist(),
            'yticks': breaks
        }

        return {'status': 0, 'data': data}
    else:
        if params['geomExtract'] == 'points':
            lon = info['geom']['lon']
            lat = info['geom']['lat']
            crd = f'point (Longitude: {lon}, Latitude: {lat})'
        else:
            crd = f'polygon ({info['geom']['name']})'

        msg = f'Anomaly: All data are missing for {crd}'
        return {'status': -1, 'message': msg}

def climate_analysis_ts_climato(params):
    one_var = True
    clim_normal = is_climato_normals(params)
    if 'chartType' in params:
        one_var = params['chartType'] == 'one'

    if one_var:
        params_mean = _create_params_ts_clim_mean(params)
        if clim_normal:
            data_mean = extract_climdata(params_mean)
        else:
            data_mean = download_climdata(params_mean)

        data_mean = json.loads(data_mean)
        if data_mean['status'] != 0: return data_mean

        params_perc = _create_params_ts_clim_perc(params)
        if clim_normal:
            data_perc = extract_climdata(params_perc)
        else:
            data_perc = download_climdata(params_perc)

        data_perc = json.loads(data_perc)
        if data_perc['status'] != 0: return data_perc

        data_mean['data'] = json.loads(data_mean['data'])
        data_perc['data'] = json.loads(data_perc['data'])

        time = data_mean['data']['Dates']
        time = _format_clim_dates(time, params['temporalRes'])
        if time is None:
            return {
                'status': -1,
                'message': 'Unknown temporal resolution'
            }

        miss_mean = data_mean['data']['Missing']
        values_mean = data_mean['data']['Data'][0]['Values']
        values_mean = np.array(values_mean)
        values_mean[values_mean == miss_mean] = np.nan

        miss_perc = data_perc['data']['Missing']
        values_perc = data_perc['data']['Data'][0]['Values']
        values_perc = np.array(values_perc)
        values_perc[values_perc == miss_mean] = np.nan

        values = np.vstack((values_mean, values_perc))

        info = {
            'geom': {
                'name': data_mean['data']['Data'][0]['Name'],
                'lon': data_mean['data']['Data'][0]['Longitude'],
                'lat': data_mean['data']['Data'][0]['Latitude']
            },
            'var':{
                'name': data_mean['data']['VariableName'].split(', ')[1],
                'units': data_mean['data']['VariableUnits'],
                'type': params['variable']
            },
            'time_res': params['temporalRes']
        }

        if ~np.all(np.isnan(values)):
            breaks, ylim = _get_axis_breaks(values)
            values = np.where(np.isnan(values), None, values)
            data = {
                'time': time,
                'values': values.tolist(),
                'info': info,
                'chartType': params['chartType'],
                'yrange': ylim,
                'yticks': breaks
            }

            return {'status': 0, 'data': data}
        else:
            if params['geomExtract'] == 'points':
                lon = info['geom']['lon']
                lat = info['geom']['lat']
                crd = f'point (Longitude: {lon}, Latitude: {lat})'
            else:
                crd = f'polygon ({info['geom']['name']})'

            msg = f'Climatology: All data are missing for {crd}'
            return {'status': -1, 'message': msg}
    else:
        variables = ['precip', 'tmin', 'tmax']
        values = []
        info_var = {}
        for var in variables:
            params_mean = _create_params_ts_clim_mean(params)
            params_mean['variable'] = var
            if clim_normal:
                data_mean = extract_climdata(params_mean)
            else:
                data_mean = download_climdata(params_mean)
            data_mean = json.loads(data_mean)
            if data_mean['status'] != 0: return data_mean

            data_mean['data'] = json.loads(data_mean['data'])

            time = data_mean['data']['Dates']
            time = _format_clim_dates(time, params['temporalRes'])
            if time is None:
                return {
                    'status': -1,
                    'message': 'Unknown temporal resolution'
                }

            info_var[var] = {
                'name': data_mean['data']['VariableName'].split(', ')[1],
                'units': data_mean['data']['VariableUnits'],
                'type': var
            }

            miss_mean = data_mean['data']['Missing']
            values_mean = data_mean['data']['Data'][0]['Values']
            values_mean = np.array(values_mean)
            values_mean[values_mean == miss_mean] = np.nan
            values += [values_mean]

        info_tmp = {'var': info_var['tmax'].copy()}
        info_tmp['var']['name'] = info_tmp['var']['name'].replace('maximum', '')
        info_var = info_tmp | info_var
        info_geom = {
            'geom': {
                'name': data_mean['data']['Data'][0]['Name'],
                'lon': data_mean['data']['Data'][0]['Longitude'],
                'lat': data_mean['data']['Data'][0]['Latitude']
            }
        }
        info = info_geom | info_var
        info['time_res'] = params['temporalRes']

        values = np.array(values)
        if ~np.all(np.isnan(values)):
            breaks1, ylim1 = _get_axis_breaks(values[0])
            breaks2, ylim2 = _get_axis_breaks(values[1:])
            values = np.where(np.isnan(values), None, values)
            data = {
                'time': time,
                'values': values.tolist(),
                'info': info,
                'chartType': params['chartType'],
                'yrange1': ylim1,
                'yticks1': breaks1,
                'yrange2': ylim2,
                'yticks2': breaks2
            }

            return {'status': 0, 'data': data}
        else:
            if params['geomExtract'] == 'points':
                lon = info['geom']['lon']
                lat = info['geom']['lat']
                crd = f'point (Longitude: {lon}, Latitude: {lat})'
            else:
                crd = f'polygon ({info['geom']['name']})'

            msg = f'Climatology: All data are missing for {crd}'
            return {'status': -1, 'message': msg}

def climate_analysis_ts_proba(params):
    raw_ts = _download_ts_rawdata(params)
    if raw_ts['status'] == -1: return raw_ts

    time = raw_ts['data']['time']
    values = raw_ts['data']['values']
    info = raw_ts['data']['info']

    if ~np.all(np.isnan(values)):
        p_ecdf = ecdf_ts(values)
        s_ecdf = ecdf_smooth_v2(
            values, adj=1.0, extend=True, n=512
        )
        kde = kde_ts(values, adj=1.0, n=512)

        distr_positive = (
            'norm', 'snorm', 'lnorm', 'exp',
            'gamma', 'weibull', 'gumbel'
        )

        if params['temporalRes'] == 'seasonal':
            if params['variable'] == 'precip':
                distr_list = distr_positive
            else:
                distr_list = ('norm',)

        if params['temporalRes'] == 'daily':
            non_positive = ['MeanTemp', 'MinTemp', 'MaxTemp']
            if params['seasParams'] in non_positive:
                distr_list = ('norm',)
            else:
                distr_list = distr_positive

        p_fits = fit_distributions(
            p_ecdf['x'], distr=distr_list, method='mle'
        )
        p_sel, gof = select_best_distribution(
            p_fits, p_ecdf['x'], gof_stat='ad'
        )

        vmin = np.nanmin(values)
        vmax = np.nanmax(values)
        breaks = pretty(vmin, vmax, 14).tolist()

        xlim = [breaks[0], breaks[-1]]
        ex1 = (xlim[1] - xlim[0]) * 0.01
        xlim[0] = xlim[0] - ex1
        xlim[1] = xlim[1] + ex1
        ex5 = (xlim[1] - xlim[0]) * 0.05
        xmin = xlim[0] - ex5
        xmax = xlim[1] + ex5

        fit_x = np.linspace(xmin, xmax, 512)
        fit_y = p_sel.exceedance(fit_x)
        fit_pdf = p_sel.pdf(fit_x)

        cdf = {
            'empirical': {
                k: np.round(v, decimals=6).tolist()
                for k, v in p_ecdf.items()
            },
            'smoothed': {
                k: np.round(v, decimals=6).tolist()
                for k, v in s_ecdf.items()
            },
            'fitted': {
                'x': np.round(fit_x, decimals=6).tolist(),
                'y': np.round(fit_y, decimals=6).tolist()
            }
        }

        pdf = {
            'kde': {
                k: np.round(v, decimals=6).tolist()
                for k, v in kde.items()
            },
            'fitted': {
                'x': np.round(fit_x, decimals=6).tolist(),
                'y': np.round(fit_pdf, decimals=6).tolist()
            }
        }

        info['proba'] = asdict(p_sel)
        xlabel = f"{info['var']['name']} ({info['var']['units']})"
        info['labels'] = {
            'cdf': {
                'x': xlabel,
                'y': 'Probability of exceeding'
            },
            'pdf': {
                'x': xlabel,
                'y': 'Density'
            }
        }

        values = np.where(np.isnan(values), None, values)
        data = {
            'ts': values.tolist(),
            'cdf': cdf,
            'pdf': pdf,
            'info': info,
            'xrange': xlim,
            'xticks': breaks
        }

        return {'status': 0, 'data': data}
    else:
        if params['geomExtract'] == 'points':
            lon = info['geom']['lon']
            lat = info['geom']['lat']
            crd = f'point (Longitude: {lon}, Latitude: {lat})'
        else:
            crd = f'polygon ({info['geom']['name']})'

        msg = f'All data are missing for {crd}'
        return {'status': -1, 'message': msg}

def climate_analysis_ts_season(params):
    raw_ts = _download_ts_rawdata(params)
    if raw_ts['status'] == -1: return raw_ts

    time = raw_ts['data']['time']
    values = raw_ts['data']['values']
    info = raw_ts['data']['info']

    if ~np.all(np.isnan(values)):
        vmin = np.nanmin(values)
        vmax = np.nanmax(values)
        breaks = pretty(vmin, vmax, 14).tolist()
        ylim = [breaks[0], breaks[-1]]
        ex = (ylim[1] - ylim[0]) * 0.01
        ylim[1] = ylim[1] + ex

        moy = np.nanmean(values)
        med = np.nanmedian(values)
        ter1 = np.nanquantile(values, 1/3)
        ter2 = np.nanquantile(values, 2/3)

        stats = {
            'mean': float(np.round(moy, 2)),
            'median': float(np.round(med, 2)),
            'tercile1': float(np.round(ter1, 2)),
            'tercile2': float(np.round(ter2, 2))
        }

        xyear = [int(t.split('-')[0]) for t in time]
        mod_coef = linear_model(np.array(xyear), values)
        values = np.where(np.isnan(values), None, values)
        data = {
            'time': xyear,
            'values': values.tolist(),
            'stats': stats,
            'coeffs': mod_coef,
            'info': info,
            'yrange': ylim,
            'yticks': breaks
        }

        return {'status': 0, 'data': data}
    else:
        if params['geomExtract'] == 'points':
            lon = info['geom']['lon']
            lat = info['geom']['lat']
            crd = f'point (Longitude: {lon}, Latitude: {lat})'
        else:
            crd = f'polygon ({info['geom']['name']})'

        msg = f'All data are missing for {crd}'
        return {'status': -1, 'message': msg}

#####

def _download_ts_rawdata(params):
    params = _create_params_ts_raw(params)
    if params['dailyAnalysis']:
        json_data = download_analysis_dailydata(params)
    else:
        json_data = download_rawdata(params)

    json_data = json.loads(json_data)
    if json_data['status'] != 0: return json_data
    json_data['data'] = json.loads(json_data['data'])

    time = json_data['data']['Dates']
    time = _format_ts_dates(time, params['temporalRes'])
    if time is None:
        return {
            'status': -1,
            'message': 'Unknown temporal resolution'
        }

    miss = json_data['data']['Missing']
    values = json_data['data']['Data'][0]['Values']
    values = np.array(values)
    values[values == miss] = np.nan

    seasL = None
    if params['temporalRes'] == 'seasonal':
        seasL = params['seasLength']

    info = {
        'geom': {
            'name': json_data['data']['Data'][0]['Name'],
            'lon': json_data['data']['Data'][0]['Longitude'],
            'lat': json_data['data']['Data'][0]['Latitude']
        },
        'var':{
            'name': json_data['data']['VariableName'],
            'units': json_data['data']['VariableUnits'],
            'type': params['variable']
        },
        'time_res': params['temporalRes'],
        'seas_len': seasL
    }

    return {
        'status': 0,
        'data': {
            'time': time,
            'values': values,
            'info': info
        }
    }

def _create_params_ts_raw(params):
    pars_0 = {
        'gridded': False,
        'outFormat': 'JSON-Format',
        'webApp': True,
        'finalOutput': True,
        'httpMethod': 'POST',
    }
    if not 'dailyAnalysis' in params:
        pars_0['dailyAnalysis'] = False

    if params['geomExtract'] == 'points':
        pars = pars_0 | {'padLon': 0, 'padLat': 0}
    else:
        pars = pars_0 | {'spatialAvg': True, 'allPolygons': False}
    return pars | params

def _create_params_ts_anom(params):
    pars_0 = {
        'analysis': 'anomaly',
        'climFunction': 'mean-stdev',
        'fullYear': True,
        'climDate': None,
        'outFormat': 'JSON-Format',
        'outFormat_0': 'JSON-Format',
        'gridded': False,
        'webApp': True,
        'finalOutput': False,
        'httpMethod': 'POST',
    }
    if params['geomExtract'] == 'points':
        pars = pars_0 | {'padLon': 0, 'padLat': 0}
    else:
        pars = pars_0 | {'spatialAvg': True, 'allPolygons': False}
    return pars | params

def _create_params_daily_anom(params):
    pars_0 = {
        'seasStats': 'mean-stdev',
        'outFormat': 'JSON-Format',
        'outFormat_0': 'JSON-Format',
        'gridded': False,
        'webApp': True,
        'finalOutput': False,
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
        'precentileValue': [5.0, 50.0, 95.0],
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

#####

def _format_ts_dates(dates_l, time_res):
    if time_res == 'monthly':
        tmp = [
                datetime.strptime(t, '%Y%m')
                for t in dates_l
            ]
        res = [t.strftime('%Y-%m-16') for t in tmp]
    elif time_res == 'dekadal':
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
        res = ['-'.join(l) for l in zip(y, m, dy)]
    elif time_res == 'seasonal':
        def _format_seasonal_date(date):
            seas = date.split('_')
            m1 = datetime.strptime(seas[0], '%Y-%m')
            m2 = datetime.strptime(seas[1], '%Y-%m')
            month = m2.month - m1.month
            year = m2.year - m1.year
            n_month = year * 12 + month + 1
            mf = n_month // 2 + 1
            yr = m1.year + (m1.month + mf - 1) // 12
            mo = (m1.month + mf - 1) % 12
            if mo == 0:
                mo = 12
            dy = 1 if n_month % 2 == 0 else 16
            return f'{yr}-{mo:02}-{dy:02}'

        res = [_format_seasonal_date(d) for d in dates_l]
    elif time_res == 'daily':
        def _format_dailyseason_date(date):
            seas = date.split('_')
            d1 = datetime.strptime(seas[0], '%Y-%m-%d')
            d2 = datetime.strptime(seas[1], '%Y-%m-%d')
            m = d1 + (d2 - d1) / 2
            return m.strftime('%Y-%m-%d')

        res = [_format_dailyseason_date(d) for d in dates_l]
    else:
        res = None

    return res

def _format_clim_dates(dates_l, time_res):
    if time_res == 'monthly':
        res = [
                f"2025-{t.split('_')[1]}-16"
                for t in dates_l
            ]
    elif time_res == 'dekadal':
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
        res = [f'2025-{t}' for t in mdk]
    else:
        res = None

    return res

def _get_axis_breaks(values):
    vmin = np.nanmin(values)
    vmax = np.nanmax(values)
    breaks = pretty(vmin, vmax, 14).tolist()
    ylim = [breaks[0], breaks[-1]]
    ylim[1] = ylim[1] + (ylim[1] - ylim[0]) * 0.1
    return breaks, ylim
