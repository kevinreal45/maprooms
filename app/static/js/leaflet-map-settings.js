function queryParamsClimateAnalysisMap(time_res) {
    let query = new Object();
    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${time_res}-map-variable`).val();
    query.mapType = $(`#${time_res}-map-type`).val();
    const tstep_id = `${time_res}-map-date`;
    const bp_id = `${time_res}-base-period`;

    let date;
    if (time_res === 'daily') {
        query.dailyAnalysis = true;
        query.minFrac = 1.0;
        query.seasParams = $(`#${time_res}-map-parameters`).val();

        query.startMonth = parseInt($(`#${tstep_id}-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${tstep_id}-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${tstep_id}-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${tstep_id}-end-day`).val(), 10);
    } else {
        query.dailyAnalysis = false;
        date = $(`#${tstep_id}-calendar`).val();
    }

    if (query.mapType === 'climatology') {
        if (time_res === 'monthly') {
            date = date === '' ? '1' : date;
            query.climDate = parseInt(date, 10);
        } else if (time_res === 'dekadal') {
            date = date === '' ? '01-1' : date;
            query.climDate = date;
        } else if (time_res === 'seasonal') {
            query.fullYear = false;
            date = date === '' ? '1' : date;
            query.climDate = parseInt(date, 10);
            query.seasLength = parseInt($(`#${tstep_id}-length`).val(), 10);
        } else if (time_res === 'daily') {
            query.fullYear = false;
        } else {
            return false;
        }

        ///////
        if (time_res === 'daily') {
            query.seasStats = $(`#${time_res}-map-statistics`).val();

            if (query.seasStats === 'probExc' || query.seasStats === 'probNoExc') {
                query.probaThres = Number($(`#${time_res}-map-climato-probaTh`).val().trim());
                query.probaUnit = $(`#${time_res}-map-climato-probaUnit`).val();
            }

            query.defThres = Number($(`#${time_res}-map-def-number-thres-val`).val().trim());
            if (query.variable === 'rainfall') {
                query.defSpell = parseInt($(`#${time_res}-map-def-spell-thres-val`).val().trim(), 10);
            } else {
                query.defTempBase = Number($(`#${time_res}-map-def-spell-thres-val`).val().trim());
            }

            query.startYear = parseInt($(`#${tstep_id}-start-year`).val().trim(), 10);
            query.endYear = parseInt($(`#${tstep_id}-end-year`).val().trim(), 10);
            query.minYear = parseInt($(`#${tstep_id}-min-year`).val().trim(), 10);
        } else {
            query.climFunction = $(`#${time_res}-map-climato-func`).val();
            if (query.climFunction === 'percentile') {
                query.precentileValue = $(`#${time_res}-map-climato-perc`).val();
            }
            if (query.climFunction === 'frequency') {
                query.frequencyOper = $(`#${time_res}-map-climato-freqOp`).val();
                query.frequencyThres = $(`#${time_res}-map-climato-freqTh`).val();
            }
            if (query.climFunction === 'probExc' || query.climFunction === 'probNoExc') {
                query.probaThres = $(`#${time_res}-map-climato-probaTh`).val();
            }
            if (query.climFunction === 'trend') {
                query.trendUnit = $(`#${time_res}-map-climato-trendUnit`).val();
            }

            query.startYear = parseInt($(`#${bp_id}-start`).val().trim(), 10);
            query.endYear = parseInt($(`#${bp_id}-end`).val().trim(), 10);
            query.minYear = parseInt($(`#${bp_id}-min`).val().trim(), 10);
        }
    } else {
        if (time_res === 'monthly') {
            query.Date = date;
        } else if (time_res === 'dekadal') {
            query.Date = formatDekadDate(date);
        } else if (time_res === 'seasonal') {
            query.seasLength = parseInt($(`#${tstep_id}-length`).val(), 10);
            query.Date = formatSeasonDate(date, query.seasLength);
        } else if (time_res === 'daily') {
            query.Year = parseInt($(`#${tstep_id}-tseries-year`).val().trim(), 10);
            query.seasParams = $(`#${time_res}-map-parameters`).val();
            query.defThres = Number($(`#${time_res}-map-def-number-thres-val`).val().trim());
            if (query.variable === 'rainfall') {
                query.defSpell = parseInt($(`#${time_res}-map-def-spell-thres-val`).val().trim(), 10);
            } else {
                query.defTempBase = Number($(`#${time_res}-map-def-spell-thres-val`).val().trim());
            }
        } else {
            return false;
        }

        if (query.mapType === 'anomaly') {
            query.anomaly = $(`#${time_res}-map-anomaly-type`).val();
            if (time_res === 'daily') {
                query.startYear = parseInt($(`#${tstep_id}-start-year`).val().trim(), 10);
                query.endYear = parseInt($(`#${tstep_id}-end-year`).val().trim(), 10);
                query.minYear = parseInt($(`#${tstep_id}-min-year`).val().trim(), 10);
            } else {
                query.startYear = parseInt($(`#${bp_id}-start`).val().trim(), 10);
                query.endYear = parseInt($(`#${bp_id}-end`).val().trim(), 10);
                query.minYear = parseInt($(`#${bp_id}-min`).val().trim(), 10);
            }
        }
    }

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

function displayClimateAnalysisMap(time_res, options, map) {
    const query = queryParamsClimateAnalysisMap(time_res);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_analysis',
        'climate_analysis_map'
    );

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map
    );

    updateAnalysisMapDate(time_res, query, map);

    return request;
}

