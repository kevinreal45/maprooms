$(document).ready(function() {
    const path = '/static/images/';
    $('link[rel="shortcut icon"]').attr('href', path + MTO_INIT.iconImage);
    $('.meteo-logo').attr('src', path + MTO_INIT.metLogo);
    // 
    $('.item-maproom').masonry({ itemSelector: '.col-md-6' });
    // 
    $('#btn-theme-toggle').on('click', () => {
        const current = $('html').attr('data-bs-theme');
        const newtheme = current === 'dark' ? 'light' : 'dark';

        $('html').attr('data-bs-theme', newtheme);
        localStorage.setItem('theme', newtheme);

        setThemeIcon(newtheme);
        setStylesTheme(newtheme);
    });
    // 
    updatePageTheme();
    persistThemeOnNavigation();

    // initialize select2
    $('.form-select2').select2();
    $('.form-select2-nosearch').select2({
        minimumResultsForSearch: -1
    });

    // get subdivisions data
    ajaxGetSubdivisions();

    // save the initial support-spatial-average
    // display country vs region
    saveSpatialAverageSelect2();

    // add new colorscales to plotty
    plottyAddColorScales();

    // change plotly language
    setPlotlyLanguage();
});

var maproomDB = (function() {
    const dbName = 'maproomLocalDB';
    const storeName = 'maproomLocal';
    var db;

    function openDB(callback) {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'name' });
            }
        };
        request.onsuccess = function(e) {
            db = e.target.result;
            callback(db);
        };
        request.onerror = function() {
            console.error('Error opening database');
        };
    }

    function saveData(name, data) {
        openDB(function(db) {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put({ name: name, data: data });
            request.onsuccess = function() {
                // console.log('Data saved successfully');
            };
            request.onerror = function() {
                console.error('Error saving data');
            };
        });
    }

    function getData(name, callback) {
        openDB(function(db) {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(name);
            request.onsuccess = function(e) {
                callback(e.target.result ? e.target.result.data : null);
            };
            request.onerror = function() {
                callback(null);
            };
        });
    }

    function clearData(name) {
        openDB(function(db) {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(name);
            request.onsuccess = function() {
                // console.log('Data cleared successfully');
            };
            request.onerror = function() {
                console.error('Error deleting data');
            };
        });
    }

    return {
        saveData: saveData,
        getData: getData,
        clearData: clearData
    };
})();

function updatePageTheme() {
    let current = localStorage.getItem('theme');
    if (current === null) {
        // Check system theme
        const sys_dark_theme = window.matchMedia('(prefers-color-scheme: dark)');
        current = sys_dark_theme.matches ? 'dark' : 'light';
        localStorage.setItem('theme', current);
    }
    $('html').attr('data-bs-theme', current);
    setThemeIcon(current);
    setStylesTheme(current);
}

function setThemeIcon(theme) {
    if (theme === 'dark') {
        $('#btn-theme-icon').removeClass('bi-sun-fill');
        $('#btn-theme-icon').addClass('bi-moon-stars-fill');
    } else {
        $('#btn-theme-icon').removeClass('bi-moon-stars-fill');
        $('#btn-theme-icon').addClass('bi-sun-fill');
    }
}

function persistThemeOnNavigation() {
    $('.navbar-nav a[href], .navbar-nav button, .item-maproom a[href]')
        .off('click.persistTheme')
        .on('click.persistTheme', function() {
            const current = $('html').attr('data-bs-theme') ||
                localStorage.getItem('theme');
            if (current !== undefined && current !== null) {
                localStorage.setItem('theme', current);
                setStylesTheme(current);
            }
        });
}

const theme_styles = {
    dark: {
        bgcolor: 'var(--bs-dark)',
        color: 'var(--bs-dark-text-emphasis)',
        navcolor: 'var(--maproom-dark-navbar)',
        hover: 'var(--maproom-dark-hover)'
    },
    light: {
        bgcolor: 'var(--bs-light)',
        color: 'var(--bs-light-text-emphasis)',
        navcolor: 'var(--maproom-light-navbar)',
        hover: 'var(--maproom-light-hover)'
    }
};

