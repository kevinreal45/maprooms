import os
import json
import pandas as pd
from datetime import date
from .enso import *
from .sqlite import *
from app.scripts._global import GLOBAL_CONFIG

def update_enso_oni_cpc(oni_type='roni'):
    if oni_type == 'oni':
        table_name = 'enso_oni_cpc'
        oni_function = get_enso_oni_cpc
    elif oni_type == 'roni':
        table_name = 'enso_roni_cpc'
        oni_function = get_enso_roni_cpc
    else:
        raise ValueError('Unknown ONI type')

    end_date = tableLastRecords(
        table_name, 'start_month', 'start_month', 1
    )
    if len(end_date) == 0:
        oni = oni_function()
        writeDataToTable(oni, table_name)
    else:
        oni = oni_function(lastrows=24)
        last = pd.to_datetime(
            end_date[0]['start_month'], format='%Y-%m'
        )
        starts = pd.to_datetime(
            oni['start_month'], format='%Y-%m'
        )
        _insert_data_into_table(oni, table_name, starts, last)

def update_enso_oisstv21_cpc(time_res='weekly'):
    if time_res == 'weekly':
        table_name = 'enso_oisstv21_cpc_weekly'
        end_date = tableLastRecords(
            table_name, 'week', 'week', 1
        )
    elif time_res == 'monthly':
        table_name = 'enso_oisstv21_cpc_monthly'
        end_date = tableLastRecords(
            table_name,
            ['year', 'month'],
            ['year', 'month'],
            1
        )
    else:
        raise ValueError('Unknown OISST temporal resolution')

    if len(end_date) == 0:
        enso = get_enso_oisstv21_cpc(time_res)
        writeDataToTable(enso, table_name)
    else:
        if time_res == 'weekly':
            enso = get_enso_oisstv21_cpc(time_res, lastrows=52)
            last = pd.to_datetime(
                end_date[0]['week'], format='%Y-%m-%d'
            )
            starts = pd.to_datetime(
                enso['week'], format='%Y-%m-%d'
            )
        else:
            enso = get_enso_oisstv21_cpc(time_res, lastrows=24)
            last = pd.to_datetime(
                f"{end_date[0]['year']}-{end_date[0]['month']}",
                format='%Y-%m'
            )
            starts = pd.to_datetime({
                'year': enso['year'],
                'month': enso['month'],
                'day': 1
            })
        _insert_data_into_table(enso, table_name, starts, last)

def update_enso_ersst_ncei(ersst_version=5):
    if ersst_version == 5:
        table_name = 'enso_ersstv5_ncei_monthly'
    elif ersst_version == 6:
        table_name = 'enso_ersstv6_ncei_monthly'
    else:
        raise ValueError('Unknown ERSST version')

    end_date = tableLastRecords(
        table_name,
        ['year', 'month'],
        ['year', 'month'],
        1
    )

    if len(end_date) == 0:
        enso = get_enso_ersst_ncei(ersst_version)
        writeDataToTable(enso, table_name)
    else:
        enso = get_enso_ersst_ncei(ersst_version, lastrows=24)
        last = pd.to_datetime(
            f"{end_date[0]['year']}-{end_date[0]['month']}",
            format='%Y-%m'
        )
        starts = pd.to_datetime({
            'year': enso['year'],
            'month': enso['month'],
            'day': 1
        })
        _insert_data_into_table(enso, table_name, starts, last)

def update_enso_ersstv5_cpc_monthly():
    table_name = 'enso_ersstv5_cpc_monthly'
    end_date = tableLastRecords(
        table_name,
        ['year', 'month'],
        ['year', 'month'],
        1
    )

    if len(end_date) == 0:
        enso = get_enso_ersstv5_cpc_monthly()
        writeDataToTable(enso, table_name)
    else:
        enso = get_enso_ersstv5_cpc_monthly(lastrows=24)
        last = pd.to_datetime(
            f"{end_date[0]['year']}-{end_date[0]['month']}",
            format='%Y-%m'
        )
        starts = pd.to_datetime({
            'year': enso['year'],
            'month': enso['month'],
            'day': 1
        })
        _insert_data_into_table(enso, table_name, starts, last)

def update_iod_ersst_ncei(ersst_version=5):
    if ersst_version == 5:
        table_name = 'iod_ersstv5_ncei_monthly'
    elif ersst_version == 6:
        table_name = 'iod_ersstv6_ncei_monthly'
    else:
        raise ValueError('Unknown ERSST version')

    end_date = tableLastRecords(
        table_name,
        ['year', 'month'],
        ['year', 'month'],
        1
    )

    if len(end_date) == 0:
        iod = get_iod_ersst_ncei(ersst_version)
        writeDataToTable(iod, table_name)
    else:
        iod = get_iod_ersst_ncei(ersst_version, lastrows=24)
        last = pd.to_datetime(
            f"{end_date[0]['year']}-{end_date[0]['month']}",
            format='%Y-%m'
        )
        starts = pd.to_datetime({
            'year': iod['year'],
            'month': iod['month'],
            'day': 1
        })
        _insert_data_into_table(iod, table_name, starts, last)

def update_nao_cpc_cdas_monthly():
    table_name = 'nao_cdas_cpc_monthly'
    end_date = tableLastRecords(
        table_name,
        ['year', 'month'],
        ['year', 'month'],
        1
    )

    if len(end_date) == 0:
        nao = get_nao_cpc_cdas_monthly()
        writeDataToTable(nao, table_name)
    else:
        nao = get_nao_cpc_cdas_monthly(lastrows=5)
        last = pd.to_datetime(
            f"{end_date[0]['year']}-{end_date[0]['month']}",
            format='%Y-%m'
        )
        starts = pd.to_datetime({
            'year': nao['year'],
            'month': nao['month'],
            'day': 1
        })
        _insert_data_into_table(nao, table_name, starts, last)

