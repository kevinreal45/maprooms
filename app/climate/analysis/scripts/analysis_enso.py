import numpy as np
import pandas as pd
from app.dst_api.scripts.dates import add_months
from app.misc.scripts.enso_update import (
    read_enso_probabilities,
    read_enso_strengths,
    read_enso_probabilities_all
)
from app.misc.scripts.enso import (
    read_enso_oni_cpc,
    read_iod_data_monthly,
    read_nao_data_monthly, 
    read_atl3_data_monthly, 
    read_enso_data_monthly,
    read_enso_data_weekly,
    enso_alert_classification
)
from app.scripts.dial_plot import draw_dial_image
from app.scripts.enso_plot import *

def climate_analysis_enso_alert_dial(params):
    fcst = read_enso_probabilities_all()
    issue_date = fcst['probabilities']['issued_date']
    issue_date = issue_date.strftime('%Y-%m')

    month_oni = add_months(issue_date, -3)
    oni_df = read_enso_oni_cpc('oni', month=month_oni)

    month_anom = add_months(issue_date, -2)
    anom_df = read_enso_data_monthly(
        params['sstProduct'],
        ['year', 'month', '"anom_nino3.4"'],
        start=month_anom
    )

    enso_alert = enso_alert_classification(
        fcst['probabilities'],
        fcst['strengths'],
        oni_df['anom'].round(1).to_numpy(),
        anom_df['anom_nino3.4'].round(1).to_numpy()
    )


    img_png = draw_dial_image(
        enso_alert,
        params,
        figsize=(8.6, 6.2)
    )
    data = {
        'issue_date': issue_date,
        'png': img_png
    }
    return {'status': 0, 'data': data}

