var MAP_BE;
var SUBDIV_BE;

function createLeafletTileLayer(container, options) {
    if (MAP_BE == undefined) {
        var map = L.map(container, {
            center: [options.mapCenterLAT, options.mapCenterLON],
            minZoom: 2,
            zoom: options.mapZoom,
            zoomControl: false
        });
        map.maproom = getThisMaproom();
        MAP_BE = map;

        const meteo = `<a href="${options.metServiceURL}" target="_blank">${options.metServiceName}</a>`;
        const attribu = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
        let tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: `${attribu} | ${meteo}`,
            maxZoom: 19,
            subdomains: ['a', 'b', 'c'],
            crossOrigin: true
        });
        tiles.addTo(map);
        MAP_BE.basemapTiles = tiles;

        addLControlPositions();
        addLControlScale('hcenterbottom');
        addLControlMousePosition('bottomleft');
        addLControlZoom('bottomleft');

        // subdivision layer
        MAP_BE['subdivisions'] = {};

        // subdivision styles
        createSubdivisionStyles();
        // display date on the left upper corner
        addLControlDisplayText('date', { position: 'topleft' });
        // display subdivision on mouse over
        addLControlDisplayText('subdivision', { position: 'topleft' });

        // download map
        downloadLeafletMap(map);
    } else {
        var map = MAP_BE;
        map.invalidateSize();
        map.maproom = getThisMaproom();
    }

    // input to hold clicked points
    $('<input>').attr('type', 'hidden')
        .addClass('marker-loc-lon')
        .appendTo(`#${container}`);
    $('<input>').attr('type', 'hidden')
        .addClass('marker-loc-lat')
        .appendTo(`#${container}`);

    // input to hold selected polygon
    $('<input>').attr('type', 'hidden')
        .addClass('selected-subdiv-poly')
        .appendTo(`#${container}`);

    // disable map dragging, mouse wheel, zoom, ...
    // when offcanvas is shown
    disableMapOffcanvas(map);
    disableMapClickSelect2(map);

    // click on map control buttons
    map.clickMapControl = false;
    $('.div-map-control button, .div-map-control select').on('click', () => {
        map.clickMapControl = true;
    });

    return map;
}

function setRasterImageOpacity(map = MAP_BE) {
    $('#raster-image-opacity-slide').on('change', function() {
        if (map.rasterImage !== undefined) {
            $('#raster-image-opacity-value').html(this.value);
            map.rasterImage.setOpacity(this.value);
        }
    });
}

function changeLeafletBasemapStyle(map = MAP_BE, options = MTO_INIT) {
    $('#map-basemap-style').on('change', function() {
        const basemap = $(this).val();
        const old_tiles = map.basemapTiles;
        if (old_tiles !== undefined) {
            map.removeLayer(old_tiles);
            map.attributionControl.removeAttribution();

            if (map.rasterImage !== undefined) {
                map.removeLayer(map.rasterImage);
            }

            let new_tiles = selectLeafletBasemapStyle(basemap, options);
            new_tiles.addTo(map);
            map.basemapTiles = new_tiles;
            if (map.rasterImage !== undefined) {
                map.addLayer(map.rasterImage);
            }
        }
    });
    $('#list-spatial-average').trigger('change');
}

function selectLeafletBasemapStyle(basemap, options) {
    let tiles;
    const meteo = `<a href="${options.metServiceURL}" target="_blank">${options.metServiceName}</a>`;

    switch (basemap) {
        case 'openstreetmap':
            var attribu = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
            tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: `${attribu} | ${meteo}`,
                maxZoom: 19,
                subdomains: ['a', 'b', 'c'],
                crossOrigin: true
            });
            break;
        case 'carto_light_all':
            tiles = getCartoTileLayer('light_all', options);
            break;
        case 'carto_light_nolabels':
            tiles = getCartoTileLayer('light_nolabels', options);
            break;
        case 'carto_dark_all':
            tiles = getCartoTileLayer('dark_all', options);
            break;
        case 'carto_dark_nolabels':
            tiles = getCartoTileLayer('dark_nolabels', options);
            break;
        case 'carto_rastertiles_voyager':
            tiles = getCartoTileLayer('rastertiles/voyager', options);
            break;
        case 'carto_rastertiles_voyager_nolabels':
            tiles = getCartoTileLayer('rastertiles/voyager_nolabels', options);
            break;
        case 'mapbox_light':
            tiles = getMapboxTileLayer('light-v11', options);
            break;
        case 'mapbox_dark':
            tiles = getMapboxTileLayer('dark-v11', options);
            break;
        case 'mapbox_streets':
            tiles = getMapboxTileLayer('streets-v12', options);
            break;
        case 'mapbox_outdoors':
            tiles = getMapboxTileLayer('outdoors-v12', options);
            break;
        case 'mapbox_satellite':
            tiles = getMapboxTileLayer('satellite-v9', options);
            break;
        case 'mapbox_satellite_streets':
            tiles = getMapboxTileLayer('satellite-streets-v12', options);
            break;
            // ESRI
        case 'esri_world_imagery':
            tiles = getEsriTileLayer('arcgisonline', 'World_Imagery', options);
            break;
        case 'esri_shaded_relief':
            tiles = getEsriTileLayer('arcgisonline', 'World_Shaded_Relief', options);
            break;
        case 'esri_world_imagery_clarity':
            tiles = getEsriTileLayer('clarity', 'World_Imagery', options);
            break;
            // 
        case 'google_maps_nolabels':
            tiles = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                attribution: '&copy; Google Maps',
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                crossOrigin: true
            });
    }

    return tiles;
}

function getMapboxTileLayer(mapid, options) {
    const meteo = `<a href="${options.metServiceURL}" target="_blank">${options.metServiceName}</a>`;
    let attribu = '&copy; <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>';
    attribu = `${attribu} &copy; <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>`;
    let tiles = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: `${attribu} | ${meteo}`,
        maxZoom: 23,
        id: mapid,
        accessToken: options.mapboxAccessToken,
        crossOrigin: true
    });

    return tiles;
}

function getCartoTileLayer(style, options) {
    const meteo = `<a href="${options.metServiceURL}" target="_blank">${options.metServiceName}</a>`;
    let attribu = '&copy; <a href="https://carto.com/attributions">CARTO</a>';
    attribu = `${attribu} &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>`;
    const tileurl = `https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}{r}.png`
    let tiles = L.tileLayer(tileurl, {
        attribution: `${attribu} | ${meteo}`,
        subdomains: 'abcd',
        style: style,
        maxZoom: 19,
        crossOrigin: true
    });

    return tiles;
}

