function setOffCanvasMapControl(tempRes) {
    setAnalysisSeasonLengthMap(tempRes);

    $(`#${tempRes}-map-variable`)
        .off(`change.${tempRes}Variable`)
        .on(`change.${tempRes}Variable`, function() {
            refreshSpatialAverage(tempRes, datasetFromVariable = false);
            setAnalysisThresholdDef(tempRes);
        });

    $(`#${tempRes}-map-climato-func`)
        .off(`change.${tempRes}ClimatoFunc`)
        .on(`change.${tempRes}ClimatoFunc`, function() {
            setAnalysisClimatoFun(tempRes);
        });

    if (tempRes === 'seasonal') {
        $(`#${tempRes}-map-date-length`)
            .off(`change.${tempRes}SeasonLength`)
            .on(`change.${tempRes}SeasonLength`, function() {
                const map_type = $(`#${tempRes}-map-type`).val();
                setAnalysisSeasonMonths(tempRes, map_type);
            });
    }

    $(`#${tempRes}-map-type`)
        .off(`change.${tempRes}MapType`)
        .on(`change.${tempRes}MapType`, function() {
            setAnalysisDateCalendarVisibility(tempRes, $(this).val());
            refreshSpatialAverage(tempRes, datasetFromVariable = false);
        });

    $(`#${tempRes}-map-variable`).trigger('change');
    $(`#${tempRes}-map-type`).trigger('change');
    $(`#${tempRes}-map-climato-func`).trigger('change');
}

function setAnalysisSeasonMonths(tempRes, mapType, dispText = true) {
    if (tempRes !== 'seasonal') return;

    $(`#${tempRes}-season-months`).empty();
    if (!dispText) return;

    const map_type = $(`#${tempRes}-map-type`).val();
    const tstepID = `${tempRes}-map-date`;
    const this_len = parseInt($(`#${tstepID}-length`).val(), 10);

    let this_mon;
    if (mapType === 'climatology') {
        this_mon = parseInt($(`#${tstepID}-calendar`).val(), 10);
    } else {
        const this_date = $(`#${tstepID}-calendar`).val();
        this_mon = parseInt(this_date.split('-')[1], 10);
    }

    if (!Number.isFinite(this_mon) || !Number.isFinite(this_len)) return;

    const seas_mon = defineSeasonMonths(this_mon, this_len);
    $(`#${tempRes}-season-months`).text(seas_mon);
}

function setAnalysisClimatoFun(tempRes) {
    const climFun = $(`#${tempRes}-map-climato-func`).val();

    const ids = {
        percentile: `div-${tempRes}-map-climato-perc`,
        frequency: `div-${tempRes}-map-climato-freq`,
        probability: `div-${tempRes}-map-climato-proba`,
        trend: `div-${tempRes}-map-climato-trend`
    };
    const allIds = Object.values(ids);

    if (climFun === 'percentile') {
        setVisibility([ids.percentile], allIds.filter(id => id !== ids.percentile));
    } else if (climFun === 'frequency') {
        setVisibility([ids.frequency], allIds.filter(id => id !== ids.frequency));
        adjustSelect2Height(`${tempRes}-map-climato-freqOp`, true);
    } else if (['probExc', 'probNoExc'].includes(climFun)) {
        setVisibility([ids.probability], allIds.filter(id => id !== ids.probability));
    } else if (climFun === 'trend') {
        setVisibility([ids.trend], allIds.filter(id => id !== ids.trend));
    } else {
        setVisibility([], allIds);
    }
}

function setAnalysisThresholdDef(tempRes) {
    const this_var = $(`#${tempRes}-map-variable`).val();

    $(`#${tempRes}-map-climato-freqTh`)
        .val(THRESHOLD_DEF.value[this_var]);
    $(`#${tempRes}-map-climato-freqU`)
        .text(THRESHOLD_DEF.unit[this_var]);

    if (tempRes === 'seasonal') {
        $(`#${tempRes}-map-climato-probaTh`)
            .val(THRESHOLD_DEF.value[this_var]);
        $(`#${tempRes}-map-climato-probaU`)
            .text(THRESHOLD_DEF.unit[this_var]);
    }
}

function setAnalysisDateCalendarVisibility(tempRes, mapType) {
    if (mapType === 'climatology') {
        setNamesCalendar(
            `${tempRes}-map-date`, tempRes
        );
        setVisibility(
            [
                `${tempRes}-map-climato`,
                `div-${tempRes}-base-period`
            ],
            [`${tempRes}-map-anomaly`]
        );

        setAnalysisClimatoFun(tempRes);

        if (tempRes === 'seasonal') {
            setAnalysisSeasonMonths(tempRes, mapType);
            adjustSelect2Height(`${tempRes}-map-date-length`, false);
        }
    } else {
        if (mapType === 'anomaly') {
            setVisibility(
                [
                    `${tempRes}-map-anomaly`,
                    `div-${tempRes}-base-period`
                ],
                [`${tempRes}-map-climato`]
            );
        } else {
            setVisibility(
                [],
                [
                    `${tempRes}-map-anomaly`,
                    `div-${tempRes}-base-period`,
                    `${tempRes}-map-climato`
                ]
            );
        }

        setDateCalendar(
            `${tempRes}-map-date`,
            `${tempRes}-map-variable`,
            DATA_SET.use,
            tempRes,
            dispDate = null,
            mapNavigation = true,
            dispYear = false,
            isStart = null,
            ensoData = false
        );

        if (tempRes === 'seasonal') {
            setAnalysisSeasonMonths(tempRes, mapType);
            adjustSelect2Height(`${tempRes}-map-date-length`, true);
        }
    }
}

//////////////

function setOffCanvasMapControlDaily(tempRes) {
    setAnalysisDateCalendarMonDay(tempRes, 'map-date');

    $(`#${tempRes}-map-variable`)
        .off(`change.${tempRes}Variable`)
        .on(`change.${tempRes}Variable`, function() {
            const this_var = $(this).val();

            refreshSpatialAverage(tempRes, datasetFromVariable = false);
            // 
            $(`#${tempRes}-map-parameters`).empty();
            for (const item of PARAMS_ORDER[this_var]) {
                $(`#${tempRes}-map-parameters`).append(
                    $('<option>').val(item)
                    .text(PARAMS_LIST[this_var][item].select)
                );
            }
            $(`#${tempRes}-map-parameters`)
                .val(PARAMS_ORDER[this_var][0]);

            setAnalysisParamsDefDaily(tempRes, 'map');
            setAnalysisStatProbaDaily(tempRes);
            setAnalysisMapTypeDaily(tempRes);
        });

    $(`#${tempRes}-map-type`)
        .off(`change.${tempRes}MapType`)
        .on(`change.${tempRes}MapType`, function() {
            refreshSpatialAverage(tempRes, datasetFromVariable = false);
            setAnalysisMapTypeDaily(tempRes);
        });

    //
    $(`#${tempRes}-map-statistics`)
        .off(`change.${tempRes}Statistics`)
        .on(`change.${tempRes}Statistics`, function() {
            setAnalysisStatProbaDaily(tempRes);
        });

    // 
    $(`#${tempRes}-map-parameters`)
        .off(`change.${tempRes}Parameters`)
        .on(`change.${tempRes}Parameters`, function() {
            setAnalysisParamsDefDaily(tempRes, 'map');
            setAnalysisStatProbaDaily(tempRes);

            if (tempRes === 'daily') {
                preview_seasonal_display_charts(tempRes);
            }
        });

    $(`#${tempRes}-map-date-tseries-year`)
        .on('input', function() {
            const this_year = $(this).val();
            $('#input-time-navigation').val(this_year);
        });

    $(`#${tempRes}-map-variable`).trigger('change');
    $(`#${tempRes}-map-parameters`).trigger('change');
    $(`#${tempRes}-map-statistics`).trigger('change');
}

