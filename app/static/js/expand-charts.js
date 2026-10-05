function alwaysFloatAxis(axisName) {
    return axis => (axis === axisName ? 'float' : null);
}


function parameterDrivenAxis(axisName, variableSelId, parametersSelId) {
    return function(axis) {
        if (axis !== axisName) {
            return null;
        }
        if (!parametersSelId) {
            return 'float';
        }
        const variable = $(`#${variableSelId}`).val();
        const paramKey = $(`#${parametersSelId}`).val();
        // const param = (typeof PARAMS_LIST !== 'undefined') && PARAMS_LIST[variable]?.[paramKey];
        // return param?.dtype === 'integer' ? { kind: 'integer', unit: param.unit } : 'float';
        const param = (typeof PARAMS_LIST !== 'undefined' && PARAMS_LIST[variable] != null) ? PARAMS_LIST[variable][paramKey] : undefined;
        return param != null && param.dtype === 'integer' ? { kind: 'integer', unit: param.unit } : 'float';
    };
}

function yearIndexAxis(axisName) {
    return axis => (axis === axisName ? 'year' : null);
}


function combineAxisResolvers(...resolvers) {
    return axis => {
        for (const resolver of resolvers) {
            const kind = resolver(axis);
            if (kind) {
                return kind;
            }
        }
        return null;
    };
}

function makeCaseKeyResolver(...selectIds) {
    // return () => selectIds.map(id => $(`#${id}`).val() ?? '').join('|');
    return () => selectIds
        .map(id => {
            const value = $(`#${id}`).val();
            return value == null ? '' : value;
        })
        .join('|');
}

