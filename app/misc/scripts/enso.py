import re
import io
import requests
import numpy as np
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime, date, timedelta
from .sqlite import (
    readENSOMonthlyDataFrame,
    readENSOWeeklyDataFrame,
    readCPCONIDataFrame
)

def date_nth_weekday(month, year, weekday='Thursday', n=2):
    weekdays_num = {
        'Monday': 0,
        'Tuesday': 1,
        'Wednesday': 2,
        'Thursday': 3,
        'Friday': 4,
        'Saturday': 5,
        'Sunday': 6,
    }

    first_day = pd.to_datetime(f'01-{month}-{year}', format='%d-%B-%Y').date()

    target_wday = weekdays_num[weekday]
    first_wday = first_day.weekday()

    offset = (target_wday - first_wday) % 7
    first_occurrence = first_day + timedelta(days=offset)

    return first_occurrence + timedelta(days=7 * (n - 1))

def get_enso_issue_date(url_proba):
    html = requests.get(url_proba, timeout=30).text
    soup = BeautifulSoup(html, 'html.parser')
    h2 = soup.select_one('div.probabilities-description h2')
    issue_text = h2.get_text(' ', strip=True)
    parts = issue_text.split()[1:]
    issue_month = parts[0]
    issue_year = int(parts[1])

    return date_nth_weekday(
            issue_month, issue_year,
            weekday='Thursday',
            n=2
        )

def get_enso_probabilities(url_proba=None):
    if url_proba is None:
        url_proba = 'https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities/'
    tables = pd.read_html(url_proba, encoding='utf-8')
    tbl_proba = tables[7].copy()
    col0 = [str(r).split(' ')[0] for r in tbl_proba.iloc[:, 0]]
    tbl_proba.iloc[:, 0] = col0
    issue_date = get_enso_issue_date(url_proba)

    return {
            'issued_date': issue_date,
            'table_proba': tbl_proba
        }

def get_enso_strength_probabilities(url_proba=None):
    if url_proba is None:
        url_proba = 'https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/'
    tables = pd.read_html(url_proba, encoding='utf-8')
    tbl_proba = tables[7].copy()
    col0 = [str(r).split(' ')[0] for r in tbl_proba.iloc[:, 0]]
    tbl_proba.iloc[:, 0] = col0
    xhead = tbl_proba.columns[1:].tolist()
    enso_cat = [
        'Very Strong La Niña',
        'Strong La Niña',
        'Moderate La Niña',
        'Weak La Niña',
        'Neutral',
        'Weak El Niño',
        'Moderate El Niño',
        'Strong El Niño',
        'Very Strong El Niño',
    ]
    cols = [f'col{i}' for i in range(1, len(xhead) + 1)]
    xhead = [[enso_cat[i], xhead[i]] for i in range(len(xhead))]
    xhead = dict(zip(cols, xhead))
    tbl_proba.columns = [tbl_proba.columns[0]] + cols
    issue_date = get_enso_issue_date(url_proba)

    return {
            'issued_date': issue_date,
            'header_info': xhead,
            'table_proba': tbl_proba
        }

def partial_read_fwf(url, lastrows, names):
    if type(lastrows) is not int:
        raise ValueError('"lastrows" must be an integer')

    headers = {'Range': 'bytes=-10000'}
    response = requests.get(url, headers=headers)

    if response.status_code == 206:
        text_data = response.content.decode('utf-8')
        lines = text_data.splitlines()
        last_lines = '\n'.join(lines[-lastrows:])
        return pd.read_fwf(io.StringIO(last_lines), names=names)
    else:
        raise ValueError(f'Unable to download the last {lastrows} rows')

def format_oni_data_df(data):
    data['anom'] = pd.to_numeric(data['anom'], errors='coerce')
    data['year'] = data['year'].astype(int)
    seasons = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ',
               'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ']
    seas_mon = dict(zip(np.array(seasons), np.arange(1, 13)))
    months = np.array([
        seas_mon[s]
        for s in data['season'].to_numpy()
    ])
    tmp = np.char.add(
        np.char.add(months.astype(str), "-"),
        data['year'].astype(str).to_numpy()
    )
    tmp = pd.to_datetime(tmp, format='%m-%Y')
    ts1 = tmp - pd.DateOffset(months=1)
    ts2 = tmp + pd.DateOffset(months=1)

    return pd.DataFrame({
            'start_month': ts1.strftime('%Y-%m'),
            'end_month': ts2.strftime('%Y-%m'),
            'year': data['year'],
            'season': data['season'],
            'anom': data['anom'],
        })