function setAnalysisMapTypeDaily(time_res) {
    const tstepID = `${time_res}-map-date`;
    const maptype = $(`#${time_res}-map-type`).val();

    if (maptype === 'climatology') {
        setVisibility(
            [
                `div-${tstepID}-climato-years`,
                `${time_res}-map-climato`
            ],
            [
                `div-${tstepID}-tseries-years`,
                `${time_res}-map-anomaly`
            ]
        );

        $('#input-time-navigation').val('').prop('disabled', true);
        $('#prev-time-navigation').prop('disabled', true);
        $('#next-time-navigation').prop('disabled', true);

        return;
    } else if (maptype === 'anomaly') {
        setVisibility(
            [
                `div-${tstepID}-tseries-years`,
                `div-${tstepID}-climato-years`,
                `${time_res}-map-anomaly`
            ],
            [`${time_res}-map-climato`]
        );
    } else {
        setVisibility(
            [`div-${tstepID}-tseries-years`],
            [
                `div-${tstepID}-climato-years`,
                `${time_res}-map-climato`,
                `${time_res}-map-anomaly`
            ]
        );
    }

    $('#input-time-navigation').prop('disabled', false);
    $('#prev-time-navigation').prop('disabled', false);
    $('#next-time-navigation').prop('disabled', false);

    const variable = $(`#${time_res}-map-variable`).val();
    const year_cov = getTempCoverageYear(
        DATA_SET.use, time_res, variable
    );
    $(`#${tstepID}-tseries-year`).attr({
        'min': year_cov.start,
        'max': year_cov.end
    }).val(year_cov.end);

    $('#input-time-navigation').val(year_cov.end);
}

function setAnalysisStatProbaDaily(time_res) {
    const this_var = $(`#${time_res}-map-variable`).val();
    const this_par = $(`#${time_res}-map-parameters`).val();
    const this_stat = $(`#${time_res}-map-statistics`).val();

    if (!['probExc', 'probNoExc'].includes(this_stat)) {
        $(`#div-${time_res}-map-climato-proba`).hide();
        return;
    }

    const param = PARAMS_LIST[this_var][this_par];

    $(`#div-${time_res}-map-climato-proba`).show();
    $(`#${time_res}-map-climato-probaTh`).val(param.value);
    $(`#${time_res}-map-climato-parUnit`).text(param.unit);

    adjustSelect2Height(
        `${time_res}-map-climato-probaUnit`, true
    );
}

//////////////

function setOffCanvasMapControlTelecon(tempRes) {
    setNamesCalendar(
        `${tempRes}-map-date`, tempRes
    );
    setAnalysisSeasonLengthMap(tempRes);
    setClimateSeasonMonthsTelecon(tempRes);
    adjustSelect2Height(`${tempRes}-map-date-length`, false);
    refreshSpatialAverage(tempRes, datasetFromVariable = true);

    $(`#${tempRes}-map-variable`)
        .off('change.tercileTelecon')
        .on('change.tercileTelecon', function() {
            setClimateVariableTelecon(
                tempRes, $(this).val(), 'map-clim-variable'
            );
            setClimateTercilesTelecon(tempRes, $(this).val());
            refreshSpatialAverage(tempRes, datasetFromVariable = true);
        });

    $(`#${tempRes}-tercile-analysis`)
        .off('change.tercileTelecon')
        .on('change.tercileTelecon', function() {
            setClimatePhasesTelecon(tempRes, $(this).val());
        });

    $(`#${tempRes}-map-date-length`)
        .off('change.tercileTelecon')
        .on('change.tercileTelecon', function() {
            setClimateSeasonMonthsTelecon(tempRes);
        });

    $(`#${tempRes}-map-clim-variable`)
        .off('change.tercileTelecon')
        .on('change.tercileTelecon', function() {
            preview_seasonal_teleconnections(tempRes);
        });
    $(`#${tempRes}-map-clim-variable`).trigger('change');
}

function setClimateSeasonMonthsTelecon(tempRes) {
    const tstepID = `${tempRes}-map-date`;
    const this_len = parseInt($(`#${tstepID}-length`).val(), 10);
    const this_mon = parseInt($(`#${tstepID}-calendar`).val(), 10);
    if (!Number.isFinite(this_mon) || !Number.isFinite(this_len)) return;
    const seas_mon = defineSeasonMonths(this_mon, this_len);
    $(`#${tempRes}-season-months`).text(seas_mon);
}

function setClimateTercilesTelecon(tempRes, variable) {
    const sel_opts = TERCILES_VAR.terciles.select[variable];

    $(`#${tempRes}-climate-tercile-select`).empty();
    for (const [k, v] of Object.entries(sel_opts)) {
        $(`#${tempRes}-climate-tercile-select`).append(
            $('<option>').text(v).val(k)
        );
    }
}

function setClimatePhasesTelecon(tempRes, teleIndex) {
    const this_lab = TERCILES_VAR.phases[teleIndex].label;
    const sel_opts = TERCILES_VAR.phases[teleIndex].select;

    $(`#${tempRes}-enso-phases-label`).text(this_lab);
    $(`#${tempRes}-enso-phases-select`).empty();
    for (const [k, v] of Object.entries(sel_opts)) {
        $(`#${tempRes}-enso-phases-select`).append(
            $('<option>').text(v).val(k)
        );
    }
}

//////////////

