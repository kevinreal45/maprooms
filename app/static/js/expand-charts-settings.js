// converts an rgb(a) match from a regex to a #rrggbb hex string
function rgbTripleToHex(rgbMatch) {
    return `#${rgbMatch.slice(1, 4).map(value =>
        Number(value).toString(16).padStart(2, '0')
    ).join('')}`;
}

// to resolve css color names to rgb
function resolveCssColorToRgb(color) {
    const probe = document.createElement('span');
    probe.style.color = '';
    probe.style.color = color;
    if (!probe.style.color) {
        return null;
    }
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved || null;
}

function dotPathsToNestedObject(flat) {
    const nested = {};
    Object.entries(flat).forEach(([path, value]) => {
        const keys = path.split('.');
        let obj = nested;
        keys.forEach((key, i) => {
            if (i === keys.length - 1) {
                obj[key] = value;
            } else {
                obj[key] = obj[key] || {};
                obj = obj[key];
            }
        });
    });
    return nested;
}



const MS_PER_DAY = 86400000;
// average calendar month, used only to size-check a month/year interval
// against the axis's pixel budget (see getPlotlyAxisMaxTicks) - the
// actual applied dtick uses Plotly's own 'M<n>' convention (below),
// which places ticks on real calendar month boundaries, not this
// average
const AVG_MONTH_MS = 30.436875 * MS_PER_DAY;

// the unit options offered for a *date* axis's tick-interval field, and
// how each converts a "magnitude" typed by the user into both (a) an ms
// figure to size-check against the axis's pixel budget and (b) the
// actual value handed to Plotly as dtick. Days/weeks are fixed-length,
// so they're plain milliseconds; months/years are calendar lengths, so
// they use Plotly's own 'M<n>' dtick convention (n months) instead of an
// approximate day count - that's what keeps ticks landing on real month/

const TICK_INTERVAL_UNITS = [
    { value: 'day', label: 'Days', approxMs: MS_PER_DAY, wholeOnly: true,
        toDtick: n => n * MS_PER_DAY },
    { value: 'week', label: 'Weeks', approxMs: 7 * MS_PER_DAY, wholeOnly: true,
        toDtick: n => n * 7 * MS_PER_DAY },
    { value: 'month', label: 'Months', approxMs: AVG_MONTH_MS, wholeOnly: true,
        toDtick: n => `M${n}` },
    { value: 'year', label: 'Years', approxMs: 12 * AVG_MONTH_MS, wholeOnly: true,
        toDtick: n => `M${n * 12}` }
];

function getTickIntervalUnit(unitValue) {
    return TICK_INTERVAL_UNITS.find(u => u.value === unitValue) || TICK_INTERVAL_UNITS[0];
}

// true for any keystroke that could be part of a valid tick interval
function isTickIntervalControlKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return true;
    }
    return [
        'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
    ].includes(event.key);
}


// rejects any keystroke that would make the tick-interval field invalid:
function handleTickIntervalKeydown(event, wholeOnly) {
    if (isTickIntervalControlKey(event) || event.key.length !== 1) {
        return;
    }
    const isDigit = event.key >= '0' && event.key <= '9';
    const isLeadingDecimalPoint = !wholeOnly && event.key === '.' &&
        !event.target.value.includes('.');
    if (!isDigit && !isLeadingDecimalPoint) {
        event.preventDefault();
    }
}
// strips out any non-digit/non-decimal-point characters from a tick-interval field's value, and optionally strips out any decimal point at all for a whole-number-only axis. 
function sanitizeTickIntervalText(value, wholeOnly) {
    const digitsAndDots = value.replace(/[^0-9.]/g, '');
    if (wholeOnly) {
        return digitsAndDots.replace(/\./g, '');
    }
    const firstDot = digitsAndDots.indexOf('.');
    if (firstDot === -1) {
        return digitsAndDots;
    }
    return digitsAndDots.slice(0, firstDot + 1) +
        digitsAndDots.slice(firstDot + 1).replace(/\./g, '');
}

//
function sanitizeTickIntervalInput(input, wholeOnly) {
    const el = input.get(0);
    const cleaned = sanitizeTickIntervalText(el.value, wholeOnly);
    if (cleaned === el.value) {
        return;
    }
    const caret = el.selectionStart;
    const removedBeforeCaret = caret === null
        ? 0
        : el.value.slice(0, caret).length - sanitizeTickIntervalText(el.value.slice(0, caret), wholeOnly).length;
    el.value = cleaned;
    if (caret !== null) {
        const pos = Math.max(0, caret - removedBeforeCaret);
        el.setSelectionRange(pos, pos);
    }
}

// Plotly needs roughly this many horizontal/vertical pixels per tick
// label before they start overlapping - this is what actually bounds
// the tick count (see getPlotlyAxisMaxTicks), not a flat constant
const MIN_PIXELS_PER_TICK = 32;

// only used if an axis's rendered pixel length genuinely isn't
// available yet (shouldn't normally happen - the dialog only opens
// after the chart has already been drawn once)
const FALLBACK_MAX_TICKS = 60;

// returns the axis name as Plotly's dtick/resolved layout uses it: 'x', 'y', or 'y2' for a second Y axis. 
function plotlyAxisFieldSide(axisName) {
    if (axisName === 'yaxis2') {
        return 'y2';
    }
    return axisName === 'xaxis' ? 'x' : 'y';
}

// true only when this chart has a second Y axis (yaxis2) in use, so the dialog can show the right field for it.
function plotlyChartHasSecondYAxis(graph) {
    return (graph.data || []).some(trace => trace.yaxis === 'y2');
}


function getPlotlyAxisType(graph, axisName) {
    const resolvedType = graph._fullLayout?.[axisName]?.type;
    if (resolvedType && resolvedType !== '-') {
        return resolvedType;
    }
    const declaredType = graph.layout?.[axisName]?.type;
    if (declaredType && declaredType !== '-') {
        return declaredType;
    }
    // last resort, in case Plotly hasn't resolved _fullLayout yet -
    // sniff the actual plotted values for this axis
    const key = axisName === 'xaxis' ? 'x' : 'y';
    const sample = (graph.data || [])
        .flatMap(trace => Array.isArray(trace[key]) ? trace[key] : [])
        .find(value => value !== null && value !== undefined);
    const looksLikeDate = sample instanceof Date ||
        (typeof sample === 'string' && Number.isNaN(Number(sample)) && !Number.isNaN(Date.parse(sample)));
    return looksLikeDate ? 'date' : 'linear';
}


function resolvePlotlyAxisKind(graph, axisName) {
    const resolver = plotlyChartAxisKindResolvers[graph.id];
    const resolved = typeof resolver === 'function' ? resolver(axisName) : null;
    if (!resolved) {
        return null;
    }
    return typeof resolved === 'string' ? { kind: resolved } : resolved;
}


function getPlotlyAxisNumberKind(graph, axisName) {
    const resolvedKind = resolvePlotlyAxisKind(graph, axisName)?.kind ?? null;
 
    if (resolvedKind === 'integer' || resolvedKind === 'year') {
        return 'integer';
    }
    if (resolvedKind === 'float') {
        return resolvedKind;
    }

    const key = axisName === 'xaxis' ? 'x' : 'y';
    const explicitTicks = graph.layout?.[axisName]?.tickvals;
    const sample = Array.isArray(explicitTicks) && explicitTicks.length
        ? explicitTicks
        : (graph.data || []).flatMap(trace => Array.isArray(trace[key]) ? trace[key] : []);
    const numeric = sample.map(Number).filter(Number.isFinite);
    return numeric.length && numeric.every(Number.isInteger) ? 'integer' : 'float';
}


function isPlotlyAxisYearKind(graph, axisName) {
    return resolvePlotlyAxisKind(graph, axisName)?.kind === 'year';
}


function getPlotlyAxisUnitLabel(graph, axisName) {
    const resolved = resolvePlotlyAxisKind(graph, axisName);
    return resolved?.kind === 'integer' && typeof resolved.unit === 'string' && resolved.unit
        ? resolved.unit
        : null;
}