def update_atl3_cpc_monthly():
    table_name = 'atl3_cdas_cpc_monthly'
    end_date = tableLastRecords(
        table_name,
        ['year', 'month'],
        ['year', 'month'],
        1
    )

    if len(end_date) == 0:
        atl3 = get_atl3_cpc_monthly()
        writeDataToTable(atl3, table_name)
    else:
        atl3 = get_atl3_cpc_monthly(lastrows=5)
        last = pd.to_datetime(
            f"{end_date[0]['year']}-{end_date[0]['month']}",
            format='%Y-%m'
        )
        starts = pd.to_datetime({
            'year': atl3['year'],
            'month': atl3['month'],
            'day': 1
        })
        _insert_data_into_table(atl3, table_name, starts, last)

def _insert_data_into_table(data, table_name, starts, last):
    new_df = data[starts > last]
    if len(new_df) > 0:
        columns = new_df.columns.tolist()
        insertDataToTable(new_df, columns, table_name)

def update_enso_probabilities():
    enso_dir = os.path.join(
        GLOBAL_CONFIG['data_dir'], 'cpc_enso_proba'
    )
    proba_dir = os.path.join(enso_dir, 'proba')
    strength_dir = os.path.join(enso_dir, 'strength')

    proba = get_enso_probabilities()
    p_file = proba['issued_date'].strftime('proba_%Y%m%d.parquet')
    p_path = os.path.join(proba_dir, p_file)
    if not os.path.exists(p_path):
        proba['table_proba'].to_parquet(
            p_path, engine='fastparquet'
        )
        insertProbaToTable(
            proba['issued_date'],
            p_file,
            'cpc_enso_probabilities'
        )

    strength = get_enso_strength_probabilities()
    s_file = strength['issued_date'].strftime('strength_%Y%m%d.parquet')
    s_path = os.path.join(strength_dir, s_file)
    js_file = 'strength_probabilities_class.json'
    js_path = os.path.join(enso_dir, js_file)
    if not os.path.exists(js_path):
        with open(js_path, 'w', encoding='utf-8') as f:
            json.dump(
                strength['header_info'],
                f,
                indent=4,
                ensure_ascii=False
            )
    if not os.path.exists(s_path):
        strength['table_proba'].to_parquet(
            s_path, engine='fastparquet'
        )
        insertProbaToTable(
            strength['issued_date'],
            s_file,
            'cpc_enso_strengths'
        )

def read_enso_probabilities(issue_date=None):
    # issue_date='2026-06-11'
    enso_dir = os.path.join(
        GLOBAL_CONFIG['data_dir'], 'cpc_enso_proba'
    )
    proba_dir = os.path.join(enso_dir, 'proba')

    msg_p = 'NOAA CPC ENSO Probabilities'
    if issue_date is None:
        e_proba = tableLastRecords(
            'cpc_enso_probabilities', '*', 'issued', 1
        )
    else:
        e_proba = readProbaTable(
            issue_date, 'cpc_enso_probabilities'
        )
        if len(e_proba) == 0:
            raise ValueError(f'No issue date: {issue_date} for {msg_p}')

    p_path = os.path.join(proba_dir, e_proba[0]['file'])
    t_proba = date.fromisoformat(e_proba[0]['issued'])
    d_proba = pd.read_parquet(p_path, engine='fastparquet')

    return {
            'issued_date': t_proba,
            'table_proba': d_proba
        }

def read_enso_strengths(issue_date=None):
    # issue_date='2026-06-11'
    enso_dir = os.path.join(
        GLOBAL_CONFIG['data_dir'], 'cpc_enso_proba'
    )
    strength_dir = os.path.join(enso_dir, 'strength')
    msg_s = 'NOAA CPC ENSO Strength Probabilities'

    if issue_date is None:
        e_strength = tableLastRecords(
            'cpc_enso_strengths', '*', 'issued', 1
        )
    else:
        e_strength = readProbaTable(
            issue_date, 'cpc_enso_strengths'
        )
        if len(e_strength) == 0:
            raise ValueError(f'No issue date: {issue_date} for {msg_s}')

    s_path = os.path.join(strength_dir, e_strength[0]['file'])
    js_file = 'strength_probabilities_class.json'
    js_path = os.path.join(enso_dir, js_file)
    t_strength = date.fromisoformat(e_strength[0]['issued'])
    d_strength = pd.read_parquet(s_path, engine='fastparquet')
    with open(js_path, 'r', encoding='utf-8') as f:
        h_strength = json.load(f)

    return {
            'issued_date': t_strength,
            'header_info': h_strength,
            'table_proba': d_strength
        }

def read_enso_probabilities_all(issue_date=None):
    # issue_date='2026-06-11'
    proba = read_enso_probabilities(issue_date)
    strength = read_enso_strengths(issue_date)

    t_proba = proba['issued_date'].strftime('%Y%m%d')
    t_strength = strength['issued_date'].strftime('%Y%m%d')

    if t_proba != t_strength:
        msg_p = 'NOAA CPC ENSO Probabilities'
        msg_s = 'NOAA CPC ENSO Strength Probabilities'
        raise ValueError(f'Different issue dates for {msg_p} and {msg_s}') 

    return {
            'probabilities': proba,
            'strengths': strength
        }