function setOffCanvasMapControlAgriculture(tempRes) {
    if (URL_ARGS.page === 'rainy-season') {
        setRainySeasonCalendarOnset(tempRes);

        $(`#${tempRes}-map-variable`)
            .off(`change.rainySeason`)
            .on(`change.rainySeason`, function() {
                refreshSpatialAverage(tempRes, datasetFromVariable = false);
                setRainySeasonVisibilityProba(tempRes);
            });

        $(`#${tempRes}-map-type`)
            .off(`change.rainySeason`)
            .on(`change.rainySeason`, function() {
                refreshSpatialAverage(tempRes, datasetFromVariable = false);
                setRainySeasonVisibilitySelectYear(tempRes);
            });
        $(`#${tempRes}-map-type`).trigger('change');

        $(`#${tempRes}-clim-statistics`)
            .off(`change.rainySeason`)
            .on(`change.rainySeason`, function() {
                setRainySeasonVisibilityProba(tempRes);
            });

        $(`#${tempRes}-map-date-tseries-year`)
            .on('input', function() {
                const this_year = $(this).val();
                $('#input-time-navigation').val(this_year);
            });
    } else if (URL_ARGS.page === 'decision-support') {
        setRainySeasonCalendarOnset(tempRes);

        $(`#${tempRes}-map-variable`)
            .off(`change.decisionSupport`)
            .on(`change.decisionSupport`, function() {
                setDecisionSupportVisibilityProba(tempRes, $(this).val());
            });
    } else {
        setAnalysisDateCalendarMonDay(tempRes, 'cs');
        refreshSpatialAverage(tempRes, datasetFromVariable = false);

        $(`#${tempRes}-map-variable`)
            .off(`change.cropSuitability`)
            .on(`change.cropSuitability`, function() {
                const thisVar = $(this).val();
                setCropSuitabilityVisibilitySelectPoint(tempRes, thisVar);

                if (thisVar === 'suitability') {
                    preview_cropsuitability_display_charts(tempRes);
                }
            });

        setCropSuitabilityVisibilitySelectYear(tempRes);
        $(`#${tempRes}-cs-tseries-year`)
            .on('input', function() {
                const this_year = $(this).val();
                $('#input-time-navigation').val(this_year);
            });
    }
}

function setCropSuitabilityVisibilitySelectPoint(time_res, variable) {
    // if (variable === 'suitability') {
    //     $('#div-support-spatial-average').show();
    //     $('#div-list-spatial-average').show();

    //     //// grid point only 
    //     $('#support-spatial-average').prop('disabled', true);
    //     $('#list-spatial-average').prop('disabled', true);
    // } else {
    //     $('#div-support-spatial-average').hide();
    //     $('#div-list-spatial-average').hide();
    // }

    //// grid point only 
    $('#support-spatial-average').prop('disabled', true);
    $('#list-spatial-average').prop('disabled', true);
}

function setCropSuitabilityVisibilitySelectYear(time_res) {
    const variable = $(`#${time_res}-map-variable`).val();
    const year_cov = getTempCoverageYear(
        DATA_SET.use, time_res, variable
    );
    $(`#${time_res}-cs-tseries-year`).attr({
        'min': year_cov.start,
        'max': year_cov.end
    }).val(year_cov.end - 1);

    $('#input-time-navigation').val(year_cov.end - 1);
}

function setRainySeasonVisibilitySelectYear(time_res) {
    const maptype = $(`#${time_res}-map-type`).val();

    if (maptype === 'climatology') {
        setVisibility(
            [`${time_res}-climstats-rainy-season`],
            [`${time_res}-date-rainy-season`]
        );

        $('#input-time-navigation').val('').prop('disabled', true);
        $('#prev-time-navigation').prop('disabled', true);
        $('#next-time-navigation').prop('disabled', true);

        return;
    } else if (maptype === 'anomaly') {
        setVisibility(
            [`${time_res}-date-rainy-season`],
            [`${time_res}-climstats-rainy-season`]
        );
    } else {
        setVisibility(
            [`${time_res}-date-rainy-season`],
            [`${time_res}-climstats-rainy-season`]
        );
    }

    $('#input-time-navigation').prop('disabled', false);
    $('#prev-time-navigation').prop('disabled', false);
    $('#next-time-navigation').prop('disabled', false);

    const variable = $(`#${time_res}-map-variable`).val();
    const year_cov = getTempCoverageYear(
        DATA_SET.use, time_res, variable
    );
    $(`#${time_res}-map-date-tseries-year`).attr({
        'min': year_cov.start,
        'max': year_cov.end
    }).val(year_cov.end);

    $('#input-time-navigation').val(year_cov.end);
}

function setRainySeasonVisibilityProba(tempRes) {
    $(`#${tempRes}-clim-stats-proba-error`).empty();

    const this_stat = $(`#${tempRes}-clim-statistics`).val();
    if (['probExc', 'probNoExc'].includes(this_stat)) {
        $(`#${tempRes}-proba-exceed-settings`).show();
        $(`#${tempRes}-clim-stats-text`).text(PROBA_OPT.text[this_stat]);
        const variable = $(`#${tempRes}-map-variable`).val();
        $(`#${tempRes}-clim-stats-unit`).text(PROBA_OPT.thres[variable].unit);
        $(`#${tempRes}-clim-stats-proba`).val(PROBA_OPT.thres[variable].value);
    } else {
        $(`#${tempRes}-proba-exceed-settings`).hide();
    }
}

function setDecisionSupportVisibilityProba(tempRes, variable) {
    $(`#${tempRes}-proba-thres-error`).empty();

    if (['pe_onset', 'pe_length'].includes(variable)) {
        $(`#${tempRes}-proba-thres-div`).show();

        $(`#${tempRes}-proba-thres-text`).text(PROBA_OPT.text[variable]);
        $(`#${tempRes}-proba-thres-unit`).text(PROBA_OPT.thres[variable].unit);
        $(`#${tempRes}-proba-thres-value`).val(PROBA_OPT.thres[variable].value);
    } else {
        $(`#${tempRes}-proba-thres-div`).hide();
    }
}

//////////////

function setOffCanvasMapControlMonitoring(tempRes) {
    refreshSpatialAverage(tempRes);
    if (tempRes === 'dekadal') {
        $(`#${tempRes}-map-variable`)
            .off(`change.monitDekadal`)
            .on(`change.monitDekadal`, function() {
                setMonitoringVisibilityDekadal(tempRes, $(this).val());
                setMonitoringCalendar(tempRes, $(this).val());
                setMonitoringColorbar($(this).val());
            });
    } else if (tempRes === 'monthly') {
        $(`#${tempRes}-map-variable`)
            .off(`change.monitMonthly`)
            .on(`change.monitMonthly`, function() {
                setMonitoringCalendar(tempRes, $(this).val());
                setMonitoringColorbar($(this).val());
            });
    } else {
        $(`#${tempRes}-map-variable`)
            .off(`change.monitSeasnal`)
            .on(`change.monitSeasonal`, function() {
                setMonitoringSeasonal(tempRes, $(this).val());
                setMonitoringColorbar($(this).val());
            });
    }
    $(`#${tempRes}-map-variable`).trigger('change');
}

function setMonitoringColorbar(variable) {
    if (
        [
            'spi_dek', 'spi_mon', 'spi_seas',
            'spei_dek', 'spei_mon', 'spei_seas'
        ].includes(variable)
    ) {
        colorbarSetDefault('spi_colors', [-2, -1.5, -1, 1, 1.5, 2]);
    } else if (
        ['rain_dek', 'rain_cumul', 'rain_mon', 'rain_seas']
        .includes(variable)
    ) {
        colorbarSetDefault('precipitation_3');
    } else if (
        ['anom_dek', 'anom_cumul', 'anom_mon', 'anom_seas']
        .includes(variable)
    ) {
        colorbarSetDefault('anomalies_4');
    } else if (
        ['anom_per_dek', 'anom_per_cumul', 'anom_per_mon', 'anom_per_seas']
        .includes(variable)
    ) {
        colorbarSetDefault('anomalies_3');
    } else {
        colorbarSetDefault();
    }
}

