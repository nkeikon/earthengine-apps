/*
 * Displays annual tree loss in protected areas.
 * Tree loss from Global Forest Chanage/Hansen data v1.8.
 * Protected areas from the WDPA
 */
var loss = ee.Image("UMD/hansen/global_forest_change_2020_v1_8")
    .select('lossyear');
var lossyear = loss.selfMask();
var count = lossyear.eq([1, 2, 3, 4, 5,
    6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20
]).rename(['2001', '2002', '2003',
    '2004', '2005', '2006', '2007',
    '2008', '2009', '2010', '2011',
    '2012', '2013', '2014', '2015',
    '2016', '2017', '2018', '2019', '2020'
]);

var total = count.multiply(ee.Image
    .pixelArea()).divide(10000);

// Load the protected area layer from the World Database on Protected Areas (WDPA).
var protectedAreas = ee
    .FeatureCollection(
        'WCMC/WDPA/current/polygons');

var PA_outline = ee.Image().byte().paint({
    featureCollection: protectedAreas,
    color: 1,
    width: 3
});

/*
 * Visualization and styling
 */

var palette = ["ffffcc", "ffeda0", "fed976", "feb24c", "fd8d3c", "fc4e2a", "e31a1c", "bd0026", "800026"];

var LOSS_STYLE = {
    min: 1,
    max: 20,
    palette: palette,
    opacity: 0.5

};

var PA_STYLE = {
    color: 'FFFFFF',
    fillColor: 'FFFFFF'
};

var HIGHLIGHT_STYLE = {
    color: '#FF0000',
    fillColor: '#00000000',
};

// Configure our map with a minimal set of controls.
Map.setControlVisibility(false);
Map.setControlVisibility({
    scaleControl: true,
    zoomControl: true
});
Map.style().set({
    cursor: 'crosshair'
});
Map.setCenter(100, 17, 8);

// Add the loss layer. 
Map.addLayer(loss.mask(loss),
    LOSS_STYLE);

/*
 * The chart panel in the bottom-right
 */

// A list of points the user has clicked on, as [lon,lat] tuples.
var selectedPoints = [];

// Returns the list of protected areas the user has selected.
function getSelectedProtectedAreas() {
    return protectedAreas.filterBounds(ee
        .Geometry.MultiPoint(
            selectedPoints));
}

// Makes a bar chart of the given FeatureCollection of protected areas by name.
function makeResultsBarChart(
    protectedAreas) {
    var chart = ui.Chart.image.regions({
            image: total,
            regions: protectedAreas,
            reducer: ee.Reducer.sum(),
            scale: 30,
            seriesProperty: 'ORIG_NAME'
        })
        .setChartType('ColumnChart');
    chart.setOptions({
        title: 'Tree loss (Deforestation) 2001-2020',

        vAxis: {
            title: 'hectare'
        },
        hAxis: {
            title: 'Year',
            minValue: 1,
            textStyle: {
                fontSize: 9
            },
        },
        width: 1000,
        height: 300,
        fontName: 'google sans',
    });
    chart.style().set({
        stretch: 'both'
    });
    return chart;
}

/*
 * You can add a table of the given FeatureCollection of protected areas by name.
 * I disabled for now as they are redundant:

 function makeResultsTable(protectedAreas) {
  var table = ui.Chart.image.regions({image:total,regions:protectedAreas,reducer:ee.Reducer.sum(),seriesProperty:'ORIG_NAME'});
  table.setChartType('Table');
  table.setOptions({allowHtml: true, pageSize: 5});
  table.style().set({stretch: 'both'});
  return table;
}

*/

// Update the map overlay using the selected protected area.
function updateOverlay() {
    var overlay =
        getSelectedProtectedAreas()
    Map.layers().set(2, ui.Map.Layer(
        overlay.style(HIGHLIGHT_STYLE)));
}

function updateChart() {
    var chartBuilder =
        chartTypeToggleButton.value;
    var chart = chartBuilder(
        getSelectedProtectedAreas());
    resultsPanel.clear().add(chart).add(
        buttonPanel);
}

// Clear the selected polygon and reset the overlay and results panel to the default.
function clearResults() {
    selectedPoints = [];
    Map.layers().remove(Map.layers().get(
        2));
    resultsPanel.widgets().reset();
}

// Register a click handler for the map that adds the clicked polygon to the
// list and updates the map overlay and chart accordingly.
function handleMapClick(location) {
    selectedPoints.push([location.lon,
        location.lat
    ]);
    updateOverlay();
    updateChart();
}
Map.onClick(handleMapClick);

function ToggleButton(states, onClick) {
    var index = 0;
    var button = ui.Button(states[index]
        .label);
    button.value = states[index].value;
    button.onClick(function() {
        index = ++index % states.length;
        button.setLabel(states[index]
            .label);
        button.value = states[index]
            .value;
        onClick();
    });
    return button;
}

var chartTypeToggleButton =
    ToggleButton(
        [{
                label: 'Display results as a bar chart',
                value: makeResultsBarChart,
            },
            {
                //  label: 'Display results as a table',
                //  value: makeResultsTable,
            }
        ],
        updateChart);


var buttonPanel = ui.Panel(
    [ui.Button('Clear results',
        clearResults)],
    ui.Panel.Layout.Flow(
        'horizontal'), {
        margin: '0 0 0 auto',
        width: '600px',
        height: 'auto',
    });

var resultsPanel = ui.Panel({
    style: {
        position: 'bottom-right',
    }
});
Map.add(resultsPanel);
clearResults();

// Change the basemap.
var baseChange = [{
    featureType: 'all',
    stylers: [{
        saturation: 0
    }, {
        lightness: 0
    }, {
        invert_lightness: true
    }]

}];

