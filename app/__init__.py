from flask import (
    Flask,
    render_template,
    render_template_string,
    g,
    flash,
    session,
    request
)
import os
import re
import json
from flask_cors import CORS
from flask_jsglue import JSGlue

app = Flask(
    __name__,
    instance_relative_config=False
)
app.config.from_object('config')
CORS(app)
jsglue = JSGlue(app)

# Enable the loop controls extension
app.jinja_env.add_extension('jinja2.ext.loopcontrols')


####
from app.auth.index import auth
from app.dst_api.index import dst_api
from app.misc.index import misc

from app.climate.analysis.index import climate_analysis
from app.climate.monitoring.index import climate_monitoring
from app.climate.forecast.index import climate_forecast
from app.climate.projection.index import climate_projection

from app.agriculture.analysis.index import agriculture_analysis

from app.health.malaria.index import health_malaria

from app.drm.index import drm

from app.water.analysis.index import water_analysis
from app.water.monitoring.index import water_monitoring
from app.water.forecast.index import water_forecast
from app.water.projection.index import water_projection

app.register_blueprint(auth)
app.register_blueprint(dst_api)
app.register_blueprint(misc)

app.register_blueprint(climate_analysis)
app.register_blueprint(climate_monitoring)
app.register_blueprint(climate_forecast)
app.register_blueprint(climate_projection)

app.register_blueprint(agriculture_analysis)

app.register_blueprint(health_malaria)

app.register_blueprint(drm)

app.register_blueprint(water_analysis)
app.register_blueprint(water_monitoring)
app.register_blueprint(water_forecast)
app.register_blueprint(water_projection)

####
import config
from app.scripts._global import (
    GLOBAL_CONFIG,
    selected_language,
    set_navbar_path
)
from app.scripts.maproom_items import (
    load_maproom_items,
    load_navigation_items,
    load_maproom_page_text,
    data_info_coverage,
    _url_args_nav_path
)
from app.scripts._cache import cache
cache.init_app(app)

# from flask_wtf.csrf import CSRFProtect
# csrf = CSRFProtect(app)

from app.auth.scripts.sqlite import initUsersTable
from app.misc.scripts.sqlite import initENSOTables

try:
    ret = initUsersTable()
    if ret['status'] == -1:
        flash(ret['message'], 'error')

    initENSOTables()
except Exception as e:
    flash(str(e), 'error')

@app.before_request
def before_request():
    g.dataInfoCoverage = data_info_coverage()

    if 'logged_in' not in session:
        g.dataUser = {'uid': -1}
    else:
        if session['logged_in']:
            g.dataUser = session['data']
        else:
            g.dataUser = {'uid': -1}

def _render_maproom_template(maproom, component, page, **context):
    component = (component or '').strip()
    maproom = (maproom or '').strip()

    candidate_template_dirs = []
    if component != '':
        # agriculture, climate, water, health layout
        # "app/<maproom>/<component>/templates"
        candidate_template_dirs.append(
            os.path.join(
                GLOBAL_CONFIG['app_dir'],
                maproom,
                component,
                'templates'
            )
        )

    # drm, (old: health malaria) layout
    # "app/<maproom>/templates"
    candidate_template_dirs.append(
        os.path.join(
            GLOBAL_CONFIG['app_dir'],
            maproom,
            'templates'
        )
    )

    template_dir = None
    template_file = None
    for cand_dir in candidate_template_dirs:
        cand_file = os.path.join(cand_dir, f'{page}.html')
        if os.path.exists(cand_file):
            template_dir = cand_dir
            template_file = cand_file
            break

    if template_file is None:
        return render_template('unknown-page.html')

    with open(template_file, 'r', encoding='utf-8') as f:
        template_source = f.read()

    block_file = os.path.join(template_dir, 'block-js.html')
    if os.path.exists(block_file):
        with open(block_file, 'r', encoding='utf-8') as f:
            block_source = f.read()

        include_names = {
            'block-js.html',
            f'{component}/block-js.html' if component else None,
            f'{maproom}/block-js.html',
        }
        include_names.discard(None)

        for include_name in include_names:
            include_re = (
                r"{%\s*include\s+['\"]"
                + re.escape(include_name)
                + r"['\"]\s*%}"
            )
            template_source = re.sub(
                include_re, block_source, template_source
            )

    return render_template_string(template_source, **context)

def render_template_main(nav_path):
    mapItems = load_maproom_items(nav_path)
    mapNav = load_navigation_items(nav_path)
    pageText = load_maproom_page_text(nav_path, 'main')
    return render_template(
        'main.html',
        error_login=False,
        dataUser=g.dataUser,
        langUser=GLOBAL_CONFIG['language'],
        metInfo=GLOBAL_CONFIG['metInfo'],
        dataInfo=g.dataInfoCoverage,
        mapItems=mapItems,
        mapNav=mapNav,
        pageText=pageText,
        pageType='main',
        urlArgs=_url_args_nav_path(nav_path)
    )

def render_template_page(maproom, component, page):
    component = (component or '').strip()
    nav_path = set_navbar_path(
        maproom=maproom,
        component=component,
        page=page,
        item_type='file'
    )
    mapNav = load_navigation_items(nav_path)
    pageText = load_maproom_page_text(nav_path, 'page')
    return _render_maproom_template(
        maproom, component, page,
        dataUser=g.dataUser,
        langUser=GLOBAL_CONFIG['language'],
        metInfo=GLOBAL_CONFIG['metInfo'],
        dataInfo=g.dataInfoCoverage,
        mapNav=mapNav,
        pageText=pageText,
        pageType='page',
        urlArgs={
            'maproom': maproom,
            'component': component if component != '' else None,
            'page': page
        } 
    )

@app.route('/')
def homepage():
    accept_lang = request.accept_languages
    lang_code = accept_lang.best_match(config.LANGUAGES_CODE)
    selected_language(lang_code)
    metInfoName = GLOBAL_CONFIG['metInfo']['metServiceLongname']
    flash(f'Welcome to {metInfoName} maprooms', 'info')
    return render_template_main(None)

@app.route('/set_languages_main')
def set_languages_main():
    lang_code = request.args.get('lang_code')
    selected_language(lang_code)
    maproom = request.args.get('maproom')
    component = request.args.get('component')
    nav_path = set_navbar_path(
        maproom=maproom,
        component=component,
        item_type='directory'
    )
    return render_template_main(nav_path)

@app.route('/set_languages_page')
def set_languages_page():
    lang_code = request.args.get('lang_code')
    selected_language(lang_code)
    maproom = request.args.get('maproom')
    component = request.args.get('component')
    page = request.args.get('page')
    return render_template_page(maproom, component, page)

@app.route('/maproom_items')
def maproom_items():
    maproom = request.args.get('maproom')
    component = request.args.get('component')
    nav_path = set_navbar_path(
        maproom=maproom,
        component=component,
        item_type='directory'
    )
    return render_template_main(nav_path)

@app.route('/maproom_pages')
def maproom_pages():
    maproom = request.args.get('maproom')
    component = request.args.get('component')
    page = request.args.get('page')
    return render_template_page(maproom, component, page)

@app.route('/get_flashes')
def get_flashes():
    return render_template('flashes.html')

@app.route('/unknown_page')
def unknown_page():
    return render_template('unknown-page.html')
