// Dialog box: expand chart info
function buildPlotlyChartExpandInfoDialog(dialogID) {
    return $('<div>', {
        id: dialogID,
        class: 'container-fluid dialog-box-settings plotly-chart-settings-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': `${dialogID}-title`
    }).append(
        $('<div>', { class: 'row m-2' }).append(
            $('<div>', { class: 'col-sm-11 d-flex justify-content-start' }).append(
                $('<span>', {
                    id: `${dialogID}-title`,
                    class: 'fw-bolder',
                    text: 'Chart information'
                })
            ),
            $('<div>', { class: 'col-sm-1 d-flex justify-content-end' }).append(
                $('<button>', {
                    id: `${dialogID}-close-1`,
                    type: 'button',
                    class: 'btn btn-md position-absolute top-0 end-0 me-1 p-1',
                    title: 'Close',
                    'aria-label': 'Close chart information'
                }).append($('<i>', { class: 'bi bi-x-circle-fill' }))
            ),
            $('<hr>', { class: 'w-100' })
        ),
        $('<div>', { class: 'container mt-2 mb-1 mx-0 px-2 py-4' }).append(
            $('<div>', { class: 'container' }).append(
                $('<span>').html(
                    'Place here the information for this expand chart<br>It may be a table or list'
                )
            )
        ),
        $('<div>', { class: 'd-flex justify-content-end m-2' }).append(
            $('<button>', {
                id: `${dialogID}-close-2`,
                type: 'button',
                class: 'btn btn-sm btn-primary',
                text: 'Close'
            })
        )
    );
}

function closePlotlyChartExpandInfoDialog(dialog) {
    dialog.fadeOut(200);
}

function openPlotlyChartExpandInfoDialog(button) {
    const infoButton = $(button);
    const buttonID = infoButton.attr('id').replace('plotly-chart-info-', '');
    const dialogID = `plotly-chart-expand-info-dialog-${buttonID}`;
    const modalHost = infoButton.closest('.modal');
    const dialogHost = modalHost.length ? modalHost : $(document.body);
    let dialog = $(document.getElementById(dialogID));

    if (!dialog.length) {
        dialog = buildPlotlyChartExpandInfoDialog(dialogID).appendTo(dialogHost);
    } else if (!dialog.parent().is(dialogHost)) {
        dialog.appendTo(dialogHost);
    }

    dialog
        .find(`#${dialogID}-close-1, #${dialogID}-close-2`)
        .off('click.plotlyChartExpandInfo')
        .on('click.plotlyChartExpandInfo', function() {
            closePlotlyChartExpandInfoDialog(dialog);
        });

    dialog.fadeIn(200);
}

function enablePlotlyChartExpandInfoDialogs() {
    const expandInfoButtonSelector = 'button.modebar-btn[id^="plotly-chart-info-"]';

    $(document)
        .off('click.plotlyChartExpandInfo', expandInfoButtonSelector)
        .on('click.plotlyChartExpandInfo', expandInfoButtonSelector, function() {
            openPlotlyChartExpandInfoDialog(this);
        });
}

// Dialog box: preview chart info
function buildPlotlyChartPreviewInfoDialog(dialogID) {
    return $('<div>', {
        id: dialogID,
        class: 'container-fluid dialog-box-settings plotly-chart-settings-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': `${dialogID}-title`
    }).append(
        $('<div>', { class: 'row m-2' }).append(
            $('<div>', { class: 'col-sm-11 d-flex justify-content-start' }).append(
                $('<span>', {
                    id: `${dialogID}-title`,
                    class: 'fw-bolder',
                    text: 'Chart information'
                })
            ),
            $('<div>', { class: 'col-sm-1 d-flex justify-content-end' }).append(
                $('<button>', {
                    id: `${dialogID}-close-1`,
                    type: 'button',
                    class: 'btn btn-md position-absolute top-0 end-0 me-1 p-1',
                    title: 'Close',
                    'aria-label': 'Close chart information'
                }).append($('<i>', { class: 'bi bi-x-circle-fill' }))
            ),
            $('<hr>', { class: 'w-100' })
        ),
        $('<div>', { class: 'container mt-2 mb-1 mx-0 px-2 py-4' }).append(
            $('<div>', { class: 'container' }).append(
                $('<span>').html(
                    'Place here the information for this preview chart<br>It may be a table or list'
                )
            )
        ),
        $('<div>', { class: 'd-flex justify-content-end m-2' }).append(
            $('<button>', {
                id: `${dialogID}-close-2`,
                type: 'button',
                class: 'btn btn-sm btn-primary',
                text: 'Close'
            })
        )
    );
}

function closePlotlyChartPreviewInfoDialog(dialog) {
    dialog.fadeOut(200);
}

function openPlotlyChartPreviewInfoDialog(button) {
    const infoButton = $(button);
    const buttonID = infoButton.attr('id').replace('info-preview-', '');
    const dialogID = `plotly-chart-preview-info-dialog-${buttonID}`;
    let dialog = $(document.getElementById(dialogID));

    if (!dialog.length) {
        dialog = buildPlotlyChartPreviewInfoDialog(dialogID).appendTo(document.body);
    }

    dialog
        .find(`#${dialogID}-close-1, #${dialogID}-close-2`)
        .off('click.plotlyChartPreviewInfo')
        .on('click.plotlyChartPreviewInfo', function() {
            closePlotlyChartPreviewInfoDialog(dialog);
        });

    dialog.fadeIn(200);
}

function enablePlotlyChartPreviewInfoDialogs() {
    const previewInfoButtonSelector = 'button.btn-preview-chart[id^="info-preview-"]';

    $(document)
        .off('click.plotlyChartPreviewInfo', previewInfoButtonSelector)
        .on('click.plotlyChartPreviewInfo', previewInfoButtonSelector, function() {
            openPlotlyChartPreviewInfoDialog(this);
        });
}

$(function() {
    enablePlotlyChartExpandInfoDialogs();
    enablePlotlyChartPreviewInfoDialogs();
});