function setStylesTheme(theme) {
    const kol_nav = theme_styles[theme].navcolor;
    const hov_nav = theme_styles[theme].hover;

    $('.navbar').css('background-color', kol_nav);

    changeHoverColorTheme('.nav-link-path', hov_nav);
    // changeHoverColorTheme('.offcanvas-body fieldset .form-select', hov_nav);
    changeHoverColorTheme('.offcanvas-body fieldset .form-control', hov_nav);
    changeHoverColorTheme('.modal-expand-charts fieldset .form-control', hov_nav);
    changeHoverColorTheme('.modal-expand-charts fieldset button', hov_nav);
    changeHoverColorTheme('.input-map-time-navigation', hov_nav);

    $('.item-title-1').each(function() {
        $(this).on('mouseenter', () => {
            $(this).css('background-color', hov_nav);
            $(this).addClass('hover-item-title-1');
        });
        $(this).on('mouseleave', () => {
            $(this).css('background-color', '');
            $(this).removeClass('hover-item-title-1');
        });
    });

    $('.item-card .item-image').each(function() {
        $(this).on('mouseenter', () => {
            $(this).css({
                'border': '3px solid ' + hov_nav,
                'border-radius': '15px'
            })
        });
        $(this).on('mouseleave', () => {
            $(this).css({
                'border': '',
                'border-radius': ''
            })
        });
    });

    $('.navbar-right .dropdown-item').hover(function(e) {
        const kol = e.type === 'mouseenter' ? hov_nav : 'transparent';
        $(this).css('background-color', kol);
    });
}

function changeHoverColorTheme(selector, color) {
    $(selector).each(function() {
        $(this).on('mouseenter', () => {
            $(this).css('background-color', color);
        });
        $(this).on('mouseleave', () => {
            $(this).css('background-color', '');
        });
    });
}

function createEndpoint(blueprint, endpoint) {
    const e = `${blueprint}.${endpoint}`;
    return Flask.url_for(e);
}

function flashMessage(message, category) {
    let divFlash = $('<div>').addClass('alert alert-dismissible');
    if (category == 'error') {
        category = 'danger';
    }
    divFlash.addClass(`alert-${category}`);
    divFlash.attr('role', 'alert');
    divFlash.html(message);

    $('<button />', {
        class: 'btn-close',
        type: 'button',
        'data-bs-dismiss': 'alert',
        'aria-label': 'Close'
    }).appendTo(divFlash);

    $('.div-flash-alert').append(divFlash);
}

function showModalDialog(modal_id) {
    const modal_div = document.getElementById(modal_id);
    let modal = bootstrap.Modal.getOrCreateInstance(modal_div, {});
    modal.show();
}

function hideModalDialog(modal_id) {
    const this_modal = document.getElementById(modal_id);
    let modal = bootstrap.Modal.getInstance(this_modal);
    if (modal !== null) {
        modal.hide();
    }
}

function disposeModalDialog(modal_id) {
    const this_modal = document.getElementById(modal_id);
    let modal = bootstrap.Modal.getInstance(this_modal);
    if (modal !== null) {
        modal.dispose();
    }
}

function expandModalCharts(container, callback_chart, time_res = null, plotElementSuffix = '', colorsModule = undefined, axisKindResolver = null, caseKeyResolver = null, disallowedTickUnits = []) {
    const divChart = $(`#modal-chart-${container}`);
    divChart.empty();
    const contChart = `container-chart-${container}`;
    $('<div>').attr('id', contChart)
        .addClass('modal-expand-charts-plotly')
        .appendTo(divChart);

// create the chart settings button
    enablePlotlyChartSettings(container, `${contChart}${plotElementSuffix}`, undefined, colorsModule, axisKindResolver, caseKeyResolver, disallowedTickUnits);

    const modalEl = document.getElementById(`modal-expand-${container}`);
    const drawChart = () => {
        if (typeof callback_chart === 'function') {
            if (time_res === null) {
                callback_chart(contChart);
            } else {
                callback_chart(contChart, time_res);
            }
        }
    };

    if (modalEl && modalEl.classList.contains('show')) {
        setTimeout(drawChart, 150);
    } else if (modalEl) {
        $(modalEl).one('shown.bs.modal', () => {
            setTimeout(drawChart, 50);
        });
    } else {
        setTimeout(drawChart, 150);
    }
}

// dialog tag
function showBoxDialog(dialog_id) {
    const this_dialog = document.getElementById(dialog_id);
    this_dialog.showModal();
}

function hideBoxDialog(dialog_id) {
    const this_dialog = document.getElementById(dialog_id);
    this_dialog.close();
}

// dialog div
function setBoxDialog(dialog_id, open_id, callback = null) {
    $(`#${open_id}`)
        .off('click.boxDialog')
        .on('click.boxDialog', function() {
            $(`#${dialog_id}`).fadeIn(200);
        });

    $(`#${dialog_id}-close-1, #${dialog_id}-close-2`)
        .off('click.boxDialog')
        .on('click.boxDialog', function() {
            $(`#${dialog_id}`).fadeOut(200);
            if (callback !== null) {
                callback();
            }
        });
}

