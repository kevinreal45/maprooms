import io
import base64
from PIL import Image
import numpy as np

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
plt.switch_backend('Agg')

from .colorbar import colorRampPalette
from .util import pretty

## icon functions from each blueprint
from app.agriculture.analysis.scripts.icons import *
from app.climate.analysis.scripts.icons import *
from app.climate.forecast.scripts.icons import *
from app.climate.monitoring.scripts.icons import *
from app.health.malaria.scripts.icons import *

def create_icon_function(fun):
    icon_fun = eval(fun)
    return icon_fun()

def create_icon_image(icon_path):
    img = Image.open(icon_path)
    buffer = io.BytesIO()
    img.save(buffer, 'png')
    buffer.seek(0)
    data = buffer.read()
    data = base64.b64encode(data).decode()
    img_png = 'data:image/png;base64,' + data
    return img_png

def create_icon_data(data, breaks=None,
                     colors=None, colors_ext=None,
                     gdf_boundaries=None): 
    if breaks is None:
        zmin = np.nanmin(data['data'])
        zmax = np.nanmax(data['data'])
        breaks = pretty(zmin, zmax, 10)

    nkol = len(breaks) - 1

    if colors is None:
        listedCmap = plt.get_cmap('viridis', nkol)
        kolor = [None] * nkol
        for j in range(nkol):
            kolor[j] = mcolors.to_hex(listedCmap(j))
    else:
        colors_fun = colorRampPalette(colors)
        kolor = colors_fun(nkol)

    if colors_ext is None:
        if colors is None:
            kol_ext = ['gray', 'red']
        else:
            kol_ext = [kolor[0], kolor[nkol - 1]]
    else:
        kol_ext = colors_ext

    cmap = mcolors.ListedColormap(kolor)
    norm = mcolors.BoundaryNorm(breaks, cmap.N)

    vmin = breaks[0]
    vmax = breaks[len(breaks) - 1]

    xr = np.ptp(data['lon']).item()
    yr = np.ptp(data['lat']).item()
    if xr < yr:
        fw = 2
        fh = 2 * yr/xr
    else:
        fw = 2 * xr/yr
        fh = 2

    fig = plt.figure(figsize = (fw, fh))
    ax = plt.axes([0, 0, 1, 1])
    pm = ax.pcolormesh(data['lon'], data['lat'], data['data'],
                vmin=vmin, vmax=vmax, shading='nearest')
    pm.set_cmap(cmap)
    pm.set_norm(norm)
    pm.cmap.set_under(kol_ext[0])
    pm.cmap.set_over(kol_ext[1])
    if not gdf_boundaries is None:
        gdf_boundaries.plot(ax=ax, facecolor='none',
                    edgecolor='black', linewidth=0.7)
    ax.set_aspect('equal', 'box')
    bbox = plt.axis('off')

    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches=None, transparent=True)
    img.seek(0)
    img_png = base64.b64encode(img.getvalue()).decode()
    img_png = "data:image/png;base64," + img_png
    # bbox_m = [[bbox[3], bbox[0]], [bbox[2], bbox[1]]]
    # img_out = {'png': img_png, 'bounds': bbox_m}
    plt.close('all')

    return img_png