// Set the default map's cursor to a "crosshair".
Map.style().set('cursor', 'crosshair');
Map.setOptions(null, {
    'Dark': baseChange
});
Map.addLayer(PA_outline, {
    palette: 'FFFFFF'
}, 'edges');

// Create an inspector panel with a horizontal layout.
var inspector = ui.Panel({
    layout: ui.Panel.Layout.flow(
        'vertical'),

});

// Create an inspector panel with a horizontal layout.	
var inspector = ui.Panel({layout: ui.Panel.Layout.flow('vertical'),
    style: {position: 'top-right'}});	
inspector.add(ui.Label('Protected Area Name, Type, Status, Year', 
{fontFamily:'google sans', fontSize: '16px'}));

// Add the panel to the default map	
Map.add(inspector);



// Register an onClick handler that populates and shows the inspector panel.
Map.onClick(function(coords) {
    inspector.clear();
    inspector.style().set('shown',
        true);
    inspector.add(ui.Label(
        'Loading...', {
            color: 'gray',
            fontFamily: 'google sans',
        }));

    var point = ee.Geometry.Point(
        coords.lon, coords.lat);
    var PApoint = protectedAreas
        .filterBounds(point);
    var o_name = ee.List(PApoint
        .aggregate_array("NAME")).map(
        function(d) {
            return ee.String(d);
        });
    var status = ee.List(PApoint
            .aggregate_array("STATUS"))
        .map(function(d) {
            return ee.String(d);
        });
    var y_status = ee.List(PApoint
            .aggregate_array("STATUS_YR"))
        .map(function(d) {
            return ee.Number(d);
        });
    var type = ee.List(PApoint
            .aggregate_array("DESIG_ENG"))
        .map(function(d) {
            return ee.String(d);
        });
    var list = ee.List([o_name, type,
        status, y_status
    ]);
    // Request the value from the server and use the results in a function
    list.evaluate(function(info) {
        inspector.clear();

        // Add a label with the results from the server
        inspector.add(ui.Label({
            value: info +
                ' (Name, Type, Status, Year)',
            style: {
                fontFamily: 'google sans',
            }
        }));

        // Add a button to hide the Panel
        inspector.add(ui.Button({
            label: 'Close',
            onClick: function() {
                inspector
                    .style({
                        fontFamily: 'google sans'
                    }).set(
                        'shown',
                        false);
            }
        }));
    });
});

// Add title.
var title = ui.Label(
    'Annual Tree Loss in Protected Areas', {
        fontFamily: 'google sans',
        fontSize: '18px',
        margin: '4px 8px',
    });

var instruction = ui.Label("Click 🔲 to select a protected area", {
    fontFamily: 'google sans',
    fontSize: '16px',
    margin: '4px 8px',
});

// Add more legends.

var colorbarOptions1 = {
    'min': '2001',
    'max': '2020',
    'palette': palette
};

// Creates a color bar thumbnail image for use in legend from the given color
// palette.

function makeColorBarParams(palette) {
    return {
        bbox: [0, 0, 1, 0.1],
        dimensions: '100x10',
        format: 'png',
        min: 0,
        max: 1,
        palette: palette,
    };
}

// Create the color bar for the legend.
var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(colorbarOptions1.palette),
    style: {
        stretch: 'horizontal',
        margin: '0px 8px',
        maxHeight: '24px',
        position: 'bottom-right',
    },
});

// Create a panel with min & max for the legend.
var legendLabels = ui.Panel({
    widgets: [
        ui.Label(colorbarOptions1.min, {
            margin: '4px 8px',
            fontFamily: 'google sans'
        }),
        ui.Label(
            (""), {
                margin: '4px 8px',
                textAlign: 'center',
                stretch: 'horizontal'
            }),
        ui.Label(colorbarOptions1.max, {
            margin: '4px 8px',
            fontFamily: 'google sans'
        }),

    ],

    layout: ui.Panel.Layout.flow('horizontal')
});

// Create a label and slider.
var slider = ui.Slider({
    style: {
        width: '380px',
        height: 'auto',
        padding: '10px',
        margin: '0px 8px',
        fontFamily: 'google sans'
    }
});

slider.setValue(0.5); // Set a default value.
slider.onChange(function(value) {
    Map.layers().get(0).setOpacity(value);
});

var label = ui.Label('Annual tree loss visibility (1=100%)', {
    fontFamily: 'google sans',
    margin: '24px 8px',
});

// citations and links
var hansen = ui.Label(
    'Hansen/UMD/Google/USGS/NASA', {
        fontFamily: 'google sans',
        margin: '4px 8px',
        fontSize: '10px',
    });

var wdpa = ui.Label("UNEP-WCMC and IUCN, Protected Planet: The World Database on Protected Areas (WDPA)", {
    fontFamily: 'google sans',
    fontSize: '10px',
    margin: '4px 8px',
    textAlign: 'left',
    stretch: 'horizontal'
});

var link = ui.Label('View Code in Github', {
    fontFamily: 'google sans',
    fontSize: '11px',
    margin: '4px 8px',
    textAlign: 'left',
    stretch: 'horizontal'
}, 'https://github.com/nkeikon/earthengine-apps/blob/master/ProtectedAreaLoss.js');

// Create a panel that contains both the slider and the label.
var panel = ui.Panel({
    widgets: [title, instruction, label, slider, colorBar, legendLabels],
    layout: ui.Panel.Layout.flow('vertical'),
    style: {
        position: 'bottom-left',
        width: '400px',
        padding: '7px',
        fontFamily: 'google sans'
    }
});

// Add the panel to the map.
Map.add(panel);
panel.add(hansen).add(wdpa).add(link);
