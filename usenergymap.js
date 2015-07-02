// Main SVG Variables
var width = 960,
    height = 500,
    scaleFactor = 1,
    dataRange = [0, 15],
    centered ;

// Data variables
var dataSet = [],
    maxValue = {},
    currentDataType = "capacity";

// Geo-mapping info
var projection = d3.geo.albersUsa()
    .scale(1070)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

// Scales
var circleScale = d3.scale
                    .sqrt()
                    .clamp(true) ;

// SVG Canvas
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", clicked);

// Main group
var g = svg.append("g");

// Create the legend group
var gLegend = svg.append("g");

// Legend variables
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
categoryLabels = [ "bio", "coal", "gas", "geo", "hydro", "nuc", "oil", "other", "solar", "wind"] ;
categoryLabelColors = ["white","white","white","white","white","white","white","white","white","white"] ;
gLegend.status = [true, true, true, true, true, true, true, true, true, true] ;

infoType = ["capacity", "energy", "emissions", "age"] ;
infoTypeShort = ["cap", "energy", "co2e", "age"] ;

var tooltipData = [   "Plant Name      = ",
                      "Capacity        = ",
                      "Annual Energy   = ",
                      "Primary Fuel    = ",
                      "Average Gen Age = ",
                      "Capacity Factor = ",
                      "CO2e Emissions  = "] ;
generateToolTip(tooltipData) ;

// Buttons to select information type
legendInfoButtons = gLegend.selectAll("circle.infoSwitch")
        .data(infoType)
        .enter() ;
legendInfoButtons.append("circle")
  .classed("infoSwitch",true)
  .attr("cx", 2.5*dEdge)
  .attr("cy", function(d,i) {
          return dEdge + (2*radius + 3)*(i + 1) ;
        })
  .attr('r', radius)
  .attr("fill", function(d,i) {
    if (d == "capacity") {
      return "black" ;
    } else {
      return "white" ;
    }
  })
  .attr("stroke", "black")
  .attr("stroke-width", 1.5)
  .on("click",function(d) {
    return changeDataSource(d,this);
  });
legendInfoButtons.append("text")
  .classed("infoSwitch",true)
  .attr({ x:2.5*dEdge,
            y:function(d,i) {
              return dEdge + (2*radius + 3)*(i + 1) ;
            },
            "font-size":8,
            "font-family":"Verdana",
            "text-anchor":"middle",
            fill: "grey",
            "alignment-baseline":"middle"})
    .style('pointer-events', 'none')
    .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
    .text(function(d,i) {
      return infoTypeShort[i] ;
    });

// Button to zoom
gLegend.append("circle")
  .classed("zoom",true)
  .attr("cx", 1.75*dEdge)
  .attr("cy", dEdge)
  .attr('r', radius)
  .attr("fill", 'white')
  .attr("stroke", "black")
  .attr("stroke-width", 1.5)
  .on("click",clickOut);

gLegend.append("text")
  .attr({ x:1.75*dEdge,
          y:dEdge,
          "font-size":8,
          "font-family":"Verdana",
          "text-anchor":"middle",
          fill:"grey",
          "alignment-baseline":"middle"})
  .style('pointer-events', 'none')
  .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
  .text("zoom");

// Legend data buttons
legendDataButtons = gLegend.selectAll("circle.dataSwitch")
        .data(categories)
        .enter() ;
legendDataButtons.append("circle")
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
legendDataButtons.append("text")
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

//-----------------------------
// Load data
//-----------------------------
d3.json("./us.json", function(error, us) {
  if (error) throw error;

  // Create states
  g.append("g")
    .attr("id", "states")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
    .attr("d", path)
    .attr('fill', '#E6E6E6')
    .on("dblclick", clicked);

  // Add state borders
  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path);

  // Load eGrid data
  d3.csv("egrid2010_plotDatav2.csv", function(data) {
    // Draw each of the circles according to the nameplate capacity
    //  and color by the type of generation
    
    dataSet = data ;

    // Get the maximum value for each of the scales
    maxValue = {
      capacity: data.reduce(function(previousValue, currentValue) {
        return Math.max(previousValue, currentValue.nameplate) ;
      }, 0),
      energy: data.reduce(function(previousValue, currentValue) {
        return Math.max(previousValue, currentValue.generation) ;
      }, 0),
      capacityfactor: data.reduce(function(previousValue, currentValue) {
        return Math.max(previousValue, currentValue.capacityfactor) ;
      }, 0),
      age: 5*data.reduce(function(previousValue, currentValue) {
        return Math.max(previousValue, currentValue.age) ;
      }, 0),
      emissions: data.reduce(function(previousValue, currentValue) {
        return Math.max(previousValue, currentValue.co2emissions) ;
      }, 0),
      emissionsrate: data.reduce(function(previousValue, currentValue) {
        return 20000 ;
        // return Math.max(previousValue, currentValue.co2emissionsRate) ;
      }, 0),
    };

    // Estabish a scale for plotting nameplate capacity
    circleScale.domain([0,maxValue[currentDataType]])
      .range(dataRange);

    // Draw a circle for each generator
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
        return circleScale(d.nameplate) ;
      })
      .style("fill", function(d) {
        var colorIndex = categories.indexOf(d.fuel) ;
        return d3Colors(categoryColors[colorIndex]) ;
      })
      .style("opacity", 0.75)
      .on("click",function(d) {
        return updateAndShowToolTip(d);})
      .on("dblclick", clicked) ;
      //.style("pointer-events", "none") ;
  });
});