function getEsriTileLayer(url_template, tile_name, options, max_zoom = 19) {
    // see
    // <script src="https://unpkg.com/esri-leaflet@3.0.18/dist/esri-leaflet.js"></script>
    // <script src="https://unpkg.com/esri-leaflet-vector@4.3.0/dist/esri-leaflet-vector.js" crossorigin=""></script>

    // L.esri.basemapLayer
    // L.esri.tiledMapLayer
    // L.esri.Vector.vectorBasemapLayer

    const meteo = `<a href="${options.metServiceURL}" target="_blank">${options.metServiceName}</a>`;
    let attribu = 'Powered by &copy; <a href="http://www.esri.com/" target="_blank">Esri</a>';

    if (url_template === 'clarity') {
        tile_name = 'World_Imagery';
        var tiles = L.tileLayer(`https://clarity.maptiles.arcgis.com/arcgis/rest/services/${tile_name}/MapServer/tile/{z}/{y}/{x}`, {
            attribution: `${attribu} | ${meteo}`,
            maxZoom: max_zoom,
            crossOrigin: true
        });
    } else {
        var tiles = L.tileLayer(`https://{s}.arcgisonline.com/ArcGIS/rest/services/${tile_name}/MapServer/tile/{z}/{y}/{x}`, {
            attribution: `${attribu} | ${meteo}`,
            subdomains: ['server', 'services'],
            // token: options.esriAccessToken,
            maxZoom: max_zoom,
            crossOrigin: true
        });
    }

    return tiles;
}

function addLControlPositions(map = MAP_BE) {
    let positions = map._controlCorners;
    const container = map._controlContainer;

    function createCenterPosition(center, side) {
        const className = `leaflet-${center} leaflet-${side}`;
        positions[center + side] = L.DomUtil.create('div', className, container);
    }

    createCenterPosition('vcenter', 'left');
    createCenterPosition('vcenter', 'right');
    createCenterPosition('hcenter', 'top');
    createCenterPosition('hcenter', 'bottom');
}

function addLControlZoom(position, map = MAP_BE) {
    if (position === undefined) {
        var position = 'bottomright';
    }
    const zoom = new L.Control.Zoom({
        position: position
    }).addTo(map);

    map.Zoom = zoom;
}

function addLControlScale(position, map = MAP_BE) {
    if (position === undefined) {
        var position = 'bottomleft';
    }
    const map_scale = new L.Control.Scale({
        position: position,
        imperial: false
    }).addTo(map);
    map.Scale = map_scale;

    $('.leaflet-control-scale .leaflet-control-scale-line').css({
        'position': 'absolute',
        'top': '-10px',
        'left': '-50px',
        'width': '98px'
    });
}

function addLControlMousePosition(position, map = MAP_BE) {
    if (position === undefined) {
        var position = 'bottomleft';
    }
    const mouse_position = new L.control.mousePosition({
        position: position,
        lngFormatter: formatLongitude,
        latFormatter: formatLatitude
    }).addTo(map);
    map.MousePostion = mouse_position;
}

function addLControlDisplayText(name, options, map = MAP_BE) {
    const default_options = {
        id: `displays-${name}-id`,
        position: 'topleft'
    };
    if (options === undefined) {
        var options = {};
    }
    const new_options = Object.assign({}, default_options, options);

    removeDisplayedText(new_options.id, map);
    let disp_text = L.control(new_options);

    disp_text.onAdd = function() {
        this._div = L.DomUtil.create('div', 'leaflet-display-text');
        this.update();

        // disable map click when clicking over the text
        L.DomEvent.on(this._div, 'click', L.DomEvent.stopPropagation);

        return this._div;
    };

    disp_text.update = function(text) {
        jQuery(this._div).html(text);
    };
    disp_text.addTo(map);
    map[`displayText_${name}`] = disp_text;

    $('.leaflet-display-text').css({
        'top': '-7px',
        'left': '-7px',
        'border-radius': '4px',
        'padding-left': '3px',
        'padding-right': '3px',
        'background-color': '#2262CC',
        'color': 'white',
        'font-weight': 'bold',
        'font-size': '12px'
    });
}

function addLControlDisplayTextAboveColorBar(
    name, options, map = MAP_BE
) {
    const controlName = `displayText_${name}`;
    if (map[controlName] !== undefined) {
        map[controlName].remove();
    }

    const defaultOptions = {
        id: `display-${name}-id`,
        position: 'bottomright'
    };
    const newOptions = Object.assign({}, defaultOptions, options || {});
    const displayText = L.control(newOptions);

    displayText.onAdd = function() {
        this._div = L.DomUtil.create(
            'div', 'leaflet-display-text leaflet-colorbar-text'
        );
        this.update('');
        L.DomEvent.disableClickPropagation(this._div);
        return this._div;
    };

    displayText.update = function(text) {
        $(this._div).text(text || '');
    };

    displayText.addTo(map);
    map[controlName] = displayText;

    //// modern ECMAScript optional chaining
    // const colorBar = map.colorBar?.getContainer();
    const colorBar = map.colorBar ?
        map.colorBar.getContainer() :
        null;
    const textContainer = displayText.getContainer();
    if (colorBar && textContainer) {
        colorBar.parentNode.insertBefore(textContainer, colorBar);
    }

    $(textContainer).css({
        'border-radius': '4px',
        'padding': '3px 6px',
        'background-color': '#2262CC',
        'color': 'white',
        'font-weight': 'bold',
        'font-size': '12px'
    });

    return displayText;
}

function addLControlColorBar(colorkey, options, map = MAP_BE) {
    const default_options = {
        id: 'table-colorkey-id',
        position: 'bottomright'
    };
    if (options === undefined) {
        var options = {};
    }
    const new_options = Object.assign({}, default_options, options);

    removeColorBar(new_options.id, map);
    let color_bar = L.control(new_options);

    color_bar.onAdd = (map) => {
        let div = L.DomUtil.create('div', 'leaflet-colorbar');
        $(div).empty();
        $(div).append(colorkey);

        // disable map click when clicking over the colorbar
        L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);

        return div;
    }
    color_bar.addTo(map);
    map.colorBar = color_bar;
}

function formatLongitude(lon) {
    let degre, minute, second;
    xlon = (lon < 0) ? Math.abs(lon) : lon;
    degre = Math.floor(xlon);
    lonm = (xlon - degre) * 60;
    minute = Math.floor(lonm);
    second = (lonm - minute) * 60;
    suffix = (lon < 0) ? 'W' : 'E';
    rlon = `${degre}º ${minute}' ${second.toFixed(2)}" ${suffix}`;
    return rlon;
}

function formatLatitude(lat) {
    let degre, minute, second;
    xlat = (lat < 0) ? Math.abs(lat) : lat;
    degre = Math.floor(xlat);
    latm = (xlat - degre) * 60;
    minute = Math.floor(latm);
    second = (latm - minute) * 60;
    suffix = (lat < 0) ? 'S' : 'N';
    rlat = `${degre}º ${minute}' ${second.toFixed(2)}" ${suffix}`;
    return rlat;
}

