function arrayRemoveDuplicates(arr) {
    return arr.filter((item, index) => arr.indexOf(item) === index);
}

function setVisibility(showIds = [], hideIds = []) {
    showIds.forEach(id => $(`#${id}`).show());
    hideIds.forEach(id => $(`#${id}`).hide());
}

function orderSelect2SelectedItems(selector) {
    let select = $(selector);
    let selItems = [];

    function reorderOptions() {
        let selOpts = select.find('option:selected');

        selOpts.sort(function(a, b) {
            return selItems.indexOf(a.value) - selItems.indexOf(b.value);
        });

        selOpts.detach().appendTo(select);
        select.trigger('change.select2');
    }

    select.on('select2:select', function(e) {
        const id = e.params.data.id;
        if (selItems.indexOf(id) === -1) {
            selItems.push(id);
        }
        reorderOptions();
    });

    select.on('select2:unselect', function(e) {
        const id = e.params.data.id;
        const ix = selItems.indexOf(id);
        if (ix > -1) {
            selItems.splice(ix, 1);
        }
        reorderOptions();
    });
}

function getInputGroupHeight() {
    const divCont = $('<div>')
        .attr('id', 'test-div')
        .addClass('input-group')
        .appendTo('body');
    const span = $('<span>')
        .addClass('input-group-text')
        .text('Test')
        .appendTo(divCont);
    const hgt = span.outerHeight();
    divCont.remove();
    return hgt;
}

function getSelect2Height() {
    const divCont = $('<div>')
        .attr('id', 'test-div')
        .appendTo('body');
    let select = $('<select>')
        .attr('id', 'test-id')
        .addClass('form-select')
        .appendTo(divCont);
    select.append(
        $('<option>').text('Test').val(1)
    );
    select.select2({
        minimumResultsForSearch: -1
    }).trigger('change');
    const hgt = $('#select2-test-id-container')
        .outerHeight();
    divCont.remove();
    return hgt;
}

function adjustSelect2Height(select_id, input_group = true) {
    let hgt;
    if (input_group) {
        hgt = getInputGroupHeight();
    } else {
        hgt = getSelect2Height();
    }
    const hgt0 = parseInt(hgt, 10);
    const hgt1 = hgt0 - 2;

    const $select2 = $(`#${select_id}`).next('.select2');
    $select2.find('.select2-selection--single')
        .css({
            'min-height': hgt0 + 'px'
        });
    $select2.find('.select2-selection__rendered')
        .css({
            'line-height': hgt1 + 'px'
        });
    $select2.find('.select2-selection__arrow')
        .css({
            'height': hgt1 + 'px'
        });
}

function initiDialogBoxSelect2(selector, controlSelector) {
    $(selector).each(function() {
        const this_select = $(this);
        const settingsDialog = this_select.closest('.dialog-box-settings');
        this_select.select2({
            minimumResultsForSearch: -1,
            dropdownParent: settingsDialog.length ? settingsDialog : $(controlSelector)
        });
    });
}

function checkDatesCumul(start_dek, end_dek) {
    const date1 = new Date(start_dek);
    const date2 = new Date(end_dek);
    if (date1 >= date2) {
        flashMessage('The start dekad must be earlier than the current target dekad', 'error');
        return false;
    }
    const diff_dek = date2 - date1;
    const one_year_ms = 365 * 24 * 60 * 60 * 1000;
    if (diff_dek > one_year_ms) {
        flashMessage('The difference between start dekad and the current target dekad must be less than one year', 'error');
        return false;
    }

    return true;
}

function getStartDekadCumul(tempRes, variable) {
    const date_cov = getTempCoverageCalendar(
        DATA_SET.use, tempRes, variable
    );
    let date_arr = date_cov.end.split('-');
    date_arr[1] = String(DEKAD_SINCE.month).padStart(2, '0');

    const dk = DEKAD_SINCE.dekad.toString();
    if (dk === '1') {
        date_arr[2] = '01';
    } else if (dk === '2') {
        date_arr[2] = '11';
    } else {
        date_arr[2] = '21';
    }

    let date_start = new Date(date_arr.join('-'));
    const date_end = new Date(date_cov.end);
    if (date_end < date_start) {
        date_start.setFullYear(date_start.getFullYear() - 1);
    }
    return date_start.toISOString().split('T')[0];
}

