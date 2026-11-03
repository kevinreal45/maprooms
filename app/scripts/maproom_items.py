import os
import re
from .util import load_yaml_file
from .icons import *
from ._global import GLOBAL_CONFIG
from app.dst_api.scripts import get_datasets_information

def _get_lang_text(obj, lang_code):
    if lang_code in obj:
        ret = obj[lang_code]
    else:
        ret = obj[list(obj.keys())[0]]

    return ret

def _get_lang_info():
    language = GLOBAL_CONFIG['language']
    lang_list = [l['code'] for l in language['list']]
    lang_code = language['code']
    return lang_list, lang_code

def _get_description_text(obj, lang_code):
    descrp = _get_lang_text(obj, lang_code)
    descrp = descrp.strip()
    if descrp[0:3] == '<p>':
        tmp = descrp.split('</p>')
        tmp = tmp[0]
        descrp = tmp[3:]

    return descrp

def _is_top_level_navigation_page(maproom):
    yaml_file = os.path.join(
        GLOBAL_CONFIG['app_dir'],
        maproom,
        'yaml',
        'maproom_items.yaml'
    )
    if not os.path.exists(yaml_file):
        return False
    try:
        with open(yaml_file, 'r', encoding='utf-8') as f:
            return re.search(
                        r'^type:\s*navigation-page\s*$',
                        f.read(),
                        re.MULTILINE) is not None
    except OSError:
        return False

def _url_args_nav_path(nav_path):
    if nav_path is None:
        return {'maproom': 'maproom'}
    if len(nav_path) == 1:
        if _is_top_level_navigation_page(nav_path[0]):
            return {'maproom': nav_path[0]}
        return {
                'maproom': 'maproom',
                'component': nav_path[0]
            }
    return {
            'maproom': nav_path[-2],
            'component': nav_path[-1]
        }

def _first_page_from_maproom_items(maproom_yaml):
    if maproom_yaml.get('type') != 'navigation-page':
        return None
    pages = maproom_yaml.get('maprooms', [])
    if len(pages) == 0:
        return None
    return list(pages[0].keys())[0]

def load_maproom_items(item_dirs):
    lang_list, lang_code = _get_lang_info()
    app_dir = GLOBAL_CONFIG['app_dir']
    blank_icon = GLOBAL_CONFIG['blank_icon']

    out = {}
    out['left'] = {}
    out['right'] = []

    if item_dirs is None:
        nav_path = ''
    else:
        nav_path = os.path.join(*item_dirs)

    item_path = os.path.join(app_dir, nav_path)
    yaml_file = os.path.join(item_path, 'yaml', 'maproom_items.yaml')
    tmp = load_yaml_file(yaml_file)

    out['left']['title'] = _get_lang_text(tmp['title'], lang_code)
    out['left']['description'] = _get_lang_text(tmp['description'], lang_code)

    if tmp['type'] == 'navigation-card':
        for cm in tmp['components']:
            res = {}
            yaml_file = os.path.join(item_path, cm, 'yaml', 'maproom_items.yaml')
            cm_tmp = load_yaml_file(yaml_file)
            res['title'] = _get_lang_text(cm_tmp['title'], lang_code)
            res['description'] = _get_description_text(cm_tmp['description'], lang_code)

            first_page = _first_page_from_maproom_items(cm_tmp)
            res['endpoint'] = 'maproom_items'
            if first_page is not None and item_dirs is None:
                # drm/health layout: /maproom_pages?maproom=drm&page=spi
                res['maproom'] = cm
                res['component'] = None
            else:
                # agriculture/climate/water layout: /maproom_items?maproom=climate&component=analysis
                res['maproom'] = 'maproom' if item_dirs is None else item_dirs[-1]
                res['component'] = cm

            if 'icon_image' in cm_tmp:
                icon_dir = os.path.join(app_dir, 'static', 'images', 'card_icons')
                icon_path = os.path.join(icon_dir, cm_tmp['icon_image'])
                if os.path.exists(icon_path):
                    res['icon'] = create_icon_image(icon_path)
                else:
                    res['icon'] = blank_icon
            elif 'icon_function' in cm_tmp:
                res['icon'] = create_icon_function(cm_tmp['icon_function'])
            else:
                res['icon'] = blank_icon
            out['right'] = out['right'] + [res]
    else:
        # 'navigation-page'
        for cm in tmp['maprooms']:
            res = {}
            page = list(cm.keys())[0]
            res['title'] = _get_lang_text(cm[page]['title'], lang_code)
            res['description'] = _get_lang_text(cm[page]['description'], lang_code)
            res['endpoint'] = 'maproom_pages'
            res['maproom'] = item_dirs[0]

            if len(item_dirs) == 1:
                # drm/health layout: /maproom_pages?maproom=drm&page=ext_temperature
                res['component'] = None
            else:
                # agriculture/climate/water layout:
                # /maproom_pages?maproom=climate&component=analysis&page=daily
                res['component'] = item_dirs[-1]
 
            if 'icon_image' in cm[page]:
                icon_path = os.path.join(item_path, 'static', 'images', cm[page]['icon_image'])
                if os.path.exists(icon_path):
                    res['icon'] = create_icon_image(icon_path)
                else:
                    res['icon'] = blank_icon
            elif 'icon_function' in cm[page]:
                res['icon'] = create_icon_function(cm[page]['icon_function'])
            else:
                res['icon'] = blank_icon
            res['page'] = page
            out['right'] = out['right'] + [res]

    return out

