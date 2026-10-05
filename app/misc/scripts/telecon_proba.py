import numpy as np
import pandas as pd
import xarray as xr

def telecon_conditional_probability(
    ds_terciles, df_indices,
    target_tercile, target_index
):
    years = np.intersect1d(
        ds_terciles.year.values,
        df_indices['year'].values
    )
    ds_terciles = ds_terciles.sel(year=years)
    # df_indices = (
    #     df_indices.set_index('year')
    #               .loc[ds_terciles.year.values]
    #               .reset_index()
    # )
    df_indices = (
        df_indices.set_index('year')
                  .loc[years]
                  .reset_index()
    )
    da_indices = xr.DataArray(
        df_indices['class'].to_numpy(),
        coords={'year': years},
        dims=['year'],
        name='class'
    )

    condition = da_indices == target_index
    target = ds_terciles['tercile'] == target_tercile
    proba = target.where(condition).mean('year')
    proba.name = 'proba'
    proba.attrs['long_name'] = 'Probability'
    proba.attrs['units'] = 'fraction'
    return proba

def map_telecon_classes(params):
    if params['variable'] == 'rainfall':
        clim_labels = ('Dry', 'Normal', 'Wet')
        clim_values = ('dry', 'normal', 'wet')

    if params['variable'] == 'temperature':
        clim_labels = ('Cold', 'Normal', 'Hot')
        clim_values = ('cold', 'normal', 'hot')

    clim_terciles = {i: v for i, v in enumerate(clim_labels)}
    clim_values = {v: i for i, v in enumerate(clim_values)}

    if params['teleconIndex'] == 'iod':
        tele_thres = [-0.35, 0.35]
        tele_labels = ('Negative', 'Neutral', 'Positive') 
        tele_values = ('negative', 'neutral', 'positive')

    if params['teleconIndex'] == 'nao':
        tele_thres = [-0.45, 0.45]
        tele_labels = ('Negative', 'Neutral', 'Positive')
        tele_values = ('negative', 'neutral', 'positive')

    if params['teleconIndex'] == 'atl3':
        tele_thres = [-0.35, 0.35]
        tele_labels = ('Negative', 'Neutral', 'Positive')
        tele_values = ('negative', 'neutral', 'positive')

    if params['teleconIndex'] == 'enso':
        tele_thres = [-0.45, 0.45]
        tele_labels = ('La Niña', 'Neutral', 'El Niño')
        tele_values = ('lanina', 'neutral', 'elnino')

    tele_classes = {i: v for i, v in enumerate(tele_labels)}
    tele_values = {v: i for i, v in enumerate(tele_values)}

    return {
            'terciles': {
                'labels': clim_labels,
                'classes': clim_terciles,
                'values': clim_values
            },
            'telecon': {
                'labels': tele_labels,
                'classes': tele_classes,
                'threshold': tele_thres,
                'values': tele_values
            }
        }

def classify_telecon_index(df_seas, thres):
    x = df_seas['value'].to_numpy()
    df_seas['class'] = np.where(
        x <= thres[0], 0,
        np.where(x >= thres[1], 2, 1)
    ).astype(np.int8)
    return df_seas

def lagged_telecon_filter(df_class, seas_start):
    """
    Persistent ENSO-event filtering
    This keeps persistent ENSO events using a 3-season moving window.

    The logic below keeps:
      - La Niña if at least 2 of current/previous 2 seasons are La Niña
      - El Niño if at least 2 of current/previous 2 seasons are El Niño
      - Neutral otherwise
    Can also be used with IOD and NAO
    """
    out = df_class.copy()
    t0 = (out['class'] == 0).astype(int)
    t1 = (out['class'] == 2).astype(int)

    t0_count = t0.rolling(window=3, min_periods=1).sum()
    t1_count = t1.rolling(window=3, min_periods=1).sum()

    out['filtered_class'] = 1
    out.loc[t0_count >= 2, 'filtered_class'] = 0
    out.loc[t1_count >= 2, 'filtered_class'] = 2

    seas = out['month'] == seas_start
    out = out[seas].reset_index(drop=True)
    out = out[['year', 'value', 'filtered_class']]
    out.columns = ['year', 'value', 'class']
    return out

def classify_climvar_terciles(xr_ds, labels, method='iq'):
    """
    method
    er: empirical rank, equivalent to the Ingrid function 'percentileover'
    iq: interpolated quantiles
    """
    if method == 'iq':
        q33 = xr_ds.quantile(1/3, dim='year')
        q67 = xr_ds.quantile(2/3, dim='year')
        tercile = xr.where(
            xr_ds < q33, 0,
            xr.where(xr_ds < q67, 1, 2)
        ).astype(np.int8)

    if method == 'er':
        ds = xr_ds.chunk({'year': -1})
        pct = ds.rank(dim='year', pct=True)
        tercile = xr.where(
            pct <= 1/3, 0,
            xr.where(pct <= 2/3, 1, 2)
        ).astype(np.int8)

    tercile = tercile.rename({'seas_var': 'tercile'})
    tercile.attrs.update({
        'long_name': 'Climate variable terciles',
        'classes': {
            0: labels[0],
            1: labels[1],
            2: labels[2]
        }
    })
    return tercile
