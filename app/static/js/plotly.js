var plotly_themecolors = {
    dark: {
        color: '#f8f9fa',
        fontcolor: '#ffffff',
        bgcolor: 'rgba(0, 0, 0, 0.7)',
    },
    light: {
        color: '#6c757d',
        fontcolor: '#000000',
        bgcolor: 'rgba(255, 255, 255, 0.7)',
    }
};

var expand_layout = {
    margin: { t: 10, b: 50, l: 60, r: 20 },
    paper_bgcolor: 'rgba(255, 255, 255, 0)',
    plot_bgcolor: 'rgba(255, 255, 255, 0)',
    xaxis: {
        mirror: true,
        automargin: true,
    },
    yaxis: {
        mirror: true,
    }
};

var preview_layout = {
    margin: { t: 10, b: 30, l: 30, r: 10 },
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    xaxis: {
        mirror: true,
        automargin: true,
        color: plotly_themecolors[localStorage.getItem('theme')].color,
        gridcolor: plotly_themecolors[localStorage.getItem('theme')].color,
    },
    yaxis: {
        mirror: true,
        color: plotly_themecolors[localStorage.getItem('theme')].color,
        gridcolor: plotly_themecolors[localStorage.getItem('theme')].color,
    },
    yaxis2: {
        mirror: true,
        color: plotly_themecolors[localStorage.getItem('theme')].color,
        gridcolor: plotly_themecolors[localStorage.getItem('theme')].color,
    },
};

var plotly_config = {
    responsive: true,
    //// editable title, axis labels
    // editable: true,
    displaylogo: false,
    //// modebar
    displayModeBar: false,
};

var plotly_rangeslider = {
    visible: true,
    thickness: 0.04,
    borderwidth: 1,
    bordercolor: 'gray',
    // bgcolor: 'lightgray',
    bgcolor: 'transparent',
};


function fixRangesliderTitlePosition(gd) {
    const xaxis = gd && gd.layout && gd.layout.xaxis;
    if (!xaxis || !xaxis.rangeslider || !xaxis.rangeslider.visible) {
        return;
    }
    const titleText = xaxis.title && (
        typeof xaxis.title === 'string' ? xaxis.title : xaxis.title.text
    );
    if (!titleText) {
        return;
    }

    const sliderG = gd.querySelector('g.rangeslider-container');
    const titleEl = gd.querySelector('g.g-xtitle text.xtitle');
    if (!sliderG || !titleEl) {
        return;
    }

    const transformMatch = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(
        sliderG.getAttribute('transform') || ''
    );
    if (!transformMatch) {
        return;
    }
    const sliderX = parseFloat(transformMatch[1]);
    const sliderTop = parseFloat(transformMatch[2]);

    const sliderBg = sliderG.querySelector('rect.rangeslider-bg');
    const sliderHeight = sliderBg ? parseFloat(sliderBg.getAttribute('height')) : 0;

    const titleBaseline = parseFloat(titleEl.getAttribute('y'));


    if (!Number.isFinite(titleBaseline) || titleBaseline <= sliderTop) {
        return;
    }

    const fontSize = parseFloat(titleEl.style.fontSize) ||
        (xaxis.title.font && xaxis.title.font.size) ||
        14;
    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;
    // small fixed gap between the title and the slider below it, instead
    // of reusing Plotly's own (much larger) default title standoff
    const gap = 6;

    const newTitleBaseline = sliderTop + ascent;
    titleEl.setAttribute('y', newTitleBaseline);
    sliderG.setAttribute(
        'transform', `translate(${sliderX},${newTitleBaseline + descent + gap})`
    );
}

function setPlotlyColors() {
    const theme = $('html').attr('data-bs-theme');
    const layout = {
        xaxis: {
            color: plotly_themecolors[theme].color,
            gridcolor: plotly_themecolors[theme].color,
            tickfont: {
                color: plotly_themecolors[theme].fontcolor,
            },
        },
        yaxis: {
            color: plotly_themecolors[theme].color,
            gridcolor: plotly_themecolors[theme].color,
            tickfont: {
                color: plotly_themecolors[theme].fontcolor,
            },
        },
        yaxis2: {
            color: plotly_themecolors[theme].color,
            gridcolor: plotly_themecolors[theme].color,
            tickfont: {
                color: plotly_themecolors[theme].fontcolor,
            },
        },
        legend: {
            font: {
                color: plotly_themecolors[theme].fontcolor,
            }
        },
    }

    return layout;
}