function leafletRasterImage(image, bounds, options, map = MAP_BE) {
    const default_options = {
        id: 'png-overlay-id',
        opacity: 1,
        type: 'pixels',
        // type: 'image',
        fitbounds: false
    };
    if (options === undefined) {
        var options = {};
    }
    const new_options = Object.assign({}, default_options, options);

    map.closePopup();
    removeRasterImage(new_options.id, map);
    map.invalidateSize();

    const raster_image = createRasterImage(image, bounds, new_options);
    map.addLayer(raster_image);
    if (new_options.fitbounds) {
        map.fitBounds(bounds);
    }
    map.rasterImage = raster_image;
}

function displayRasterImage(json, options, map = MAP_BE) {
    leafletRasterImage(json.data.png, json.data.bounds, options, map);
    displayColorBar(json.ckeys, 'horizontal', map);
    // displayColorBar(json.ckeys, 'vertical', map);
    // 
    // leaflet basemap
    changeLeafletBasemapStyle(map);
    // subdivisions layer
    displayMapSubdivisions(map);
    // map opacity
    setRasterImageOpacity(map);
    // map colorbar settings
    // colorbarSettings(json);
    colorbarSettings(json.ckeys.labels, json.ckeys.title);
    // display region
    displayMapRegions(map);
}

function isStoredLeafletMapValid(json, map = MAP_BE) {
    if (!json || !json.data || !json.data.png || !json.data.bounds) {
        return false;
    }

    if (json._maproom !== map.maproom) {
        return false;
    }

    if (json._pathname !== window.location.pathname) {
        return false;
    }

    return true;
}

function createRasterImage(image, bounds, options) {
    switch (options.type) {
        case 'pixels':
            return addRasterImage(image, bounds, options);
        case 'image':
            return L.imageOverlay(image, bounds, options);
        default:
            return L.imageOverlay(image, bounds, options);
    }
}

function removeRasterImage(id = null, map = MAP_BE) {
    if (map.rasterImage !== undefined) {
        if (id === null) {
            // map.rasterImage.remove();
            map.removeLayer(map.rasterImage);
        } else {
            if (map.rasterImage.options.id !== undefined) {
                if (map.rasterImage.options.id === id) {
                    // map.rasterImage.remove();
                    map.removeLayer(map.rasterImage);
                }
            }
        }
    }
}

function removeDisplayedText(id = null, map = MAP_BE) {
    if (map.displayText !== undefined) {
        if (id === null) {
            map.displayText.remove();
            // map.removeControl(map.displayText);
        } else {
            if (map.displayText.options.id !== undefined) {
                if (map.displayText.options.id === id) {
                    map.displayText.remove();
                }
            }
        }
    }
}

function removeColorBar(id = null, map = MAP_BE) {
    if (map.colorBar !== undefined) {
        if (id === null) {
            map.colorBar.remove();
        } else {
            if (map.colorBar.options.id !== undefined) {
                if (map.colorBar.options.id === id) {
                    map.colorBar.remove();
                }
            }
        }
    }
}

function removeMarkersLayer(id = null, map = MAP_BE) {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            if (id === null) {
                layer.remove();
            } else {
                if (layer.options.id !== undefined) {
                    if (layer.options.id === id) {
                        layer.remove();
                    }
                }
            }
        }
    });
}

function disableMapHandlers(map) {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
}

function enableMapHandlers(map) {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
}

function disableMapClickSelect2(map = MAP_BE) {
    const element = document.getElementById('container-map-navigation');
    if (element !== null) {
        L.DomEvent.disableClickPropagation(element);

        $(document).on('mousedown', '.select2-container--open', function(e) {
            L.DomEvent.stopPropagation(e);
        });

        $('#list-spatial-average, #support-spatial-average')
            .on('select2:open', (e) => {
                disableMapHandlers(map);
            })
            .on('select2:close', (e) => {
                enableMapHandlers(map);
            });
    }
}

function disableMapOffcanvas(map = MAP_BE) {
    $('.offcanvas')
        .on('shown.bs.offcanvas', (e) => {
            disableMapHandlers(map);
        })
        .on('hidden.bs.offcanvas', (e) => {
            enableMapHandlers(map);
        });
}

function createMarkerPopup(marker, map = MAP_BE) {
    const div = $('<div>');
    const div1 = $('<div>').appendTo(div)
        .addClass('border border-secondary rounded-3 ps-2 pe-2');

    const pLon = $('<p>').appendTo(div1)
        .addClass('d-flex justify-content-end align-items-center gap-2 m-1');
    $('<span>').appendTo(pLon).text('Longitude:');
    const inputLon = $('<input>').attr({
        type: 'text',
        id: 'marker-loc-lon',
        class: 'form-control form-control-sm d-inline-block w-auto',
        value: $('.marker-loc-lon').val(),
        size: 10
    }).appendTo(pLon);

    const pLat = $('<p>').appendTo(div1)
        .addClass('d-flex justify-content-end align-items-center gap-2 m-1');
    $('<span>').appendTo(pLat).text('Latitude:');
    const inputLat = $('<input>').attr({
        type: 'text',
        id: 'marker-loc-lat',
        class: 'form-control form-control-sm d-inline-block w-auto',
        value: $('.marker-loc-lat').val(),
        size: 10
    }).appendTo(pLat);

    const div2 = $('<div>').appendTo(div)
        .addClass('d-flex align-items-center justify-content-center mt-2');

    $('<button>', {
        type: 'button',
        id: 'marker-loc-btn',
        class: 'btn btn-secondary btn-sm',
        text: JS_TEXT.delete_marker,
        click: () => {
            const rlon = Number(inputLon.val());
            $('.marker-loc-lon').val(rlon);
            const rlat = Number(inputLat.val());
            $('.marker-loc-lat').val(rlat);
            map.removeLayer(marker);
        }
    }).appendTo(div2);

    return div;
}

function addSubdivisionStyles() {
    const n = Object.keys(LAYERS.subdivision).length;
    const s = 0;
    const e = 128;
    const t = Math.round((e - s) / (n - 1));
    const g = Array.from({ length: n }, (_, i) => s + i * t);

    const hex = (c) => {
        const h = c.toString(16);
        return h.length === 1 ? '0' + h : h;
    };

    const keys = [];
    for (let k in LAYERS.subdivision) {
        const o = LAYERS.subdivision[k].order;
        keys[o] = k;
    }

    for (let i = 0; i < n; i++) {
        const c = Math.min(255, Math.max(0, g[n - i - 1]));
        const k = `#${hex(c)}${hex(c)}${hex(c)}`;

        LAYERS.subdivision[keys[i]]['style'] = {
            fill: false,
            color: k,
            weight: 1 + 0.5 * i,
            opacity: 1,
            fillOpacity: 0.0
        }
    }
}