////////////

function queryParamsAnalysisMapTelecon(time_res) {
    let query = new Object();

    query.temporalRes = time_res;
    query.geomExtract = 'original';
    query.minFrac = 0.95;
    query.fullSeas = true;
    query.mapType = 'climatology';

    query.variable = $(`#${time_res}-map-variable`).val();
    query.climVariable = $(`#${time_res}-map-clim-variable`).val();

    query.dataset = DATA_SET.use;
    query.inputData = DATA_SET.timeres;

    const tstep_id = `${time_res}-map-date`;
    query.seasStart = parseInt($(`#${tstep_id}-calendar`).val(), 10);
    query.seasLength = parseInt($(`#${tstep_id}-length`).val(), 10);

    const bp_id = `${time_res}-base-period`;
    query.startYear = parseInt($(`#${bp_id}-start`).val().trim(), 10);
    query.endYear = parseInt($(`#${bp_id}-end`).val().trim(), 10);
    query.minYear = parseInt($(`#${bp_id}-min`).val().trim(), 10);

    query.teleconIndex = $(`#${time_res}-tercile-analysis`).val();
    query.ensoTercile = $(`#${time_res}-enso-phases-select`).val();
    query.climTercile = $(`#${time_res}-climate-tercile-select`).val();

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

function displayClimateAnalysisMapTelecon(time_res, options, map) {
    const query = queryParamsAnalysisMapTelecon(time_res);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_analysis',
        'climate_analysis_telecon_map'
    );

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map
    );

    updateAnalysisMapDate(time_res, query, map);

    return request;
}

////////////

function updateAnalysisMapDate(time_res, query, map) {
    let date = '';

    if (query.mapType === 'climatology') {
        date = displayClimatoDateMap(time_res);

        if (date) {
            map.displayText_date.update(date);
            return;
        }

        setTimeout(() => {
            const delayedDate = displayClimatoDateMap(time_res);
            map.displayText_date.update(delayedDate);
        }, 100);

        return;
    }

    date = displayTimeSeriesDateMap(query);
    map.displayText_date.update(date);
}

function displayClimatoDateMap(time_res) {
    const tstep_id = `${time_res}-map-date`;
    let date;
    if (time_res === 'seasonal') {
        const mon = parseInt($(`#${tstep_id}-calendar`).val(), 10);
        const len = parseInt($(`#${tstep_id}-length`).val(), 10);
        date = defineSeasonMonths(mon, len, long = false);
    } else {
        date = $(`#${tstep_id}-calendar option:selected`).text();
    }

    return date;
}

function displayTimeSeriesDateMap(query) {
    let date;
    if (query.temporalRes === 'seasonal') {
        // const m1 = parseInt(query.Date.slice(5, 7), 10);
        // const m2 = parseInt(query.Date.slice(13, 15), 10);
        date = query.Date;
    } else if (query.temporalRes === 'daily') {
        const sYear = parseInt(query.Year, 10);
        const sMon = parseInt(query.startMonth, 10);
        const sDay = parseInt(query.startDay, 10);
        const eMon = parseInt(query.endMonth, 10);
        const eDay = parseInt(query.endDay, 10);
        const sameYearSeason = (sMon < eMon) || (sMon === eMon && sDay <= eDay);
        const eYear = sameYearSeason ? sYear : sYear + 1;
        const start = `${sYear}-${String(sMon).padStart(2, '0')}-${String(sDay).padStart(2, '0')}`;
        const end = `${eYear}-${String(eMon).padStart(2, '0')}-${String(eDay).padStart(2, '0')}`;
        date = `${start}_${end}`;
    } else {
        date = query.Date;
    }

    return date;
}

////////////

