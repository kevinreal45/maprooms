import os
import re
import sqlite3
import pandas as pd
from app.scripts._global import GLOBAL_CONFIG

def connection():
    sqlite_db = os.path.join(
        GLOBAL_CONFIG['data_dir'], 'enso-sqlite.db'
    )
    return sqlite3.connect(sqlite_db)

def _convert2json(cursor):
    row_headers = [x[0] for x in cursor.description]
    result = cursor.fetchall()
    json_data = []
    for res in result:
        json_data.append(dict(zip(row_headers, res)))

    return json_data

def _executeSQLCmd(sqlCmd, args = None, commit = False):
    conn = connection()
    cursor = conn.cursor()

    if args is None:
        cursor.execute(sqlCmd)
    else:
        cursor.execute(sqlCmd, args)

    if commit:
        conn.commit()
        res = None
    else:
        tmp = sqlCmd.split(' ')
        tmp = [re.sub('\n', '', t) for t in tmp]
        tmp = [t for t in tmp if t != '']
        tmp = tmp[0].strip().lower()
        if tmp == 'select':
            res = _convert2json(cursor)
        else:
            res = None

    conn.close()
    return res

def _check_table_exist(table):
    sqlCmd = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    res = _executeSQLCmd(sqlCmd, (table,))
    return len(res) > 0

def _check_table_name(table):
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', table):
        raise ValueError(f'Invalid table name: {table}')

def _format_query_columns(columns):
    if columns == '*':
        return columns
    elif type(columns) is str:
        if columns.startswith('"') and columns.endswith('"'):
            return columns
        else:
            return f'"{columns}"'
    elif type(columns) is list:
        col_formated = [
            c if c.startswith('"') and c.endswith('"') else f'"{c}"'
            for c in columns
        ]
        return ', '.join(col_formated)
    else:
        raise ValueError('Unknown columns format')

def _format_query_order(order, sort='DESC'):
    if type(order) is str:
        return f'{order} {sort}'
    elif type(order) is list:
        if type(sort) is str:
            return ', '.join([f'{o} {sort}' for o in order])
        elif type(sort) is list:
            if len(order) != len(sort):
                raise ValueError(
                        'Different length of "order" and "sort" arguments'
                    )
            invalid = set(sort) - {'ASC', 'DESC'}
            if invalid:
                raise ValueError(f"Invalid sort values: {', '.join(invalid)}")
            else:
                return ', '.join([f'{o} {s}' for o, s in zip(order, sort)])
        else:
            raise ValueError('Unknown sort format')
    else:
        raise ValueError('Unknown order format')

def writeDataToTable(data, table, if_exists='append'):
    conn = connection()
    data.to_sql(
        table,
        conn,
        if_exists=if_exists,
        index=False
    )
    conn.close()

def insertDataToTable(data, columns, table):
    conn = connection()
    cursor = conn.cursor()
    vals = ', '.join(['?'] * len(columns))
    names = ', '.join(f'"{c}"' for c in columns)
    sqlCmd = f'INSERT OR REPLACE INTO "{table}" ({names}) VALUES ({vals})'
    cursor.executemany(
        sqlCmd,
        data[columns].itertuples(index=False, name=None)
    )
    conn.commit()
    conn.close()