function setMonitoringVisibilityDekadal(tempRes, variable) {
    if (['rain_cumul', 'anom_cumul', 'anom_per_cumul'].includes(variable)) {
        setVisibility(
            [`${tempRes}-cumul-since-div`], []
        );
        $(`#${tempRes}-dekad-date-label`).text(DATE_LAB.todate);
    } else {
        setVisibility(
            [], [`${tempRes}-cumul-since-div`]
        );
        $(`#${tempRes}-dekad-date-label`).text(DATE_LAB.dekad);
    }
}

function setMonitoringSeasonal(tempRes, variable) {
    const temp_cov = getTempCoverageCalendar(
        DATA_SET.use, tempRes, variable
    );
    let dispDate;
    if (['spi_seas', 'spei_seas'].includes(variable)) {
        dispDate = temp_cov.end;
    } else {
        const mon = -1 * SEASON_DEF.months.length + 1;
        const disp_d = addDateMonths(temp_cov.end, mon);
        dispDate = formatDateToString(disp_d);
    }
    setMonitoringCalendar(tempRes, variable, dispDate);

    setAnalysisSeasonLengthMap(tempRes);
    adjustSelect2Height(`${tempRes}-map-date-length`, true);

    let dispText;
    if (['spi_seas', 'spei_seas'].includes(variable)) {
        $(`#${tempRes}-map-date-label1`).text(SEAS_LABELS.end_month);
        $(`#${tempRes}-map-date-label2`).text(SEAS_LABELS.time_scale);
        dispText = false;
    } else {
        $(`#${tempRes}-map-date-label1`).text(SEAS_LABELS.start);
        $(`#${tempRes}-map-date-label2`).text(SEAS_LABELS.length);
        dispText = true;
    }

    $(`#${tempRes}-map-date-length`)
        .off(`change.monitSeasonLength`)
        .on(`change.monitSeasonLength`, function() {
            setAnalysisSeasonMonths(tempRes, 'rawdata', dispText);
        });
    $(`#${tempRes}-map-date-length`).trigger('change');
}

function setMonitoringCalendar(tempRes, variable, dispDate = null) {
    setDateCalendar(
        `${tempRes}-map-date`,
        `${tempRes}-map-variable`,
        DATA_SET.use,
        tempRes,
        dispDate = dispDate,
        mapNavigation = true,
        dispYear = false,
        isStart = null,
        ensoData = false
    );

    if (['rain_cumul', 'anom_cumul', 'anom_per_cumul'].includes(variable)) {
        const date_disp = getStartDekadCumul(tempRes, variable);
        setDateCalendar(
            `${tempRes}-start-cumul`,
            `${tempRes}-map-variable`,
            DATA_SET.use,
            tempRes,
            dispDate = date_disp,
            mapNavigation = true,
            dispYear = false,
            isStart = null,
            ensoData = false
        );
    }
}

//////////////
function setOffCanvasMapControlsDrmExtTemp(tempRes) {
    setAnalysisDateCalendarMonDay(tempRes, 'map-date');
    // 
    $(`#${tempRes}-map-parameters`)
        .off('change.drmExtTempParameters')
        .on('change.drmExtTempParameters', function() {
            const this_val = $(this).val();

            if (this_val === 'seasAvg') {
                // $(`#${tempRes}-map-def-number`).hide();
                setVisibility([], [`${tempRes}-map-def-number`]);
            } else {
                //   $(`#${tempRes}-map-def-number`).show();
                setVisibility([`${tempRes}-map-def-number`], []);
            }

            $(`#${tempRes}-map-climato-probaTh`).val(PARAMS_LIST[this_val].value);
            $(`#${tempRes}-map-climato-parUnit`).text(PARAMS_LIST[this_val].unit);

        });
    $(`#${tempRes}-map-parameters`).trigger('change');

    // 
    $(`#${tempRes}-map-statistics`)
        .off('change.drmExtTempParameters')
        .on('change.drmExtTempParameters', function() {
            const this_val = $(this).val();

            if (['probExc', 'probNoExc'].includes(this_val)) {
                // $(`#${tempRes}-map-def-number`).hide();
                setVisibility([`div-${tempRes}-map-climato-proba`], []);
            } else {
                //  $(`#${tempRes}-map-def-number`).show();
                setVisibility([], [`div-${tempRes}-map-climato-proba`]);
            }

        });
    $(`#${tempRes}-map-statistics`).trigger('change');
}

//////////////
function setOffCanvasMapControlsDrmExtRain(tempRes) {
    setAnalysisDateCalendarMonDay(tempRes, 'map-date');
    //
    $(`#${tempRes}-map-parameters`)
        .off('change.drmExtRainParameters')
        .on('change.drmExtRainParameters', function() {
            const this_val = $(this).val();

            if (this_val === 'TotRain') {
                setVisibility(
                    [],
                    [
                        `${tempRes}-map-def-number`,
                        `${tempRes}-map-def-spell`
                    ])

            } else if (['NumWD', 'NumDD', 'RainInt'].includes(this_val)) {
                setVisibility(
                    [
                        `${tempRes}-map-def-number`
                    ],
                    [
                        `${tempRes}-map-def-spell`
                    ]
                )
            } else {
                setVisibility(
                    [
                        `${tempRes}-map-def-number`,
                        `${tempRes}-map-def-spell`
                    ],
                    [])
            }

            $(`#${tempRes}-map-climato-probaTh`).val(PARAMS_LIST[this_val].value);
            $(`#${tempRes}-map-climato-parUnit`).text(PARAMS_LIST[this_val].unit);

        });
    $(`#${tempRes}-map-parameters`).trigger('change');

    //
    $(`#${tempRes}-map-statistics`)
        .off('change.drmExtRainParameters')
        .on('change.drmExtRainParameters', function() {
            const this_val = $(this).val();

            if (['probExc', 'probNoExc'].includes(this_val)) {
                // $(`#${tempRes}-map-def-number`).hide();
                setVisibility([`div-${tempRes}-map-climato-proba`], []);
            } else {
                //   $(`#${tempRes}-map-def-number`).show();
                setVisibility([], [`div-${tempRes}-map-climato-proba`]);
            }
        });

    $(`#${tempRes}-map-statistics`).trigger('change');
}

//////////////
function setOffCanvasMapControlDrmSpiAnalysis(tempRes) {
    // setNamesCalendar(
    //     `${tempRes}-map-date`, tempRes
    // );
    setDateCalendar(`${tempRes}-map-date`, `${tempRes}-map-variable`, DATA_SET.use, tempRes);
    setAnalysisSeasonLengthMap(tempRes);
    //setClimateSeasonMonthsTelecon(tempRes);
    setAnalysisSeasonMonths(tempRes, 'rawdata');
    adjustSelect2Height(`${tempRes}-map-date-length`, false);
    refreshSpatialAverage(tempRes, true);
    setMonitoringColorbar('spi_seas');
}

