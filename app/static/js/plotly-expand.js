function expand_analysis_query_rawdata(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    // query.variable = $(`#${tempRes}-chart-raw-variable`).val();
    query.chart_variable = $(`#${tempRes}-chart-raw-variable`).val();
    if (URL_ARGS.component === 'monitoring') {
        query.variable = DATA_SET.variables[query.chart_variable][0];
    } else {
        query.variable = query.chart_variable;
    }
    query.startDate = analysis_query_format_date(
        $(`#${tempRes}-chart-raw-startdate-calendar`).val(),
        tempRes
    );
    query.endDate = analysis_query_format_date(
        $(`#${tempRes}-chart-raw-enddate-calendar`).val(),
        tempRes
    );

    if (tempRes === 'seasonal') {
        query.seasStart = parseInt($(`#${tempRes}-chart-season-startmon-calendar`).val(), 10);
        query.seasLength = parseInt($(`#${tempRes}-chart-season-seaslen`).val(), 10);
        query.fullYearTS = false;
    }

    return Object.assign({}, query);
}

function expand_analysis_charts_rawdata(container_id, tempRes) {
    const query = expand_analysis_query_rawdata(tempRes);
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
        expand_analysis_display_rawdata,
        container_id,
        'ts_rawdata'
    );
}

function expand_analysis_format_rawdata(json) {
    let jsc = makeCopy(json);
    const time_res = jsc.info.time_res;
    const ts = $(`#${time_res}-chart-raw-series`).val();
    if (ts === 'years') {
        const tstep_id = `${time_res}-chart-raw-startmonth`;
        const mon = parseInt($(`#${tstep_id}-calendar`).val(), 10);
        const dataYear = groupTSDataByYear(jsc.time, jsc.values, mon, time_res);
        if (dataYear === null) {
            return null;
        }
        jsc.time = dataYear.dates;
        jsc.values = dataYear.values;

        let start = new Date(jsc.time[0]);
        start.setDate(start.getDate() - 5);
        start = formatDateToString(start);
        let end = new Date(jsc.time.at(-1));
        end.setDate(end.getDate() + 5);
        end = formatDateToString(end);
        jsc.xrange = [start, end];
    }
    jsc['chartType'] = ts;
    return jsc;
}

function expand_analysis_display_rawdata(json_input, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const json = expand_analysis_format_rawdata(json_input);
    if (json === null) {
        return false;
    }

    if (json.chartType === 'one') {
        showRangeselector(container, true);


        const plotType = $(`#${json.info.time_res}-chart-raw-plot-type`).val() || 'bar';
        const isBar = plotType === 'bar';
        const showMarkers = plotType === 'lpoint';
        const traceStyle = isBar ? { marker: { color: '#fc03fc' } } : {
            line: { color: '#17becf' },
            ...(showMarkers ? { marker: { color: '#fc03fc' } } : {})
        };

        const xaxisHoverText = json.time.map((t) => {
            return formatPlotlyHoverDate(
                t, json.info.time_res,
                json.info.seas_len
            );
        });

        const data = [{
            x: json.time,
            y: json.values,
            name: json.info.var.name,
            units: json.info.var.units,
            type: isBar ? 'bar' : 'scatter',
            ...(isBar ? {} : { mode: showMarkers ? 'lines+markers' : 'lines' }),
            ...traceStyle,
            customdata: xaxisHoverText,
            hovertemplate: 'Date: %{customdata}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            // hovertemplate: 'Date: %{x|%B %Y}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }];

        var common_layout = {
            xaxis: {
                type: 'date',
                tickformat: '%b %Y',
                rangeslider: plotly_rangeslider,
            },
            yaxis: {
                range: json.yrange,
                tickvals: json.yticks,
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                title: {
                    text: `${json.info.var.name} [${json.info.var.units}]`,
                },
            }
        };

        if (isBar) {
            var layout = {
                // margin: { b: 50 },
                xaxis: {
                    showline: true,
                    showgrid: false,
                    autotickangles: 'auto',
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
                    autotickangles: 'auto',
                    ticks: 'outside',
                    ticklen: 8,
                },
                yaxis: {
                    // tickfont: { color: '#17becf' },
                    showline: true,
                    showgrid: true,
                    gridwidth: 0.3,
                    griddash: 'dot',
                }
            };
        }

        layout = deepMerge(common_layout, layout);
        layout = deepMerge(setPlotlyColors(), layout);

        if (isBar) {
            layout.xaxis.rangeslider.bgcolor = data[0].marker.color;
        } else {
            layout.xaxis.rangeslider.bgcolor = data[0].line.color;
        }
        layout.width = getChartWidth(container);
        layout.height = getChartHeight(container);

        purgePlotlyChart(container);
        Plotly.newPlot(
            container,
            data,
            deepMerge(expand_layout, layout),
            plotly_config
        );

        //// add range selector
        const last_date = new Date(json.time[json.time.length - 1]);
        const ranges = ['1Y', '5Y', '10Y', '15Y', '20Y', '30Y', 'ALL'];
        addRangeselector(container, ranges, last_date)
    } else {
        showRangeselector(container, false);

        const colors = formatColorsChart(json.values.length, 'rainbow');

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

        const data = json.values.map((x, i) => {
            return {
                x: json.time,
                y: x.values,
                name: x.year,
                units: json.info.var.units,
                type: 'scatter',
                mode: 'lines',
                line: {
                    width: 3,
                    color: colors[i]
                },
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            };
        });

        const theme = $('html').attr('data-bs-theme');

        var layout = {
            xaxis: {
                type: 'date',
                range: json.xrange,
                fixedrange: true,
                tickformat: '%b',
                dtick: 'M1',
                // ticklabelmode: 'period',
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
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
                title: {
                    text: `${json.info.var.name} [${json.info.var.units}]`,
                },
            },
            // showlegend: false,
            hovermode: 'x unified',
            hoverlabel: hoverlabelColors(theme),
        };

        layout = deepMerge(setPlotlyColors(), layout);
        layout.width = getChartWidth(container);
        layout.height = getChartHeight(container);

        purgePlotlyChart(container);
        Plotly.newPlot(
            container,
            data,
            deepMerge(expand_layout, layout),
            plotly_config
        );
    }

    setPlotlyThemeColors(container);
    resizePlotlyChart(container);
}

///////

function expand_analysis_query_climato(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = $(`#${tempRes}-chart-clim-charts`).val();
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-chart-clim-variable`).val();
    query.startYear = parseInt($(`#${tempRes}-chart-clim-bp-start`).val().trim(), 10);
    query.endYear = parseInt($(`#${tempRes}-chart-clim-bp-end`).val().trim(), 10);
    query.minYear = parseInt($(`#${tempRes}-chart-clim-bp-min`).val().trim(), 10);

    return query;
}

function expand_analysis_charts_climato(container_id, tempRes) {
    const query = expand_analysis_query_climato(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_climato',
        query,
        expand_analysis_display_climato,
        container_id
    );
}