function createSubdivisionStyles(map = MAP_BE) {
    const k0 = Object.keys(LAYERS.subdivision);
    if (LAYERS.subdivision[k0[0]].style === undefined) {
        addSubdivisionStyles();
    }

    $('#map-styles-subdivision').empty();

    const divCont0 = $('<div>').addClass('container');
    const row0 = $('<div>').addClass('row').appendTo(divCont0);

    $('<div>').appendTo(row0)
        .addClass('col p-0 m-0')
        .text(LAYERS.subdivision_styles_table.subdivision);
    $('<div>').appendTo(row0)
        .addClass('col p-0 m-0 ms-2 text-break')
        .text(LAYERS.subdivision_styles_table.color);
    $('<div>').appendTo(row0)
        .addClass('col p-0 m-0 text-break')
        .text(LAYERS.subdivision_styles_table.width);
    $('<div>').appendTo(row0)
        .addClass('col p-0 m-0 text-break')
        .text(LAYERS.subdivision_styles_table.opacity);

    $('#map-styles-subdivision').append(divCont0);

    const keys = [];
    for (let key in LAYERS.subdivision) {
        const o = LAYERS.subdivision[key].order;
        keys[o] = key;
    }

    const divCont = $('<div>').addClass('container');
    const kl1 = 'col col-sm-4 p-0 m-0';
    const kl2 = 'col col-sm-2 p-0 m-0';
    const kl3 = 'col col-sm-4 p-0 m-0';

    for (let k = 0; k < keys.length; k++) {
        const kv = keys[k];
        const subdiv = LAYERS.subdivision[kv];

        const row = $('<div>').addClass('row')
            .attr('id', `${kv}-subdivision-row`)
            .appendTo(divCont);
        $('<div>').addClass(`${kl1} text-break`)
            .appendTo(row)
            .text(subdiv.name);

        const div_col = $('<div>').addClass(kl2)
            .appendTo(row);
        const input_col = $('<input>').attr({
                type: 'color',
                id: `${kv}-subdivision-color`,
                class: 'form-control form-control-color',
                value: subdiv.style.color
            })
            .css('width', '50px')
            .appendTo(div_col);

        input_col.on('input', function() {
            const kol = $(this).val();
            const layer = map.subdivisions[kv];
            if (layer !== undefined) {
                layer.setStyle({ color: kol });
            }
        });

        const div_wd = $('<div>').addClass(kl2)
            .appendTo(row);
        const input_lwd = $('<input>').attr({
                type: 'number',
                id: `${kv}-subdivision-width`,
                class: 'form-control',
                min: 0.5,
                max: 8.0,
                step: 0.5,
                value: subdiv.style.weight
            })
            .css({
                'width': '50px',
                'padding-right': '0px',
                'padding-left': '0px'
            })
            .appendTo(div_wd);

        input_lwd.on('change', function() {
            const lwd = $(this).val();
            const layer = map.subdivisions[kv];
            if (layer !== undefined) {
                layer.setStyle({ weight: lwd });
            }
        });

        const div_opc = $('<div>').appendTo(row)
            .addClass(`${kl3} d-flex align-items-center`);
        const slide_range = $('<input>').attr({
                type: 'range',
                id: `${kv}-subdivision-opacity-slide`,
                class: 'form-range ms-1',
                min: 0,
                max: 1.0,
                step: 0.1,
                value: subdiv.style.opacity,
                'data-key': kv
            })
            .css('width', '70px')
            .appendTo(div_opc);

        const slide_value = $('<span>').appendTo(div_opc)
            .attr('id', `${kv}-subdivision-opacity-value`)
            .css({ 'font-weight': 'bold', 'margin-left': '3px' })
            .html(subdiv.style.opacity);

        slide_range.on('input', function() {
            const opc = $(this).val();
            slide_value.text(opc);
            const layer = map.subdivisions[kv];
            if (layer !== undefined) {
                layer.setStyle({ opacity: opc });
            }
        });
    }

    $('#map-styles-subdivision').append(divCont);
}

function showhideSubdivisionStyles(selItems) {
    for (let key in LAYERS.subdivision) {
        if (selItems.includes(key)) {
            $(`#${key}-subdivision-row`).show();
        } else {
            $(`#${key}-subdivision-row`).hide();
        }
    }
}

function getSubdivisionStyles() {
    const keys = [];
    for (let key in LAYERS.subdivision) {
        const o = LAYERS.subdivision[key].order;
        keys[o] = key;
    }

    for (let k = 0; k < keys.length; k++) {
        const kv = keys[k];
        const kol = $(`#${kv}-subdivision-color`).val();
        LAYERS.subdivision[kv].style.color = kol;
        const lwd = $(`#${kv}-subdivision-width`).val();
        LAYERS.subdivision[kv].style.weight = Number(lwd);
        const opc = $(`#${kv}-subdivision-opacity-slide`).val();
        LAYERS.subdivision[kv].style.opacity = Number(opc);
    }
}

function displaySubdivisionLayers(selItems, map = MAP_BE, dispRegion = null) {
    getSubdivisionStyles();

    if (SUBDIV_BE === undefined) {
        return false;
    }
    if (Object.keys(SUBDIV_BE).length === 0) {
        return false;
    }
    if (selItems.length === 0) {
        return false;
    }

    for (let key of selItems) {
        if (map.subdivisions[key] !== undefined) {
            // map.subdivisions[key].remove(); 
            map.removeLayer(map.subdivisions[key]);
        }
        var subdiv = JSON.parse(SUBDIV_BE[key]);
        if (dispRegion !== null) {
            subdiv = extractRegionSubdivisions(subdiv, dispRegion);
        }

        map.subdivisions[key] = L.geoJson(subdiv, {
            style: LAYERS.subdivision[key].style
        }).addTo(map);
    }

    if (dispRegion !== null) {
        const bbox = turf.bbox(subdiv, options = { recompute: true });
        const southWest = L.latLng(bbox[1], bbox[0]);
        const northEast = L.latLng(bbox[3], bbox[2]);
        const bounds = L.latLngBounds(southWest, northEast);
        map.fitBounds(bounds);
    } else {
        const center = L.latLng(
            MTO_INIT.mapCenterLAT,
            MTO_INIT.mapCenterLON
        );
        map.setView(center, MTO_INIT.mapZoom);
    }
}

function extractRegionSubdivisions(subdiv, dispRegion) {
    var sub_filtered = {
        type: "FeatureCollection",
        features: []
    };

    subdiv.features.forEach(sub => {
        if (sub.properties.region === dispRegion) {
            sub_filtered.features.push(sub);
        }
    });
    return sub_filtered;
}