function setAnalysisExpandModalRaw(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expand_analysis_charts_rawdata,
        tempRes,
        '',
        undefined,
        alwaysFloatAxis('yaxis'),
        makeCaseKeyResolver(
            `${tempRes}-chart-raw-variable`,
            `${tempRes}-chart-raw-series`,
            `${tempRes}-chart-raw-plot-type`
        )
    );
    purgePlotlyChartExpandModal(contID);

    setAnalysisDateCalendarRaw(tempRes);
    setNamesCalendar(
        `${tempRes}-chart-raw-startmonth`,
        'monthly',
        $(`#${tempRes}-raw-control`),
        mapNavigation = false
    );

    if (tempRes === 'seasonal') {
        const variable = $(`#${tempRes}-chart-raw-variable`).val();
        const temp_cov = getTempCoverageCalendar(
            DATA_SET.use, tempRes, variable
        );
        const mon = -1 * SEASON_DEF.months.length + 1;
        const disp_d = addDateMonths(temp_cov.end, mon);
        const dispDate = formatDateToString(disp_d);
        const start_mon = parseInt(dispDate.split('-')[1], 10);

        setClimateSeasonStartLengthExpand(
            tempRes, 'chart-season', 'raw', start_mon
        );
    }

    //
    const contChart = `container-chart-${contID}`;

    const updateRawSeriesControls = () => {
        if ($(`#${tempRes}-chart-raw-series`).val() === 'one') {
            $(`#${tempRes}-chart-raw-startmonth-list`).hide();
            $(`#${tempRes}-chart-raw-plot-type-cont`).show();
        } else {
            $(`#${tempRes}-chart-raw-startmonth-list`).show();
            $(`#${tempRes}-chart-raw-plot-type-cont`).hide();
        }
    };
    updateRawSeriesControls();

    $(`#${tempRes}-chart-raw-series`)
        .off('change.chartTsRaw')
        .on('change.chartTsRaw', function() {
            updateRawSeriesControls();
            maproomDB.getData('ts_rawdata', function(data) {
                expand_analysis_display_rawdata(data, contChart);
            });
        });

    $(`#${tempRes}-chart-raw-variable`)
        .off('change.chartTsRaw')
        .on('change.chartTsRaw', function() {
            expand_analysis_charts_rawdata(contChart, tempRes);
        });

    $(`#${tempRes}-chart-raw-plot-type`)
        .off('change.chartTsRaw')
        .on('change.chartTsRaw', function() {
            maproomDB.getData('ts_rawdata', function(data) {
                expand_analysis_display_rawdata(data, contChart);
            });
        });

    $(`#${tempRes}-chart-raw-startmonth-calendar`)
        .off('change.chartTsRaw')
        .on('change.chartTsRaw', function() {
            maproomDB.getData('ts_rawdata', function(data) {
                expand_analysis_display_rawdata(data, contChart);
            });
        });

    if (tempRes === 'seasonal') {
        $(`#${tempRes}-chart-season-startmon`)
            .off('change.chartTsRaw')
            .on('change.chartTsRaw', function() {
                expand_analysis_charts_rawdata(contChart, tempRes);
            });

        $(`#${tempRes}-chart-season-seaslen`)
            .off('change.chartTsRaw')
            .on('change.chartTsRaw', function() {
                expand_analysis_charts_rawdata(contChart, tempRes);
            });
    }

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartTsRaw')
        .on('click.chartTsRaw', function() {
            expand_analysis_charts_rawdata(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartTsRaw')
        .on('click.chartTsRaw', function() {
            downloadPlotlyImageJPG(contChart);
        });
}

function setAnalysisExpandModalClim(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expand_analysis_charts_climato,
        tempRes,
        '',
        undefined,
        combineAxisResolvers(alwaysFloatAxis('yaxis'), alwaysFloatAxis('yaxis2')),
        makeCaseKeyResolver(
            `${tempRes}-chart-clim-variable`,
            `${tempRes}-chart-clim-charts`
        ),
        ['year']
    );
    purgePlotlyChartExpandModal(contID);

    // 
    const contChart = `container-chart-${contID}`;

    const updateClimatoChartControls = () => {
        if ($(`#${tempRes}-chart-clim-charts`).val() === 'one') {
            $(`#${tempRes}-chart-clim-variable-cont`).show();
        } else {
            $(`#${tempRes}-chart-clim-variable-cont`).hide();
        }
    };
    updateClimatoChartControls();

    $(`#${tempRes}-chart-clim-charts`)
        .off('change.chartTsClim')
        .on('change.chartTsClim', function() {
            updateClimatoChartControls();
            expand_analysis_charts_climato(contChart, tempRes);
        });

    $(`#${tempRes}-chart-clim-variable`)
        .off('change.chartTsClim')
        .on('change.chartTsClim', function() {
            expand_analysis_charts_climato(contChart, tempRes);
        });

    // set base period
    setBoxDialog(
        `${tempRes}-chart-clim-bp`,
        `${tempRes}-chart-clim-bp-open`
    );

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartTsClim')
        .on('click.chartTsClim', function() {
            expand_analysis_charts_climato(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartTsClim')
        .on('click.chartTsClim', function() {
            downloadPlotlyImageJPG(contChart);
        });
}


const ANOM_DISALLOWED_TICK_UNITS = {
    monthly: ['day', 'week'],
    dekadal: ['day'],
    seasonal: ['day', 'week', 'month']
};

function setAnalysisExpandModalAnom(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expand_analysis_charts_anomaly,
        tempRes,
        '',
        anomalySignColorsModule,
        alwaysFloatAxis('yaxis'),
        makeCaseKeyResolver(
            `${tempRes}-anom-variable`,
            `${tempRes}-chart-anom-type`
        ),
        ANOM_DISALLOWED_TICK_UNITS[tempRes] || []
    );
    purgePlotlyChartExpandModal(contID);

    let disp_year = false;
    if (tempRes === 'seasonal') {
        disp_year = true;
    }
    setAnalysisDateCalendarSeasonal(
        tempRes, 'chart-anom', 'anom', disp_year
    );
    setNamesCalendar(
        `${tempRes}-chart-anom-tstep`,
        tempRes,
        $(`#${tempRes}-anom-control`),
        mapNavigation = false
    );

    // 
    if (tempRes === 'seasonal') {
        setClimateSeasonLengthExpand(
            tempRes, 'chart-anom-seaslen'
        );
    }

    //
    const contChart = `container-chart-${contID}`;

    const updateAnomalySeriesControls = () => {
        if ($(`#${tempRes}-chart-anom-series`).val() === 'one') {
            $(`#${tempRes}-chart-anom-tstep-list`).hide();
        } else {
            $(`#${tempRes}-chart-anom-tstep-list`).show();
        }
    };
    updateAnomalySeriesControls();

    $(`#${tempRes}-chart-anom-series`)
        .off('change.chartTsAnom')
        .on('change.chartTsAnom', function() {
            updateAnomalySeriesControls();
            maproomDB.getData('ts_anomaly', function(data) {
                expand_analysis_display_anomaly(data, contChart);
            });
        });

    $(`#${tempRes}-anom-variable`)
        .off('change.chartTsAnom')
        .on('change.chartTsAnom', function() {
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    //
    $(`#${tempRes}-chart-anom-type`)
        .off('change.chartTsAnom')
        .on('change.chartTsAnom', function() {
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    $(`#${tempRes}-chart-anom-tstep-calendar`)
        .off('change.chartTsAnom')
        .on('change.chartTsAnom', function() {
            maproomDB.getData('ts_anomaly', function(data) {
                expand_analysis_display_anomaly(data, contChart);
            });
        });

    // 
    if (tempRes === 'seasonal') {
        $(`#${tempRes}-chart-anom-seaslen`)
            .off('change.chartTsAnom')
            .on('change.chartTsAnom', function() {
                expand_analysis_charts_anomaly(contChart, tempRes);
            });
    }

    // set base period
    setBoxDialog(
        `${tempRes}-chart-anom-bp`,
        `${tempRes}-chart-anom-bp-open`
    );

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartTsAnom')
        .on('click.chartTsAnom', function() {
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartTsAnom')
        .on('click.chartTsAnom', function() {
            downloadPlotlyImageJPG(contChart);
        });
}

function setAnalysisExpandModalDailyAnom(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expand_analysis_charts_anomaly,
        tempRes,
        '',
        anomalySignColorsModule,
        alwaysFloatAxis('yaxis'),
        makeCaseKeyResolver(
            `${tempRes}-anom-variable`,
            `${tempRes}-anom-parameters`,
            `${tempRes}-chart-anom-type`
        )
    );
    purgePlotlyChartExpandModal(contID);

    setAnalysisDateCalendarSeasonal(
        tempRes, 'chart-anom', 'anom', true
    );
    setAnalysisDateCalendarMonDay(tempRes, 'anom');

    // 
    const contChart = `container-chart-${contID}`;

    $(`#${tempRes}-anom-variable`)
        .off('change.chartTsAnoma')
        .on('change.chartTsAnoma', function() {
            const this_var = $(this).val();
            $(`#${tempRes}-anom-parameters`).empty();
            for (const item of PARAMS_ORDER[this_var]) {
                $(`#${tempRes}-anom-parameters`).append(
                    $('<option>').val(item)
                    .text(PARAMS_LIST[this_var][item].select)
                );
                setAnalysisParamsDefDaily(tempRes, 'anom');
            }
            //
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    //
    $(`#${tempRes}-anom-parameters`)
        .off(`change.chartTsAnoma`)
        .on(`change.chartTsAnoma`, function() {
            setAnalysisParamsDefDaily(tempRes, 'anom');
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    $(`#${tempRes}-chart-anom-type`)
        .off('change.chartTsAnoma')
        .on('change.chartTsAnoma', function() {
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    // set base period
    setBoxDialog(
        `${tempRes}-chart-anom-bp`,
        `${tempRes}-chart-anom-bp-open`
    );

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartTsAnom')
        .on('click.chartTsAnom', function() {
            expand_analysis_charts_anomaly(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartTsAnom')
        .on('click.chartTsAnom', function() {
            downloadPlotlyImageJPG(contChart);
        });

    // setPlotlyChartSettingsDialog(contID, contChart, test_climate_analysis_season_daily);
}

function setProbaPlotContainer(data, container) {
    const divCont = $(`#${container}`);
    const divRow = $('<div>')
        .addClass('row flex-nowrap h-100')
        .appendTo(divCont);

    const cont_plot = `${container}-plot`;
    $('<div>')
        .attr('id', cont_plot)
        .addClass('col-md-8')
        .css({
            'width': '75%',
            'height': '100%'
        })
        .appendTo(divRow);

    const div_distr = `${container}-distr-div`;
    const divDistr = $('<div>')
        .attr('id', div_distr)
        .addClass('col-md-4 m-2 p-2')
        .css({
            'width': '22%',
            'height': '84%',
            'border': '1px solid #d0d7de'
        })
        .appendTo(divRow);

    $('<h5>')
        .appendTo(divDistr)
        .text('Fitted Distribution');

    const frmtJson = JSON.stringify(
        data.info.proba, null, 2
    );
    const pre_distr = `${container}-distr-pre`;
    $('<pre>')
        .attr('id', pre_distr)
        .appendTo(divDistr)
        .text(frmtJson);

    divDistr.hide();

    return cont_plot
}

function setAnalysisExpandModalProba(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    const probaCaseKeySelectors = [`${tempRes}-proba-variable`];
    if (tempRes === 'daily') {
        probaCaseKeySelectors.push(`${tempRes}-proba-parameters`);
    }
    probaCaseKeySelectors.push(`${tempRes}-chart-proba-plot-type`);
    expandModalCharts(
        contID,
        expand_analysis_charts_proba,
        tempRes,
        '-plot',
        undefined,
        combineAxisResolvers(
            alwaysFloatAxis('yaxis'),
            parameterDrivenAxis(
                'xaxis',
                `${tempRes}-proba-variable`,
                tempRes === 'daily' ? `${tempRes}-proba-parameters` : null
            )
        ),
        makeCaseKeyResolver(...probaCaseKeySelectors)
    );
    purgePlotlyChartExpandModal(contID);

    setAnalysisDateCalendarSeasonal(
        tempRes, 'chart-proba', 'proba', true
    );
    if (tempRes === 'daily') {
        setAnalysisDateCalendarMonDay(tempRes, 'proba');
    }
    if (tempRes === 'seasonal') {
        setClimateSeasonStartLengthExpand(
            tempRes, 'chart-proba', 'proba'
        );
    }

    //
    const contChart = `container-chart-${contID}`;

    $(`#${tempRes}-proba-variable`)
        .off('change.chartTsProba')
        .on('change.chartTsProba', function() {
            if (tempRes === 'daily') {
                const this_var = $(this).val();
                $(`#${tempRes}-proba-parameters`).empty();
                for (const item of PARAMS_ORDER[this_var]) {
                    $(`#${tempRes}-proba-parameters`).append(
                        $('<option>').val(item)
                        .text(PARAMS_LIST[this_var][item].select)
                    );
                }
                setAnalysisParamsDefDaily(tempRes, 'proba');
            }
            //
            expand_analysis_charts_proba(contChart, tempRes);
        });

    //
    if (tempRes === 'daily') {
        $(`#${tempRes}-proba-parameters`)
            .off(`change.chartTsProba`)
            .on(`change.chartTsProba`, function() {
                setAnalysisParamsDefDaily(tempRes, 'proba');
                expand_analysis_charts_proba(contChart, tempRes);
            });
    }

    // 
    if (tempRes === 'seasonal') {
        const sDId = `${tempRes}-chart-proba`;
        $(`#${sDId}-seaslen, #${sDId}-startmon-calendar`)
            .off('change.chartTsProba')
            .on('change.chartTsProba', function() {
                expand_analysis_charts_proba(contChart, tempRes);
            });
    }
    // 

    const updateProbaDataControls = () => {
        if ($(`#${tempRes}-chart-proba-plot-type`).val() === 'cdf') {
            $(`#${tempRes}-chart-proba-plot-cdf`).show();
            $(`#${tempRes}-chart-proba-plot-pdf`).hide();
        } else {
            $(`#${tempRes}-chart-proba-plot-cdf`).hide();
            $(`#${tempRes}-chart-proba-plot-pdf`).show();
        }
    };
    updateProbaDataControls();

    $(`#${tempRes}-chart-proba-plot-type`)
        .off('change.chartTsProba')
        .on('change.chartTsProba', function() {
            updateProbaDataControls();
            maproomDB.getData('data_proba', function(data) {
                expand_analysis_display_proba(data, contChart);
            });
        });

    $(`.${tempRes}-proba-plot`)
        .off('change.chartTsProba')
        .on('change.chartTsProba', function() {
            const pKind = $(this).data('plot');
            const pType = $(this).val();
            const isVisible = $(this).is(':checked');

            const ix = PROBA_PLOT[pKind].indexOf(pType);

            Plotly.restyle(`${contChart}-plot`, {
                visible: isVisible
            }, [ix]);

            if (pType === 'fitted') {
                $(`#${contChart}-distr-div`).toggle(isVisible);
            }
        });

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartTsProba')
        .on('click.chartTsProba', function() {
            expand_analysis_charts_proba(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartTsProba')
        .on('click.chartTsProba', function() {
            downloadPlotlyImageJPG(`${contChart}-plot`);
        });

    // setPlotlyChartSettingsDialog(contID, contChart, test_climate_analysis_season_daily);
}

function setAnalysisExpandModalSeason(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    const seasonCaseKeySelectors = [`${tempRes}-tseries-variable`];
    if (tempRes === 'daily') {
        seasonCaseKeySelectors.push(`${tempRes}-tseries-parameters`);
    }
    seasonCaseKeySelectors.push(`${tempRes}-chart-season-plot-type`);
    expandModalCharts(
        contID,
        expand_analysis_charts_season,
        tempRes,
        '',
        undefined,
        combineAxisResolvers(
            yearIndexAxis('xaxis'),
            parameterDrivenAxis(
                'yaxis',
                `${tempRes}-tseries-variable`,
                tempRes === 'daily' ? `${tempRes}-tseries-parameters` : null
            )
        ),
        makeCaseKeyResolver(...seasonCaseKeySelectors)
    );
    purgePlotlyChartExpandModal(contID);

    setAnalysisDateCalendarSeasonal(
        tempRes, 'chart-season', 'tseries', true
    );
    if (tempRes === 'daily') {
        setAnalysisDateCalendarMonDay(tempRes, 'tseries');
    }
    if (tempRes === 'seasonal') {
        setClimateSeasonStartLengthExpand(
            tempRes, 'chart-season', 'season'
        );
    }

    //
    const contChart = `container-chart-${contID}`;

    $(`#${tempRes}-tseries-variable`)
        .off('change.chartTsSeason')
        .on('change.chartTsSeason', function() {
            if (tempRes === 'daily') {
                const this_var = $(this).val();
                $(`#${tempRes}-tseries-parameters`).empty();
                for (const item of PARAMS_ORDER[this_var]) {
                    $(`#${tempRes}-tseries-parameters`).append(
                        $('<option>').val(item)
                        .text(PARAMS_LIST[this_var][item].select)
                    );
                }
                setAnalysisParamsDefDaily(tempRes, 'tseries');
            }
            //
            expand_analysis_charts_season(contChart, tempRes);
        });

    //
    if (tempRes === 'daily') {
        $(`#${tempRes}-tseries-parameters`)
            .off(`change.chartTsSeason`)
            .on(`change.chartTsSeason`, function() {
                setAnalysisParamsDefDaily(tempRes, 'tseries');
                expand_analysis_charts_season(contChart, tempRes);
            });
    }

    // 
    if (tempRes === 'seasonal') {
        const sDId = `${tempRes}-chart-season`;
        $(`#${sDId}-seaslen, #${sDId}-startmon-calendar`)
            .off('change.chartTsSeason')
            .on('change.chartTsSeason', function() {
                expand_analysis_charts_season(contChart, tempRes);
            });
    }

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartTsSeason')
        .on('click.chartTsSeason', function() {
            expand_analysis_charts_season(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartTsSeason')
        .on('click.chartTsSeason', function() {
            downloadPlotlyImageJPG(contChart);
        });
}

function setAnalysisExpandModalEnso(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expand_analysis_charts_enso,
        tempRes,
        '',
        undefined,
        alwaysFloatAxis('yaxis'),
        makeCaseKeyResolver(
            `${tempRes}-enso-indices`,
            `${tempRes}-anom-tempres`,
            `${tempRes}-anom-sstweek`,
            `${tempRes}-anom-sstmonth`,
            `${tempRes}-oni-indices`,
            `${tempRes}-iod-sst`,
            `${tempRes}-anom-ninotype`,
            `${tempRes}-anom-ninoregion`,
            `${tempRes}-disp-image-enso`
        )
    );

    const contChart = `container-chart-${contID}`;

    $(`#${tempRes}-enso-indices`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            setAnalysisDateCalendarEnso(tempRes);
            setAnalysisVisibilityEnso(tempRes);
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-anom-tempres`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            setAnalysisDateCalendarEnso(tempRes);
            setAnalysisVisibilityEnso(tempRes);
            setAnalysisAnomaliesEnso(contChart, tempRes);
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-anom-sstweek`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            setAnalysisDateCalendarEnso(tempRes);
            setAnalysisAnomaliesEnso(contChart, tempRes);
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-anom-sstmonth`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            setAnalysisDateCalendarEnso(tempRes);
            setAnalysisAnomaliesEnso(contChart, tempRes);
            expand_analysis_charts_enso(contChart, tempRes);
        });

    // 
    $(`#${tempRes}-oni-indices`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-iod-sst`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-anom-ninotype`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-anom-ninoregion`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-disp-image-enso`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            const this_image = $(this).val();
            if (this_image === 'image') {
                $(`#${tempRes}-disp-lastval-enso-opt`).show();
            } else {
                $(`#${tempRes}-disp-lastval-enso-opt`).hide();
            }
            expand_analysis_charts_enso(contChart, tempRes);
        });

    $(`#${tempRes}-disp-lastval-enso`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            expand_analysis_charts_enso(contChart, tempRes);
        });

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.teleconIndex')
        .on('click.teleconIndex', function() {
            const ensoIdx = $(`#${tempRes}-enso-indices`).val();
            if (['oni', 'anom', 'iod', 'nao', 'atl3'].includes(ensoIdx)) {
                expand_analysis_charts_enso(contChart, tempRes);
            }
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.teleconIndex')
        .on('click.teleconIndex', function() {
            const ensoIdx = $(`#${tempRes}-enso-indices`).val();
            if (['proba', 'strength'].includes(ensoIdx)) {
                downloadImageSrcPNG(contChart);
            } else {
                const ensoImg = $(`#${tempRes}-disp-image-enso`).val();
                if (ensoImg === 'image') {
                    downloadImageSrcPNG(contChart);
                } else {
                    downloadPlotlyImageJPG(contChart);
                }
            }

        });
}

function setAnalysisExpandModalTelecon(tempRes, contID, cType) {
    const expandFunction = {
        'tseries': expand_analysis_telecon_tseries,
        'proba': expand_analysis_telecon_proba
    };
    const axisKindResolvers = {
        tseries: combineAxisResolvers(yearIndexAxis('xaxis'), alwaysFloatAxis('yaxis')),
        proba: combineAxisResolvers(alwaysFloatAxis('xaxis'), alwaysFloatAxis('yaxis'))
    };
    const colorsModules = {
        tseries: telecomTercileBarColorsModule,
        proba: undefined
    };

    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expandFunction[cType],
        tempRes,
        '',
        colorsModules[cType],
        axisKindResolvers[cType],
        makeCaseKeyResolver(
            `${tempRes}-${cType}-variable`,
            `${tempRes}-${cType}-clim-variable`,
            `${tempRes}-${cType}-index-telecon`
        )
    );
    purgePlotlyChartExpandModal(contID);

    // const this_var = $(`#${tempRes}-${cType}-variable`).val();
    setAnalysisDateCalendarSeasonal(
        tempRes, cType, cType, true
    );
    setClimateSeasonStartLengthExpand(
        tempRes, cType, `${cType}-telecon`
    );

    const contChart = `container-chart-${contID}`;

    $(`#${tempRes}-${cType}-variable`)
        .off(`change.${cType}Telecon`)
        .on(`change.${cType}Telecon`, function() {
            setClimateVariableTelecon(
                tempRes, $(this).val(), `${cType}-clim-variable`
            );
            setAnalysisDateCalendarSeasonal(
                tempRes, cType, cType, true
            );
            expandFunction[cType](contChart, tempRes);
        });

    $(`#${tempRes}-${cType}-clim-variable`)
        .off(`change.${cType}Telecon`)
        .on(`change.${cType}Telecon`, function() {
            expandFunction[cType](contChart, tempRes);
        });

    $(`#${tempRes}-${cType}-index-telecon`)
        .off(`change.${cType}Telecon`)
        .on(`change.${cType}Telecon`, function() {
            expandFunction[cType](contChart, tempRes);
        });

    // update chart
    $(`#plotly-replot-${contID}`)
        .off(`click.${cType}Telecon`)
        .on(`click.${cType}Telecon`, function() {
            expandFunction[cType](contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off(`click.${cType}Telecon`)
        .on(`click.${cType}Telecon`, function() {
            downloadPlotlyImageJPG(contChart);
        });
}

function setRainySeasonExpandModal(tempRes, chartType, contID) {
    const expandFunction = {
        'series': expand_agri_rseason_charts_series,
        'proba': expand_agri_rseason_charts_proba,
        'anom': expand_agri_rseason_charts_anom
    };
    // the anomaly view colors each bar by sign (positive/negative), same
    // as the general Anomaly chart - needs the sign-aware colors module,
    // not the default one-color-per-trace picker
    const colorsModule = {
        'anom': anomalySignColorsModule
    };

    showModalDialog(`modal-expand-${contID}`);
    const prefixID = `${tempRes}-${chartType}`;
    const caseKeySelectors = [`${prefixID}-variable`];
    if (chartType === 'series') {
        caseKeySelectors.push(`${prefixID}-plot-type`);
    }
    const axisKindResolver = ['series', 'anom'].includes(chartType) ? yearIndexAxis('xaxis') : null;
    expandModalCharts(
        contID,
        expandFunction[chartType],
        tempRes,
        '',
        colorsModule[chartType],
        axisKindResolver,
        makeCaseKeyResolver(...caseKeySelectors)
    );
    purgePlotlyChartExpandModal(contID);

    const contChart = `container-chart-${contID}`;


    setBoxDialog(
        `${prefixID}-rseason-def`,
        `${prefixID}-rseason-def-open`
    );
    setRainySeasonCalendarOnset(tempRes, chartType);

    $(`#${prefixID}-variable`)
        .off('change.chartRSeason')
        .on('change.chartRSeason', function() {
            expandFunction[chartType](contChart, tempRes);
        });

    $(`.${tempRes}-proba-plot`)
        .off('change.chartRSeason')
        .on('change.chartRSeason', function() {
            const pType = $(this).val();
            const ix = ['empirical', 'smoothed'].indexOf(pType);

            Plotly.restyle(contChart, {
                visible: $(this).is(':checked')
            }, [ix]);
        });

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartRSeason')
        .on('click.chartRSeason', function() {
            expandFunction[chartType](contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartRSeason')
        .on('click.chartRSeason', function() {
            downloadPlotlyImageJPG(contChart);
        });
}

function setCropSuitabilityExpandModal(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    // bars are colored from a fixed 6-step suitability-score palette
    // (0-5) plus a "no data" gray, not one color per trace - needs the
    // categorical colors module
    expandModalCharts(
        contID,
        expand_agri_cropsuit_charts,
        tempRes,
        '',
        categoricalMarkerColorsModule,
        yearIndexAxis('xaxis')
    );
    purgePlotlyChartExpandModal(contID);

    setAnalysisDateCalendarMonDay(tempRes, 'cs-ts');

    const contChart = `container-chart-${contID}`;

    $(`#plotly-replot-${contID}`)
        .off('click.chartCropSuit')
        .on('click.chartCropSuit', function() {
            expand_agri_cropsuit_charts(contChart, tempRes);
        });

    $(`#plotly-download-${contID}`)
        .off('click.chartCropSuit')
        .on('click.chartCropSuit', function() {
            downloadPlotlyImageJPG(contChart);
        });
}

function setAnalysisExpandModalCumul(tempRes, contID) {
    showModalDialog(`modal-expand-${contID}`);
    expandModalCharts(
        contID,
        expand_analysis_charts_cumul,
        tempRes
    );
    purgePlotlyChartExpandModal(contID);

    // set base period
    setBoxDialog(
        `${tempRes}-chart-cumul-bp`,
        `${tempRes}-chart-cumul-bp-open`
    );

    const end_date = $(`#${tempRes}-chart-cumul-enddate-calendar`).val();
    let disp_end;
    if (end_date === '') {
        disp_end = null;
    } else {
        if (end_date.length == 4) {
            disp_end = `${end_date}-12`;
        } else {
            disp_end = end_date;
        }
    }

    setDateCalendar(
        `${tempRes}-chart-cumul-enddate`,
        `${tempRes}-chart-cumul-variable`,
        DATA_SET.use,
        tempRes, disp_end,
        mapNavigation = false,
        isStart = false
    );

    const variable = $(`#${tempRes}-chart-cumul-variable`).val();
    const start_date = $(`#${tempRes}-chart-cumul-startdate-calendar`).val();
    let disp_start;
    if (start_date === '') {
        disp_start = getStartDekadCumul(tempRes, variable);
    } else {
        if (start_date.length == 4) {
            disp_start = `${start_date}-01`;
        } else {
            disp_start = start_date;
        }
    }

    setDateCalendar(
        `${tempRes}-chart-cumul-startdate`,
        `${tempRes}-chart-cumul-variable`,
        DATA_SET.use,
        tempRes,
        dispDate = disp_start,
        mapNavigation = true,
        dispYear = false,
        isStart = null,
        ensoData = false
    );

    const contChart = `container-chart-${contID}`;

    // update chart
    $(`#plotly-replot-${contID}`)
        .off('click.chartCumul')
        .on('click.chartCumul', function() {
            expand_analysis_charts_cumul(contChart, tempRes);
        });

    // download chart
    $(`#plotly-download-${contID}`)
        .off('click.chartCumul')
        .on('click.chartCumul', function() {
            downloadPlotlyImageJPG(contChart);
        });
}