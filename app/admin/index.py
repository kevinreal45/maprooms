from flask import (
    Blueprint,
    render_template,
    request,
    g,
    flash,
    session
)
from flask import current_app as app
import json

from app.auth.index import login_required
from app.auth.scripts.users import getUserData
from app.scripts._global import (
    GLOBAL_CONFIG,
    selected_language
)
from app.scripts._cache import cache
from app.scripts.maproom_items import (
    load_navigation_items,
    load_maproom_page_text,
    _url_args_nav_path
)
from .scripts import *

admin_bp = Blueprint(
    'admin',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static/admin',
)

def render_template_admin_page(admin_page, dataUser):
    page_contorl = page_control_admin(admin_page)
    mapNav = load_navigation_items([admin_page])
    nav_path = ['admin', admin_page]
    pageText = load_maproom_page_text(nav_path, 'admin')
    pageText['admin_page'] = admin_page
    return render_template(
        f'{admin_page}.html',
        dataUser = dataUser,
        langUser=GLOBAL_CONFIG['language'],
        metInfo = GLOBAL_CONFIG['metInfo'],
        dataInfo=g.dataInfoCoverage,
        mapNav=mapNav,
        pageText=pageText,
        pageCtrl=page_contorl,
        pageType='admin',
        urlArgs=_url_args_nav_path(nav_path)
    )

_dataUser = {}
@cache.cached(timeout=60, key_prefix='adminlang_')
@admin_bp.route('/set_languages_admin')
def set_languages_admin():
    lang_code = request.args.get('lang_code')
    selected_language(lang_code)
    admin_page = request.args.get('admin_page')
    return render_template_admin_page(
        admin_page, _dataUser[admin_page]
    )

@admin_bp.route('/upload_forecasts')
@login_required
def upload_forecasts():
    username = session['data']['username']
    dataUser = getUserData(username)[0]
    _dataUser['upload-forecasts'] = dataUser
    return render_template_admin_page(
        'upload-forecasts', dataUser
    )

def _upload_forecast_files(forecast_type):
    variable = request.form.get('variable') if forecast_type == 'seasonal' else None
    result = saveForecastFiles(
        request.files.getlist('files'), forecast_type, variable
    )
    message_key = result.pop('message_key')
    result['message'] = page_control_admin('upload-forecasts')['messages'][message_key]
    return json.dumps(result)

@admin_bp.route('/upload_seasonal_forecast', methods=['POST'])
@login_required
def upload_seasonal_forecast():
    return _upload_forecast_files('seasonal')

@admin_bp.route('/upload_tendays_forecast', methods=['POST'])
@login_required
def upload_tendays_forecast():
    return _upload_forecast_files('tendays')

@admin_bp.route('/upload_monthly_forecast', methods=['POST'])
@login_required
def upload_monthly_forecast():
    return _upload_forecast_files('monthly')

@admin_bp.route('/upload_stations')
@login_required
def upload_stations():
    username = session['data']['username']
    dataUser = getUserData(username)[0]
    _dataUser['upload-stations'] = dataUser
    return render_template_admin_page(
        'upload-stations', dataUser
    )

@admin_bp.route('/upload_station_observation', methods=['POST'])
@login_required
def upload_station_observation():
    result = saveStationObservationFile(request.files.get('file'))
    message_key = result.pop('message_key')
    result['message'] = page_control_admin('upload-stations')['messages'][message_key]
    return json.dumps(result)

@admin_bp.route('/edit_maprooms')
@login_required
def edit_maprooms():
    username = session['data']['username']
    dataUser = getUserData(username)[0]
    _dataUser['edit-maprooms'] = dataUser
    return render_template_admin_page(
        'edit-maprooms', dataUser
    )
