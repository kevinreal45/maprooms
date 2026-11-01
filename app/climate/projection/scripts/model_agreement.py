
import calendar
from pathlib import Path

import numpy as np
import xarray as xr

from app.scripts._global import GLOBAL_CONFIG
from app.scripts.imagepng import create_imagePng

from .projection_data import (
    get_climate_projection_dataset,
    get_climate_projection_variable,
)
from .projection_sp import (
    _integer,
    _seasonal_values,
    _projection_period_years,
)

from .projection_ts import _available_future_models

def get_climate_projection_agreement_sp_data(params):
    start = _integer(params, 'seasStart', 1, 12)
    end = _integer(params, 'seasEnd', 1, 12)

    historical_year, historical_end, future_year, future_end = _projection_period_years(params, yaml_filename='model-agreement.yaml')

    crosses_year = int(end < start)

    historical_period = (historical_end - historical_year + 1 - crosses_year)
    period = future_end - future_year + 1 - crosses_year

    if historical_period < 1 or period < 1:
        raise ValueError('Each period must contain at least one complete season.')

    signal = params['change']
    if signal not in ('positive', 'negative'):
        raise ValueError('Unknown change signal.')

    config = GLOBAL_CONFIG['climate_projection']

    if params['variable'] not in config['variables']:
        raise ValueError('Unknown projection variable.')

    variable_id = config['variables'][params['variable']]
    variable_info = config['netcdf'][variable_id]
    rainfall = params['variable'] == 'rainfall'

    historical_root = (
        Path(config['zarr_dir'])
        / variable_info['folder']
        / config['historical']['directory']
    )

    reference = None
    valid_count = None
    agreement_count = None
    models = []

    for model in _available_future_models(params):
        historical_path = historical_root / model / f'{variable_id}.zarr'

        # Verif here later /// to only include models with both periods available
        if not historical_path.is_dir():
            continue

        historical_params = {
            **params,
            'model': model,
            'dataset': config['historical']['dataset'],
        }
        future_params = {
            **params,
            'model': model,
            'dataset': config['projection']['dataset'],
        }

        with (
            get_climate_projection_dataset(historical_params) as historical_ds,
            get_climate_projection_dataset(future_params) as future_ds,
        ):
            historical = get_climate_projection_variable(
                historical_ds, historical_params
            )
            future = get_climate_projection_variable(
                future_ds, future_params
            )

            if historical.attrs['units'] != future.attrs['units']:
                raise ValueError(f'Units do not match for model {model}.')

            historical_clim = _seasonal_values(
                historical,
                historical_year,
                historical_period,
                start,
                end,
                rainfall=rainfall,
            ).mean('season_year', skipna=False)

            future_clim = _seasonal_values(
                future,
                future_year,
                period,
                start,
                end,
                rainfall=rainfall,
            ).mean('season_year', skipna=False)

            historical_clim, future_clim = xr.align(
                historical_clim,
                future_clim,
                join='exact',
            )

            change = (
                future_clim - historical_clim
            ).transpose('lat', 'lon').compute()

        if not np.isfinite(change.values).any():
            continue

        if reference is None:
            reference = change
            valid_count = np.zeros(change.shape, dtype=np.int32)
            agreement_count = np.zeros(change.shape, dtype=np.int32)
        else:
            same_grid = (
                np.array_equal(change.lat.values, reference.lat.values)
                and np.array_equal(change.lon.values, reference.lon.values)
            )

            if not same_grid:
                change = change.interp(
                    lat=reference.lat,
                    lon=reference.lon,
                    method='linear',
                ).transpose('lat', 'lon')

        values = change.values
        valid = np.isfinite(values)

        if not valid.any():
            continue

        matching = (
            values >= 0
            if signal == 'positive'
            else values <= 0
        )

        valid_count += valid
        agreement_count += valid & matching
        models.append(model)

    if not models:
        raise ValueError(
            'No matching historical and future models provide '
            'complete seasonal data for these selections.'
        )

    agreement = np.divide(
        100.0 * agreement_count,
        valid_count,
        out=np.full(reference.shape, np.nan, dtype=float),
        where=valid_count > 0,
    )

    season = (
        f'{calendar.month_abbr[start]}–'
        f'{calendar.month_abbr[end]}'
    )

    counts = valid_count[valid_count > 0]

    return {
        'status': 0,
        'lon': reference.lon.values,
        'lat': reference.lat.values,
        'data': agreement,
        'varid': 'clim_var',
        'longname': f'Model agreement: {signal} change',
        'units': '%',
        'models': models,
        'reference_model': models[0],
        'valid_model_count_range': [
            int(counts.min()),
            int(counts.max()),
        ],
        'date': (
            f'{season} <br> Fut.Period.'
            f'{future_year}–{future_end}; <br>'
            f'Ref.Clim. '
            f'{historical_year}–{historical_end}; <br>'
            f'{len(models)} models'
        ),
    }


def climate_projection_agreement_sp_data(data):
    result = create_imagePng(
        data,
        breaks=[0, 10, 50, 70, 100],
        colors=['white', 'orange', 'green', 'darkgreen'],
        colors_ext=['white', 'darkgreen'],
    )

    if result is None:
        return {
            'status': -1,
            'message': 'Unable to render the model agreement map.',
        }

    result['date'] = data['date']
    result['ckeys']['title'] = (
        f"{data['longname']} ({data['units']})"
    )
    result['models'] = data['models']
    result['reference_model'] = data['reference_model']
    result['valid_model_count_range'] = data['valid_model_count_range']


    result['ckeys']['categories'] = [
        {
            'label': 'None',
            'range': '0–<10%',
            'color': 'white',
        },
        {
            'label': 'Low',
            'range': '10–<50%',
            'color': 'orange',
        },
        {
            'label': 'Medium',
            'range': '50–<70%',
            'color': 'green',
        },
        {
            'label': 'High',
            'range': '70–100%',
            'color': 'darkgreen',
        },
    ]

    return {'status': 0, 'data': result}