function expand_analysis_display_climato(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    let one_var_hoverformat;
    let multi_var_hoverformat;
    if (json.info.time_res === 'monthly') {
        one_var_hoverformat = json.info.var.name +
            ': ' + '%B';
        multi_var_hoverformat = 'Month' + ': ' + '%B';
    } else if (json.info.time_res === 'dekadal') {
        one_var_hoverformat = json.info.var.name +
            ': ' + 'Dekad ' + '%m-%d';
        multi_var_hoverformat = 'Dekad' + ': ' + '%m-%d';
    } else {
        return false;
    }

    if (json.chartType === 'multiple') {
        var data = [{
                x: json.time,
                y: json.values[0],
                name: json.info.precip.name,
                units: json.info.precip.units,
                type: 'bar',
                yaxis: 'y1',
                marker: { color: 'gray' },
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            },
            {
                x: json.time,
                y: json.values[1],
                name: json.info.tmin.name,
                units: json.info.tmin.units,
                type: 'scatter',
                mode: 'lines+markers',
                yaxis: 'y2',
                line: {
                    width: 6,
                    color: 'blue'
                },
                marker: { size: 12 },
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            },
            {
                x: json.time,
                y: json.values[2],
                name: json.info.tmax.name,
                units: json.info.tmax.units,
                type: 'scatter',
                mode: 'lines+markers',
                yaxis: 'y2',
                line: {
                    width: 6,
                    color: 'red'
                },
                marker: { size: 12 },
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            },
        ];

        var layout = {
            margin: { t: 10, b: 50, l: 60, r: 60 },
            xaxis: {
                type: 'date',
                fixedrange: true,
                tickformat: '%b',
                dtick: 'M1',
                ticklabelmode: 'period',
                ticks: 'outside',
                ticklen: 8,
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
                hoverformat: multi_var_hoverformat,

                showspikes: true,
                spikemode: 'across',
                spikecolor: plotly_themecolors[theme].fontcolor,
                spikethickness: 2,
                spikedash: 'solid',
                spikesnap: 'cursor',
            },
            yaxis: {
                range: json.yrange1,
                tickvals: json.yticks1,
                side: 'left',
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                showline: true,
                // showgrid: true,
                // gridwidth: 0.3,
                // griddash: 'dot',
                title: {
                    text: `${json.info.precip.name} [${json.info.precip.units}]`,
                },
            },
            yaxis2: {
                range: json.yrange2,
                tickvals: json.yticks2,
                side: 'right',
                overlaying: 'y',
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
                title: {
                    text: `${json.info.var.name} [${json.info.var.units}]`,
                },
            },
            showlegend: false,
            hovermode: 'x unified',
            hoverlabel: hoverlabelColors(theme),
        };
    } else {
        var data = [{
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
                    width: 5,
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
                    width: 5,
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
                    width: 5,
                    color: 'red'
                },
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            },
        ];

        var layout = {
            xaxis: {
                type: 'date',
                fixedrange: true,
                tickformat: '%b',
                dtick: 'M1',
                ticklabelmode: 'period',
                ticks: 'outside',
                ticklen: 8,
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
                hoverformat: one_var_hoverformat,

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
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.3,
                griddash: 'dot',
                title: {
                    text: `${json.info.var.name} [${json.info.var.units}]`,
                },
            },
            showlegend: false,
            hovermode: 'x unified',
            hoverlabel: hoverlabelColors(theme),
        };
    }

    layout.print_legend = 'climato';
    layout = deepMerge(setPlotlyColors(), layout);
    layout.width = getChartWidth(container);
    layout.height = getChartHeight(container);

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        deepMerge(expand_layout, layout),
        plotly_config
    );

    setPlotlyThemeColors(container);
    resizePlotlyChart(container);
}

///////

function expand_analysis_query_anomaly(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    // query.variable = $(`#${tempRes}-anom-variable`).val();
    query.chart_variable = $(`#${tempRes}-anom-variable`).val();
    if (URL_ARGS.component === 'monitoring') {
        query.variable = DATA_SET.variables[query.chart_variable][0];
    } else {
        query.variable = query.chart_variable;
    }
    query.anomaly = $(`#${tempRes}-chart-anom-type`).val();

    query.startYear = parseInt($(`#${tempRes}-chart-anom-bp-start`).val().trim(), 10);
    query.endYear = parseInt($(`#${tempRes}-chart-anom-bp-end`).val().trim(), 10);
    query.minYear = parseInt($(`#${tempRes}-chart-anom-bp-min`).val().trim(), 10);

    query.startDate = analysis_query_format_date(
        $(`#${tempRes}-chart-anom-startdate-calendar`).val(),
        tempRes
    );
    query.endDate = analysis_query_format_date(
        $(`#${tempRes}-chart-anom-enddate-calendar`).val(),
        tempRes
    );

    if (query.temporalRes === 'seasonal') {
        query.seasStart = 1;
        query.fullYearTS = true;
        query.seasLength = parseInt($(`#${tempRes}-chart-anom-seaslen`).val(), 10);
        query.dailyAnalysis = false;
    }

    if (query.temporalRes === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;

        query.startMonth = parseInt($(`#${tempRes}-anom-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tempRes}-anom-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tempRes}-anom-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tempRes}-anom-end-day`).val(), 10);

        query.seasParams = $(`#${tempRes}-anom-parameters`).val();
        query.defThres = Number($(`#${tempRes}-anom-def-number-thres-val`).val().trim());
        if (query.variable === 'rainfall') {
            query.defSpell = parseInt($(`#${tempRes}-anom-def-spell-thres-val`).val().trim(), 10);
        } else {
            query.defTempBase = Number($(`#${tempRes}-anom-def-spell-thres-val`).val().trim());
        }
    }

    return Object.assign({}, query);
}

function expand_analysis_charts_anomaly(container_id, tempRes) {
    const query = expand_analysis_query_anomaly(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_anomaly',
        query,
        expand_analysis_display_anomaly,
        container_id,
        'ts_anomaly'
    );
}

function expand_analysis_format_anomaly(json) {
    let jsc = makeCopy(json);
    const time_res = jsc.info.time_res;
    if (time_res === 'daily') {
        jsc['chartType'] = 'one';
        return jsc;
    }
    const ts = $(`#${time_res}-chart-anom-series`).val();
    if (ts === 'tstep') {
        const tstep_id = `${time_res}-chart-anom-tstep`;
        const tstep_val = $(`#${tstep_id}-calendar`).val();

        let this_date;
        if (time_res === 'monthly') {
            this_date = parseInt(tstep_val, 10);
        } else if (time_res === 'dekadal') {
            this_date = tstep_val;
        } else if (time_res === 'seasonal') {
            this_date = parseInt(tstep_val, 10);
        } else {
            return null;
        }

        const res = splitAnomalyDataByStep(
            jsc.time, jsc.values, this_date,
            time_res, jsc.info.seas_len
        );
        if (res === null) {
            return null;
        }

        jsc.time = res.dates;
        jsc.values = res.values;
        jsc.yrange = res.ylim;
        jsc.yticks = res.breaks;
        jsc['tstep'] = this_date;
    }
    jsc['chartType'] = ts;
    return jsc;
}


function getAnomalyBarWidthMs(time, timeRes, info) {
    const date = new Date(time);
    if (timeRes === 'seasonal') {
        const seasLen = Number(info.seas_len);
        if (Number.isFinite(seasLen) && seasLen > 0) {
            const { start, end } = getSeasonFromDate(date, seasLen);
            return end.getTime() - start.getTime();
        }
        return null;
    }
    if (timeRes === 'daily' && info.seas_daily) {
        const { start, end } = getDailySeasonRange(date, info.seas_daily);
        return end.getTime() - start.getTime();
    }
    return null;
}

const ANOMALY_MIN_BAR_WIDTH_FRACTION_OF_RANGE = 0.012; // ~1.2% of the visible span
const ANOMALY_MAX_BAR_WIDTH_FRACTION_OF_GAP = 0.8;
const ANOMALY_MIN_BAR_WIDTH_MS_FLOOR = 5 * 86400000; // 5 days, for a single/near-empty range