function queryParamsRainySeason(time_res) {
    let query = new Object();

    query.startMonthO = parseInt($(`#${time_res}-onset-start-mon`).val(), 10);
    query.startDayO = parseInt($(`#${time_res}-onset-start-day`).val(), 10);
    query.searchDaysO = parseInt($(`#${time_res}-onset-search-day`).val(), 10);
    query.rainTotalO = Number($(`#${time_res}-onset-rain-tot`).val());
    query.numberDaysO = parseInt($(`#${time_res}-onset-nb-days`).val(), 10);
    query.minNbDaysO = parseInt($(`#${time_res}-onset-min-day`).val(), 10);
    query.drySpellO = parseInt($(`#${time_res}-onset-dryspell`).val(), 10);
    query.drySpellDaysO = parseInt($(`#${time_res}-onset-dryspell-day`).val(), 10);

    query.rainThres = Number($(`#${time_res}-onset-rainy-day-thres`).val());

    query.startMonthC = parseInt($(`#${time_res}-cessation-start-mon`).val(), 10);
    query.startDayC = parseInt($(`#${time_res}-cessation-start-day`).val(), 10);
    query.searchDaysC = parseInt($(`#${time_res}-cessation-search-day`).val(), 10);
    query.waterBalanceC = Number($(`#${time_res}-cessation-water-balance`).val());
    query.numberDaysC = parseInt($(`#${time_res}-cessation-number-day`).val(), 10);

    query.interpolate = $(`#${time_res}-rseason-interpolate`).is(':checked');
    query.minFrac = Number($(`#${time_res}-rseason-minfrac`).val());
    query.rmIsolatedPix = $(`#${time_res}-rseason-rmisolatedpx`).is(':checked');

    return query;
}

function queryParamsAgricultureAnalysisMap(
    time_res, offcanvasEvent = null
) {
    let query = new Object();
    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;
    query.mapPage = URL_ARGS.page;

    if (query.mapPage === 'rainy-season') {
        query.variable = $(`#${time_res}-map-variable`).val();
        query.mapType = $(`#${time_res}-map-type`).val();
        query.minYear = 15;

        if (query.mapType === 'climatology') {
            query.climStats = $(`#${time_res}-clim-statistics`).val();
            if (['probExc', 'probNoExc'].includes(query.climStats)) {
                $(`#${time_res}-clim-stats-proba-error`).empty();
                proba_thres = $(`#${time_res}-clim-stats-proba`).val();
                if (query.variable === 'length') {
                    query.probaThres = parseInt(proba_thres, 10);
                } else {
                    if (isValidMonthDay(proba_thres)) {
                        query.probaThres = proba_thres;
                    } else {
                        const frmt = PROBA_OPT.thres[query.variable].unit;
                        const msg1 = `Invalid "month-day" date: ${proba_thres}`;
                        const msg2 = `the format must be: ${frmt}`;
                        $(`#${time_res}-clim-stats-proba-error`)
                            .text(`${msg1}, ${msg2}`)
                            .css({ 'color': 'red', 'font-weight': 'bold' });
                        if (offcanvasEvent !== null) {
                            offcanvasEvent.preventDefault();
                        }
                        return false;
                    }
                }
                query.probaUnit = 'perc';
            }
        } else {
            query.Year = parseInt($(`#${time_res}-map-date-tseries-year`).val().trim(), 10);
        }
        query.rainy_season = queryParamsRainySeason(time_res);
    } else if (query.mapPage === 'decision-support') {
        query.mvariable = $(`#${time_res}-map-variable`).val();
        query.variable = CLIMATO_OPT[query.mvariable].variable;
        query.climStats = CLIMATO_OPT[query.mvariable].function;
        query.minYear = 15;

        if (query.mvariable === 'monit') {
            query.mapType = 'rawdata';
        } else {
            query.mapType = 'climatology';
        }

        if (['pe_onset', 'pe_length'].includes(query.mvariable)) {
            $(`#${time_res}-proba-thres-error`).empty();
            proba_thres = $(`#${time_res}-proba-thres-value`).val();
            if (query.mvariable === 'pe_length') {
                query.probaThres = parseInt(proba_thres, 10);
            } else {
                if (isValidMonthDay(proba_thres)) {
                    query.probaThres = proba_thres;
                } else {
                    const frmt = PROBA_OPT.thres[query.mvariable].unit;
                    const msg1 = `Invalid "month-day" date: ${proba_thres}`;
                    const msg2 = `the format must be: ${frmt}`;
                    $(`#${time_res}-proba-thres-error`)
                        .text(`${msg1}, ${msg2}`)
                        .css({ 'color': 'red', 'font-weight': 'bold' });
                    if (offcanvasEvent !== null) {
                        offcanvasEvent.preventDefault();
                    }
                    return false;
                }
            }
            query.probaUnit = 'perc';
        }
        query.rainy_season = queryParamsRainySeason(time_res);
    } else if (query.mapPage === 'crops-suitability') {
        query.mvariable = $(`#${time_res}-map-variable`).val();

        query.startMonth = parseInt($(`#${time_res}-cs-start-mon`).val(), 10);
        query.startDay = parseInt($(`#${time_res}-cs-start-day`).val(), 10);
        query.endMonth = parseInt($(`#${time_res}-cs-end-mon`).val(), 10);
        query.endDay = parseInt($(`#${time_res}-cs-end-day`).val(), 10);
        query.Year = parseInt($(`#${time_res}-cs-tseries-year`).val(), 10);
        query.minFrac = 0.95;

        if (query.mvariable === 'suitability') {
            query.precipLow = Number($(`#${time_res}-cs-precip-low`).val());
            query.precipHigh = Number($(`#${time_res}-cs-precip-high`).val());
            query.tempLow = Number($(`#${time_res}-cs-temp-low`).val());
            query.tempHigh = Number($(`#${time_res}-cs-temp-high`).val());
            query.tempOptim = Number($(`#${time_res}-cs-temp-optim`).val());
            query.nbWetDays = parseInt($(`#${time_res}-cs-nb-wetdays`).val(), 10);
            query.rainThres = Number($(`#${time_res}-cs-rain-thres`).val());
        }
    } else {
        flashMessage(`Unknown maproom page: ${URL_ARGS.page}`, 'error');
        return false;
    }

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

////////////

function displayAgricultureAnalysisMap(time_res, options, map) {
    const query = queryParamsAgricultureAnalysisMap(time_res);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'agriculture_analysis',
        'agriculture_analysis_map'
    );

    let cacheStatusEndpoint = null;
    if (query.mapPage !== 'crops-suitability') {
        cacheStatusEndpoint = createEndpoint(
            'agriculture_analysis',
            'rainy_season_cache_status'
        );
    }

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map,
        cacheStatusEndpoint
    );

    if (request && request.always) {
        request.always(() => {
            if (request.responseJSON.data) {
                if (query.mapPage === 'rainy-season') {
                    map.displayText_date.update(
                        request.responseJSON.data.date
                    );
                }
                if (query.mapPage === 'decision-support') {
                    const text = $(
                        `#${time_res}-map-variable ` +
                        `option[value='${query.mvariable}']`
                    ).text();
                    const options = { position: 'bottomright' };
                    const displayText =
                        addLControlDisplayTextAboveColorBar(
                            'text-ds', options, map
                        );
                    displayText.update(text);
                }
                if (query.mapPage === 'crops-suitability') {
                    date = displayTimeSeriesDateMap(query);
                    map.displayText_date.update(date);
                }
            }
        });
    }

    return request;
}

