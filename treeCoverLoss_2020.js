/*************************************************
 * This code is licensed under the CC BY-NC-SA 4.0 *
 *   Creative Commons Attribution-NonCommercial-  *
 *   ShareAlike 4.0 International License.       *
 *                                               *
 *                                               *
 * Any inquiries can be directed to              *
 * the original author at nkeiko.n@gmail.com     *
 *************************************************/

var treeCover = ee.ImageCollection('JRC/GFC2020/V1').mosaic();
var loss = ee.Image("UMD/hansen/global_forest_change_2023_v1_11").select('lossyear');
var loss_2021 = loss.updateMask(loss.gte(21)).updateMask(treeCover.gt(0));
var palm = ee.ImageCollection("BIOPAMA/GlobalOilPalm/v1");

var drawingTools = Map.drawingTools();
drawingTools.setShown(false);
while (drawingTools.layers().length() > 0) {
    var layer = drawingTools.layers().get(0);
    drawingTools.layers().remove(layer);
}
var dummyGeometry =
    ui.Map.GeometryLayer({
        geometries: null,
        name: 'geometry',
        color: '23cba7'
    });
drawingTools.layers().add(dummyGeometry);

function clearGeometry() {
    var layers = drawingTools.layers();
    layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}

function drawRectangle() {
    clearGeometry();
    drawingTools.setShape('rectangle');
    drawingTools.draw();
}

function drawPolygon() {
    clearGeometry();
    drawingTools.setShape('polygon');
    drawingTools.draw();
}
var chartPanel = ui.Panel({
    style: {
        height: '350',
        width: '400px',
        position: 'bottom-right',
        shown: false,
    }
});
Map.add(chartPanel);

var areaClass = loss_2021.eq([21, 22, 23]).rename(['2021', '2022', '2023']);
var areaEstimate = areaClass.multiply(ee.Image.pixelArea()).divide(10000);
var back_c = '#4f4f4f';
var font_c = 'white';

var chartOptions = {
    // explorer: {},
    chartArea: {
        backgroundColor: back_c,
        color: font_c,
        fontFamily: 'google sans'
    },
    backgroundColor: back_c,
    color: font_c,
    titleTextStyle: {
        italic: false,
        bold: true,
        color: font_c
    },
    title: 'Tree loss area by year (ha)',
    vAxis: {
        textStyle: {
            color: font_c
        }
    },
    hAxis: {
        title: 'Year',
        gridlines: {
            count: 7
        },
        textStyle: {
            color: font_c
        },
        titleTextStyle: {
            color: font_c
        }
    },
    series: {
        0: {
            color: '#22ff72',
        },
    },
    legend: {
        textStyle: {
            color: font_c
        }
    },
    width: 400,
    height: 300,
    fontName: 'google sans'
};

function chartAreaByClass() {
    // Make the chart panel visible the first time a geometry is drawn.
    if (!chartPanel.style().get('shown')) {
        chartPanel.style().set('shown', true);
    }
    // Get the drawn geometry; it will define the reduction region.
    var aoi = drawingTools.layers().get(0).getEeObject();
    // Set the drawing mode back to null; turns drawing off.
    drawingTools.setShape(null);
    // Reduction scale is based on map scale to avoid memory/timeout errors.
    var mapScale = Map.getScale();
    var scale = mapScale > 5000 ? mapScale * 2 : 5000;

    var chart = ui.Chart.image
        .regions({
            image: areaEstimate,
            regions: aoi,
            reducer: ee.Reducer.sum(),
            scale: 30,
        })
        .setSeriesNames(['Area'])
        .setChartType('ColumnChart')
        .setOptions(chartOptions);
    // Replace the existing chart in the chart panel with the new chart.
    chartPanel.widgets().reset([chart]);
}

drawingTools.onDraw(ui.util.debounce(chartAreaByClass, 500));
drawingTools.onEdit(ui.util.debounce(chartAreaByClass, 500));
var symbol = {
    rectangle: '⬛',
    polygon: '🔺',
};
var controlPanel = ui.Panel({
    widgets: [
        ui.Label({
            value: '1. Select a drawing mode.',
            style: {
                fontFamily: 'google sans'
            }
        }),
        ui.Button({
            label: symbol.rectangle + ' Rectangle',
            onClick: drawRectangle,
            style: {
                stretch: 'horizontal',
                fontFamily: 'google sans'
            }
        }),
        ui.Button({
            label: symbol.polygon + ' Polygon',
            onClick: drawPolygon,
            style: {
                stretch: 'horizontal',
                fontFamily: 'google sans'
            }
        }),
        ui.Label({
            value: '2. Draw a geometry.',
            style: {
                fontFamily: 'google sans'
            }
        }),
        ui.Label({
            value: '3. Wait for chart to render.',
            style: {
                fontFamily: 'google sans'
            }
        }),
        ui.Label({
            value: '4. Repeat 1-3 or edit/move geometry.',
            style: {
                fontFamily: 'google sans'
            }
        })
    ],
    style: {
        position: 'top-left'
    },
    layout: null,
});

Map.add(controlPanel);

var visualization = {
    bands: ['Map'],
    palette: ['#22ff72'],
    opacity: 0.5
};

