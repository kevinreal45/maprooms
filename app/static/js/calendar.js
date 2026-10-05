function jcalendarTheme() {
    const svg_prev = $('.jcalendar-prev').css('background-image');
    const svg_next = $('.jcalendar-next').css('background-image');
    const theme = localStorage.getItem('theme');
    const th_styles = {
        'dark': {
            'bgcolor': theme_styles['dark'].bgcolor,
            'color': '#f8f9fa',
            'selected': theme_styles['dark'].hover,
            'disabled': '#fff',
            'svgprev': svg_prev
                .replace('fill=%27%23000%27', 'fill=%27%23fff%27'),
            'svgnext': svg_next
                .replace('fill=%27%23000%27', 'fill=%27%23fff%27')
        },
        'light': {
            'bgcolor': theme_styles['light'].bgcolor,
            'color': '#212529',
            'selected': theme_styles['light'].hover,
            'disabled': '#000',
            'svgprev': svg_prev
                .replace('fill=%27%23fff%27', 'fill=%27%23000%27'),
            'svgnext': svg_next
                .replace('fill=%27%23fff%27', 'fill=%27%23000%27')
        }
    };

    $('.jcalendar-prev').css(
        'background-image', th_styles[theme].svgprev
    );
    $('.jcalendar-next').css(
        'background-image', th_styles[theme].svgnext
    );

    $('.jcalendar-table, .jcalendar-table table').css({
        'background-color': th_styles[theme].bgcolor,
        'color': th_styles[theme].color,
        'font-weight': 700
    });

    // 
    changeHoverColorTheme(
        '.offcanvas-body fieldset .form-control',
        theme_styles[theme].hover
    );
    changeHoverColorTheme(
        '.modal-expand-charts fieldset .form-control',
        theme_styles[theme].hover
    );
}

function jcalendarHover() {
    const theme = localStorage.getItem('theme');
    $('.jcalendar-set-year, .jcalendar-set-month, .jcalendar-set-day').hover(
        function() {
            $(this).css({
                'background-color': theme_styles[theme].hover,
                // 'color': theme_styles[theme].color
            });
        },
        function() {
            if ($(this).hasClass('jcalendar-selected')) {
                $(this).css({
                    'background-color': theme_styles[theme].selected,
                    // 'color': ''
                });
            } else {
                $(this).css({
                    'background-color': '',
                    // 'color': ''
                });
            }
        }
    );
}

function setDateCalendar(
    divContainerID,
    variableID,
    dataset, tempRes,
    dispDate = null,
    mapNavigation = true,
    dispYear = false,
    isStart = null,
    ensoData = false
) {
    let temp_cov;
    if (ensoData) {
        temp_cov = variableID;
    } else {
        const variable = $(`#${variableID} option:selected`).val();
        temp_cov = getTempCoverageCalendar(
            dataset, tempRes, variable
        );
    }

    let divCont = $(`#${divContainerID}`);
    divCont.empty();
    const calendarID = `${divContainerID}-calendar`;
    $('<input>', {
            type: 'text',
            id: calendarID
        })
        .addClass('form-control')
        .appendTo(divCont);

    if (tempRes === 'weekly') {
        cl_type = 'default';
        cl_format = 'YYYY-MM-DD';
        cl_slice = 10;
    } else if (tempRes === 'monthly') {
        cl_type = 'year-month-picker';
        cl_format = 'YYYY-MM';
        cl_slice = 7;
    } else if (tempRes === 'seasonal') {
        if (dispYear) {
            cl_type = 'year-month-picker';
            cl_format = 'YYYY';
            cl_slice = 7;
        } else {
            cl_type = 'year-month-picker';
            cl_format = 'YYYY-MM';
            cl_slice = 7;
        }
    } else {
        if (dispYear) {
            cl_type = 'year-month-picker';
            cl_format = 'YYYY';
            cl_slice = 7;
        } else {
            cl_type = 'default';
            cl_format = 'YYYY-MM-DD';
            cl_slice = 10;
        }
    }

    // 
    let tooltipText;
    const tStart = temp_cov.start.slice(0, cl_slice);
    const tEnd = temp_cov.end.slice(0, cl_slice);
    if (isStart === null) {
        tooltipText = `Start: ${tStart} - End: ${tEnd}`;
    } else {
        if (isStart) {
            tooltipText = `Start: ${tStart}`;
        } else {
            tooltipText = `End: ${tEnd}`;
        }
    }

    let tooltipInstance = bootstrap.Tooltip.getInstance(divCont[0]);
    if (tooltipInstance) {
        tooltipInstance._config.title = tooltipText;
        tooltipInstance.setContent();
    }

    // 
    if (dispDate === null) {
        if (tempRes === 'seasonal' && !dispYear) {
            let disp_d;
            if (URL_ARGS.component === 'monitoring') {
                disp_d = temp_cov.end;
            } else {
                disp_d = addDateYears(temp_cov.end, -1);
            }
            dispDate = formatDateToString(disp_d);
        } else {
            dispDate = temp_cov.end;
        }
    }
    const months = getListOfMonthsCalendar();

    const inputDateID = document.getElementById(calendarID);
    const calendar = jSuites.calendar(inputDateID, {
        type: cl_type,
        value: dispDate,
        fullscreen: false,
        readonly: false,
        format: cl_format,
        months: months.short,
        monthsFull: months.long,
        validRange: [temp_cov.start, temp_cov.end],
        onopen: function() {
            $('.jcalendar-controls').hide();
            $('.jcalendar-update').hide();
            jcalendarTheme();
            jcalendarHover();
        },
        onupdate: function() {
            jcalendarHover();
        },
        onclose: function(el) {
            let this_date = $(el).val();
            if (tempRes === 'dekadal') {
                const dek_date = calendarFormatDekad(this_date);
                $(el).val(dek_date);
                this_date = dek_date;
            }

            if (mapNavigation) {
                if (tempRes === 'seasonal') {
                    const this_mon = parseInt(this_date.split('-')[1], 10);
                    const tstepID = `${tempRes}-map-date`;
                    const this_len = parseInt($(`#${tstepID}-length`).val(), 10);
                    const seas_mon = defineSeasonMonths(this_mon, this_len);
                    $(`#${tempRes}-season-months`).text(seas_mon);
                }

                $('#input-time-navigation')
                    .val(this_date.slice(0, cl_slice));
            }
        }
    });

    inputDateID.addEventListener('change', function() {
        if (tempRes === 'dekadal') {
            const this_date = calendar_date.getValue();
            const dek_date = calendarFormatDekad(this_date);
            calendar_date.setValue(dek_date);
        }
    });

    // set date on map navigation
    if (mapNavigation) {
        $('#input-time-navigation')
            .val(dispDate.slice(0, cl_slice));
    }

    const theme = localStorage.getItem('theme');
    const color = theme_styles[theme].hover;
    changeHoverColorTheme(`#${calendarID}`, color);
}