////////////

function queryParamsClimateMonitoringMap(time_res) {
    let query = new Object();
    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${time_res}-map-variable`).val();
    query.variable = DATA_SET.variables[query.map_variable];

    if (time_res === 'dekadal') {
        const date = $(`#${time_res}-map-date-calendar`).val();
        query.Date = formatDekadDate(date);

        if (['rain_cumul', 'anom_cumul', 'anom_per_cumul'].includes(query.map_variable)) {
            const start_dek = $(`#${time_res}-start-cumul-calendar`).val();

            if (!checkDatesCumul(start_dek, date)) {
                return false;
            }
            query.startDekad = formatDekadDate(start_dek);
            query.minFrac = 1.0;
        } else {
            if (query.map_variable === 'anom_dek') {
                query.anomaly = 'difference';
            }
            if (query.map_variable === 'anom_per_dek') {
                query.anomaly = 'percentage';
            }
            if (query.map_variable === 'spi_dek') {
                query.analysis = 'spi';
                query.distribution = 'gamma';
                query.timeScale = 1;
            }
            if (query.map_variable === 'spei_dek') {
                query.analysis = 'spei';
                query.distribution = 'llogistic';
                query.timeScale = 1;
            }
        }
    } else if (time_res === 'monthly') {
        query.Date = $(`#${time_res}-map-date-calendar`).val();
        if (query.map_variable === 'anom_mon') {
            query.anomaly = 'difference';
        }
        if (query.map_variable === 'anom_per_mon') {
            query.anomaly = 'percentage';
        }
        if (query.map_variable === 'spi_mon') {
            query.analysis = 'spi';
            query.distribution = 'gamma';
            query.timeScale = 1;
        }
        if (query.map_variable === 'spei_mon') {
            query.analysis = 'spei';
            query.distribution = 'llogistic';
            query.timeScale = 1;
        }
    } else if (time_res === 'seasonal') {
        const date = $(`#${time_res}-map-date-calendar`).val();
        query.seasLength = parseInt($(`#${time_res}-map-date-length`).val(), 10);
        if (['spi_seas', 'spei_seas'].includes(query.map_variable)) {
            query.Date = formatSeasonDate(date, query.seasLength, isStart = false);
        } else {
            query.Date = formatSeasonDate(date, query.seasLength);
        }

        if (query.map_variable === 'anom_seas') {
            query.anomaly = 'difference';
        }
        if (query.map_variable === 'anom_per_seas') {
            query.anomaly = 'percentage';
        }
        if (query.map_variable === 'spi_seas') {
            query.analysis = 'spi';
            query.distribution = 'gamma';
            query.timeScale = query.seasLength;
            query.timeRes = 'monthly';
        }
        if (query.map_variable === 'spei_seas') {
            query.analysis = 'spei';
            query.distribution = 'llogistic';
            query.timeScale = query.seasLength;
            query.timeRes = 'monthly';
        }
    } else {
        return false;
    }

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

