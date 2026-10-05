$(document).ready(function() {
    $('[data-bs-toggle="tooltip"]').tooltip();
    let map = createLeafletTileLayer('div-map-container', MTO_INIT);

    // offcanvas map controls
    setOffCanvasMapControlMonitoring('dekadal');

    ////////////
    // Modal Expand Charts
    $('.dekadal-raw-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#dekadal-raw-control')
    });
    $('#btn-div-chart-raw').on('click', () => {
        setAnalysisExpandModalRaw('dekadal', 'div-chart-raw');
    });

    //
    $('.dekadal-cumul-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#dekadal-cumul-control')
    });
    $('#btn-div-chart-cumul').on('click', () => {
        setAnalysisExpandModalCumul('dekadal', 'div-chart-cumul');
    });

    //
    $('.dekadal-anom-select2').select2({
        minimumResultsForSearch: -1,
        dropdownParent: $('#dekadal-anom-control')
    });
    $('#btn-div-chart-anom').on('click', () => {
        setAnalysisExpandModalAnom('dekadal', 'div-chart-anom');
    });

    ////////////
    // initialize map
    const map_options = {};
    displayClimateMonitoringMap('dekadal', map_options, map);

    // display map when offcanvas hidden
    $('#map-control-offcanvas-dataselect').on('hidden.bs.offcanvas', () => {
        displayClimateMonitoringMap('dekadal', map_options, map);
    });

    // 
    $('#map-control-redraw').on('click', () => {
        displayClimateMonitoringMap('dekadal', map_options, map);
    });

    ////////////
    $('#input-time-navigation').on('blur', async () => {
        const ret = await setMapDatesNavInput('dekadal');
        if (ret) {
            displayClimateMonitoringMap('dekadal', map_options, map);
        }
    });

    $('#prev-time-navigation').on('click', async () => {
        const ret = await setMapDatesNavPrev('dekadal');
        if (ret) {
            displayClimateMonitoringMap('dekadal', map_options, map);
        }
    });

    $('#next-time-navigation').on('click', async () => {
        const ret = await setMapDatesNavNext('dekadal');
        if (ret) {
            displayClimateMonitoringMap('dekadal', map_options, map);
        }
    });

    ///////////
    // display preview time series on click on map, or select polygon
    mapClickLayersSpatialAverage(preview_monitoring_display_charts, 'dekadal', map);

    $('#select-country-region').on('change', () => {
        mapClickLayersSpatialAverage(preview_monitoring_display_charts, 'dekadal', map);
    });

    $('#select-region-name').on('change', () => {
        mapClickLayersSpatialAverage(preview_monitoring_display_charts, 'dekadal', map);
    });
});