function hoverlabelColors(theme) {
    theme = (theme === 'dark') ? 'light' : 'dark';
    return {
        font: {
            color: plotly_themecolors[theme].fontcolor
        },
        bgcolor: plotly_themecolors[theme].bgcolor,
    };
}


function isThemeDefaultFontColor(color) {
    if (typeof color !== 'string') {
        return false;
    }
    const value = color.toLowerCase();
    return Object.keys(plotly_themecolors)
        .some(key => plotly_themecolors[key].fontcolor.toLowerCase() === value);
}

// the color a chart title should actually be drawn in under `theme`
function themeAwareTitleColor(color, theme) {
    return isThemeDefaultFontColor(color) ?
        (plotly_themecolors[theme] || plotly_themecolors.light).fontcolor :
        color;
}

function setPlotlyThemeColors(container) {
    const gd = document.getElementById(container);
    $('#btn-theme-toggle').on('click', () => {
        const theme = $('html').attr('data-bs-theme');

        if ('shapes' in gd.layout) {
            for (let i = 0; i < gd.layout.shapes.length; i++) {
                if ('action' in gd.layout.shapes[i]) {
                    if (gd.layout.shapes[i].action === 'change-color') {
                        if ('line' in gd.layout.shapes[i]) {
                            if ('color' in gd.layout.shapes[i].line) {
                                gd.layout.shapes[i].line.color = plotly_themecolors[theme].color;
                            }
                        }
                    }
                }
            }
        }

        let layout = deepMerge(gd.layout, setPlotlyColors());

        const colors = [];
        Object.keys(plotly_themecolors).forEach(key => {
            colors.push(plotly_themecolors[key].fontcolor);
        });
        const yax_tck_col = gd.layout.yaxis.tickfont.color;
        const eq_yax_tck_col = colors.includes(yax_tck_col);
        if (!eq_yax_tck_col) {
            layout.yaxis.tickfont.color = yax_tck_col;
        }
        const yax_tck_col2 = gd.layout.yaxis2.tickfont.color;
        const eq_yax_tck_col2 = colors.includes(yax_tck_col2);
        if (!eq_yax_tck_col2) {
            layout.yaxis2.tickfont.color = yax_tck_col2;
        }


        // const title_col = gd.layout.title?.font?.color;
        const title_col = gd.layout.title && gd.layout.title.font ?
            gd.layout.title.font.color :
            undefined;

        const title_col_themed = themeAwareTitleColor(title_col, theme);
        if (title_col_themed !== title_col) {
            layout.title = deepMerge(layout.title, {
                font: { color: title_col_themed }
            });
        }

        const theme1 = (theme === 'dark') ? 'light' : 'dark';
        if ('spikecolor' in gd.layout.xaxis) {
            layout.yaxis.spikecolor = plotly_themecolors[theme1].fontcolor;
            layout.yaxis2.spikecolor = plotly_themecolors[theme1].fontcolor;
        }

        if ('hoverlabel' in gd.layout) {
            layout.yaxis.hoverlabel = hoverlabelColors(theme1);
            layout.yaxis2.hoverlabel = hoverlabelColors(theme1);
        }

        Plotly.relayout(gd, layout);
    });
}