function displayAjaxError(jqXHR, textStatus, errorThrown) {
    flashMessage(`${textStatus}: ${errorThrown}`, 'error');
    var win = window.open();
    $(win.document.body).html(jqXHR.responseText);
}

function ajaxLeafletMap(
    endpoint, query, callback, options, map,
    cacheStatusEndpoint = null
) {
    const spin_opts = spinnerMapOptions();
    return $.ajax({
        type: 'POST',
        url: endpoint,
        dataType: 'json',
        data: JSON.stringify(query),
        contentType: 'application/json',
        success: (json) => {
            if (json.status !== 0) {
                flashMessage(json.message, 'error');
                return false;
            }
            json.data._maproom = getThisMaproom();
            json.data._endpoint = endpoint;
            json.data._pathname = window.location.pathname;
            maproomDB.clearData('leaflet_map');
            maproomDB.saveData('leaflet_map', json.data);

            callback(json.data, options, map);
        },
        beforeSend: () => {
            if (cacheStatusEndpoint !== null) {
                $.ajax({
                    type: 'POST',
                    url: cacheStatusEndpoint,
                    dataType: 'json',
                    data: JSON.stringify(query),
                    contentType: 'application/json',
                    success: (status) => {
                        if (status.status === 0 && !status.cached) {
                            flashMessage(
                                'Processing may take some time. ' +
                                'Please do not refresh or close your browser ' +
                                'while it is in progress.',
                                'warning'
                            );
                        }
                    }
                });
            }
            map.closePopup();
            map.spin(true, spin_opts);
        },
        error: (xhr, s, e) => {
            displayAjaxError(xhr, s, e);
        }
    }).always(() => {
        map.spin(false);
    });
}

function ajaxGetSubdivisions() {
    $.getJSON('/map_subdivisions_data', (json) => {
        if (json.status !== 0) {
            flashMessage(json.message, 'error');
            return false;
        }
        ///// maproomDB.clearData('subdiv_be');
        // maproomDB.saveData('subdiv_be', json.data);
        SUBDIV_BE = json.data;
    }).done(() => {
        const k0 = Object.keys(LAYERS.subdivision);
        if (LAYERS.subdivision[k0[0]].style === undefined) {
            addSubdivisionStyles();
        }

        if (MAP_BE !== undefined) {
            displaySubdivisionLayers([LAYERS.subdivision_sel[MAP_BE.maproom]]);
        }
    });
}

function ajaxDisplayChart(endpoint, query, callback, container, storename = null) {
    const spin_opts = spinnerChartOptions();
    let spinner = new Spinner(spin_opts).spin();
    $.ajax({
        type: 'POST',
        url: endpoint,
        dataType: 'json',
        data: JSON.stringify(query),
        contentType: 'application/json',
        success: (json) => {
            if (json.status !== 0) {
                flashMessage(json.message, 'error');
                return false;
            }
            if (storename !== null) {
                maproomDB.clearData(storename);
                maproomDB.saveData(storename, json.data);
            }
            callback(json.data, container);
        },
        beforeSend: () => {
            $(`#${container}`).append(spinner.el);
        },
        error: (xhr, s, e) => {
            displayAjaxError(xhr, s, e);
        }
    }).always(() => {
        spinner.stop();
    });
}

function spinnerMapOptions() {
    // http://spin.js.org/
    return {
        lines: 13,
        length: 38,
        width: 17,
        radius: 45,
        scale: 1,
        corners: 1,
        speed: 1,
        rotate: 0,
        animation: 'spinner-line-fade-quick',
        direction: 1,
        color: '#ffffff',
        fadeColor: 'transparent',
        top: '50%',
        left: '50%',
        shadow: '0 0 1px transparent',
        zIndex: 20000,
        className: 'spinnerMap',
        position: 'absolute',
    };
}

function spinnerChartOptions() {
    // http://spin.js.org/
    return {
        lines: 10,
        length: 9,
        width: 4,
        radius: 10,
        scale: 1.05,
        corners: 1,
        speed: 1,
        rotate: 0,
        animation: 'spinner-line-fade-quick',
        direction: 1,
        color: '#ffffff',
        fadeColor: 'transparent',
        top: '50%',
        left: '50%',
        shadow: '0 0 1px transparent',
        zIndex: 1000,
        className: 'spinnerChart',
        position: 'absolute',
    };
}

function getThisMaproom() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('maproom');
}

function downloadImageSrcPNG(contChart) {
    const img_png = $(`#${contChart}`).find('img').attr('src');
    const downLink = document.createElement('a');
    downLink.href = img_png;
    downLink.download = 'this_image.png';
    document.body.appendChild(downLink);
    downLink.click();
    document.body.removeChild(downLink);
}