$(document).ready(function() {
    $('[data-bs-toggle="tooltip"]').tooltip();
    let map = createLeafletTileLayer('div-map-container', MTO_INIT);

    // offcanvas map controls
    setOffCanvasMapControlMonitoring('monthly');

    ////////////
    // Modal Expand Charts
    $('.monthly-raw-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#monthly-raw-control')
    });
    $('#btn-div-chart-raw').on('click', () => {
        setAnalysisExpandModalRaw('monthly', 'div-chart-raw');
    });

    $('.monthly-anom-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#monthly-anom-control')
    });
    $('#btn-div-chart-anom').on('click', () => {
        setAnalysisExpandModalAnom('monthly', 'div-chart-anom');
    });

    ////////////
    // initialize map
    const map_options = {};
    displayClimateMonitoringMap('monthly', map_options, map);

    // display map when offcanvas hidden
    $('#map-control-offcanvas-dataselect').on('hidden.bs.offcanvas', () => {
        displayClimateMonitoringMap('monthly', map_options, map);
    });

    // 
    $('#map-control-redraw').on('click', () => {
        displayClimateMonitoringMap('monthly', map_options, map);
    });

    ////////////
    $('#input-time-navigation').on('blur', async () => {
        const ret = await setMapDatesNavInput('monthly');
        if (ret) {
            displayClimateMonitoringMap('monthly', map_options, map);
        }
    });

    $('#prev-time-navigation').on('click', async () => {
        const ret = await setMapDatesNavPrev('monthly');
        if (ret) {
            displayClimateMonitoringMap('monthly', map_options, map);
        }
    });

    $('#next-time-navigation').on('click', async () => {
        const ret = await setMapDatesNavNext('monthly');
        if (ret) {
            displayClimateMonitoringMap('monthly', map_options, map);
        }
    });

    ///////////
    // display preview time series on click on map, or select polygon
    mapClickLayersSpatialAverage(preview_monitoring_display_charts_1, 'monthly', map);

    $('#select-country-region').on('change', () => {
        mapClickLayersSpatialAverage(preview_monitoring_display_charts_1, 'monthly', map);
    });

    $('#select-region-name').on('change', () => {
        mapClickLayersSpatialAverage(preview_monitoring_display_charts_1, 'monthly', map);
    });
});