function isWhitishColor(color) {
    const hex = plotlyColorInputValue(color, null);
    if (!hex) {
        return false;
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.85;
}

function downloadPlotlyImageJPG(container) {
    var gd = document.getElementById(container);
    const plot_layout = gd.layout;
    const plot_layout_copy = makeCopy(plot_layout);
    var print_layout = {
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
        xaxis: {
            rangeslider: { visible: false },
            rangeselector: { visible: false },
            title: { color: 'black' },
            tickfont: { color: 'black' },
            color: 'black',
            showline: true,
            showgrid: true,
            gridcolor: 'gray',
            gridwidth: 1,
            griddash: 'dot',
            mirror: true,
        },
        yaxis: {
            title: { color: 'black' },
            tickfont: { color: 'black' },
            color: 'black',
            ticks: 'outside',
            ticklen: 8,
            showline: true,
            showgrid: true,
            gridcolor: 'gray',
            gridwidth: 1,
            griddash: 'dot',
            mirror: true,
        },
        yaxis2: {
            title: { color: 'black' },
            tickfont: { color: 'black' },
            color: 'black',
            ticks: 'outside',
            ticklen: 8,
            showline: true,
            showgrid: true,
            gridcolor: 'gray',
            gridwidth: 1,
            griddash: 'dot',
            mirror: true,
        }
    }

    if ('chart_type' in plot_layout) {
        if (plot_layout['chart_type'] === 'telecon-proba') {
            gd.data[3].line.color = 'black';
        }
    }

    if ('print_legend' in plot_layout) {
        print_layout.showlegend = true;
        const len = gd.data.map(x => x.name.length);
        if (Math.max(...len) > 15) {
            print_layout.legend = {
                orientation: 'h',
                xanchor: 'center',
                x: 0.5,
                yanchor: 'top',
                // y: -0.1,
                y: -0.2,
            };
            print_layout.margin = { b: 100 };
        }
    }
    // to make the title not cut off when downloading the image
    if (plot_layout.title && plot_layout.title.text) {
        print_layout.margin = deepMerge(print_layout.margin || {}, { t: 60 });
    }

    // if (isWhitishColor(plot_layout.title?.font?.color)) {
    if (isWhitishColor(
            plot_layout.title && plot_layout.title.font ?
            plot_layout.title.font.color :
            undefined
        )) {
        print_layout.title = { font: { color: 'black' } };
    }
    const legend_color = {
        legend: {
            font: { color: 'black' },
        },
    };
    print_layout = deepMerge(print_layout, legend_color);
    gd.layout = deepMerge(plot_layout, print_layout);

    Plotly.downloadImage(gd, {
            filename: 'this_graph',
            format: 'jpeg',
            // width: 920,
            // height: 450
        })
        .then(function(dataUrl) {

            gd.layout = plot_layout_copy;
        })
        .catch(function(error) {
            const msg = 'Error generating image';
            console.error(msg + ':', error);
            flashMessage(msg, 'error');
        });
}

function addRangeselector(container, ranges, last_date, xaxis_type = 'date') {
    displayRangeselector(container, ranges);
    const range_id = getRangeselectorId(container);
    const button = $(`#${range_id} .rangeselector-btn`);
    button.on('click', function() {
        const range_key = $(this).data('range');
        createRangeselector(container, $(this), range_key, last_date, xaxis_type);
    });

    const eltChart = document.getElementById(container);
    eltChart.on('plotly_relayout', function(event_data) {
        const keys = Object.keys(event_data || {});
        const isFromExternal = keys.some(k => k.startsWith('xaxis.range') || k === 'xaxis.autorange');
        if (!isFromExternal) button.removeClass('active');
    });
}

function getRangeselectorId(container) {
    const modal_body = $(`#${container}`).parent().parent();
    const div_row = modal_body.children().eq(0);
    return div_row.children().eq(0).attr('id');
}

function displayRangeselector(container, ranges) {
    const range_id = getRangeselectorId(container);
    const buttons = $(`#${range_id} button[data-range]`);
    buttons.each(function() {
        const btn = $(this);
        const drg = btn.attr('data-range');
        if (ranges.includes(drg)) {
            btn.show();
        } else {
            btn.hide();
        }
    });
}

function showRangeselector(container, action) {
    const range_id = getRangeselectorId(container);
    const buttons = $(`#${range_id} button[data-range]`);
    buttons.each(function() {
        const btn = $(this);
        if (action) {
            btn.show();
        } else {
            btn.hide();
        }
    });
}


function getPlotlyChartSettingsButtonId(container) {
    return container.replace(/^container-chart-/, '');
}


function toggleChartSettingsButton(container, visible) {
    $(`#plotly-chart-edit-${getPlotlyChartSettingsButtonId(container)}`).toggle(visible);
}

function computeRangeselectorDate(range_key, last_date) {
    const end = new Date(last_date);
    let start = null;

    switch (range_key) {
        case '1M':
            start = new Date(end);
            start.setMonth(end.getMonth() - 1);
            break;
        case '3M':
            start = new Date(end);
            start.setMonth(end.getMonth() - 3);
            break;
        case '6M':
            start = new Date(end);
            start.setMonth(end.getMonth() - 6);
            break;
        case 'YTD':
            start = new Date(end.getFullYear(), 0, 1);
            break;
        case '1Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 1);
            break;
        case '5Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 5);
            break;
        case '10Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 10);
            break;
        case '15Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 15);
            break;
        case '20Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 20);
            break;
        case '25Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 25);
            break;
        case '30Y':
            start = new Date(end);
            start.setFullYear(end.getFullYear() - 30);
            break;
        default:
            start = null;
            break;
    }
    return start;
}

function computeRangeselectorYear(range_key, last_year) {
    let start = null;
    switch (range_key) {
        case '5Y':
            start = last_year - 5;
            break;
        case '10Y':
            start = last_year - 10;
            break;
        case '15Y':
            start = last_year - 15;
            break;
        case '20Y':
            start = last_year - 20;
            break;
        case '25Y':
            start = last_year - 25;
            break;
        case '30Y':
            start = last_year - 30;
            break;
        default:
            start = null;
            break;
    }
    return start;
}

function createRangeselector(container, button, range_key, last_date, xaxis_type) {
    const range_id = getRangeselectorId(container);
    const this_button = $(`#${range_id} .rangeselector-btn`);
    this_button.removeClass('active');
    button.addClass('active');

    let start;
    if (xaxis_type === 'date') {
        start = computeRangeselectorDate(range_key, last_date);
    } else if (xaxis_type === 'year') {
        start = computeRangeselectorYear(range_key, last_date);
    } else {
        start = null;
    }

    if (!start) {
        Plotly.relayout(container, {
            'xaxis.autorange': true,
            'xaxis.range': null
        });
    } else {
        let xaxis_range;
        if (xaxis_type === 'date') {
            xaxis_range = [start.toISOString(), last_date.toISOString()]
        } else if (xaxis_type === 'year') {
            xaxis_range = [start, last_date];
        } else {
            xaxis_range = null;
        }
        Plotly.relayout(container, {
            'xaxis.autorange': false,
            'xaxis.range': xaxis_range
        });
    }
}

function setPlotlyLanguage() {
    const ils = LANG_USER.list.map(l => l.code).indexOf(LANG_USER.code);
    const localeS = LANG_USER.list[ils].locale;
    Plotly.setPlotConfig({ locale: localeS });
}

function purgePlotlyChart(containerID) {
    const gd = document.getElementById(containerID);
    if (gd && gd.data) {
        Plotly.purge(gd);
    }
}

function purgePlotlyChartExpandModal(expandID) {
    const modalExpID = $(`#modal-expand-${expandID}`);
    const chartID = `container-chart-${expandID}`
    modalExpID.on('hidden.bs.modal', function() {
        purgePlotlyChart(chartID);
    });
}

function xaxisPlotlyLabelYears(time) {
    const nYears = new Set(
        time.map(d => new Date(d).getFullYear())
    ).size;
    // every year
    let dtick = 'M12';
    // every 2 years
    if (nYears > 10) {
        dtick = 'M24';
    }
    // every 5 years
    if (nYears > 20) {
        dtick = 'M60';
    }
    // every 10 years
    if (nYears > 60) {
        dtick = 'M120';
    }

    return dtick;
}


function getDailySeasonRange(date, seas_daily) {
    const yrm = date.getFullYear();
    let days = seas_daily.split('_').map(d => d.split('-'));
    const eqYear = days[0][0] === days[1][0];
    days[0][0] = String(yrm);
    days[1][0] = String(yrm);

    if (!eqYear) {
        const t1 = new Date(days[0].join('-'));
        const t2 = new Date(days[1].join('-'));
        const df1 = getDaysDifference(t1, date);
        const df2 = getDaysDifference(t2, date);
        if (df1 > df2) {
            days[0][0] = String(yrm - 1);
        } else {
            days[1][0] = String(yrm + 1);
        }
    }

    return {
        start: new Date(days[0].join('-')),
        end: new Date(days[1].join('-')),
        startParts: days[0],
        endParts: days[1]
    };
}

function formatPlotlyHoverDate(
    time, time_res,
    seas_len = null,
    seas_daily = null
) {
    const ils = LANG_USER.list.map(l => l.code)
        .indexOf(LANG_USER.code);
    const localeS = LANG_USER.list[ils].locale;
    const date = new Date(time);

    if (time_res === 'monthly') {
        const month = date.toLocaleString(
            localeS, { month: 'long' }
        );
        const year = date.getFullYear();
        return `${month} ${year}`;
    } else if (time_res === 'dekadal') {
        const mon = date.toLocaleString(
            localeS, { month: 'long' }
        );
        const dyr = date.getFullYear();
        const day = date.getDate();
        const dk = day <= 10 ? 1 : (day >= 21 ? 3 : 2);
        return `dekad-${dk} ${mon} ${dyr}`;
    } else if (time_res === 'seasonal') {
        const seas = getSeasonFromDate(date, seas_len);
        const mo1 = seas.start.toLocaleString(
            localeS, { month: 'short' }
        );
        const yr1 = seas.start.getFullYear();
        const mo2 = seas.end.toLocaleString(
            localeS, { month: 'short' }
        );
        const yr2 = seas.end.getFullYear();

        return `${mo1} ${yr1} - ${mo2} ${yr2}`;
    } else if (time_res === 'daily') {
        const { start: dt1, end: dt2, startParts, endParts } =
        getDailySeasonRange(date, seas_daily);
        const m1 = dt1.toLocaleString(
            localeS, { month: 'short' }
        );

        const m2 = dt2.toLocaleString(
            localeS, { month: 'short' }
        );

        const s = `${startParts[2]} ${m1} ${startParts[0]}`;
        const e = `${endParts[2]} ${m2} ${endParts[0]}`;
        return `${s} - ${e}`;
    } else if (time_res === 'weekly') {
        const weekr = getWeekRange(date);
        const ws = new Date(weekr.start);
        const mw = ws.toLocaleString(
            localeS, { month: 'long' }
        );
        const yw = ws.getFullYear();
        const dw = ws.getDate();
        return `${JS_TEXT.week_prefix} ${dw} ${mw} ${yw}`;
    }

    return '';
}

function formatPlotlyHoverDateEnso(
    time, time_list, year_list, seas_list
) {
    const it = time_list.indexOf(time);
    if (it === -1) {
        return '';
    } else {
        return `${seas_list[it]} ${year_list[it]}`;
    }
}

function formatPlotlyHoverDateRainySeason(
    time, time_list, ydata_list, start_list, var_info
) {
    const it = time_list.indexOf(time);
    if (it === -1) {
        return '';
    } else {
        const y = ydata_list[it];
        const txt = `Rainy season: ${time}<br>${var_info.name}`;
        if (var_info.type === 'length') {
            return `${txt}: ${parseInt(y, 10)} ${var_info.units}`
        } else {
            const s = start_list[it];
            const d = new Date(s);
            d.setDate(d.getDate() + y);
            const r = d.toLocaleDateString(
                LANG_USER.selected.locale, {
                    month: 'long',
                    day: '2-digit',
                    year: 'numeric'
                }
            );
            return `${txt}: ${r}`
        }
    }
}

function formatTickTextRainySeason(
    tickvals, start, var_info
) {
    if (var_info.type === 'length') {
        return tickvals;
    }

    const [year, month, day] = start.split('-').map(Number);
    return tickvals.map(n => {
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + n);

        return date.toLocaleDateString(
            LANG_USER.selected.locale, {
                month: 'short',
                day: '2-digit'
            }).replace(' ', '-');
    });
}

