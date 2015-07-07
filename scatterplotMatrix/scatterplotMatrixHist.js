var width = 960,
    size = 150,
    padding = 19.5;

var x = d3.scale.linear()
    .range([padding / 2, size - padding / 2]);

var y = d3.scale.linear()
    .range([size - padding / 2, padding / 2]);

var formatSiPrefix = d3.format("3,.1s") ;

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(5)
    .tickFormat(formatSiPrefix);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(5)
    .tickFormat(formatSiPrefix);

var color = d3.scale.category10();

// Establish the resource filtering buttons
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
categoryColorIndex = {BIOMASS:1,
                COAL:3,
                GAS:5,
                GEOTHERMAL:7,
                HYDRO:9,
                NUCLEAR:11,
                OIL:13,
                OTHER:15,
                SOLAR:17,
                WIND:19 } ;
categoryState = {BIOMASS:true,
                COAL:true,
                GAS:true,
                GEOTHERMAL:true,
                HYDRO:true,
                NUCLEAR:true,
                OIL:true,
                OTHER:true,
                SOLAR:true,
                WIND:true } ;

// Legend data buttons

// Legend variables
var dEdge = -50 ;
var radius = 15 ;

var filterType = ["none","none"] ;
var filterLimits = [[0,0],[0,0]] ;

