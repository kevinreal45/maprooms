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
        ['spi_dek', 'spi_mon', 'spi_seas']
        .includes(variable)
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
    if (variable === 'spi_seas') {
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
    if (variable === 'spi_seas') {
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