function setOffCanvasMapControlSeasonalProjection(tempRes, prefix = `${tempRes}-seasonal-proj`) {
    // function setOffCanvasMapControlSeasonalProjection(tempRes) {
    //     const prefix = `${tempRes}-seasonal-proj`;
    const months = getListOfMonthsCalendar().short;

    ["start", "end"].forEach(boundary => {
        const select = $(`#${prefix}-${boundary}-month`);
        select.empty();

        months.forEach((label, index) => {
            select.append(new Option(label, index + 1));
        });
    });

    $(`#${prefix}-start-month`).val(SEASON_DEFAULTS.start_month);
    $(`#${prefix}-end-month`).val(SEASON_DEFAULTS.end_month);


    $(`#${prefix}-historical-start`)
        .val(CLIMATOLOGICAL_PERIOD.historical.start_year);

    $(`#${prefix}-historical-end`)
        .val(CLIMATOLOGICAL_PERIOD.historical.end_year);

    $(`#${prefix}-future-start`)
        .val(CLIMATOLOGICAL_PERIOD.future.start_year);

    $(`#${prefix}-future-end`)
        .val(CLIMATOLOGICAL_PERIOD.future.end_year);
}

// function setOffCanvasMapControlSpiProjection(tempRes) {
//     const prefix = `${tempRes}-spi-proj`;

function setProjectionSpiControls(prefix, sourcePrefix = null) {
    const length = sourcePrefix ?
        Number($(`#${sourcePrefix}-timescale`).val()) :
        SPI_SETTINGS.length;

    const select = $(`#${prefix}-timescale`).empty();

    for (let value = 2; value <= 12; value++) {
        select.append(new Option(value, value));
    }

    select.val(length).trigger('change.select2');

    ['start', 'end'].forEach(field => {
        const value = sourcePrefix ?
            $(`#${sourcePrefix}-plot-${field}`).val() :
            SPI_PLOT_PERIOD[`${field}_year`];

        $(`#${prefix}-plot-${field}`).val(value);
    });
}

function setProjectionSpiMapMonth(prefix, month) {
    const coverage = $(`#${prefix}-gcm`).data('spiCoverage');

    if (
        !coverage ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
        month < coverage.start.slice(0, 7) ||
        month > coverage.end.slice(0, 7)
    ) {
        return false;
    }

    setDateCalendar(
        `${prefix}-map-date`,
        coverage,
        null,
        'monthly',
        `${month}-01`,
        true,
        false,
        null,
        true
    );

    const length = Number($(`#${prefix}-timescale`).val());

    $(`#${prefix}-season-months`).text(
        defineSeasonMonths(Number(month.slice(5, 7)), length)
    );

    return true;
}

async function setProjectionSpiDateCalendars(
    tempRes,
    prefix,
    resetDates = false
) {
    const modelSelect = $(`#${prefix}-gcm`);
    const model = modelSelect.val();
    const scenario = $(`#${prefix}-scenario`).val();
    const timeScale = Number($(`#${prefix}-timescale`).val());

    const token = {};

    modelSelect.data('spiCoverageToken', token);
    modelSelect.data('spiCalendarReady', false);

    const previousMap = resetDates ?
        null :
        $(`#${prefix}-map-date-calendar`).val();

    try {
        const json = await $.ajax({
            type: 'POST',
            url: createEndpoint(
                'climate_projection',
                'climate_projection_spi_coverage'
            ),
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                model,
                scenario,
                timeScale,
                variable: 'rainfall'
            })
        });

        if (modelSelect.data('spiCoverageToken') !== token) {
            return false;
        }

        /* beautify preserve:start */
        if (!json || json.status !== 0 || !json.data) {
            throw new Error(
                json?.message || 'Unable to load dataset dates.'
            );
        }
        /* beautify preserve:end */

        const coverage = json.data;

        modelSelect.data('spiCoverage', coverage);


        const resolution = modelSelect.data('spiSpatialResolution');

        if (resolution && coverage.spatial_resolution) {
            Object.assign(resolution, coverage.spatial_resolution);

            if ($('#support-spatial-average').val() === 'gridpoint') {
                const items = getDataSpatialAverage(
                    'gridpoint',
                    resolution
                );

                $('#list-spatial-average')
                    .empty()
                    .select2({ data: items })
                    .val('grid')
                    .trigger('change.select2');
            }
        }


        const first = coverage.start.slice(0, 7);
        const last = coverage.end.slice(0, 7);

        const currentMap = resetDates ?
            null :
            $(`#${prefix}-map-date-calendar`).val();

        let month = String(
            currentMap ||
            previousMap ||
            SPI_MAP_MONTHS.projection
        ).slice(0, 7);

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            month = first;
        }

        month = month < first ?
            first :
            month > last ?
            last :
            month;

        if (document.getElementById(`${prefix}-map-date`)) {
            const valid = setProjectionSpiMapMonth(
                prefix,
                month
            );

            if (!valid) {
                throw new Error(
                    'Unable to initialize the projection month.'
                );
            }
        }

        const end = Math.min(
            Number($(`#${prefix}-plot-end`).val()) ||
            SPI_PLOT_PERIOD.end_year,
            coverage.plot_end_year
        );

        const start = Math.max(
            coverage.plot_start_year,
            Math.min(
                Number($(`#${prefix}-plot-start`).val()) ||
                SPI_PLOT_PERIOD.start_year,
                end
            )
        );

        $(`#${prefix}-plot-start`).val(start);
        $(`#${prefix}-plot-end`).val(end);

        modelSelect.data('spiCalendarReady', true);

        return true;

    } catch (error) {
        if (modelSelect.data('spiCoverageToken') !== token) {
            return false;
        }

        console.error(error);

        flashMessage(
            error.message || 'Unable to load dataset dates.',
            'error'
        );

        return false;
    }
}

async function setOffCanvasMapControlSpiProjection(tempRes) {
    const prefix = `${tempRes}-spi-proj`;

    $(`#${prefix}-gcm`).val(SPI_DEFAULTS.GCM.default);
    $(`#${prefix}-scenario`).val(SPI_DEFAULTS.scenarios.default);
    $(`#${prefix}-distribution`).val(SPI_SETTINGS.distribution);

    setProjectionSpiControls(prefix);
    const resolution = { lon: '…', lat: '…' };
    $(`#${prefix}-gcm`).data('spiSpatialResolution', resolution);
    setSelectSpatialAverage(resolution);

    $(`.${prefix}-select2`).each(function() {
        const select = $(this);

        if (!select.hasClass('select2-hidden-accessible')) {
            select.select2({
                minimumResultsForSearch: -1,
                dropdownParent: $(`#${prefix}-control`)
            });
        }
    });

    setMonitoringColorbar('spi_seas');

    return setProjectionSpiDateCalendars(
        tempRes,
        prefix,
        true
    );
}