def format_oni_table_df(tables, table_nb, roni=True):
    table = tables[table_nb].copy()
    if roni:
        xhead = [str(col).split(' ')[0] for col in table.columns]
    else:
        xhead = table.iloc[0].astype(str).tolist()

    col0 = table.iloc[:, 0].astype(str)
    col0 = col0.str.fullmatch(r'\d+')
    table = table[col0].copy()
    table.columns = xhead
    table = table.apply(pd.to_numeric, errors='coerce')
    anom = table.iloc[:, 1:].to_numpy().ravel()

    start = f'{int(table.iloc[0, 0]) - 1}-12'
    end = f'{int(table.iloc[-1, 0]) + 1}-01'
    years = table.iloc[:, 0].astype(int).to_numpy()
    tsmat = [
        f'{year}-{month:02d}'
        for year in years 
        for month in range(1, 13)
    ]
    ts1 = [start] + tsmat[:-1]
    ts2 = tsmat[1:] + [end]
    ts_year = [int(y.split('-')[0]) for y in tsmat]
    ts_season = xhead[1:] * len(years)
    anom = pd.DataFrame({
        'start_month': ts1,
        'end_month': ts2,
        'year': ts_year,
        'season': ts_season,
        'anom': anom,
    })
    
    return anom.dropna(subset=['anom'])

def format_atl3_table_df(tables, table_nb):
    table = tables[table_nb].copy()
    table.columns = table.iloc[0]
    table = table.iloc[1:].reset_index(drop=True)

    atl3 = table.melt(
        id_vars='Year',
        var_name='month',
        value_name='atl3',
    )
    atl3 = atl3.rename(columns={'Year': 'year'})
    iyear = atl3['year'].astype(str).str.fullmatch(r'\d{4}')
    atl3 = atl3.loc[iyear].copy()
    atl3['year'] = pd.to_numeric(atl3['year']).astype(int)
    atl3['month'] = pd.to_datetime(atl3['month'], format='%b').dt.month
    atl3['atl3'] = pd.to_numeric(atl3['atl3'], errors='coerce')
    atl3 = atl3.sort_values(['year', 'month']).reset_index(drop=True)
    return atl3.dropna(subset=['atl3'])

def format_df_data_numeric(data):
    df = data.copy()
    df = df.apply(pd.to_numeric, errors='coerce')
    df = df.dropna(subset=['year', 'month'])
    df['year'] = df['year'].astype(int)
    df['month'] = df['month'].astype(int)
    return df

def get_enso_roni_cpc(parse_web_table=False, lastrows=None):
    # Period: 1950 - present
    # Base period: 1991 - 2020
    # 3 month running mean of ERSST.v5 SST anomalies in the Niño 3.4 region
    if parse_web_table:
        url_roni = 'https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/'
        tables = pd.read_html(url_roni, encoding='utf-8')
        return format_oni_table_df(tables, 8, True)
    else:
        url_roni = 'https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt'
        names = ['season', 'year', 'anom']
        if lastrows:
            roni = partial_read_fwf(url_roni, lastrows, names=names)
        else:
            roni = pd.read_fwf(url_roni, skiprows=1, names=names)
        return format_oni_data_df(roni)

def get_enso_oni_cpc(parse_web_table=False, lastrows=None):
    # Period: 1950 - present
    # Centered 30-year base periods updated every 5 years
    # 3 month running mean of ERSST.v5 SST anomalies in the Niño 3.4 region
    if parse_web_table:
        url_oni = 'https://cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php'
        tables = pd.read_html(url_oni, encoding='utf-8')
        return format_oni_table_df(tables, 8, False)
    else:
        url_oni = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt'
        names = ['season', 'year', 'total', 'anom']
        if lastrows:
            oni = partial_read_fwf(url_oni, lastrows, names=names)
        else:
            oni = pd.read_fwf(url_oni, skiprows=1, names=names)
        return format_oni_data_df(oni)