function applyMinimumAnomalyBarWidths(times, widths) {
    const numericTimes = times.map(t => new Date(t).getTime());
    const rangeSpan = numericTimes.length ?
        Math.max(...numericTimes) - Math.min(...numericTimes) :
        0;
    const floor = Math.max(
        rangeSpan * ANOMALY_MIN_BAR_WIDTH_FRACTION_OF_RANGE,
        ANOMALY_MIN_BAR_WIDTH_MS_FLOOR
    );

    const sorted = [...numericTimes].sort((a, b) => a - b);
    const sortedGaps = sorted
        .slice(1)
        .map((t, i) => t - sorted[i])
        .filter(gap => gap > 0);
    const ceiling = sortedGaps.length ?
        Math.min(...sortedGaps) * ANOMALY_MAX_BAR_WIDTH_FRACTION_OF_GAP :
        null;

    return widths.map(width => {
        const withFloor = Math.max(width, floor);
        return ceiling !== null ? Math.min(withFloor, ceiling) : withFloor;
    });
}

function expand_analysis_display_anomaly(json_input, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const json = expand_analysis_format_anomaly(json_input);
    if (json === null) {
        return false;
    }

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


    const barWidths = json.time.map(
        t => getAnomalyBarWidthMs(t, json.info.time_res, json.info)
    );
    const hasCustomBarWidths = barWidths.every(w => Number.isFinite(w) && w > 0);

    const data = [{
        x: json.time,
        y: json.values,
        name: json.info.var.name,
        units: json.info.var.units,
        type: 'bar',
        ...(hasCustomBarWidths ? { width: applyMinimumAnomalyBarWidths(json.time, barWidths) } : {}),
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
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            rangeslider: plotly_rangeslider,
            ticks: 'outside',
            ticklen: 8,
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            ticks: 'outside',
            ticklen: 8,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            title: {
                text: `${json.info.var.name} [${json.info.var.units}]`,
            },
        },
        width: getChartWidth(container),
        height: getChartHeight(container)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(expand_layout, layout);
    layout.xaxis.rangeslider.bgcolor = defColors.positive;

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        plotly_config
    );

    //// add range selector
    const last_date = new Date(json.time[json.time.length - 1]);
    // const ranges = ['1Y', '5Y', '10Y', 'ALL'];
    const ranges = ['1Y', '5Y', '10Y', '15Y', '20Y', '30Y', 'ALL'];
    addRangeselector(container, ranges, last_date, 'date');

    setPlotlyThemeColors(container);
    resizePlotlyChart(container);
}

///////

function expand_analysis_query_proba(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = 'proba';
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-proba-variable`).val();

    query.startDate = analysis_query_format_date(
        $(`#${tempRes}-chart-proba-startdate-calendar`).val(),
        tempRes
    );
    query.endDate = analysis_query_format_date(
        $(`#${tempRes}-chart-proba-enddate-calendar`).val(),
        tempRes
    );

    if (query.temporalRes === 'seasonal') {
        query.dailyAnalysis = false;
        query.fullYearTS = false;
        query.seasStart = parseInt($(`#${tempRes}-chart-proba-startmon-calendar`).val(), 10);
        query.seasLength = parseInt($(`#${tempRes}-chart-proba-seaslen`).val(), 10);
    }

    if (query.temporalRes === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;

        query.startMonth = parseInt($(`#${tempRes}-proba-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tempRes}-proba-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tempRes}-proba-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tempRes}-proba-end-day`).val(), 10);

        query.seasParams = $(`#${tempRes}-proba-parameters`).val();
        query.defThres = Number($(`#${tempRes}-proba-def-number-thres-val`).val().trim());
        if (query.variable === 'rainfall') {
            query.defSpell = parseInt($(`#${tempRes}-proba-def-spell-thres-val`).val().trim(), 10);
        } else {
            query.defTempBase = Number($(`#${tempRes}-proba-def-spell-thres-val`).val().trim());
        }
    }

    return Object.assign({}, query);
}

function expand_analysis_charts_proba(container_id, tempRes) {
    const query = expand_analysis_query_proba(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_proba',
        query,
        expand_analysis_display_proba,
        container_id,
        'data_proba'
    );
}

function expand_analysis_display_proba(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const time_res = json.info.time_res;
    const plot_type = $(`#${time_res}-chart-proba-plot-type`).val();

    let data;
    let layout;
    if (plot_type === 'cdf') {
        const c1 = `${time_res}-proba-plot-cdf-empirical`;
        const cdfE = $(`#${c1}`).is(':checked');
        const c2 = `${time_res}-proba-plot-cdf-smoothed`;
        const cdfS = $(`#${c2}`).is(':checked');
        const c3 = `${time_res}-proba-plot-cdf-fitted`;
        const cdfF = $(`#${c3}`).is(':checked');

        data = [{
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
                visible: cdfE,
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            },
            {
                x: json.cdf.smoothed.x,
                y: json.cdf.smoothed.y,
                mode: 'lines',
                name: 'Smoothed CDF',
                units: '%',
                line: {
                    color: '#1e90ff',
                    width: 3
                },
                visible: cdfS,
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            },
            {
                x: json.cdf.fitted.x,
                y: json.cdf.fitted.y,
                mode: 'lines',
                name: 'Fitted CDF',
                units: '%',
                line: {
                    color: '#c29ffa',
                    width: 3
                },
                visible: cdfF,
                hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
            }
        ];

        layout = {
            xaxis: {
                range: json.xrange,
                tickvals: json.xticks,
                ticks: 'outside',
                ticklen: 8,
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
                },
                title: {
                    text: json.info.labels.cdf.x
                }
            },
            yaxis: {
                range: [0, 100],
                ticks: 'outside',
                ticklen: 8,
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
                },
                title: {
                    text: json.info.labels.cdf.y
                }
            },
            showlegend: false,
            hovermode: 'x unified',
            hoverlabel: hoverlabelColors(theme)
        };
    } else {
        const p1 = `${time_res}-proba-plot-pdf-histogram`;
        const pdfE = $(`#${p1}`).is(':checked');
        const p2 = `${time_res}-proba-plot-pdf-density`;
        const pdfS = $(`#${p2}`).is(':checked');
        const p3 = `${time_res}-proba-plot-pdf-fitted`;
        const pdfF = $(`#${p3}`).is(':checked');

        const xlab = json.info.labels.pdf.x;
        const ylab = json.info.labels.pdf.y;
        data = [{
                x: json.ts,
                type: 'histogram',
                histnorm: 'probability density',
                name: 'Histogram',
                visible: pdfE,
                // nbinsx: Math.ceil(Math.log2(json.ts.length) + 1),
                nbinsx: 10,
                marker: {
                    color: 'lightblue',
                    line: {
                        color: 'blue',
                        width: 1
                    }
                },
                opacity: 1,
                hovertemplate: xlab + ': %{x:.2f}<br>' +
                    ylab + ': %{y:.4f}<extra></extra>'
            },
            {
                x: json.pdf.kde.x,
                y: json.pdf.kde.y,
                type: 'scatter',
                mode: 'lines',
                name: 'Kernel Density Estimation',
                visible: pdfS,
                line: {
                    color: '#1e90ff',
                    width: 3
                },
                hovertemplate: xlab + ': %{x:.2f}<br>' +
                    ylab + ': %{y:.4f}<extra></extra>'
            },
            {
                x: json.pdf.fitted.x,
                y: json.pdf.fitted.y,
                type: 'scatter',
                mode: 'lines',
                name: 'Fitted PDF',
                visible: pdfF,
                line: {
                    color: '#c29ffa',
                    width: 3
                },
                hovertemplate: xlab + ': %{x:.2f}<br>' +
                    ylab + ': %{y:.4f}<extra></extra>'
            }
        ];

        const ymax = Math.max(
            ...json.pdf.kde.y,
            ...json.pdf.fitted.y
        );

        layout = {
            xaxis: {
                range: json.xrange,
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
                zeroline: false,
                title: {
                    text: xlab
                }
            },
            yaxis: {
                range: [0, ymax + 0.002],
                ticks: 'outside',
                ticklen: 8,
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
                zeroline: false,
                title: {
                    text: ylab
                }
            },
            bargap: 0,
            showlegend: false,
            // hoverlabel: hoverlabelColors(theme)
        };
    }

    layout.margin = { t: 10, b: 70, l: 70, r: 10 };
    layout.print_legend = 'probability';
    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(expand_layout, layout);

    const container_plot = setProbaPlotContainer(json, container);

    purgePlotlyChart(container_plot);
    Plotly.newPlot(
        container_plot,
        data,
        layout,
        plotly_config
    );

    setPlotlyThemeColors(container_plot);

    const fcheck = `${time_res}-proba-plot-${plot_type}-fitted`;
    const isFitted = $(`#${fcheck}`).is(':checked');
    if (isFitted) {
        $(`#${container}-distr-div`).show();
    } else {
        $(`#${container}-distr-div`).hide();
    }
}