function setProjectionSpiSeasonMonths(tempRes) {
    const prefix = `${tempRes}-spi-proj`;

    const month = String(
        $(`#${prefix}-map-date-calendar`).val() || ''
    ).slice(0, 7);

    const length = Number($(`#${prefix}-timescale`).val());

    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        $(`#${prefix}-season-months`).text(
            defineSeasonMonths(
                Number(month.slice(5, 7)),
                length
            )
        );
    }
}

//////////////

function setOffCanvasSeasFcstMapControl(tempRes) {
    $(`#${tempRes}-forecast-type`)
        .off('change.seasonalForecast')
        .on('change.seasonalForecast', function() {
            if ($(this).val() === 'flexible') {
                $(`#${tempRes}-flexible-proba-opt`).show();
            } else {
                $(`#${tempRes}-flexible-proba-opt`).hide();
            }
        });
    $(`#${tempRes}-forecast-type`).trigger('change');

    $(`#${tempRes}-flexible-parameters`)
        .off('change.seasonalForecast')
        .on('change.seasonalForecast', function() {
            setSeasFcstProbaParsVisibility(tempRes, $(this).val());
            const this_stat = $(`#${tempRes}-flexible-proba-thres`).val();
            setSeasFcstProbaThresVisibility(tempRes, this_stat);
            const this_var = $(`#${tempRes}-map-variable`).val();
            setSeasFcstColorbar(this_var, $(this).val(), this_stat);
        });
    $(`#${tempRes}-flexible-parameters`).trigger('change');

    $(`#${tempRes}-flexible-proba-thres`)
        .off('change.seasonalForecast')
        .on('change.seasonalForecast', function() {
            setSeasFcstProbaThresVisibility(tempRes, $(this).val());
            const this_var = $(`#${tempRes}-map-variable`).val();
            const this_par = $(`#${tempRes}-flexible-parameters`).val();
            setSeasFcstColorbar(this_var, this_par, $(this).val());
        });
    $(`#${tempRes}-flexible-proba-thres`).trigger('change');

    $(`#${tempRes}-map-variable`)
        .off('change.seasonalForecast')
        .on('change.seasonalForecast', function() {
            const this_val = $(this).val();
            setSeasFcstSeasonSelect(tempRes, this_val);

            const fcst_pars = SEAS_FCST.parameters[this_val];
            $(`#${tempRes}-flexible-parameters`).empty();
            for (const k of SEAS_FCST.order[this_val]) {
                $(`#${tempRes}-flexible-parameters`).append(
                    $('<option>').text(fcst_pars[k]).val(k)
                );
            }
            $(`#${tempRes}-flexible-parameters`)
                .val(SEAS_FCST.order[this_val][0]);

            const proba_thres = SEAS_FCST.proba[this_val];
            $(`#${tempRes}-flexible-proba-thres`).empty();
            for (const [k, v] of Object.entries(proba_thres)) {
                $(`#${tempRes}-flexible-proba-thres`).append(
                    $('<option>').text(v.select).val(k)
                );
            }

            const this_par = $(`#${tempRes}-flexible-parameters`).val();
            const this_stat = $(`#${tempRes}-flexible-proba-thres`).val();

            setSeasFcstProbaParsVisibility(tempRes, this_par);
            setSeasFcstColorbar(this_val, this_par, this_stat);

            $(`#${tempRes}-flexible-proba-value-2`)
                .val(proba_thres[this_val].value);
            $(`#${tempRes}-flexible-proba-unit-2`)
                .text(proba_thres[this_val].units);
            setSeasFcstProbaThresVisibility(tempRes, this_stat);

            return setSeasFcstSeasonSelect(tempRes, this_val);
        });
    return $(`#${tempRes}-map-variable`).triggerHandler('change');
}

function setSeasFcstProbaThresVisibility(tempRes, stats) {
    if (stats === 'percentile') {
        $(`#${tempRes}-flexible-proba-value-1`).removeClass('d-none');
        $(`#${tempRes}-flexible-proba-unit-1`).removeClass('d-none');
        $(`#${tempRes}-flexible-proba-value-2`).addClass('d-none');
        $(`#${tempRes}-flexible-proba-unit-2`).addClass('d-none');
    } else {
        $(`#${tempRes}-flexible-proba-value-1`).addClass('d-none');
        $(`#${tempRes}-flexible-proba-unit-1`).addClass('d-none');
        $(`#${tempRes}-flexible-proba-value-2`).removeClass('d-none');
        $(`#${tempRes}-flexible-proba-unit-2`).removeClass('d-none');
    }
}

function setSeasFcstProbaParsVisibility(tempRes, pars) {
    if (['probExc', 'probNoExc'].includes(pars)) {
        $(`#${tempRes}-flexible-proba-exceed`).show();
    } else {
        $(`#${tempRes}-flexible-proba-exceed`).hide();
    }
}

function setSeasFcstSeasonSelect(tempRes, variable) {
    return $.get('/get_seasonal_forecasts_data', { variable: variable }, function(json) {
        if (json.status !== 0) {
            flashMessage(json.message, 'error');
            return false;
        }
        setSeasFcstDefSeasons(tempRes, json.data);

        const rlon = json.data.resolution.lon;
        const rlat = json.data.resolution.lat;
        $('#list-spatial-average').select2({
            data: [{
                id: 'grid',
                text: `${rlon} x ${rlat}`
            }]
        });
    }, 'json').fail(function(jqXHR, textStatus, errorThrown) {
        displayAjaxError(jqXHR, textStatus, errorThrown);
    });
}

function setSeasFcstDefSeasons(tempRes, fcst_obj) {
    const year_id = $(`#${tempRes}-forecast-issued-year`);
    for (const yr of fcst_obj.years) {
        year_id.append(
            $('<option>').text(yr).val(yr)
        );
    }
    year_id.val(fcst_obj.display.year);
    year_id
        .off('change.fcstYear')
        .on('change.fcstYear', function() {
            setSeasFcstIssuedMonth(
                tempRes, $(this).val(), fcst_obj
            );
        });
    year_id.trigger('change');

    // 
    setTimeout(() => {
        $(`#${tempRes}-forecast-target`)
            .val(fcst_obj.display.target);
    }, 100);
}

function setSeasFcstIssuedMonth(tempRes, year, fcst_obj) {
    const month_id = $(`#${tempRes}-forecast-issued-month`);
    month_id.empty();
    const fcst = fcst_obj.forecast[year].issued;
    for (const mo of fcst) {
        month_id.append(
            $('<option>').text(mo.text).val(mo.val)
        );
    }
    month_id.val(fcst_obj.display.month);
    month_id
        .off('change.fcstMonth')
        .on('change.fcstMonth', function() {
            setSeasFcstTargets(
                tempRes, year, $(this).val(), fcst_obj
            );
        });
    month_id.trigger('change');
}

