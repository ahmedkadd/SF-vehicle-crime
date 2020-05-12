let config = {
  'heatmap_svg': {},
  'margin': {},
  'plot': {},
  'heatmapLegend': {}
};

config.heatmap_svg.width = 960;
config.heatmap_svg.height = 500;

config.margin.top = 50;
config.margin.right = 10;
config.margin.bottom = 50;
config.margin.left = 160;

config.plot.x = config.margin.left;
config.plot.y = config.margin.top;
config.plot.width = config.heatmap_svg.width - config.margin.left - config.margin.right;
config.plot.height = config.heatmap_svg.height - config.margin.top - config.margin.bottom;

config.heatmapLegend.x = 750;
config.heatmapLegend.y = 10;
config.heatmapLegend.width = 180;
config.heatmapLegend.height = 10;

let tooltipMap = {
  "Day": "Day:",
  "Hour": "Hour:",
  "Count": "Number of Incidents:"
};

let heatmap_svg = d3.select("svg#heatmap_vis");
heatmap_svg.attr('width', config.heatmap_svg.width);
heatmap_svg.attr('height', config.heatmap_svg.height);

let plot = heatmap_svg.append('g');
plot.attr('id', 'plot');
plot.attr('transform', translate(config.plot.x, config.plot.y));

let scale = {};

scale.x = d3.scaleBand();
scale.x.range([0, config.plot.width]);

scale.y = d3.scaleBand();
scale.y.range([config.plot.height, 0]);

scale.color = d3.scaleSequential(d3.interpolateOranges);

let axis = {};

axis.x = d3.axisBottom(scale.x);
axis.x.tickPadding(0);
axis.x.tickSize(5);
axis.x.tickSizeOuter(0);

axis.y = d3.axisLeft(scale.y);
axis.y.tickPadding(0);
axis.y.tickSize(3);
axis.y.tickSizeOuter(0);

d3.json(urls.vehicles).then(draw);

// https://blockbuilder.org/sjengle/47c5c20a18ec29f4e2b82905bdb7fe95
function draw(json) {
  console.log("Heatmap json", json);
  let data = [];

  let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(i);
  }

  hours.reverse();

  for (const day of days) {
    for (let i = 0; i < 24; i++) {
      let currentData = {
        "Day": day,
        "Hour": i,
        "Count": 0
      }
      data.push(currentData);
    }
  }

  json.forEach(function(d) {
    const day = d.incident_day_of_week;
    let timeString = d.incident_time;
    const time = parseInt(timeString.substring(0, timeString.indexOf(":")));

    for (let i = 0; i < data.length; i++) {
      if (data[i].Day == day && data[i].Hour == time) {
        data[i].Count++;
      }
    }
  });

  console.log("data", data);

  scale.x.domain(days);
  scale.y.domain(hours);

  let gx = heatmap_svg.append("g")
    .attr("id", "x-axis")
    .attr("class", "axis")
    .attr("transform", translate(config.plot.x, config.plot.y + config.plot.height))
    .call(axis.x);

  let gy = heatmap_svg.append("g")
    .attr("id", "y-axis")
    .attr("class", "axis")
    .attr("transform", translate(config.plot.x, config.plot.y))
    .call(axis.y);

  let counts = data.map(d => d.Count);
  let min = d3.min(counts);
  let max = d3.max(counts);

  scale.color.domain([min, max]);

  let cells = plot.selectAll('rect')
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => scale.x(d.Day))
    .attr("y", d => scale.y(d.Hour))
    .attr("width", d => scale.x.bandwidth())
    .attr("height", d => scale.y.bandwidth())
    .style("fill", d => scale.color(d.Count))
    .style("stroke", d => scale.color(d.Count));

  // https://observablehq.com/@sjengle/interactivity?collection=@sjengle/interactive-scatterplot
  cells.on("mouseover.highlight", function(d) {
    d3.select(this)
      .raise()
      .style("stroke", "grey")
      .style("stroke-width", 1);
  });

  cells.on("mouseout.highlight", function(d) {
    d3.select(this).style("stroke", null);
  });

  cells.on("mouseover.tooltip", function(d) {
    let div = d3.select("body").append("div");

    div.attr("id", "details");
    div.attr("class", "tooltip");

    let rows = div.append("table")
      .selectAll("tr")
      .data(Object.keys(d))
      .enter()
      .append("tr");

    rows.append("th").text(key => tooltipMap[key]);
    rows.append("td").text(key => d[key]);

    div.style("display", "inline");
  });

  cells.on("mousemove.tooltip", function(d) {
    let div = d3.select("div#details");

    let bbox = div.node().getBoundingClientRect();

    div.style("left", (d3.event.pageX + 8) + "px")
    div.style("top",  (d3.event.pageY - bbox.height - 8) + "px");
  });

  cells.on("mouseout.tooltip", function(d) {
    d3.selectAll("div#details").remove();
  });

  drawTitles();
  drawHeatmapLegend();
}

// https://bl.ocks.org/mbostock/1086421
function drawHeatmapLegend() {
  let heatmapLegend = heatmap_svg.append("g")
    .attr("id", "heatmapLegend")
    .attr("transform", translate(config.heatmapLegend.x, config.heatmapLegend.y));

  heatmapLegend.append("rect")
    .attr("width", config.heatmapLegend.width)
    .attr("height", config.heatmapLegend.height)
    .attr("fill", "url(#gradient)");

  let gradientScale = d3.scaleLinear()
    .domain([0, 100])
    .range(scale.color.domain());

  let gradient = heatmap_svg.append("defs")
    .append("linearGradient")
    .attr("id", "gradient")

  gradient.selectAll("stop")
    .data(d3.ticks(0, 100, 50))
    .enter()
    .append("stop")
    .attr("offset", d => d + "%")
    .attr("stop-color", d => scale.color(gradientScale(d)));

  let heatmapLegendScale = d3.scaleLinear()
    .domain(scale.color.domain())
    .range([0, config.heatmapLegend.width]);

  let heatmapLegendAxis = d3.axisBottom(heatmapLegendScale)
    .tickValues(scale.color.domain())
    .tickSize(5);

  heatmapLegend.append("g")
    .call(heatmapLegendAxis)
    .attr("transform", translate(0, config.heatmapLegend.height))
}

function drawTitles() {
  let title = heatmap_svg.append("text")
    .text("Last 30 Days of Vehicle Break Ins")
    .attr("id", "title")
    .attr("x", 180)
    .attr("y", 26)
    .attr("font-size", "26px");

  let x = heatmap_svg.append("text")
    .text("Day of the Week")
    .attr("id", "axisTitle")
    .attr("x", 510)
    .attr("y", 480)
    .attr("font-size", "16px")
    .attr("font-weight", "bold");

  let y = heatmap_svg.append("text")
    .text("Hour")
    .attr("id", "axisTitle")
    .attr("x", 52)
    .attr("y", 45)
    .attr("font-size", "14px")
    .attr("font-weight", "bold");
}

function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}