function extractRegionSubdivisionsTurfjs(subdiv, dispRegion) {
    const sub_clip = LAYERS.subdivision_clip[MAP_BE.maproom];
    var region = JSON.parse(SUBDIV_BE[sub_clip]);
    region.features = region.features.filter(x => x.properties.field === dispRegion);

    var sub_filtered = {
        type: 'FeatureCollection',
        features: []
    };

    subdiv.features.forEach(sub => {
        region.features.forEach(reg => {
            if (sub.geometry.type === 'MultiPolygon') {
                if (reg.geometry.type === 'MultiPolygon') {
                    let res = [];
                    for (let i = 0; i < sub.geometry.coordinates.length; i++) {
                        var sub_tmp = makeCopy(sub);
                        sub_tmp.geometry.type = 'Polygon';
                        sub_tmp.geometry.coordinates = sub.geometry.coordinates[i];
                        for (let i = 0; i < reg.geometry.coordinates.length; i++) {
                            var reg_tmp = makeCopy(reg);
                            reg_tmp.geometry.type = 'Polygon';
                            reg_tmp.geometry.coordinates = reg.geometry.coordinates[i];
                            var isi = turf.booleanOverlap(sub_tmp, reg_tmp);
                            var cid = turf.centroid(sub_tmp);
                            var pin = turf.booleanPointInPolygon(cid, reg_tmp);
                            res.push(isi && pin);
                        }
                    }
                    if (res.some(b => b === true)) {
                        sub_filtered.features.push(sub);
                    }
                } else {
                    let res = [];
                    for (let i = 0; i < sub.geometry.coordinates.length; i++) {
                        var sub_tmp = makeCopy(sub);
                        sub_tmp.geometry.type = 'Polygon';
                        sub_tmp.geometry.coordinates = sub.geometry.coordinates[i];
                        var isi = turf.booleanIntersects(sub_tmp, reg);
                        var cid = turf.centroid(sub_tmp);
                        var pin = turf.booleanPointInPolygon(cid, reg);
                        res.push(isi && pin);
                    }
                    if (res.some(b => b === true)) {
                        sub_filtered.features.push(sub);
                    }
                }
            } else {
                if (reg.geometry.type === 'MultiPolygon') {
                    let res = [];
                    for (let i = 0; i < reg.geometry.coordinates.length; i++) {
                        var reg_tmp = makeCopy(reg);
                        reg_tmp.geometry.type = 'Polygon';
                        reg_tmp.geometry.coordinates = reg.geometry.coordinates[i];
                        var isi = turf.booleanIntersects(sub, reg_tmp);
                        var cid = turf.centroid(sub);
                        var pin = turf.booleanPointInPolygon(cid, reg_tmp);
                        res.push(isi && pin);
                    }
                    if (res.some(b => b === true)) {
                        sub_filtered.features.push(sub);
                    }
                } else {
                    var isi = turf.booleanIntersects(sub, reg);
                    var cid = turf.centroid(sub);
                    var pin = turf.booleanPointInPolygon(cid, reg);
                    if (isi && pin) {
                        sub_filtered.features.push(sub);
                    }
                }
            }
        });
    });

    return sub_filtered;
}

function displayMapSubdivisions(map = MAP_BE) {
    orderSelect2SelectedItems('#map-display-subdivision');

    $('#map-display-subdivision').on('change', function() {
        const selItems = $(this).val();
        showhideSubdivisionStyles(selItems);
        const country = $('#select-country-region').val();
        if (country === 'country') {
            displaySubdivisionLayers(selItems, map);
        } else {
            const region = $('#select-region-name').val();
            displaySubdivisionLayers(selItems, map, region);
        }
    });
    $('#map-display-subdivision').trigger('change');

    $('#map-display-subdivision').on('select2:unselect', (e) => {
        const id = e.params.data.id;
        if (map.subdivisions[id] !== undefined) {
            map.removeLayer(map.subdivisions[id]);
        }
    });
}

function getDataSpatialAverage(sp_avg, data_res) {
    if (sp_avg === 'gridpoint') {
        if (data_res === null) {
            var data = [{ id: 'grid', text: 'gridpoint' }];
        } else {
            const res = `${data_res.lon} x ${data_res.lat}`;
            var data = [{ id: 'grid', text: res }];
        }
    } else {
        var subdiv = JSON.parse(SUBDIV_BE[sp_avg]);
        const country = $('#select-country-region').val();
        if (country === 'region') {
            const region = $('#select-region-name').val();
            subdiv = extractRegionSubdivisions(subdiv, region);
        }

        var data = subdiv.features.map(x => x.properties.field);
        data = data.map(x => {
            const v = new Object();
            v.id = x;
            v.text = x;
            return v;
        });
    }

    return data;
}

function highlightFeatureSubdivision(layer, map) {
    layer.setStyle(featureSubdivisionStyles('highlight'));
    const field = layer.feature.properties.field;
    map.displayText_subdivision.update(field);
}

function resetHighlightSubdivision(layer, map) {
    const field = layer.feature.properties.field;
    const selected = $('.selected-subdiv-poly').val();
    if (field === selected) {
        layer.setStyle(featureSubdivisionStyles('selected'));
    } else {
        layer.setStyle(featureSubdivisionStyles('default'));
    }
    map.displayText_subdivision.update('');
}

function featureSubdivisionStyles(state) {
    switch (state) {
        case 'default':
            style = {
                stroke: false,
                opacity: 0.0,
                fillOpacity: 0.0
            };
            break;
        case 'highlight':
            style = {
                color: '#58151c',
                weight: 2,
                opacity: 1,
                fill: true,
                fillOpacity: 0.8,
                fillColor: '#dc3545'
            };
            break;
        case 'selected':
            style = {
                stroke: false,
                fillOpacity: 0.6,
                fillColor: '#d63384'
            };
    }
    return style;
}

function mapClickLayers(layer, callback, time_res, map) {
    if (map.clickMapControl) {
        map.clickMapControl = false;
        return;
    }

    if (!$('.offcanvas').hasClass('show')) {
        const field = layer.feature.properties.field;

        LAYER_GEOJSON.eachLayer(function(l) {
            if (l.feature.properties.field === field) {
                layer.setStyle(featureSubdivisionStyles('selected'));
            } else {
                l.setStyle(featureSubdivisionStyles('default'));
            }
        });
        $('.selected-subdiv-poly').val(field);
        $('#list-spatial-average').val(field);
        $('#list-spatial-average').trigger('change.select2');
        callback(time_res);
    }
}

function createMarkerLocation(lon, lat, callback, time_res, map) {
    removeMarkersLayer('marker-loc-id', map);

    $('.marker-loc-lat').val(lat.toFixed(6));
    $('.marker-loc-lon').val(lon.toFixed(6));

    let marker = L.marker([lat, lon], {
        id: 'marker-loc-id',
        draggable: true,
        autoPan: true
    }).addTo(map);

    // 
    var divPop = createMarkerPopup(marker, map);
    marker.bindPopup(divPop.get(0));

    // delete marker
    $('#rm-layer-spatial-average').on('click', () => {
        map.removeLayer(marker);
        map.clickMapControl = false;
    });

    // 
    marker.on('dragend', function(m) {
        const xy = m.target.getLatLng();
        $('.marker-loc-lon').val(xy.lng.toFixed(6));
        $('.marker-loc-lat').val(xy.lat.toFixed(6));

        var divPop = createMarkerPopup(marker, map);
        marker.setPopupContent(divPop.get(0));
        if (callback !== null) {
            callback(time_res);
        }
    });

    marker.on('popupclose', function(e) {
        const rlon = Number($('#marker-loc-lon').val());
        $('.marker-loc-lon').val(rlon);
        const rlat = Number($('#marker-loc-lat').val());
        $('.marker-loc-lat').val(rlat);
        this.setLatLng([rlat, rlon]);
        callback(time_res);
    });

    callback(time_res);
}