function setNamesCalendar(
    divContainerID, tempRes,
    dropdownParent = $(document.body),
    mapNavigation = true,
    startMonth = SEASON_DEF.months.start
) {
    let divCont = $(`#${divContainerID}`);
    divCont.empty();
    const calendarID = `${divContainerID}-calendar`;
    let select = $('<select>')
        .attr('id', calendarID)
        .addClass('form-select form-select2-nosearch')
        .appendTo(divCont)
        .css('width', '100%');

    if (tempRes === 'monthly' || tempRes === 'seasonal') {
        const months = getListOfMonthsCalendar().long;
        for (let m = 0; m < months.length; m++) {
            select.append(
                $('<option>')
                .text(months[m])
                .val(m + 1)
            );
        }
        select.val(startMonth);
        const imon = parseInt(startMonth, 10);
        var int_value = months[imon - 1];
    } else if (tempRes === 'dekadal') {
        const dekads = getListOfDekadsCalendar();
        for (let d = 0; d < dekads.length; d++) {
            select.append(
                $('<option>')
                .text(dekads[d].long)
                .val(dekads[d].value)
            );
        }
        select.val(dekads[0].value);
        var int_value = dekads[0].short;
    } else {
        console.log('Not set up yet.');
        return false;
    }

    select.select2({
        minimumResultsForSearch: -1,
        dropdownParent: dropdownParent
    });

    if (mapNavigation) {
        // set date on map navigation
        $('#input-time-navigation').val(int_value);

        select.on('change', function() {
            if (tempRes === 'monthly') {
                var this_date = $(this).find('option:selected').text();
            } else if (tempRes === 'seasonal') {
                var this_date = $(this).find('option:selected').text();
                const this_mon = parseInt(this.value, 10);
                const tstepID = `${tempRes}-map-date`;
                // const this_mon = parseInt($(`#${tstepID}-calendar`).val());
                const this_len = parseInt($(`#${tstepID}-length`).val(), 10);
                const seas_mon = defineSeasonMonths(this_mon, this_len);
                $(`#${tempRes}-season-months`).text(seas_mon);
            } else if (tempRes === 'dekadal') {
                const this_dekad = this.value;
                const dekads = getListOfDekadsCalendar();
                const i = dekads.map(x => x.value).indexOf(this_dekad);
                var this_date = dekads[i].short;
            } else {
                return false;
            }
            $('#input-time-navigation').val(this_date);
        });
    }
    var theme = localStorage.getItem('theme');
    var color = theme_styles[theme].hover;
    changeHoverColorTheme(`#${calendarID}`, color);
}

