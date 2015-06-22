var width = 960,
    height = 500,
    scaleFactor = 1,
    centered;

var projection = d3.geo.albersUsa()
    .scale(1070)
    .translate([width / 2, height / 2]);

var capacityScale = d3.scale.linear() ;

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", clicked);

var g = svg.append("g");

// Create the legend
var gLegend = svg.append("g");

var dEdge = 25 ;
var radius = 15 ;


// Information for legend
categories = [  "BIOMASS",
                "COAL",
                "GAS",
                "GEOTHERMAL",
                "HYDRO",
                "NUCLEAR",
                "OIL",
                "OTHER",
                "SOLAR",
                "WIND" ] ;
categoryColors = ["green",
                  "brown",
                  "orange",
                  "purple",
                  "blue",
                  "red",
                  "black",
                  "grey",
                  "yellow",
                  "cornflowerblue"] ;
categoryLabels = [ "bio", "coal", "gas", "geo", "hydro", "nuc", "oil", "other", "solar", "wind"] ;
categoryLabelColors = ["white","white","white","white","white","white","white","white","black","white"] ;
gLegend.status = [true, true, true, true, true, true, true, true, true, true] ;

// Create zoom button
gLegend.append("circle")
  .attr("cx", dEdge)
  .attr("cy", dEdge)
  .attr('r', radius)
  .attr("fill", 'white')
  .attr("stroke", "black")
  .attr("stroke-width", 1.5)
  .on("click",clickOut);

gLegend.append("text")
  .attr({ x:dEdge,
          y:dEdge,
          "font-size":8,
          "font-family":"Verdana",
          "text-anchor":"middle",
          fill:"grey",
          "alignment-baseline":"middle"})
  .style('pointer-events', 'none')
  .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
  .text("zoom");

// Create other legend buttons
legendButtons = gLegend.selectAll("circle")
        .data(categories)
        .enter() ;
legendButtons.append("circle")
        .classed("dataSwitch", true)
        .attr("cx", dEdge)
        .attr("cy", function(d,i) {
          return dEdge + (2*radius + 3)*(i + 1) ;
        })
        .attr('r', radius)
        .attr("fill", function(d,i) {
          return categoryColors[i] ;
        })
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .on("click", switchVisibility) ;
legendButtons.append("text")
        .attr({ x:dEdge,
          y:function(d,i) {
            return dEdge + (2*radius + 3)*(i + 1) ;
          },
          "font-size":8,
          "font-family":"Verdana",
          "text-anchor":"middle",
          fill: function(d,i) {
            return categoryLabelColors[i] ;
          },
          "alignment-baseline":"middle"})
  .style('pointer-events', 'none')
  .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
  .text(function(d,i) {
    return categoryLabels[i] ;
  });

d3.json("./us.json", function(error, us) {
  if (error) throw error;

  g.append("g")
      .attr("id", "states")
    .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .on("dblclick", clicked);

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path);

  d3.csv("egrid2010_plotData.csv", function(data) {
    // Draw each of the circles according to the nameplate capacity
    //  and color by the type of generation
    
    // Determine the maximum value of the data
    var maxVal = data.reduce(function(previousValue, currentValue) {
      return Math.max(previousValue, currentValue.nameplate) ;
    }, 0);

    // Estabish a scale for plotting
    capacityScale.domain([0,maxVal])
     .range([0.75, 8]);

    g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", function(d) {
        return projection([d.lon, d.lat])[0];
      })
      .attr("cy", function(d) {
        return projection([d.lon, d.lat])[1];
      })
      .attr("r", function(d) {
        return capacityScale(d.nameplate) ;
        // return 2;
      })
      .style("fill", function(d) { // Can simplify this by using a list
        var colorIndex = categories.indexOf(d.fuel) ;
        return categoryColors[colorIndex] ;
      })
      .style("opacity", 0.75)
      .style("pointer-events", "none") ;
  });
});

function clicked(d) {
  var x, y;

  var mousePos = d3.mouse(this) ;

  if (d) {
    x = mousePos[0] ;
    y = mousePos[1] ;
    scaleFactor *= 2 ;
    scaleFactor = Math.min(scaleFactor,32) ;
  } else {
    x = width / 2;
    y = height / 2;
    scaleFactor = 1 ;
  }

  g.selectAll("path")
    .classed("active", centered && function(d) { return d === centered; });

  g.transition()
    .duration(750)
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + scaleFactor + ")translate(" + -x + "," + -y + ")")
    .style("stroke-width", 1.25 / scaleFactor + "px");
}


function clickOut() {
  var x, y;

  x = width / 2;
  y = height / 2;
  scaleFactor = 1;

  g.transition()
    .duration(750)
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + scaleFactor + ")translate(" + -x + "," + -y + ")")
    .style("stroke-width", 1.5 / scaleFactor + "px");
}

function switchVisibility(d,i) {
  d3.select(this)
    .attr("fill", "white") ;
  //this.style("visibility", "hidden") ;
}