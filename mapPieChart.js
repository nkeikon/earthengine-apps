/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var area1 = ee.Image("users/nkeikon/myanmar_sr/area1_map"),
    area2 = ee.Image("users/nkeikon/myanmar_sr/area2_map"),
    roi = ee.FeatureCollection("users/nkeikon/myanmar_sr/TNI"),
    geometry = 
    /* color: #23cba7 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[98.69091210362372, 12.681368655863519],
          [98.69091210362372, 12.624086160838413],
          [98.74138054844794, 12.624086160838413],
          [98.74138054844794, 12.681368655863519]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
Map.setOptions('SATELLITE');
Map.centerObject(roi, 12);
var total = ee.ImageCollection([area1, area2]).mosaic();
var palette = ['ff0000', // palm  (red)
  '9933ff', //rubber  (purple)
  '008000', //other trees  (green)
  'lime', //shrub (lime)
  'yellow', //bare (yellow)
  '0000ff', //river (blue)
];
var viz = {
  min: 1,
  max: 6,
  palette: palette
};
var MAIN = 'Default map';
var OILPALM = 'Oil palm only';
var RUBBER = 'Rubber only';
var OILPALM_RUBBER = 'Oil palm and rubber';
var mainVis = total.visualize(viz);
var oilpalmVis = total.eq(1).selfMask().visualize({
  palette: 'red'
});
var rubberVis = total.eq(2).selfMask().visualize({
  palette: 'purple'
});
var oilpalm_rubberVis = oilpalmVis.blend(rubberVis);
// Create a label and pull-down menu.
var label = ui.Label('Select to show', TITLE_STYLE);
var select = ui.Select({
  items: [MAIN, OILPALM, RUBBER, OILPALM_RUBBER],
  value: MAIN,
  onChange: redraw,
  style: {
    stretch: 'horizontal'
  }
});
// Create a panel that contains both the pull-down menu and the label.
var panel = ui.Panel({
  widgets: [label, select],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    position: 'top-center',
    width: '300px',
    padding: '10px'
  }
});
// Add the panel to the map.
Map.add(panel);
// Create a function to render a map layer configured by the user inputs.
function redraw() {
  Map.layers().reset();
  var layer = select.getValue();
  var image;
  if (layer == MAIN) {
    image = mainVis;
  } else if (layer == OILPALM) {
    image = oilpalmVis;
  } else if (layer == RUBBER) {
    image = rubberVis;
  } else if (layer == OILPALM_RUBBER) {
    image = oilpalm_rubberVis;
  }
  Map.addLayer(image, {}, layer);
}
// Invoke the redraw function once at start up to initialize the map.
redraw();
// Create a legend.
var labels = ['Oil palm', 'Rubber', 'Other trees', 'Shrub', 'Bare', 'Water'];
var add_legend = function(title, lbl, pal) {
  var legend = ui.Panel({
      style: {
        position: 'bottom-left'
      }
    }),
    entry;
  legend.add(ui.Label({
    style: {
      fontWeight: 'bold',
      fontSize: '15px',
      margin: '1px 1px 4px 1px',
      padding: '2px'
    }
  }));
  for (var x = 0; x < lbl.length; x++) {
    entry = [ui.Label({
        style: {
          color: pal[x],
          border: '1px solid black',
          margin: '1px 1px 4px 1px'
        },
        value: '██'
      }),
      ui.Label({
        value: labels[x],
        style: {
          margin: '1px 1px 4px 4px'
        }
      })
    ];
    legend.add(ui.Panel(entry, ui.Panel.Layout.Flow('horizontal')));
  }
  Map.add(legend);
};
add_legend('Legend', labels, palette);
// Styling for the title and footnotes.
var TITLE_STYLE = {
  fontSize: '22px',
  fontWeight: 'bold',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '6px',
};
var TEXT_STYLE = {
  fontSize: '15px',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '6px',
};
Map.add(ui.Panel(
  [
    ui.Label('Oil palm and rubber plantations in Tanintharyi, Myanmar',
      TITLE_STYLE),
    ui.Label(
      'Nomura, K., Mitchard, E. T., Patenaude, G., Bastide, J., Oswald, P., & Nwe, T. (2019). Oil palm concessions in southern Myanmar consist mostly of unconverted forest. Scientific reports, 9(1), 1-9.',
      TEXT_STYLE),
  ],
  ui.Panel.Layout.flow('vertical'), {
    width: '350px',
    position: 'top-right'
  }));

// Add drawing tool
// https://developers.google.com/earth-engine/tutorials/community/drawing-tools-region-reduction

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
    height: '300px',
    width: '750px',
    position: 'bottom-right',
    shown: false
  }
});
Map.add(chartPanel);
var areaClass = total.eq([1, 2, 3, 4, 5, 6]).rename(labels);
var areaEstimate = areaClass.multiply(ee.Image.pixelArea()).divide(10000);
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
    
  // The original tutorial charts NDVI time series.
  // Here, I created a chart showing area size by class for the polygon.
    
  var chart = ui.Chart.image
    .regions({
      image: areaEstimate,
      regions: aoi,
      reducer: ee.Reducer.sum(),
      scale: 20,
    })
    .setChartType('PieChart').setOptions({
      width: 250,
      height: 350,
      title: 'Area by class (ha)',
      is3D: true,
      colors: ['#e0440e', '#e6693e', '#ec8f6e', '#f3b49f', '#f6c7b6',
        '#ffffcc'
      ],
    });
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
    ui.Label('1. Select a drawing mode.'),
    ui.Button({
      label: symbol.rectangle + ' Rectangle',
      onClick: drawRectangle,
      style: {
        stretch: 'horizontal'
      }
    }),
    ui.Button({
      label: symbol.polygon + ' Polygon',
      onClick: drawPolygon,
      style: {
        stretch: 'horizontal'
      }
    }),
    ui.Label('2. Draw a geometry.'),
    ui.Label('3. Wait for chart to render.'),
    ui.Label(
      '4. Repeat 1-3 or edit/move\ngeometry for a new chart.', {
        whiteSpace: 'pre'
      })
  ],
  style: {
    position: 'top-left'
  },
  layout: null,
});
Map.add(controlPanel);
