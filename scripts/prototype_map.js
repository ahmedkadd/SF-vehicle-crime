const urls = {
  basemap: "../data/SFFindNeighborhoods.geojson",
  vehicles: "../data/Police_Department_Incident_Reports.csv"
};

const svg = d3.select("body").select("svg#map_vis");
svg.style("background-color", "#190BC8");

const g = {
  basemap: svg.select("g#basemap"),
  outline: svg.select("g#outline"),
  vehicles: svg.select("g#vehicles"),
  legend: svg.select("g#legend")
};

g.legend.attr("transform", translate(30, 100));

let incidentColor = d3.scaleOrdinal()
  .domain(["Motor Vehicle Theft", "Larceny - From Vehicle"])
  .range(["red", "orange"]);

// setup projection
// https://github.com/d3/d3-geo#geoConicEqualArea
const projection = d3.geoConicEqualArea();
projection.parallels([37.692514, 37.840699]);
projection.rotate([122, 0]);

// setup path generator (note it is a GEO path, not a normal path)
const path = d3.geoPath().projection(projection);

d3.json(urls.basemap).then(function(json) {
  // makes sure to adjust projection to fit all of our regions
  projection.fitSize([960, 600], json);

  // draw the land and neighborhood outlines
  drawBasemap(json);
  d3.csv(urls.vehicles).then(drawVehicles);
  drawLegend();
});

function drawBasemap(json) {
  const basemap = g.basemap.selectAll("path.land")
    .data(json.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "land");

  const outline = g.outline.selectAll("path.neighborhood")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "neighborhood")
      .each(function(d) {
        // save selection in data for interactivity
        // saves search time finding the right outline later
        d.properties.outline = this;
      });
}

function drawVehicles(csv) {
  console.log("vehicles", csv);

  // loop through and add projected (x, y) coordinates
  // (just makes our d3 code a bit more simple later)
  csv.forEach(function(d) {
    const latitude = parseFloat(d.Latitude);
    const longitude = parseFloat(d.Longitude);
    const pixels = projection([longitude, latitude]);

    d.x = pixels[0];
    d.y = pixels[1];
  });

  const symbols = g.vehicles.selectAll("circle")
    .data(csv)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 3)
    .attr("class", "symbol")
    .style("fill", d => incidentColor(d["Incident Subcategory"]));
}

function drawLegend() {
  let legend = d3.legendColor()
    .scale(incidentColor)
    .title("Incident Type");

  g.legend.call(legend);
}

function translate(x, y) {
  return "translate(" + String(x) + "," + String(y) + ")";
}
