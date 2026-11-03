$(document).ready(function() {
    $('[data-bs-toggle="tooltip"]').tooltip();
    const forecastConfig = {
        seasonal: {
            endpoint: createEndpoint('admin', 'upload_seasonal_forecast'),
            required: [/^MME_deterministic_forecast_\d{4}\.nc$/, /^MME_forecast_prediction_error_variance_\d{4}\.nc$/, /^MME_probabilistic_forecast_\d{4}\.nc$/, /^obs\.nc$/],
            optional: [/^MME_deterministic_hindcasts\.nc$/, /^MME_hindcast_prediction_error_variance\.nc$/, /^MME_probabilistic_hindcasts\.nc$/, /^MME_skill_scores\.nc$/]
        },
        tendays: {
            endpoint: createEndpoint('admin', 'upload_tendays_forecast'),
            required: [/^PrecDaily\.nc$/, /^PrecExtreme\.nc$/, /^TavgDaily\.nc$/, /^TmaxDaily\.nc$/, /^TminDaily\.nc$/],
            optional: [/^PrecDailyYrsPercentile\.nc$/, /^PrecHourly\.nc$/, /^TavgHourly\.nc$/]
        },
        monthly: {
            endpoint: createEndpoint('admin', 'upload_monthly_forecast'),
            required: [], optional: [], placeholder: true
        }
    };
    let selectedType = 'seasonal';

    function renderFileList(files, heading, isValid = null) {
        const container = $('#chosen-files').empty().removeClass('text-success text-danger');
        if (!files.length) return;
        if (isValid === true) container.addClass('text-success');
        if (isValid === false) container.addClass('text-danger');
        $('<h5>').text(heading).appendTo(container);
        const list = $('<ul>').addClass('mb-0').appendTo(container);
        files.forEach(file => $('<li>').text(file.name || file).appendTo(list));
    }

    function renderDescription(type) {
        const text = PAGE_CTRL.forecasts[type];
        const container = $('#forecast-description').empty();
        $('<p>').text(text.description).appendTo(container);
        if (text.required_files.length) {
            $('<h5>').text(PAGE_CTRL.required_files).appendTo(container);
            const list = $('<ul>').appendTo(container);
            text.required_files.forEach(name => $('<li>').text(name).appendTo(list));
        }
        if (text.optional_files.length) {
            $('<h5>').text(PAGE_CTRL.optional_files).appendTo(container);
            const list = $('<ul>').appendTo(container);
            text.optional_files.forEach(name => $('<li>').text(name).appendTo(list));
        }
    }

    function selectForecastType(type) {
        selectedType = type;
        $('#forecast-files').val('');
        $('#chosen-files').empty();
        $('#forecast-upload-title').text(PAGE_CTRL.forecasts[type].title);
        $('#seasonal-variable-container').toggle(type === 'seasonal');
        $('.forecast-upload-link').removeClass('active');
        $(`.forecast-upload-link[data-forecast-type="${type}"]`).addClass('active');
        renderDescription(type);
    }

    function validateFiles(files) {
        const config = forecastConfig[selectedType];
        const allowed = config.required.concat(config.optional);
        const acceptedFiles = files.filter(file => allowed.some(pattern => pattern.test(file.name)));
        const names = acceptedFiles.map(file => file.name);
        if (!files.length) return {valid: false, message: PAGE_CTRL.messages.no_files, files: []};
        if (config.placeholder) return {valid: false, message: PAGE_CTRL.messages.monthly_not_defined, files: []};
        if (new Set(names).size !== names.length) return {valid: false, message: PAGE_CTRL.messages.duplicate_files, files: acceptedFiles};
        const missing = config.required.filter(pattern => !names.some(name => pattern.test(name)));
        if (missing.length) return {valid: false, message: PAGE_CTRL.messages.invalid_files, files: acceptedFiles};
        return {valid: true, files: acceptedFiles};
    }

    $('.forecast-upload-link').on('click', function(event) {
        event.preventDefault();
        selectForecastType($(this).data('forecast-type'));
    });

    $('#forecast-files').on('change', function() {
        const files = Array.from(this.files);
        const result = validateFiles(files);
        renderFileList(result.files, PAGE_CTRL.chosen_files, result.valid);
        if (!result.valid) {
            flashMessage(result.message, 'error');
            return;
        }
    });

    $('#upload-forecast-button').on('click', function() {
        const files = Array.from($('#forecast-files').prop('files'));
        const result = validateFiles(files);
        if (!result.valid) {
            flashMessage(result.message, 'error');
            return;
        }
        const data = new FormData();
        result.files.forEach(file => data.append('files', file));
        if (selectedType === 'seasonal') {
            data.append('variable', $('#seasonal-variable').val());
        }
        $.ajax({
            type: 'POST', url: forecastConfig[selectedType].endpoint, data: data,
            cache: false, contentType: false, processData: false, dataType: 'json',
            success: function(json) {
                flashMessage(json.message, json.status);
                if (json.status === 'success') {
                    $('#forecast-files').val('');
                    renderFileList(json.files, PAGE_CTRL.uploaded_files, true);
                }
            },
            error: function(xhr, status, error) { displayAjaxError(xhr, status, error); }
        });
    });

    selectForecastType(selectedType);
});
