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
    preview_analysis_charts_rawdata(tempRes, 'div-chart-raw');
    preview_analysis_charts_anomaly(tempRes, 'div-chart-anom');
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
        const map_type = $(`#${tempRes}-map-type`).val();
        const seas_start = $(`#${tstepId}-calendar`).val();
        if (map_type === 'climatology') {
            query.seasStart = parseInt(seas_start, 10);
        } else {
            query.seasStart = parseInt(seas_start.slice(5, 7), 10);
        }
        query.seasLength = parseInt($(`#${tstepId}-length`).val(), 10);
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