def load_navigation_items(item_dirs):
    lang_list, lang_code = _get_lang_info()
    nav_info = GLOBAL_CONFIG['navigation']

    tmp = {}
    for nav in nav_info:
        if nav['path'] == item_dirs:
            if item_dirs is None:
                pths = ['maproom']
            else:
                pths = ['maproom'] + nav['path']
            tmp['path'] = pths
            tmp['label'] = [t[lang_code] for t in nav['title']]
            break

    #######################
    # can be removed
    # check if path exists
    if 'path' not in tmp:
        parent_dirs = item_dirs[:-1] if item_dirs else None
        page = item_dirs[-1] if item_dirs else None
        for nav in nav_info:
            if nav['path'] == parent_dirs:
                pths = ['maproom'] + parent_dirs
                labels = [t[lang_code] for t in nav['title']]
                tmp['path'] = pths + [page]
                tmp['label'] = labels + [page.replace('-', ' ').title()]
                break

    if 'path' not in tmp:
        tmp['path'] = ['maproom']
        tmp['label'] = [_get_lang_text(nav_info[0]['title'][0], lang_code)]
    #######################

    out = []
    for j in range(len(tmp['path'])):
        x = {'path': tmp['path'][j], 'label': tmp['label'][j]}

        # Build explicit URLs.
        # This makes pasted/deep URLs deterministic, e.g.
        # /maproom_pages?maproom=climate&component=analysis&page=monthly
        if j == 0:
            x['endpoint'] = 'maproom_items'
            x['maproom'] = 'maproom'
            x['component'] = None
            x['page'] = None
        elif j == 1:
            # For top-level navigation-page maprooms such as drm and health,
            # avoid /maproom_items?maproom=maproom&component=drm.
            # Link to their intermediate page-selection view instead:
            # /maproom_items?maproom=drm
            maproom_yaml = os.path.join(
                GLOBAL_CONFIG['app_dir'],
                tmp['path'][j], 'yaml',
                'maproom_items.yaml'
            )
            first_page = None
            if os.path.exists(maproom_yaml):
                first_page = _first_page_from_maproom_items(
                    load_yaml_file(maproom_yaml)
                )

            x['endpoint'] = 'maproom_items'
            x['page'] = None
            if first_page is not None:
                x['maproom'] = tmp['path'][j]
                x['component'] = None
            else:
                x['maproom'] = 'maproom'
                x['component'] = tmp['path'][j]
        else:
            x['endpoint'] = 'maproom_items'
            x['maproom'] = tmp['path'][j - 1]
            x['component'] = tmp['path'][j]
            x['page'] = None

        out += [x]

    return out

def parse_config_yaml_file(app_dir, yaml_file):
    file = os.path.join(app_dir, 'yaml', yaml_file)
    tmp = load_yaml_file(file)
    return parse_lang_yaml_nested(tmp)

