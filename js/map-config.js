'use strict'; // https://javascript.info/strict-mode for explanation

require([
    'esri/Map',
    'esri/Basemap',
    'esri/geometry/Point',
    'esri/views/MapView',
    'esri/widgets/Expand',
    'esri/widgets/ScaleBar',
    'esri/widgets/Slider',
    'esri/widgets/Home',
    'esri/layers/FeatureLayer',
    'esri/layers/ImageryLayer',
    'esri/layers/support/RasterFunction',
    'esri/layers/support/MosaicRule',
    'esri/layers/support/DimensionalDefinition',
    'esri/layers/support/LabelClass',
    'esri/core/watchUtils'
], function(Map,
    Basemap,
    Point,
    MapView,
    Expand,
    ScaleBar,
    Slider,
    Home,
    FeatureLayer,
    ImageryLayer,
    RasterFunction,
    MosaicRule,
    DimensionalDefinition,
    LabelClass,
    watchUtils) {

    // new basemap definition 
    const basemap = new Basemap({
        portalItem: {
            id: '54140d826fe34135abb3b60c157170dc' // os_open_greyscale_no_labels
        }
    });

    // create map
    const map = new Map({
        basemap: basemap,
        layers: []
    });

    // create 2D view for the Map
    const view = new MapView({
        container: 'mapDiv',
        map: map,
        center: new Point({ x: 260000, y: 785000, spatialReference: 27700 }), // reprojected to allow OS basemap
        zoom: 8,
        constraints: { // zoom constraints
            maxScale: 400000,
            minScale: 7000000
        }
    });

    // Raster function to reclassify pixels
    const remapRF = new RasterFunction({
        functionName: 'Remap',
        functionArguments: {
            inputRanges: [-10, -3, -3, -2.25, -2.25, -1.5, -1.5, -0.75, -0.75, 0, 0, 0.75, 0.75, 1.5, 1.5, 2.25, 2.25, 3, 3, 10],
            outputValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            raster: '$$'
        }
    });

    // Raster function to apply new colormap to reclassified pixels
    const colorRF = new RasterFunction({
        functionName: 'Colormap',
        functionArguments: {
            colormap: [
                [1, 103, 0, 31],
                [2, 178, 24, 43],
                [3, 214, 96, 77],
                [4, 244, 165, 130],
                [5, 243, 219, 199],
                [6, 209, 229, 240],
                [7, 146, 197, 222],
                [8, 67, 147, 195],
                [9, 33, 102, 172],
                [10, 5, 48, 97]
            ],
            // Setting the previous raster function to the Raster
            // property of a new raster function allows the function chain
            raster: remapRF
        },
        outputPixelType: 'U8'
    });

    // set initial FMA value
    const fmaDefinition = new DimensionalDefinition({
        variableName: 'Peat',
        dimensionName: 'FMA_num',
        values: [1],
        isSlice: true
    });

    // set initial year value
    const yearDefinition = new DimensionalDefinition({
        variableName: 'Peat',
        dimensionName: 'Year',
        values: [5],
        isSlice: true
    });

    // Create mosaicRule and set multidimensionalDefinition
    let mosaicRule = new MosaicRule({
        multidimensionalDefinition: [fmaDefinition, yearDefinition]
    });

    // create and add imagery layer to view
    const layer = new ImageryLayer({
        url: 'https://druid.hutton.ac.uk/arcgis/rest/services/wdlexp_netCDFs_2dims_fix/ImageServer',
        renderingRule: colorRF,
        mosaicRule: mosaicRule
    });
    map.add(layer, 0);

    // symbol for forestLayer 
    const forestSym = {
        type: 'simple-fill', //autocasts as new SimpleFillSymbol()
        color: [120, 162, 46, 1],
        style: 'solid',
        outline: {
            width: '0px'
        }
    };

    // create unique value renderers for 'existing forestry' of forestLayer
    const forestRenderer = {
        type: 'unique-value', //autocasts as new UniqueValueRenderer() -- but still throws error
        defaultSymbol: [],
        field: 'IFT_IOA',
        uniqueValueInfos: [{ // only show the existing forestry categories
            value: 'Broadleaved',
            symbol: forestSym
        }, {
            value: 'Conifer',
            symbol: forestSym
        }, {
            value: 'Coppice',
            symbol: forestSym
        }, {
            value: 'Coppice with standards',
            symbol: forestSym
        }, {
            value: 'Low density',
            symbol: forestSym
        }, {
            value: 'Mixed mainly broadleaved',
            symbol: forestSym
        }, {
            value: 'Mixed mainly conifer',
            symbol: forestSym
        }, {
            value: 'Shrub',
            symbol: forestSym
        }, {
            value: 'Young trees',
            symbol: forestSym
        }]
    };

    // create and add forest layer to view
    const forestLayer = new FeatureLayer({
        url: 'https://services2.arcgis.com/mHXjwgl3OARRqqD4/ArcGIS/rest/services/National_Forest_Inventory_Woodland_Scotland_2018/FeatureServer/0',
        renderer: forestRenderer
    });
    map.add(forestLayer, 1);

    // create renderer for conservancy layer 
    const conservancyRenderer = {
        type: 'simple',
        symbol: {
            type: 'simple-fill',
            color: [0, 0, 0, 0], // null
            outline: {
                color: 'black',
                width: .3
            }
        }
    };

    // create labels for conservancy layer
    const conservancyLabel = new LabelClass({
        labelExpressionInfo: {
            expression: '$feature.featname'
        },
        symbol: {
            type: 'text',
            color: 'black',
            font: { size: 11 },
            haloColor: 'white',
            haloSize: 1.2
        },
        maxScale: 0,
        minScale: 0

    });

    // create and add conservancy boundaries to view
    const conservancyLayer = new FeatureLayer({
        url: 'https://druid.hutton.ac.uk/arcgis/rest/services/ConservancyBoundaries/MapServer/0',
        renderer: conservancyRenderer,
        labelingInfo: [],
        minScale: 0,
        maxScale: 0
    });
    map.add(conservancyLayer, 2);

    const conservancyLabelLayer = new FeatureLayer({
        url: 'https://druid.hutton.ac.uk/arcgis/rest/services/ConservancyBoundaries/MapServer/1',
        labelingInfo: [conservancyLabel]
    });
    map.add(conservancyLabelLayer, 3);

    // add alert when zoom constraint is reached -- but only once!
    let executed = false;
    view.on('mouse-wheel', function(event) {
        if (!executed && view.zoom == 10) {
            alert('Nationwide Data: Scale is constrained to 1:500,000');
            executed = true;
        }
    });

    // changes label placement on zoom 
    watchUtils.watch(view, 'zoom', function(zoom) {
        if (zoom > 8) {
            conservancyLabelLayer.labelingInfo = [];
        } else
        if (zoom <= 8) {
            conservancyLabelLayer.labelingInfo = [conservancyLabel];
        }

    });

    // create and add fma slider to view
    const slider = new Slider({
        container: 'rangeSlider',
        min: 1,
        max: 11,
        values: [1],
        precision: 0,
        snapOnClickEnabled: true,
        visibleElements: {
            labels: false,
            rangeLabels: false
        },
        layout: 'vertical-reversed',
        tickConfigs: [{
            mode: 'count',
            values: 11,
            labelsVisible: true
        }],
        labelFormatFunction: function(value) { // customize fma labels
                if (value === 1) {
                    return 'Native Conifer';
                }
                if (value === 2) {
                    return 'Native Broadleaf';
                }
                if (value === 3) {
                    return 'Multi-Purpose Broadleaf';
                }
                if (value === 4) {
                    return 'Multi-Purpose Conifer';
                }
                if (value === 5) {
                    return 'Multi-Purpose Sitka Spruce';
                }
                if (value === 6) {
                    return 'Production Conifer';
                }
                if (value === 7) {
                    return 'Production Sitka Spruce';
                }
                if (value === 8) {
                    return 'Production Douglas Fir';
                }
                if (value === 9) {
                    return 'Short Rotation Aspen';
                }
                if (value === 10) {
                    return 'Short Rotation Rauli';
                }
                if (value === 11) {
                    return 'Short Rotation Eucalypt';
                }
            } // look into thumbCreatedFunction for tooltip here
    });

    // Load responsive (for rest see line ~470)
    const isResponsiveSize = view.widthBreakpoint === 'xsmall';

    // creat yearSlider  
    // if xsmall screen then make visibleElements.labels, rangeLabels = true, tickConfigs.labelsVisible = false 
    const yearSlider = new Slider({
        container: 'yearSlider',
        min: 5,
        max: 100,
        values: [5],
        precision: 5,
        snapOnClickEnabled: true,
        visibleElements: {
            labels: isResponsiveSize,
            rangeLabels: isResponsiveSize
        },
        steps: 5,
        tickConfigs: [{
            mode: 'count',
            values: 20,
            labelsVisible: !isResponsiveSize,
        }]
    });

    // option for adding changing charts in non-existent rightDiv -- for future iterations
    // set vars for the fma charts in rightDiv
    /* let fmaChart = document.getElementById('rightDivImg');
     const fma1Chart = 'img/fma1Chart.png';
     const fma2Chart = 'img/fma2Chart.png';
     const fma3Chart = 'img/fma3Chart.png';
     const fma4Chart = 'img/fma4Chart.png';
     fmaChart.src = fma1Chart;

     function updateChartImg() {
         switch (true) {
             case slider.get('values') == 1:
                 fmaChart.src = fma1Chart;
                 break;
             case slider.get('values') == 2:
                 fmaChart.src = fma2Chart;
                 break;
             default:
                 fmaChart.src = fma4Chart;
         }
     };*/

    // when the user changes the rangeSlider's value, change the FMA to reflect data and change chart in rightDiv
    slider.on(['thumb-change', 'thumb-drag'], function(event) {
        updateDimDef(event.value);
        // updateChartImg();
    });

    function updateDimDef(value) {
        const mosaicRuleClone = layer.mosaicRule.clone(); // makes clone of layer's mosaicRule
        const fmaVariable = mosaicRuleClone.multidimensionalDefinition[0];
        const yearVariable = mosaicRuleClone.multidimensionalDefinition[1];
        fmaVariable.values = [value];
        yearVariable.values = yearSlider.get('values');
        mosaicRuleClone.multidimensionalDefinition = [fmaVariable, yearVariable];
        layer.mosaicRule = mosaicRuleClone;
    };

    // when the user changes the yearSlider's value, change the year to reflect data
    yearSlider.on(['thumb-change', 'thumb-drag'], function(event) {
        stopAnimation();
        updateYearDef(event.value);
    });

    function updateYearDef(value) {
        const mosaicRuleClone = layer.mosaicRule.clone(); // makes clone of layer's mosaicRule
        const fmaVariable = mosaicRuleClone.multidimensionalDefinition[0];
        const yearVariable = mosaicRuleClone.multidimensionalDefinition[1];
        fmaVariable.values = slider.get('values');
        yearVariable.values = [value];
        mosaicRuleClone.multidimensionalDefinition = [fmaVariable, yearVariable];
        layer.mosaicRule = mosaicRuleClone;
    };

    // when the user changes the peatInput checkbox status, turn Peat on/off
    view.when(function() {
        document
            .getElementById('peatInput')
            .addEventListener('change', updatePeat);

        function updatePeat(event) {
            // Turn peat variable on and off
            const mosaicRuleClone = layer.mosaicRule.clone(); // makes clone of layer's mosaicRule
            const fmaVariable = mosaicRuleClone.multidimensionalDefinition[0];
            const yearVariable = mosaicRuleClone.multidimensionalDefinition[1];
            if (this.checked) {
                fmaVariable.variableName = 'Peat';
                yearVariable.variableName = 'Peat';
            } else {
                fmaVariable.variableName = 'NoPeat';
                yearVariable.variableName = 'NoPeat';
            }
            mosaicRuleClone.multidimensionalDefinition = [fmaVariable, yearVariable];
            layer.mosaicRule = mosaicRuleClone;
        }
    });

    // set vars for play button 
    const playButton = document.getElementById('playButton');
    let animation = null;

    // When user drags the slider:
    //  - stops the animation
    //  - set the visualized year to the slider.
    function inputHandler(event) {
        stopAnimation();
        updateYearDef(event.value);
    };

    // Toggle animation on/off when user
    // clicks on the play button
    playButton.addEventListener('click', function() {
        if (playButton.classList.contains('toggled')) {
            stopAnimation();
        } else {
            startAnimation();
        }
    });
    let timerId = 0;

    // Starts the animation that cycle through the years
    function startAnimation() {
        stopAnimation();
        timerId = setInterval(() => {
            let year = yearSlider.values[0];
            year += 5;
            if (year > yearSlider.max) {
                year = yearSlider.min;
            }
            yearSlider.values = [year];
            updateYearDef(year);
        }, 1000)
        playButton.classList.add('toggled');
    };

    // Stops the animation
    function stopAnimation() {
        if (!timerId) {
            return;
        }
        clearTimeout(timerId);
        timerId = 0;
        playButton.classList.remove('toggled');
    };

    // modal 'About' box in wholeLeftDiv
    const modalBtn = document.getElementById('modal-btn');
    const modal = document.querySelector('.modal');
    const closeBtn = document.querySelector('.close-btn');
    modalBtn.onclick = function() {
        modal.style.display = 'flex';
    };
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    window.onclick = function(e) {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    };

    // modal withIN modal 'graphical abstract' 
    const abstractModalBtn = document.getElementById('abstractButton');
    const abstractModal = document.querySelector('.abstractModal');
    const abstractCloseBtn = document.querySelector('.abstractCloseBtn');
    abstractModalBtn.onclick = function() {
        abstractModal.style.display = 'flex';
    };
    abstractCloseBtn.onclick = function() {
        abstractModal.style.display = 'none';
    };
    // window.onclick = function(e) {
    //     if (e.target == abstractModal) {
    //         abstractModal.style.display = 'none';
    //     }
    // };

    // moves the zoom widget to other corner
    view.ui.move('zoom', 'bottom-right');

    // create  and add scale bar to view
    const scaleBar = new ScaleBar({
        view: view,
        unit: 'dual' // The scale bar displays both metric and non-metric units.
    });
    view.ui.add(scaleBar, 'bottom-right');

    // create and add home button to view 
    const home = new Home({
        view: view
    });
    view.ui.add(home, 'bottom-right');

    // Mobile
    const leftDiv = document.getElementById('leftDiv');
    const leftDiv2 = document.getElementById('leftDiv2');
    const leftDivExpand = new Expand({
        view: view,
        content: leftDiv,
        group: 'top-left'
    });

    const leftDiv2Expand = new Expand({
        view: view,
        content: leftDiv2,
        expandIconClass: 'esri-icon-layers',
        group: 'top-left'
    });

    const leftDiv3Expand = new Expand({
        view: view,
        content: document.getElementById('modal-elements'),
        expandIconClass: 'esri-icon-description',
        group: 'top-left'
    });

    // Breakpoints for mobile
    view.watch('widthBreakpoint', 'heightBreakpoint', function(breakpoint) {
        switch (breakpoint) {
            case 'xsmall':
                updateView(true);
                break;
            case 'small':
                updateView(true);
                break;
            case 'medium':
            case 'large':
            case 'xlarge':
                updateView(false);
                break;
            default:
        }
    });

    function updateView(isMobile) {
        if (isMobile) {
            view.ui.add([leftDiv3Expand, leftDivExpand, leftDiv2Expand], 'top-left');
            modal.style.display = 'none';
            view.ui.add(scaleBar, 'bottom-left');
            conservancyLayer.labelingInfo = [conservancyLabel];
            conservancyLabelLayer.labelingInfo = [];
        } else {
            leftDivExpand.destroy();
            leftDiv2Expand.destroy();
            leftDiv3Expand.destroy();
            modal.style.display = 'flex'; // auto opens modal 'About' box
        };
    };
    const bottomDiv = document.getElementById('bottomDiv');

    updateView(isResponsiveSize);
});