function getPlotlyAxisPixelLength(graph, axisName) {
    const length = graph._fullLayout?.[axisName]?._length;
    return Number.isFinite(length) && length > 0 ? length : null;
}

// the maximum number of ticks that can fit on this axis without overlapping, based on its current pixel length and MIN_PIXELS_PER_TICK.
function getPlotlyAxisMaxTicks(graph, axisName) {
    const pixelLength = getPlotlyAxisPixelLength(graph, axisName);
    return pixelLength
        ? Math.max(2, Math.floor(pixelLength / MIN_PIXELS_PER_TICK))
        : FALLBACK_MAX_TICKS;
}

// the current span of an axis, expressed in the same unit a dtick value
// for it would use (milliseconds for a date axis, raw units otherwise)
function getPlotlyAxisRangeSpan(graph, axisName, isDate) {
    const toNumeric = value => (isDate ? new Date(value).getTime() : Number(value));
    const resolvedRange = graph._fullLayout?.[axisName]?.range || graph.layout?.[axisName]?.range;
    if (Array.isArray(resolvedRange) && resolvedRange.length === 2) {
        const span = Math.abs(toNumeric(resolvedRange[1]) - toNumeric(resolvedRange[0]));
        if (Number.isFinite(span) && span > 0) {
            return span;
        }
    }
    // fall back to the plotted data's own min/max, in case the axis
    // range hasn't been resolved yet
    const key = axisName === 'xaxis' ? 'x' : 'y';
    const values = (graph.data || [])
        .flatMap(trace => Array.isArray(trace[key]) ? trace[key] : [])
        .map(toNumeric)
        .filter(Number.isFinite);
    return values.length ? Math.max(...values) - Math.min(...values) : 0;
}

// rejects (falls back to Auto) any interval that would place more ticks
// across the axis's current span than it has room for
function clampTickInterval(candidate, rangeSpan, maxTicks) {
    if (!Number.isFinite(candidate) || candidate <= 0) {
        return null;
    }
    if (rangeSpan > 0 && rangeSpan / candidate > maxTicks) {
        return null;
    }
    return candidate;
}


function getPlotlyAxisMinDisplayInterval(graph, axisName, isDate, unitValue) {
    const rangeSpan = getPlotlyAxisRangeSpan(graph, axisName, isDate);
    if (rangeSpan <= 0) {
        return null;
    }
    const maxTicks = getPlotlyAxisMaxTicks(graph, axisName);
    const minInternal = rangeSpan / maxTicks;
    if (isDate) {
        const unit = getTickIntervalUnit(unitValue);
        const minDisplay = minInternal / unit.approxMs;
        // round up (never down) so the hinted minimum is never itself
        // rejected by clampTickInterval due to display rounding
        return unit.wholeOnly ? Math.max(1, Math.ceil(minDisplay)) : Math.ceil(minDisplay * 100) / 100;
    }
    const wholeOnly = getPlotlyAxisNumberKind(graph, axisName) === 'integer';
    return wholeOnly ? Math.max(1, Math.ceil(minInternal)) : Math.ceil(minInternal * 100) / 100;
}


function tickIntervalExceedsBudget(graph, axisName, value, unitValue) {
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return false;
    }
    const isDate = getPlotlyAxisType(graph, axisName) === 'date';
    const maxTicks = getPlotlyAxisMaxTicks(graph, axisName);
    if (isDate) {
        const unit = getTickIntervalUnit(unitValue);
        if (unit.wholeOnly && !Number.isInteger(numeric)) {
            return false;
        }
        const rangeSpan = getPlotlyAxisRangeSpan(graph, axisName, true);
        return clampTickInterval(numeric * unit.approxMs, rangeSpan, maxTicks) === null;
    }
    const rangeSpan = getPlotlyAxisRangeSpan(graph, axisName, false);
    return clampTickInterval(numeric, rangeSpan, maxTicks) === null;
}


function decomposeDateDtick(dtick, rangeSpanMs) {
    if (typeof dtick === 'string') {
        const match = /^M(\d+)$/.exec(dtick);
        if (match) {
            const n = Number(match[1]);
            return (n > 0 && n % 12 === 0)
                ? { unit: 'year', magnitude: n / 12 }
                : { unit: 'month', magnitude: n };
        }
    }
    if (typeof dtick === 'number' && Number.isFinite(dtick) && dtick > 0) {
        const days = dtick / MS_PER_DAY;
        return (days >= 7 && Number.isInteger(days / 7))
            ? { unit: 'week', magnitude: days / 7 }
            : { unit: 'day', magnitude: days };
    }
    const days = rangeSpanMs / MS_PER_DAY;
    const unit = days > 3 * 365 ? 'year' : days > 90 ? 'month' : days > 14 ? 'week' : 'day';
    return { unit, magnitude: null };
}

// returns a valid hex color string for Plotly's color inputs
function plotlyColorInputValue(color, fallback = '#0d6efd') {
    if (typeof color !== 'string') {
        return fallback;
    }

    if (/^#[0-9a-f]{6}$/i.test(color)) {
        return color;
    }

    const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
        return rgbTripleToHex(rgb);
    }

    const resolved = resolveCssColorToRgb(color);
    const resolvedRgb = resolved && resolved.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (resolvedRgb) {
        return rgbTripleToHex(resolvedRgb);
    }

    return fallback;
}


const PLOTLY_TEXT_MAX_WORDS = 12;
const PLOTLY_TEXT_MAX_CHARS = 120;

function countPlotlyTextWords(value) {
    return value.split(/\s+/).filter(Boolean).length;
}


function limitPlotlyTextValue(value) {
    const words = value.split(/\s+/).filter(Boolean);
    const limited = words.length <= PLOTLY_TEXT_MAX_WORDS
        ? value
        : words.slice(0, PLOTLY_TEXT_MAX_WORDS).join(' ');

    return limited.slice(0, PLOTLY_TEXT_MAX_CHARS);
}


function updatePlotlyTextWarning(input) {
    const el = input.get(0);
    $(`#${el.id}-warning`).toggleClass(
        'd-none', countPlotlyTextWords(el.value) <= PLOTLY_TEXT_MAX_WORDS
    );
}


function buildPlotlyTextField(id) {
    return $('<input>', {
        id,
        type: 'text',
        class: 'form-control form-control-sm',
        maxlength: PLOTLY_TEXT_MAX_CHARS,
        title: `Up to ${PLOTLY_TEXT_MAX_WORDS} words`
    }).on('input', function() { updatePlotlyTextWarning($(this)); });
}


function buildPlotlyTextWarning(id) {
    return $('<div>', {
        id: `${id}-warning`,
        class: 'form-text text-warning-emphasis d-none',
        text: `Only the first ${PLOTLY_TEXT_MAX_WORDS} words will be used.`
    });
}

function plotlyAxisTitle(axis) {
    if (!axis || !axis.title) {
        return '';
    }
    return typeof axis.title === 'string' ? axis.title : (axis.title.text || '');
}