//////////////

function ensoDatasetTempCoverage(dataset) {
    const requests = [];

    function traverse(obj, parent) {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {

                // Found an object containing a table key
                if (obj[key].table) {
                    const table = obj[key].table;

                    const req = $.ajax({
                        type: 'POST',
                        url: '/enso_temporal_coverage',
                        dataType: 'json',
                        data: JSON.stringify({
                            parent: parent,
                            table: table
                        }),
                        contentType: 'application/json'
                    }).then((coverage) => {
                        obj[key].coverage = coverage;
                    });

                    requests.push(req);
                }

                traverse(obj[key], parent);
            }
        }
    }

    // Start traversal from each top-level parent
    for (const parent in dataset) {
        traverse(dataset[parent], parent);
    }

    return Promise.all(requests).then(() => dataset);
}

//////////////

function makeCopy(obj) {
    const js = JSON.stringify(obj);
    return JSON.parse(js);
}

function deepMerge(target, source) {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, {
                        [key]: source[key]
                    });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, {
                    [key]: source[key]
                });
            }
        });
    }
    return output;
}

function pretty(x, n = 5) {
    if (x.length === 0) return [];

    const min = Math.min(...x);
    const max = Math.max(...x);

    const d = max - min;

    if (d === 0) {
        const defaultRange = max * 0.05;
        if (defaultRange === 0) return [min - 1, min, min + 1];
        return pretty([min - defaultRange, min + defaultRange], n);
    }

    const c = d / n;
    const base = Math.pow(10, Math.floor(Math.log10(c)));
    const unit = [1, 2, 5, 10].find(u => (u * base) >= c) * base;

    const start = Math.floor(min / unit) * unit;
    let end = Math.ceil(max / unit) * unit;

    while (end < max) {
        end += unit;
    }

    const result = [];
    for (let i = start; i <= end; i += unit) {
        result.push(i);
    }

    return result;
}

function generateSequence01(length) {
    if (length < 2) return [0];
    const step = 1 / (length - 1);
    return Array.from({ length }, (_, i) => i * step);
}

//////////////

function refreshSpatialAverage(tempRes, datasetFromVariable = false) {
    const variable = $(`#${tempRes}-map-variable option:selected`).val();
    const dset = DATA_SET.use;
    const pvar = DATA_SET.variables[variable][0];
    const data = DATA_INFO[dset][tempRes][pvar];
    const dataRes = data.spatial_resolution;

    setSelectSpatialAverage(dataRes);
}

//////////////

function setAnalysisParamsDefDaily(time_res, type_p) {
    const prefix = `#${time_res}-${type_p}`;
    const this_var = $(`${prefix}-variable`).val();
    const this_par = $(`${prefix}-parameters`).val();

    const var_def = PARAMS_DEF[this_var];
    if (!var_def) return false;

    function setNumberInputs() {
        $(`${prefix}-def-number-thres-lab`)
            .text(var_def.number.label);
        $(`${prefix}-def-number-thres-txt`)
            .text(var_def.number.text);
        $(`${prefix}-def-number-thres-val`)
            .val(var_def.number.value);
        $(`${prefix}-def-number-thres-unit`)
            .text(var_def.number.unit);
    }

    function setSpellInputs() {
        $(`${prefix}-def-spell-thres-lab`)
            .text(var_def.spell.label);
        $(`${prefix}-def-spell-thres-val`)
            .val(var_def.spell.value);
        $(`${prefix}-def-spell-thres-txt`)
            .text(var_def.spell.text);
    }

    const rules = {
        rainfall: {
            numberOnly: ['NumWD', 'NumDD', 'RainInt', 'LongDS', 'LongWS'],
            numberAndSpell: ['NumDS', 'NumWS'],
            spellOnly: []
        },
        temperature: {
            numberOnly: ['NumCD', 'NumHD'],
            numberAndSpell: [],
            spellOnly: ['CDD', 'HDD', 'GDD']
        }
    };

    const rule = rules[this_var];
    if (!rule) return false;

    const showNumber =
        rule.numberOnly.includes(this_par) ||
        rule.numberAndSpell.includes(this_par);

    const showSpell =
        rule.spellOnly.includes(this_par) ||
        rule.numberAndSpell.includes(this_par);

    $(`${prefix}-def-number`).toggle(showNumber);
    $(`${prefix}-def-spell`).toggle(showSpell);

    if (showNumber) setNumberInputs();
    if (showSpell) setSpellInputs();

    return true;
}