function displayClimateMonitoringMap(time_res, options, map) {
    const query = queryParamsClimateMonitoringMap(time_res);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_monitoring',
        'climate_monitoring_map'
    );

    let cacheStatusEndpoint = null;
    if (
        [
            'spi_dek', 'spi_mon', 'spi_seas',
            'spei_dek', 'spei_mon', 'spei_seas'
        ].includes(query.map_variable)
    ) {
        cacheStatusEndpoint = createEndpoint(
            'climate_monitoring',
            'monitoring_spei_cache_status'
        );
    }

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map,
        cacheStatusEndpoint
    );

    updateAnalysisMapDate(time_res, query, map);

    return request;
}

////////////

function queryParamsDrmAnalysisMap(time_res) {
    let query = new Object();
    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;

    query.variable = $(`#${time_res}-map-variable`).val();

    query.mapType = 'climatology';
    const tstep_id = `${time_res}-map-date`;
    const bp_id = `${time_res}-base-period`;

    query.dailyAnalysis = true;
    query.minFrac = 1.0;
    query.seasParams = $(`#${time_res}-map-parameters`).val();

    // Force it to use max_temperature or min_temperature for temperature variable 
    if (['max_temperature', 'min_temperature'].includes(query.variable)) {
        const selectedVariable = query.variable;
        query.variable = 'temperature';

        if (query.seasParams === 'seasAvg') {
            query.seasParams = selectedVariable === 'max_temperature' ? 'MaxTemp' : 'MinTemp';
        }
    }

    query.startMonth = parseInt($(`#${tstep_id}-start-mon`).val(), 10);
    query.startDay = parseInt($(`#${tstep_id}-start-day`).val(), 10);
    query.endMonth = parseInt($(`#${tstep_id}-end-mon`).val(), 10);
    query.endDay = parseInt($(`#${tstep_id}-end-day`).val(), 10);

    query.fullYear = false;

    query.seasStats = $(`#${time_res}-map-statistics`).val();

    if (query.seasStats === 'probExc' || query.seasStats === 'probNoExc') {
        query.probaThres = Number($(`#${time_res}-map-climato-probaTh`).val().trim());
        query.probaUnit = $(`#${time_res}-map-climato-probaUnit`).val();
    }

    if (query.variable === 'rainfall') {
        query.defSpell = parseInt($(`#${time_res}-map-def-spell-thres-val`).val().trim(), 10);
    };

    query.defThres = Number($(`#${time_res}-map-def-number-thres-val`).val().trim());


    query.startYear = parseInt($(`#${tstep_id}-start-year`).val().trim(), 10);
    query.endYear = parseInt($(`#${tstep_id}-end-year`).val().trim(), 10);
    query.minYear = parseInt($(`#${tstep_id}-min-year`).val().trim(), 10);

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

function displayDrmAnalysisMap(time_res, options, map) {
    const query = queryParamsDrmAnalysisMap(time_res);

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_analysis',
        'climate_analysis_map'
    );

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map
    );

    updateAnalysisMapDate(time_res, query, map);

    return request;
}

////////////

function queryParamsDrmAnalysisMapSPI(time_res) {
    let query = new Object();
    query.temporalRes = time_res;
    //query.temporalRes = 'seasonal';

    query.dataset = DATA_SET.use;
    /* beautify preserve:start */
    query.map_variable = $(`#${time_res}-map-variable`).val() ?? 'rainfall';
    /* beautify preserve:end */
    query.variable = DATA_SET.variables[query.map_variable];
    //query.variable = 'rainfall';

    query.mapType = 'rawdata';
    const tstep_id = `${time_res}-map-date`;
    const bp_id = `${time_res}-base-period`;

    query.analysis = 'spi';
    query.distribution = 'gamma';
    query.map_variable = 'spi_seas';

    //query.seasStart = parseInt($(`#${tstep_id}-calendar`).val(), 10);
    query.seasLength = parseInt($(`#${tstep_id}-length`).val(), 10);
    query.timeScale = query.seasLength;
    query.timeRes = 'monthly';

    query.startYear = parseInt($(`#${bp_id}-start`).val(), 10);
    query.endYear = parseInt($(`#${bp_id}-end`).val(), 10);
    query.minYear = parseInt($(`#${bp_id}-min`).val(), 10);

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    // const date = $(`#${time_res}-map-date-calendar`).val();
    // query.Date = formatSeasonDate(date);
    // //query.Date = formatSeasonDate(date, query.seasLength, true);
    // const date = $(`#${time_res}-map-date-calendar`).val();
    // query.Date = formatSeasonDate(date, query.seasLength, isStart = false);

    const date = $(`#${tstep_id}-calendar`).val();

    query.seasStart = Number(date.split('-')[1]);
    query.Date = formatSeasonDate(date, query.seasLength, true);
    return query;
}