function setSeasFcstTargets(tempRes, year, month, fcst_obj) {
    const target_id = $(`#${tempRes}-forecast-target`);
    target_id.empty();
    const fcst = fcst_obj.forecast[year].targets[month];
    for (const tg of fcst) {
        target_id.append(
            $('<option>').text(tg).val(tg)
        );
    }
}

function setSeasFcstColorbar(variable, parameter, probathres = null) {
    if (variable === 'rainfall') {
        if (parameter === 'TotRain') {
            colorbarSetDefault('precipitation_2');
        } else if (parameter === 'AnomRain') {
            colorbarSetDefault('anomalies_4');
        } else if (parameter === 'probExc') {
            if (probathres === 'percentile') {
                colorbarSetDefault('proba_exceed_1');
            } else {
                colorbarSetDefault('proba_exceed_2');
            }
        } else if (parameter === 'probNoExc') {
            if (probathres === 'percentile') {
                colorbarSetDefault('proba_noexceed_1');
            } else {
                colorbarSetDefault('proba_noexceed_2');
            }
        } else {
            colorbarSetDefault();
        }
    } else if (variable === 'temperature') {
        colorbarSetDefault();
    } else {
        colorbarSetDefault();
    }
}

//////////////

async function setOffCanvas10DaysFcstMapControl(tempRes) {
    async function setTendaysTargetPeriod(date) {
        const target = await $.getJSON(
            '/get_tendays_target_forecast', { date: date }
        );
        if (target.status !== 0) {
            flashMessage(target.message, 'error');
            return false;
        }

        $(`#${tempRes}-forecast-target-start`)
            .text(target.data.start);
        $(`#${tempRes}-forecast-target-end`)
            .text(target.data.end);
        return true;
    }

    $(`#${tempRes}-map-parameter`)
        .off('change.tendaysForecast')
        .on('change.tendaysForecast', function() {
            const this_par = $(this).val();
            const this_var = $(`#${tempRes}-map-variable`).val();
            set10DaysFcstColorbar(this_var, this_par);
        });

    $(`#${tempRes}-map-variable`)
        .off('change.tendaysForecast')
        .on('change.tendaysForecast', function() {
            const this_val = $(this).val();
            const fcst_pars = SEAS_FCST.parameters[this_val];
            const parameterSelect = $(`#${tempRes}-map-parameter`);
            parameterSelect.empty();
            for (const k of SEAS_FCST.order[this_val]) {
                parameterSelect.append(
                    $('<option>').text(fcst_pars[k]).val(k)
                );
            }
            parameterSelect
                .val(SEAS_FCST.order[this_val][0])
                .trigger('change');
        });
    $(`#${tempRes}-map-variable`).trigger('change');

    const json = await $.getJSON('/get_tendays_forecasts_data');
    if (json.status !== 0) {
        flashMessage(json.message, 'error');
        throw new Error(json.message);
    }

    const issuedDates = json.data.issued.slice().sort();
    const latestIssuedDate = issuedDates[issuedDates.length - 1];
    const targetIsSet = await setTendaysTargetPeriod(latestIssuedDate);
    if (!targetIsSet) {
        throw new Error('Unable to set the ten-day forecast target period.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    setTendaysCalendar(
        `${tempRes}-map-date`,
        json.data.info.temporal_coverage,
        issuedDates,
        function(date) {
            setTendaysTargetPeriod(date).catch(error => {
                console.error(
                    'Unable to update forecast target period:',
                    error
                );
            });
        }
    );
}

function set10DaysFcstColorbar(variable, parameter) {
    if (variable === 'rainfall') {
        if (parameter === 'TotRain') {
            colorbarSetDefault(
                'precipitation_fcst_1',
                [1, 5, 10, 20, 30, 50, 100, 150]
            );
        } else if (parameter === 'AnomRain') {
            const levels = [
                -300, -200, -150, -100, -50, -20, -10,
                10, 20, 50, 100, 200, 300
            ];
            colorbarSetDefault('anomalies_4', levels);
        } else if (parameter === 'HeavyRain') {
            colorbarSetDefault();
        } else {
            colorbarSetDefault();
        }
    } else if (variable === 'temperature') {
        if (
            ['MeanTemp', 'MinTemp', 'MaxTemp']
            .includes(parameter)
        ) {
            const breaks = {
                'MeanTemp': [6, 30, 3],
                'MinTemp': [4, 26, 3],
                'MaxTemp': [8, 47, 3]
            };

            const brks = breaks[parameter];
            const levels = [];
            for (let i = brks[0]; i < brks[1]; i += brks[2]) {
                levels.push(i);
            }
            colorbarSetDefault('temperature_fcst_1', levels);
        } else if (parameter === 'AnomTemp') {
            const levels = [
                -6, -4.5, -3.5, -2.5, -1.5, -0.5,
                0.5, 1.5, 2.5, 3.5, 4.5, 6
            ];
            colorbarSetDefault('anomalies_1r', levels);
        } else {
            colorbarSetDefault();
        }
    } else {
        colorbarSetDefault();
    }
}

//////////////
function setHealthWaspControls(prefix) {
    const parent = $(`#${prefix}-control`);

    $(`.${prefix}-select2`).each(function() {
        const select = $(this);

        if (!select.hasClass('select2-hidden-accessible')) {
            select.select2({
                minimumResultsForSearch: -1,
                dropdownParent: parent
            });
        }
    });

    const monthHolder = `${prefix}-comparison-month`;

    if (
        $(`#${monthHolder}`).length &&
        !$(`#${monthHolder}-calendar`).length
    ) {
        setNamesCalendar(
            monthHolder,
            'monthly',
            parent,
            false,
            Number(
                $(`#${monthHolder}`).attr('data-default') || 1
            )
        );
    }
}


function setHealthWaspDateCalendars(
    tempRes,
    prefix = `${tempRes}-wasp-map`,
    resetDates = false,
    onReady = null
) {
    const control = $(`#${prefix}-control`);
    const token = {};

    control.data('waspCalendarToken', token);
    control.data('waspCalendarReady', false);
    control.data('waspCalendarLoading', true);

    const query = queryParamsHealthWasp(tempRes, prefix);

    if (!query) {
        control.data('waspCalendarLoading', false);

        if (typeof onReady === 'function') {
            onReady(false);
        }

        return false;
    }

    const key = `${query.dataset}:${query.timeScale}`;

    const previousMonth = resetDates ? '' : String(
        $(`#${tempRes}-map-date-calendar`).val() || ''
    ).trim();

    const previousStart = resetDates ? '' : String(
        $(`#${prefix}-startdate-calendar`).val() || ''
    ).trim();

    const previousEnd = resetDates ? '' : String(
        $(`#${prefix}-enddate-calendar`).val() || ''
    ).trim();

    function fail(error) {
        if (control.data('waspCalendarToken') !== token) {
            return false;
        }

        control.data('waspCalendarLoading', false);

        console.error(error);
        flashMessage(
            error.message || 'Unable to load WASP dates.',
            'error'
        );

        if (typeof onReady === 'function') {
            onReady(false);
        }

        return false;
    }

    function applyCoverage(coverage) {
        if (control.data('waspCalendarToken') !== token) {
            return false;
        }

        try {
            if (
                !coverage ||
                !['start', 'end', 'map_start', 'map_end'].every(
                    field => typeof coverage[field] === 'string'
                ) ||
                !Number.isInteger(coverage.plot_start_year) ||
                !Number.isInteger(coverage.plot_end_year)
            ) {
                throw new Error(
                    'Unable to read WASP dataset dates.'
                );
            }

            control.data('waspCoverage', coverage);
            setHealthWaspControls(prefix);

            if (prefix === `${tempRes}-wasp-map`) {
                const first = coverage.start.slice(0, 7);
                const last = coverage.end.slice(0, 7);

                let month = /^\d{4}-(0[1-9]|1[0-2])$/
                    .test(previousMonth) ?
                    previousMonth :
                    last;

                month = month < first ?
                    first :
                    month > last ? last : month;

                setDateCalendar(
                    `${tempRes}-map-date`,
                    coverage,
                    query.dataset,
                    'monthly',
                    `${month}-01`,
                    true,
                    false,
                    null,
                    true
                );

                $(`#${tempRes}-map-date-calendar`).val(month);
                $('#input-time-navigation').val(month);

            } else {
                [
                    ['start', previousStart, true],
                    ['end', previousEnd, false]
                ].forEach(([boundary, previous, isStart]) => {
                    let year = /^\d{4}$/.test(previous) ?
                        Number(previous) :
                        isStart ?
                        coverage.plot_start_year :
                        coverage.plot_end_year;

                    year = Math.max(
                        coverage.plot_start_year,
                        Math.min(year, coverage.plot_end_year)
                    );

                    let date = (
                        `${year}-${isStart ? '01' : '12'}-01`
                    );

                    date = date < coverage.start ?
                        coverage.start :
                        date > coverage.end ?
                        coverage.end :
                        date;

                    setDateCalendar(
                        `${prefix}-${boundary}date`,
                        coverage,
                        query.dataset,
                        'seasonal',
                        date,
                        false,
                        true,
                        isStart,
                        true
                    );

                    $(`#${prefix}-${boundary}date-calendar`)
                        .val(String(year));
                });
            }

            ['comparison-start', 'comparison-end']
            .forEach(field => {
                $(`#${prefix}-${field}`).attr({
                    min: coverage.plot_start_year,
                    max: coverage.plot_end_year
                });
            });

            control.data('waspCoverageKey', key);
            control.data('waspCalendarReady', true);
            control.data('waspCalendarLoading', false);

        } catch (error) {
            return fail(error);
        }

        if (typeof onReady === 'function') {
            onReady(true);
        }

        return true;
    }

    // Reuse coverage already obtained
    const cached = [
        control,
        $(`#${tempRes}-wasp-map-control`),
        $(`#${tempRes}-wasp-chart-control`)
    ].find(item =>
        item.data('waspCoverageKey') === key &&
        item.data('waspCoverage')
    );

    if (cached) {
        return applyCoverage(cached.data('waspCoverage'));
    }

    /* beautify preserve:start */
    return $.ajax({
        type: 'POST',
        url: createEndpoint(
            'health_malaria',
            'health_wasp_coverage'
        ),
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(query),

        success: json => {
            if (control.data('waspCalendarToken') !== token) {
                return;
            }

            if (json.status !== 0) {
                fail(new Error(
                    json.message || 'Unable to load WASP dates.'
                ));
                return;
            }

            applyCoverage(json.data);
        },
        error: (xhr, status, error) => {
            fail(new Error(
                xhr.responseJSON?.message ||
                error ||
                'Unable to load WASP dates.'
            ));
        }
    });
    /* beautify preserve:end */
}


function setOffCanvasMapControlHealthWasp(
    tempRes,
    onReady = null
) {
    const prefix = `${tempRes}-wasp-map`;

    setHealthWaspControls(prefix);

    setVisibility([], [
        'div-support-spatial-average',
        'div-list-spatial-average'
    ]);

    colorbarSetDefault(
        'spi_colors',
        [-3, -2, -1, 0, 1, 2, 3]
    );

    return setHealthWaspDateCalendars(
        tempRes,
        prefix,
        true,
        onReady
    );
}


function setHealthWaspMapDate(tempRes, offset = null) {
    const control = $(
        `#${tempRes}-wasp-map-control`
    );

    if (!control.data('waspCalendarReady')) {
        return false;
    }

    const coverage = control.data('waspCoverage');
    const input = $(`#${tempRes}-map-date-calendar`);

    let month = String(
        offset === null ?
        $('#input-time-navigation').val() || '' :
        input.val() || ''
    ).trim();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        flashMessage('Select a valid ending month.', 'error');
        return false;
    }

    if (offset !== null) {
        const [year, number] = month.split('-').map(Number);

        month = new Date(
            Date.UTC(year, number - 1 + offset, 1)
        ).toISOString().slice(0, 7);
    }

    const first = coverage.start.slice(0, 7);
    const last = coverage.end.slice(0, 7);

    if (offset !== null) {
        month = month < first ? last :
            month > last ? first : month;

    } else if (month < first || month > last) {
        flashMessage(
            'Select an ending month within WASP coverage.',
            'error'
        );
        return false;
    }

    input[0].calendar.setValue(`${month}-01`);
    input.val(month);
    $('#input-time-navigation').val(month);

    return true;
}