function setClimateVariableTelecon(tempRes, variable, idsuffix) {
    const clim_var = CLIMATE_VAR[variable];

    $(`#${tempRes}-${idsuffix}`).empty();
    for (const [k, v] of Object.entries(clim_var)) {
        $(`#${tempRes}-${idsuffix}`).append(
            $('<option>').text(v).val(k)
        );
    }
}

function getTempCoverageCalendarEnso(tempRes, ensoPars) {
    let temp_cov;
    if (ensoPars.ensoIdx === 'oni') {
        temp_cov = DATA_ENSO[ensoPars.ensoIdx][ensoPars.oni].coverage;
    } else if (ensoPars.ensoIdx === 'iod') {
        temp_cov = DATA_ENSO[ensoPars.ensoIdx][ensoPars.iod].coverage;
    } else if (ensoPars.ensoIdx === 'nao') {
        temp_cov = DATA_ENSO[ensoPars.ensoIdx][ensoPars.nao].coverage;
    } else if (ensoPars.ensoIdx === 'atl3') {
        temp_cov = DATA_ENSO[ensoPars.ensoIdx][ensoPars.atl3].coverage;
    } else if (ensoPars.ensoIdx === 'anom') {
        if (ensoPars.ensoTRes === 'weekly') {
            temp_cov = DATA_ENSO[ensoPars.ensoIdx][ensoPars.ensoTRes][ensoPars.week].coverage;
        } else {
            tcov = DATA_ENSO[ensoPars.ensoIdx][ensoPars.ensoTRes][ensoPars.month].coverage;
            temp_cov = makeCopy(tcov);
            temp_cov.start = `${temp_cov.start}-16`;
            temp_cov.end = `${temp_cov.end}-16`;
        }
    } else {
        temp_cov = null;
    }
    return temp_cov;
}