function mapClickLoctation(callback, time_res, map) {
    createMarkerLocation(
        MTO_INIT.mapCenterLON,
        MTO_INIT.mapCenterLAT,
        callback,
        time_res,
        map
    );

    map.on('click', (e) => {
        if (map.clickMapControl) {
            map.clickMapControl = false;
            return;
        }

        if (!$('.offcanvas').hasClass('show')) {
            createMarkerLocation(
                e.latlng.lng,
                e.latlng.lat,
                callback,
                time_res,
                map
            );
        }
    });
}

function getClickLoctation() {
    let lon = $('.marker-loc-lon').val();
    if (lon === '') {
        lon = MTO_INIT.mapCenterLON;
    }
    let lat = $('.marker-loc-lat').val();
    if (lat === '') {
        lat = MTO_INIT.mapCenterLAT;
    }
    const loc = {
        'loc': 'Point',
        'lon': lon,
        'lat': lat
    }
    return [loc]
}

function getClickPolygon() {
    const sp_avg = $('#support-spatial-average').val();
    let data = getDataSpatialAverage(sp_avg, null);
    data = data.map(x => x.id);

    let poly = $('.selected-subdiv-poly').val();
    if (poly === '') {
        poly = $('#list-spatial-average').val();
    }

    if (data.includes(poly)) {
        return poly
    } else {
        return null;
    }
}

function checkQueryPointOutside(query, time_res) {
    if (query['geomExtract'] !== 'points') {
        return false;
    }

    const point = query.pointsList[0];
    const lon = Number(point.lon);
    const lat = Number(point.lat);
    let p;
    if (query.map_variable || query.chart_variable) {
        if (query.map_variable) {
            p = query.map_variable;
        }
        if (query.chart_variable) {
            p = query.chart_variable;
        }
    } else {
        p = query.variable;
    }
    const d = query.dataset;
    const v = DATA_SET.variables[p][0];
    const bbox = DATA_INFO[d][time_res][v].spatial_coverage;

    const xlon = bbox.minlon > lon || bbox.maxlon < lon;
    const xlat = bbox.minlat > lat || bbox.maxlat < lat;
    if (xlon || xlat) {
        return true;
    }
    return false;
}

///////////

var LAYER_SELECTED;
var LAYER_GEOJSON;

function mapClickLayersSpatialAverage(callback, time_res, map = MAP_BE) {
    $('#support-spatial-average').on('change', function() {
        const sp_avg = $(this).val();
        map.displayText_subdivision.update('');

        if (LAYER_SELECTED !== undefined) {
            if (LAYER_SELECTED === 'gridpoint') {
                removeMarkersLayer('marker-loc-id', map);
            } else {
                if (LAYER_GEOJSON !== undefined) {
                    map.removeLayer(LAYER_GEOJSON);
                }
            }
        }
        map.off('click');

        if (sp_avg === 'gridpoint') {
            // if point outside return false
            mapClickLoctation(callback, time_res, map);
        } else {
            // create the selected layer, set styles, display chart on click
            var subdiv = JSON.parse(SUBDIV_BE[sp_avg]);
            const country = $('#select-country-region').val();
            if (country === 'region') {
                const region = $('#select-region-name').val();
                subdiv = extractRegionSubdivisions(subdiv, region);
            }
            LAYER_GEOJSON = L.geoJSON(subdiv, {
                style: featureSubdivisionStyles('default'),
                onEachFeature: function(feature, layer) {
                    layer.on({
                        mouseover: function(e) {
                            highlightFeatureSubdivision(layer, map);
                        },
                        mouseout: function(e) {
                            resetHighlightSubdivision(layer, map);
                        },
                        click: function(e) {
                            mapClickLayers(layer, callback, time_res, map);
                        }
                    });
                }
            }).addTo(map);

            // set styles and display charts on select from list of polygon
            getPolygonSpatialAverage(callback, time_res);

            // clear selected polygon
            clearSelectedSpatialAverage(map);
        }

        LAYER_SELECTED = sp_avg;
    });
    $('#support-spatial-average').trigger('change');
}

function setSelectSpatialAverage(data_res = null) {
    $('#support-spatial-average').on('change', function() {
        $('#list-spatial-average').empty();
        const sp_avg = $(this).val();
        const data = getDataSpatialAverage(sp_avg, data_res);
        $('#list-spatial-average').select2({
            data: data
        });
    });
    $('#support-spatial-average').trigger('change');
}

function getPolygonSpatialAverage(callback, time_res) {
    $('#list-spatial-average').on('change', function() {
        const field = $(this).val();
        $('.selected-subdiv-poly').val(field);
        if (LAYER_GEOJSON !== undefined) {
            LAYER_GEOJSON.eachLayer(function(layer) {
                if (layer.feature.properties.field === field) {
                    layer.setStyle(featureSubdivisionStyles('selected'));
                } else {
                    layer.setStyle(featureSubdivisionStyles('default'));
                }
            });
        }
        callback(time_res);
    });
    $('#list-spatial-average').trigger('change');
}

function clearSelectedSpatialAverage(map) {
    $('#rm-layer-spatial-average').on('click', () => {
        if (LAYER_GEOJSON !== undefined) {
            LAYER_GEOJSON.eachLayer(function(layer) {
                layer.setStyle(featureSubdivisionStyles('default'));
            });
            map.clickMapControl = false;
        }
    });
}

function saveSpatialAverageSelect2() {
    let sp_avg = [];
    const id_sp = 'support-spatial-average';
    $(`#${id_sp} option, #${id_sp} optgroup`).each(function() {
        const $this = $(this);
        if ($this.is('option')) {
            if ($this.closest('optgroup').attr('label') === undefined) {
                sp_avg.push({
                    id: $this.val(),
                    text: $this.text()
                });
            }
        } else if ($this.is('optgroup')) {
            let grp_opts = []
            $this.find('option').each(function() {
                const $option = $(this);
                grp_opts.push({
                    id: $option.val(),
                    text: $option.text(),
                });
            });
            sp_avg.push({
                text: $this.attr('label'),
                children: grp_opts
            });
        }
    });
    maproomDB.clearData('sp_avg_select2');
    maproomDB.saveData('sp_avg_select2', sp_avg);
}

let currentPlottyInstance = null;

