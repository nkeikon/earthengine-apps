/*************************************************
 * This code is licensed under the CC BY-NC-SA 4.0 *
 *   Creative Commons Attribution-NonCommercial-  *
 *   ShareAlike 4.0 International License.       *
 *                                               *
 *                                               *
 * Any inquiries can be directed to              *
 * the original author at nkeiko.n@gmail.com     *
 *************************************************/

ee.data.setWorkloadTag('eu_defor_app');

var geometry = 
    /* color: #23cba7 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[100.7072265625, 22.83540592125073],
          [100.7072265625, 22.022996561477584],
          [101.5861328125, 22.022996561477584],
          [101.5861328125, 22.83540592125073]]], null, false);
          
// datasets (note that the spatial resolutions vary)
var treeCover = ee.ImageCollection("JRC/GFC2020/V2").mosaic();
treeCover = treeCover.setDefaultProjection({
  crs:'EPSG:4326',
  scale:10
});
var loss = ee.Image("UMD/hansen/global_forest_change_2023_v1_11").select('lossyear');
var loss_2021 = loss.updateMask(loss.gte(21)).updateMask(treeCover.gt(0));
var palm = ee.ImageCollection("BIOPAMA/GlobalOilPalm/v1");

// functions
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

var back_c = '#4f4f4f';
var font_c = 'white';

var chartPanel = ui.Panel({
    style: {
        // height: '350px',
        // width: '400px',
        position: 'bottom-right',
        // margin: '0 0 0 0',
        fontSize:'15px',
        backgroundColor:back_c,
        shown: false,
    }
});

Map.add(chartPanel);

// calculate the loss in the selected area    
var areaClass = loss_2021.eq([21, 22, 23]).rename(['2021', '2022', '2023']);
var areaEstimate = areaClass.multiply(ee.Image.pixelArea()).divide(10000);

// chart
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
        color: font_c,
        fontFamily:'Google Sans',
    },
    title: 'Annual Tree Loss',
    vAxis: {
      title:'Hectare',
      textStyle: {
            color: font_c,
            fontFamily:'Google Sans'
        },        
      titleTextStyle: {
            color: font_c
        }
    },
    hAxis: {
        title: 'Year',
        gridlines: {
            count: 7
        },
        textStyle: {
            color: font_c,
            fontFamily:'Google Sans'
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
    height: 350,
    fontName: 'google sans',
    fontSize:16,

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
            value: '4. Clear the result',
            style: {
                fontFamily: 'google sans'
            }
        }),
        ui.Button({
            label: 'Clear',
            onClick: function() {
                clearGeometry();
                chartPanel.clear();
            },
                    style: {
                        stretch: 'horizontal',
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

Map.addLayer(treeCover, visualization, 'EC JRC Global forest cover 2020 – V2');
Map.addLayer(loss_2021.selfMask(), {
    palette: 'red',
    opacity: 0.5
},'Tree Loss');
Map.addLayer(palm.mosaic().updateMask(palm.mosaic().lt(3)), {
    palette: ['yellow'],
    min: 1,
    max: 2,
    opacity: 0.5
},'Palm Oil Plantation');

var slider = ui.Slider({
    style: {
        width: '300px',
        height: 'auto',
        // padding: '10px',
        margin: '0px 25px',
        fontFamily: 'google sans',
        backgroundColor: back_c,
        fontSize:'12px',
        color: font_c

    }
});

slider.setValue(1); // Set a default value.
slider.onChange(function(value) {
    Map.layers().get(0).setOpacity(value);
});

var label = ui.Label('Visibility Setting (1=100%)', {
        fontFamily: 'Google Sans',
        fontSize: '12px',
        margin: '0px 25px',
        padding: '0',
        backgroundColor: back_c,
        color: font_c
});

var panel = ui.Panel({
    widgets: [label, slider],
    layout: ui.Panel.Layout.flow('vertical'),
    style: {
        fontFamily: 'Google Sans',
        fontSize: '12px',
        margin: '0 10px 0 0',
        padding: '0',
        backgroundColor: back_c,
        color: font_c
    }
});
// Map.add(panel);
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
    value: '2020 Forest Cover (EC JRC global map of forest cover 2020, V2)',
    style: {
        fontFamily: 'Google Sans',
        fontSize: '15px',
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
    value: 'Tree Loss 2021-2023 (Hansen Global Forest Change v1.11)',
    style: {
        fontFamily: 'Google Sans',
        fontSize: '15px',
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
        fontSize: '15px',
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

var disclaimer = ui.Label(
      'Disclaimer: This app and its data are provided for informational purposes only.\nThe developer shall not be liable for any damages or losses arising from their use.', {
        whiteSpace: 'pre',
    fontFamily: 'Google Sans',
    fontSize: '12px',
    margin: '0 10px 0 0',
    padding: '0',
    backgroundColor: back_c,
    color: font_c
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
var disclaimerPanel = ui.Panel({
    widgets: [disclaimer],
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
legend.add(panel);
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
legend.add(ui.Panel({
    style: {
        height: '10px',
        backgroundColor: back_c,
        color: font_c
    }
})); // Add space between lines
legend.add(disclaimerPanel);
// Add legend to the Map
Map.add(legend);

var DARK = [{
    elementType: 'geometry', stylers: [{ color: '#212121' }]
  }, {
    featureType: 'landscape.natural.terrain', elementType: 'geometry',
    stylers: [{ color: 'ffffff' }, { weight: 10 }]
  }, {
    featureType: 'road.highway', elementType: 'geometry.stroke',
    stylers: [{ color: '#7b7b7b' }, { weight: 0.5 }]
  }, {
    featureType: 'road.arterial', elementType: 'geometry',
    stylers: [{ color: 'ffffff' }, { weight: 0.5 }]
  }, {
    featureType: 'road.local', elementType: 'geometry',
    stylers: [{ color: 'ffffff' }, { weight: 0.2 }]
  }, {
    elementType: 'labels.icon', stylers: [{ visibility: 'on' }]
  }, {
    elementType: 'labels.text.fill', stylers: [{ color: '#757575' }]
  }, {
    elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }]
  }, {
    featureType: 'administrative', elementType: 'geometry',
    stylers: [{ color: '#757575' }]
  }, {
    featureType: 'administrative.country', elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }]
  }, {
    featureType: 'administrative.land_parcel', stylers: [{ visibility: 'on' }]
  }, {
    featureType: 'administrative.locality', elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }]
  }, {
    featureType: 'poi', elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }]
  }, {
    featureType: 'poi.park', elementType: 'geometry',
    stylers: [{ color: '#181818' }]
  }, {
    featureType: 'poi.park', elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }]
  }, {
    featureType: 'poi.park', elementType: 'labels.text.stroke',
    stylers: [{ color: '#1b1b1b' }]
  }, {
    featureType: 'road', elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }]
  }, {
    featureType: 'road', elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }]
  }, {
    featureType: 'road.arterial', elementType: 'geometry',
    stylers: [{ color: '#373737' }]
  }, {
    featureType: 'road.highway', elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }]
  }, {
    featureType: 'road.highway.controlled_access', elementType: 'geometry',
    stylers: [{ color: '#4e4e4e' }]
  }, {
    featureType: 'road.local', elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }]
  }, {
    featureType: 'transit', elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }]
  }, {
    featureType: 'water', elementType: 'geometry',
    stylers: [{ color: '#000000' }]
  }, {
    featureType: 'water', elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }]
  }];

Map.setOptions('Dark Theme',{'Dark Theme': DARK});


Map.setControlVisibility({
  zoomControl: true, scaleControl: true, layerList: false, mapTypeControl: true, fullscreenControl: true, drawingToolsControl: false}
  );

Map.setCenter(114.55, 8.84, 5);