function setAnalysisVisibilityEnso(time_res) {
    const ensoIdx = $(`#${time_res}-enso-indices`).val();

    if (['proba', 'strength'].includes(ensoIdx)) {
        setVisibility(
            [],
            [
                `${time_res}-oni-indices-opt`,
                `${time_res}-anom-tempres-opt`,
                `${time_res}-iod-sst-opt`,
                `${time_res}-anom-sstweek-opt`,
                `${time_res}-anom-sstmonth-opt`,
                `${time_res}-anom-ninoregion-opt`,
                `${time_res}-anom-ninotype-opt`,
                `${time_res}-enso-startdate-opt`,
                `${time_res}-enso-enddate-opt`,
                `${time_res}-disp-image-enso-opt`,
                `${time_res}-disp-lastval-enso-opt`
            ]
        );
    } else if (ensoIdx === 'oni') {
        setVisibility(
            [
                `${time_res}-oni-indices-opt`,
                `${time_res}-enso-startdate-opt`,
                `${time_res}-enso-enddate-opt`,
                `${time_res}-disp-image-enso-opt`,
                `${time_res}-disp-lastval-enso-opt`
            ],
            [
                `${time_res}-anom-tempres-opt`,
                `${time_res}-iod-sst-opt`,
                `${time_res}-anom-sstweek-opt`,
                `${time_res}-anom-sstmonth-opt`,
                `${time_res}-anom-ninoregion-opt`,
                `${time_res}-anom-ninotype-opt`
            ]
        );
    } else if (ensoIdx === 'iod') {
        setVisibility(
            [
                `${time_res}-iod-sst-opt`,
                `${time_res}-enso-startdate-opt`,
                `${time_res}-enso-enddate-opt`,
                `${time_res}-disp-image-enso-opt`,
                `${time_res}-disp-lastval-enso-opt`
            ],
            [
                `${time_res}-oni-indices-opt`,
                `${time_res}-anom-tempres-opt`,
                `${time_res}-anom-sstweek-opt`,
                `${time_res}-anom-sstmonth-opt`,
                `${time_res}-anom-ninoregion-opt`,
                `${time_res}-anom-ninotype-opt`
            ]
        );
    } else if (ensoIdx === 'nao') {
        setVisibility(
            [
                `${time_res}-enso-startdate-opt`,
                `${time_res}-enso-enddate-opt`,
                `${time_res}-disp-image-enso-opt`,
                `${time_res}-disp-lastval-enso-opt`
            ],
            [
                `${time_res}-iod-sst-opt`,
                `${time_res}-oni-indices-opt`,
                `${time_res}-anom-tempres-opt`,
                `${time_res}-anom-sstweek-opt`,
                `${time_res}-anom-sstmonth-opt`,
                `${time_res}-anom-ninoregion-opt`,
                `${time_res}-anom-ninotype-opt`
            ]
        );
    } else if (ensoIdx === 'atl3') {
        setVisibility(
            [
                `${time_res}-enso-startdate-opt`,
                `${time_res}-enso-enddate-opt`,
                `${time_res}-disp-image-enso-opt`,
                `${time_res}-disp-lastval-enso-opt`
            ],
            [
                `${time_res}-iod-sst-opt`,
                `${time_res}-oni-indices-opt`,
                `${time_res}-anom-tempres-opt`,
                `${time_res}-anom-sstweek-opt`,
                `${time_res}-anom-sstmonth-opt`,
                `${time_res}-anom-ninoregion-opt`,
                `${time_res}-anom-ninotype-opt`
            ]
        );
    } else {
        const ensoTRes = $(`#${time_res}-anom-tempres`).val();
        if (ensoTRes === 'weekly') {
            setVisibility(
                [
                    `${time_res}-anom-tempres-opt`,
                    `${time_res}-anom-sstweek-opt`,
                    `${time_res}-anom-ninoregion-opt`,
                    `${time_res}-anom-ninotype-opt`,
                    `${time_res}-enso-startdate-opt`,
                    `${time_res}-enso-enddate-opt`,
                    `${time_res}-disp-image-enso-opt`,
                    `${time_res}-disp-lastval-enso-opt`
                ],
                [
                    `${time_res}-oni-indices-opt`,
                    `${time_res}-iod-sst-opt`,
                    `${time_res}-anom-sstmonth-opt`
                ]
            );
        } else {
            setVisibility(
                [
                    `${time_res}-anom-tempres-opt`,
                    `${time_res}-anom-sstmonth-opt`,
                    `${time_res}-anom-ninoregion-opt`,
                    `${time_res}-anom-ninotype-opt`,
                    `${time_res}-enso-startdate-opt`,
                    `${time_res}-enso-enddate-opt`,
                    `${time_res}-disp-image-enso-opt`,
                    `${time_res}-disp-lastval-enso-opt`
                ],
                [
                    `${time_res}-oni-indices-opt`,
                    `${time_res}-iod-sst-opt`,
                    `${time_res}-anom-sstweek-opt`
                ]
            );
        }
    }

    if (['oni', 'iod', 'nao', 'atl3', 'anom'].includes(ensoIdx)) {
        const ensoImg = $(`#${time_res}-disp-image-enso`).val();
        if (ensoImg === 'image') {
            $(`#${time_res}-disp-lastval-enso-opt`).show();
        } else {
            $(`#${time_res}-disp-lastval-enso-opt`).hide();
        }
    }
}

function setAnalysisAnomaliesEnso(contChart, tempRes) {
    const ensoTRes = $(`#${tempRes}-anom-tempres`).val();
    let anom_list;
    if (ensoTRes === 'weekly') {
        const sst_wk = $(`#${tempRes}-anom-sstweek`).val();
        anom_list = DATA_ENSO.anom.weekly[sst_wk].anomaly;
    } else {
        const sst_mo = $(`#${tempRes}-anom-sstmonth`).val();
        anom_list = DATA_ENSO.anom.monthly[sst_mo].anomaly;
    }

    const anom_type = anom_list.map(x => x.split('_')[0]);
    const anom_reg = anom_list.map(x => x.split('_')[1]);
    const anom_grp = anom_type.reduce((acc, key, i) => {
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(anom_reg[i]);
        return acc;
    }, {});
    const anom_select = anom_type.filter(function(item, pos) {
        return anom_type.indexOf(item) == pos;
    });

    $(`#${tempRes}-anom-ninotype`).empty();
    for (const m of anom_select) {
        $(`#${tempRes}-anom-ninotype`).append(
            $('<option>')
            .text(ANOM_ENSO[m])
            .val(m)
        );
    }

    $(`#${tempRes}-anom-ninotype`)
        .off('change.teleconIndex')
        .on('change.teleconIndex', function() {
            $(`#${tempRes}-anom-ninoregion`).empty();
            const v = $(`#${tempRes}-anom-ninotype`).val();
            const grp = anom_grp[v];
            for (const r of grp) {
                $(`#${tempRes}-anom-ninoregion`).append(
                    $('<option>')
                    .text(REGION_ENSO[r])
                    .val(r)
                );
            }
            expand_analysis_charts_enso(contChart, tempRes);
        });
    $(`#${tempRes}-anom-ninotype`).trigger('change');
}