function displayDrmAnalysisMapSPI(time_res, options, map) {
    const query = queryParamsDrmAnalysisMapSPI(time_res);
    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_monitoring',
        'climate_monitoring_map'
    );

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map
    );

    updateAnalysisMapDate(time_res, query, map);

    return request;
}

////////////

function queryParamsClimateSeasFcstMap(time_res) {
    let query = new Object();
    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${time_res}-map-variable`).val();
    query.variable = query.map_variable;

    query.year = $(`#${time_res}-forecast-issued-year`).val();
    query.issued = $(`#${time_res}-forecast-issued-month`).val();
    query.target = $(`#${time_res}-forecast-target`).val();

    query.forecast = $(`#${time_res}-forecast-type`).val();
    if (query.forecast === 'flexible') {
        query.parameter = $(`#${time_res}-flexible-parameters`).val();
        if (['probExc', 'probNoExc'].includes(query.parameter)) {
            query.probaType = $(`#${time_res}-flexible-proba-thres`).val();
            if (query.probaType === 'percentile') {
                query.probaThres = Number($(`#${time_res}-flexible-proba-value-1`).val().trim());
            } else {
                query.probaThres = Number($(`#${time_res}-flexible-proba-value-2`).val().trim());
            }
        }
    }

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

function displayClimateSeasFcstMap(time_res, options, map) {
    const query = queryParamsClimateSeasFcstMap(time_res);
    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_forecast',
        'climate_forecast_seas_map'
    );

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map
    );

    const date = `${query.target} ${query.year}`;
    map.displayText_date.update(date);
    // updateAnalysisMapDate(time_res, query, map);

    return request;
}

////////////

function queryParamsClimate10dasyFcstMap(time_res) {
    let query = new Object();
    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;
    query.map_variable = $(`#${time_res}-map-variable`).val();
    query.variable = query.map_variable;

    query.issued = $(`#${time_res}-map-date-calendar`).val();
    query.parameter = $(`#${time_res}-map-parameter`).val();

    const colorbar = colorbarGetData();
    if (!colorbar) {
        return false;
    }
    query.colorbar = colorbar;

    return query;
}

function displayClimate10daysFcstMap(time_res, options, map) {
    const query = queryParamsClimate10dasyFcstMap(time_res);
    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_forecast',
        'climate_forecast_10days_map'
    );

    const request = ajaxLeafletMap(
        endpoint,
        query,
        displayRasterImage,
        options,
        map
    );

    const start = $(`#${time_res}-forecast-target-start`).text();
    const end = $(`#${time_res}-forecast-target-end`).text();
    const disp = `Forecast for: ${start} -> ${end}, issued on: ${query.issued}`;
    map.displayText_date.update(disp);

    return request;
}

////////////

function queryParamsClimateProjectionSeasonalMap() {
    const prefix = 'seasonal-seasonal-proj';

    const query = {
        temporalRes: 'seasonal',
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
        query.yearstartH,
        query.yearstartFut,
        // query.climPeriod
    ].every(value => Number.isInteger(value) && value > 0);

    if (
        !valid ||
        query.seasStart > 12 ||
        query.seasEnd > 12
    ) {
        flashMessage('Enter valid months, years and period length.', 'error');
        return false;
    }

    query.colorbar = colorbarGetData();

    if (!query.colorbar) {
        return false;
    }

    return query;
}


// function displayClimateProjectionSeasonalMap(options, map) {
//     const query = queryParamsClimateProjectionSeasonalMap();

//     if (!query) {
//         return false;
//     }

//     const endpoint = createEndpoint(
//         'climate_projection',
//         'climate_projection_seasonal_map'
//     );

//     return ajaxLeafletMap(
//         endpoint,
//         query,
//         (data, settings, targetMap) => {
//             displayRasterImage(data, settings, targetMap);
//             targetMap.displayText_date.update(data.date);
//         },
//         options,
//         map
//     );

// }


function queryParamsClimateProjectionAgreementMap() {
    const prefix = 'seasonal-model-proj';

    const query = {
        temporalRes: 'seasonal',
        variable: $(`#${prefix}-variable`).val(),
        scenario: $(`#${prefix}-scenario`).val(),
        change: $(`#${prefix}-change-signal`).val(),
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
    const integers = [
        query.seasStart,
        query.seasEnd,
        query.yearstartFut,
        // query.climPeriod
    ].every(value => Number.isInteger(value) && value > 0);

    if (
        !integers ||
        query.seasStart > 12 ||
        query.seasEnd > 12 ||
        // query.yearstartFut < 2015 ||
        !query.variable ||
        !query.scenario ||
        !['positive', 'negative'].includes(query.change)
    ) {
        flashMessage(
            'Enter valid seasonal and period parameters.',
            'error'
        );
        return false;
    }

    return query;
}


function displayClimateProjectionAgreementMap(options, map) {
    const query = queryParamsClimateProjectionAgreementMap();

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_projection',
        'climate_projection_agreement_map'
    );

    return ajaxLeafletMap(
        endpoint,
        query,
        (data, settings, targetMap) => {
            displayRasterImage(data, settings, targetMap);
            targetMap.displayText_date.update(data.date);
        },
        options,
        map
    );
}