///////

function expand_analysis_query_season(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = 'season';
    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-tseries-variable`).val();

    query.startDate = analysis_query_format_date(
        $(`#${tempRes}-chart-season-startdate-calendar`).val(),
        tempRes
    );
    query.endDate = analysis_query_format_date(
        $(`#${tempRes}-chart-season-enddate-calendar`).val(),
        tempRes
    );

    // 
    if (query.temporalRes === 'seasonal') {
        query.dailyAnalysis = false;
        query.fullYearTS = false;
        query.seasStart = parseInt($(`#${tempRes}-chart-season-startmon-calendar`).val(), 10);
        query.seasLength = parseInt($(`#${tempRes}-chart-season-seaslen`).val(), 10);
    }

    // 
    if (query.temporalRes === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;

        query.startMonth = parseInt($(`#${tempRes}-tseries-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tempRes}-tseries-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tempRes}-tseries-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tempRes}-tseries-end-day`).val(), 10);

        query.seasParams = $(`#${tempRes}-tseries-parameters`).val();
        query.defThres = Number($(`#${tempRes}-tseries-def-number-thres-val`).val().trim());
        if (query.variable === 'rainfall') {
            query.defSpell = parseInt($(`#${tempRes}-tseries-def-spell-thres-val`).val().trim(), 10);
        } else {
            query.defTempBase = Number($(`#${tempRes}-tseries-def-spell-thres-val`).val().trim());
        }
    }

    return Object.assign({}, query);
}

function expand_analysis_charts_season(container_id, tempRes) {
    const query = expand_analysis_query_season(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_season',
        query,
        expand_analysis_display_season,
        container_id,
        'data_season'
    );
}

