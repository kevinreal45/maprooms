import numpy as np
import pandas as pd
from .enso import (
    read_enso_data_monthly,
    read_nao_data_monthly,
    read_iod_data_monthly,
    read_atl3_data_monthly,
)
from app.dst_api.scripts import nbdays_of_month

def telecon_nao_seasonal(params, start, end, fullSeas=False):
    nao = _telecon_nao_seasonal(
        params['seasLength'], start, end
    )

    if fullSeas:
        nao_seas = nao.reset_index(drop=True)
    else:
        seas = nao['month'] == params['seasStart']
        nao_seas = nao[seas].reset_index(drop=True)
        nao_seas = nao_seas[['year', 'value']]

    return nao_seas

def telecon_atl3_seasonal(params, start, end, fullSeas=False):
    atl3 = _telecon_atl3_seasonal(
        params['seasLength'], start, end
    )

    if fullSeas:
        atl3_seas = atl3.reset_index(drop=True)
    else:
        seas = atl3['month'] == params['seasStart']
        atl3_seas = atl3[seas].reset_index(drop=True)
        atl3_seas = atl3_seas[['year', 'value']]

    return atl3_seas

def telecon_iod_seasonal(params, sst_prod, start, end, fullSeas=False):
    iod = _telecon_iod_seasonal(
        sst_prod, params['seasLength'], start, end
    )

    if fullSeas:
        iod_seas = iod.reset_index(drop=True)
    else:
        seas = iod['month'] == params['seasStart']
        iod_seas = iod[seas].reset_index(drop=True)
        iod_seas = iod_seas[['year', 'value']]

    return iod_seas

def telecon_oni_seasonal(params, sst_prod, start, end, fullSeas=False):
    sst_seas = _telecon_sst_seasonal(
        sst_prod, params['seasLength'],
        'sst_nino3.4', start, end
    )

    clim = _telecon_sst_seasonal_clim(
        params, sst_prod
    )

    sst_anom = (
        sst_seas.merge(clim, on='month', how='left')
           .assign(anom=lambda df: df['value'] - df['clim'])
           .drop(columns='clim')
    )

    sst_anom['oni'] = sst_anom['anom'].rolling(
            window=params['seasLength'],
            center=True,
            min_periods=params['seasLength']
        ).mean()
    sst_anom = sst_anom.dropna()

    oni = sst_anom[['year', 'month', 'oni']]
    if fullSeas:
        oni_seas = oni.reset_index(drop=True)
        oni_seas = oni_seas[['year', 'month', 'oni']]
        oni_seas.columns = ['year', 'month', 'value']
    else:
        seas = oni['month'] == params['seasStart']
        oni_seas = oni[seas].reset_index(drop=True)
        oni_seas = oni_seas[['year', 'oni']]
        oni_seas.columns = ['year', 'value']

    return oni_seas

def _telecon_aggregate_seasonal(data_df, seasStart, seasLength):
    tindex = _telecon_index_seasonal(
        data_df[['year', 'month']], seasStart, seasLength
    )

    years = np.array([
        k for k in tindex['index'].keys()
    ])

    ds_data = []
    yr_data = []
    for year in years:
        index = tindex['index'][year]
        frac = tindex['length'][year]['frac']
        if frac < 0.95:
            continue
        # moy = np.mean(data_df['value'].to_numpy()[index])
        moy = data_df['value'].iloc[index].mean()
        ds_data += [moy]
        yr_data += [year]

    return pd.DataFrame({
            'year': np.array(yr_data),
            'value': np.array(ds_data)
        })

def _telecon_nao_seasonal(seas_len, start, end):
    nao = read_nao_data_monthly(
        start=start, end=end
    )
    nao.columns = ['year', 'month', 'value']

    nao_seas = []
    for s in range(1, 13):
        tmp = _telecon_aggregate_seasonal(
            nao, s, seas_len
        )
        tmp['month'] = s
        nao_seas += [tmp]
    nao_seas = pd.concat(nao_seas, ignore_index=True)
    nao_seas = nao_seas.sort_values(by=['year', 'month'])
    return nao_seas[['year', 'month', 'value']]

def _telecon_atl3_seasonal(seas_len, start, end):
    atl3 = read_atl3_data_monthly(
        columns=['year', 'month', 'atl3'],
        start=start, end=end
    )
    atl3.columns = ['year', 'month', 'value']

    atl3_seas = []
    for s in range(1, 13):
        tmp = _telecon_aggregate_seasonal(
            atl3, s, seas_len
        )
        tmp['month'] = s
        atl3_seas += [tmp]
    atl3_seas = pd.concat(atl3_seas, ignore_index=True)
    atl3_seas = atl3_seas.sort_values(by=['year', 'month'])
    return atl3_seas[['year', 'month', 'value']]