def get_atl3_cpc_monthly(parse_web_table=False, lastrows=None):
    # Period: 1950 - present
    # Centered 30-year base periods updated every 10 years
    # monthly data
    # TNA  : SSTA averaged in [60ºW-30ºW, 5ºN-20ºN]
    # TSA : SSTA averaged in [30ºW-10ºE, 20ºS-0]
    # MGI = TNA - TSA
    # ATL3 :  SSTA averaged in [20ºW-0, 2.5ºS-2.5N]
    if parse_web_table:
        url_atl3 = 'https://www.cpc.ncep.noaa.gov/products/international/ocean_monitoring/IODMI/ATL3_month.html'
        tables = pd.read_html(url_atl3, encoding='utf-8')
        return format_atl3_table_df(tables, 0)
    else:
        url_atl3 = 'https://www.cpc.ncep.noaa.gov/products/international/ocean_monitoring/IODMI/mnth.ersstv6.clim19912020.tav_current.txt'
        names = ['year', 'month',  'tna', 'tsa', 'mgi', 'atl3']
        if lastrows:
            atl3 = partial_read_fwf(url_atl3, lastrows, names=names)
        else:
            atl3 = pd.read_fwf(url_atl3, skiprows=14, names=names)
        return format_df_data_numeric(atl3)

def get_enso_oisstv21_cpc(time_res='weekly', lastrows=None):
    # OISST.v2.1
    # Period: 1981 - present
    # Base period: 1991 - 2020
    base_url = 'https://www.cpc.ncep.noaa.gov/data/indices'

    if time_res == 'weekly':
        # Weekly Relative
        file = 'rel_wksst9120.txt'
        url = f'{base_url}/{file}'
        names = ['week', 'ranom_nino1+2', 'ranom_nino3',
                 'ranom_nino3.4', 'ranom_nino4']
        if lastrows:
            ranom = partial_read_fwf(url, lastrows, names=names)
        else: 
            ranom = pd.read_fwf(url, skiprows=4, names=names)
        tmp = ranom[names[1:]]
        tmp = tmp.apply(pd.to_numeric, errors='coerce')
        ranom[names[1:]] = tmp

        # Weekly
        file = 'wksst9120.for'
        url = f'{base_url}/{file}'
        names = ['week', 'tmp12', 'tmp3', 'tmp34', 'tmp4']
        if lastrows:
            anom = partial_read_fwf(url, lastrows, names=names)
        else: 
            anom = pd.read_fwf(url, skiprows=4, names=names)
        week = anom['week']
        tmp = anom[names[1:]]
        tmp = tmp.astype('string')
        anom = pd.DataFrame(index=tmp.index)
        for c in tmp.columns:
            anom[f"{c}_a"] = tmp[c].str[0:4].astype(float)
            anom[f"{c}_b"] = tmp[c].str[4:].astype(float)

        names = ['sst_nino1+2', 'anom_nino1+2',
                 'sst_nino3', 'anom_nino3',
                 'sst_nino3.4', 'anom_nino3.4',
                 'sst_nino4', 'anom_nino4']
        anom.columns = names
        anom['week'] = week
        anom['orig_order'] = range(len(anom))
        tmp = pd.merge(ranom, anom, on='week', how='outer')
        tmp = tmp.sort_values('orig_order').drop(columns=['orig_order'])
        tmp['week'] = (
            pd.to_datetime(tmp['week'], format='%d%b%Y')
             .dt.strftime('%Y-%m-%d')
        )
        return tmp
    elif time_res == 'monthly':
        # Monthly Relative
        file = 'rel_mthsst9120.txt'
        url = f'{base_url}/{file}'
        names = ['year', 'month', 'ranom_nino1+2', 'ranom_nino3',
                 'ranom_nino4', 'ranom_nino3.4']
        if lastrows:
            ranom = partial_read_fwf(url, lastrows, names=names)
        else:
            ranom = pd.read_fwf(url, skiprows=1, names=names)
        ranom = format_df_data_numeric(ranom)

        # Monthly
        file = 'sstoi.indices'
        url = f'{base_url}/{file}'
        names = ['year', 'month', 'sst_nino1+2', 'anom_nino1+2',
                 'sst_nino3', 'anom_nino3', 'sst_nino4', 
                 'anom_nino4', 'sst_nino3.4', 'anom_nino3.4']
        if lastrows:
            anom = partial_read_fwf(url, lastrows, names=names)
        else:
            anom = pd.read_fwf(url, skiprows=1, names=names)
        anom = format_df_data_numeric(anom)
        return pd.merge(ranom, anom, on=['year', 'month'], how='outer')
    else:
        raise ValueError('Unknown time resolution "time_res"')