//////////////

function setAnalysisDateCalendarEnso(tempRes) {
    const ensoIdx = $(`#${tempRes}-enso-indices`).val();
    if (['proba', 'strength'].includes(ensoIdx)) {
        return false;
    }

    let ensoTRes;
    if (['oni', 'iod', 'nao', 'atl3'].includes(ensoIdx)) {
        ensoTRes = 'monthly';
    } else {
        ensoTRes = $(`#${tempRes}-anom-tempres`).val();
    }

    let ensoPars = { ensoIdx: ensoIdx };
    ensoPars.ensoTRes = ensoTRes;
    ensoPars.oni = $(`#${tempRes}-oni-indices`).val();
    ensoPars.iod = $(`#${tempRes}-iod-sst`).val();
    ensoPars.nao = $(`#${tempRes}-nao-cdas`).val();
    ensoPars.atl3 = $(`#${tempRes}-atl3-cdas`).val();
    ensoPars.week = $(`#${tempRes}-anom-sstweek`).val();
    ensoPars.month = $(`#${tempRes}-anom-sstmonth`).val();
    const temp_cov = getTempCoverageCalendarEnso(tempRes, ensoPars);

    setDateCalendar(
        `${tempRes}-chart-enso-enddate`,
        temp_cov, null, ensoTRes,
        temp_cov.end,
        mapNavigation = false,
        dispYear = false,
        isStart = false,
        ensoData = true
    );

    let disp_start;
    let te;
    if (ensoTRes === 'weekly') {
        te = addDateYears(temp_cov.end, -5);
        disp_start = formatDateToString(te, true);
    } else {
        te = addDateYears(temp_cov.end, -30);
        disp_start = formatDateToString(te, false);
    }
    setDateCalendar(
        `${tempRes}-chart-enso-startdate`,
        temp_cov, null, ensoTRes,
        // temp_cov.start,
        disp_start,
        mapNavigation = false,
        dispYear = false,
        isStart = true,
        ensoData = true
    );
}

function setAnalysisDateCalendarSeasonal(tempRes, chType, pltVar, dYear) {
    const end_date = $(`#${tempRes}-${chType}-enddate-calendar`).val();
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
        `${tempRes}-${chType}-enddate`,
        `${tempRes}-${pltVar}-variable`,
        DATA_SET.use, tempRes,
        disp_end,
        mapNavigation = false,
        dispYear = dYear,
        isStart = false
    );

    const start_date = $(`#${tempRes}-${chType}-startdate-calendar`).val();
    let disp_start;
    if (start_date === '') {
        const varTs = $(`#${tempRes}-${pltVar}-variable`).val();
        const trange = getTemporalRangeCalendar(
            DATA_SET.use,
            tempRes, varTs, 30
        );
        disp_start = trange.start;
    } else {
        if (start_date.length == 4) {
            disp_start = `${start_date}-01`;
        } else {
            disp_start = start_date;
        }
    }

    setDateCalendar(
        `${tempRes}-${chType}-startdate`,
        `${tempRes}-${pltVar}-variable`,
        DATA_SET.use, tempRes,
        disp_start,
        mapNavigation = false,
        dispYear = dYear,
        isStart = true
    );
}