function expand_analysis_display_season(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xdata = json.time;
    const ydata = json.values;
    const timeres = json.info.time_res;
    const vname = json.info.var.name;
    const vunit = json.info.var.units;
    const ylab = `${vname} (${vunit})`;
    const xlim = [
        Math.min(...xdata) - 1,
        Math.max(...xdata) + 1
    ];
    const ylim = json.yrange;
    const yticks = json.yticks;

    // Regression line
    const regX = xlim;
    const areg = json.coeffs.slope;
    const breg = json.coeffs.intercept;
    const regY = regX.map(x => breg + areg * x);

    function makeMainTrace(plotType) {
        const base = {
            x: xdata,
            y: ydata,
            name: vname,
            units: vunit,
            hovertemplate: 'Year: %{x}<br>' +
                `%{data.name}: %{y:.2f} %{data.units} <extra></extra>`
        };

        if (plotType === 'line') {
            return {
                ...base,
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: '#dc3545',
                    width: 3
                }
            };
        }

        if (plotType === 'lpoint') {
            return {
                ...base,
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                    color: '#dc3545',
                    width: 3
                },
                marker: {
                    color: '#fd7e14',
                    line: {
                        color: '#dc3545',
                        width: 1
                    },
                    size: 8
                }
            };
        }

        return {
            ...base,
            type: 'bar',
            marker: {
                color: '#dc3545'
            }
        };
    }

    function makeTrendTrace() {
        return {
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
        };
    }

    function makeReferenceTraces() {
        const traces = [];

        if ($(`.${timeres}-season-plot[value="mean"]`).is(':checked')) {
            traces.push({
                x: xlim,
                y: [json.stats.mean, json.stats.mean],
                type: 'scatter',
                mode: 'lines',
                name: 'Mean',
                line: {
                    color: '#6610f2',
                    width: 4
                }
            });
        }

        if ($(`.${timeres}-season-plot[value="median"]`).is(':checked')) {
            traces.push({
                x: xlim,
                y: [json.stats.median, json.stats.median],
                type: 'scatter',
                mode: 'lines',
                name: 'Median',
                line: {
                    color: '#fd7e14',
                    width: 4
                }
            });
        }

        if ($(`.${timeres}-season-plot[value="terciles"]`).is(':checked')) {
            traces.push({
                x: xlim,
                y: [json.stats.tercile1, json.stats.tercile1],
                type: 'scatter',
                mode: 'lines',
                name: 'Lower tercile',
                line: {
                    color: '#198754',
                    width: 4
                }
            });

            traces.push({
                x: xlim,
                y: [json.stats.tercile2, json.stats.tercile2],
                type: 'scatter',
                mode: 'lines',
                name: 'Upper tercile',
                line: {
                    color: '#0a3622',
                    width: 4
                }
            });
        }

        return traces;
    }

    function drawPlot() {
        const plotType = $(`#${timeres}-chart-season-plot-type`).val();
        const showTrend = $(`.${timeres}-season-plot[value="trend"]`).is(':checked');
        const traces = [makeMainTrace(plotType)];

        if (showTrend) {
            traces.push(makeTrendTrace());
        }

        traces.push(...makeReferenceTraces());

        var layout = {
            xaxis: {
                range: xlim,
                tickformat: 'd',
                dtick: 5,
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.5,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            yaxis: {
                range: ylim,
                tickvals: yticks,
                ticks: 'outside',
                ticklen: 8,
                title: {
                    text: ylab
                },
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.5,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            showlegend: false,
            bargap: 0.15,
            width: getChartWidth(container),
            height: getChartHeight(container)
        };

        layout.margin = { t: 10, b: 60, l: 70, r: 10 };
        layout.print_legend = 'seasonal';
        layout = deepMerge(setPlotlyColors(), layout);
        layout = deepMerge(expand_layout, layout);

        purgePlotlyChart(container);
        Plotly.newPlot(
            container,
            traces,
            layout,
            plotly_config
        );

        setPlotlyThemeColors(container);
        resizePlotlyChart(container);
    }

    ////
    drawPlot();

    $(`#${timeres}-chart-season-plot-type`)
        .off('change.chartTsSeason')
        .on('change.chartTsSeason', drawPlot);

    $(`.${timeres}-season-plot`)
        .off('change.chartTsSeason')
        .on('change.chartTsSeason', drawPlot);
}

///////

function expand_analysis_query_enso(tempRes) {
    let query = new Object();
    query.chartType = 'enso';
    query.temporalRes = tempRes;
    query.teleconIndex = $(`#${tempRes}-enso-indices`).val();
    query.sreenW = screen.width;
    query.sreenH = screen.height;

    if (query.teleconIndex === 'oni') {
        query.oniType = $(`#${tempRes}-oni-indices`).val();
    }
    if (query.teleconIndex === 'iod') {
        query.sstProd = $(`#${tempRes}-iod-sst`).val();
    }
    if (query.teleconIndex === 'nao') {
        // not used
        query.sstProd = $(`#${tempRes}-nao-cdas`).val();
    }
    if (query.teleconIndex === 'atl3') {
        // not used
        query.sstProd = $(`#${tempRes}-atl3-cdas`).val();
    }
    if (query.teleconIndex === 'anom') {
        query.timeRes = $(`#${tempRes}-anom-tempres`).val();

        if (query.timeRes == 'weekly') {
            query.sstProd = $(`#${tempRes}-anom-sstweek`).val();
        } else {
            query.sstProd = $(`#${tempRes}-anom-sstmonth`).val();
        }
        query.anomType = $(`#${tempRes}-anom-ninotype`).val();
        query.ninoRegion = $(`#${tempRes}-anom-ninoregion`).val();
    }

    if (['oni', 'iod', 'nao', 'atl3', 'anom'].includes(query.teleconIndex)) {
        query.startDate = $(`#${tempRes}-chart-enso-startdate-calendar`).val();
        query.endDate = $(`#${tempRes}-chart-enso-enddate-calendar`).val();
        const ensoImg = $(`#${tempRes}-disp-image-enso`).val();
        query.imgPNG = ensoImg == 'image';
        if (ensoImg == 'image') {
            query.dispLastValue = $(`#${tempRes}-disp-lastval-enso`).prop('checked');
        } else {
            query.dispLastValue = false;
        }
    } else {
        query.imgPNG = true;
    }

    return query;
}

function expand_analysis_charts_enso(container_id, tempRes) {
    const query = expand_analysis_query_enso(tempRes);
    if (!query) {
        return false;
    }

    // storename not used yet
    // will be used to choose 
    // between line or bar plot
    let storename = null;
    // if (!query.imgPNG) {
    //     if (['oni', 'iod', 'nao', 'atl3', 'anom'].includes(query.teleconIndex)) {
    //         storename = 'ts_enso';
    //     }
    // }

    ajaxDisplayChart(
        '/climate_analysis_enso',
        query,
        expand_analysis_display_enso,
        container_id,
        storename
    );
}

function expand_analysis_display_enso(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    if (json.imgPNG) {
        var img = $('<img>', {
            id: `enso-${json.teleconIndex}`,
            src: json.png
        }).appendTo(divCont);

        img.css({
            'width': '100%',
            'height': '100%',
            'object-fit': 'cover'
        });
        showRangeselector(container, false);
        toggleChartSettingsButton(container, false);
    } else {
        toggleChartSettingsButton(container, true);
        let xaxisHoverText;
        if (json.time_res === 'seasonal-enso') {
            xaxisHoverText = json.time.map((t) => {
                return formatPlotlyHoverDateEnso(
                    t, json.time, json.year, json.season
                );
            });
        } else {
            xaxisHoverText = json.time.map((t) => {
                return formatPlotlyHoverDate(t, json.time_res);
            });
        }

        // 
        let yup = [];
        for (let y = 0; y < json.ymax + json.ytick; y += json.ytick) {
            yup.push(Number(y.toFixed(10)));
        }
        if (yup.length > 8) {
            const yup1 = yup.filter(y => y <= json.thres);
            let yup2 = yup.filter(y => y > json.thres);
            yup2 = yup2.filter((_, i) => i % 2 === 1);
            yup = yup1.concat(yup2);
        }
        const ylow = yup.slice(1).reverse().map(y => -y);
        const yticks = ylow.concat(yup);

        // 
        const x = json.time.map(d => new Date(d));
        const xlim = json.time_res === 'weekly' ? 0 : 1;
        const xmin = addDateMonths(new Date(Math.min(...x)), -xlim);
        const xmax = addDateMonths(new Date(Math.max(...x)), xlim);


        const pwidth = getChartWidth(container);
        const pheight = getChartHeight(container);

        // 
        const data = [{
            x: json.time,
            y: json.values,
            name: json.name,
            units: json.units,
            type: 'scatter',
            mode: 'lines',
            line: { color: 'black', width: 1.5 },
            customdata: xaxisHoverText,
            hovertemplate: 'Date: %{customdata}<br> %{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }];

        var enso_rangeslider = {
            visible: true,
            thickness: 0.04,
            borderwidth: 1,
            bordercolor: 'gray',
            bgcolor: 'lightgray'
        };

        var enso_config = {
            responsive: true,
            displaylogo: false,
            displayModeBar: false,
        };

        var layout = {
            width: pwidth,
            height: pheight,
            autosize: true,
            margin: { t: 10, b: 50, l: 80, r: 20 },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white',

            xaxis: {
                type: 'date',
                range: [xmin, xmax],
                rangeslider: enso_rangeslider,
                automargin: true,
                showgrid: true,
                ticks: 'outside',
                ticklen: 6,
                gridcolor: 'lightgray',
                showline: true,
                linecolor: 'black',
                linewidth: 1,
                mirror: true,
            },
            yaxis: {
                range: [-json.ymax, json.ymax],
                tickvals: yticks,
                ticks: 'outside',
                ticklen: 6,
                fixedrange: true,
                showgrid: true,
                gridcolor: 'lightgray',
                showline: true,
                linecolor: 'black',
                linewidth: 1,
                mirror: true,
                title: {
                    text: json.ylab,
                    font: { size: 13 }
                }
            },
            // 
            shapes: [{
                    type: 'rect',
                    xref: 'x',
                    yref: 'y',
                    x0: xmin,
                    x1: xmax,
                    y0: json.thres,
                    y1: json.ymax,
                    fillcolor: 'mistyrose',
                    line: { width: 0 },
                    layer: 'below'
                },
                {
                    type: 'rect',
                    xref: 'x',
                    yref: 'y',
                    x0: xmin,
                    x1: xmax,
                    y0: -json.ymax,
                    y1: -json.thres,
                    fillcolor: 'lavender',
                    line: { width: 0 },
                    layer: 'below'
                },
                {
                    type: 'line',
                    xref: 'x',
                    yref: 'y',
                    x0: xmin,
                    x1: xmax,
                    y0: json.thres,
                    y1: json.thres,
                    line: {
                        color: 'red',
                        width: 1,
                        dash: 'dash'
                    }
                },
                {
                    type: 'line',
                    xref: 'x',
                    yref: 'y',
                    x0: xmin,
                    x1: xmax,
                    y0: -json.thres,
                    y1: -json.thres,
                    line: {
                        color: 'blue',
                        width: 1,
                        dash: 'dash'
                    }
                },
                {
                    type: 'line',
                    xref: 'x',
                    yref: 'y',
                    x0: xmin,
                    x1: xmax,
                    y0: 0,
                    y1: 0,
                    line: {
                        color: 'gray',
                        width: 0.7
                    }
                }
            ]
        };

        purgePlotlyChart(container);
        Plotly.newPlot(
            container,
            data,
            layout,
            enso_config
        );

        resizePlotlyChart(container);

        //// add range selector
        const last_date = new Date(json.time[json.time.length - 1]);
        const ranges = ['1Y', '5Y', '10Y', '15Y', '20Y', '30Y', 'ALL'];
        addRangeselector(container, ranges, last_date)
    }
}

///////

function expand_analysis_query_telecon(tempRes, cType) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.chartType = `telecon-${cType}`;
    query.temporalRes = tempRes;
    query.minFrac = 0.95;

    query.variable = $(`#${tempRes}-${cType}-variable`).val();
    query.climVariable = $(`#${tempRes}-${cType}-clim-variable`).val();

    query.dataset = DATA_SET.use;
    query.inputData = DATA_SET.timeres;

    query.teleconIndex = $(`#${tempRes}-${cType}-index-telecon`).val();

    query.startYear = parseInt($(`#${tempRes}-${cType}-startdate-calendar`).val(), 10);
    query.endYear = parseInt($(`#${tempRes}-${cType}-enddate-calendar`).val(), 10);
    query.seasStart = parseInt($(`#${tempRes}-${cType}-startmon-calendar`).val(), 10);
    query.seasLength = parseInt($(`#${tempRes}-${cType}-seaslen`).val(), 10);

    return query;
}

///////

function expand_analysis_telecon_tseries(container_id, tempRes) {
    const query = expand_analysis_query_telecon(tempRes, 'tseries');
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_telecon_ts',
        query,
        expand_telecon_display_tseries,
        container_id
    );
}

function expand_telecon_display_tseries(json, container) {
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

    const ylab = `${json.info.var.name} (${json.info.var.units})`;

    const data = [{
            x: xdata,
            y: ydata,
            name: json.info.var.name,
            units: json.info.var.units,
            type: 'bar',
            marker: {
                color: barColors
            },

            customdata: json.classes,
            width: 0.7,
            hovertemplate: `%{data.name}: %{y:.2f} %{data.units} <extra></extra>`,
            showlegend: false
        },

        ...Object.entries(json.info.classes).map(([key, name]) => ({
            x: [null],
            y: [null],
            type: 'bar',
            name: name,
            marker: {
                color: barcol[Number(key)]
            },
            meta: { categoryKey: key },
            showlegend: true
        })),
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
            hovertemplate: 'Tercile 1: %{y:.1f}<extra></extra>'
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
            hovertemplate: 'Tercile 2: %{y:.1f}<extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: xlim_data,
            tickformat: 'd',
            dtick: 5,
            ticks: 'outside',
            ticklen: 8,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            griddash: 'dot'
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            tickformat: '.1f',
            ticks: 'outside',
            ticklen: 8,
            title: {
                text: ylab
            },
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.5,
            gridcolor: 'lightgray',
            griddash: 'dot'
        },
        legend: {
            title: {
                text: json.info.legend_title
            }
        },
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme),
        width: getChartWidth(container),
        height: getChartHeight(container)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(expand_layout, layout);
    layout.margin.l = 80;
    layout.print_legend = 'telecon';

    purgePlotlyChart(container);
    Plotly.newPlot(container, data, layout, plotly_config);
    setPlotlyThemeColors(container);
    resizePlotlyChart(container);
}