//--------------------------------------------------
// Helper Functions
//--------------------------------------------------

// Click function for zooming in on double clicked area
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

  // This is for coloring the clicked states
  g.selectAll("path")
    .classed("active", centered && function(d) { return d === centered; });

  g.transition()
    .duration(750)
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + scaleFactor + ")translate(" + -x + "," + -y + ")")
    .style("stroke-width", 1.25 / scaleFactor + "px");
}

// Zoom out to the original view
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

// Switch the visibility of generators based on side buttons
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


// Change the source of data 
function changeDataSource(type, circle) {
  // Reset the scale
  circleScale.domain([0,maxValue[type]])
    .range(dataRange);
  
  // Change the fill of all circles to white
  gLegend.selectAll("circle.infoSwitch")
    .transition()
    .duration(1000)
    .attr("fill", "white") ;

  // Change the fill of the selected circle to black
  d3.select(circle)
    .transition()
    .duration(1000)
    .attr('fill', 'black') ;

  g.selectAll("circle")
    .data(dataSet)
    .transition()
    .duration(1000)
    .attr("r", function(d) {
      switch(type) {
        case "energy":
          return circleScale(d.generation) ;
        case "capacity":
          return circleScale(d.nameplate) ;
        case "capacityfactor":
          return circleScale(d.capacityfactor) ;
        case "age":
          return circleScale(d.age) ;
        case "emissions":
          return circleScale(d.co2emissions) ;
        case "emissionsrate":
          return circleScale(d.co2emissionsRate) ;
      }
    }) ;
}

//defines a function to be used to append the title to the tooltip.  you can set how you want it to display here.
function generateToolTip(dTooltip) {
  svg.append("rect")
      .classed("tooltip", true)
      .attr({x: width/2 - 5,
             y: 1 ,
             width: 280 ,
             height: 75 ,
             fill: "white",
             stroke: "grey",
             "stroke-width": 1
      })
      .attr("visibility","hidden");

  svg.selectAll("text.tooltip")
      .data(dTooltip)
      .enter()
      .append("text")
      .classed("tooltip",true)
      .attr({ x:width/2,
              y:function(d,i){return i*10+10;},
              "font-size":10,
              "font-family":"Monaco",
              "text-anchor":"left",
              fill:"grey",
              "alignment-baseline":"middle",
              "xml:space": "preserve"})
      .style('pointer-events', 'none')
      .style("-webkit-user-select", "none") // This must be expanded to prevent selections in other browsers
      .text(function(d){return d;})
      .attr("visibility","hidden" ) ;
}

var numformat = d3.format(".0f");
var cfFormat  = d3.format(".3f");

function updateAndShowToolTip (dTooltip) {

  var cData = [ "Plant Name      = " + dTooltip.name,
                "Capacity        = " + dTooltip.nameplate + " MW",
                "Annual Energy   = " + numformat(dTooltip.generation/1000) + " GWh",
                "Primary Fuel    = " + dTooltip.fuel,
                "Average Gen Age = " + dTooltip.age + " years",
                "Capacity Factor = " + cfFormat(dTooltip.capacityfactor),
                "CO2e Emissions  = " + numformat(dTooltip.co2emissions/1000) + " thousand tons CO2e"] ;

  svg.selectAll("rect.tooltip")
      .attr("visibility","visible" );

  svg.selectAll("text.tooltip")
      .data(cData)
      .text(function(d,i){
        return cData[i];})
      .attr("visibility","visible" ) ;


}