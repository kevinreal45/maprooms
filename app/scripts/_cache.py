from flask_caching import Cache
import os
import json
import hashlib
from ._global import GLOBAL_CONFIG

cache_dir = GLOBAL_CONFIG['app_cache']
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)

cache = Cache(config = {
    'CACHE_TYPE': 'FileSystemCache',
    'CACHE_DIR': cache_dir,
    'CACHE_THRESHOLD': 1000000,
    'CACHE_DEFAULT_TIMEOUT': 0,
    'CACHE_OPTIONS':{'mode': 777}
})

def _hash_params(pars):
    pars = json.dumps(pars, sort_keys=True, separators=(',', ':'))
    pars = pars.encode('utf-8')
    return hashlib.md5(pars).hexdigest()

def cache_data_functions(function, hash_key, params):
    cache_key = hash_key(params)
    # cache.delete(cache_key)
    cached_data = cache.get(cache_key)
    if cached_data is None:
        cached_data = function(params)
        if cached_data['status'] == -1:
            return json.dumps(cached_data)
        cache.set(cache_key, cached_data)
    return json.dumps(cached_data)

def hash_pamars_clim(params):
    exclude = ['apiKey', 'user', 'httpMethod', 'webApp', 'colorbar']
    pars = {k: str(v) for k, v in params.items() if k not in exclude}
    return _hash_params(pars)

def hash_pamars_telecon_map(params):
    exclude = ['mapType', 'colorbar']
    pars = {k: str(v) for k, v in params.items() if k not in exclude}
    return _hash_params(pars)

def hash_pamars_anom(params):
    pars_keys = [
        'analysis', 'anomaly', 'Date', 'startDate', 'endDate',
        'Year', 'seasStart', 'seasLength', 'dataset', 'temporalRes',
        'variable', 'climFunction', 'fullYear', 'fullYearTS',
        'climDate', 'daysWindow', 'startYear', 'endYear', 'minYear',
        'geomExtract', 'pointsSource', 'pointsFile', 'pointsList',
        'padLon', 'padLat', 'minLon', 'maxLon', 'minLat', 'maxLat',
        'shpSource', 'shpFile', 'shpField', 'Poly', 'allPolygons',
        'geojsonSource', 'geojsonFile', 'geojsonData', 'geojsonField',
        'spatialAvg', 'dailyAnalysis', 'minFrac', 'seasParams',
        'startMonth', 'startDay', 'endMonth', 'endDay', 'defThres',
        'defSpell', 'defTempBase', 'seasStats'
    ]
    pars = {k: str(v) for k, v in params.items() if k in pars_keys}
    return _hash_params(pars)

def hash_pamars_spei(params):
    pars_keys = [
        'analysis', 'distribution', 'timeScale', 'timeRes', 'dataset',
        'temporalRes', 'variable', 'Date', 'startDate', 'endDate',
        'Year', 'seasStart', 'seasLength',
        'geomExtract', 'pointsSource', 'pointsFile', 'pointsList',
        'padLon', 'padLat', 'minLon', 'maxLon', 'minLat', 'maxLat',
        'shpSource', 'shpFile', 'shpField', 'Poly', 'allPolygons',
        'geojsonSource', 'geojsonFile', 'geojsonData',
        'geojsonField', 'spatialAvg', 'minFrac'
    ]
    pars = {k: str(v) for k, v in params.items() if k in pars_keys}
    return _hash_params(pars)

def hash_distr_pamars_spei(params):
    pars_keys = [
        'analysis', 'distribution', 'timeScale',
        'dataset', 'timeRes', 'temporalRes', 'variable'
    ]
    pars = {k: str(v) for k, v in params.items() if k in pars_keys}
    return _hash_params(pars)

def hash_params_ts_data(params):
    pars_keys = [
        'geomExtract', 'pointsSource', 'pointsList', 'shpSource', 'shpFile',
        'shpField', 'Poly', 'dataset', 'temporalRes', 'variable', 'startDate',
        'endDate', 'startYear', 'endYear', 'minYear', 'anomaly', 'chartType',
        'seasStart', 'seasLength', 'fullYearTS', 'fullYear', 'climDate',
        'climFunction', 'dailyAnalysis', 'minFrac', 'seasParams', 'startMonth',
        'startDay', 'endMonth', 'endDay', 'defThres', 'defSpell', 'defTempBase'
    ]
    pars = {k: str(v) for k, v in params.items() if k in pars_keys}
    return _hash_params(pars)

def hash_params_rainy_season(seas_params):
    return _hash_params(seas_params)

def hash_params_ts_cropsuit(params):
    pars_keys = [
        'geomExtract', 'pointsSource', 'pointsList',  'dataset', 'temporalRes',
        'variable', 'minFrac', 'startMonth', 'startDay', 'endMonth', 'endDay',
        'precipLow', 'precipHigh', 'tempLow', 'tempHigh', 'tempOptim', 
        'nbWetDays', 'rainThres'
    ]
    pars = {k: str(v) for k, v in params.items() if k in pars_keys}
    return _hash_params(pars)