def climate_analysis_enso_charts(params):
    sW = int(params['sreenW'])/120
    sH = int(params['sreenH'])/120
    if params['teleconIndex'] == 'proba':
        proba = read_enso_probabilities()
        issue_date = proba['issued_date'].strftime('%Y-%m')
        # figsize=(15, 6)
        # figsize=(10, 4)
        figW = sW * 0.7937
        figH = sH * 0.4888
        img_png = plot_enso_probabilities(proba, figsize=(figW, figH))
        data = {
            'issue_date': issue_date,
            'png': img_png,
            'imgPNG': params['imgPNG']
        }
    elif params['teleconIndex'] == 'strength':
        strength = read_enso_strengths()
        issue_date = strength['issued_date'].strftime('%Y-%m')
        # figsize=(14, 6)
        figW = sW * 1.1111
        figH = sH * 0.7332
        img_png = plot_enso_strength_probabilities(strength, figsize=(figW, figH))
        data = {
            'issue_date': issue_date,
            'png': img_png,
            'imgPNG': params['imgPNG']
        }
    elif params['teleconIndex'] == 'oni':
        oni = read_enso_oni_cpc(
            params['oniType'],
            start=params['startDate'],
            end=params['endDate']
        )

        if params['oniType'] == 'oni':
            name = 'ONI'
            ylab = 'Oceanic Niño Index (°C)'
        else:
            name = 'RONI'
            ylab = 'Relative Oceanic Niño Index (°C)'

        thres = 0.5
        ytick = 0.25
        ymax = np.array([oni['anom'].min(), oni['anom'].max()])
        ymax = np.max(np.abs(ymax)) + ytick/2

        if params['imgPNG']:
            figW = sW * 1.5873
            figH = sH * 1.0143
            img_png = plot_enso_oni(
                oni,
                col='anom',
                thres=thres,
                ymax=ymax,
                ytick=ytick,
                ylab=ylab,
                figsize=(figW, figH),
                dispLastValue=params['dispLastValue']
            )
            data = {
                'png': img_png,
                'imgPNG': params['imgPNG']
            }
        else:
            start = pd.to_datetime(oni['start_month'], format='%Y-%m')
            end = pd.to_datetime(oni['end_month'], format='%Y-%m')
            oni['time'] = start + (end - start) / 2
            oni['time'] = oni['time'].dt.strftime('%Y-%m-%d')
            data = {
                'time': oni['time'].tolist(),
                'values': oni['anom'].tolist(),
                'year': oni['year'].tolist(),
                'season': oni['season'].tolist(),
                'ylab': ylab,
                'thres': thres,
                'ymax': ymax, 
                'ytick': ytick,
                'time_res': 'seasonal-enso',
                'name': name,
                'units': '°C',
                'imgPNG': params['imgPNG']
            }
    elif params['teleconIndex'] == 'iod':
        iod = read_iod_data_monthly(
            params['sstProd'],
            columns=['year', 'month', 'diff'],
            start=params['startDate'],
            end=params['endDate']
        )

        ylab = 'Indian Ocean Dipole index (°C)'
        thres = 0.4
        ytick = 0.4
        ymax = np.array([iod['diff'].min(), iod['diff'].max()])
        ymax = np.max(np.abs(ymax)) + ytick/2

        if params['imgPNG']:
            figW = sW * 1.5873
            figH = sH * 1.0143
            img_png = plot_enso_monthly(
                iod,
                col='diff',
                thres=thres,
                ymax=ymax,
                ytick=ytick,
                ylab=ylab,
                figsize=(figW, figH),
                dispLastValue=params['dispLastValue'],
                varUnits='°C'
            )
            data = {
                'png': img_png,
                'imgPNG': params['imgPNG']
            }
        else:
            iod['day'] = 16
            iod['time'] = pd.to_datetime(iod[['year', 'month', 'day']])
            iod['time'] = iod['time'].dt.strftime('%Y-%m-%d')
            data = {
                'time': iod['time'].tolist(),
                'values': iod['diff'].tolist(),
                'ylab': ylab,
                'thres': thres,
                'ymax': ymax, 
                'ytick': ytick,
                'time_res': 'monthly',
                'name': 'IOD',
                'units': '°C',
                'imgPNG': params['imgPNG']
            }
    elif params['teleconIndex'] == 'nao':
        nao = read_nao_data_monthly(
            columns='*',
            start=params['startDate'],
            end=params['endDate']
        )

        ylab = 'North Atlantic Oscillation'
        thres = 0.5
        ytick = 0.5
        ymax = np.array([nao['nao'].min(), nao['nao'].max()])
        ymax = np.max(np.abs(ymax)) + ytick/2

        if params['imgPNG']:
            figW = sW * 1.5873
            figH = sH * 1.0143
            img_png = plot_enso_monthly(
                nao,
                col='nao',
                thres=thres,
                ymax=ymax,
                ytick=ytick,
                ylab=ylab,
                figsize=(figW, figH),
                dispLastValue=params['dispLastValue'],
                varUnits=''
            )
            data = {
                'png': img_png,
                'imgPNG': params['imgPNG']
            }
        else:
            nao['day'] = 16
            nao['time'] = pd.to_datetime(nao[['year', 'month', 'day']])
            nao['time'] = nao['time'].dt.strftime('%Y-%m-%d')
            data = {
                'time': nao['time'].tolist(),
                'values': nao['nao'].tolist(),
                'ylab': ylab,
                'thres': thres,
                'ymax': ymax, 
                'ytick': ytick,
                'time_res': 'monthly',
                'name': 'NAO',
                'units': '',
                'imgPNG': params['imgPNG']
            }
    elif params['teleconIndex'] == 'atl3':
        atl3 = read_atl3_data_monthly(
            columns='*',
            start=params['startDate'],
            end=params['endDate']
        )

        ylab = 'Atlantic 3 Index'
        thres = 0.4
        ytick = 0.4
        ymax = np.array([atl3['atl3'].min(), atl3['atl3'].max()])
        ymax = np.max(np.abs(ymax)) + ytick/2

        if params['imgPNG']:
            figW = sW * 1.5873
            figH = sH * 1.0143
            img_png = plot_enso_monthly(
                atl3,
                col='atl3',
                thres=thres,
                ymax=ymax,
                ytick=ytick,
                ylab=ylab,
                figsize=(figW, figH),
                dispLastValue=params['dispLastValue'],
                varUnits=''
            )
            data = {
                'png': img_png,
                'imgPNG': params['imgPNG']
            }
        else:
            atl3['day'] = 16
            atl3['time'] = pd.to_datetime(atl3[['year', 'month', 'day']])
            atl3['time'] = atl3['time'].dt.strftime('%Y-%m-%d')
            data = {
                'time': atl3['time'].tolist(),
                'values': atl3['atl3'].tolist(),
                'ylab': ylab,
                'thres': thres,
                'ymax': ymax, 
                'ytick': ytick,
                'time_res': 'monthly',
                'name': 'ATL3',
                'units': '',
                'imgPNG': params['imgPNG']
            }
    elif params['teleconIndex'] == 'anom':
        anom = f"{params['anomType']}_{params['ninoRegion']}"
        nino_reg = {
            'nino1+2': 'Niño 1+2',
            'nino3': 'Niño 3',
            'nino3.4': 'Niño 3.4',
            'nino4': 'Niño 4'
        }
        sst_anom = {
            'anom': 'SST Anomalies',
            'ranom': 'Relative SST Anomalies'
        }
        ylab = f"{sst_anom[params['anomType']]} in {nino_reg[params['ninoRegion']]} Region (°C)"
        name = 'RSST' if params['anomType'] == 'ranom' else 'SST'
        name = f'{name} Anomalies'

        if params['timeRes'] == 'weekly':
            enso = read_enso_data_weekly(
                params['sstProd'],
                columns=['week', anom],
                start=params['startDate'],
                end=params['endDate']
            )
            plot_enso_function = plot_enso_weekly
            thres = 0.8
            ytick = 0.4
            enso['time'] = enso['week']
            time_res = 'weekly'
        else:
            enso = read_enso_data_monthly(
                params['sstProd'],
                columns=['year', 'month', anom],
                start=params['startDate'],
                end=params['endDate']
            )
            plot_enso_function = plot_enso_monthly
            thres = 0.5
            ytick = 0.25
            enso['day'] = 16
            enso['time'] = pd.to_datetime(enso[['year', 'month', 'day']])
            enso['time'] = enso['time'].dt.strftime('%Y-%m-%d')
            time_res = 'monthly'

        ymax = np.array([enso[anom].min(), enso[anom].max()])
        ymax = np.max(np.abs(ymax)) + ytick/2

        if params['imgPNG']:
            figW = sW * 1.5873
            figH = sH * 1.0143
            img_png = plot_enso_function(
                enso,
                col=anom,
                thres=thres,
                ymax=ymax,
                ytick=ytick,
                ylab=ylab,
                figsize=(figW, figH),
                dispLastValue=params['dispLastValue'],
                varUnits='°C'
            )
            data = {
                'png': img_png,
                'imgPNG': params['imgPNG']
            }
        else:
            data = {
                'time': enso['time'].tolist(),
                'values': enso[anom].tolist(),
                'ylab': ylab,
                'thres': thres,
                'ymax': ymax, 
                'ytick': ytick,
                'time_res': time_res,
                'name': name,
                'units': '°C',
                'imgPNG': params['imgPNG']
            }
    else:
        return {'status': -1, 'data': 'Unknown chart type'}

    data['teleconIndex'] = params['teleconIndex']
    return {'status': 0, 'data': data}
