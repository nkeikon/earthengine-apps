// Took full advantage of examples provided by 
// Earth Engine (e.g. "Population Explorer").
// Minimum effort was made to change the appeareance. 

// Displays annual tree loss in protected areas
// Tree loss from Global Forest Chanage/Hansen data v1.6
var loss = ee.Image(
  'UMD/hansen/global_forest_change_2018_v1_6'
).select('lossyear');
var lossyear = loss.mask(loss);
var count = lossyear.eq([1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18
]).rename(['2001', '2002', '2003',
  '2004', '2005', '2006', '2007',
  '2008', '2009', '2010', '2011',
  '2012', '2013', '2014', '2015',
  '2016', '2017', '2018'
]);
var total = count.multiply(ee.Image
  .pixelArea()).divide(10000);

// Protected areaa from the World Database on Protected Areas (WDPA), WCMC
var protectedAreas = ee
  .FeatureCollection(
    'WCMC/WDPA/current/polygons')
  .filterMetadata('ORIG_NAME',
    'not_equals', 'Los Petenes');

/*
 * Visualization and styling
 */

// Constants used to visualize the data on the map
var LOSS_STYLE = {
  min: 1,
  max: 18,
  palette: ['red']
};

var PA_STYLE = {
  color: '26458d',
  fillColor: '00000000'
};
var HIGHLIGHT_STYLE = {
  color: '8856a7',
  fillColor: '8856a7C0'
};

// Configure our map with a minimal set of controls
Map.setControlVisibility(false);
Map.setControlVisibility({
  scaleControl: true,
  zoomControl: true
});
Map.style().set({
  cursor: 'crosshair'
});
Map.setCenter(100, 17, 6);

// Add our two base layers to the map: tree loss and protected areas
Map.addLayer(loss.mask(loss),
  LOSS_STYLE);
Map.addLayer(protectedAreas.style(
  PA_STYLE));

/*
 * The chart panel in the bottom-right
 */

// A list of points the user has clicked on, as [lon,lat] tuples
var selectedPoints = [];

// Returns the list of protected areas the user has selected
function getSelectedProtectedAreas() {
  return protectedAreas.filterBounds(ee
    .Geometry.MultiPoint(
      selectedPoints));
}

// Makes a bar chart of the given FeatureCollection of protected areas by name
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
    title: 'Tree loss (Deforestation) 2001-2018',
    vAxis: {
      title: 'hectare'
    },
    hAxis: {
      title: 'Year',
      minValue: 1
    },
    width: 1000,
    height: 300
  });
  chart.style().set({
    stretch: 'both'
  });
  return chart;
}

/*
// You can add a table of the given FeatureCollection of protected areas by name
// I disabled for now as they are redundant.
function makeResultsTable(protectedAreas) {
  var table = ui.Chart.image.regions({image:total,regions:protectedAreas,reducer:ee.Reducer.sum(),seriesProperty:'ORIG_NAME'});
  table.setChartType('Table');
  table.setOptions({allowHtml: true, pageSize: 5});
  table.style().set({stretch: 'both'});
  return table;
}
*/

// Updates the map overlay using the currently-selected protected area
function updateOverlay() {
  var overlay =
    getSelectedProtectedAreas().style(
      HIGHLIGHT_STYLE);
  Map.layers().set(2, ui.Map.Layer(
    overlay));
}

function updateChart() {
  var chartBuilder =
    chartTypeToggleButton.value;
  var chart = chartBuilder(
    getSelectedProtectedAreas());
  resultsPanel.clear().add(chart).add(
    buttonPanel);
}

// Clears the set of selected points and resets the overlay and results
// panel to their default state.
function clearResults() {
  selectedPoints = [];
  Map.layers().remove(Map.layers().get(
    2));
  var instructionsLabel = ui.Label(
    'Annual tree loss in protected areas'
  );
  resultsPanel.widgets().reset([
    instructionsLabel
  ]);
}

// Register a click handler for the map that adds the clicked point to the
// list and updates the map overlay and chart accordingly
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
    height: 'auto'
  });

var resultsPanel = ui.Panel({
  style: {
    position: 'bottom-right'
  }
});
Map.add(resultsPanel);
clearResults();

// Create an inspector panel with a horizontal layout
var inspector = ui.Panel({
  layout: ui.Panel.Layout.flow(
    'vertical')

});

// Add a label to the panel
inspector.add(ui.Label(
  'Click to select a protected area', {
    fontWeight: 'bold',
    fontSize: '20px'
  }));

// Add the panel to the default map
Map.add(inspector);

// Set the default map's cursor to a "crosshair"
Map.style().set('cursor', 'crosshair');
Map.setCenter(100, 17, 8);

// Register an onClick handler that populates and shows the inspector panel
Map.onClick(function(coords) {
  inspector.clear();
  inspector.style().set('shown',
    true);
  inspector.add(ui.Label(
    'Loading...', {
      color: 'gray'
    }));

  var point = ee.Geometry.Point(
    coords.lon, coords.lat);
  var PApoint = protectedAreas
    .filterBounds(point);
  var o_name = ee.List(PApoint
    .aggregate_array("NAME")).map(
    function(d) {
      return ee.String(d)
    });
  var status = ee.List(PApoint
      .aggregate_array("STATUS"))
    .map(function(d) {
      return ee.String(d)
    });
  var y_status = ee.List(PApoint
      .aggregate_array("STATUS_YR"))
    .map(function(d) {
      return ee.Number(d)
    });
  var type = ee.List(PApoint
      .aggregate_array("DESIG_ENG"))
    .map(function(d) {
      return ee.String(d)
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
        position: 'top-center'
      }
    }));

    // Add a button to hide the Panel
    inspector.add(ui.Button({
      label: 'Close',
      onClick: function() {
        inspector
          .style().set(
            'shown',
            false);
      }
    }));
  });
});

var add_legend = function(title, lbl,
  pal) {
  var legend = ui.Panel({
      style: {
        position: 'bottom-left'
      }
    }),
    entry;
  legend.add(ui.Label({
    value: title,
    style: {
      fontWeight: 'bold',
      fontSize: '18px',
      margin: '0 0 4px 0',
      padding: '0px'
    }
  }));
  for (var x = 0; x < lbl
    .length; x++) {
    entry = [ui.Label({
        style: {
          color: pal[x],
          margin: '0 0 4px 0'
        },
        value: '██'
      }),
      ui.Label({
        value: labels[x],
        style: {
          margin: '0 0 4px 4px'
        }
      })
    ];
    legend.add(ui.Panel(entry, ui
      .Panel.Layout.Flow(
        'horizontal')));
  }
  Map.add(legend);
};

var palette = ['red', '26458d'];
var labels = [
  'Tree loss/Deforestation (Global Forest Change v1.6)',
  'Protected areas (UNEP-WCMC)'
];
add_legend('', labels, palette);
