import os
import numpy as np
import xarray as xr
import geopandas as gpd
import shapely

from app.scripts._global import GLOBAL_CONFIG
from app.scripts.util import load_yaml_file


def read_blank_polygons():
    geom_layers = GLOBAL_CONFIG['geom_layers']
    subdiv_file = os.path.join(
        GLOBAL_CONFIG['app_dir'],
        'yaml', 'subdivision-config.yaml'
    )
    subdiv = load_yaml_file(subdiv_file)
    blank_poly = subdiv['subdivision_blank_data']
    blank_poly = subdiv['subdivision'][blank_poly]
    file_poly = os.path.join(
        geom_layers['shp_dir'], blank_poly['file']
    )
    shp = gpd.read_file(file_poly)
    return shp.to_crs('EPSG:4326')

def blank_numpy_dict(
    data,
    dims={'lon': 'lon', 'lat': 'lat', 'data': 'data'},
    shp=None,
    buffer=True
):
    if shp is None:
        shp = read_blank_polygons()

    lon = data[dims['lon']]
    lat = data[dims['lat']]

    polygon = shapely.union_all(shp.geometry.to_numpy())
    lon2d, lat2d = np.meshgrid(lon, lat)

    if buffer:
        pixel_size = abs(float(lon[1] - lon[0]))
        polygon = polygon.buffer(pixel_size)

    inside = shapely.intersects_xy(polygon, lon2d, lat2d)
    data[dims['data']] = np.where(
        inside, data[dims['data']], np.nan
    )
    return data

def blank_xarray_dataarray(
    data,
    dims={'lon': 'X', 'lat': 'Y', 'time': 'T'},
    shp=None,
    buffer=True
):
    if shp is None:
        shp = read_blank_polygons()

    lon = data[dims['lon']]
    lat = data[dims['lat']]

    polygon = shapely.union_all(shp.geometry.to_numpy())
    lon2d, lat2d = np.meshgrid(lon, lat)

    if buffer:
        pixel_size = abs(float(lon[1] - lon[0]))
        polygon = polygon.buffer(pixel_size)

    inside = shapely.intersects_xy(polygon, lon2d, lat2d)
    mask = xr.DataArray(
        inside,
        dims=(dims['lat'], dims['lon']),
        coords={
            dims['lat']: data[dims['lat']],
            dims['lon']: data[dims['lon']]
        }
    )
    return data.where(mask)
