const urls = {
  basemap: "SFFindNeighborhoods.geojson",
  streets: "https://data.sfgov.org/resource/3psu-pn9h.geojson?$limit=20000",
  vehicles: "Police_Department_Incident_Reports.csv"
};

const svg = d3.select("body").select("svg#map_vis");
svg.style("background-color", "#190BC8");

const g = {
  basemap: svg.select("g#basemap"),
  streets: svg.select("g#streets"),
  outline: svg.select("g#outline"),
  vehicles: svg.select("g#vehicles"),
  tooltip: svg.select("g#tooltip"),
  details: svg.select("g#details"),
  legend: svg.select("g#legend")
};

g.legend.attr("transform", translate(730, 260));

let incidentColor = d3.scaleOrdinal()
  .domain(["Motor Vehicle Theft", "Larceny - From Vehicle"])
  .range(["red", "orange"]);

// setup tooltip (shows neighborhood name)
const tip = g.tooltip.append("text").attr("id", "tooltip");
tip.attr("text-anchor", "end");
tip.attr("dx", -5);
tip.attr("dy", -5);
tip.style("visibility", "hidden");

// add details widget
// https://bl.ocks.org/mbostock/1424037
const details = g.details.append("foreignObject")
  .attr("id", "details")
  .attr("width", 300)
  .attr("height", 300)
  .attr("x", 0)
  .attr("y", 0);

const body = details.append("xhtml:body")
  .style("text-align", "left")
  .style("background", "none")
  .html("<p>N/A</p>");

details.style("visibility", "hidden");

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
  d3.json(urls.streets).then(drawStreets);
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

  // add highlight
  basemap.on("mouseover.highlight", function(d) {
    d3.select(d.properties.outline).raise();
    d3.select(d.properties.outline).classed("active", true);
  })
  .on("mouseout.highlight", function(d) {
    d3.select(d.properties.outline).classed("active", false);
  });

  // add tooltip
  basemap.on("mouseover.tooltip", function(d) {
    // neighborhood name property
    tip.text(d.properties.name);
    tip.style("visibility", "visible");
  })
  .on("mousemove.tooltip", function(d) {
    const coords = d3.mouse(g.basemap.node());
    tip.attr("x", coords[0]);
    tip.attr("y", coords[1]);
  })
  .on("mouseout.tooltip", function(d) {
    tip.style("visibility", "hidden");
  });
}

function drawStreets(json) {
  console.log("streets", json);

  // only show active streets
  const streets = json.features.filter(function(d) {
    return d.properties.active;
  });

  g.streets.selectAll("path.street")
    .data(streets)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "street");
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


  symbols.on("mouseover", function(d) {
    d3.select(this).raise();
    d3.select(this).classed("active", true);

    // use template literal for the detail table
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
    const html = `
      <table border="0" cellspacing="0" cellpadding="2">
      <tbody>
        <tr>
          <th>Date:</th>
          <td>${d["Incident Date"]}</td>
        </tr>
        <tr>
          <th>Time:</th>
          <td>${d["Incident Time"]}</td>
        </tr>
        <tr>
          <th>Neighborhood:</th>
          <td>${d["Analysis Neighborhood"]}</td>
        </tr>
        <tr>
          <th>Type:</th>
          <td>${d["Incident Subcategory"]}</td>
        </tr>
        <tr>
          <th>Description:</th>
          <td>${d["Incident Description"]}</td>
        </tr>
      </tbody>
      </table>
    `;

    body.html(html);
    details.style("visibility", "visible");
  });

  symbols.on("mouseout", function(d) {
    d3.select(this).classed("active", false);
    details.style("visibility", "hidden");
  });
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