function colorbarSettings(ckeys_labels, ckeys_title) {
    $('#map-colorbar-colors').on('change', function() {
        if ($(this).val() === 'user') {
            $('#colorbar-color-user').show();
            $('#colorbar-color-preset').hide();
            $('#colorbar-preview-preset').hide();
            $('#colorbar-preview-user').show();
        } else {
            $('#colorbar-color-user').hide();
            $('#colorbar-color-preset').show();
            $('#colorbar-preview-preset').show();
            $('#colorbar-preview-user').hide();
        }
    });
    $('#map-colorbar-colors').trigger('change');

    $('#colorbar-preview-user-btn').on('click', () => {
        const colorbar = colorbarGetData();
        if (!colorbar) {
            return;
        }
        $.ajax({
            type: 'POST',
            url: '/preview_user_colobar',
            dataType: 'json',
            data: JSON.stringify(colorbar),
            contentType: 'application/json',
            success: (json) => {
                if (json.status === -1) {
                    const kol = json.colors.join(', ');
                    const msg = `${JS_TEXT.colorbar_col_invalid}: ${kol}`;
                    flashMessage(msg, 'error');
                    return false;
                } else {
                    $('#colorbar-preview-user').attr('src', json.colors);
                }
            },
            error: (xhr, s, e) => {
                displayAjaxError(xhr, s, e);
            }
        });
    });

    ////
    $('#map-colorbar-breaks').on('change', function() {
        if ($(this).val() === 'user') {
            $('#colorbar-breaks-user').show();
            $('#colorbar-breaks-user-text').html(ckeys_labels.join(', '));
        } else {
            $('#colorbar-breaks-user').hide();
        }
    });
    $('#map-colorbar-breaks').trigger('change');

    ////
    $('#colorbar-color-extension-check').on('change', function() {
        if ($(this).prop('checked')) {
            $('#colorbar-color-extension-div').show();
        } else {
            $('#colorbar-color-extension-div').hide();
        }
    });

    ////
    $('#colorbar-color-preset-select').on('change', function() {
        if (currentPlottyInstance && typeof currentPlottyInstance.destroy === 'function') {
            currentPlottyInstance.destroy();
        }

        currentPlottyInstance = L.LeafletGeotiff.plotty({ colorScale: $(this).val() });
        $('#colorbar-preview-preset').attr('src', currentPlottyInstance.colorScaleData);
    });
    $('#colorbar-color-preset-select').trigger('change');

    ////
    $('#colorbar-title-user').val(ckeys_title);

    $('#colorbar-title-user').on('blur', function() {
        $('.leaflet-colorbar .ckeyh-title td').html($(this).val().trim());
    });
}

function colorbarSetDefault(colors = null, breaks = null) {
    if (colors === null) {
        $('#map-colorbar-colors').val('preset');
        $('#colorbar-color-preset-select').val('tim_colors');
        $('#colorbar-color-user-text').val('');
    } else {
        if (Array.isArray(colors)) {
            $('#map-colorbar-colors').val('user');
            $('#colorbar-color-preset-select').val('tim_colors');
            $('#colorbar-color-user-text').val(colors.join(', '));
        } else {
            $('#map-colorbar-colors').val('preset');
            $('#colorbar-color-preset-select').val(colors);
            $('#colorbar-color-user-text').val('');
        }
    }

    if (breaks === null) {
        $('#map-colorbar-breaks').val('default');
        $('#colorbar-breaks-user-text').val('');
    } else {
        $('#map-colorbar-breaks').val('user');
        $('#colorbar-breaks-user-text').val(breaks.join(', '));
    }
}

function colorbarGetData() {
    const ctype = $('#map-colorbar-colors').val();
    if (ctype === 'preset') {
        var colorbar = $('#colorbar-color-preset-select').val();
    } else {
        const colors = $('#colorbar-color-user-text').val();
        if (colors.trim() === '') {
            flashMessage(JS_TEXT.colorbar_col_empty, 'error');
            return false;
        }
        var arr_col = colors.split(',').map(s => s.trim());
        arr_col = arr_col.filter(s => s !== '');
        if (arr_col.length < 2) {
            flashMessage(JS_TEXT.colorbar_col_length, 'error');
            return false;
        }
        var colorbar = arr_col;
    }

    //
    const add_extension = $('#colorbar-color-extension-check').is(':checked');
    if (add_extension) {
        var extensions = [
            $('#colorbar-color-extension-under').val().trim(),
            $('#colorbar-color-extension-over').val().trim()
        ];
    } else {
        var extensions = null;
    }

    // 
    const btype = $('#map-colorbar-breaks').val();
    let breaks = null;
    if (btype === 'user') {
        const brks = $('#colorbar-breaks-user-text').val();
        if (brks.trim() === '') {
            flashMessage(JS_TEXT.colorbar_brk_empty, 'error');
            return false;
        }
        var arr_str = brks.split(',').map(b => b.trim());
        arr_str = arr_str.filter(b => b !== '');
        if (arr_str.length < 2) {
            flashMessage(JS_TEXT.colorbar_brk_length, 'error');
            return false;
        }

        const is_dates = arr_str.every(i => i.includes('-'));
        let arr_brk;
        if (is_dates) {
            arr_brk = arr_str;
            const is_valid = arr_brk
                .every(i => /^[A-Za-z]{3}-/.test(i));

            if (!is_valid) {
                const wrng = idx.map(i => arr_str[i]).join(', ');
                const msg = `${JS_TEXT.colorbar_brk_invalid}: ${wrng}`;
                flashMessage(msg, 'error');
                return false;
            }
        } else {
            arr_brk = arr_str.map(Number);
            const idx = arr_brk
                .map((v, i) => Number.isNaN(v) ? i : -1)
                .filter(i => i !== -1);

            if (idx.length > 0) {
                const wrng = idx.map(i => arr_str[i]).join(', ');
                const msg = `${JS_TEXT.colorbar_brk_invalid}: ${wrng}`;
                flashMessage(msg, 'error');
                return false;
            }
        }

        breaks = arr_brk;
    }

    return {
        color_type: ctype,
        color_cbar: colorbar,
        color_add_ext: add_extension,
        color_ext: extensions,
        break_type: btype,
        break_cbar: breaks
    }
}

