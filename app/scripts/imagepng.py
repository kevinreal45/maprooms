import numpy as np
import io
import base64
import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Rectangle
from .util import pretty
from .colorbar import format_ColorScale, colorRampPalette
from ._colors import COLORS_MAPROOM

plt.switch_backend('Agg')

_WEB_MERCATOR_MAX_LAT = 85.0511287798066


def _web_mercator_y(latitude):
    """Return dimensionless Web-Mercator Y for latitude in degrees."""
    latitude = np.clip(
        np.asarray(latitude, dtype=float),
        -_WEB_MERCATOR_MAX_LAT,
        _WEB_MERCATOR_MAX_LAT
    )
    radians = np.deg2rad(latitude)
    return np.log(np.tan(np.pi / 4 + radians / 2))


def _latitude_from_web_mercator_y(y):
    return np.rad2deg(2 * np.arctan(np.exp(y)) - np.pi / 2)

def render_image_png(
    plt,
    transparent=True,
    bbox_inches=None,
    facecolor=None
):
    img = io.BytesIO()
    if not transparent: 
        if facecolor is None:
            facecolor = 'white'
        plt.savefig(
            img,
            format='png',
            dpi=120,
            bbox_inches=bbox_inches,
            facecolor=facecolor,
            transparent=transparent
        )
    else:
        # for leaflet map
        plt.savefig(
            img,
            format='png',
            bbox_inches=None,
            transparent=transparent
        )

    img.seek(0)
    img_png = base64.b64encode(img.getvalue()).decode()
    plt.close('all')
    return 'data:image/png;base64,' + img_png

def create_imagePng(
    data,
    breaks=None,
    colors=None,
    color_name='rainbow',
    colors_ext=None
):
    # Leaflet lays image rows out linearly in Web-Mercator Y. Rendering the
    # PNG with the same Y coordinate prevents north/south displacement when
    # the raster covers a much larger latitude range than the visible data.
    lon, lat = np.meshgrid(data['lon'], _web_mercator_y(data['lat']))
    data = np.squeeze(data['data'])

    if hasattr(data, 'mask'):
        zmin = np.ma.min(data)
        zmax = np.ma.max(data)
    else:
        zmin = np.nanmin(data)
        zmax = np.nanmax(data)

    if np.isnan(zmax):
        return None

    if breaks is None:
        if zmin == zmax:
            breaks = zmin + [-0.01, 0.01]
        else:
            breaks = pretty(zmin, zmax, 10)

    if colors is None:
        if color_name in COLORS_MAPROOM:
            map_colors = COLORS_MAPROOM[color_name]
            if colors_ext is None:
                if 'ext' in map_colors:
                    colors_ext = map_colors['ext']
            ex = 1 if colors_ext is None else -1
            nkol = len(breaks) + ex
            colors_fun = colorRampPalette(map_colors['colors'])
            colors = colors_fun(nkol)
        else:
            ex = 1 if colors_ext is None else -1
            nkol = len(breaks) + ex
            listedCmap = plt.get_cmap(color_name, nkol)
            colors = [None] * nkol
            for j in range(nkol):
                colors[j] = mcolors.to_hex(listedCmap(j))
    else:
        ex = 1 if colors_ext is None else -1
        nkol = len(breaks) + ex
        colors_fun = colorRampPalette(colors)
        colors = colors_fun(nkol)

    if colors_ext is None:
        colors_ext = [colors[0], colors[-1]]
        colors = colors[1:-1]

    ######
    if 'transparent' in colors_ext:
        data = data.astype(float)

    if colors_ext[0] == 'transparent':
        data[data < breaks[0]] = np.nan
        colors_ext[0] = 'white'

    if colors_ext[1] == 'transparent':
        data[data > breaks[-1]] = np.nan
        colors_ext[1] = 'white'

    ###### map
    cmap = mcolors.ListedColormap(colors)
    norm = mcolors.BoundaryNorm(breaks, cmap.N)
    vmin = breaks[0]
    vmax = breaks[len(breaks) - 1]

    fig = plt.figure()
    ax = plt.axes([0, 0, 1, 1])
    pm = ax.pcolormesh(
        lon, lat, data,
        vmin=vmin,
        vmax=vmax,
        shading='nearest'
    )
    pm.set_cmap(cmap)
    pm.set_norm(norm)
    pm.cmap.set_under(colors_ext[0])
    pm.cmap.set_over(colors_ext[1])

    # bbox = plt.axis('off')
    # bounds = [[bbox[3].item(), bbox[0].item()],
    #           [bbox[2].item(), bbox[1].item()]]
    x_min, x_max = ax.get_xlim()
    y_min, y_max = ax.get_ylim()
    bounds = [[_latitude_from_web_mercator_y(y_max).item(), x_min.item()],
              [_latitude_from_web_mercator_y(y_min).item(), x_max.item()]]
    ax.axis('off')

    img_png = render_image_png(plt)
    img_out = {'png': img_png, 'bounds': bounds}

    ##### colorbar
    ckeys = format_ColorScale(breaks, colors, colors_ext)

    colors = [colors_ext[0]] + colors + [colors_ext[1]]
    cmap = mcolors.ListedColormap(colors)
    norm = mcolors.BoundaryNorm(
        breaks,
        cmap.N,
        extend='both'
    )

    fig, ax = plt.subplots(
        figsize=(8, 1),
        layout='constrained'
    )
    fig.colorbar(
        mpl.cm.ScalarMappable(
            norm=norm,
            cmap=cmap
        ),
        cax=ax,
        extendrect=True,
        orientation='horizontal'
    )
    ckeys['png'] = render_image_png(plt)
    ckeys['raster'] = False

    return {'data': img_out, 'ckeys': ckeys}