///////

function expand_analysis_telecon_proba(container_id, tempRes) {
    const query = expand_analysis_query_telecon(tempRes, 'proba');
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_analysis_telecon_ts',
        query,
        expand_telecon_display_proba,
        container_id
    );
}

function expand_telecon_display_proba(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const col_allyears = plotly_themecolors[theme].fontcolor;
    const linecol = ['blue', 'gray', 'red', col_allyears];

    const xlab = `${json.info.var.name} (${json.info.var.units})`;
    const ylab = 'Probability of exceeding';
    const yTicks = [0, 20, 40, 60, 80, 100];

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
            ticks: 'outside',
            ticklen: 8,
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
            },
            title: {
                text: xlab
            }
        },
        yaxis: {
            range: [0, 100],
            tickmode: 'array',
            tickvals: yTicks,
            ticktext: yTicks.map(v => `${v}%`),
            ticks: 'outside',
            ticklen: 8,
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
            title: {
                text: ylab
            }
        },
        legend: {
            title: {
                text: json.info.legend_title
            }
        },
        width: getChartWidth(container),
        height: getChartHeight(container),
        margin: { l: 80, r: 190, t: 10, b: 70 },
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout = deepMerge(setPlotlyColors(), layout);

    layout = deepMerge(expand_layout, layout);
    layout.print_legend = 'telecon';
    layout.chart_type = 'telecon-proba';

    purgePlotlyChart(container);
    Plotly.newPlot(container, data, layout, plotly_config);
    setPlotlyThemeColors(container);
    resizePlotlyChart(container);

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

function expand_rainy_season_query(tempRes, chartType) {
    const prefix = `${tempRes}-${chartType}`;
    let query = new Object();

    query.startMonthO = parseInt($(`#${prefix}-onset-start-mon`).val(), 10);
    query.startDayO = parseInt($(`#${prefix}-onset-start-day`).val(), 10);
    query.searchDaysO = parseInt($(`#${prefix}-onset-search-day`).val(), 10);
    query.rainTotalO = Number($(`#${prefix}-onset-rain-tot`).val());
    query.numberDaysO = parseInt($(`#${prefix}-onset-nb-days`).val(), 10);
    query.minNbDaysO = parseInt($(`#${prefix}-onset-min-day`).val(), 10);
    query.drySpellO = parseInt($(`#${prefix}-onset-dryspell`).val(), 10);
    query.drySpellDaysO = parseInt($(`#${prefix}-onset-dryspell-day`).val(), 10);

    query.rainThres = Number($(`#${prefix}-onset-rainy-day-thres`).val());

    query.startMonthC = parseInt($(`#${prefix}-cessation-start-mon`).val(), 10);
    query.startDayC = parseInt($(`#${prefix}-cessation-start-day`).val(), 10);
    query.searchDaysC = parseInt($(`#${prefix}-cessation-search-day`).val(), 10);
    query.waterBalanceC = Number($(`#${prefix}-cessation-water-balance`).val());
    query.numberDaysC = parseInt($(`#${prefix}-cessation-number-day`).val(), 10);

    query.interpolate = false;
    query.minFrac = 0.75;
    query.rmIsolatedPix = false;

    return query;
}

///////