//----------------------------------------
// Load and plot the data 
//----------------------------------------
d3.csv("egrid2010_scatterplot.csv", function(error, data) {
  if (error) throw error;
  var allData = data ;
  data = data.filter(function(d){
    //if (d.generation >= 296256) { // Limit data to 95% of generation
    if (d.generation >= 4*296256) { // Limit data to 95% of generation
      return true ;
    } else {
      return false ;
    }
  });

  // Determine the types of each plot by extracting the first line of the csv and ignoring
  //  "species"
  var domainByTrait = {},
      traits = d3.keys(data[0]).filter(function(d) { return d !== "fuel"; }),
      n = traits.length;

  // Get Min and Max of each of the columns
  traits.forEach(function(trait) {
    domainByTrait[trait] = d3.extent(data, function(d) {
      return +d[trait];
    });
  });

  // Set the ticks to stretch across all plots
  xAxis.tickSize(size * n);
  yAxis.tickSize(-size * n);  // negative so ticks go right

  // Create brishing variable
  var brush = d3.svg.brush()
      .x(x)
      .y(y)
      .on("brushstart", brushstart)
      .on("brush", brushmove)
      .on("brushend", brushend);

  // Create the svg box
  var svg = d3.select("body").append("svg")
      .attr("width", size * n + padding*5)
      .attr("height", size * n + padding)
      .append("g")
      .attr("transform", "translate(" + padding*4 + "," + padding / 2 + ")");

  //------------------------------------
  // Create Legend
  //------------------------------------

  // Create the legend group
  var gLegend = svg.append("g");

  // Creat the legend
  legendDataButtons = gLegend.selectAll("circle.dataSwitch")
        .data(categories)
        .enter() ;
  legendDataButtons.append("circle")
          .classed("dataSwitch", true)
          .attr("cx", dEdge)
          .attr("cy", function(d,i) {
            return (2*radius + 3)*(i + 1) ;
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
              return (2*radius + 3)*(i + 1) ;
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


  // Create each x-axis
  svg.selectAll(".x.axis")
      .data(traits)
    .enter().append("g")
      .attr("class", "x axis")
      .attr("transform", function(d, i) { return "translate(" + (n - i - 1) * size + ",0)"; })
      .each(function(d) {
        x.domain(domainByTrait[d]);
        d3.select(this).call(xAxis);
      });

  // Create each y-axis
  svg.selectAll(".y.axis")
      .data(traits)
    .enter().append("g")
      .attr("class", "y axis")
      .attr("transform", function(d, i) {
        return "translate(0," + i * size + ")";
      })
      .each(function(d) {
        y.domain(domainByTrait[d]);
        d3.select(this).call(yAxis);
      });

  var cell = svg.selectAll(".cell")
      .data(cross(traits, traits))
      .enter().append("g")
      .attr("class", "cell") ;

  var plotCells = cell.filter(function(d) { return d.i !== d.j; })
      .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
      .each(plot);

  var histCells = cell.filter(function(d) { return d.i === d.j; })
      .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
      .each(firstPlotHistogram) ;

  // Titles for the diagonal.
  //cell.filter(function(d) { return d.i === d.j; }).
  histCells.append("text")
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(function(d) { return d.x; });

  // Run the brush
  plotCells.call(brush);

  //------------------------------------------
  // Plot Scatterplot Point
  //------------------------------------------
  function plot(p) {
    var cell = d3.select(this);

    x.domain(domainByTrait[p.x]);
    y.domain(domainByTrait[p.y]);

    cell.append("rect")
        .attr("class", "frame")
        .attr("x", padding / 2)
        .attr("y", padding / 2)
        .attr("width", size - padding)
        .attr("height", size - padding);

    cell.selectAll("circle.data")
        .data(data)
        .enter().append("circle")
        .classed("data",true)
        .attr("cx", function(d) {
          // For each data point, return the appropriate x and 
          //  y value corresponding to the pair of data, and scale it
          return x(d[p.x]);
        })
        .attr("cy", function(d) { return y(d[p.y]); })
        .attr("r", 2)
        .style("fill", function(d) {
          return d3Colors(categoryColorIndex[d.fuel]);
        });
  }

  //------------------------------------------
  // Plot Histogram
  //------------------------------------------
  function updateHistograms() {
    d3.selectAll(".histogram")
      .remove() ;

    histCells.each(function(p) {

      var cell = d3.select(this);

      /////////////////// THE SHARED x and y scale is causing the problem!!
      //x.domain(domainByTrait[p.x]);
      //y.domain(domainByTrait[p.y]);

      // Filter data down based on selections
      var histData = data.filter(function(d) {
        
        // Has the fuel category been hidden?
        if (!categoryState[d.fuel]) {
            return false ;
        }

        // Is the point within the bounds of the selected region
        if (!(filterType[0] == "none")) {
           if (filterLimits[0][0] <= +d[filterType[0]] && +d[filterType[0]] <= filterLimits[0][1] &&
               filterLimits[1][0] <= +d[filterType[0]] && +d[filterType[0]] <= filterLimits[1][1]) {
            return false ;
           }
        }
        return true ;
      }) ;

      // Extract data for histogramming into single array
      histData = histData.map(function(d) {
        return +d[p.x] ;
      });

      // Generate a histogram using twenty uniformly-spaced bins.
      var hist = d3.layout.histogram()
        .bins(x.ticks(20))
        (histData);

      var histScale = d3.scale.linear()
      .domain([0, d3.max(hist, function(d) { return d.y; })])
      .range([size - padding / 2, padding / 2]);

      var bar = cell.selectAll(".bar")
        .data(hist)
        .enter().append("g")
        .attr("class", "bar")
        .classed("histogram",true)
        .attr("transform", function(d) {
          return "translate(" + x(d.x) + "," + histScale(d.y) + ")";
        });

      bar.append("rect")
      .classed("histogram",true)
      .attr("x", 1)
      .attr("width", 5) //x(hist[0].dx) )
      .attr("height", function(d) {
        return size - padding / 2 - histScale(d.y);
      });
    }) ;
  }

  //------------------------------------------
  // First Plot Histogram
  //------------------------------------------
  function firstPlotHistogram(p) {

    var cell = d3.select(this);

    x.domain(domainByTrait[p.x]);
    y.domain(domainByTrait[p.y]);

    cell.append("rect")
        .attr("x", padding / 2)
        .attr("y", padding / 2)
        .attr("width", size - padding)
        .attr("height", size - padding)
        .attr("fill", "white")
        .attr("stroke","#aaa");

    // Extract data for histogramming into single array
    histData = data.map(function(d) {
      return +d[p.x] ;
    });

    // Generate a histogram using twenty uniformly-spaced bins.
    var hist = d3.layout.histogram()
      .bins(x.ticks(20))
      (histData);

    var histScale = d3.scale.linear()
    .domain([0, d3.max(hist, function(d) { return d.y; })])
    .range([size - padding / 2, padding / 2]);

    var bar = cell.selectAll(".bar")
      .data(hist)
      .enter().append("g")
      .attr("class", "bar")
      .classed("histogram",true)
      .attr("transform", function(d) {
        return "translate(" + x(d.x) + "," + histScale(d.y) + ")";
      });

    bar.append("rect")
    .classed("histogram",true)
    .attr("x", 1)
    .attr("width", 5) //x(hist[0].dx) )
    .attr("height", function(d) {
      return size - padding / 2 - histScale(d.y);
    });
  }

  var brushCell;

  //------------------------------------------
  // Brushstart
  //------------------------------------------
  // Clear the previously-active brush, if any.
  function brushstart(p) {
    if (brushCell !== this) {
      d3.select(brushCell).call(brush.clear());
      x.domain(domainByTrait[p.x]);
      y.domain(domainByTrait[p.y]);
      brushCell = this;
    }

    // Reset histogram parameters
    filterType = ["none","none"] ;
    filterLimits = [[0,0],[0,0]] ;
    //updateHistograms() ;
  }

  //------------------------------------------
  // Brushmove
  //------------------------------------------
  // Highlight the selected circles.
  function brushmove(p) {
    var e = brush.extent();
    svg.selectAll("circle.data").classed("hidden", function(d) {

      // INSERT SUBSELECTION CODE FOR HISTOGRAM HERE
      filterType = [p.x,p.y] ;
      filterLimits = [ [+e[0][0],+e[1][0]],
                       [+e[0][1],+e[1][1]]
                     ] ;

      return +e[0][0] > +d[p.x] || +d[p.x] > +e[1][0] ||
             +e[0][1] > +d[p.y] || +d[p.y] > +e[1][1];

    });
    updateHistograms() ;
  }

  //------------------------------------------
  // Brushend
  //------------------------------------------
  // If the brush is empty, select all circles.
  function brushend() {
    if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);

    // Reset histogram parameters
    filterType = ["none","none"] ;
    filterLimits = [[0,0],[0,0]] ;
  }

  //------------------------------------------
  // Cross
  //------------------------------------------
  function cross(a, b) {
    var c = [], n = a.length, m = b.length, i, j;
    for (i = -1; ++i < n;)
      for (j = -1; ++j < m;)
        c.push({x: a[i], i: i, y: b[j], j: j});
    return c;
  }

  d3.select(self.frameElement).style("height", size * n + padding + 20 + "px");

//------------------------------------------
// Switchvisibility
//------------------------------------------
// Switch the visibility of generators based on side buttons
function switchVisibility(d,i) {
  var selection = svg.selectAll("circle.data")
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

      // Remove the data from consideration in histograms
      categoryState[categories[i]] = false ;
  } else {
    selection.attr("visibility","visible") ;

    // Darken the button
    d3.select(this)
      .attr("fill", function() {
        return d3Colors(categoryColors[i]) ;
    })
    .attr("isVisible",true ) ;

    // Add the data to histograms
      categoryState[categories[i]] = true ;
  }
  updateHistograms();
}
});