def get_enso_ersstv5_cpc_monthly(lastrows=None):
    url = 'https://www.cpc.ncep.noaa.gov/data/indices/ersst5.nino.mth.91-20.ascii'
    names = ['year', 'month', 'sst_nino1+2', 'anom_nino1+2',
             'sst_nino3', 'anom_nino3', 'sst_nino4', 'anom_nino4',
             'sst_nino3.4', 'anom_nino3.4']
    if lastrows:
        sst = partial_read_fwf(url, lastrows, names=names)
    else:
        sst = pd.read_fwf(url, skiprows=1, names=names)
    sst = format_df_data_numeric(sst)

    url = 'https://www.cpc.ncep.noaa.gov/data/indices/Rnino34.ascii.txt'
    names = ['year', 'month', 'ranom_nino3.4']
    if lastrows:
        rsst = partial_read_fwf(url, lastrows, names=names)
    else:
        rsst = pd.read_fwf(url, skiprows=1, names=names)
    rsst = format_df_data_numeric(rsst)

    return pd.merge(sst, rsst, on=['year', 'month'], how='outer')

def get_enso_ersst_ncei(ersst_version=5, lastrows=None):
    # ersst_version: 5 or 6
    # Base period: 1971-2000
    # Period v5: 1854 - present
    # Period v6: 1850 - present

    base_url = 'https://www.ncei.noaa.gov/pub/data/cmb/ersst'

    if ersst_version == 5:
        mid_url = 'v5/index'
        file_ssta = 'ersst.v5.el_nino.dat'
        file_sst = 'ersst.v5.el_nino.sst.dat'
    elif ersst_version == 6:
        mid_url = 'v5/v6/index'
        file_ssta = 'ersst.v6.el_nino.dat'
        file_sst = 'ersst.v6.el_nino.sst.dat'
    else:
        raise ValueError('Unknown ERSST version')

    names_ssta = ['year', 'month', 'anom_nino3', 'anom_nino4',
                  'anom_nino3.4', 'anom_nino1+2']
    url_ssta = f'{base_url}/{mid_url}/{file_ssta}'
    if lastrows:
        ssta = partial_read_fwf(url_ssta, lastrows, names=names_ssta)
    else:
        ssta = pd.read_fwf(url_ssta, names=names_ssta)
    ssta = format_df_data_numeric(ssta)

    names_sst = ['year', 'month', 'sst_nino3', 'sst_nino4',
                 'sst_nino3.4', 'sst_nino1+2']
    url_sst = f'{base_url}/{mid_url}/{file_sst}'
    if lastrows:
        sst = partial_read_fwf(url_sst, lastrows, names=names_sst)
    else:
        sst = pd.read_fwf(url_sst, names=names_sst)
    sst = format_df_data_numeric(sst)

    return pd.merge(ssta, sst, on=['year', 'month'], how='outer')

def get_iod_ersst_ncei(ersst_version=5, lastrows=None):
    # Period: 1854 - present
    # ersst_version: 5 or 6

    base_url = 'https://www.ncei.noaa.gov/pub/data/cmb/ersst'

    if ersst_version == 5:
        mid_url = 'v5/index'
        file_url = 'ersst.v5.iod.dat'
    elif ersst_version == 6:
        mid_url = 'v5/v6/index'
        file_url = 'ersst.v6.iod.dat'
    else:
        raise ValueError('Unknown ERSST version')

    url = f'{base_url}/{mid_url}/{file_url}'
    names = ['year', 'month', 'west', 'east', 'diff']
    if lastrows:
        iod = partial_read_fwf(url, lastrows, names=names)
    else:
        iod = pd.read_fwf(url, skiprows=1, names=names)

    return format_df_data_numeric(iod)

def get_nao_cpc_cdas_monthly(lastrows=None):
    # Period: 1950 - present

    url = 'https://cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.nao.monthly.b5001.current.ascii.table'
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    months_dict = {v: i + 1 for i, v in enumerate(months)}
    names = ['year'] + months
    if lastrows:
        nao = partial_read_fwf(url, lastrows, names=names)
    else:
        nao = pd.read_fwf(url, skiprows=1, names=names)

    nao = (
        nao.melt(
            id_vars='year',
            var_name='month',
            value_name='nao'
        )
        .assign(month=lambda x: x['month'].map(months_dict))
        .sort_values(['year', 'month'])
        .reset_index(drop=True)
    )
    nao = nao.dropna(subset=['nao'])

    return format_df_data_numeric(nao)

