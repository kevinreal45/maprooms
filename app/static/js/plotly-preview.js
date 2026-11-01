function preview_analysis_display_charts(tempRes) {
    preview_analysis_charts_rawdata(tempRes, 'div-chart-raw');
    preview_analysis_charts_climato(tempRes, 'div-chart-clim');
    preview_analysis_charts_anomaly(tempRes, 'div-chart-anom');
}

function preview_seasonal_display_charts(tempRes) {
    setTimeout(() => {
        preview_analysis_charts_season(tempRes, 'div-chart-season');
        preview_analysis_charts_proba(tempRes, 'div-chart-proba');
        preview_analysis_charts_anomaly(tempRes, 'div-chart-anom');
    }, 100);
}

function preview_seasonal_teleconnections(tempRes) {
    preview_analysis_telecon_tseries(tempRes, 'div-chart-tseries');
    preview_analysis_telecon_proba(tempRes, 'div-chart-proba');
}

function preview_rainyseason_display_charts(tempRes) {
    preview_rainyseason_charts_series(tempRes, 'div-chart-series');
    preview_rainyseason_charts_proba(tempRes, 'div-chart-proba');
    preview_rainyseason_charts_anom(tempRes, 'div-chart-anom');
}

function preview_cropsuitability_display_charts(tempRes) {
    preview_cropsuitability_charts_series(tempRes, 'div-chart-cropsuit');
}

function preview_monitoring_display_charts(tempRes) {
    preview_analysis_charts_rawdata(tempRes, 'div-chart-raw');
    preview_analysis_charts_cumul(tempRes, 'div-chart-cumul');
    preview_analysis_charts_anomaly(tempRes, 'div-chart-anom');
}

function preview_monitoring_display_charts_1(tempRes) {
    // preview_analysis_charts_spei_ts(tempRes, 'div-chart-spei');
    preview_monitoring_charts_spei_dial(tempRes, 'div-chart-spei')
    preview_analysis_charts_rawdata(tempRes, 'div-chart-raw');
    preview_analysis_charts_anomaly(tempRes, 'div-chart-anom');
}

function preview_drmExt_display_charts(tempRes) {
    preview_drm_charts_cdf(tempRes, 'div-chart-cdf');
    preview_drm_charts_pdf(tempRes, 'div-chart-pdf');
}

function preview_drmSpi_display_charts(tempRes) {
    preview_drm_charts_spi(tempRes, 'div-chart-spi');
}

function preview_projection_display_charts(tempRes) {
    preview_projection_charts_series(
        tempRes,
        'div-chart-seasonal-proj'
    );

    preview_projection_charts_pdf(
        tempRes,
        'div-chart-distribution-proj'
    );
}

function preview_seasfcst_display_charts(tempRes) {
    preview_seasfcst_charts_proba(tempRes, ['div-chart-cdf', 'div-chart-pdf']);
    preview_seasfcst_charts_ter(tempRes, 'div-chart-ter');
}

///////////////////

function analysis_query_format_date(date, temp_res) {
    if (temp_res === 'monthly') {
        const arr_mo = date.split('-');
        return arr_mo.slice(0, 2).join('-');
    } else if (temp_res === 'dekadal') {
        return formatDekadDate(date);
    } else if (temp_res === 'seasonal') {
        return date.slice(0, 4);
    } else if (temp_res === 'daily') {
        return date.slice(0, 4);
    } else {
        return false;
    }
}

function preview_analysis_query_temporal(
    dataset, temp_res, variable, nb_year
) {
    let query = new Object();

    const date = getTemporalRangeCalendar(
        dataset, temp_res, variable, nb_year
    );
    query.startDate = analysis_query_format_date(
        date.start, temp_res
    );
    query.endDate = analysis_query_format_date(
        date.end, temp_res
    );

    return query;
}

///////////////////

function preview_analysis_query_anomaly(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${tempRes}-map-variable`).val();
    if (URL_ARGS.component === 'monitoring') {
        query.variable = DATA_SET.variables[query.map_variable][0];
    } else {
        query.variable = query.map_variable;
    }

    query.anomaly = 'difference';
    query.startYear = BASE_PERIOD.start_year;
    query.endYear = BASE_PERIOD.end_year;
    query.minYear = BASE_PERIOD.min_year;

    let ts_len = 10;
    const tstepId = `${tempRes}-map-date`;
    if (tempRes === 'seasonal') {
        query.seasLength = parseInt($(`#${tstepId}-length`).val(), 10);
        const map_type = $(`#${tempRes}-map-type`).val();
        const seas_start = $(`#${tstepId}-calendar`).val();
        if (map_type === 'climatology') {
            query.seasStart = parseInt(seas_start, 10);
        } else {
            query.seasStart = parseInt(seas_start.slice(5, 7), 10);
            if (['spi_seas', 'spei_seas'].includes(query.map_variable)) {
                query.seasStart = query.seasStart - query.seasLength + 1;
            }
        }
        if (URL_ARGS.component === 'monitoring') {
            query.fullYearTS = false;
            ts_len = 30;
        } else {
            query.fullYearTS = true;
        }
        query.dailyAnalysis = false;
    }

    // 
    if (query.temporalRes === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;
        ts_len = 30;

        query.startMonth = parseInt($(`#${tstepId}-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tstepId}-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tstepId}-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tstepId}-end-day`).val(), 10);

        query.seasParams = $(`#${tempRes}-map-parameters`).val();
        query.defThres = Number($(`#${tempRes}-map-def-number-thres-val`).val().trim());
        if (query.variable === 'rainfall') {
            query.defSpell = parseInt($(`#${tempRes}-map-def-spell-thres-val`).val().trim(), 10);
        } else {
            query.defTempBase = Number($(`#${tempRes}-map-def-spell-thres-val`).val().trim());
        }
    }

    const dates = preview_analysis_query_temporal(
        query.dataset, tempRes, query.map_variable, ts_len
    );

    // check if seasParams has not set yet
    if (query.temporalRes === 'daily') {
        const list_pars = PARAMS_ORDER[query.variable];
        if (!list_pars.includes(query.seasParams)) {
            query.seasParams = list_pars[0];
        }
    }

    return Object.assign({}, query, dates);
}

function preview_analysis_charts_anomaly(tempRes, contID) {
    const query = preview_analysis_query_anomaly(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_anomaly',
        query,
        preview_analysis_display_anomaly,
        contID
    );
}