function expand_agri_rseason_query_series(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-series-variable`).val();

    query.rainy_season = expand_rainy_season_query(tempRes, 'series');

    return query;
}

function expand_agri_rseason_charts_series(container_id, tempRes) {
    const query = expand_agri_rseason_query_series(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_series',
        query,
        expand_agri_rseason_display_series,
        container_id
    );
}

function expand_agri_rseason_display_series(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const xdata = json.time;
    const ydata = json.values;
    const timeres = json.info.time_res;
    const vname = json.info.var.name;
    const vunit = json.info.var.units;
    const ylab = vunit === '' ? vname : `${vname} (${vunit})`;
    const xlim = [
        Math.min(...xdata) - 1,
        Math.max(...xdata) + 1
    ];
    const ylim = json.yrange;
    const yticks = json.yticks;
    const yticktext = formatTickTextRainySeason(
        json.yticks, json.start[0], json.info.var
    );


    const isDateVariable = ['onset', 'cessation'].includes(json.info.var.type);
    let formatY = value => value;
    if (isDateVariable) {
        const start = json.start.find(value => value !== null);
        if (start !== undefined) {
            const [year, month, day] = start.split('-').map(Number);
            const startTime = Date.UTC(year, month - 1, day);
            formatY = value => new Date(startTime + value * 86400000);
        }
    }

    const xaxisHoverText = xdata.map((x) => {
        return formatPlotlyHoverDateRainySeason(
            x, xdata, ydata, json.start, json.info.var
        );
    });

    function formatSummaryHover(trace) {
        if (['onset', 'cessation'].includes(json.info.var.type)) {
            const start = json.start.find(value => value !== null);
            if (start !== undefined) {
                const [, month, day] = start.split('-').map(Number);
                trace.customdata = trace.x.map((year, index) => {
                    const date = new Date(Date.UTC(year, month - 1, day));
                    date.setUTCDate(date.getUTCDate() + trace.y[index]);
                    return date;
                });
                trace.hovertemplate =
                    '%{data.name} (%{x}, %{customdata|%b-%d})' +
                    '<extra></extra>';
            }
        } else if (json.info.var.type === 'length') {
            trace.hovertemplate =
                '%{data.name} (%{x}, %{y:.0f})<extra></extra>';
        }

        return trace;
    }

    function makeMainTrace(plotType) {
        const base = {
            x: xdata,
            y: ydata,
            name: vname,
            units: vunit,
            customdata: xaxisHoverText,
            hovertemplate: '%{customdata}<extra></extra>'
        };

        if (plotType === 'line') {
            return {
                ...base,
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: '#dc3545',
                    width: 3
                }
            };
        }

        if (plotType === 'lpoint') {
            return {
                ...base,
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                    color: '#dc3545',
                    width: 3
                },
                marker: {
                    color: '#fd7e14',
                    line: {
                        color: '#dc3545',
                        width: 1
                    },
                    size: 8
                }
            };
        }

        return {
            ...base,
            type: 'bar',
            marker: {
                color: '#dc3545'
            }
        };
    }

    // Regression line
    function makeTrendTrace() {
        const regX = xlim;
        const areg = json.coeffs.slope;
        const breg = json.coeffs.intercept;
        const regY = regX.map(x => breg + areg * x);

        return formatSummaryHover({
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
        });
    }

    function makeReferenceTraces() {
        const traces = [];

        if ($(`#${timeres}-series-plot-mean`).is(':checked')) {
            traces.push({
                x: xlim,
                y: [json.stats.mean, json.stats.mean],
                type: 'scatter',
                mode: 'lines',
                name: 'Mean',
                line: {
                    color: '#6610f2',
                    width: 4
                }
            });
        }

        if ($(`#${timeres}-series-plot-median`).is(':checked')) {
            traces.push({
                x: xlim,
                y: [json.stats.median, json.stats.median],
                type: 'scatter',
                mode: 'lines',
                name: 'Median',
                line: {
                    color: '#fd7e14',
                    width: 4
                }
            });
        }

        if ($(`#${timeres}-series-plot-terciles`).is(':checked')) {
            traces.push({
                x: xlim,
                y: [json.stats.tercile1, json.stats.tercile1],
                type: 'scatter',
                mode: 'lines',
                name: 'Lower tercile',
                line: {
                    color: '#198754',
                    width: 4
                }
            });

            traces.push({
                x: xlim,
                y: [json.stats.tercile2, json.stats.tercile2],
                type: 'scatter',
                mode: 'lines',
                name: 'Upper tercile',
                line: {
                    color: '#0a3622',
                    width: 4
                }
            });
        }

        return traces.map(formatSummaryHover);
    }

    function drawPlot() {
        const plotType = $(`#${timeres}-series-plot-type`).val();
        const showTrend = $(`#${timeres}-series-plot-trend`).is(':checked');
        const traces = [makeMainTrace(plotType)];

        if (showTrend & json.coeffs !== null) {
            traces.push(makeTrendTrace());
        }

        if (json.stats !== null) {
            traces.push(...makeReferenceTraces());
        }


        traces.forEach(trace => {
            if (Array.isArray(trace.y)) {
                trace.y = trace.y.map(formatY);
            }
        });

        var layout = {
            xaxis: {
                range: xlim,
                ticks: 'outside',
                ticklen: 8,
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.5,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            yaxis: {
                range: ylim.map(formatY),
                tickvals: yticks.map(formatY),
                ticktext: yticktext,
                ticks: 'outside',
                ticklen: 8,
                title: {
                    text: ylab
                },
                fixedrange: true,
                showline: true,
                showgrid: true,
                gridwidth: 0.5,
                gridcolor: 'lightgray',
                griddash: 'dot'
            },
            showlegend: false,
            bargap: 0.15,
            width: getChartWidth(container),
            height: getChartHeight(container)
        };


        layout.margin = { t: 10, b: 85, l: 80, r: 10 };
        layout.print_legend = 'rainy_season';
        layout = deepMerge(setPlotlyColors(), layout);
        layout = deepMerge(expand_layout, layout);

        purgePlotlyChart(container);
        Plotly.newPlot(
            container,
            traces,
            layout,
            plotly_config
        );

        setPlotlyThemeColors(container);
        resizePlotlyChart(container);
    }

    ////
    drawPlot();

    $(`#${timeres}-series-plot-type`)
        .off('change.chartRSeason')
        .on('change.chartRSeason', drawPlot);

    $(`.${timeres}-series-plot`)
        .off('change.chartRSeason')
        .on('change.chartRSeason', drawPlot);
}

///////

function expand_agri_rseason_query_proba(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-proba-variable`).val();

    query.rainy_season = expand_rainy_season_query(tempRes, 'proba');

    return query;
}

function expand_agri_rseason_charts_proba(container_id, tempRes) {
    const query = expand_agri_rseason_query_proba(tempRes);
    if (!query) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_proba',
        query,
        expand_agri_rseason_display_proba,
        container_id
    );
}

function expand_agri_rseason_display_proba(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    divCont.closest('.modal-content').css('width', '60%');
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

    const time_res = json.info.time_res;
    const c1 = `${time_res}-proba-plot-cdf-empirical`;
    const cdfE = $(`#${c1}`).is(':checked');
    const c2 = `${time_res}-proba-plot-cdf-smoothed`;
    const cdfS = $(`#${c2}`).is(':checked');

    const data = [{
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
            visible: cdfE,
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        },
        {
            x: json.cdf.smoothed.x.map(formatX),
            y: json.cdf.smoothed.y,
            mode: 'lines',
            name: 'Smoothed CDF',
            units: '%',
            line: {
                color: '#1e90ff',
                width: 3
            },
            visible: cdfS,
            hovertemplate: '%{data.name}: %{y:.1f} %{data.units} <extra></extra>'
        }
    ];

    var layout = {
        xaxis: {
            range: json.xrange.map(formatX),
            tickvals: json.xticks.map(formatX),
            ticktext: xticktext,
            ticks: 'outside',
            ticklen: 8,
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
            },
            title: {
                text: json.info.labels.x
            }
        },
        yaxis: {
            range: [0, 100],
            ticks: 'outside',
            ticklen: 8,
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
            },
            title: {
                text: json.info.labels.y
            }
        },
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout.margin = { t: 10, b: 70, l: 70, r: 10 };
    layout.print_legend = 'probability';
    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(expand_layout, layout);

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        plotly_config
    );

    setPlotlyThemeColors(container);
}