def climatology_sst(
    sst, start=1991, end=2020,
    vars_nino=['sst_nino3', 'sst_nino4',
               'sst_nino3.4', 'sst_nino1+2']
):
    base_period = sst[(sst['year'] >= start) & (sst['year'] <= end)]
    mean = (
        base_period
        .groupby('month')[vars_nino]
        .mean()
        .reset_index()
    )
    stdev = (
        base_period
        .groupby('month')[vars_nino]
        .std()
        .reset_index()
    )
    return {'mean': mean, 'sd': stdev}

def anomaly_sst(
    sst, clim_sst,
    vars_nino=['sst_nino3', 'sst_nino4',
               'sst_nino3.4', 'sst_nino1+2']
):
    sst_anom = sst.copy()
    sst_anom = sst_anom[['year', 'month'] + vars_nino]
    for var in vars_nino:
        month_mean = clim_sst['mean'].set_index('month')[var]
        anom = (
            sst_anom[var] -
            sst_anom['month'].map(month_mean)
        )
        sst_anom[var] = anom.round(2)

    names = [
        re.sub(r'sst_', 'anom_', n)
        for n in sst_anom.columns.tolist()
    ]
    sst_anom.columns = names
    return sst_anom

def enso_expected_index(strength_df):
    # Midpoints corresponding to CPC strength bins:
    # <= -2, -2:-1.5, -1.5:-1, -1:-0.5,
    # neutral,
    # 0.5:1, 1:1.5, 1.5:2, >=2
    midpoints = [
        -2.5, -1.75, -1.25, -0.75,
        0.0,
        0.75, 1.25, 1.75, 2.5
    ]
    midpoints = np.array(midpoints)

    df = strength_df.copy()
    prob_cols = df.columns[1:]
    vals = df[prob_cols].apply(pd.to_numeric, errors='coerce')
    vals = vals.fillna(0).to_numpy()

    if vals.shape[1] != len(midpoints):
        msg = 'Unexpected number of strength-probability columns.'
        raise ValueError(msg)

    return (vals * midpoints).sum(axis=1) / 100.0

def enso_alert_classification(proba, strength, oni, ssta):
    enso_class = {
        'definition': [
            {'color': '#4040e6', 'label': 'La Niña', 'score': 0, 'state': 'La Niña'},
            {'color': '#7b7cf4', 'label': 'Alert', 'score': 1, 'state': 'La Niña Alert'},
            {'color': '#b8b7f2', 'label': 'Watch', 'score': 2, 'state': 'La Niña Watch'},
            {'color': '#b8b8b8', 'label': 'Inactive', 'score': 3, 'state': 'Inactive'},
            {'color': '#ffb6b9', 'label': 'Watch', 'score': 4, 'state': 'El Niño Watch'},
            {'color': '#ff5b61', 'label': 'Alert', 'score': 5, 'state': 'El Niño Alert'},
            {'color': '#df151a', 'label': 'El Niño', 'score': 6, 'state': 'El Niño'}
        ]
    }

    proba_df = proba['table_proba'].copy()
    la_col = proba_df.columns[1]
    # ne_col = proba_df.columns[2]
    el_col = proba_df.columns[3]

    el_probs = pd.to_numeric(proba_df[el_col], errors='coerce').to_numpy()
    la_probs = pd.to_numeric(proba_df[la_col], errors='coerce').to_numpy()

    pred_oni = enso_expected_index(strength['table_proba'])

    # APCC-style interpretation using available CPC ENSO products
    el_watch = (
        ((ssta[-1] >= 0.5) and (-0.5 <= oni <= 0.5)) or
        (np.sum(pred_oni[:4] >= 0.5) >= 2) or
        (np.min(el_probs[:3]) >= 50)
    )

    el_alert = (
        ((np.sum(ssta >= 0.5) >= 2) and oni >= 0.5) and
        ((np.sum(pred_oni[:2] >= 0.5) >= 2) or 
        (np.min(el_probs[:3]) >= 60))
    )

    el_nino = (
        ((np.sum(ssta >= 0.5) >= 2) and oni >= 0.5) and
        (np.sum(pred_oni[:3] >= 0.5) >= 3)
    )

    la_watch = (
        ((ssta[-1] <= -0.5) and (-0.5 <= oni <= 0.5)) or
        (np.sum(pred_oni[:4] <= -0.5) >= 2) or
        (np.min(la_probs[:3]) >= 50)
    )

    la_alert = (
        ((np.sum(ssta <= -0.5) >= 2) and oni <= -0.5) and
        ((np.sum(pred_oni[:2] <= -0.5) >= 2) or
        (np.min(la_probs[:3]) >= 60))
    )

    la_nina = (
        ((np.sum(ssta <= -0.5) >= 2) and oni <= -0.5) and
        (np.sum(pred_oni[:3] <= -0.5) >= 3)
    )

    if el_nino:
        enso_class['score'] = 6
    elif el_alert:
        enso_class['score'] = 5
    elif el_watch:
        enso_class['score'] = 4
    elif la_nina:
        enso_class['score'] = 0
    elif la_alert:
        enso_class['score'] = 1
    elif la_watch:
        enso_class['score'] = 2
    else:
        enso_class['score'] = 3

    year = proba['issued_date'].strftime('%Y')
    issued_date = proba['issued_date'].strftime('%d %B %Y')
    enso_class['left_text'] = f'Issued: {issued_date}'

    season = proba_df['Season'].astype(str).tolist()[:4]
    season = [s[1] for s in season]
    season = ''.join(season)
    enso_class['right_text'] = f'Season: {year} {season}'

    return enso_class