function preview_analysis_display_anomaly(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xaxisHoverText = json.time.map((t) => {
        return formatPlotlyHoverDate(
            t, json.info.time_res,
            json.info.seas_len,
            json.info.seas_daily
        );
    });

    if (json.info.var.type === 'precip') {
        var defColors = {
            negative: '#fd7e14',
            positive: '#198754',
            other: '#6c757d'
        }
    } else {
        var defColors = {
            negative: '#0d6efd',
            positive: '#dc3545',
            other: '#6c757d'
        }
    }

    const barColors = json.values.map(value => {
        if (value > 0) {
            return defColors.positive;
        } else if (value < 0) {
            return defColors.negative;
        } else {
            return defColors.other;
        }
    });

    const data = [{
        x: json.time,
        y: json.values,
        name: json.info.var.name,
        units: json.info.var.units,
        type: 'bar',
        marker: {
            color: barColors,
            line: {
                width: 0
            }
        },
        customdata: xaxisHoverText,
        hovertemplate: 'Date: %{customdata}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        // hovertemplate: 'Date: %{x|%B %Y}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
    }];

    var layout = {
        xaxis: {
            type: 'date',
            tickformat: '%Y',
            tickangle: 0,
            dtick: xaxisPlotlyLabelYears(json.time),
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
        },
    };

    layout = deepMerge(setPlotlyColors(), layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        deepMerge(preview_layout, layout),
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_analysis_query_rawdata(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${tempRes}-map-variable`).val();
    if (URL_ARGS.component === 'monitoring') {
        query.variable = DATA_SET.variables[query.map_variable][0];
    } else {
        query.variable = query.map_variable;
    }

    let trange = 5;
    if (tempRes === 'seasonal') {
        const seas_start = $(`#${tempRes}-map-date-calendar`).val();
        query.seasStart = parseInt(seas_start.slice(5, 7), 10);
        query.seasLength = parseInt($(`#${tempRes}-map-date-length`).val(), 10);
        query.fullYearTS = false;
        trange = 30;
    }

    const dates = preview_analysis_query_temporal(
        query.dataset, tempRes, query.map_variable, trange
    );


    return Object.assign({}, query, dates);
}

function preview_analysis_charts_rawdata(tempRes, contID) {
    const query = preview_analysis_query_rawdata(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_rawdata',
        query,
        preview_analysis_display_rawdata,
        contID
    );
}

function preview_analysis_display_rawdata(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xaxisHoverText = json.time.map((t) => {
        return formatPlotlyHoverDate(
            t, json.info.time_res,
            json.info.seas_len
        );
    });

    const var_precip = json.info.var.type === 'precip';
    const data = [{
        x: json.time,
        y: json.values,
        name: json.info.var.name,
        units: json.info.var.units,
        type: var_precip ? 'bar' : 'scatter',
        mode: 'lines',
        line: { color: '#17becf' },
        marker: { color: '#fc03fc' },
        customdata: xaxisHoverText,
        hovertemplate: 'Date: %{customdata}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        // hovertemplate: 'Date: %{x|%B %Y}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
    }];

    var common_layout = {
        xaxis: {
            type: 'date',
            // tickformat: '%b %Y',
            // dtick: 'M6',
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
        }
    };

    if (var_precip) {
        var layout = {
            // margin: { b: 50 },
            xaxis: {
                showline: true,
                showgrid: false,
            },
            yaxis: {
                showgrid: true,
                griddash: 'dot',
                // tickfont: { color: '#fc03fc' }
            },
            shapes: [{
                action: 'change-color',
                type: 'rect',
                xref: 'paper',
                yref: 'paper',
                x0: 0,
                y0: 0,
                x1: 1,
                y1: 1,
                line: {
                    color: plotly_themecolors[localStorage.getItem('theme')].color,
                    width: 0.8,
                    dash: 'solid'
                },
                layer: 'below',
            }]
        };
    } else {
        var layout = {
            xaxis: {
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
            },
            yaxis: {
                tickfont: { color: '#17becf' },
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
            }
        };
    }

    layout = deepMerge(common_layout, layout);
    layout = deepMerge(setPlotlyColors(), layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        deepMerge(preview_layout, layout),
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_analysis_query_climato(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = 'one';
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-map-variable`).val();
    query.startYear = BASE_PERIOD.start_year;
    query.endYear = BASE_PERIOD.end_year;
    query.minYear = BASE_PERIOD.min_year;

    return query;
}

function preview_analysis_charts_climato(tempRes, contID) {
    const query = preview_analysis_query_climato(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_climato',
        query,
        preview_analysis_display_climato,
        contID
    );
}

function preview_analysis_display_climato(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    ////
    let xaxis_hoverformat;
    if (json.info.time_res === 'monthly') {
        xaxis_hoverformat = json.info.var.name +
            ': ' + '%B';
    } else if (json.info.time_res === 'dekadal') {
        xaxis_hoverformat = json.info.var.name +
            ': ' + 'Dekad ' + '%m-%d';
    } else {
        return false;
    }

    ////
    const data = [{
            x: json.time,
            y: json.values[0],
            name: 'Mean',
            units: json.info.var.units,
            type: 'bar',
            marker: { color: 'gray' },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.time,
            y: json.values[1],
            name: '5th %-ile',
            units: json.info.var.units,
            type: 'scatter',
            mode: 'lines',
            line: {
                width: 3,
                color: 'green'
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.time,
            y: json.values[2],
            name: '50th %-ile',
            units: json.info.var.units,
            type: 'scatter',
            mode: 'lines',
            line: {
                width: 3,
                color: 'blue'
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.time,
            y: json.values[3],
            name: '95th %-ile',
            units: json.info.var.units,
            type: 'scatter',
            mode: 'lines',
            line: {
                width: 3,
                color: 'red'
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
    ];

    const theme = $('html').attr('data-bs-theme');

    var layout = {
        xaxis: {
            type: 'date',
            fixedrange: true,
            tickformat: '%b',
            dtick: 'M1',
            ticklabelmode: 'period',
            tickangle: -45,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            hoverformat: xaxis_hoverformat,
            showspikes: true,
            spikemode: 'across',
            spikecolor: plotly_themecolors[theme].fontcolor,
            spikethickness: 2,
            spikedash: 'solid',
            spikesnap: 'cursor',
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme),
    };

    layout = deepMerge(setPlotlyColors(), layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        deepMerge(preview_layout, layout),
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_analysis_query_proba(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = 'proba';
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-map-variable`).val();

    const tstepId = `${tempRes}-map-date`;
    if (tempRes === 'seasonal') {
        const map_type = $(`#${tempRes}-map-type`).val();
        const seas_start = $(`#${tstepId}-calendar`).val();
        if (map_type === 'climatology') {
            query.seasStart = parseInt(seas_start, 10);
        } else {
            query.seasStart = parseInt(seas_start.slice(5, 7), 10);
        }
        query.seasLength = parseInt($(`#${tstepId}-length`).val(), 10);
        query.fullYearTS = false;
        query.dailyAnalysis = false;
    }

    // 
    if (query.temporalRes === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;

        query.startMonth = parseInt($(`#${tstepId}-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tstepId}-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tstepId}-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tstepId}-end-day`).val(), 10);

        query.seasParams = $(`#${tempRes}-map-parameters`).val();
        query.defThres = Number($(`#${tempRes}-map-def-number-thres-val`).val().trim());
        if (query.variable === 'rainfall') {
            query.defSpell = parseInt($(`#${tempRes}-map-def-spell-thres-val`).val().trim(), 10);
        } else {
            query.defTempBase = Number($(`#${tempRes}-map-def-spell-thres-val`).val().trim());
        }
    }

    const dates = preview_analysis_query_temporal(
        query.dataset, tempRes, query.variable, 30
    );

    // check if seasParams has not set yet
    if (query.temporalRes === 'daily') {
        const list_pars = PARAMS_ORDER[query.variable];
        if (!list_pars.includes(query.seasParams)) {
            query.seasParams = list_pars[0];
        }
    }

    return Object.assign({}, query, dates);
}

function preview_analysis_charts_proba(tempRes, contID) {
    const query = preview_analysis_query_proba(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_proba',
        query,
        preview_analysis_display_proba,
        contID
    );
}

function preview_analysis_display_proba(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    ////
    const data = [{
            x: json.cdf.smoothed.x,
            y: json.cdf.smoothed.y,
            mode: 'lines',
            name: 'Smoothed CDF',
            units: '%',
            line: {
                color: '#1e90ff',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.cdf.empirical.x,
            y: json.cdf.empirical.y,
            mode: 'lines+markers',
            name: 'Empirical CDF',
            units: '%',
            line: {
                color: 'red',
                width: 3
            },
            marker: {
                color: 'orange',
                line: {
                    color: 'red',
                    width: 1
                },
                size: 6
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: json.xrange,
            tickvals: json.xticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                tickvals: createTicksMinor(json.xticks),
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: json.info.var.name +
                    ': %{x:.2f} ' +
                    json.info.var.units
            }
        },
        yaxis: {
            range: [0, 100],
            ticksuffix: '%',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_analysis_query_season(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = 'season';
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${tempRes}-map-variable`).val();
    if (URL_ARGS.component === 'monitoring') {
        query.variable = DATA_SET.variables[query.map_variable][0];
    } else {
        query.variable = query.map_variable;
    }

    const tstepId = `${tempRes}-map-date`;
    if (tempRes === 'seasonal') {
        const map_type = $(`#${tempRes}-map-type`).val();
        const seas_start = $(`#${tstepId}-calendar`).val();
        if (map_type === 'climatology') {
            query.seasStart = parseInt(seas_start, 10);
        } else {
            query.seasStart = parseInt(seas_start.slice(5, 7), 10);
        }
        query.seasLength = parseInt($(`#${tstepId}-length`).val(), 10);
        query.fullYearTS = false;
        query.dailyAnalysis = false;
    }

    // 
    if (query.temporalRes === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;

        query.startMonth = parseInt($(`#${tstepId}-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tstepId}-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tstepId}-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tstepId}-end-day`).val(), 10);

        query.seasParams = $(`#${tempRes}-map-parameters`).val();
        query.defThres = Number($(`#${tempRes}-map-def-number-thres-val`).val().trim());
        if (query.variable === 'rainfall') {
            query.defSpell = parseInt($(`#${tempRes}-map-def-spell-thres-val`).val().trim(), 10);
        } else {
            query.defTempBase = Number($(`#${tempRes}-map-def-spell-thres-val`).val().trim());
        }
    }

    const dates = preview_analysis_query_temporal(
        query.dataset, tempRes, query.map_variable, 30
    );

    // check if seasParams has not set yet
    if (query.temporalRes === 'daily') {
        const list_pars = PARAMS_ORDER[query.variable];
        if (!list_pars.includes(query.seasParams)) {
            query.seasParams = list_pars[0];
        }
    }

    return Object.assign({}, query, dates);
}

function preview_analysis_charts_season(tempRes, contID) {
    const query = preview_analysis_query_season(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_season',
        query,
        preview_analysis_display_season,
        contID
    );
}

function preview_analysis_display_season(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xdata = json.time;
    const ydata = json.values;
    const vname = json.info.var.name;
    const vunit = json.info.var.units;
    const xlim = [
        Math.min(...xdata) - 1,
        Math.max(...xdata) + 1
    ];

    // Regression line
    const regX = xlim;
    const areg = json.coeffs.slope;
    const breg = json.coeffs.intercept;
    const regY = regX.map(x => breg + areg * x);

    const data = [{
            x: xdata,
            y: ydata,
            type: 'scatter',
            mode: 'lines',
            name: vname,
            units: vunit,
            line: {
                color: '#dc3545',
                width: 3
            },
            hovertemplate: 'Year: %{x}<br>' +
                `%{data.name}: %{y:.2f} %{data.units} <extra></extra>`
        },
        {
            x: regX,
            y: regY,
            type: 'scatter',
            mode: 'lines',
            name: 'Trend line',
            units: vunit,
            line: {
                color: '#0d6efd',
                width: 4
            }
        }
    ];

    var layout = {
        xaxis: {
            range: xlim,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray'
        },
        showlegend: false
    };

    layout.margin = { t: 10, b: 30, l: 40, r: 10 };
    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_analysis_enso_alert(tempRes, contID) {
    let query = new Object();
    query.theme = $('html').attr('data-bs-theme');
    // query.sstProduct = 'ersstv5_cpc';
    query.sstProduct = 'ersstv6_ncei';
    ajaxDisplayChart(
        '/climate_analysis_enso_alert',
        query,
        preview_analysis_display_enso_alert,
        contID
    );
}

function preview_analysis_display_enso_alert(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const img = $('<img>', {
        id: 'enso-alert-system',
        src: json.png
    }).appendTo(divCont);

    img.css({
        'width': '100%',
        'height': '100%',
        'object-fit': 'cover'
    });
}

///////

function preview_analysis_query_telecon(tempRes, cType) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = `telecon-${cType}`;
    query.temporalRes = tempRes;
    query.minFrac = 0.95;

    query.variable = $(`#${tempRes}-map-variable`).val();
    query.climVariable = $(`#${tempRes}-map-clim-variable`).val();

    query.dataset = DATA_SET.use;
    query.inputData = DATA_SET.timeres;

    query.teleconIndex = $(`#${tempRes}-tercile-analysis`).val();

    const dates = preview_analysis_query_temporal(
        query.dataset, tempRes, query.variable, 30
    );
    query.startYear = parseInt(dates.startDate, 10);
    query.endYear = parseInt(dates.endDate, 10);

    query.seasStart = parseInt($(`#${tempRes}-map-date-calendar`).val(), 10);
    query.seasLength = parseInt($(`#${tempRes}-map-date-length`).val(), 10);

    // query.timeSeries = true;

    return query;
}

function preview_analysis_telecon_tseries(tempRes, contID) {
    const query = preview_analysis_query_telecon(tempRes, 'tseries');
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_telecon_ts',
        query,
        preview_telecon_display_tseries,
        contID
    );
}

function preview_telecon_display_tseries(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const barcol = ['blue', 'gray', 'red'];
    const barColors = json.classes.map(c => barcol[c]);
    const xdata = json.time;
    const ydata = json.values;
    const xlim_terc = [Math.min(...xdata) - 1, Math.max(...xdata) + 1];
    const xlim_data = [Math.min(...xdata) - 0.5, Math.max(...xdata) + 0.5];
    const xticks = Math.ceil(Math.min(...xdata) / 5) * 5;

    const data = [{
            x: xdata,
            y: ydata,
            name: json.info.var.name,
            units: json.info.var.units,
            type: 'bar',
            marker: {
                color: barColors
            },
            width: 0.7,
            hovertemplate: 'Year: %{x}<br>' +
                `%{data.name}: %{y:.2f} %{data.units} <extra></extra>`
        },
        {
            x: xlim_terc,
            y: [json.terciles[0], json.terciles[0]],
            type: 'scatter',
            mode: 'lines',
            name: 'Tercile 1',
            line: {
                color: 'purple',
                width: 4
            },
            hovertemplate: `Tercile 1: %{y:.1f}<extra></extra>`
        },
        {
            x: xlim_terc,
            y: [json.terciles[1], json.terciles[1]],
            type: 'scatter',
            mode: 'lines',
            name: 'Tercile 2',
            line: {
                color: 'green',
                width: 4
            },
            hovertemplate: `Tercile 2: %{y:.1f}<extra></extra>`
        }
    ];

    var layout = {
        xaxis: {
            range: xlim_data,
            tickmode: 'linear',
            dtick: 5,
            tick0: xticks,
            showgrid: false,
            showline: true,
            linecolor: plotly_themecolors[theme].fontcolor
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            tickformat: '.1f',
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray',
            showline: true,
            linecolor: plotly_themecolors[theme].fontcolor
        },
        showlegend: false
    };

    layout.margin = { t: 10, b: 30, l: 50, r: 10 };
    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(container, data, layout, config);
    setPlotlyThemeColors(container);

    $('#btn-theme-toggle').on('click', () => {
        const thm = $('html').attr('data-bs-theme');
        const update = {
            'xaxis.linecolor': plotly_themecolors[thm].fontcolor,
            'yaxis.linecolor': plotly_themecolors[thm].fontcolor
        };
        Plotly.relayout(container, update);
    });
}

///////

function preview_analysis_telecon_proba(tempRes, contID) {
    const query = preview_analysis_query_telecon(tempRes, 'proba');
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_telecon_ts',
        query,
        preview_telecon_display_proba,
        contID
    );
}

function preview_telecon_display_proba(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');
    const col_allyears = plotly_themecolors[theme].fontcolor;
    const linecol = ['blue', 'gray', 'red', col_allyears];

    const data = Object.entries(json.values)
        .map(([key, secdf], i) => ({
            x: secdf.x,
            y: secdf.y,
            type: 'scatter',
            mode: 'lines',
            name: json.info.classes[key],
            units: '%',
            line: {
                color: linecol[i],
                width: 3
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }));

    var layout = {
        xaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            tickformat: '.1f',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                tickvals: createTicksMinor(json.yticks),
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: json.info.var.name +
                    ': %{x:.2f} ' +
                    json.info.var.units
            }
        },
        yaxis: {
            range: [0, 100],
            ticksuffix: '%',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(container, data, layout, config);
    setPlotlyThemeColors(container);

    $('#btn-theme-toggle').on('click', () => {
        const gd = document.getElementById(container);
        const thm = $('html').attr('data-bs-theme');
        const update = {
            'line.color': plotly_themecolors[thm].fontcolor
        };
        // Apply update to CDF index 3
        Plotly.restyle(gd, update, [3]);
    });
}

///////

function preview_query_rainyseason(tempRes) {
    let query = new Object();

    query.startMonthO = parseInt($(`#${tempRes}-onset-start-mon`).val(), 10);
    query.startDayO = parseInt($(`#${tempRes}-onset-start-day`).val(), 10);
    query.searchDaysO = parseInt($(`#${tempRes}-onset-search-day`).val(), 10);
    query.rainTotalO = Number($(`#${tempRes}-onset-rain-tot`).val());
    query.numberDaysO = parseInt($(`#${tempRes}-onset-nb-days`).val(), 10);
    query.minNbDaysO = parseInt($(`#${tempRes}-onset-min-day`).val(), 10);
    query.drySpellO = parseInt($(`#${tempRes}-onset-dryspell`).val(), 10);
    query.drySpellDaysO = parseInt($(`#${tempRes}-onset-dryspell-day`).val(), 10);

    query.rainThres = Number($(`#${tempRes}-onset-rainy-day-thres`).val());

    query.startMonthC = parseInt($(`#${tempRes}-cessation-start-mon`).val(), 10);
    query.startDayC = parseInt($(`#${tempRes}-cessation-start-day`).val(), 10);
    query.searchDaysC = parseInt($(`#${tempRes}-cessation-search-day`).val(), 10);
    query.waterBalanceC = Number($(`#${tempRes}-cessation-water-balance`).val());
    query.numberDaysC = parseInt($(`#${tempRes}-cessation-number-day`).val(), 10);

    query.interpolate = false;
    query.minFrac = 0.75;
    query.rmIsolatedPix = false;

    return query;
}

function preview_rainyseason_query(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-map-variable`).val();

    query.rainy_season = preview_query_rainyseason(tempRes);

    return query;
}

///////

function preview_rainyseason_charts_series(tempRes, contID) {
    const query = preview_rainyseason_query(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_series',
        query,
        preview_rainyseason_display_series,
        contID
    );
}

function preview_rainyseason_display_series(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xdata = json.time;
    const ydata = json.values;
    const xlim = [
        Math.min(...xdata) - 1,
        Math.max(...xdata) + 1
    ];
    const yticktext = formatTickTextRainySeason(
        json.yticks, json.start[0], json.info.var
    );

    const xaxisHoverText = xdata.map((x) => {
        return formatPlotlyHoverDateRainySeason(
            x, xdata, ydata, json.start, json.info.var
        );
    });

    let data = [{
        x: xdata,
        y: ydata,
        type: 'scatter',
        mode: 'lines',
        line: {
            color: '#dc3545',
            width: 3
        },
        customdata: xaxisHoverText,
        hovertemplate: '%{customdata}<extra></extra>'
    }];

    if (json.coeffs !== null) {
        const regX = xlim;
        const areg = json.coeffs.slope;
        const breg = json.coeffs.intercept;
        const regY = regX.map(x => breg + areg * x);
        const trendTrace = {
            x: regX,
            y: regY,
            type: 'scatter',
            mode: 'lines',
            name: 'Trend line',
            units: 'days',
            line: {
                color: '#0d6efd',
                width: 4
            }
        };

        if (['onset', 'cessation'].includes(json.info.var.type)) {
            const start = json.start.find(value => value !== null);
            if (start !== undefined) {
                const [, month, day] = start.split('-').map(Number);
                trendTrace.customdata = regX.map((year, index) => {
                    const date = new Date(Date.UTC(year, month - 1, day));
                    date.setUTCDate(date.getUTCDate() + regY[index]);
                    return date;
                });
                trendTrace.hovertemplate =
                    'Trend line (%{x}, %{customdata|%b-%d})' +
                    '<extra></extra>';
            }
        } else if (json.info.var.type === 'length') {
            trendTrace.hovertemplate =
                'Trend line (%{x}, %{y:.0f})<extra></extra>';
        }

        data.push(trendTrace);
    }

    var layout = {
        xaxis: {
            range: xlim,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            ticktext: yticktext,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray'
        },
        showlegend: false
    };

    layout.margin = { t: 10, b: 30, l: 50, r: 10 };
    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_rainyseason_charts_proba(tempRes, contID) {
    const query = preview_rainyseason_query(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_proba',
        query,
        preview_rainyseason_display_proba,
        contID
    );
}

function preview_rainyseason_display_proba(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const xticktext = formatTickTextRainySeason(
        json.xticks, json.start[0], json.info.var
    );
    const isDateVariable = ['onset', 'cessation'].includes(
        json.info.var.type
    );
    let formatX = value => value;
    if (isDateVariable) {
        const [year, month, day] = json.start[0].split('-').map(Number);
        const startTime = Date.UTC(year, month - 1, day);
        formatX = value => new Date(startTime + value * 86400000);
    }

    const data = [{
            x: json.cdf.smoothed.x.map(formatX),
            y: json.cdf.smoothed.y,
            mode: 'lines',
            name: 'Smoothed CDF',
            units: '%',
            line: {
                color: '#1e90ff',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.cdf.empirical.x.map(formatX),
            y: json.cdf.empirical.y,
            mode: 'lines+markers',
            name: 'Empirical CDF',
            units: '%',
            line: {
                color: 'red',
                width: 3
            },
            marker: {
                color: 'orange',
                line: {
                    color: 'red',
                    width: 1
                },
                size: 6
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: json.xrange.map(formatX),
            tickvals: json.xticks.map(formatX),
            ticktext: xticktext,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                tickvals: createTicksMinor(json.xticks).map(formatX),
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: isDateVariable ?
                    json.info.var.name + ': %{x|%b-%d}' : json.info.var.name +
                    ': %{x:.0f} ' + json.info.var.units
            }
        },
        yaxis: {
            range: [0, 100],
            ticksuffix: '%',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;
    layout.margin.b = 40;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_rainyseason_charts_anom(tempRes, contID) {
    const query = preview_rainyseason_query(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_anom',
        query,
        preview_rainyseason_display_anom,
        contID
    );
}

function preview_rainyseason_display_anom(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xlim = [
        Math.min(...json.time) - 1,
        Math.max(...json.time) + 1
    ];

    const defColors = {
        negative: '#fd7e14',
        positive: '#198754',
        other: '#6c757d'
    }

    const barColors = json.values.map(value => {
        if (value > 0) {
            return defColors.positive;
        } else if (value < 0) {
            return defColors.negative;
        } else {
            return defColors.other;
        }
    });

    const data = [{
        x: json.time,
        y: json.values,
        name: json.info.var.name,
        units: json.info.var.units,
        type: 'bar',
        marker: {
            color: barColors,
            line: {
                width: 0
            }
        },
        hovertemplate: 'Rainy season: %{x}<br> %{data.name}: %{y:.0f} %{data.units} <extra></extra>'
    }];

    let layout = {
        xaxis: {
            range: xlim,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
        },
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_cropsuitability_query_series(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.mapPage = URL_ARGS.page;
    query.minFrac = 0.95;

    query.variable = $(`#${tempRes}-map-variable`).val();

    query.startMonth = parseInt($(`#${tempRes}-cs-start-mon`).val(), 10);
    query.startDay = parseInt($(`#${tempRes}-cs-start-day`).val(), 10);
    query.endMonth = parseInt($(`#${tempRes}-cs-end-mon`).val(), 10);
    query.endDay = parseInt($(`#${tempRes}-cs-end-day`).val(), 10);

    query.precipLow = Number($(`#${tempRes}-cs-precip-low`).val());
    query.precipHigh = Number($(`#${tempRes}-cs-precip-high`).val());
    query.tempLow = Number($(`#${tempRes}-cs-temp-low`).val());
    query.tempHigh = Number($(`#${tempRes}-cs-temp-high`).val());
    query.tempOptim = Number($(`#${tempRes}-cs-temp-optim`).val());
    query.nbWetDays = parseInt($(`#${tempRes}-cs-nb-wetdays`).val(), 10);
    query.rainThres = Number($(`#${tempRes}-cs-rain-thres`).val());

    return query;
}

function preview_cropsuitability_charts_series(tempRes, contID) {
    const query = preview_cropsuitability_query_series(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_cropsuit',
        query,
        preview_cropsuitability_display_series,
        contID
    );
}

function preview_cropsuitability_display_series(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xlim = [
        Math.min(...json.time) - 1,
        Math.max(...json.time) + 1
    ];
    const barValues = json.values.map(value => {
        if (value === null) {
            return null;
        }
        return value === 0 ? 0.08 : value;
    });

    const data = [{
        x: json.time,
        y: barValues,
        customdata: json.values,
        type: 'bar',
        name: json.info.var.name,
        marker: {
            color: 'orange',
            line: {
                width: 0
            }
        },
        hovertemplate: 'Year: %{x}<br>%{data.name}: %{customdata:.0f}' +
            '<extra></extra>'
    }];

    let layout = {
        xaxis: {
            range: xlim,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
        },
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 20;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_analysis_query_cumul(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${tempRes}-map-variable`).val();
    query.variable = DATA_SET.variables[query.map_variable][0];

    const start_date = getStartDekadCumul(tempRes, query.map_variable);
    const end_date = $(`#${tempRes}-map-date-calendar`).val();
    if (!checkDatesCumul(start_date, end_date)) {
        return false;
    }
    query.startDate = formatDekadDate(start_date);
    query.endDate = formatDekadDate(end_date);

    query.startYear = BASE_PERIOD.start_year;
    query.endYear = BASE_PERIOD.end_year;
    query.minYear = BASE_PERIOD.min_year;

    return query;
}

function preview_analysis_charts_cumul(tempRes, contID) {
    const query = preview_analysis_query_cumul(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    ajaxDisplayChart(
        '/climate_monitoring_cumul',
        query,
        preview_analysis_display_cumul,
        contID
    );
}

function preview_analysis_display_cumul(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const shapes = [];
    for (let j = 0; j < json.time.length - 1; j++) {
        shapes.push({
            type: 'rect',

            xref: 'x',
            yref: 'y',

            x0: json.time[j],
            x1: json.time[j + 1],

            y0: json.values[2][j],
            y1: json.values[3][j],

            fillcolor: 'gray',
            line: {
                color: 'gray',
                width: 1
            },

            layer: 'below'
        });
    }

    const data = [{
            x: json.time,
            y: json.values[0],
            name: 'Cumulative Rainfall',
            units: 'mm',
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'red',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.time,
            y: json.values[1],
            name: 'Climatological Mean',
            units: 'mm',
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'blue',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.time,
            y: json.values[2],
            name: '5th Percentile',
            units: 'mm',
            type: 'scatter',
            mode: 'lines',
            line: {
                shape: 'hv',
                color: 'gray',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.time,
            y: json.values[3],
            name: '95th Percentile',
            units: 'mm',
            type: 'scatter',
            mode: 'lines',
            line: {
                shape: 'hv',
                color: 'gray',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }
    ];

    let layout = {
        xaxis: {
            type: 'date',
            showgrid: true,
            gridwidth: 0.5,
            griddash: 'dot',
            gridcolor: 'lightgray',
            showline: true,
            linecolor: plotly_themecolors[theme].fontcolor,
            unifiedhovertitle: {
                text: 'Dekad: %{x|%d %b %Y}'
            }
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            showgrid: true,
            gridwidth: 0.5,
            griddash: 'dot',
            gridcolor: 'lightgray',
            showline: true,
            linecolor: plotly_themecolors[theme].fontcolor
        },
        shapes: shapes,
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout.margin = { t: 10, b: 30, l: 50, r: 10 };
    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(container, data, layout, config);
    setPlotlyThemeColors(container);

    $('#btn-theme-toggle').on('click', () => {
        const thm = $('html').attr('data-bs-theme');
        const update = {
            'xaxis.linecolor': plotly_themecolors[thm].fontcolor,
            'yaxis.linecolor': plotly_themecolors[thm].fontcolor,
            'hoverlabel.font.color': plotly_themecolors[thm].fontcolor,
            'hoverlabel.bgcolor': plotly_themecolors[thm].bgcolor
        };
        Plotly.relayout(container, update);
    });
}

///////

function preview_monitoring_query_spei_dial(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    const spi_variables = {
        'dekadal': 'spi_dek',
        'monthly': 'spi_mon',
        'seasonal': 'spi_seas'
    };
    query.map_variable = spi_variables[tempRes];
    query.variable = DATA_SET.variables[query.map_variable];
    query.analysis = 'spi';
    query.distribution = 'gamma';

    if (tempRes === 'dekadal') {
        query.timeScale = 1;
    } else if (tempRes === 'monthly') {
        query.timeScale = 1;
    } else if (tempRes === 'seasonal') {
        query.seasLength = parseInt($(`#${tempRes}-map-date-length`).val(), 10);
        query.timeScale = query.seasLength;
        query.timeRes = 'monthly';
    } else {
        return false;
    }

    const temp_cov = getTempCoverageCalendar(
        query.dataset, tempRes, query.map_variable
    );

    const end_date = analysis_query_format_date(temp_cov.end, tempRes);
    query.startDate = end_date;
    query.endDate = end_date;

    query.theme = $('html').attr('data-bs-theme');

    return query;
}

function preview_monitoring_charts_spei_dial(tempRes, contID) {
    const query = preview_monitoring_query_spei_dial(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    ajaxDisplayChart(
        '/climate_monitoring_spei_dial',
        query,
        preview_monitoring_display_spei_dial,
        contID
    );
}

function preview_monitoring_display_spei_dial(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const img = $('<img>', {
        id: 'enso-alert-system',
        src: json.png
    }).appendTo(divCont);

    img.css({
        'width': '100%',
        'height': '100%',
        'object-fit': 'cover'
    });
}

///////

function preview_monitoring_query_spei_ts(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    const spi_variables = {
        'dekadal': 'spi_dek',
        'monthly': 'spi_mon',
        'seasonal': 'spi_seas'
    };
    query.map_variable = spi_variables[tempRes];
    query.variable = DATA_SET.variables[query.map_variable];
    query.analysis = 'spi';
    query.distribution = 'gamma';

    if (tempRes === 'dekadal') {
        query.timeScale = 1;
    } else if (tempRes === 'monthly') {
        query.timeScale = 1;
    } else if (tempRes === 'seasonal') {
        query.seasLength = parseInt($(`#${tempRes}-map-date-length`).val(), 10);
        query.timeScale = query.seasLength;
        query.timeRes = 'monthly';
    } else {
        return false;
    }

    const dates = preview_analysis_query_temporal(
        query.dataset, tempRes, query.map_variable, 30
    );

    return Object.assign({}, query, dates);
}

function preview_analysis_charts_spei_ts(tempRes, contID) {
    const query = preview_monitoring_query_spei_ts(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    ajaxDisplayChart(
        '/climate_monitoring_spei_tseries',
        query,
        preview_analysis_display_spei_ts,
        contID
    );
}

function preview_analysis_display_spei_ts(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    // console.log(json)
}

///////

function preview_drm_query_cdf(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }
    const tstepId = `${tempRes}-map-date`;

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-map-variable`).val();
    query.map_variable = query.variable;

    query.dailyAnalysis = true;
    query.minFrac = 1.0;

    query.startMonth = parseInt($(`#${tstepId}-start-mon`).val(), 10);
    query.startDay = parseInt($(`#${tstepId}-start-day`).val(), 10);
    query.endMonth = parseInt($(`#${tstepId}-end-mon`).val(), 10);
    query.endDay = parseInt($(`#${tstepId}-end-day`).val(), 10);

    query.seasParams = $(`#${tempRes}-map-parameters`).val();
    query.defThres = Number($(`#${tempRes}-map-def-number-thres-val`).val().trim());
    if (query.variable === 'rainfall') {
        query.defSpell = parseInt($(`#${tempRes}-map-def-spell-thres-val`).val().trim(), 10);
    } //else {
    //  query.defTempBase = Number($(`#${tempRes}-map-def-spell-thres-val`).val().trim());
    //}

    const dates = preview_analysis_query_temporal(
        query.dataset,
        tempRes,
        query.variable,
        30
    );

    if (query.temporalRes === 'daily') {
        const list_pars = PARAMS_ORDER;
        if (!list_pars.includes(query.seasParams)) {
            query.seasParams = list_pars[0];
        }
    }

    if (['max_temperature', 'min_temperature'].includes(query.variable)) {
        const selectedVariable = query.variable;
        query.variable = 'temperature';


        if (query.seasParams === 'seasAvg') {
            query.seasParams = selectedVariable === 'max_temperature' ?
                'MaxTemp' : 'MinTemp';
        }
    }

    return Object.assign({}, query, dates);
}

function preview_drm_charts_cdf(tempRes, contID) {
    const query = preview_drm_query_cdf(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_proba',
        query,
        preview_drm_display_cdf,
        contID
    );
}

function preview_drm_display_cdf(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const data = [{
            x: json.cdf.smoothed.x,
            y: json.cdf.smoothed.y,
            mode: 'lines',
            name: 'Smoothed CDF',
            units: '%',
            line: {
                color: '#1e90ff',
                width: 4
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.cdf.empirical.x,
            y: json.cdf.empirical.y,
            mode: 'lines+markers',
            name: 'Empirical CDF',
            units: '%',
            line: {
                color: 'red',
                width: 3
            },
            marker: {
                color: 'orange',
                line: {
                    color: 'red',
                    width: 1
                },
                size: 6
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: json.xrange,
            tickvals: json.xticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                tickvals: createTicksMinor(json.xticks),
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: json.info.var.name +
                    ': %{x:.2f} ' +
                    json.info.var.units
            }
        },
        yaxis: {
            range: [0, 100],
            ticksuffix: '%',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_drm_query_pdf(tempRes) {
    return preview_drm_query_cdf(tempRes);
}

function preview_drm_charts_pdf(tempRes, contID) {
    const query = preview_drm_query_pdf(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_proba',
        query,
        preview_drm_display_pdf,
        contID
    );
}

function preview_drm_display_pdf(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const data = [{
            x: json.pdf.kde.x,
            y: json.pdf.kde.y,
            type: 'scatter',
            mode: 'lines',
            name: 'Kernel density',
            line: { color: '#1e90ff', width: 4 },
            hovertemplate: '%{data.name}: %{y:.4f}<extra></extra>'
        },
        {
            x: json.pdf.fitted.x,
            y: json.pdf.fitted.y,
            type: 'scatter',
            mode: 'lines',
            name: 'Fitted density',
            line: { color: 'red', width: 3 },
            hovertemplate: '%{data.name}: %{y:.4f}<extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: json.xrange,
            tickvals: json.xticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                tickvals: createTicksMinor(json.xticks),
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: json.info.var.name +
                    ': %{x:.2f} ' +
                    json.info.var.units
            }
        },
        yaxis: {
            rangemode: 'tozero',
            // ticksuffix: '%',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_drm_query_spi(tempRes) {
    return preview_monitoring_query_spei_ts(tempRes);
}

function preview_drm_charts_spi(tempRes, contID) {
    const query = preview_drm_query_spi(tempRes);
    if (!query) {
        return false;
    }

    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }

    return ajaxDisplayChart(
        '/climate_monitoring_spei_tseries',
        query,
        preview_drm_display_spi,
        contID
    );
}

function preview_drm_display_spi(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xaxisHoverText = json.time.map((t) => {
        return formatPlotlyHoverDate(
            t, json.info.time_res,
            json.info.seas_len,
            json.info.seas_daily
        );
    });

    var defColors = {
        negative: '#fd7e14',
        positive: '#198754',
        other: '#6c757d'
    };

    const barColors = json.values.map(value => {
        if (value > 0) {
            return defColors.positive;
        } else if (value < 0) {
            return defColors.negative;
        } else {
            return defColors.other;
        }
    });

    const data = [{
        x: json.time,
        y: json.values,
        name: json.info.var.name,
        units: json.info.var.units,
        type: 'bar',
        marker: {
            color: barColors,
            line: {
                width: 0
            }
        },
        customdata: xaxisHoverText,
        hovertemplate: 'Date: %{customdata}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
    }];

    var layout = {
        xaxis: {
            type: 'date',
            tickformat: '%Y',
            tickangle: 0,
            dtick: xaxisPlotlyLabelYears(json.time),
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot'
        }
    };

    layout = deepMerge(setPlotlyColors(), layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        deepMerge(preview_layout, layout),
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_projection_query_pdf(tempRes, prefix = `${tempRes}-seasonal-proj`) {
    // function preview_projection_query_pdf(tempRes) {
    //     const prefix = `${tempRes}-seasonal-proj`;

    const spatial = queryParamsSpatialAverage();

    if (!spatial) {
        return false;
    }

    const query = {
        temporalRes: tempRes,
        variable: $(`#${prefix}-variable`).val(),
        model: $(`#${prefix}-gcm`).val(),
        scenario: $(`#${prefix}-scenario`).val(),
        seasStart: Number($(`#${prefix}-start-month`).val()),
        seasEnd: Number($(`#${prefix}-end-month`).val()),
        yearstartH: Number($(`#${prefix}-historical-start`).val()),
        yearendH: Number($(`#${prefix}-historical-end`).val()),
        yearstartFut: Number($(`#${prefix}-future-start`).val()),
        yearendFut: Number($(`#${prefix}-future-end`).val()),
    };


    const validYears = [
        query.yearstartH,
        query.yearendH,
        query.yearstartFut,
        query.yearendFut
    ].every(value => (
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 9998
    ));

    const crossesYear = Number(query.seasEnd < query.seasStart);

    if (
        !validYears ||
        query.yearendH - query.yearstartH + 1 <= crossesYear ||
        query.yearendFut - query.yearstartFut + 1 <= crossesYear
    ) {
        flashMessage(
            'Enter valid historical and future periods.',
            'error'
        );
        return false;
    };

    const valid = [
        query.seasStart,
        query.seasEnd,
        query.yearstartFut,
        // query.climPeriod
    ].every(value => Number.isInteger(value) && value > 0);

    if (!valid || query.seasStart > 12 || query.seasEnd > 12) {
        flashMessage(
            "Enter valid seasonal and period parameters.",
            "error"
        );
        return false;
    }

    return {
        ...query,
        ...spatial
    };
}

function preview_projection_charts_pdf(tempRes, contID) {
    const query = preview_projection_query_pdf(tempRes);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        "climate_projection",
        "climate_projection_pdf"
    );

    ajaxDisplayChart(
        endpoint,
        query,
        preview_projection_display_pdf,
        contID,
        "projection_pdf"
    );
}

function preview_projection_display_pdf(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const theme = $('html').attr('data-bs-theme');
    const ticks = json.xticks;
    const stride = Math.max(1, Math.ceil(ticks.length / 5));

    const previewTicks = ticks.filter(
        (value, index) => index % stride === 0
    );

    const data = [{
            x: json.historical.pdf.fitted.x,
            y: json.historical.pdf.fitted.y,
            type: 'scatter',
            mode: 'lines',
            name: json.historical.label,
            line: { color: '#1e90ff', width: 4 },
            hovertemplate: '%{data.name}: %{y:.4f}<extra></extra>'
        },
        {
            x: json.future.pdf.fitted.x,
            y: json.future.pdf.fitted.y,
            type: 'scatter',
            mode: 'lines',
            name: json.future.label,
            line: { color: 'red', width: 3 },
            hovertemplate: '%{data.name}: %{y:.4f}<extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: json.xrange,
            tickvals: previewTicks,
            tickmode: 'array',
            tickangle: 0,
            automargin: true,
            tickfont: { size: 10 },
            automargin: true,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                tickvals: createTicksMinor(json.xticks),
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: json.info.var.name +
                    ': %{x:.2f} ' +
                    json.info.var.units
            }
        },
        yaxis: {
            rangemode: 'tozero',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);

    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_projection_query_series(
    tempRes,
    prefix = `${tempRes}-seasonal-proj`,
    scenarios = ['ssp1_2_6', 'ssp5_8_5']
) {
    const spatial = queryParamsSpatialAverage();

    if (!spatial) {
        return false;
    }    

    const query = {
        temporalRes: tempRes,
        variable: $(`#${prefix}-variable`).val(),
        seasStart: Number($(`#${prefix}-start-month`).val()),
        seasEnd: Number($(`#${prefix}-end-month`).val()),
        scenarios: scenarios
    };


    const validMonths = [
        query.seasStart,
        query.seasEnd
    ].every(value => (
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 12
    ));

    const validScenarios = (
        Array.isArray(scenarios) &&
        scenarios.length > 0 &&
        scenarios.every(scenario => (
            Object.prototype.hasOwnProperty.call(
                SCENARIOS,
                scenario
            )
        ))
    );

    if (!query.variable || !validMonths || !validScenarios) {
        flashMessage(
            'Select a variable, valid season, and at least one scenario.',
            'error'
        );
        return false;
    }

    // return query;
    return {
        ...query,
        ...spatial
    };
}

function preview_projection_charts_series(tempRes, contID) {
    const query = preview_projection_query_series(tempRes);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_projection',
        'climate_projection_series'
    );

    ajaxDisplayChart(
        endpoint,
        query,
        preview_projection_display_series,
        contID,
        'projection_series'
    );
}

function preview_projection_display_series(
    json,
    container,
    options = {}
) {
    const expanded = Boolean(options.expanded);
    const anomaly = Boolean(options.anomaly);
    const theme = $('html').attr('data-bs-theme');

    const historical = {
        ...json.historical,
        ...(anomaly ? json.anomaly.historical : {})
    };

    const colors = {
        ssp1_2_6: ['blue', 'rgba(0, 0, 255, 0.18)'],
        ssp2_4_5: ['#e67e22', 'rgba(230, 126, 34, 0.18)'],
        ssp3_7_0: ['#9467bd', 'rgba(148, 103, 189, 0.18)'],
        ssp5_8_5: ['red', 'rgba(255, 0, 0, 0.18)']
    };

    function ensembleTraces(series, name, color, fill, rank) {
        return [{
                x: series.years,
                y: series.minimum,
                type: 'scatter',
                mode: 'lines',
                line: { width: 0 },
                showlegend: false,
                hoverinfo: 'skip',
                connectgaps: false
            },
            {
                x: series.years,
                y: series.maximum,
                type: 'scatter',
                mode: 'lines',
                name: `${name} — min–max`,
                line: { width: 0 },
                fill: 'tonexty',
                fillcolor: fill,
                showlegend: expanded,
                legendrank: rank + 100,
                hoverinfo: 'skip',
                connectgaps: false
            },
            {
                x: series.years,
                y: series.mean,
                customdata: series.years.map((year, index) => [
                    series.minimum[index],
                    series.maximum[index],
                    series.count[index]
                ]),
                type: 'scatter',
                mode: 'lines',
                name: `${name} — ensemble mean`,
                line: { color: color, width: 3 },
                showlegend: expanded,
                legendrank: rank,
                connectgaps: false,
                hovertemplate: '%{data.name}: %{y:.2f}<br>' +
                    'Minimum: %{customdata[0]:.2f}<br>' +
                    'Maximum: %{customdata[1]:.2f}<br>' +
                    'Models: %{customdata[2]}<extra></extra>'
            }
        ];
    }

    const data = ensembleTraces(
        historical,
        'Historical',
        'black',
        'rgba(100, 100, 100, 0.18)',
        0
    );

    json.info.scenarios.forEach((scenario, index) => {
        const series = {
            ...json.scenarios[scenario],
            ...(anomaly ? json.anomaly.scenarios[scenario] : {})
        };

        const [color, fill] = colors[scenario];

        data.push(...ensembleTraces(
            series,
            series.label,
            color,
            fill,
            index + 1
        ));
    });

    const isTemperature = [
        'maximum_temperature',
        'minimum_temperature'
    ].includes(json.info.var.type);

    let layout = {
        title: { text: '' },
        xaxis: {
            type: 'linear',
            range: [1981, 2100],
            tick0: 2000,
            dtick: 20,
            tickformat: 'd',
            tickangle: 0,
            title: {
                text: expanded ? 'Season starting year' : ''
            },
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray',
            unifiedhovertitle: {
                text: `${json.info.season} — %{x:.0f}`
            }
        },
        yaxis: {
            title: {
                text: expanded ?
                    (
                        anomaly ?
                        `Anomaly (${json.info.var.units})` :
                        `${json.info.var.name} (${json.info.var.units})`
                    ) : ''
            },
            tickformat: isTemperature ? '.1f' : ',.0f',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            gridcolor: 'lightgray',
            zeroline: anomaly,
            zerolinecolor: 'gray',
        },
        showlegend: expanded,
        legend: {
            orientation: 'h',
            x: 0,
            xanchor: 'left',
            y: 1.02,
            yanchor: 'bottom',
            font: { size: 11 }
        },
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };


    layout = deepMerge(setPlotlyColors(), layout);

    if (expanded) {
        layout = deepMerge(expand_layout, layout);
    } else {
        layout = deepMerge(preview_layout, layout);
        layout.margin.l = 40;

        layout.xaxis.tickfont = deepMerge(
            layout.xaxis.tickfont || {},
            { size: 10 }
        );

        layout.xaxis.automargin = false;
    };

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    $(`#${container}`).empty();

    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);

}

//////

function preview_projection_spi_query(
    prefix = 'monthly-spi-proj'
) {
    const query = queryParamsClimateProjectionSpi(prefix);

    if (!query) {
        return false;
    }

    const spatial = queryParamsSpatialAverage();

    if (!spatial) {
        return false;
    }

    query.plotStartYear = Number(
        $(`#${prefix}-plot-start`).val()
    );

    query.plotEndYear = Number(
        $(`#${prefix}-plot-end`).val()
    );

    if (
        !Number.isInteger(query.plotStartYear) ||
        !Number.isInteger(query.plotEndYear) ||
        query.plotStartYear < 1981 ||
        query.plotEndYear > 2100 ||
        query.plotStartYear > query.plotEndYear
    ) {
        flashMessage(
            'Select valid chart display years.',
            'error'
        );
        return false;
    }

    return {
        ...query,
        ...spatial
    };
}

function preview_projection_spi_charts(
    tempRes,
    container = 'div-chart-spi-proj'
) {
    const query = preview_projection_spi_query();

    if (!query) {
        return false;
    }

    return ajaxDisplayChart(
        createEndpoint(
            'climate_projection',
            'climate_projection_spi_series'
        ),
        query,
        // preview_drm_display_spi,
        (json, container) => {
            if (json.warning) {
                flashMessage(json.warning, 'info');
            }

            preview_drm_display_spi(json, container);
        },
        container
    );
}

///////

function preview_analysis_query_seasfcst(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${tempRes}-map-variable`).val();
    query.variable = query.map_variable;

    query.year = $(`#${tempRes}-forecast-issued-year`).val();
    query.issued = $(`#${tempRes}-forecast-issued-month`).val();
    query.target = $(`#${tempRes}-forecast-target`).val();

    return query;
}

////

function preview_seasfcst_charts_proba(tempRes, contIDs) {
    const query = preview_analysis_query_seasfcst(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }
    query.chartType = 'probability';
    query.displayProbaType2 = true;
    ajaxDisplayChart(
        '/climate_forecast_seas_proba',
        query,
        preview_seasfcst_display_proba,
        contIDs
    );
}

function preview_seasfcst_display_proba(json, container) {
    preview_seasfcst_display_cdf(json.cdf, container[0]);
    preview_seasfcst_display_pdf(json.pdf, container[1]);
}

///////

function preview_seasfcst_display_cdf(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const obs_e = json.obs_empirical;
    const obs_p = json.obs_parametric;
    const fcst = json.forecast;

    const xmin = [
        Math.min(...obs_e),
        Math.min(...obs_p),
        Math.min(...fcst)
    ];
    const xmax = [
        Math.max(...obs_e),
        Math.max(...obs_p),
        Math.max(...fcst)
    ];
    const xrange = [
        Math.min(...xmin),
        Math.max(...xmax)
    ];

    const data = [{
            x: obs_e,
            y: json.proba,
            mode: 'lines',
            name: 'Obs Empirical',
            units: '%',
            line: {
                color: plotly_themecolors[theme].color,
                width: 3
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: obs_p,
            y: json.proba,
            mode: 'lines',
            name: 'Obs Parametric',
            units: '%',
            line: {
                color: 'blue',
                width: 3
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: fcst,
            y: json.proba,
            mode: 'lines',
            name: 'Forecast',
            units: '%',
            line: {
                color: 'red',
                width: 3
            },
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }
    ];

    let layout = {
        xaxis: {
            range: xrange,
            ticks: 'outside',
            ticklen: 6,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            unifiedhovertitle: {
                text: json.info.variable +
                    ': %{x:.2f} ' +
                    json.info.units
            },
            // mirror: true,
        },
        yaxis: {
            range: [0, 100],
            ticksuffix: '%',
            ticks: 'outside',
            ticklen: 6,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 45;
    layout.margin.b = 30;

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

function preview_seasfcst_display_pdf(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const obs_x = json.observation.x;
    const fcst_x = json.forecast.x;

    const xmin = [
        Math.min(...obs_x),
        Math.min(...fcst_x)
    ];
    const xmax = [
        Math.max(...obs_x),
        Math.max(...fcst_x)
    ];
    const xrange = [
        Math.min(...xmin),
        Math.max(...xmax)
    ];

    const ymax = Math.max(
        ...json.observation.y,
        ...json.forecast.y
    );

    function formatHover(x, ts, tx) {
        const i = nearestIndex(ts, x);
        const poe = json.proba[i].toFixed(1);
        const v = x.toFixed(1);
        const y = json.info.variable;
        const u = json.info.units;
        const t0 = 'chance of exceeding';
        return `${poe}% ${t0} ${tx} <br> ${y}: ${v} ${u}`;
    }

    const xaxisHoverObs = obs_x.map((x) => {
        return formatHover(x, obs_x, 'observation');
    });
    const xaxisHoverFcst = fcst_x.map((x) => {
        return formatHover(x, fcst_x, 'forecast');
    });

    const data = [{
            x: json.observation.x,
            y: json.observation.y,
            type: 'scatter',
            mode: 'lines',
            name: 'Observation',
            line: {
                color: 'blue',
                width: 3
            },
            customdata: xaxisHoverObs,
            hovertemplate: '%{customdata}<extra></extra>'
        },
        {
            x: json.forecast.x,
            y: json.forecast.y,
            type: 'scatter',
            mode: 'lines',
            name: 'Forecast',
            line: {
                color: 'red',
                width: 3
            },
            customdata: xaxisHoverFcst,
            hovertemplate: '%{customdata}<extra></extra>'
        }
    ];

    let layout = {
        xaxis: {
            range: xrange,
            ticks: 'outside',
            ticklen: 6,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        yaxis: {
            range: [0, ymax + 0.002],
            ticks: 'outside',
            ticklen: 6,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            }
        },
        showlegend: false,
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        config
    );

    setPlotlyThemeColors(container);
}

///////

function preview_seasfcst_charts_ter(tempRes, contID) {
    const query = preview_analysis_query_seasfcst(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        flashMessage(JS_TEXT.point_outside, 'error');
        return false;
    }
    query.chartType = 'tercile';
    ajaxDisplayChart(
        '/climate_forecast_seas_proba',
        query,
        preview_seasfcst_display_ter,
        contID
    );
}

function preview_seasfcst_display_ter(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const keys = Object.keys(json.tercile)
        .sort((a, b) => Number(a) - Number(b));

    const categories = keys.map(key => json.info.categories[key]);
    const probabilities = keys.map(key => json.tercile[key]);
    const colors = {
        '1': '#b87438',
        '2': '#aaaaaa',
        '3': '#3a9b55'
    };

    const data = [{
        type: 'bar',
        x: categories,
        y: probabilities,
        width: 0.65,
        marker: {
            color: keys.map(key => colors[key]),
            line: {
                color: '#333333',
                width: 0.7
            }
        },
        text: probabilities.map(value =>
            '<b>' + value.toFixed(1) + json.info.units + '</b>'
        ),
        textposition: 'outside',
        textfont: {
            family: 'Arial, sans-serif',
            // size: 14,
            color: plotly_themecolors[theme].color
        },
        cliponaxis: false,
        hovertemplate: '%{x}<br>Probability: %{y:.2f}' +
            json.info.units +
            '<extra></extra>'
    }];

    let layout = {
        xaxis: {
            categoryorder: 'array',
            categoryarray: categories,
            showgrid: false,
            showline: true,
            mirror: true,
            linecolor: plotly_themecolors[theme].fontcolor,
            fixedrange: true,
        },
        yaxis: {
            range: [0, 100],
            ticksuffix: '%',
            ticks: 'outside',
            ticklen: 6,
            tick0: 0,
            dtick: 20,
            showgrid: false,
            zeroline: false,
            showline: true,
            mirror: true,
            linecolor: plotly_themecolors[theme].fontcolor,
            fixedrange: true,
        },
        shapes: [100 / 3, 200 / 3].map(value => ({
            type: 'line',
            xref: 'paper',
            x0: 0,
            x1: 1,
            yref: 'y',
            y0: value,
            y1: value,
            layer: 'below',
            line: {
                color: '#777777',
                width: 1,
                dash: 'dot'
            }
        })),
        showlegend: false,
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 45;

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        plotly_config
    );

    setPlotlyThemeColors(container);

    $('#btn-theme-toggle').on('click', () => {
        const thm = $('html').attr('data-bs-theme');
        const linecolor = plotly_themecolors[thm].fontcolor;
        Plotly.relayout(container, {
            'xaxis.linecolor': linecolor,
            'yaxis.linecolor': linecolor
        });
    });
}


///////
function preview_health_wasp_query(
    tempRes,
    prefix = `${tempRes}-wasp-map`
) {
    if (
        !$(`#${prefix}-control`)
            .data('waspCalendarReady')
    ) {
        return false;
    }

    const query = queryParamsHealthWasp(tempRes, prefix);

    if (!query) {
        return false;
    }

    return {
        ...query,
        geomExtract: 'polygons',
        countryAverage: true,
        Poly: 'Whole country'
    };
}


function preview_health_wasp_charts(
    tempRes,
    container = 'div-chart-wasp'
) {
    const query = preview_health_wasp_query(tempRes);

    if (!query) {
        return false;
    }

    return ajaxDisplayChart(
        createEndpoint(
            'health_malaria',
            'health_wasp_series'
        ),
        query,
        preview_health_display_wasp,
        container
    );
}


function preview_health_display_wasp(json, container) {
    $(`#${container}`).empty();

    const hoverDates = json.time.map(time => {
        return formatPlotlyHoverDate(
            time,
            json.info.time_res,
            json.info.seas_len,
            json.info.seas_daily
        );
    });

    const data = [{
        x: json.time,
        y: json.values,
        type: 'bar',
        name: json.info.var.name,
        customdata: hoverDates,
        marker: {
            color: json.values.map(value => {
                if (value === null) {
                    return 'rgba(0,0,0,0)';
                }

                return value >= 0 ? '#198754' : '#8c510a';
            }),
            line: { width: 0 }
        },
        hovertemplate:
            '%{customdata}<br>' +
            '%{data.name}: %{y:.2f}<extra></extra>'
    }];

    let layout = {
        xaxis: {
            type: 'date',
            tickformat: '%Y',
            tickangle: 0,
            dtick: xaxisPlotlyLabelYears(json.time),
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            zeroline: true
        },
        showlegend: false,
        bargap: 0.05
    };


    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(preview_layout, layout);
    layout.margin.l = 40;

    purgePlotlyChart(container);

    return Plotly.newPlot(
        container,
        data,
        layout,
        {
            displayModeBar: false,
            responsive: true
        }
    ).then(() => {
        setPlotlyThemeColors(container);

        const chartInfo = CHART_INFOS[container];

        if (chartInfo && json.time.length > 0) {
            saveChartInfo(
                container,
                {
                    ...chartInfo.query,
                    startDate: json.time[0].slice(0, 7),
                    endDate: json.time.at(-1).slice(0, 7)
                },
                json
            );
        }
    });
}

///////
function preview_health_cmst_display_charts(tempRes) {
    preview_health_cmst_charts(
        tempRes,
        'div-chart-cmst'
    );
}


function preview_health_cmst_query(tempRes) {
    let query = queryParamsSpatialAverage();

    if (!query) {
        return query;
    }

    query.chartType = 'one';
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-map-variable`).val();
    query.cmstProduct = 'AllCondProb';
    query.startYear = Number($(`#${tempRes}-base-period-start`).val());
    query.endYear = Number($(`#${tempRes}-base-period-end`).val());
    query.minYear = Number($(`#${tempRes}-base-period-min`).val());

    return query;
}


function preview_health_cmst_charts(tempRes, contID) {
    const query = preview_health_cmst_query(tempRes);

    if (!query) {
        return false;
    }

    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        createEndpoint(
            'health_malaria',
            'health_cmst_series'
        ),
        query,
        preview_health_display_cmst,
        contID
    );
}


function preview_health_display_cmst(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    let xaxis_hoverformat;

    if (json.info.time_res === 'monthly') {
        xaxis_hoverformat = json.info.var.name + ': ' + '%B';
    } else {
        return false;
    };

    const colors = {
        AllCondProb: '#E9967A',
        PcpnCondProb: '#B0C4DE',
        TempCondProb: '#EEDD82',
        RHCondProb: '#20B2AA'
    };

    const data = [{
        x: json.time,
        y: json.values,
        name: json.info.var.name,
        units: json.info.var.units,
        type: 'bar',
        marker: {
            color: colors[json.info.product]
        },
        hovertemplate:
            '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
    }];

    const theme = $('html').attr('data-bs-theme');

    var layout = {
        xaxis: {
            type: 'date',
            fixedrange: true,
            tickformat: '%b',
            dtick: 'M1',
            ticklabelmode: 'period',
            tickangle: -45,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            griddash: 'dot',
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            hoverformat: xaxis_hoverformat,
            showspikes: true,
            spikemode: 'across',
            spikecolor: plotly_themecolors[theme].fontcolor,
            spikethickness: 2,
            spikedash: 'solid',
            spikesnap: 'cursor',
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            ticksuffix: '%',
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            griddash: 'dot',
            gridcolor: 'lightgray',
            minor: {
                showgrid: true,
                gridwidth: 0.3,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme),
    };

    layout = deepMerge(setPlotlyColors(), layout);

    const config = {
        displayModeBar: false,
        responsive: true
    };

    purgePlotlyChart(container);

    Plotly.newPlot(
        container,
        data,
        deepMerge(preview_layout, layout),
        config
    );

    setPlotlyThemeColors(container);
}