def raster_colorbar_imagePng(colors_list, n = 100):
    colors_fun = colorRampPalette(colors_list)
    colors = colors_fun(n)
    cmap = mcolors.ListedColormap(colors)
    norm = mcolors.BoundaryNorm(
        np.linspace(0, 1, n + 1),
        cmap.N,
        extend='neither'
    )

    fig, ax = plt.subplots(
        figsize=(8, 1),
        layout='constrained'
    )
    fig.colorbar(
        mpl.cm.ScalarMappable(
            norm=norm,
            cmap=cmap
        ),
        cax=ax,
        extendrect=True,
        orientation='horizontal'
    )

    return render_image_png(plt)

def terciles_imagePng(data, breaks=None, colors=None):
    if breaks is None:
        breaks = [40, 50, 60, 70, 80, 90, 100]
    breaks = np.array(breaks)

    if colors is None:
        colors = {
            'Above': ['#c8f5c5', '#79ec68', '#58bd32', '#439a27', '#2f731b', '#17450e'],
            'Normal': ['#dff6f3', '#b8efeb', '#81e8e2', '#50ddd8', '#26c8c8', '#0ea8ad'],
            'Below': ['#ffff72', '#ffd84b', '#f6a62c', '#ed741d', '#df3a1b', '#bd1716'],
        }

    categories = tuple(reversed(colors.keys()))

    ###### map
    fig = plt.figure()
    ax = plt.axes([0, 0, 1, 1])

    for category, label in enumerate(categories):
        field = np.where(
            (data['winner'] == category) & (data['proba'] >= 40),
            data['proba'],
            np.nan
        )
        cmap = mcolors.ListedColormap(colors[label])
        norm = mcolors.BoundaryNorm(breaks, cmap.N, clip=True)
        ax.pcolormesh(
            data['lon'],
            _web_mercator_y(data['lat']),
            field,
            cmap=cmap,
            norm=norm,
            shading='nearest',
            rasterized=True
        )

    x_min, x_max = ax.get_xlim()
    y_min, y_max = ax.get_ylim()
    bounds = [[_latitude_from_web_mercator_y(y_max).item(), x_min.item()],
              [_latitude_from_web_mercator_y(y_min).item(), x_max.item()]]
    ax.axis('off')

    img_png = render_image_png(plt)
    img_out = {'png': img_png, 'bounds': bounds}

    ##### colorbar
    ckeys = {}
    fig = plt.figure(figsize=(10.5, 1.15), dpi=200, facecolor='white')
    width, height, bottom = 0.295, 0.36, 0.26
    lefts = [0.02, 0.3525, 0.685]

    for label, left in zip(categories, lefts):
        ax = fig.add_axes([left, bottom, width, height])
        ax.set_xlim(40, 100)
        ax.set_ylim(0, 1)

        for index, color in enumerate(colors[label]):
            ax.add_patch(
                Rectangle(
                    (breaks[index], 0),
                    10,
                    1,
                    facecolor=color,
                    edgecolor='#777777',
                    linewidth=0.6,
                )
            )

        ax.set_yticks([])
        ax.set_xticks([40, 50, 60, 70, 80, 90])
        ax.tick_params(axis='x', labelsize=15, length=0, pad=3)
        ax.set_title(f'{label} (%)', fontsize=18, fontweight='bold', pad=4)
        for spine in ax.spines.values():
            spine.set_color('#777777')
            spine.set_linewidth(0.7)

    ckeys['png'] = render_image_png(plt)
    ckeys['raster'] = True

    return {'data': img_out, 'ckeys': ckeys}

def extremes_imagePng(data, categories, labels, colors=None):
    if colors is None:
        c_list = ['#afeeee', '#1874cd', '#00008b']
        colors = {n: c for n, c in zip(categories, c_list)}

    ###### map
    fig = plt.figure()
    ax = plt.axes([0, 0, 1, 1])

    for name in categories:
        mask = np.ma.masked_invalid(
            np.where(np.isfinite(data[name]), 1.0, np.nan)
        )
        cmap = mcolors.ListedColormap(colors[name])
        ax.pcolormesh(
            data['lon'],
            _web_mercator_y(data['lat']),
            mask,
            shading='nearest',
            cmap=cmap,
            vmin=0,
            vmax=1,
            rasterized=True,
            zorder=1
        )

    x_min, x_max = ax.get_xlim()
    y_min, y_max = ax.get_ylim()
    bounds = [[_latitude_from_web_mercator_y(y_max).item(), x_min.item()],
              [_latitude_from_web_mercator_y(y_min).item(), x_max.item()]]
    ax.axis('off')

    img_png = render_image_png(plt)
    img_out = {'png': img_png, 'bounds': bounds}

    ##### colorbar
    ckeys = {}
    fig = plt.figure(figsize=(10.24, 1.15), dpi=200, facecolor='white')

    positions = [0.020, 0.350, 0.680]
    legend_items = [
        (pos, colors[cat], labels[cat])
        for pos, cat in zip(positions, categories)
    ]

    for left, color, label in legend_items:
        fig.add_artist(
            Rectangle(
                (left, 0.55),
                0.300,
                0.32,
                transform=fig.transFigure,
                facecolor=color,
                edgecolor='none',
            )
        )
        fig.text(
            left + 0.150,
            0.30,
            label,
            ha='center',
            va='center',
            fontsize=18,
        )

    ckeys['png'] = render_image_png(plt)
    ckeys['raster'] = True

    return {'data': img_out, 'ckeys': ckeys}
