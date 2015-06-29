var width = 960,
    height = 500,
    scaleFactor = 1,
    centered,
    maxValNameplate = [],
    maxValEnergy = [];

var dataSet = [] ;

var projection = d3.geo.albersUsa()
    .scale(1070)
    .translate([width / 2, height / 2]);

// Setup drag functionality
var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("drag", dragmove);

var capacityScale = d3.scale.linear() ;
var energyScale = d3.scale.linear() ;

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
d3Colors = d3.scale.category20()
              .domain(d3.range(1,21)) ;
categoryColors = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19] ;
// categoryColors = [1,2,3,4,5,6,7,8,9,10] ;
// categoryColors = ["green",
//                   "brown",
//                   "orange",
//                   "purple",
//                   "blue",
//                   "red",
//                   "black",
//                   "grey",
//                   "yellow",
//                   "cornflowerblue"] ;

categoryLabels = [ "bio", "coal", "gas", "geo", "hydro", "nuc", "oil", "other", "solar", "wind"] ;

categoryLabelColors = ["white","white","white","white","white","white","white","white","white","white"] ;
gLegend.status = [true, true, true, true, true, true, true, true, true, true] ;

// Create zoom button
gLegend.append("circle")
  .classed("zoom",true)
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

// Create switch button
gLegend.append("circle")
  .classed("zoom",true)
  .attr("cx", 2.5*dEdge)
  .attr("cy", dEdge)
  .attr('r', radius)
  .attr("fill", 'white')
  .attr("stroke", "black")
  .attr("stroke-width", 1.5)
  .on("click",changeDataSourceEnergy);

gLegend.append("text")
  .attr({ x:2.5*dEdge,
          y:dEdge,
          "font-size":8,
          "font-family":"Verdana",
          "text-anchor":"middle",
          fill:"grey",
          "alignment-baseline":"middle"})
  .style('pointer-events', 'none')
  .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
  .text("energy");


// Create switch button
gLegend.append("circle")
  .classed("zoom",true)
  .attr("cx", 2.5*dEdge)
  .attr("cy", (2*radius + 3)*2)
  .attr('r', radius)
  .attr("fill", 'white')
  .attr("stroke", "black")
  .attr("stroke-width", 1.5)
  .on("click",changeDataSourceCapacity);

gLegend.append("text")
  .attr({ x:2.5*dEdge,
          y:(2*radius + 3)*2,
          "font-size":8,
          "font-family":"Verdana",
          "text-anchor":"middle",
          fill:"grey",
          "alignment-baseline":"middle"})
  .style('pointer-events', 'none')
  .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
  .text("cap");

// Create other legend buttons
legendButtons = gLegend.selectAll("circle.dataSwitch")
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
          return d3Colors(categoryColors[i]) ;
        })
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("isVisible",true)
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
    .attr('fill', '#E6E6E6')
    .on("dblclick", clicked);

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path);


  d3.csv("egrid2010_plotData.csv", function(data) {
    // Draw each of the circles according to the nameplate capacity
    //  and color by the type of generation
    
    dataSet = data ;

    // Determine the maximum value of the data
    maxValNameplate = data.reduce(function(previousValue, currentValue) {
      return Math.max(previousValue, currentValue.nameplate) ;
    }, 0);

    maxValEnergy = data.reduce(function(previousValue, currentValue) {
      return Math.max(previousValue, currentValue.generation) ;
    }, 0);

    // Estabish a scale for plotting
    capacityScale.domain([0,maxValNameplate])
     .range([0.5, 10]);

    energyScale.domain([0,maxValEnergy])
     .range([0.5, 10]);

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
        return d3Colors(categoryColors[colorIndex]) ;
      })
      .style("opacity", 0.75)
      .style("pointer-events", "none") ;
  })
  .on("progress", function(event){
        //update progress bar
        if (d3.event.lengthComputable) {
          var percentComplete = Math.round(d3.event.loaded * 100 / d3.event.total);
          console.log(percentComplete);
       }
    });
});

g.call(drag) ;

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

function move(d) {
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
  var selection = g.selectAll("circle")
                   .filter(function(data,index) {
                      return data.fuel === categories[i] ;
                   }) ;
  if (d3.select(this).attr("isVisible") === "true") {
    selection.attr("visibility","hidden") ;

    // Fade the button
    d3.select(this)
      .attr("fill", function() {
        return d3Colors(categoryColors[i] + 1) ;
      })
      .attr("isVisible",false) ;

  } else {
    selection.attr("visibility","visible") ;

    // Darken the button
    d3.select(this)
      .attr("fill", function() {
        return d3Colors(categoryColors[i]) ;
    })
    .attr("isVisible",true ) ;
  }
}

function changeDataSourceEnergy() {
  g.selectAll("circle")
    .data(dataSet)
    .transition()
    .duration(1000)
    .attr("cx", function(d) {
      return projection([d.lon, d.lat])[0];
    })
    .attr("cy", function(d) {
      return projection([d.lon, d.lat])[1];
    })
    .attr("r", function(d) {
      return energyScale(d.generation) ;
    })
    .style("fill", function(d) {
      var colorIndex = categories.indexOf(d.fuel) ;
      return d3Colors(categoryColors[colorIndex]) ;
    })
    .style("opacity", 0.75)
    .style("pointer-events", "none") ;
}

function changeDataSourceCapacity() {
  g.selectAll("circle")
    .data(dataSet)
    .transition()
    .duration(1000)
    .attr("cx", function(d) {
      return projection([d.lon, d.lat])[0];
    })
    .attr("cy", function(d) {
      return projection([d.lon, d.lat])[1];
    })
    .attr("r", function(d) {
      return capacityScale(d.nameplate) ;
    })
    .style("fill", function(d) {
      var colorIndex = categories.indexOf(d.fuel) ;
      return d3Colors(categoryColors[colorIndex]) ;
    })
    .style("opacity", 0.75)
    .style("pointer-events", "none") ;
}

function dragmove(d) {
  console.log("HERE!") ;
  d3.select(this)
      .attr("cx", d.x = Math.max(radius, Math.min(width - radius, d3.event.x)))
      .attr("cy", d.y = Math.max(radius, Math.min(height - radius, d3.event.y)));
}