import os
import re
import shutil
import tempfile
from datetime import datetime

import pandas as pd
import xarray as xr
import yaml
from werkzeug.utils import secure_filename

from app.scripts._global import GLOBAL_CONFIG

FORECAST_FILE_PATTERNS = {
    'seasonal': {
        'required': [
            r'^MME_deterministic_forecast_\d{4}\.nc$',
            r'^MME_forecast_prediction_error_variance_\d{4}\.nc$',
            r'^MME_probabilistic_forecast_\d{4}\.nc$',
            r'^obs\.nc$',
        ],
        'optional': [
            r'^MME_deterministic_hindcasts\.nc$',
            r'^MME_hindcast_prediction_error_variance\.nc$',
            r'^MME_probabilistic_hindcasts\.nc$',
            r'^MME_skill_scores\.nc$',
        ],
    },
    'tendays': {
        'required': [
            r'^PrecDaily\.nc$',
            r'^PrecExtreme\.nc$',
            r'^TavgDaily\.nc$',
            r'^TmaxDaily\.nc$',
            r'^TminDaily\.nc$',
        ],
        'optional': [
            r'^PrecDailyYrsPercentile\.nc$',
            r'^PrecHourly\.nc$',
            r'^TavgHourly\.nc$',
        ],
    },
}


class ForecastUploadError(Exception):
    def __init__(self, message_key):
        self.message_key = message_key
        super().__init__(message_key)


def _validate_forecast_files(files, forecast_type):
    if forecast_type == 'monthly':
        return 'monthly_not_defined'
    if forecast_type not in FORECAST_FILE_PATTERNS:
        return 'unknown_type'
    if not files:
        return 'no_files'
    filenames = [secure_filename(upload.filename) for upload in files]
    if any(not name or name != upload.filename for name, upload in zip(filenames, files)):
        return 'invalid_files'
    if len(set(filenames)) != len(filenames):
        return 'duplicate_files'
    config = FORECAST_FILE_PATTERNS[forecast_type]
    missing = [
        pattern for pattern in config['required']
        if not any(re.fullmatch(pattern, name) for name in filenames)
    ]
    allowed = config['required'] + config['optional']
    invalid = [
        name for name in filenames
        if not any(re.fullmatch(pattern, name) for pattern in allowed)
    ]
    if missing or invalid:
        return 'invalid_files'
    return None


def _stage_files(files, temporary_dir):
    filenames = []
    for upload in files:
        filename = secure_filename(upload.filename)
        upload.save(os.path.join(temporary_dir, filename))
        filenames.append(filename)
    return filenames


def _first_datetime(values):
    if getattr(values, 'ndim', 0) == 0:
        value = pd.Timestamp(values)
    else:
        value = pd.to_datetime(values).ravel()[0]
    if pd.isna(value):
        raise ForecastUploadError('invalid_metadata')
    return value


def _copy_staged_files(temporary_dir, destination, filenames):
    os.makedirs(destination, exist_ok=True)
    for filename in filenames:
        shutil.copy2(
            os.path.join(temporary_dir, filename),
            os.path.join(destination, filename),
        )


def _save_seasonal_forecast(temporary_dir, filenames, variable):
    seasonal_config = GLOBAL_CONFIG['forecast_data']['seasonal']
    if variable not in seasonal_config:
        raise ForecastUploadError('invalid_variable')

    deterministic_filename = next(
        name for name in filenames
        if re.fullmatch(r'MME_deterministic_forecast_\d{4}\.nc', name)
    )
    try:
        deterministic_path = os.path.join(temporary_dir, deterministic_filename)
        with xr.open_dataarray(deterministic_path) as forecast:
            issued = _first_datetime(forecast.S.values)
            target_start = _first_datetime(forecast.Ti.values)
            target_end = _first_datetime(forecast.Tf.values)
    except ForecastUploadError:
        raise
    except Exception as exc:
        raise ForecastUploadError('invalid_metadata') from exc

    issued_year = issued.strftime('%Y')
    forecast_years = {
        match.group(1)
        for filename in filenames
        if (match := re.search(r'_(\d{4})\.nc$', filename))
    }
    if forecast_years != {issued_year}:
        raise ForecastUploadError('seasonal_year_mismatch')

    destination = os.path.join(
        seasonal_config[variable]['dir'],
        issued_year,
        issued.strftime('%b'),
        f"{target_start.strftime('%b')}-{target_end.strftime('%b')}",
    )
    _copy_staged_files(temporary_dir, destination, filenames)


def _save_tendays_forecast(temporary_dir, filenames):
    daily_path = os.path.join(temporary_dir, 'PrecDaily.nc')
    try:
        with xr.open_dataset(daily_path) as dataset:
            issued_time = dataset.attrs['creation_date']
            issued_date = datetime.strptime(
                issued_time, '%a %b %d %H:%M:%S EAT %Y'
            ).strftime('%Y-%m-%d')
            start_date = dataset.time.isel(time=0).dt.strftime('%Y-%m-%d').item()
            end_date = dataset.time.isel(time=-1).dt.strftime('%Y-%m-%d').item()
            minlon = round(float(dataset.lon.min().values), 4)
            maxlon = round(float(dataset.lon.max().values), 4)
            minlat = round(float(dataset.lat.min().values), 4)
            maxlat = round(float(dataset.lat.max().values), 4)
            rlon = round(float(dataset.lon.values[1] - dataset.lon.values[0]), 4)
            rlat = round(float(dataset.lat.values[1] - dataset.lat.values[0]), 4)
    except Exception as exc:
        raise ForecastUploadError('invalid_metadata') from exc

    forecast_info = {
        'issued_date': issued_date,
        'start_date': start_date,
        'end_date': end_date,
        'spatial_resolution': {'lon': rlon, 'lat': rlat},
        'spatial_coverage': {
            'minlon': minlon,
            'maxlon': maxlon,
            'minlat': minlat,
            'maxlat': maxlat,
        },
    }
    destination = os.path.join(
        GLOBAL_CONFIG['forecast_data']['tendays']['dir'], issued_date
    )
    _copy_staged_files(temporary_dir, destination, filenames)
    with open(os.path.join(destination, 'info.yaml'), 'w', encoding='utf-8') as file:
        yaml.safe_dump(
            forecast_info,
            file,
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        )


def saveForecastFiles(files, forecast_type, variable=None):
    try:
        error = _validate_forecast_files(files, forecast_type)
        if error:
            return {'status': 'error', 'message_key': error, 'files': []}

        with tempfile.TemporaryDirectory(prefix='maprooms-forecast-') as temporary_dir:
            filenames = _stage_files(files, temporary_dir)
            if forecast_type == 'seasonal':
                _save_seasonal_forecast(temporary_dir, filenames, variable)
            elif forecast_type == 'tendays':
                _save_tendays_forecast(temporary_dir, filenames)

        return {
            'status': 'success',
            'message_key': 'upload_success',
            'files': filenames,
        }
    except ForecastUploadError as exc:
        return {'status': 'error', 'message_key': exc.message_key, 'files': []}
    except Exception:
        return {'status': 'error', 'message_key': 'upload_failed', 'files': []}