///////

function setOffCanvasMapControlHealthCmst(tempRes) {
    setNamesCalendar(
        `${tempRes}-map-date`,
        tempRes,
        $('#map-control-offcanvas-dataselect'),
        true,
        1
    );

    $(`#${tempRes}-map-variable`)
        .off(`change.${tempRes}CmstVariable`)
        .on(`change.${tempRes}CmstVariable`, function() {
            refreshSpatialAverage(tempRes);
        });

    $(`#${tempRes}-map-cmst-product`)
        .off(`change.${tempRes}CmstProduct`)
        .on(`change.${tempRes}CmstProduct`, function() {
            setHealthCmstProductControls(tempRes);
        });

    $(`#${tempRes}-map-variable`).trigger('change');
    $(`#${tempRes}-map-cmst-product`).trigger('change');
}


function setHealthCmstProductControls(tempRes) {
    const product = $(
        `#${tempRes}-map-cmst-product`
    ).val();

    const annual = product === 'Annual_Sum';

    $(`#${tempRes}-cmst-month-control`)
        .toggle(!annual);

    $('#div-map-time-navigation')
        .toggleClass('d-none', annual)
        .toggleClass('d-flex', !annual);

    const breaks = annual ?
        Array.from({ length: 14 },
            (_, index) => index - 0.5
        ) :
        Array.from({ length: 9 },
            (_, index) => (index + 1) * 10
        );
    const colors = annual ? 'cmst_colors' : 'viridis';

    colorbarSetDefault(colors, breaks);
}