def monthly_sst_products():
    return [
        {'table': 'enso_oisstv21_cpc_monthly', 'name': 'oisstv21_cpc'},
        {'table': 'enso_ersstv5_ncei_monthly', 'name': 'ersstv5_ncei'},
        {'table': 'enso_ersstv6_ncei_monthly', 'name': 'ersstv6_ncei'},
        {'table': 'enso_ersstv5_cpc_monthly', 'name': 'ersstv5_cpc'}
    ]

def weekly_sst_products():
    return [
        {'table': 'enso_oisstv21_cpc_weekly', 'name': 'oisstv21_cpc'}
    ]

def table_sst_products(sst_product, time_res):
    if time_res == 'weekly':
        sst_products_list = weekly_sst_products()
    elif time_res == 'monthly':
        sst_products_list = monthly_sst_products()
    else:
        raise ValueError(f'Unknown SST temporal resolution')

    table = next(
        (
            item['table']
            for item in sst_products_list
            if item['name'] == sst_product
        ),
        None
    )

    if table is None:
        raise ValueError(f'Unknown sst_product={sst_product}')

    return table

def read_enso_data_weekly(sst_product, columns='*', start=None, end=None, week=None):
    table = table_sst_products(sst_product, 'weekly')
    df = readENSOWeeklyDataFrame(table, columns, start, end, week)
    return df.dropna()

def read_enso_data_monthly(sst_product, columns='*', start=None, end=None, month=None):
    table = table_sst_products(sst_product, 'monthly')
    df = readENSOMonthlyDataFrame(table, columns, start, end, month)
    return df.dropna()

def read_enso_oni_cpc(oni_type, start=None, end=None, month=None):
    if oni_type == 'oni':
        table = 'enso_oni_cpc'
    elif oni_type == 'roni':
        table = 'enso_roni_cpc'
    else:
        raise ValueError('Unknown ONI type')

    df = readCPCONIDataFrame(table, start, end, month)
    return df.dropna()

def read_iod_data_monthly(sst_product, columns='*', start=None, end=None, month=None):
    if sst_product == 'ersstv5_ncei':
        table = 'iod_ersstv5_ncei_monthly'
    elif sst_product == 'ersstv6_ncei':
        table = 'iod_ersstv6_ncei_monthly'
    else:
        raise ValueError('Unknown IOD table')

    df = readENSOMonthlyDataFrame(table, columns, start, end, month)
    return df.dropna()

def read_nao_data_monthly(columns='*', start=None, end=None, month=None):
    table = 'nao_cdas_cpc_monthly'
    df = readENSOMonthlyDataFrame(table, columns, start, end, month)
    return df.dropna()

def read_atl3_data_monthly(columns='*', start=None, end=None, month=None):
    table = 'atl3_cdas_cpc_monthly'
    df = readENSOMonthlyDataFrame(table, columns, start, end, month)
    return df.dropna()
