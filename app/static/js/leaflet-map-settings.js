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
    } else if (time_res === 'seasonal') {
        const date = $(`#${time_res}-map-date-calendar`).val();
        query.seasLength = parseInt($(`#${time_res}-map-date-length`).val(), 10);
        if (query.map_variable === 'spi_seas') {
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
        ['spi_dek', 'spi_mon', 'spi_seas']
        .includes(query.map_variable)
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