def load_maproom_page_text(item_dirs, page_type):
    app_dir = GLOBAL_CONFIG['app_dir']
    out = parse_config_yaml_file(app_dir, 'global.yaml')

    layers_subdiv = parse_config_yaml_file(app_dir, 'subdivision-config.yaml')
    layers_basem = parse_config_yaml_file(app_dir, 'basemap.yaml')
    layers_cbar = parse_config_yaml_file(app_dir, 'colorbar.yaml')
    layers_lab = parse_config_yaml_file(app_dir, 'layers-label.yaml')
    out['layers'] = layers_subdiv | layers_basem | layers_cbar | layers_lab

    base_period = parse_config_yaml_file(app_dir, 'base-period.yaml')
    base_period_lab = parse_config_yaml_file(app_dir, 'base-period-label.yaml')
    out = out | base_period | base_period_lab

    teleconnections = parse_config_yaml_file(app_dir, 'disp-teleconnections.yaml')
    out = out | teleconnections
    season_definition = parse_config_yaml_file(app_dir, 'season-definition.yaml')
    out = out | season_definition

    if page_type in ['page', 'user', 'admin']:
        nav_path = item_dirs[:-1]
        nav_path = os.path.join(*nav_path)
        nav_path = os.path.join(app_dir, nav_path)

        yaml_file = f'{item_dirs[-1]}.yaml'
        yaml_file = os.path.join(nav_path, 'yaml', yaml_file)
        if os.path.exists(yaml_file):
            tmp = load_yaml_file(yaml_file)
            page = parse_lang_yaml_nested(tmp)
            out = out | page

    if page_type == 'page':
        yaml_file = os.path.join(app_dir, 'yaml', 'instruction.yaml')
        tmp = load_yaml_file(yaml_file)
        out.update(parse_lang_yaml_nested(tmp))

        yaml_file = os.path.join(app_dir, 'yaml', 'js-text.yaml')
        tmp = load_yaml_file(yaml_file)
        out['js_text'] = parse_lang_yaml_nested(tmp)

        if item_dirs[0] in out['rainy_season']['where']:
            yaml_file = os.path.join(app_dir, 'yaml', 'rainy-season.yaml')
            tmp = load_yaml_file(yaml_file)
            out['rainy_season_text'] = parse_lang_yaml_nested(tmp)

    return out

def data_info_coverage():
    dataInfo = get_datasets_information()
    tmp_cov = {}
    for k1, v1 in dataInfo.items():
        tmp_cov[k1] = {}
        for k2, v2 in v1.items():
            tmp_cov[k1][k2] = {}
            for k3, v3 in v2.items():
                tmp_cov[k1][k2][k3] = {}
                tmp_cov[k1][k2][k3]['temporal_coverage'] = v3['temporal_coverage']
                tmp_cov[k1][k2][k3]['spatial_resolution'] = v3['spatial_resolution']
                tmp_cov[k1][k2][k3]['spatial_coverage'] = v3['spatial_coverage']

    return tmp_cov

def parse_lang_yaml_nested(nested_dict):
    lang_list, lang_code = _get_lang_info()

    def parse_value(value):
        if not isinstance(value, dict):
            return value

        keys = list(value.keys())

        # Case: dictionary is a language dictionary: {"en": "...", "fr": "..."}
        if any(k in lang_list for k in keys):
            lg = lang_code if lang_code in value else keys[0]
            return value[lg]

        # Case: normal nested dictionary
        return {
            k: parse_value(v)
            for k, v in value.items()
        }

    return parse_value(nested_dict)

def update_metService_info():
    app_dir = GLOBAL_CONFIG['app_dir']
    return parse_config_yaml_file(app_dir, 'nmhs-info.yaml')

    # app_dir = GLOBAL_CONFIG['app_dir']
    # yaml_dir = os.path.join(app_dir, 'yaml')
    # met_file = os.path.join(yaml_dir, 'nmhs-info.yaml')
    # tmp = load_yaml_file(met_file)
    # return parse_lang_yaml_nested(tmp)