// font options
const PLOTLY_TITLE_FONTS = [
    { value: '', label: 'Font' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Courier New", monospace', label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' }
];


const PLOTLY_LINE_WIDTH_LIMITS = { min: 1, max: 12 };
const PLOTLY_MARKER_SIZE_LIMITS = { min: 2, max: 24 };
const PLOTLY_TITLE_SIZE_LIMITS = { min: 8, max: 40 };


const PLOTLY_DEFAULT_LINE_WIDTH = 2;
const PLOTLY_DEFAULT_MARKER_SIZE = 6;


function clampPlotlySize(value, limits) {
    if (!Number.isFinite(value)) {
        return null;
    }
    return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}


function appendTraceSizeInput(id, label, value, kind) {
    const isMarker = kind === 'marker';
    const limits = isMarker ? PLOTLY_MARKER_SIZE_LIMITS : PLOTLY_LINE_WIDTH_LIMITS;
    const what = isMarker ? 'Point size' : 'Line thickness';
    return $('<input>', {
        id: `${id}-width`,
        type: 'number',
        min: limits.min,
        max: limits.max,
        step: 1,
        class: 'form-control form-control-sm plotly-trace-width',
        style: 'width: 62px;',
        value,
        title: `${what} for ${label} (${limits.min}-${limits.max})`
    });
}


function appendTraceColorSwatch(colorsContainer, id, label, color, traceIndex, part, size, sizable = true) {
    const controls = [];
    if ((part === 'line' || part === 'marker') && sizable) {
        const resolvedSize = typeof size === 'number'
            ? size
            : (part === 'marker' ? PLOTLY_DEFAULT_MARKER_SIZE : PLOTLY_DEFAULT_LINE_WIDTH);
        controls.push(appendTraceSizeInput(id, label, resolvedSize, part));
    }
    controls.push(
        $('<input>', {
            id,
            type: 'color',
            class: 'form-control form-control-color plotly-trace-color',
            value: plotlyColorInputValue(color),
            'data-trace-index': traceIndex,
            'data-trace-part': part,
            title: `Choose color for ${label}`
        })
    );

    colorsContainer.append(
        $('<div>', { class: 'd-flex align-items-center justify-content-between gap-3 mb-1' }).append(
            $('<label>', { for: id, class: 'text-truncate', text: label }),
            $('<div>', { class: 'd-flex align-items-center gap-2' }).append(controls)
        )
    );
}


const defaultTraceColorsModule = {
    populate(colorsContainer, dialogID, graph) {
        graph.data.forEach((trace, index) => {
           //skip traces that are not selected
            if (trace.visible === false || trace.visible === 'legendonly') {
                return;
            }

            const name = trace.name || `Series ${index + 1}`;
            const hasLineColor = typeof trace.line?.color === 'string';
            const hasMarkerColor = typeof trace.marker?.color === 'string';
            const sizable = trace.type !== 'bar';

            if (hasLineColor && hasMarkerColor) {
                appendTraceColorSwatch(
                    colorsContainer, `${dialogID}-color-${index}-line`,
                    `${name} — Line`, trace.line.color, index, 'line', trace.line.width, sizable
                );
                appendTraceColorSwatch(
                    colorsContainer, `${dialogID}-color-${index}-marker`,
                    `${name} — Points`, trace.marker.color, index, 'marker', trace.marker.size, sizable
                );
            } else {
                appendTraceColorSwatch(
                    colorsContainer, `${dialogID}-color-${index}`, name,
                    hasLineColor ? trace.line.color : trace.marker?.color,
                    index, hasLineColor ? 'line' : 'marker',
                    hasLineColor ? trace.line.width : trace.marker?.size,
                    sizable
                );
            }
        });
    },
    apply(dialogID, graph) {
        const colors = {};
        $(`#${dialogID} .plotly-trace-color`).each(function() {
            const traceIndex = Number($(this).data('trace-index'));
            const part = $(this).data('trace-part');
            const trace = graph.data[traceIndex];
            if (!trace) {
                return;
            }
            const color = $(this).val();
            Plotly.restyle(graph, { [`${part}.color`]: color }, [traceIndex]);

            const name = trace.name || `Series ${traceIndex + 1}`;
            colors[`${name}|${part}`] = color;

            if (part === 'line') {
                const width = clampPlotlySize(
                    Number($(`#${$(this).attr('id')}-width`).val()), PLOTLY_LINE_WIDTH_LIMITS
                );
                if (width !== null) {
                    Plotly.restyle(graph, { 'line.width': width }, [traceIndex]);
                    colors[`${name}|line-width`] = width;
                }
            } else if (part === 'marker') {
                const size = clampPlotlySize(
                    Number($(`#${$(this).attr('id')}-width`).val()), PLOTLY_MARKER_SIZE_LIMITS
                );
                if (size !== null) {
                    Plotly.restyle(graph, { 'marker.size': size }, [traceIndex]);
                    colors[`${name}|marker-size`] = size;
                }
            }
        });
        return colors;
    },
    // reapply colors saved from a previous session/redraw onto a chart
    // that was just (re)plotted
    restore(colors, graph) {
        if (!colors) {
            return;
        }
        graph.data.forEach((trace, index) => {
            const name = trace.name || `Series ${index + 1}`;
            ['line', 'marker'].forEach((part) => {
                const color = colors[`${name}|${part}`];
                if (color) {
                    Plotly.restyle(graph, { [`${part}.color`]: color }, [index]);
                }
            });
            const width = colors[`${name}|line-width`];
            if (typeof width === 'number') {
                Plotly.restyle(graph, { 'line.width': width }, [index]);
            }
            const size = colors[`${name}|marker-size`];
            if (typeof size === 'number') {
                Plotly.restyle(graph, { 'marker.size': size }, [index]);
            }
        });
    }
};

// for postive an negative anomaly charts
const anomalySignColorsModule = {
    populate(colorsContainer, dialogID, graph) {
        const trace = graph.data[0];
        const values = trace?.y || [];
        const colorArray = Array.isArray(trace?.marker?.color) ? trace.marker.color : [];
        const colorForSign = (predicate, fallback) => {
            const i = values.findIndex(predicate);
            return plotlyColorInputValue(i >= 0 ? colorArray[i] : null, fallback);
        };

        [
            { id: 'positive', label: 'Positive', fallback: '#198754' },
            { id: 'negative', label: 'Negative', fallback: '#fd7e14' }
        ].forEach(entry => {
            colorsContainer.append(
                $('<div>', { class: 'd-flex align-items-center justify-content-between gap-3 mb-1' }).append(
                    $('<label>', {
                        for: `${dialogID}-color-${entry.id}`,
                        class: 'text-truncate',
                        text: entry.label
                    }),
                    $('<input>', {
                        id: `${dialogID}-color-${entry.id}`,
                        type: 'color',
                        class: `form-control form-control-color plotly-sign-color-${entry.id}`,
                        value: colorForSign(v => entry.id === 'positive' ? v > 0 : v < 0, entry.fallback),
                        title: `Choose color for ${entry.label.toLowerCase()} values`
                    })
                )
            );
        });
    },
    apply(dialogID, graph) {
        const trace = graph.data[0];
        if (!trace) {
            return;
        }
        const values = trace.y || [];
        const oldColors = Array.isArray(trace.marker?.color) ? trace.marker.color : [];
        const positive = $(`#${dialogID}-color-positive`).val();
        const negative = $(`#${dialogID}-color-negative`).val();
        const neutralIndex = values.findIndex(v => v === 0);
        const neutral = plotlyColorInputValue(
            neutralIndex >= 0 ? oldColors[neutralIndex] : null, '#6c757d'
        );

        const newColors = values.map(v => (v > 0 ? positive : v < 0 ? negative : neutral));
        Plotly.restyle(graph, { 'marker.color': [newColors] }, [0]);

        return { positive, negative, neutral };
    },
    // reapply saved positive/negative/neutral colors onto a chart that
    // was just (re)plotted
    restore(colors, graph) {
        if (!colors) {
            return;
        }
        const trace = graph.data[0];
        if (!trace) {
            return;
        }
        const values = trace.y || [];
        const newColors = values.map(v => (
            v > 0 ? colors.positive : v < 0 ? colors.negative : colors.neutral
        ));
        Plotly.restyle(graph, { 'marker.color': [newColors] }, [0]);
    }
};


const categoricalMarkerColorsModule = {
    populate(colorsContainer, dialogID, graph) {
        const trace = graph.data[0];
        const values = trace?.customdata || trace?.y || [];
        const colorArray = Array.isArray(trace?.marker?.color) ? trace.marker.color : [];

        const colorByKey = new Map();
        values.forEach((value, i) => {
            const key = value === null || value === undefined ? 'null' : String(value);
            if (!colorByKey.has(key)) {
                colorByKey.set(key, colorArray[i]);
            }
        });

        [...colorByKey.keys()]
            .sort((a, b) => (a === 'null' ? 1 : b === 'null' ? -1 : Number(a) - Number(b)))
            .forEach(key => {
                const label = key === 'null' ? 'No data' : key;
                colorsContainer.append(
                    $('<div>', { class: 'd-flex align-items-center justify-content-between gap-3 mb-1' }).append(
                        $('<label>', {
                            for: `${dialogID}-color-cat-${key}`,
                            class: 'text-truncate',
                            text: label
                        }),
                        $('<input>', {
                            id: `${dialogID}-color-cat-${key}`,
                            type: 'color',
                            class: 'form-control form-control-color plotly-category-color',
                            value: plotlyColorInputValue(colorByKey.get(key), key === 'null' ? '#6c757d' : undefined),
                            'data-category-key': key,
                            title: `Choose color for ${label}`
                        })
                    )
                );
            });
    },
    apply(dialogID, graph) {
        const trace = graph.data[0];
        if (!trace) {
            return;
        }
        const values = trace.customdata || trace.y || [];
        const oldColors = Array.isArray(trace.marker?.color) ? trace.marker.color : [];

        const colorByKey = {};
        $(`#${dialogID} .plotly-category-color`).each(function() {
            colorByKey[$(this).data('category-key')] = $(this).val();
        });

        const newColors = values.map((value, i) => {
            const key = value === null || value === undefined ? 'null' : String(value);
            return colorByKey[key] ?? oldColors[i];
        });
        Plotly.restyle(graph, { 'marker.color': [newColors] }, [0]);

        return colorByKey;
    },
   
    restore(colors, graph) {
        if (!colors) {
            return;
        }
        const trace = graph.data[0];
        if (!trace) {
            return;
        }
        const values = trace.customdata || trace.y || [];
        const oldColors = Array.isArray(trace.marker?.color) ? trace.marker.color : [];
        const newColors = values.map((value, i) => {
            const key = value === null || value === undefined ? 'null' : String(value);
            return colors[key] ?? oldColors[i];
        });
        Plotly.restyle(graph, { 'marker.color': [newColors] }, [0]);
    }
};

// for telecom tercile bar charts
const telecomTercileBarColorsModule = {
    populate(colorsContainer, dialogID, graph) {
        graph.data.forEach((trace, index) => {
            if (trace.visible === false || trace.visible === 'legendonly') {
                return;
            }
            if (trace.meta?.categoryKey !== undefined) {
                appendTraceColorSwatch(
                    colorsContainer, `${dialogID}-color-cat-${trace.meta.categoryKey}`,
                    trace.name, trace.marker?.color, index, 'category'
                );
                return;
            }

            if (Array.isArray(trace.marker?.color) && trace.customdata) {
                return;
            }
            const name = trace.name || `Series ${index + 1}`;
            const hasLineColor = typeof trace.line?.color === 'string';
            const hasMarkerColor = typeof trace.marker?.color === 'string';
            if (hasLineColor || hasMarkerColor) {
                appendTraceColorSwatch(
                    colorsContainer, `${dialogID}-color-${index}`, name,
                    hasLineColor ? trace.line.color : trace.marker.color,
                    index, hasLineColor ? 'line' : 'marker',
                    hasLineColor ? trace.line.width : trace.marker.size,
                    trace.type !== 'bar'
                );
            }
        });
    },
    apply(dialogID, graph) {
        const colors = {};
        const barTrace = graph.data.find(t => Array.isArray(t.marker?.color) && t.customdata);
        const classes = barTrace?.customdata || [];
        const newColorByKey = {};

        $(`#${dialogID} .plotly-trace-color`).each(function() {
            const traceIndex = Number($(this).data('trace-index'));
            const part = $(this).data('trace-part');
            const trace = graph.data[traceIndex];
            if (!trace) {
                return;
            }
            const color = $(this).val();

            if (part === 'category') {
                const key = String(trace.meta.categoryKey);
                newColorByKey[key] = color;
                Plotly.restyle(graph, { 'marker.color': color }, [traceIndex]);
                colors[`category|${key}`] = color;
                return;
            }

            Plotly.restyle(graph, { [`${part}.color`]: color }, [traceIndex]);
            const name = trace.name || `Series ${traceIndex + 1}`;
            colors[`${name}|${part}`] = color;
            if (part === 'line') {
                const width = clampPlotlySize(
                    Number($(`#${$(this).attr('id')}-width`).val()), PLOTLY_LINE_WIDTH_LIMITS
                );
                if (width !== null) {
                    Plotly.restyle(graph, { 'line.width': width }, [traceIndex]);
                    colors[`${name}|line-width`] = width;
                }
            } else if (part === 'marker') {
                const size = clampPlotlySize(
                    Number($(`#${$(this).attr('id')}-width`).val()), PLOTLY_MARKER_SIZE_LIMITS
                );
                if (size !== null) {
                    Plotly.restyle(graph, { 'marker.size': size }, [traceIndex]);
                    colors[`${name}|marker-size`] = size;
                }
            }
        });

        if (barTrace && Object.keys(newColorByKey).length) {
            const oldColors = Array.isArray(barTrace.marker?.color) ? barTrace.marker.color : [];
            const newBarColors = classes.map((c, i) => newColorByKey[String(c)] ?? oldColors[i]);
            Plotly.restyle(graph, { 'marker.color': [newBarColors] }, [graph.data.indexOf(barTrace)]);
        }

        return colors;
    },

    restore(colors, graph) {
        if (!colors) {
            return;
        }
        const barTrace = graph.data.find(t => Array.isArray(t.marker?.color) && t.customdata);
        const classes = barTrace?.customdata || [];
        const oldColors = Array.isArray(barTrace?.marker?.color) ? barTrace.marker.color : [];
        const newColorByKey = {};

        graph.data.forEach((trace, index) => {
            if (trace.meta?.categoryKey !== undefined) {
                const key = String(trace.meta.categoryKey);
                const color = colors[`category|${key}`];
                if (color) {
                    newColorByKey[key] = color;
                    Plotly.restyle(graph, { 'marker.color': color }, [index]);
                }
                return;
            }
            const name = trace.name || `Series ${index + 1}`;
            ['line', 'marker'].forEach((part) => {
                const color = colors[`${name}|${part}`];
                if (color) {
                    Plotly.restyle(graph, { [`${part}.color`]: color }, [index]);
                }
            });
            const width = colors[`${name}|line-width`];
            if (typeof width === 'number') {
                Plotly.restyle(graph, { 'line.width': width }, [index]);
            }
            const size = colors[`${name}|marker-size`];
            if (typeof size === 'number') {
                Plotly.restyle(graph, { 'marker.size': size }, [index]);
            }
        });

        if (barTrace && Object.keys(newColorByKey).length) {
            const newBarColors = classes.map((c, i) => newColorByKey[String(c)] ?? oldColors[i]);
            Plotly.restyle(graph, { 'marker.color': [newBarColors] }, [graph.data.indexOf(barTrace)]);
        }
    }
};


const plotlyChartSettingsStore = {};

// to store the colors module for each chart by its ID, so the correct module can be used to restore colors after a redraw
const plotlyChartSettingsModules = {};

const plotlyChartAxisKindResolvers = {};
const plotlyChartSettingsCaseKeyResolvers = {};
const PLOTLY_CHART_DEFAULT_CASE_KEY = '__default__';

// the case key to store/restore settings under for chartID right now -
// see plotlyChartSettingsCaseKeyResolvers above
function getCurrentPlotlyChartCaseKey(chartID) {
    const resolver = plotlyChartSettingsCaseKeyResolvers[chartID];
    if (typeof resolver !== 'function') {
        return PLOTLY_CHART_DEFAULT_CASE_KEY;
    }
    const caseKey = resolver();
    return (typeof caseKey === 'string' && caseKey) ? caseKey : PLOTLY_CHART_DEFAULT_CASE_KEY;
}


const plotlyChartDisallowedTickUnits = {};


function nearestAllowedTickUnit(chartID, guessedUnit) {
    const disallowed = plotlyChartDisallowedTickUnits[chartID] || [];
    if (!disallowed.includes(guessedUnit)) {
        return guessedUnit;
    }
    const fallback = TICK_INTERVAL_UNITS.find(u => !disallowed.includes(u.value));
    return fallback ? fallback.value : guessedUnit;
}


const plotlyChartOriginalTickArrays = {};


let isApplyingPlotlyTickSettings = false;

function snapshotPlotlyAxisTickArrays(gd) {
    const caseKey = getCurrentPlotlyChartCaseKey(gd.id);
    plotlyChartOriginalTickArrays[gd.id] = plotlyChartOriginalTickArrays[gd.id] || {};
    plotlyChartOriginalTickArrays[gd.id][caseKey] = {
        xaxis: {
            dtick: gd.layout.xaxis?.dtick ?? null,
            tickvals: gd.layout.xaxis?.tickvals ?? null,
            ticktext: gd.layout.xaxis?.ticktext ?? null
        },
        yaxis: {
            dtick: gd.layout.yaxis?.dtick ?? null,
            tickvals: gd.layout.yaxis?.tickvals ?? null,
            ticktext: gd.layout.yaxis?.ticktext ?? null
        },
     
        yaxis2: {
            dtick: gd.layout.yaxis2?.dtick ?? null,
            tickvals: gd.layout.yaxis2?.tickvals ?? null,
            ticktext: gd.layout.yaxis2?.ticktext ?? null
        }
    };
}


const plotlyChartDefaults = {};

function snapshotPlotlyChartDefaults(gd) {
    const caseKey = getCurrentPlotlyChartCaseKey(gd.id);
    const layout = gd.layout || {};
    const copy = value => (Array.isArray(value) ? value.slice() : value);

    plotlyChartDefaults[gd.id] = plotlyChartDefaults[gd.id] || {};
    plotlyChartDefaults[gd.id][caseKey] = {
        title: {
            text: layout.title?.text ?? null,
            color: layout.title?.font?.color ?? null,
            family: layout.title?.font?.family ?? null,
            size: layout.title?.font?.size ?? null
        },
        axisTitles: {
            xaxis: plotlyAxisTitle(layout.xaxis) || null,
            yaxis: plotlyAxisTitle(layout.yaxis) || null,
            yaxis2: plotlyAxisTitle(layout.yaxis2) || null
        },
        // store the original line/marker colors and sizes for each trace, so they can be restored on reset
        traces: (gd.data || []).map(trace => ({
            'line.color': copy(trace.line?.color) ?? null,
            'line.width': copy(trace.line?.width) ?? null,
            'marker.color': copy(trace.marker?.color) ?? null,
            'marker.size': copy(trace.marker?.size) ?? null
        }))
    };
}

function resetPlotlyChartToDefaults(gd) {
    const caseKey = getCurrentPlotlyChartCaseKey(gd.id);
    if (plotlyChartSettingsStore[gd.id]) {
        delete plotlyChartSettingsStore[gd.id][caseKey];
    }

    const defaults = plotlyChartDefaults[gd.id]?.[caseKey];
    if (!defaults) {
        return false;
    }

    const originalTicks = plotlyChartOriginalTickArrays[gd.id]?.[caseKey] || {};
    const layoutUpdate = {
        'title.text': defaults.title.text,
        'title.font.color': defaults.title.color,
        'title.font.family': defaults.title.family,
        'title.font.size': defaults.title.size,
        'xaxis.title.text': defaults.axisTitles.xaxis,
        'yaxis.title.text': defaults.axisTitles.yaxis,
        'yaxis2.title.text': defaults.axisTitles.yaxis2
    };
    ['xaxis', 'yaxis', 'yaxis2'].forEach(axisName => {
        const original = originalTicks[axisName] || {};
        layoutUpdate[`${axisName}.dtick`] = original.dtick ?? null;
        layoutUpdate[`${axisName}.tickmode`] = null;
        layoutUpdate[`${axisName}.tickvals`] = original.tickvals ?? null;
        layoutUpdate[`${axisName}.ticktext`] = original.ticktext ?? null;
    });
    Plotly.relayout(gd, layoutUpdate);

    const traceCount = (gd.data || []).length;
    defaults.traces.forEach((style, index) => {
        if (index >= traceCount) {
            return;
        }

        Plotly.restyle(gd, {
            'line.color': [style['line.color']],
            'line.width': [style['line.width']],
            'marker.color': [style['marker.color']],
            'marker.size': [style['marker.size']]
        }, [index]);
    });
    return true;
}

function savePlotlyChartSettings(chartID, caseKey, settings) {
    plotlyChartSettingsStore[chartID] = plotlyChartSettingsStore[chartID] || {};
    plotlyChartSettingsStore[chartID][caseKey] = settings;
}

function getPlotlyChartSettings(chartID, caseKey) {
    return plotlyChartSettingsStore[chartID]?.[caseKey] || null;
}

function dtickApproxMs(dtick) {
    if (dtick === null || dtick === undefined) {
        return null;
    }
    const decomposed = decomposeDateDtick(dtick, 0);
    if (!decomposed || decomposed.magnitude === null) {
        return null;
    }
    return decomposed.magnitude * getTickIntervalUnit(decomposed.unit).approxMs;
}


function isStoredDtickWithinBudget(gd, axisName, dtick) {
    const isDate = getPlotlyAxisType(gd, axisName) === 'date';
    const approxValue = isDate
        ? dtickApproxMs(dtick)
        : (typeof dtick === 'number' && Number.isFinite(dtick) ? dtick : null);
    if (approxValue === null) {
        return true;
    }
    const rangeSpan = getPlotlyAxisRangeSpan(gd, axisName, isDate);
    const maxTicks = getPlotlyAxisMaxTicks(gd, axisName);
    return clampTickInterval(approxValue, rangeSpan, maxTicks) !== null;
}


function reapplyPlotlyChartSettings(gd) {
    if (!gd || !gd.id) {
        return;
    }
    const caseKey = getCurrentPlotlyChartCaseKey(gd.id);
    const settings = getPlotlyChartSettings(gd.id, caseKey);
    if (!settings) {
        return;
    }
    if (settings.layout) {
        const layoutToApply = budgetSafeTickLayout(gd, caseKey, settings.layout);
  
        if (layoutToApply['title.font.color']) {
            layoutToApply['title.font.color'] = themeAwareTitleColor(
                layoutToApply['title.font.color'], $('html').attr('data-bs-theme')
            );
        }
        Plotly.relayout(gd, layoutToApply);
    }
    if (settings.colors) {
        const colorsModule = plotlyChartSettingsModules[gd.id] || defaultTraceColorsModule;
        colorsModule.restore(settings.colors, gd);
    }
}


function budgetSafeTickLayout(gd, caseKey, storedLayout) {
    const layoutToApply = { ...storedLayout };
    const originalTicks = (plotlyChartOriginalTickArrays[gd.id] || {})[caseKey] || {};
    ['xaxis', 'yaxis', 'yaxis2'].forEach(axisName => {
        const dtickKey = `${axisName}.dtick`;
        const storedDtick = layoutToApply[dtickKey];
        if (storedDtick == null || isStoredDtickWithinBudget(gd, axisName, storedDtick)) {
            return;
        }

        const original = originalTicks[axisName] || {};
        layoutToApply[dtickKey] = original.dtick ?? null;
        layoutToApply[`${axisName}.tickmode`] = null;
        layoutToApply[`${axisName}.tickvals`] = original.tickvals ?? null;
        layoutToApply[`${axisName}.ticktext`] = original.ticktext ?? null;
    });
    return layoutToApply;
}

function enforceTickBudgetOnRangeChange(gd, eventData) {
    if (isApplyingPlotlyTickSettings || !gd || !gd.id || !eventData) {
        return;
    }
    const changedRange = Object.keys(eventData).some(key =>
        key.endsWith('.range') || key.endsWith('.range[0]') ||
        key.endsWith('.range[1]') || key.endsWith('.autorange')
    );
    if (!changedRange) {
        return;
    }
    const caseKey = getCurrentPlotlyChartCaseKey(gd.id);
    const settings = getPlotlyChartSettings(gd.id, caseKey);
    if (!settings || !settings.layout) {
        return;
    }
    const corrected = budgetSafeTickLayout(gd, caseKey, settings.layout);

    const correction = {};
    ['xaxis', 'yaxis', 'yaxis2'].forEach(axisName => {
        const dtickKey = `${axisName}.dtick`;
        if (corrected[dtickKey] !== settings.layout[dtickKey]) {
            correction[dtickKey] = corrected[dtickKey];
            correction[`${axisName}.tickmode`] = corrected[`${axisName}.tickmode`];
            correction[`${axisName}.tickvals`] = corrected[`${axisName}.tickvals`];
            correction[`${axisName}.ticktext`] = corrected[`${axisName}.ticktext`];
        }
    });
    if (Object.keys(correction).length > 0) {
        Plotly.relayout(gd, correction);
    }
}

(function(nativeNewPlot) {
    Plotly.newPlot = function(...args) {
        return nativeNewPlot.apply(Plotly, args).then((gd) => {
            gd.on('plotly_afterplot', () => fixRangesliderTitlePosition(gd));
            gd.on('plotly_relayout', (eventData) => enforceTickBudgetOnRangeChange(gd, eventData));
            if (!isApplyingPlotlyTickSettings) {
                snapshotPlotlyAxisTickArrays(gd);
                snapshotPlotlyChartDefaults(gd);
            }
            reapplyPlotlyChartSettings(gd);
            fixRangesliderTitlePosition(gd);
            return gd;
        });
    };
})(Plotly.newPlot);

// changed the name
function buildPlotlyChartSettingsForm(dialogID){
    const dialog = $('<div>', {
            id: dialogID,
            class: 'container-fluid dialog-box-settings plotly-chart-settings-dialog'
        }).append(
            $('<div>', { class: 'row m-2' }).append(
                $('<div>', { class: 'col-sm-11 d-flex justify-content-start' }).append(
                    $('<span>', { class: 'fw-bolder', text: 'Chart settings' })
                ),
                $('<div>', { class: 'col-sm-1 d-flex justify-content-end' }).append(
                    $('<button>', {
                        id: `${dialogID}-close-1`,
                        type: 'button',
                        class: 'btn btn-md position-absolute top-0 end-0 me-1 p-1',
                        title: 'Discard changes',
                        'aria-label': 'Discard changes and close'
                    }).append($('<i>', { class: 'bi bi-x-circle-fill' }))
                ),
                $('<hr>', { class: 'w-100' })
            ),
            $('<div>', { class: 'container mt-2 mb-1 mx-0 px-2' }).append(
                $('<div>', { class: 'mb-2' }).append(
                    $('<label>', { class: 'form-label mb-1', for: `${dialogID}-title`, text: 'Title' }),
                    $('<div>', { class: 'd-flex flex-wrap align-items-center gap-2' }).append(
                        buildPlotlyTextField(`${dialogID}-title`),
                        $('<select>', {
                            id: `${dialogID}-title-font`,
                            class: 'form-select form-select-sm',
                            style: 'width: 160px;',
                            title: 'Title font'
                        }).append(
                            PLOTLY_TITLE_FONTS.map(font =>
                                $('<option>', { value: font.value, text: font.label, style: `font-family: ${font.value || 'inherit'};` })
                            )
                        ),
                        $('<input>', {
                            id: `${dialogID}-title-size`,
                            type: 'number',
                            min: PLOTLY_TITLE_SIZE_LIMITS.min,
                            max: PLOTLY_TITLE_SIZE_LIMITS.max,
                            class: 'form-control form-control-sm',
                            style: 'width: 90px;',
                            placeholder: 'Title size',
                            title: `Title size (${PLOTLY_TITLE_SIZE_LIMITS.min}-${PLOTLY_TITLE_SIZE_LIMITS.max})`
                        }),
                        $('<input>', {
                            id: `${dialogID}-title-color`,
                            type: 'color',
                            class: 'form-control form-control-color',
                            title: 'Title color'
                        })
                    ),
                    buildPlotlyTextWarning(`${dialogID}-title`)
                ),
                $('<div>', { class: 'row g-2' }).append(
                    $('<div>', { class: 'col-sm-6' }).append(
                        $('<label>', { class: 'form-label mb-1', for: `${dialogID}-x-label`, text: 'X-axis label' }),
                        buildPlotlyTextField(`${dialogID}-x-label`),
                        buildPlotlyTextWarning(`${dialogID}-x-label`)
                    ),
                    $('<div>', { class: 'col-sm-6' }).append(
                        $('<label>', { class: 'form-label mb-1', for: `${dialogID}-y-label`, text: 'Y-axis label' }),
                        buildPlotlyTextField(`${dialogID}-y-label`),
                        buildPlotlyTextWarning(`${dialogID}-y-label`)
                    ),
                    $('<div>', { id: `${dialogID}-y2-label-group`, class: 'col-sm-6 d-none' }).append(
                        $('<label>', { class: 'form-label mb-1', for: `${dialogID}-y2-label`, text: 'Y-axis 2 (right) label' }),
                        buildPlotlyTextField(`${dialogID}-y2-label`),
                        buildPlotlyTextWarning(`${dialogID}-y2-label`)
                    ),
                    $('<div>', { class: 'col-sm-6' }).append(
                        $('<label>', { id: `${dialogID}-x-tick-label`, class: 'form-label mb-1', for: `${dialogID}-x-tick`, text: 'X-axis tick interval' }),
                        $('<div>', { class: 'd-flex align-items-center gap-2' }).append(
                            $('<input>', { id: `${dialogID}-x-tick`, type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'form-control form-control-sm', placeholder: 'Auto' }),
                            $('<select>', { id: `${dialogID}-x-tick-unit`, class: 'form-select form-select-sm d-none', style: 'width: 100px;' }).append(
                                TICK_INTERVAL_UNITS.map(u => $('<option>', { value: u.value, text: u.label }))
                            ),
                            $('<span>', { id: `${dialogID}-x-tick-unitlabel`, class: 'text-body-secondary d-none' })
                        ),
                        $('<div>', { id: `${dialogID}-x-tick-warning`, class: 'form-text text-warning-emphasis d-none' })
                    ),
                    $('<div>', { class: 'col-sm-6' }).append(
                        $('<label>', { id: `${dialogID}-y-tick-label`, class: 'form-label mb-1', for: `${dialogID}-y-tick`, text: 'Y-axis tick interval' }),
                        $('<div>', { class: 'd-flex align-items-center gap-2' }).append(
                            $('<input>', { id: `${dialogID}-y-tick`, type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'form-control form-control-sm', placeholder: 'Auto' }),
                            $('<select>', { id: `${dialogID}-y-tick-unit`, class: 'form-select form-select-sm d-none', style: 'width: 100px;' }).append(
                                TICK_INTERVAL_UNITS.map(u => $('<option>', { value: u.value, text: u.label }))
                            ),
                            $('<span>', { id: `${dialogID}-y-tick-unitlabel`, class: 'text-body-secondary d-none' })
                        ),
                        $('<div>', { id: `${dialogID}-y-tick-warning`, class: 'form-text text-warning-emphasis d-none' })
                    ),
                    $('<div>', { id: `${dialogID}-y2-tick-group`, class: 'col-sm-6 d-none' }).append(
                        $('<label>', { id: `${dialogID}-y2-tick-label`, class: 'form-label mb-1', for: `${dialogID}-y2-tick`, text: 'Y-axis 2 (right) tick interval' }),
                        $('<div>', { class: 'd-flex align-items-center gap-2' }).append(
                            $('<input>', { id: `${dialogID}-y2-tick`, type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'form-control form-control-sm', placeholder: 'Auto' }),
                            $('<select>', { id: `${dialogID}-y2-tick-unit`, class: 'form-select form-select-sm d-none', style: 'width: 100px;' }).append(
                                TICK_INTERVAL_UNITS.map(u => $('<option>', { value: u.value, text: u.label }))
                            ),
                            $('<span>', { id: `${dialogID}-y2-tick-unitlabel`, class: 'text-body-secondary d-none' })
                        ),
                        $('<div>', { id: `${dialogID}-y2-tick-warning`, class: 'form-text text-warning-emphasis d-none' })
                    )
                ),
                $('<fieldset>', { class: 'border border-secondary rounded-3 p-2 mt-3' }).append(
                    $('<legend>', { class: 'legend-label px-1', text: 'Chart colors' }),
                    $('<div>', { id: `${dialogID}-colors`, class: 'plotly-chart-settings-colors' })
                )
            ),
            $('<div>', { class: 'd-flex justify-content-between m-2' }).append(
                $('<button>', {
                    id: `${dialogID}-reset`,
                    type: 'button',
                    class: 'btn btn-sm btn-outline-secondary',
                    text: 'Reset to defaults',
                    title: 'Discard this chart\'s customization and put its title, axis labels, tick intervals and colors back to how the chart is drawn by default - applies and closes'
                }),
                $('<button>', {
                    id: `${dialogID}-close-2`,
                    type: 'button',
                    class: 'btn btn-sm btn-primary',
                    text: 'Close and apply'
                })
            )
        )
    return dialog;
}
// changed the name
function enablePlotlyChartSettings(
    buttonID,
    chartID,
    inputsFunction = buildPlotlyChartSettingsForm,
    colorsModule = defaultTraceColorsModule,
    axisKindResolver = null,
    caseKeyResolver = null,
    disallowedTickUnits = []
) {
    const dialogID = `plotly-chart-settings-${buttonID}`;
    // remember which colorsModule this chart uses so saved settings can
    // be restored correctly even on a redraw the dialog wasn't open for
    plotlyChartSettingsModules[chartID] = colorsModule;
    plotlyChartAxisKindResolvers[chartID] = axisKindResolver;
    plotlyChartSettingsCaseKeyResolvers[chartID] = caseKeyResolver;
    plotlyChartDisallowedTickUnits[chartID] = disallowedTickUnits;

    const editButton = $(`#plotly-chart-edit-${buttonID}`);
    const modalHost = editButton.closest('.modal');
    const dialogHost = modalHost.length ? modalHost : $(document.body);
    let dialog = $(`#${dialogID}`);

    if (!dialog.length) {
        dialog = inputsFunction(dialogID);
        dialog.appendTo(dialogHost);
        disallowedTickUnits.forEach(unitValue => {
            $(`#${dialogID}-x-tick-unit, #${dialogID}-y-tick-unit`)
                .find(`option[value="${unitValue}"]`)
                .remove();
        });
    } else if (!dialog.parent().is(dialogHost)) {

        dialog.appendTo(dialogHost);
    }

    function getGraph() {
        return document.getElementById(chartID);
    }

    function populateDialog() {
        const graph = getGraph();
        if (!graph || !graph.layout || !graph.data) {
            return false;
        }

        const theme = $('html').attr('data-bs-theme');
        const defaultTitleColor = (plotly_themecolors[theme] || plotly_themecolors.light).fontcolor;

        $(`#${dialogID}-title`).val(graph.layout.title?.text || '');
        $(`#${dialogID}-title-color`).val(
            plotlyColorInputValue(graph.layout.title?.font?.color, defaultTitleColor)
        );

        const titleFont = graph.layout.title?.font?.family || '';
        const titleFontSelect = $(`#${dialogID}-title-font`);
        titleFontSelect.val(titleFontSelect.find(`option[value='${titleFont}']`).length ? titleFont : '');

        $(`#${dialogID}-title-size`).val(graph.layout.title?.font?.size ?? '');
        $(`#${dialogID}-x-label`).val(plotlyAxisTitle(graph.layout.xaxis));
        $(`#${dialogID}-y-label`).val(plotlyAxisTitle(graph.layout.yaxis));


        const hasY2 = plotlyChartHasSecondYAxis(graph);
        $(`#${dialogID}-y2-tick-group`).toggleClass('d-none', !hasY2);
        $(`#${dialogID}-y2-label-group`).toggleClass('d-none', !hasY2);
        $(`#${dialogID}-y2-label`).val(plotlyAxisTitle(graph.layout.yaxis2));
        ['title', 'x-label', 'y-label', 'y2-label'].forEach(field =>
            updatePlotlyTextWarning($(`#${dialogID}-${field}`))
        );
        const tickAxes = hasY2 ? ['xaxis', 'yaxis', 'yaxis2'] : ['xaxis', 'yaxis'];

   
        tickAxes.forEach(axisName => {
            const side = plotlyAxisFieldSide(axisName);
            const input = $(`#${dialogID}-${side}-tick`);
            const unitSelect = $(`#${dialogID}-${side}-tick-unit`);
            const isDate = getPlotlyAxisType(graph, axisName) === 'date';
            const isYear = isPlotlyAxisYearKind(graph, axisName);
            const isInteger = !isDate && !isYear && getPlotlyAxisNumberKind(graph, axisName) === 'integer';

            const axisLabel = axisName === 'yaxis2' ? 'Y-axis 2 (right)' : `${side.toUpperCase()}-axis`;
            $(`#${dialogID}-${side}-tick-label`).text(`${axisLabel} tick interval`);
            unitSelect.toggleClass('d-none', !isDate);


            const unitLabel = isYear ? 'year(s)' : (isInteger ? getPlotlyAxisUnitLabel(graph, axisName) : null);
            $(`#${dialogID}-${side}-tick-unitlabel`)
                .text(unitLabel || '')
                .toggleClass('d-none', !unitLabel);

            if (isDate) {
                const rangeSpan = getPlotlyAxisRangeSpan(graph, axisName, true);
                const { unit, magnitude } = decomposeDateDtick(graph.layout[axisName]?.dtick, rangeSpan);
                unitSelect.val(nearestAllowedTickUnit(chartID, unit));
                input.val(magnitude ?? '');
            } else {
                const dtick = graph.layout[axisName]?.dtick;
                input.val(typeof dtick === 'number' && Number.isFinite(dtick) ? dtick : '');
            }
            refreshTickInputConstraints(axisName);
        });

        const colors = $(`#${dialogID}-colors`).empty();
        colorsModule.populate(colors, dialogID, graph);
        return true;
    }


    function computeTickWholeOnly(axisName) {
        const graph = getGraph();
        if (!graph) {
            return false;
        }
        const side = plotlyAxisFieldSide(axisName);
        const isDate = getPlotlyAxisType(graph, axisName) === 'date';
        const isInteger = !isDate && getPlotlyAxisNumberKind(graph, axisName) === 'integer';
        const unitValue = isDate ? $(`#${dialogID}-${side}-tick-unit`).val() : null;
        return isInteger || (isDate && getTickIntervalUnit(unitValue).wholeOnly);
    }

    function refreshTickInputConstraints(axisName) {
        const graph = getGraph();
        if (!graph) {
            return;
        }
        const side = plotlyAxisFieldSide(axisName);
        const input = $(`#${dialogID}-${side}-tick`);
        const isDate = getPlotlyAxisType(graph, axisName) === 'date';
        const isYear = isPlotlyAxisYearKind(graph, axisName);
        const unitValue = isDate ? $(`#${dialogID}-${side}-tick-unit`).val() : null;
        const wholeOnly = computeTickWholeOnly(axisName);

        
        input.attr('type', isYear ? 'number' : 'text');
        const minInterval = getPlotlyAxisMinDisplayInterval(graph, axisName, isDate, unitValue);
        if (isYear) {
            const minYears = Math.max(1, minInterval ?? 1);
            input.attr('min', minYears).attr('step', 1).removeAttr('inputmode');
            if (minYears > 1) {
                input.attr('title', `Minimum: ${minYears}`);
            } else {
                input.removeAttr('title');
            }
        } else {
            input.attr('inputmode', wholeOnly ? 'numeric' : 'decimal').removeAttr('step');
            if (minInterval !== null) {
                input.attr('min', minInterval).attr('title', `Minimum: ${minInterval}`);
            } else {
                input.removeAttr('min').removeAttr('title');
            }
        }
        sanitizeTickIntervalInput(input, wholeOnly);
        updateTickIntervalWarning(axisName);
    }

    function updateTickIntervalWarning(axisName) {
        const graph = getGraph();
        const side = plotlyAxisFieldSide(axisName);
        const warning = $(`#${dialogID}-${side}-tick-warning`);
        if (!graph) {
            warning.addClass('d-none');
            return;
        }
        const value = $(`#${dialogID}-${side}-tick`).val();
        const unitValue = $(`#${dialogID}-${side}-tick-unit`).val();
        if (!tickIntervalExceedsBudget(graph, axisName, value, unitValue)) {
            warning.addClass('d-none');
            return;
        }
        const isDate = getPlotlyAxisType(graph, axisName) === 'date';
        const minInterval = getPlotlyAxisMinDisplayInterval(graph, axisName, isDate, unitValue);
        const rangeDescriptor = isDate ? 'date range' : 'range';
        const unitSuffix = isDate ? ` ${getTickIntervalUnit(unitValue).label.toLowerCase()}` : '';
        const shortenHint = axisName === 'xaxis' ? ', or shorten the range' : '';
        warning.text(
            minInterval !== null
                ? `Too many ticks for the current ${rangeDescriptor} - try at least ${minInterval}${unitSuffix}${shortenHint}.`
                : `Too many ticks for the current ${rangeDescriptor} - try a larger interval${shortenHint}.`
        ).removeClass('d-none');
    }

    function parseTick(value, unitValue, axisName) {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const numeric = Number(trimmed);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return null;
        }
        const graph = getGraph();
        if (!graph) {
            return null;
        }
        const isDate = getPlotlyAxisType(graph, axisName) === 'date';
        const maxTicks = getPlotlyAxisMaxTicks(graph, axisName);

        if (isDate) {
            const unit = getTickIntervalUnit(unitValue);
            if (unit.wholeOnly && !Number.isInteger(numeric)) {
                return null;
            }
            const rangeSpan = getPlotlyAxisRangeSpan(graph, axisName, true);
            const withinBudget = clampTickInterval(numeric * unit.approxMs, rangeSpan, maxTicks);
            return withinBudget === null ? null : unit.toDtick(numeric);
        }

        if (!Number.isInteger(numeric) && getPlotlyAxisNumberKind(graph, axisName) === 'integer') {
            return null;
        }
        const rangeSpan = getPlotlyAxisRangeSpan(graph, axisName, false);
        return clampTickInterval(numeric, rangeSpan, maxTicks);
    }


   // helper to parse the title font size input, clamp it to the allowed range, and return null for empty/invalid input
    function parseFontSize(value) {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        return clampPlotlySize(Number(trimmed), PLOTLY_TITLE_SIZE_LIMITS);
    }

    function applySettings() {
        const graph = getGraph();
        if (!graph || !graph.layout || !graph.data) {
            return;
        }
        const caseKey = getCurrentPlotlyChartCaseKey(chartID);
        // added .trim() to remove any leading/trailing whitespace from the title and axis labels
        const layoutUpdate = {
            'title.text': limitPlotlyTextValue($(`#${dialogID}-title`).val().trim()),
            'title.font.color': $(`#${dialogID}-title-color`).val(),
            'title.font.family': $(`#${dialogID}-title-font`).val() || null,
            'title.font.size': parseFontSize($(`#${dialogID}-title-size`).val()),
        // fix for the title is being cut off
            'title.automargin': true,
            'title.pad': { t: 5, b: 5 },
            'xaxis.title.text': limitPlotlyTextValue($(`#${dialogID}-x-label`).val().trim()),
            'yaxis.title.text': limitPlotlyTextValue($(`#${dialogID}-y-label`).val().trim()),
            'xaxis.dtick': parseTick($(`#${dialogID}-x-tick`).val(), $(`#${dialogID}-x-tick-unit`).val(), 'xaxis'),
            'yaxis.dtick': parseTick($(`#${dialogID}-y-tick`).val(), $(`#${dialogID}-y-tick-unit`).val(), 'yaxis')
        };

    
        const hasY2 = plotlyChartHasSecondYAxis(graph);
        if (hasY2) {
            layoutUpdate['yaxis2.title.text'] = limitPlotlyTextValue(
                $(`#${dialogID}-y2-label`).val().trim()
            );
            layoutUpdate['yaxis2.dtick'] = parseTick(
                $(`#${dialogID}-y2-tick`).val(), $(`#${dialogID}-y2-tick-unit`).val(), 'yaxis2'
            );
        }

  
        const originalTicks = plotlyChartOriginalTickArrays[chartID]?.[caseKey] || {};
        (hasY2 ? ['xaxis', 'yaxis', 'yaxis2'] : ['xaxis', 'yaxis']).forEach(axisName => {
            const original = originalTicks[axisName] || {};
            const manualDtick = layoutUpdate[`${axisName}.dtick`];
            if (manualDtick !== null) {
                layoutUpdate[`${axisName}.tickmode`] = 'linear';
                layoutUpdate[`${axisName}.tickvals`] = null;
                layoutUpdate[`${axisName}.ticktext`] = null;
            } else {
                layoutUpdate[`${axisName}.dtick`] = original.dtick ?? null;
                layoutUpdate[`${axisName}.tickmode`] = null;
                layoutUpdate[`${axisName}.tickvals`] = original.tickvals ?? null;
                layoutUpdate[`${axisName}.ticktext`] = original.ticktext ?? null;
            }
        });

        // title, so if the user shrinks the title text or removes it entirely

        const mergedLayout = deepMerge(graph.layout, dotPathsToNestedObject(layoutUpdate));
    
        isApplyingPlotlyTickSettings = true;
        Plotly.newPlot(graph, graph.data, mergedLayout, graph._context)
            .finally(() => { isApplyingPlotlyTickSettings = false; });
        const colors = colorsModule.apply(dialogID, graph);

        
        savePlotlyChartSettings(chartID, caseKey, { layout: layoutUpdate, colors });
    }

    editButton
        .off('click.plotlyChartSettings')
        .on('click.plotlyChartSettings', function() {
            if (populateDialog()) {
                dialog.fadeIn(200);
            }
        });

        
    $(`#${dialogID}-x-tick-unit`)
        .off('change.plotlyChartSettings')
        .on('change.plotlyChartSettings', () => refreshTickInputConstraints('xaxis'));
    $(`#${dialogID}-y-tick-unit`)
        .off('change.plotlyChartSettings')
        .on('change.plotlyChartSettings', () => refreshTickInputConstraints('yaxis'));
    $(`#${dialogID}-y2-tick-unit`)
        .off('change.plotlyChartSettings')
        .on('change.plotlyChartSettings', () => refreshTickInputConstraints('yaxis2'));


    $(`#${dialogID}-x-tick`)
        .off('keydown.plotlyChartSettings')
        .on('keydown.plotlyChartSettings', e => handleTickIntervalKeydown(e, computeTickWholeOnly('xaxis')))
        .off('input.plotlyChartSettings')
        .on('input.plotlyChartSettings', function() {
            sanitizeTickIntervalInput($(this), computeTickWholeOnly('xaxis'));
            updateTickIntervalWarning('xaxis');
        });
    $(`#${dialogID}-y-tick`)
        .off('keydown.plotlyChartSettings')
        .on('keydown.plotlyChartSettings', e => handleTickIntervalKeydown(e, computeTickWholeOnly('yaxis')))
        .off('input.plotlyChartSettings')
        .on('input.plotlyChartSettings', function() {
            sanitizeTickIntervalInput($(this), computeTickWholeOnly('yaxis'));
            updateTickIntervalWarning('yaxis');
        });
    $(`#${dialogID}-y2-tick`)
        .off('keydown.plotlyChartSettings')
        .on('keydown.plotlyChartSettings', e => handleTickIntervalKeydown(e, computeTickWholeOnly('yaxis2')))
        .off('input.plotlyChartSettings')
        .on('input.plotlyChartSettings', function() {
            sanitizeTickIntervalInput($(this), computeTickWholeOnly('yaxis2'));
            updateTickIntervalWarning('yaxis2');
        });


    $(`#${dialogID}-close-1`)
        .off('click.plotlyChartSettings')
        .on('click.plotlyChartSettings', function() {
            dialog.fadeOut(200);
        });


    $(`#${dialogID}-reset`)
        .off('click.plotlyChartSettings')
        .on('click.plotlyChartSettings', function() {
            const graph = getGraph();
            if (graph) {
                resetPlotlyChartToDefaults(graph);
            }
            dialog.fadeOut(200);
        });

    // "Close and apply" is the only thing that commits
    $(`#${dialogID}-close-2`)
        .off('click.plotlyChartSettings')
        .on('click.plotlyChartSettings', function() {
            applySettings();
            dialog.fadeOut(200);
        });
}