///////

function queryParamsClimateProjectionSpi(
    prefix = 'monthly-spi-proj'
) {
    if (!$(`#${prefix}-gcm`).data('spiCalendarReady')) {
        return false;
    }

    const query = {
        temporalRes: 'monthly',
        variable: 'rainfall',
        analysis: 'spi',
        timeScale: Number($(`#${prefix}-timescale`).val()),
        distribution: $(`#${prefix}-distribution`).val(),
        model: $(`#${prefix}-gcm`).val(),
        scenario: $(`#${prefix}-scenario`).val()
    };

    if (
        !query.model ||
        !query.scenario ||
        !['gamma', 'peasron3'].includes(query.distribution) ||
        !Number.isInteger(query.timeScale) ||
        query.timeScale < 2 ||
        query.timeScale > 12
    ) {
        flashMessage('Select valid SPI parameters.', 'error');
        return false;
    }

    return query;
}


function queryParamsClimateProjectionSpiMap() {
    const prefix = 'monthly-spi-proj';
    const query = queryParamsClimateProjectionSpi(prefix);

    if (!query) {
        return false;
    }

    query.mapMonth = String(
        $(`#${prefix}-map-date-calendar`).val() || ''
    ).slice(0, 7);

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(query.mapMonth)) {
        flashMessage('Select a valid start month.', 'error');
        return false;
    }

    query.colorbar = colorbarGetData();

    if (!query.colorbar) {
        return false;
    }

    return query;
}


function displayClimateProjectionSpiMap(options, map) {
    const query = queryParamsClimateProjectionSpiMap();
    setProjectionSpiSeasonMonths('monthly');

    if (!query) {
        return false;
    }

    return ajaxLeafletMap(
        createEndpoint(
            'climate_projection',
            'climate_projection_spi_map'
        ),
        query,
        (data, settings, targetMap) => {
            displayRasterImage(data, settings, targetMap);
            // targetMap.displayText_date.update(data.date);
            const label = $('<div>')
                .text(data.date)
                .html();

            targetMap.displayText_date.update(
                label.replace(': ', ':<br>')
            );
        },
        options,
        map
    );
}


