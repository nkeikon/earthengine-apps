/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var area1 = ee.Image("users/nkeikon/myanmar_sr/area1_map"),
    area2 = ee.Image("users/nkeikon/myanmar_sr/area2_map"),
    tanintharyi = ee.FeatureCollection("users/nkeikon/myanmar_sr/TNI");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
Map.setOptions('SATELLITE');
Map.centerObject(tanintharyi,10);
var total = ee.ImageCollection([area1,area2]).mosaic();
var palette =['ff0000',// palm  (red)
              '9933ff',//rubber  (purple)
              '008000',//other trees  (green)
              'lime',//shrub (lime)
              'yellow',//bare (yellow)
              '0000ff',//river (blue)
];
var viz = {min:1,max:6,palette:palette};
var MAIN = 'Default map';
var OILPALM = 'Oil palm only';
var RUBBER = 'Rubber only';
var OILPALM_RUBBER = 'Oil palm and rubber';
var mainVis = total.visualize(viz);
var oilpalmVis = total.eq(1).selfMask().visualize({palette:'red'});
var rubberVis = total.eq(2).selfMask().visualize({palette:'purple'});
var oilpalm_rubberVis = oilpalmVis.blend(rubberVis);
// Create a label and pull-down menu.
var label = ui.Label('Select to show', TITLE_STYLE);
var select = ui.Select({
  items: [MAIN, OILPALM, RUBBER, OILPALM_RUBBER],
  value: MAIN,
  onChange: redraw,
  style: {stretch:'horizontal'}
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
var labels = ['Oil palm','Rubber', 'Other trees', 'Shrub', 'Bare', 'Water'];
var add_legend = function(title, lbl, pal) {
  var legend = ui.Panel({style: {position: 'bottom-left'}}), entry;
  legend.add(ui.Label({style: { fontWeight: 'bold', fontSize: '15px', margin: '1px 1px 4px 1px', padding: '2px' } }));
  for (var x = 0; x < lbl.length; x++){
    entry = [ ui.Label({style:{color: pal[x], border:'1px solid black', margin: '1px 1px 4px 1px'}, value: '██'}),
      ui.Label({ value: labels[x], style: { margin: '1px 1px 4px 4px' } }) ];
    legend.add(ui.Panel(entry, ui.Panel.Layout.Flow('horizontal')));
  } Map.add(legend); };
  
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
      ui.Label('Oil palm and rubber plantations in Tanintharyi, Myanmar', TITLE_STYLE),
      ui.Label(
          'Nomura, K., Mitchard, E. T., Patenaude, G., Bastide, J., Oswald, P., & Nwe, T. (2019). Oil palm concessions in southern Myanmar consist mostly of unconverted forest. Scientific reports, 9(1), 1-9.', TEXT_STYLE),
    ],
    ui.Panel.Layout.flow('vertical'),
    {width: '350px', position: 'bottom-right'}));
