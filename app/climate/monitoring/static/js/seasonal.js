$(document).ready(function() {
    $('[data-bs-toggle="tooltip"]').tooltip();
    let map = createLeafletTileLayer('div-map-container', MTO_INIT);

    // offcanvas map controls
    setOffCanvasMapControlMonitoring('seasonal');

    ////////////
    // Modal Expand Charts

    $('.seasonal-raw-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#seasonal-raw-control')
    });
    $('#btn-div-chart-raw').on('click', () => {
        setAnalysisExpandModalRaw('seasonal', 'div-chart-raw');
    });

    $('.seasonal-anom-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#seasonal-anom-control')
    });
    $('#btn-div-chart-anom').on('click', () => {
        setAnalysisExpandModalAnom('seasonal', 'div-chart-anom');
    });

    ////////////
    // initialize map
    const map_options = {};
    displayClimateMonitoringMap('seasonal', map_options, map);

    // display map when offcanvas hidden
    $('#map-control-offcanvas-dataselect').on('hidden.bs.offcanvas', () => {
        displayClimateMonitoringMap('seasonal', map_options, map);
    });

    // 
    $('#map-control-redraw').on('click', () => {
        displayClimateMonitoringMap('seasonal', map_options, map);
    });

    ////////////
    $('#input-time-navigation').on('blur', async () => {
        const ret = await setMapDatesNavInput('seasonal');
        if (ret) {
            displayClimateMonitoringMap('seasonal', map_options, map);
        }
    });

    $('#prev-time-navigation').on('click', async () => {
        const ret = await setMapDatesNavPrev('seasonal');
        if (ret) {
            displayClimateMonitoringMap('seasonal', map_options, map);
        }
    });

    $('#next-time-navigation').on('click', async () => {
        const ret = await setMapDatesNavNext('seasonal');
        if (ret) {
            displayClimateMonitoringMap('seasonal', map_options, map);
        }
    });

    ///////////
    // display preview time series on click on map, or select polygon
    mapClickLayersSpatialAverage(preview_monitoring_display_charts_1, 'seasonal', map);

    $('#select-country-region').on('change', () => {
        mapClickLayersSpatialAverage(preview_monitoring_display_charts_1, 'seasonal', map);
    });

    $('#select-region-name').on('change', () => {
        mapClickLayersSpatialAverage(preview_monitoring_display_charts_1, 'seasonal', map);
    });
});