function getDaysDifference(date1, date2) {
    const timeDiff = Math.abs(date2 - date1);
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    return daysDiff;
}

function createTicksMinor(tickvals) {
    const x = tickvals.slice(0, -1)
        .map((v, i) => v + (tickvals[i + 1] - v) / 2);
    const dx = x[1] - x[0];
    const xlow = Math.min(...tickvals) - dx / 2;
    const xup = Math.max(...tickvals) + dx / 2;
    const xTicks = [xlow, ...x, xup];
    return xTicks;
}


function getChartWidth(container) {
    const divCont = $(`#${container}`);
    const containerWidth = divCont.width();
    const parentWidth = divCont.parent().width();
    return Math.floor(containerWidth || parentWidth || window.innerWidth * 0.8);
}

function getChartHeight(container) {
    const divCont = $(`#${container}`);
    const containerHeight = divCont.height();
    const parentHeight = divCont.parent().height();
    return Math.floor(containerHeight || parentHeight || window.innerHeight * 0.6);
}

function resizePlotlyChart(container) {
    const resizeChart = () => {
        const gd = document.getElementById(container);
        if (!gd) return;
        Plotly.relayout(gd, {
            width: getChartWidth(container),
            height: getChartHeight(container)
        });
        Plotly.Plots.resize(gd);
    };

    let resizeTimer;
    const resizeNamespace = container.replace(/[^a-zA-Z0-9]/g, '');
    $(window)
        .off(`resize.plotlyChart${resizeNamespace}`)
        .on(`resize.plotlyChart${resizeNamespace}`, function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resizeChart, 100);
        });

    $(`#${container}`).closest('.modal')
        .off(`hidden.bs.modal.plotlyChart${resizeNamespace}`)
        .on(`hidden.bs.modal.plotlyChart${resizeNamespace}`, function() {
            $(window).off(`resize.plotlyChart${resizeNamespace}`);
        });
}