def readPandasDataFrame(columns, table):
    columns = _format_query_columns(columns)
    query = f'SELECT {columns} FROM "{table}"'
    conn = connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def readENSOMonthlyDataFrame(table, columns='*', start=None, end=None, month=None):
    columns = _format_query_columns(columns)
    if start:
        start = re.sub('-', '', start)
    if end:
        end = re.sub('-', '', end)
    if month:
        month = re.sub('-', '', month)

    if month:
        query = f"""
            SELECT {columns} FROM "{table}"
            WHERE (year * 100 + month) = {month}
            ORDER BY year, month
        """
    else:
        if start and end:
            query = f"""
                SELECT {columns} FROM "{table}"
                WHERE (year * 100 + month) BETWEEN {start} AND {end}
            """
        elif start:
            query = f"""
                SELECT {columns} FROM "{table}"
                WHERE (year * 100 + month) >= {start}
                ORDER BY year, month
            """
        elif end:
            query = f"""
                SELECT {columns} FROM "{table}"
                WHERE (year * 100 + month) <= {end}
                ORDER BY year, month
            """
        else:
            query = f'SELECT {columns} FROM "{table}"'

    conn = connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def readENSOWeeklyDataFrame(table, columns='*', start=None, end=None, week=None):
    columns = _format_query_columns(columns)

    if week:
        query = f"""
            SELECT {columns} FROM "{table}"
            WHERE week = "{week}"
        """
    else:
        if start and end:
            query = f"""
                SELECT {columns} FROM "{table}"
                WHERE week BETWEEN "{start}" AND "{end}"
            """
        elif start:
            query = f"""
                SELECT {columns} FROM "{table}"
                WHERE week >= "{start}"
            """
        elif end:
            query = f"""
                SELECT {columns} FROM "{table}"
                WHERE week <= "{end}"
            """
        else:
            query = f'SELECT {columns} FROM "{table}"'

    conn = connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def readCPCONIDataFrame(table, start=None, end=None, month=None):
    if month:
        query = f"""
            SELECT * FROM "{table}"
            WHERE start_month = "{month}"
        """
    else:
        if start and end:
            query = f"""
                SELECT * FROM "{table}"
                WHERE start_month >= "{start}" AND start_month <= "{end}"
                ORDER BY start_month ASC
            """
        elif start:
            query = f"""
                SELECT * FROM "{table}"
                WHERE start_month >= "{start}"
                ORDER BY start_month ASC
            """
        elif end:
            query = f"""
                SELECT * FROM "{table}"
                WHERE start_month <= "{end}"
                ORDER BY start_month ASC
            """
        else:
            query = f'SELECT * FROM "{table}"'

    conn = connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def insertProbaToTable(date, file, table):
    sqlCmd = f'INSERT OR REPLACE INTO "{table}" (issued, file) VALUES (?, ?)'
    sqlVal = (date.isoformat(), file)
    _executeSQLCmd(sqlCmd, sqlVal, True)

def readProbaTable(date, table):
    sqlCmd = f'SELECT * FROM "{table}" WHERE issued="{date}"'
    return _executeSQLCmd(sqlCmd)

def tableLastRecords(table, columns, order, limit=1):
    columns = _format_query_columns(columns)
    order = _format_query_order(order)
    sqlCmd = f'SELECT {columns} FROM "{table}" ORDER BY {order} LIMIT {limit}'
    return _executeSQLCmd(sqlCmd)