function setAnalysisDateCalendarMonDay(tempRes, chType) {
    setMonthsDaysCalendar(
        `${tempRes}-${chType}-start-mon`,
        `${tempRes}-${chType}-start-day`,
        SEASON_DEF.days.start_mon,
        SEASON_DEF.days.start_day,
        true
    );

    setMonthsDaysCalendar(
        `${tempRes}-${chType}-end-mon`,
        `${tempRes}-${chType}-end-day`,
        SEASON_DEF.days.end_mon,
        SEASON_DEF.days.end_day,
        false
    );
}

function setAnalysisDateCalendarRaw(tempRes) {
    let tperiod = 5;
    let disp_year = false;
    if (tempRes === 'seasonal') {
        tperiod = 30;
        disp_year = true;
    }

    const end_date = $(`#${tempRes}-chart-raw-enddate-calendar`).val();
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
        `${tempRes}-chart-raw-enddate`,
        `${tempRes}-chart-raw-variable`,
        DATA_SET.use,
        tempRes, disp_end,
        mapNavigation = false,
        dispYear = disp_year,
        isStart = false
    );

    const start_date = $(`#${tempRes}-chart-raw-startdate-calendar`).val();
    let disp_start;
    if (start_date === '') {
        const varTs = $(`#${tempRes}-chart-raw-variable`).val();
        const trange = getTemporalRangeCalendar(
            DATA_SET.use,
            tempRes, varTs, tperiod
        );
        disp_start = trange.start;
    } else {
        if (start_date.length == 4) {
            disp_start = `${start_date}-01`;
        } else {
            disp_start = start_date;
        }
    }

    setDateCalendar(
        `${tempRes}-chart-raw-startdate`,
        `${tempRes}-chart-raw-variable`,
        DATA_SET.use,
        tempRes, disp_start,
        mapNavigation = false,
        dispYear = disp_year,
        isStart = true
    );
}

function setRainySeasonCalendarOnset(tempRes, chartType = null) {
    let prefixID
    if (chartType === null) {
        prefixID = tempRes;
    } else {
        prefixID = `${tempRes}-${chartType}`;
    }
    setMonthsDaysCalendar(
        `${prefixID}-onset-start-mon`,
        `${prefixID}-onset-start-day`,
        RAINY_SEASON.onset.startMonth,
        RAINY_SEASON.onset.startDay,
        true
    );

    setMonthsDaysCalendar(
        `${prefixID}-cessation-start-mon`,
        `${prefixID}-cessation-start-day`,
        RAINY_SEASON.cessation.startMonth,
        RAINY_SEASON.cessation.startDay,
        false
    );
}

//////////////

function setClimateSeasonStartLengthExpand(
    tempRes, cType, boxCtrl,
    startMonth = SEASON_DEF.months.start
) {
    setNamesCalendar(
        `${tempRes}-${cType}-startmon`,
        tempRes,
        $(`#${tempRes}-${boxCtrl}-control`),
        mapNavigation = false,
        startMonth = startMonth
    );

    setClimateSeasonLengthExpand(tempRes, `${cType}-seaslen`);
}

function setClimateSeasonLengthExpand(tempRes, idSuffix) {
    const seasLenId = $(`#${tempRes}-${idSuffix}`);

    for (let l = 2; l <= 12; l++) {
        seasLenId.append(
            $('<option>').text(l).val(l)
        );
    }
    seasLenId.val(SEASON_DEF.months.length);
}

function setAnalysisSeasonLengthMap(tempRes) {
    if (tempRes !== 'seasonal') return;

    const tstepID = `${tempRes}-map-date`;
    const seasLenId = $(`#${tstepID}-length`);

    if (seasLenId.children().length === 0) {
        for (let l = 2; l <= 12; l++) {
            seasLenId.append(
                $('<option>').text(l).val(l)
            );
        }
        seasLenId.val(SEASON_DEF.months.length);
    }
}

//////////////

