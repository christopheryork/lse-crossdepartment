// This file must be pre-processed for Safari, as it uses arrow functions.

function empty_matrix(n) {
  return d3.range(0,n).map( () => {
    return d3.range(0,n).map( () => 0.0 )
  })
}

const DUR = 2000

queue().defer(d3.csv, "../data-6.1,6.3.csv")
       .defer(d3.csv, "../data-6.2.csv")
       .defer(d3.csv, "../data-6.4.csv")
       .await( (err, depts, research, teaching) => {
  if(err) { throw err }

  // convert data from JSON to javascript types
  depts.forEach( (d) => { d.faculty = +d.faculty; d.research_links = +d.research_links; d.teaching_links = +d.teaching_links })
  research.forEach( (d) => d.links = +d.links )
  teaching.forEach( (d) => d.links = +d.links )


  // prepare list of nodes; should be a superset of depts list
  var rd1 = research.map( (d) => d.department1 )
  var rd2 = research.map( (d) => d.department2 )
  var td1 = teaching.map( (d) => d.department1 )
  var td2 = teaching.map( (d) => d.department2 )
  var dept_names = d3.set([].concat(rd1).concat(rd2).concat(td1).concat(td2)).values()
  var n = dept_names.length


  // prepare the matrices

  function populate(xs, m) {
    xs.forEach( (x) => {
      var i = dept_names.indexOf(x.department1)
      var j = dept_names.indexOf(x.department2)
      if(m[i][j] || m[j][i]) {
        console.log("WARNING: " + x.department1 + " x " + x.department2 + " = " + m[i][j] + " or " + m[j][i] + " or " + x.links + "?")
      }
      m[i][j] = m[j][i] = x.links
    })
    return m
  }

  var research_matrix = populate(research, empty_matrix(n))
  var teaching_matrix = populate(teaching, empty_matrix(n))


  // vizualization proper

  var width = 850,
      height = 400,
      margins = { top: 90, left: 150, right: 50, bottom: 0 }

  var svg = d3.select("body").append("svg")
        .attr("width", width + margins.left + margins.right)
        .attr("height", height + margins.top + margins.bottom)
      .append("g")
        .attr("transform", "translate(" + margins.left + "," + margins.top + ")")


  // test data for animation

  var totals = research_matrix.map( (d) => d.reduce( (a,b) => a + b, 0.0) )

  var x = d3.scale.ordinal()
    .domain(dept_names)
    .rangeRoundBands([0, width], 0.1)

  var y = d3.scale.linear()
    .domain([0, d3.max(totals)])
    .range([height, 0])

  var y2 = d3.scale.linear()
    .domain([0, totals.reduce( (a,b) => a + b, 0.0)])
    .range([height, 0])

  var r = d3.scale.linear()
    .domain([0, totals.reduce( (a,b) => a + b, 0.0)])
    .range([0, 2 * Math.PI])

  var offset = (i) => {
    var sweep = totals.slice(0, i)
    return sweep.reduce( (a,b) => a + b, 0.0 )
  }

  var color = d3.scale.category20b()

  var rect = (d, i) => "M" + x(d) + "," + y(totals[i]) + "h" + x.rangeBand() + "V" + y(0) + "h" + -x.rangeBand() + "Z"
  var rect2 = (d, i) => "M" + x(d) + "," + y2(offset(i) + totals[i]) + "h" + x.rangeBand() + "V" + y2(offset(i)) + "h" + -x.rangeBand() + "Z"
  var rect3 = (d, i) => "M0," + y2(offset(i) + totals[i]) + "h" + x.rangeBand() + "V" + y2(offset(i)) + "h" + -x.rangeBand() + "Z"

  var arc = d3.svg.arc()
    .innerRadius(height / 2.0 - 20)
    .outerRadius(height / 2.0)
    .startAngle( (d,i) => r( offset(i) ) )
    .endAngle( (d,i) => r( offset(i) + totals[i]) )

  var paths = svg.selectAll("path")
    .data(dept_names)

  paths.enter()
    .append("path")
      .attr("d", (d,i) => {
        "M0," + y(0) + "h" + x.rangeBand() + "V" + y(0) + "h" -x.rangeBand() + "Z"
      })
      .attr("fill", color)

  // different views

  var vizualizations = {
    bar: function() {
      paths.transition()
        .delay( (d,i) => (DUR / totals.length) * i )
        .duration(DUR / totals.length)
        .attr("transform", "translate(0,0)")
        .attr("d", (d) => rect(d, dept_names.indexOf(d)))
    },
    stack: function() {
      paths.transition()
        .delay( (d,i) => (DUR / totals.length) * i )
        .duration(DUR / totals.length)
        .attr("transform", "translate(0,0)")
        .attr("d", (d) => rect2(d, dept_names.indexOf(d)))
      .transition()
        .delay( (d,i) => (DUR / totals.length) * i )
        .duration(DUR / totals.length)
        .attr("d", (d) => rect3(d, dept_names.indexOf(d)))
    },
    donut: function() {
      paths.transition()
        .duration(DUR)
        .attr("transform", "translate(" + (width / 2.0) + "," + (height / 2.0) + ")")
        .attr("d", (d) => arc(d, dept_names.indexOf(d)))
    }
  }

  // view transitions

  function show(d) {
    d3.selectAll("#viz li")
      .classed("selected", false)
    d3.select("#viz #" + d)
      .classed("selected", true)
    vizualizations[d].call()
  }

  d3.select("#viz")
     .selectAll("li")
    .data(d3.keys(vizualizations))
     .enter().append("li")
      .attr("id", (d) => d)
      .text((d) => d)
     .on("click", show)

  show("bar")

})