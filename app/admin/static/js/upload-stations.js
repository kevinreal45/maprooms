$(document).ready(function() {
    $('[data-bs-toggle="tooltip"]').tooltip();
    const endpoint = createEndpoint('admin', 'upload_station_observation');
    const filenamePattern = /^(precip|tmax|tmin|tmean|rhmin|rhmax|rhmean)_(\d{8})_(\d{8})\.csv$/;

    function parseDate(value) {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6));
        const day = Number(value.slice(6, 8));
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
        return date;
    }

    function validateFile(file) {
        if (!file) return {valid: false, message: PAGE_CTRL.messages.no_file};
        const match = filenamePattern.exec(file.name);
        if (!match) return {valid: false, message: PAGE_CTRL.messages.invalid_filename};
        const startDate = parseDate(match[2]);
        const endDate = parseDate(match[3]);
        if (!startDate || !endDate || startDate > endDate) {
            return {valid: false, message: PAGE_CTRL.messages.invalid_dates};
        }
        return {valid: true};
    }

    function renderFile(filename, heading, isValid = null) {
        const container = $('#chosen-file').empty().removeClass('text-success text-danger');
        if (!filename) return;
        if (isValid === true) container.addClass('text-success');
        if (isValid === false) container.addClass('text-danger');
        $('<h5>').text(heading).appendTo(container);
        $('<ul>').addClass('mb-0').append($('<li>').text(filename)).appendTo(container);
    }

    $('.station-upload-link').on('click', function(event) {
        event.preventDefault();
        $('#station-upload-title').text(PAGE_CTRL.upload_manual_observations);
        $(this).addClass('active');
    });

    $('#station-file').on('change', function() {
        const file = this.files[0];
        const result = validateFile(file);
        renderFile(file ? file.name : null, PAGE_CTRL.chosen_file, result.valid);
        if (!result.valid) {
            flashMessage(result.message, 'error');
            return;
        }
    });

    $('#upload-station-button').on('click', function() {
        const file = $('#station-file').prop('files')[0];
        const result = validateFile(file);
        if (!result.valid) {
            flashMessage(result.message, 'error');
            return;
        }
        const data = new FormData();
        data.append('file', file);
        $.ajax({
            type: 'POST', url: endpoint, data: data,
            cache: false, contentType: false, processData: false, dataType: 'json',
            success: function(json) {
                flashMessage(json.message, json.status);
                if (json.status === 'success') {
                    $('#station-file').val('');
                    renderFile(json.file, PAGE_CTRL.uploaded_file, true);
                }
            },
            error: function(xhr, status, error) { displayAjaxError(xhr, status, error); }
        });
    });

});