function setMonthsDaysCalendar(monthID, dayID, month0, day0, isStart) {
    const months = getListOfMonthsCalendar().long;
    const end_mon = [
        31, 29, 31, 30, 31, 30,
        31, 31, 30, 31, 30, 31
    ];

    const mon_id = $(`#${monthID}`);
    const day_id = $(`#${dayID}`);


    const alreadyInitialized = mon_id.find('option').length > 0;

    if (!alreadyInitialized) {
        for (let m = 0; m < months.length; m++) {
            mon_id.append(
                $('<option>')
                .text(months[m])
                .val(m + 1)
            );
        }
    }

    mon_id
        .off(`change.${monthID}`)
        .on(`change.${monthID}`, function() {
            day_id.empty();
            const m = parseInt(this.value, 10) - 1;
            for (let d = 0; d < end_mon[m]; d++) {
                let d0 = d + 1;
                day_id.append(
                    $('<option>')
                    .text(
                        d0.toString()
                        .padStart(2, '0')
                    )
                    .val(d0)
                );
            }
            const v = isStart ? 1 : end_mon[m];
            day_id.val(v);
        });

    if (!alreadyInitialized) {
        mon_id.val(month0).trigger('change');
        day_id.val(day0);
    }
}

function defineSeasonMonths(start, length, long = true) {
    let end = (start + length - 1) % 12;
    if (end === 0) end = 12;
    const months = getListOfMonthsCalendar();
    let mon;
    if (long) {
        mon = months.long;
    } else {
        mon = months.short;
    }
    return `${mon[start - 1]} -> ${mon[end - 1]}`;
}

function getListOfMonthsCalendar() {
    const ils = LANG_USER.list.map(l => l.code)
        .indexOf(LANG_USER.code);
    const localeS = LANG_USER.list[ils].locale;
    const short = Array.from({ length: 12 }, (item, i) => {
        return new Date(0, i)
            .toLocaleString(localeS, { month: 'short' })
    });
    const long = Array.from({ length: 12 }, (item, i) => {
        return new Date(0, i)
            .toLocaleString(localeS, { month: 'long' })
    });
    return { short: short, long: long }
}

function getListOfDekadsCalendar() {
    const months = getListOfMonthsCalendar();
    const dekads = [];
    for (let m = 0; m < months.long.length; m++) {
        for (let d = 0; d < 3; d++) {
            const m1 = m + 1;
            const mon = m1 < 10 ? `0${m1}` : m1.toString();
            dekads.push({
                long: `${months.long[m]} dek-${d+1}`,
                short: `${months.short[m]}-d${d+1}`,
                value: `${mon}-${d + 1}`
            });
        }
    }
    return dekads;
}

function getTempCoverageCalendar(dataset, tempres, variable) {
    const pvar = DATA_SET.variables[variable][0];
    const info_var = DATA_INFO[dataset][tempres][pvar];

    const temp_coverage = info_var['temporal_coverage'];
    if (tempres === 'daily') {
        start = temp_coverage.start;
        end = temp_coverage.end;
    } else if (tempres === 'dekadal') {
        start = calendarFormatDekadalStr(temp_coverage.start);
        end = calendarFormatDekadalStr(temp_coverage.end);
    } else if (tempres === 'monthly') {
        start = calendarFormatMonthlyStr(temp_coverage.start);
        end = calendarFormatMonthlyStr(temp_coverage.end);
    } else if (tempres === 'annual') {
        start = calendarFormatAnnualStr(temp_coverage.start);
        end = calendarFormatAnnualStr(temp_coverage.end);
    } else {
        start = calendarFormatSeasonalStr(temp_coverage.start);
        end = calendarFormatSeasonalStr(temp_coverage.end);
    }
    return { start: start, end: end };
}

function getTempCoverageYear(dataset, tempres, variable) {
    const temp_cov = getTempCoverageCalendar(
        dataset, tempres, variable
    );
    const start = parseInt(temp_cov.start.split('-')[0], 10);
    const end = parseInt(temp_cov.end.split('-')[0], 10);
    return { start: start, end: end };
}

function getTemporalRangeCalendar(dataset, tempres, variable, nb_year) {
    const temp_cov = getTempCoverageCalendar(
        dataset, tempres, variable
    );
    const end_year = Number(temp_cov.end.split('-')[0]);
    const start_year = end_year - nb_year + 1;
    const start = `${start_year}-01-01`;
    return { start: start, end: temp_cov.end };
}