function parseExpandChartsControlJSON(tempRes, chartType) {
    const controlID = `${tempRes}-${chartType}-control`;
    const control = $(`#${controlID}`);
    const result = {
        tempRes: tempRes,
        chartType: chartType,
        controlID: controlID,
        fieldsets: []
    };

    control.find('fieldset').each(function() {
        const fieldset = $(this);
        const item = {
            id: fieldset.attr('id') || null,
            label: fieldset.children('.legend-label').first().text().trim(),
            controls: []
        };

        fieldset.find('select, input').each(function() {
            const el = $(this);
            const tagName = this.tagName.toLowerCase();
            const type = (el.attr('type') || tagName).toLowerCase();
            const controlData = {
                id: el.attr('id') || null,
                tag: tagName
            };

            if (tagName === 'select') {
                controlData.text = el.find('option:selected').text().trim();
            } else if (type === 'checkbox' || type === 'radio') {
                if (!el.is(':checked')) {
                    return;
                }
                controlData.checked = el.is(':checked');
                controlData.text = el.closest('label').find('span').first().text().trim();
            } else {
                controlData.value = el.val();
            }

            item.controls.push(controlData);
        });

        result.fieldsets.push(item);
    });

    return result;
}

//////////////

function splitAnomalyDataByStep(ts_dates, ts_data, date, time_res, seas_len = 3) {
    let dates = [];
    let values = [];
    for (let i = 0; i < ts_dates.length; i++) {
        let this_date;
        if (time_res === 'dekadal') {
            const d = ts_dates[i].split('-').slice(-2);
            const dy = Number(d[1]);
            const dk = dy <= 10 ? 1 : (dy >= 21 ? 3 : 2);
            this_date = `${d[0]}-${dk}`;
        } else if (time_res === 'monthly') {
            const m = ts_dates[i].split('-')[1];
            this_date = parseInt(m, 10);
        } else if (time_res === 'seasonal') {
            const seas = getSeasonFromDate(ts_dates[i], seas_len);
            this_date = seas.start.getMonth() + 1;
        } else {
            return null;
        }
        if (this_date === date) {
            dates.push(ts_dates[i]);
            values.push(ts_data[i]);
        }
    }

    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const max = Math.max(Math.abs(mn), Math.abs(mx));
    const breaks = pretty([-max, max], 7);
    let ylim = [breaks[0], breaks.at(-1)];
    const y10 = (ylim[1] - ylim[0]) * 0.1;
    ylim[0] = ylim[0] - y10;
    ylim[1] = ylim[1] + y10;

    return {
        dates: dates,
        values: values,
        ylim: ylim,
        breaks: breaks
    };
}

function groupTSDataByYear(ts_dates, ts_data, start_mon, time_res) {
    let parsed = [];
    for (let i = 0; i < ts_dates.length; i++) {
        let ar_dates = ts_dates[i].split('-');
        if (time_res === 'dekadal') {
            parsed.push({
                year: parseInt(ar_dates[0], 10),
                month: parseInt(ar_dates[1], 10),
                dekad: parseInt(ar_dates[2], 10),
                value: ts_data[i]
            });
        } else if (time_res === 'monthly') {
            parsed.push({
                year: parseInt(ar_dates[0], 10),
                month: parseInt(ar_dates[1], 10),
                value: ts_data[i]
            });
        } else {
            return null;
        }
    }

    const groups = {};
    parsed.forEach(item => {
        const thisYear = (item.month >= start_mon) ? item.year : item.year - 1;
        if (!groups[thisYear]) groups[thisYear] = [];
        groups[thisYear].push(item);
    });

    for (let dataYear in groups) {
        const tyears = [];
        const values = [];

        for (let i = 0; i < 12; i++) {
            let month = ((start_mon - 1 + i) % 12) + 1;
            let year = parseInt(dataYear, 10);
            if (month < start_mon) year += 1;

            if (time_res === 'dekadal') {
                for (const dk of [1, 11, 21]) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dk).padStart(2, '0')}`;
                    const found = groups[dataYear].find(d => d.year === year && d.month === month && d.dekad === dk);
                    tyears.push(dateStr);
                    values.push(found ? found.value : null);
                }
            } else if (time_res === 'monthly') {
                const dateStr = `${year}-${String(month).padStart(2, '0')}`;
                const found = groups[dataYear].find(d => d.year === year && d.month === month);
                tyears.push(dateStr);
                values.push(found ? found.value : null);
            } else {
                return null;
            }
        }
        groups[dataYear] = { tyears, values };
    }
    const years = Object.keys(groups);
    let dates = groups[years[0]].tyears;
    if (time_res === 'monthly') {
        dates = dates.map(x => x + '-01');
    }
    let data = [];
    for (const key in groups) {
        data.push({ year: key, values: groups[key].values })
    }
    return { dates: dates, values: data };
}

//////////////