function displayClimateProjectionSeasonalMap(options, map) {
    const query = queryParamsClimateProjectionSeasonalMap();

    if (!query) {
        return false;
    }

    const endpoint = createEndpoint(
        'climate_projection',
        'climate_projection_seasonal_map'
    );

    return ajaxLeafletMap(
        endpoint,
        query,
        (data, settings, targetMap) => {
            displayRasterImage(data, settings, targetMap);
            targetMap.displayText_date.update(data.date);

            const resolution = $(
                '#seasonal-seasonal-proj-gcm'
            ).data('projectionSpatialResolution');

            if (resolution && data.spatial_resolution) {
                Object.assign(
                    resolution,
                    data.spatial_resolution
                );

                if (
                    $('#support-spatial-average').val() ===
                    'gridpoint'
                ) {
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
        },
        options,
        map
    );
}

///////

function queryParamsHealthWasp(tempRes, prefix = `${tempRes}-wasp-map`) {
    const query = {
        dataset: DATA_SET.use,
        temporalRes: 'monthly',
        variable: 'rainfall',
        analysis: 'wasp',
        timeScale: Number(
            $(`#${prefix}-timescale`).val()
        ),
        startYear: Number(
            $(`#${prefix}-base-start`).val()
        ),
        endYear: Number(
            $(`#${prefix}-base-end`).val()
        ),
        minYear: Number(
            $(`#${prefix}-base-min`).val()
        )
    };

    const valid = (
        Number.isInteger(query.timeScale) &&
        query.timeScale >= 1 &&
        query.timeScale <= 12 &&
        Number.isInteger(query.startYear) &&
        query.startYear >= 1 &&
        query.startYear <= 9998 &&
        Number.isInteger(query.endYear) &&
        query.endYear >= query.startYear &&
        query.endYear <= 9998 &&
        Number.isInteger(query.minYear) &&
        query.minYear >= 2 &&
        query.minYear <= query.endYear - query.startYear + 1
    );

    if (!valid) {
        flashMessage(
            'Enter valid accumulation and calibration parameters.',
            'error'
        );
        return false;
    }

    return query;
}


function queryParamsHealthWaspMap(tempRes) {
    const prefix = `${tempRes}-wasp-map`;
    const control = $(`#${prefix}-control`);

    if (!control.data('waspCalendarReady')) {
        return false;
    }

    const query = queryParamsHealthWasp(tempRes, prefix);

    if (!query) {
        return false;
    }

    const coverage = control.data('waspCoverage');

    const endingMonth = String(
        $(`#${tempRes}-map-date-calendar`).val() || ''
    ).trim();

    if (
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(endingMonth) ||
        endingMonth < coverage.start.slice(0, 7) ||
        endingMonth > coverage.end.slice(0, 7)
    ) {
        flashMessage(
            'Select an ending month within WASP coverage.',
            'error'
        );
        return false;
    }

    const beginning = new Date(
        `${endingMonth}-01T00:00:00Z`
    );

    beginning.setUTCMonth(
        beginning.getUTCMonth() - query.timeScale + 1
    );

    query.Date = endingMonth;
    query.StartDate = beginning.toISOString().slice(0, 7);
    query.comparisonStartYear = Number(
        $(`#${prefix}-comparison-start`).val()
    );

    query.comparisonEndYear = Number(
        $(`#${prefix}-comparison-end`).val()
    );

    query.comparisonStartMonth = Number(
        $(`#${prefix}-comparison-month-calendar`).val()
    );

    const validBase = (
        [
            query.comparisonStartYear,
            query.comparisonEndYear,
            query.comparisonStartMonth
        ].every(Number.isInteger) &&
        query.comparisonStartYear >= 1 &&
        query.comparisonEndYear >= query.comparisonStartYear &&
        query.comparisonEndYear <= 9998 &&
        query.comparisonStartMonth >= 1 &&
        query.comparisonStartMonth <= 12
    );

    if (!validBase) {
        flashMessage(
            'Select valid base years and starting month.',
            'error'
        );
        return false;
    }

    const baseMonth = String(
        query.comparisonStartMonth
    ).padStart(2, '0');

    const firstStart = (
        `${String(query.comparisonStartYear).padStart(4, '0')}-${baseMonth}`
    );

    const lastStart = (
        `${String(query.comparisonEndYear).padStart(4, '0')}-${baseMonth}`
    );

    if (
        firstStart < coverage.map_start.slice(0, 7) ||
        lastStart > coverage.map_end.slice(0, 7)
    ) {
        flashMessage(
            'Select base-year windows within rainfall coverage.',
            'error'
        );
        return false;
    }

    query.colorbar = colorbarGetData();

    if (!query.colorbar) {
        return false;
    }

    return query;
}


function displayHealthWaspMap(tempRes, options, map) {
    const query = queryParamsHealthWaspMap(tempRes);

    if (!query) {
        return false;
    }

    return ajaxLeafletMap(
        createEndpoint(
            'health_malaria',
            'health_wasp_map'
        ),
        query,
        (data, settings, targetMap) => {
            displayRasterImage(
                data,
                settings,
                targetMap
            );

            const label = $('<div>')
                .text(data.date)
                .html();

            targetMap.displayText_date.update(
                label.replace('; ', '<br>')
            );
        },
        options,
        map
    );
}

///////
function queryParamsHealthCmstMap(time_res) {
    let query = new Object();

    query.temporalRes = time_res;
    query.dataset = DATA_SET.use;
    query.variable = $(`#${time_res}-map-variable`).val();
    query.mapType = $(`#${time_res}-map-type`).val();
    query.cmstProduct = $(`#${time_res}-map-cmst-product`).val();

    const tstep_id = `${time_res}-map-date`;
    const bp_id = `${time_res}-base-period`;

    let date = $(`#${tstep_id}-calendar`).val();
    date = date === '' ? '1' : date;

    query.climDate = parseInt(date, 10);

    query.startYear = parseInt(
        $(`#${bp_id}-start`).val().trim(), 10
    );

    query.endYear = parseInt(
        $(`#${bp_id}-end`).val().trim(), 10
    );

    query.minYear = parseInt(
        $(`#${bp_id}-min`).val().trim(), 10
    );

    const colorbar = colorbarGetData();

    if (!colorbar) {
        return false;
    }

    query.colorbar = colorbar;

    return query;
}

function displayHealthCmstMap(tempRes, options, map) {
    const query = queryParamsHealthCmstMap(tempRes);

    if (!query) {
        return false;
    }

    return ajaxLeafletMap(
        createEndpoint(
            'health_malaria',
            'health_cmst_map'
        ),
        query,
        (data, settings, targetMap) => {
            displayRasterImage(
                data,
                settings,
                targetMap
            );

            const label = $('<div>')
                .text(data.date)
                .html();

            targetMap.displayText_date.update(label);
            preview_health_cmst_display_charts(tempRes);
        },
        options,
        map
    );
}