Map.addLayer(treeCover, visualization, 'EC JRC Global forest cover 2020 – V1');
Map.addLayer(loss_2021.selfMask(), {
    palette: 'red',
    opacity: 0.5
});
Map.addLayer(palm.mosaic().updateMask(palm.mosaic().lt(3)), {
    palette: ['yellow'],
    min: 1,
    max: 2,
    opacity: 0.5
});
var DARK = [{

        "elementType": "geometry",

        "stylers": [{

            "color": "#212121"

        }]

    },

    {
        featureType: 'landscape.natural.terrain',
        elementType: 'geometry',
        stylers: [{
            color: 'ffffff'
        }, {
            weight: 10
        }]
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{
            color: '#7b7b7b'
        }, {
            weight: 0.5
        }]
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{
            color: 'ffffff'
        }, {
            weight: 0.5
        }]
    },
    {
        featureType: 'road.local',
        elementType: 'geometry',
        stylers: [{
            color: 'ffffff'
        }, {
            weight: 0.2
        }]
    },

    {

        "elementType": "labels.icon",

        "stylers": [{

            "visibility": "on"

        }]

    },

    {

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#757575"

        }]

    },

    {

        "elementType": "labels.text.stroke",

        "stylers": [{

            "color": "#212121"

        }]

    },

    {

        "featureType": "administrative",

        "elementType": "geometry",

        "stylers": [{

            "color": "#757575"

        }]

    },

    {

        "featureType": "administrative.country",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#9e9e9e"

        }]

    },

    {

        "featureType": "administrative.land_parcel",

        "stylers": [{

            "visibility": "on"

        }]

    },

    {

        "featureType": "administrative.locality",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#bdbdbd"

        }]

    },

    {

        "featureType": "poi",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#757575"

        }]

    },

    {

        "featureType": "poi.park",

        "elementType": "geometry",

        "stylers": [{

            "color": "#181818"

        }]

    },

    {

        "featureType": "poi.park",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#616161"

        }]

    },

    {

        "featureType": "poi.park",

        "elementType": "labels.text.stroke",

        "stylers": [{

            "color": "#1b1b1b"

        }]

    },

    {

        "featureType": "road",

        "elementType": "geometry.fill",

        "stylers": [{

            "color": "#2c2c2c"

        }]

    },

    {

        "featureType": "road",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#8a8a8a"

        }]

    },

    {

        "featureType": "road.arterial",

        "elementType": "geometry",

        "stylers": [{

            "color": "#373737"

        }]

    },

    {

        "featureType": "road.highway",

        "elementType": "geometry",

        "stylers": [{

            "color": "#3c3c3c"

        }]

    },

    {

        "featureType": "road.highway.controlled_access",

        "elementType": "geometry",

        "stylers": [{

            "color": "#4e4e4e"

        }]

    },

    {

        "featureType": "road.local",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#616161"

        }]

    },

    {

        "featureType": "transit",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#757575"

        }]

    },

    {

        "featureType": "water",

        "elementType": "geometry",

        "stylers": [{

            "color": "#000000"

        }]

    },

    {

        "featureType": "water",

        "elementType": "labels.text.fill",

        "stylers": [{

            "color": "#3d3d3d"

        }, ]

    }

];



Map.setOptions('Dark', {
    'Dark': DARK
});

// Create the legend
var legend = ui.Panel({
    style: {
        position: 'bottom-left',
        padding: '8px 15px',
        backgroundColor: back_c,
        color: font_c
    }
});

// Create green square for tree label
var treeLabel = ui.Label({
    value: 'Forest Cover (EC JRC global map of forest cover 2020, V1)',
    style: {
        fontFamily: 'Google Sans',
        fontSize: '12px',
        margin: '0 10px 0 0',
        padding: '0',
        backgroundColor: back_c,
        color: font_c
    }
});
var treeColor = ui.Panel({
    style: {
        backgroundColor: 'green',
        padding: '8px',
        margin: '0 10px 0 0'
    }
});

// Create red square for loss label
var lossLabel = ui.Label({
    value: 'Tree Loss (Hansen Global Forest Change v1.11)',
    style: {
        fontFamily: 'Google Sans',
        fontSize: '12px',
        margin: '0 10px 0 0',
        padding: '0',
        backgroundColor: back_c,
        color: font_c

    }
});
var lossColor = ui.Panel({
    style: {
        backgroundColor: 'red',
        padding: '8px',
        margin: '0 10px 0 0'
    }
});

var palmLabel = ui.Label({
    value: 'Palm Oil Plantation 2019 (Descals et al., 2021)',
    style: {
        fontFamily: 'Google Sans',
        fontSize: '12px',
        margin: '0 10px 0 0',
        padding: '0',
        backgroundColor: back_c,
        color: font_c
    }
});
var palmColor = ui.Panel({
    style: {
        backgroundColor: 'yellow',
        padding: '8px',
        margin: '0 10px 0 0'
    }
});

// Add labels and colors to legend
var treePanel = ui.Panel({
    widgets: [treeColor, treeLabel],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {
        backgroundColor: back_c,
        color: font_c
    }
});
var lossPanel = ui.Panel({
    widgets: [lossColor, lossLabel],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {
        backgroundColor: back_c,
        color: font_c
    }
});
var palmPanel = ui.Panel({
    widgets: [palmColor, palmLabel],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {
        backgroundColor: back_c,
        color: font_c
    }
});
legend.add(treePanel);
legend.add(ui.Panel({
    style: {
        height: '5px',
        backgroundColor: back_c,
        color: font_c
    }
})); // Add space between lines
legend.add(lossPanel);
legend.add(ui.Panel({
    style: {
        height: '5px',
        backgroundColor: back_c,
        color: font_c
    }
})); // Add space between lines
legend.add(palmPanel);

// Add legend to the Map
Map.add(legend);