function calendarFormatDekadalStr(str_date) {
    let dk = str_date.split('-');
    if (dk[2] === '1') {
        d = '01';
    } else if (dk[2] === '2') {
        d = '11';
    } else {
        d = '21';
    }
    dk[2] = d;
    return dk.join('-');
}

function calendarFormatDekad(date) {
    let dk = Number(date.substring(8, 10));
    if (dk <= 10) {
        dek = '01';
    } else if (dk >= 21) {
        dek = '21';
    } else {
        dek = '11';
    }

    return date.substring(0, 8) +
        dek + date.substring(10);
}

function formatDekadDate(date) {
    const arr_dk = date.split('-');
    const ym = arr_dk.slice(0, 2).join('-');
    const d = Number(arr_dk[2]);
    const dk = d <= 10 ? 1 : (d >= 21 ? 3 : 2);
    return `${ym}-${dk}`;
}

// function formatSeasonDate(date, length) {
//     let start = new Date(`${date}-16`);
//     let end = addDateMonths(start, length - 1);
//     start = formatDateToString(start);
//     start = start.slice(0, 7);
//     end = formatDateToString(end);
//     end = end.slice(0, 7);
//     return `${start}_${end}`;
// }

function formatSeasonDate(date, length, isStart = true) {
    const this_date = new Date(`${date}-16`);
    let start;
    let end;
    if (isStart) {
        start = this_date;
        end = addDateMonths(this_date, length - 1);
    } else {
        start = addDateMonths(this_date, -1 * length + 1);
        end = this_date;
    }

    start = formatDateToString(start);
    start = start.slice(0, 7);
    end = formatDateToString(end);
    end = end.slice(0, 7);
    return `${start}_${end}`;
}


function getSeasonFromDate(date, length) {
    date = new Date(date);
    const hm = Math.floor(length / 2);
    const start = addDateMonths(date, -hm);
    const end = addDateMonths(date, hm);
    if (length % 2 === 0) {
        end.setDate(end.getDate() - 16);
    }
    return { start: start, end: end };
}

function calendarFormatMonthlyStr(str_date) {
    return `${str_date}-16`;
}

function calendarFormatAnnualStr(str_date) {
    return `${str_date}-01-16`;
}

function calendarFormatSeasonalStr(str_date) {
    return `${str_date}-16`;
}

function formatDateToString(date, isDay = true) {
    const dd = new Date(date);
    const year = dd.getFullYear();
    const month = (dd.getMonth() + 1)
        .toString()
        .padStart(2, '0');
    const day = dd.getDate()
        .toString()
        .padStart(2, '0');
    if (isDay) {
        return `${year}-${month}-${day}`;
    } else {
        return `${year}-${month}`;
    }
}

function addDateYears(date, n) {
    const result = new Date(date);
    const expectedDay = result.getDate();
    result.setFullYear(result.getFullYear() + n);
    if (result.getDate() !== expectedDay) {
        result.setDate(0);
    }
    return result;
}

function addDateMonths(date, n) {
    const result = new Date(date);
    const expectedDay = result.getDate();
    result.setMonth(result.getMonth() + n);
    if (result.getDate() !== expectedDay) {
        result.setDate(0);
    }
    return result;
}

function addDateDekads(date, n) {
    const result = new Date(date);
    const day = result.getDate();
    let dekadDay;
    if (day <= 10) {
        dekadDay = 1;
    } else if (day <= 20) {
        dekadDay = 11;
    } else {
        dekadDay = 21;
    }
    const currentDekad =
        result.getFullYear() * 12 * 3 +
        result.getMonth() * 3 +
        (dekadDay === 1 ? 0 : dekadDay === 11 ? 1 : 2);

    const newDekad = currentDekad + n;
    const year = Math.floor(newDekad / 36);
    const remainder = newDekad % 36;
    const month = Math.floor(remainder / 3);
    const dekadIndex = remainder % 3;
    const newDay = [1, 11, 21][dekadIndex];
    return new Date(year, month, newDay);
}

function getWeekRange(date) {
    const dt = new Date(date);

    // Convert Sunday (0) to 7
    const day = dt.getDay() === 0 ? 7 : dt.getDay();

    // Monday
    const start = new Date(dt);
    start.setDate(dt.getDate() - day + 1);

    // Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const format = d =>
        d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

    return {
        start: format(start),
        end: format(end)
    };
}

function isValidMonthDay(mm_dd) {
    // Must be exactly mm-dd
    if (!/^\d{2}-\d{2}$/.test(mm_dd)) {
        return false;
    }

    const [month, day] = mm_dd.split('-').map(Number);

    // Create a date using a leap year so Feb-29 is allowed
    const date = new Date(2000, month - 1, day);

    return (
        date.getFullYear() === 2000 &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}