def _telecon_iod_seasonal(sst_prod, seas_len, start, end):
    iod = read_iod_data_monthly(
        sst_prod,
        columns=['year', 'month', 'diff'],
        start=start, end=end
    )
    iod.columns = ['year', 'month', 'value']
    iod_seas = []
    for s in range(1, 13):
        tmp = _telecon_aggregate_seasonal(
            iod, s, seas_len
        )
        tmp['month'] = s
        iod_seas += [tmp]
    iod_seas = pd.concat(iod_seas, ignore_index=True)
    iod_seas = iod_seas.sort_values(by=['year', 'month'])
    return iod_seas[['year', 'month', 'value']]

def _telecon_sst_seasonal(sst_prod, seas_len, column, start, end):
    sst = read_enso_data_monthly(
        sst_prod,
        columns=['year', 'month', 'sst_nino3.4'],
        start=start, end=end
    )
    sst.columns = ['year', 'month', 'value']

    sst_seas = []
    for s in range(1, 13):
        tmp = _telecon_aggregate_seasonal(
            sst, s, seas_len
        )
        tmp['month'] = s
        sst_seas += [tmp]
    sst_seas = pd.concat(sst_seas, ignore_index=True)
    sst_seas = sst_seas.sort_values(by=['year', 'month'])
    return sst_seas[['year', 'month', 'value']]

def _telecon_sst_seasonal_clim(params, sst_prod):
    start = f"{params['startYear'] - 1}-01"
    end = f"{params['endYear'] + 1}-12"
    sst = read_enso_data_monthly(
        sst_prod,
        columns=['year', 'month', 'sst_nino3.4'],
        start=start, end=end
    )
    sst.columns = ['year', 'month', 'value']
    clim_seas = []
    for s in range(1, 13):
        sst_seas = _telecon_aggregate_seasonal(
            sst, s, params['seasLength']
        )
        iyr1 = sst_seas['year'] >= params['startYear']
        iyr2 = sst_seas['year'] <= params['endYear']
        iyr = iyr1.to_numpy() & iyr2.to_numpy()
        sst_seas = sst_seas[iyr]
        if len(sst_seas) < params['minYear']:
            clim_seas += [np.nan]
        else:
            clim_seas += [sst_seas['value'].mean()]

    return pd.DataFrame({
            'month': np.arange(1, 13, 1),
            'clim': np.array(clim_seas)
        })

def _telecon_index_seasonal(times_df, seasStart, seasLength):
    years = times_df['year'].to_numpy()
    months = times_df['month'].to_numpy()
    days = np.repeat(16, len(years))

    start_month = seasStart
    start_day = 1
    end_month = ((seasStart + seasLength) - 1) % 12
    if end_month == 0:
        end_month = 12
    end_day = f'2026-{end_month}'
    end_day = nbdays_of_month(end_day)

    same_year_season = (start_month, start_day) <= (end_month, end_day)

    if same_year_season:
        in_season = (
            ((months > start_month) | ((months == start_month) & (days >= start_day))) &
            ((months < end_month) | ((months == end_month) & (days <= end_day)))
        )
        season_year = years
    else:
        in_start_year = (
            (months > start_month) |
            ((months == start_month) & (days >= start_day))
        )

        in_end_year = (
            (months < end_month) |
            ((months == end_month) & (days <= end_day))
        )

        in_season = in_start_year | in_end_year
        season_year = np.where(in_start_year, years, years - 1)

    season_indices = {
        y: np.where(in_season & (season_year == y))[0]
        for y in np.unique(season_year[in_season])
    }

    season_days = {}
    for y in season_indices:
        start = pd.Timestamp(year=y, month=start_month, day=start_day)

        if same_year_season:
            end = pd.Timestamp(year=y, month=end_month, day=end_day)
        else:
            end = pd.Timestamp(year=y + 1, month=end_month, day=end_day)

        nb_seas = seasLength
        nb_days = len(season_indices[y])
        season_days[y] = {
            'nb_seas': nb_seas,
            'nb_days': nb_days,
            'frac': nb_days/nb_seas
        }

    return {
        'index': season_indices,
        'length': season_days
    }
