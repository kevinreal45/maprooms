
from flask import Blueprint, render_template, request, session
from flask import current_app as app
from threading import Lock
import json
import config

from .scripts.projection_sp import climate_projection_sp_data
from .scripts.projection_ts import (
    climate_projection_ts_pdf,
    climate_projection_ts_series
)

from .scripts.model_agreement import (
    get_climate_projection_agreement_sp_data,
    climate_projection_agreement_sp_data,
)

from .scripts.projection_spi import (
    get_climate_projection_spi_sp_data,
    climate_projection_spi_sp_data,
    climate_projection_spi_ts_data,
    climate_projection_spi_coverage_data,
)

from app.scripts._cache import (
    cache,
    cache_data_functions,
    hash_params_projection_ts_series,
    hash_params_projection_pdf,
    hash_params_projection_agreement_map
)

climate_projection = Blueprint(
    'climate_projection',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static/climate_projection',
)

matplotlib_render_lock = Lock()

dataUser = dict()


@climate_projection.before_request
def before_request():
    global dataUser

    if 'logged_in' not in session:
        dataUser = {'uid': -1}
    else:
        if session['logged_in']:
            dataUser = session['data']
        else:
            dataUser = {'uid': -1}


@climate_projection.route('/climate_projection_seasonal_map', methods=['POST'])
def climate_projection_seasonal_map():
    params = request.get_json()

    try:
        with matplotlib_render_lock:
            result = climate_projection_sp_data(params)

        return json.dumps(result)

    except (KeyError, TypeError, ValueError, FileNotFoundError) as exc:
        return json.dumps({
            'status': -1,
            'message': str(exc)
        })

    except Exception:
        app.logger.exception('Seasonal projection map failed')

        return json.dumps({
            'status': -1,
            'message': 'Unable to calculate the seasonal change map.'
        })



@climate_projection.route('/climate_projection_pdf', methods=['POST'])
def climate_projection_pdf():

    params = request.get_json()
    try:
        return cache_data_functions(
                    climate_projection_ts_pdf,
                    hash_params_projection_pdf,
                    params
                )
    except Exception as e:
        return json.dumps({'status': -1, 'message': str(e)})


@climate_projection.route(
    '/climate_projection_series',
    methods=['POST']
)
def climate_projection_series():

    params = request.get_json()
    try:
        return cache_data_functions(
                    climate_projection_ts_series,
                    hash_params_projection_ts_series,
                    params
                )
    except Exception as e:
        return json.dumps({'status': -1, 'message': str(e)})


@climate_projection.route(
    '/climate_projection_agreement_map',
    methods=['POST'],
)
def climate_projection_agreement_map():
    try:
        params = request.get_json()

        cache_key = hash_params_projection_agreement_map(params)
        data = cache.get(cache_key)
        if data is None:
            data = get_climate_projection_agreement_sp_data(params)
            cache.set(cache_key, data)


        with matplotlib_render_lock:
            result = climate_projection_agreement_sp_data(data)

        return json.dumps(result, allow_nan=False)

    except (KeyError, TypeError, ValueError, FileNotFoundError) as exc:
        return json.dumps({
            'status': -1,
            'message': str(exc),
        })

    except Exception:
        app.logger.exception('Projection model agreement failed')

        return json.dumps({
            'status': -1,
            'message': 'Unable to calculate the model agreement map.',
        })



@climate_projection.route(
    '/climate_projection_spi_map',
    methods=['POST'],
)
def climate_projection_spi_map():
    try:
        data = get_climate_projection_spi_sp_data(
            request.get_json()
        )

        with matplotlib_render_lock:
            result = climate_projection_spi_sp_data(data)

        return json.dumps(result, allow_nan=False)

    except (
        KeyError,
        IndexError,
        TypeError,
        ValueError,
        FileNotFoundError,
    ) as exc:
        return json.dumps({
            'status': -1,
            'message': str(exc),
        })

    except Exception:
        app.logger.exception('Projection SPI map failed')

        return json.dumps({
            'status': -1,
            'message': 'Unable to calculate the projection SPI map.',
        })


@climate_projection.route(
    '/climate_projection_spi_series',
    methods=['POST'],
)
def climate_projection_spi_series():
    try:
        result = climate_projection_spi_ts_data(
            request.get_json()
        )

        return json.dumps(result, allow_nan=False)

    except (
        KeyError,
        IndexError,
        TypeError,
        ValueError,
        FileNotFoundError,
    ) as exc:
        return json.dumps({
            'status': -1,
            'message': str(exc),
        })

    except Exception:
        app.logger.exception('Projection SPI series failed')

        return json.dumps({
            'status': -1,
            'message': 'Unable to calculate the projection SPI series.',
        })



@climate_projection.route(
    '/climate_projection_spi_coverage',
    methods=['POST'],
)
def climate_projection_spi_coverage():
    try:
        return json.dumps(
            climate_projection_spi_coverage_data(
                request.get_json()
            ),
            allow_nan=False,
        )
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        return json.dumps({
            'status': -1,
            'message': str(exc),
        })
    except Exception:
        app.logger.exception('Projection SPI coverage failed')
        return json.dumps({
            'status': -1,
            'message': 'Unable to read the dataset dates.',
        })

