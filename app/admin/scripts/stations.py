import csv
import io
import os
import re
from datetime import datetime

from werkzeug.utils import secure_filename
from app.scripts._global import GLOBAL_CONFIG

STATION_OBSERVATION_FILENAME = re.compile(
    r'^(precip|tmax|tmin|tmean|rhmin|rhmax|rhmean)_(\d{8})_(\d{8})\.csv$'
)

def _validate_station_observation_file(upload):
    if upload is None or not upload.filename:
        return 'no_file'
    filename = secure_filename(upload.filename)
    if not filename or filename != upload.filename:
        return 'invalid_filename'
    match = STATION_OBSERVATION_FILENAME.fullmatch(filename)
    if match is None:
        return 'invalid_filename'
    try:
        start_date = datetime.strptime(match.group(2), '%Y%m%d')
        end_date = datetime.strptime(match.group(3), '%Y%m%d')
    except ValueError:
        return 'invalid_dates'
    if start_date > end_date:
        return 'invalid_dates'
    return None

def _is_number(value):
    try:
        number = float(value)
        return number == number and number not in (float('inf'), float('-inf'))
    except (TypeError, ValueError):
        return False

def _is_observation(value):
    return value == '' or _is_number(value)

def _validate_cdt_station_data(upload):
    filename_match = STATION_OBSERVATION_FILENAME.fullmatch(upload.filename)
    filename_start = datetime.strptime(filename_match.group(2), '%Y%m%d')
    filename_end = datetime.strptime(filename_match.group(3), '%Y%m%d')

    try:
        content = upload.stream.read().decode('utf-8-sig')
        upload.stream.seek(0)
        rows = [
            [value.strip() for value in row]
            for row in csv.reader(io.StringIO(content))
        ]
    except (UnicodeDecodeError, csv.Error, OSError):
        return 'invalid_cdt_format'

    if len(rows) < 4:
        return 'invalid_cdt_format'

    column_count = len(rows[0])
    if column_count < 2 or any(len(row) != column_count for row in rows):
        return 'invalid_cdt_format'

    station_ids = rows[0][1:]
    if any(not station_id for station_id in station_ids):
        return 'invalid_cdt_format'
    if len(set(station_ids)) != len(station_ids):
        return 'invalid_cdt_format'

    if not all(_is_number(value) for value in rows[1][1:]):
        return 'invalid_cdt_format'
    if not all(_is_number(value) for value in rows[2][1:]):
        return 'invalid_cdt_format'

    dates = []
    for row in rows[3:]:
        if re.fullmatch(r'\d{8}', row[0]) is None:
            return 'invalid_cdt_format'
        try:
            date = datetime.strptime(row[0], '%Y%m%d')
        except ValueError:
            return 'invalid_cdt_format'
        if not all(_is_observation(value) for value in row[1:]):
            return 'invalid_cdt_format'
        dates.append(date)

    if any(
        current <= previous
        for previous, current in zip(dates, dates[1:])
    ):
        return 'invalid_cdt_format'

    if dates[0] != filename_start or dates[-1] != filename_end:
        return 'date_range_mismatch'

    return None

def saveStationObservationFile(upload):
    try:
        error = _validate_station_observation_file(upload)
        if error:
            return {
                'status': 'error',
                'message_key': error,
                'file': None
            }
        error = _validate_cdt_station_data(upload)
        if error:
            return {
                'status': 'error',
                'message_key': error,
                'file': None
            }
        filename = secure_filename(upload.filename)
        stations_data = GLOBAL_CONFIG['stations_data']
        if isinstance(stations_data, dict):
            destination = stations_data['daily_dir']
        else:
            destination = stations_data
        os.makedirs(
            destination,
            exist_ok=True
        )
        upload.save(
            os.path.join(
                destination,
                filename
            )
        )
        return {
            'status': 'success',
            'message_key': 'upload_success',
            'file': filename
        }
    except Exception:
        return {
            'status': 'error',
            'message_key': 'upload_failed',
            'file': None
        }