///////

function expand_agri_rseason_query_anom(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${tempRes}-anom-variable`).val();

    query.rainy_season = expand_rainy_season_query(tempRes, 'anom');

    return query;
}

function expand_agri_rseason_charts_anom(container_id, tempRes) {
    const query = expand_agri_rseason_query_anom(tempRes);
    if (!query) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_anom',
        query,
        expand_agri_rseason_display_anom,
        container_id
    );
}

function expand_agri_rseason_display_anom(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

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
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            rangeslider: plotly_rangeslider,
            ticks: 'outside',
            ticklen: 8,
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            ticks: 'outside',
            ticklen: 8,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            title: {
                text: `${json.info.var.name} [${json.info.var.units}]`,
            },
        },
        width: getChartWidth(container),
        height: getChartHeight(container)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(expand_layout, layout);
    layout.xaxis.rangeslider.bgcolor = defColors.positive;

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        plotly_config
    );

    //// add range selector
    const last_year = json.time[json.time.length - 1];
    const ranges = ['10Y', '15Y', '20Y', '30Y', 'ALL'];
    addRangeselector(container, ranges, last_year, 'year')

    setPlotlyThemeColors(container);
    resizePlotlyChart(container);
}

///////

function expand_agri_cropsuit_query(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;
    query.mapPage = URL_ARGS.page;
    query.minFrac = 0.95;
    query.variable = 'suitability';

    query.startMonth = parseInt($(`#${tempRes}-cs-ts-start-mon`).val(), 10);
    query.startDay = parseInt($(`#${tempRes}-cs-ts-start-day`).val(), 10);
    query.endMonth = parseInt($(`#${tempRes}-cs-ts-end-mon`).val(), 10);
    query.endDay = parseInt($(`#${tempRes}-cs-ts-end-day`).val(), 10);

    query.precipLow = Number($(`#${tempRes}-cs-ts-precip-low`).val());
    query.precipHigh = Number($(`#${tempRes}-cs-ts-precip-high`).val());
    query.tempLow = Number($(`#${tempRes}-cs-ts-temp-low`).val());
    query.tempHigh = Number($(`#${tempRes}-cs-ts-temp-high`).val());
    query.tempOptim = Number($(`#${tempRes}-cs-ts-temp-optim`).val());
    query.nbWetDays = parseInt($(`#${tempRes}-cs-ts-nb-wetdays`).val(), 10);
    query.rainThres = Number($(`#${tempRes}-cs-ts-rain-thres`).val());

    return query;
}

function expand_agri_cropsuit_charts(container_id, tempRes) {
    const query = expand_agri_cropsuit_query(tempRes);
    if (!query) {
        return false;
    }

    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/agriculture_analysis_cropsuit',
        query,
        expand_agri_cropsuit_display,
        container_id
    );
}

function expand_agri_cropsuit_display(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();

    const scoreColors = [
        '#8b4513', '#f28e2b', '#f1ce3e',
        '#98d594', '#31a354', '#006d2c'
    ];
    const barValues = json.values.map(value => {
        if (value === null) {
            return null;
        }
        return value === 0 ? 0.08 : value;
    });
    const barColors = json.values.map(value => {
        return value === null ? '#6c757d' : scoreColors[value];
    });

    const data = [{
        x: json.time,
        y: barValues,
        customdata: json.values,
        type: 'bar',
        name: json.info.var.name,
        marker: {
            color: barColors,
            line: {
                width: 0
            }
        },
        hovertemplate: 'Year: %{x}<br>%{data.name}: %{customdata:.0f}' +
            '<extra></extra>'
    }];

    let layout = {
        xaxis: {
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            rangeslider: plotly_rangeslider,
            ticks: 'outside',
            ticklen: 8,
            title: {
                text: 'Year'
            }
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            ticks: 'outside',
            ticklen: 8,
            fixedrange: true,
            showline: true,
            showgrid: true,
            gridwidth: 0.3,
            griddash: 'dot',
            title: {
                text: 'Suitability index'
            }
        },
        showlegend: false,
        bargap: 0.15,
        width: getChartWidth(container),
        height: getChartHeight(container)
    };

    layout = deepMerge(setPlotlyColors(), layout);
    layout = deepMerge(expand_layout, layout);
    layout.xaxis.rangeslider.bgcolor = '#198754';

    purgePlotlyChart(container);
    Plotly.newPlot(
        container,
        data,
        layout,
        plotly_config
    );

    const lastYear = json.time[json.time.length - 1];
    const ranges = ['10Y', '15Y', '20Y', '30Y', 'ALL'];
    addRangeselector(container, ranges, lastYear, 'year');

    setPlotlyThemeColors(container);
    resizePlotlyChart(container);
}

///////

function expand_analysis_query_cumul(tempRes) {
    let query = queryParamsSpatialAverage();
    if (!query) {
        return query;
    }

    query.temporalRes = tempRes;
    query.dataset = DATA_SET.use;

    query.chart_variable = $(`#${tempRes}-chart-cumul-variable`).val();
    query.variable = DATA_SET.variables[query.chart_variable][0];

    const start_date = $(`#${tempRes}-chart-cumul-startdate-calendar`).val();
    const end_date = $(`#${tempRes}-chart-cumul-enddate-calendar`).val();
    if (!checkDatesCumul(start_date, end_date)) {
        return false;
    }
    query.startDate = analysis_query_format_date(
        start_date, tempRes
    );
    query.endDate = analysis_query_format_date(
        end_date, tempRes
    );

    query.startYear = parseInt($(`#${tempRes}-chart-cumul-bp-start`).val().trim(), 10);
    query.endYear = parseInt($(`#${tempRes}-chart-cumul-bp-end`).val().trim(), 10);
    query.minYear = parseInt($(`#${tempRes}-chart-cumul-bp-min`).val().trim(), 10);

    return query;
}

function expand_analysis_charts_cumul(container_id, tempRes) {
    const query = expand_analysis_query_cumul(tempRes);
    if (!query) {
        return false;
    }
    if (checkQueryPointOutside(query, tempRes)) {
        return false;
    }

    ajaxDisplayChart(
        '/climate_monitoring_cumul',
        query,
        expand_analysis_display_cumul,
        container_id
    );
}

function expand_analysis_display_cumul(json, container) {
    const divCont = $(`#${container}`);
    divCont.empty();
    const theme = $('html').attr('data-bs-theme');

    const percentileLegend = {
        x: [null],
        y: [null],
        type: 'scatter',
        mode: 'markers',

        marker: {
            color: 'gray',
            size: 12,
            symbol: 'square'
        },

        name: '5th–95th Percentile',
        hoverinfo: 'skip'
    };

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

    const data = [
        percentileLegend,
        {
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
            showlegend: false,
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
            showlegend: false,
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
            },
            ticks: 'outside',
            ticklen: 8
        },
        yaxis: {
            range: json.yrange,
            tickvals: json.yticks,
            showgrid: true,
            gridwidth: 0.5,
            griddash: 'dot',
            gridcolor: 'lightgray',
            showline: true,
            linecolor: plotly_themecolors[theme].fontcolor,
            ticks: 'outside',
            ticklen: 8,
            title: {
                text: `${json.info.var.name} [${json.info.var.units}]`,
            },
        },
        shapes: shapes,
        showlegend: true,
        hovermode: 'x unified',
        hoverlabel: hoverlabelColors(theme)
    };

    layout.margin = { t: 10, b: 60, l: 60, r: 10 };
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