def _table_enso_oni_cpc(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            start_month text primary key,
            end_month text,
            year integer,
            season text,
            anom real
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_enso_oisstv21_cpc_monthly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            year integer,
            month integer,
            "ranom_nino1+2" real,
            ranom_nino3 real,
            ranom_nino4 real,
            "ranom_nino3.4" real,
            "sst_nino1+2" real,
            "anom_nino1+2" real,
            sst_nino3 real,
            anom_nino3 real,
            sst_nino4 real,
            anom_nino4 real,
            "sst_nino3.4" real,
            "anom_nino3.4" real,
            primary key (year, month)
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_enso_oisstv21_cpc_weekly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            week text primary key,
            "ranom_nino1+2" real,
            ranom_nino3 real,
            "ranom_nino3.4" real,
            ranom_nino4 real,
            "sst_nino1+2" real,
            "anom_nino1+2" real,
            sst_nino3 real,
            anom_nino3 real,
            "sst_nino3.4" real,
            "anom_nino3.4" real,
            sst_nino4 real,
            anom_nino4 real
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_enso_ersst_ncei_monthly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            year integer,
            month integer,
            anom_nino3 real,
            anom_nino4 real,
            "anom_nino3.4" real,
            "anom_nino1+2" real,
            sst_nino3 real,
            sst_nino4 real,
            "sst_nino3.4" real,
            "sst_nino1+2" real,
            primary key (year, month)
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_iod_ersst_ncei_monthly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            year integer,
            month integer,
            west real,
            east real,
            diff real,
            primary key (year, month)
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_enso_ersstv5_cpc_monthly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            year integer,
            month integer,
            "sst_nino1+2" real,
            "anom_nino1+2" real,
            sst_nino3 real,
            anom_nino3 real,
            sst_nino4 real,
            anom_nino4 real,
            "sst_nino3.4" real,
            "anom_nino3.4" real,
            "ranom_nino3.4" real,
            primary key (year, month)
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_nao_cpc_cdas_monthly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            year integer,
            month integer,
            nao real,
            primary key (year, month)
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_atl3_cpc_monthly(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            year integer,
            month integer,
            tna real,
            tsa real,
            mgi real,
            atl3 real,
            primary key (year, month)
        )
    """
    _executeSQLCmd(sqlCmd)

def _table_enso_probabilities(table):
    _check_table_name(table)
    sqlCmd = f"""
        CREATE TABLE IF NOT EXISTS "{table}" (
            issued text primary key,
            file text
        )
    """
    _executeSQLCmd(sqlCmd)

def _dir_enso_probabilities():
    enso_dir = os.path.join(
        GLOBAL_CONFIG['data_dir'], 'cpc_enso_proba'
    )
    proba_dir = os.path.join(enso_dir, 'proba')
    if not os.path.exists(proba_dir):
        os.makedirs(proba_dir)
    strength_dir = os.path.join(enso_dir, 'strength')
    if not os.path.exists(strength_dir):
        os.makedirs(strength_dir)

def initENSOTables():
    table = 'enso_oni_cpc'
    if not _check_table_exist(table):
        _table_enso_oni_cpc(table)

    table = 'enso_roni_cpc'
    if not _check_table_exist(table):
        _table_enso_oni_cpc(table)

    table = 'enso_oisstv21_cpc_weekly'
    if not _check_table_exist(table):
        _table_enso_oisstv21_cpc_weekly(table)

    table = 'enso_oisstv21_cpc_monthly'
    if not _check_table_exist(table):
        _table_enso_oisstv21_cpc_monthly(table)

    table = 'enso_ersstv5_ncei_monthly'
    if not _check_table_exist(table):
        _table_enso_ersst_ncei_monthly(table)

    table = 'enso_ersstv6_ncei_monthly'
    if not _check_table_exist(table):
        _table_enso_ersst_ncei_monthly(table)

    table = 'enso_ersstv5_cpc_monthly'
    if not _check_table_exist(table):
        _table_enso_ersstv5_cpc_monthly(table)

    table = 'iod_ersstv5_ncei_monthly'
    if not _check_table_exist(table):
        _table_iod_ersst_ncei_monthly(table)

    table = 'iod_ersstv6_ncei_monthly'
    if not _check_table_exist(table):
        _table_iod_ersst_ncei_monthly(table)

    table = 'nao_cdas_cpc_monthly'
    if not _check_table_exist(table):
        _table_nao_cpc_cdas_monthly(table)

    table = 'atl3_cdas_cpc_monthly'
    if not _check_table_exist(table):
        _table_atl3_cpc_monthly(table)

    table = 'cpc_enso_probabilities'
    if not _check_table_exist(table):
        _table_enso_probabilities(table)

    table = 'cpc_enso_strengths'
    if not _check_table_exist(table):
        _table_enso_probabilities(table)

    _dir_enso_probabilities()

def getDataTemporalCoverage(table, enso_type):
    if enso_type == 'oni':
        sqlCmd = f"""
            SELECT
                MIN(start_month) AS start,
                MAX(start_month) AS end
            FROM "{table}"
        """
        res = _executeSQLCmd(sqlCmd)
        return res[0]
    elif enso_type in ['iod', 'nao', 'atl3']:
        sqlCmd = f"""
            SELECT
                MIN(year * 100 + month) AS t0,
                MAX(year * 100 + month) AS t1
            FROM "{table}"
        """
        res = _executeSQLCmd(sqlCmd)
        return _format_out_yyyymm(res[0])
    elif enso_type == 'anom':
        tmp = table.split('_')
        if tmp[-1] == 'weekly':
            sqlCmd = f"""
                SELECT
                    MIN(week) AS start,
                    MAX(week) AS end
                FROM "{table}"
            """
            res = _executeSQLCmd(sqlCmd)
            return res[0]
        else:
            sqlCmd = f"""
                SELECT
                    MIN(year * 100 + month) AS t0,
                    MAX(year * 100 + month) AS t1
                FROM "{table}"
            """
            res = _executeSQLCmd(sqlCmd)
            return _format_out_yyyymm(res[0])
    else:
        return {'start': None, 'end': None}

def _format_out_yyyymm(ym):
    return {
            'start': f'{ym['t0'] // 100:04d}-{ym['t0'] % 100:02d}',
            'end': f'{ym['t1'] // 100:04d}-{ym['t1'] % 100:02d}'
        }

