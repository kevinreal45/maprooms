import numpy as np
from app.scripts.colorbar import check_invalid_colors
from app.scripts.imagepng import create_imagePng
from app.dst_api.scripts import aggregate_seasonal_xrdata
from app.misc.scripts.telecon_seasonal import (
    telecon_oni_seasonal,
    telecon_iod_seasonal,
    telecon_nao_seasonal,
    telecon_atl3_seasonal
)
from app.misc.scripts.telecon_proba import *
from app.scripts._cache import cache, hash_pamars_telecon_map

def climate_teleconnections_sp(params):
    check = check_invalid_colors(params['colorbar'])
    if check['status'] == -1: return check

    data = get_climate_teleconnections_sp(params)
    if data['status'] == -1: return data

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

    map_png['date'] = data['proba']
    # map_png['ckeys']['title'] = f"{data['longname']} ({data['units']})"
    map_png['ckeys']['title'] = f"{data['longname']}: {data['proba']}"

    return {'status': 0, 'data': map_png}

def get_climate_teleconnections_sp(params):
    cache_key = hash_pamars_telecon_map(params)
    cached_data = cache.get(cache_key)
    if cached_data is None:
        cached_data = _conditional_probability_sp(params)
        if cached_data['status'] == -1:
            return cached_data
        cache.set(cache_key, cached_data)

    return cached_data

def _conditional_probability_sp(params):
    seas = aggregate_seasonal_xrdata(params)
    if seas['status'] == -1:
        return seas_data
    data_seas = seas['data']

    info_class = map_telecon_classes(params)

    clim_ter = classify_climvar_terciles(
        data_seas, info_class['terciles']['labels'], 'iq'
    )

    year1 = clim_ter['year'].values.min()
    year2 = clim_ter['year'].values.max()
    start_date = f'{year1 - 1}-01'
    end_date = f'{year2 + 1}-12'

    if params['teleconIndex'] == 'iod':
        sst_prod = 'ersstv5_ncei'
        # sst_prod = 'ersstv6_ncei'

        df_seas = telecon_iod_seasonal(
            params, sst_prod,
            start_date, end_date,
            params['fullSeas']
        )

    if params['teleconIndex'] == 'nao':
        df_seas = telecon_nao_seasonal(
            params,
            start_date, end_date,
            params['fullSeas']
        )

    if params['teleconIndex'] == 'atl3':
        df_seas = telecon_atl3_seasonal(
            params,
            start_date, end_date,
            params['fullSeas']
        )

    if params['teleconIndex'] == 'enso':
        # sst_prod = 'oisstv21_cpc'
        sst_prod = 'ersstv5_cpc'
        # sst_prod = 'ersstv5_ncei'
        # sst_prod = 'ersstv6_ncei'

        df_seas = telecon_oni_seasonal(
            params, sst_prod,
            start_date, end_date,
            params['fullSeas']
        )

    if params['fullSeas']:
        t_index = classify_telecon_index(
            df_seas, info_class['telecon']['threshold']
        )
        t_index = lagged_telecon_filter(t_index, params['seasStart'])
    else:
        t_index = classify_telecon_index(
            df_seas, info_class['telecon']['threshold']
        )

    ter = info_class['terciles']['values'][params['climTercile']]
    idx = info_class['telecon']['values'][params['ensoTercile']]
    proba = telecon_conditional_probability(
        ds_terciles=clim_ter,
        df_indices=t_index,
        target_tercile=ter,
        target_index=idx
    )
    vter = info_class['terciles']['classes'][ter]
    vidx = info_class['telecon']['classes'][idx]
    tele = params['teleconIndex'].upper()
    cond_proba = f'P(Tercile = {vter} | {tele} phase = {vidx})'

    mask = np.isnan(data_seas['seas_var'].values[0, :, :])
    data = np.ma.masked_array(proba.values, mask = mask)

    return {
            'status': 0,
            'proba': cond_proba,
            'lon': proba['lon'].values,
            'lat': proba['lat'].values,
            'data': data,
            'longname': proba.attrs['long_name'],
            'units': proba.attrs['units'],
            'varid': proba.name
        }
