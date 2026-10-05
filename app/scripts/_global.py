import os
import config
from .util import load_yaml_file, list_yaml_maproom_items, remove_duplicates_list

GLOBAL_CONFIG = {}
scripts_dir = os.path.dirname(os.path.realpath(__file__))
app_dir = os.path.dirname(scripts_dir)
GLOBAL_CONFIG['app_dir'] = app_dir

GLOBAL_CONFIG['data_dir'] = config.MAPROOMS_DATA_DIR
GLOBAL_CONFIG['app_cache'] = os.path.join(config.MAPROOMS_DATA_DIR, 'app_cache')
if not os.path.exists(GLOBAL_CONFIG['app_cache']):
    os.makedirs(GLOBAL_CONFIG['app_cache'])
GLOBAL_CONFIG['users_data'] = os.path.join(config.MAPROOMS_DATA_DIR, 'users_data')
if not os.path.exists(GLOBAL_CONFIG['users_data']):
    os.makedirs(GLOBAL_CONFIG['users_data'])
GLOBAL_CONFIG['shp_dir'] = os.path.join(config.MAPROOMS_DATA_DIR, 'shp')
if not os.path.exists(GLOBAL_CONFIG['shp_dir']):
    os.makedirs(GLOBAL_CONFIG['shp_dir'])

yaml_dir = os.path.join(app_dir, 'yaml')
met_file = os.path.join(yaml_dir, 'nmhs-info.yaml')
GLOBAL_CONFIG['metInfo'] = load_yaml_file(met_file)

config_data_file = os.path.join(yaml_dir, 'datasets-config.yaml')
GLOBAL_CONFIG.update(load_yaml_file(config_data_file))

GLOBAL_CONFIG['blank_icon'] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

GLOBAL_CONFIG['language'] = {}
langs = {'code': config.LANGUAGES_CODE,
         'name': config.LANGUAGES_NAME,
         'label': config.LANGUAGES_LABEL,
         'locale': config.LANGUAGES_LOCALE}
GLOBAL_CONFIG['language']['code'] = langs['code'][0]

maproom_lang = []
for j in range(len(langs['code'])):
    tmp = {'code': langs['code'][j],
           'name': langs['name'][j],
           'label': langs['label'][j],
           'locale': langs['locale'][j]}
    maproom_lang = maproom_lang + [tmp]

GLOBAL_CONFIG['language']['list'] = maproom_lang

selected_lang = {'code': langs['code'][0],
                 'name': langs['name'][0],
                 'label': langs['label'][0]}
GLOBAL_CONFIG['language']['selected'] = selected_lang

def get_navigation_items():
    app_dir = GLOBAL_CONFIG['app_dir']
    file = 'maproom_items.yaml'
    yaml_paths = list_yaml_maproom_items(app_dir, file)
    nav_title = []
    page_title = []
    nav_path = []

    for path in yaml_paths:
        p_s = os.path.join(*path)
        p_y = os.path.join(app_dir, p_s)
        yaml_file = os.path.join(p_y, file)
        tmp = load_yaml_file(yaml_file)
        nav_title += [tmp['title']]
        if tmp['type'] == 'navigation-page':
            tmp_page = []
            for cm in tmp['maprooms']:
                page = list(cm.keys())[0]
                title = cm[page]['title']
                tmp_page += [[page, title]]
            page_title += [tmp_page]
        else:
            page_title += [None]

        pth = path[:-1]
        if len(pth) == 0:
            pth = None
        nav_path += [pth]

    nav_title_out = []
    nav_path_out = []
    for i in range(len(nav_path)):
        # if nav_path[i] is None:
        if i == 0:
            nav_title_out += [[nav_title[i]]]
            nav_path_out += [nav_path[i]]
        else:
            if len(nav_path[i]) == 1:
                tmp_title = [nav_title[0], nav_title[i]]
                tmp_path = nav_path[i]
            else:
                for j in range(len(nav_path)):
                    if nav_path[j] == [nav_path[i][0]]:
                        prev_title = nav_title[j]
                tmp_title = [nav_title[0], prev_title, nav_title[i]]
                tmp_path = nav_path[i]

            nav_title_out += [tmp_title]
            nav_path_out += [tmp_path]
            if not page_title[i] is None:
                for j in range(len(page_title[i])):
                    z = page_title[i][j]
                    nav_path_out += [tmp_path + [z[0]]]
                    nav_title_out += [tmp_title + [z[1]]]
    out = []
    for i in range(len(nav_title_out)):
        out += [{'path': nav_path_out[i], 'title': nav_title_out[i]}]

    return out

def get_navigation_users(yaml_dir):
    global_file = os.path.join(yaml_dir, 'global.yaml')
    global_yaml = load_yaml_file(global_file)
    maproom_nav = GLOBAL_CONFIG['navigation'][0]['title']
    users_nav = [{'path': ['user-account'],
                 'title': maproom_nav + [global_yaml['user_accout']]},
                 {'path': ['users-management'],
                 'title': maproom_nav + [global_yaml['user_management']]}]
    return users_nav

GLOBAL_CONFIG['navigation'] = get_navigation_items()
# add user account and management to navigation
GLOBAL_CONFIG['navigation'] += get_navigation_users(yaml_dir)

def set_navbar_path(maproom=None, component=None, page=None, item_type='directory'):
    """Return the current navigation path from explicit URL arguments.

    New URL format:
      /maproom_items?maproom=maproom
      /maproom_items?maproom=maproom&component=climate
      /maproom_items?maproom=climate&component=analysis
      /maproom_pages?maproom=climate&component=analysis&page=monthly
      /maproom_pages?maproom=drm&page=ext_temperature
    """
    maproom = (maproom or '').strip()
    component = (component or '').strip()
    page = (page or '').strip()

    if item_type == 'directory':
        if maproom in ['', 'maproom'] and component in ['', 'maproom']:
            nav_path = None
        elif maproom in ['', 'maproom']:
            nav_path = [component]
        elif component == '':
            nav_path = [maproom]
        else:
            nav_path = [maproom, component]
    else:
        nav_path = [maproom, component, page]

    if nav_path is not None:
        nav_path = [x for x in nav_path if x not in ['', None, 'maproom']]
        nav_path = remove_duplicates_list(nav_path)

    return nav_path

def selected_language(lang_code):
    maproom_lang = GLOBAL_CONFIG['language']['list']
    if lang_code not in [language['code'] for language in maproom_lang]:
        lang_code = maproom_lang[0]['code']
    GLOBAL_CONFIG['language']['code'] = lang_code
    selected_lang = [l for l in maproom_lang if l['code'] == lang_code]
    GLOBAL_CONFIG['language']['selected'] = selected_lang[0]