function displayMapRegions(map = MAP_BE) {
    $('#select-country-region').on('change', function() {
        $('#map-display-subdivision').empty();
        $('#support-spatial-average').empty();
        $('#list-spatial-average').empty();

        for (let key of Object.keys(SUBDIV_BE)) {
            if (map.subdivisions[key] !== undefined) {
                map.removeLayer(map.subdivisions[key]);
            }
        }

        if ($(this).val() === 'region') {
            $('#select-region-container').show();
            // 
            const region = LAYERS.subdivision_clip[map.maproom];
            const subdiv = JSON.parse(SUBDIV_BE[region]);
            const data_region = subdiv.features.map(x => {
                return {
                    id: x.properties.field,
                    text: x.properties.field
                };
            });
            $('#select-region-name').select2({
                data: data_region
            });

            let data = [];
            let sub_region = [];
            for (let key in LAYERS.subdivision) {
                if ('region' in LAYERS.subdivision[key]) {
                    data.push({
                        id: key,
                        text: LAYERS.subdivision[key].name
                    });
                    sub_region.push(key);
                }
            }
            $('#map-display-subdivision').select2({
                data: data
            });
            const sub_clip = LAYERS.subdivision_clip[map.maproom];
            $('#map-display-subdivision').val(sub_clip).trigger('change');
            const region_sel = $('#select-region-name').val();
            displaySubdivisionLayers([sub_clip], map, region_sel);

            // 
            maproomDB.getData('leaflet_map', function(json) {
                if (!isStoredLeafletMapValid(json, map)) {
                    return;
                }
                const sub_c = LAYERS.subdivision_clip[map.maproom];
                var region = JSON.parse(SUBDIV_BE[sub_c]);
                region.features = region.features.filter(x => x.properties.field === region_sel);
                const bounds = json.data.bounds;
                maskImageMapRegions(json.data, region).then(masked => {
                    const options = { fitbounds: true };
                    leafletRasterImage(masked, bounds, options, map);
                });
            });

            // 
            maproomDB.getData('sp_avg_select2', function(data) {
                const sub_extract = ['gridpoint'].concat(sub_region);
                var data_extract = data.map(x => {
                    if ('children' in x) {
                        let sub_grp = [];
                        for (let i = 0; i < x.children.length; i++) {
                            if (sub_extract.includes(x.children[i].id)) {
                                sub_grp.push(x.children[i]);
                            }
                        }
                        if (sub_grp.length > 0) {
                            return {
                                text: x.text,
                                children: sub_grp
                            };
                        }
                    } else {
                        if (sub_extract.includes(x.id)) {
                            return x;
                        }
                    }
                });
                data_extract = data_extract.filter(x => x !== undefined);

                $('#support-spatial-average').select2({
                    data: data_extract
                });

                // 
                setTimeout(() => {
                    const data_res = null;
                    const sp_avg = $('#support-spatial-average').val();
                    const data_spavg = getDataSpatialAverage(sp_avg, data_res);
                    $('#list-spatial-average').select2({
                        data: data_spavg
                    });
                }, 100);
            });
        } else {
            $('#select-region-container').hide();
            let data = [];
            for (let key in LAYERS.subdivision) {
                data.push({
                    id: key,
                    text: LAYERS.subdivision[key].name
                });
            }
            $('#map-display-subdivision').select2({
                data: data
            });
            $('#map-display-subdivision').val(LAYERS.subdivision_sel[map.maproom]).trigger('change');
            displaySubdivisionLayers([LAYERS.subdivision_sel[map.maproom]], map);

            // 
            maproomDB.getData('leaflet_map', function(json) {
                if (!isStoredLeafletMapValid(json, map)) {
                    return;
                }
                const options = {};
                leafletRasterImage(json.data.png, json.data.bounds, options, map);
            });

            // 
            maproomDB.getData('sp_avg_select2', function(data) {
                $('#support-spatial-average').select2({
                    data: data
                });
                // 
                setTimeout(() => {
                    const data_res = null;
                    const sp_avg = $('#support-spatial-average').val();
                    const data_spavg = getDataSpatialAverage(sp_avg, data_res);
                    $('#list-spatial-average').select2({
                        data: data_spavg
                    });
                }, 100);
            });
        }
    });

    $('#select-region-name').on('change', function() {
        $('#list-spatial-average').empty();
        for (let key of Object.keys(SUBDIV_BE)) {
            if (map.subdivisions[key] !== undefined) {
                map.removeLayer(map.subdivisions[key]);
            }
        }

        const region_sel = $(this).val();
        const disp_subdiv = $('#map-display-subdivision').val();
        displaySubdivisionLayers(disp_subdiv, map, region_sel);

        // 
        maproomDB.getData('leaflet_map', function(json) {
            if (!isStoredLeafletMapValid(json, map)) {
                return;
            }
            const sub_c = LAYERS.subdivision_clip[map.maproom];
            var region = JSON.parse(SUBDIV_BE[sub_c]);
            region.features = region.features.filter(x => x.properties.field === region_sel);
            const bounds = json.data.bounds;
            maskImageMapRegions(json.data, region).then(masked => {
                const options = { fitbounds: true };
                leafletRasterImage(masked, bounds, options, map);
            });
        });

        setTimeout(() => {
            const data_res = null;
            const sp_avg = $('#support-spatial-average').val();
            const data_spavg = getDataSpatialAverage(sp_avg, data_res);
            $('#list-spatial-average').select2({
                data: data_spavg
            });
        }, 100);
    });
}

async function maskImageMapRegions(json, region) {
    const imgExt = {
        west: json.bounds[0][1],
        south: json.bounds[1][0],
        east: json.bounds[1][1],
        north: json.bounds[0][0]
    };

    const lonToX = (lon, width) =>
        ((lon - imgExt.west) / (imgExt.east - imgExt.west)) * width;
    const latToY = (lat, height) =>
        (1 - (lat - imgExt.south) / (imgExt.north - imgExt.south)) * height;

    const img = new Image();
    img.src = json.png;

    return new Promise((resolve, reject) => {
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // 
                let merged = region;
                if (region.type === 'FeatureCollection') {
                    const features = region.features;
                    if (features.length > 1) {
                        merged = features[0];
                        for (let i = 1; i < features.length; i++) {
                            try {
                                merged = turf.union(merged, features[i]);
                            } catch (err) {
                                console.warn(`Skipping invalid feature ${i}:`, err.message);
                            }
                        }
                    } else {
                        merged = features[0];
                    }
                }

                // 
                ctx.globalCompositeOperation = 'destination-in';
                ctx.beginPath();

                const coordsArray =
                    merged.geometry.type === 'Polygon' ? [merged.geometry.coordinates] :
                    merged.geometry.coordinates;

                coordsArray.forEach((polygon) => {
                    polygon.forEach((ring) => {
                        ring.forEach(([lon, lat], i) => {
                            const x = lonToX(lon, img.width);
                            const y = latToY(lat, img.height);
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        });
                        ctx.closePath();
                    });
                });
                ctx.fill();

                const maskedBase64 = canvas.toDataURL('image/png');
                resolve(maskedBase64);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
    });
}

///////////

function queryParamsSpatialAverage() {
    let query = new Object();

    const sp_avg = $('#support-spatial-average').val();
    query.geomExtract = sp_avg === 'gridpoint' ? 'points' : 'polygons';

    if (query.geomExtract === 'points') {
        query.pointsSource = 'upload';
        query.pointsList = getClickLoctation();
    } else {
        const subdiv = LAYERS.subdivision[sp_avg];
        query.shpSource = 'default';
        query.shpFile = subdiv.file;
        query.shpField = subdiv.field;
        query.Poly = getClickPolygon();
        if (query.Poly === null) {
            return false;
        }
    }
    return query;
}