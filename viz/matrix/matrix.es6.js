// This file must be pre-processed for Safari, as it uses arrow functions.

function empty_matrix(n) {
  var m = Array(n)
  var i = -1; while(i++ < n) {
    m[i] = Array(n)
    var j = -1; while(j++ < n) {
      m[i][j] = 0.0
    }
  }
  return m
}

function trim(d, n) {
  return (d.length > n) ? (d.slice(0,n-3)+"...") : d
}

function to_class(s) {
  return s.toLowerCase().replace(/\W/g, '_')
}

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
      m[i][j] = m[j][i] = x.links
    })
    return m
  }

  var research_matrix = populate(research, empty_matrix(n))
  var teaching_matrix = populate(teaching, empty_matrix(n))

  // prepare the orders

  var faculty = d3.range(n).map( () => 0)
  depts.forEach( (d) => faculty[dept_names.indexOf(d.department)] = d.faculty)

  function count_links(di) {
    return research_matrix[di].reduce( (a, b) => a + b) + teaching_matrix[di].reduce( (a, b) => a + b )
  }

  function emphasis_links(di) {
    return research_matrix[di].reduce( (a, b) => a + b) - teaching_matrix[di].reduce( (a, b) => a + b )
  }

  var orders = {
    department: d3.range(n).sort( (a, b) => d3.ascending(dept_names[a], dept_names[b])),
    faculty: d3.range(n).sort( (a, b) => faculty[b] - faculty[a] ),
    links: d3.range(n).sort( (a, b) => count_links(b) - count_links(a)),
    research_isolation: d3.range(n).sort( (a, b) => faculty[a] / research_matrix[a].reduce( (a, b) => a + b) - faculty[b] / research_matrix[b].reduce( (a, b) => a + b) ),
    teaching_isolation: d3.range(n).sort( (a, b) => faculty[a] / teaching_matrix[a].reduce( (a, b) => a + b) - faculty[b] / teaching_matrix[b].reduce( (a, b) => a + b) ),
    emphasis: d3.range(n).sort( (a, b) => emphasis_links(b) - emphasis_links(a))
  }

  // visualization proper

  var width = 650,
      height = 650,
      padding = 120,
      cell_packing = 3,
      cell_padding = 1,
      stroke_width = 1.0,
      trim_value = 22,
      research_color = "#f16913",
      neutral_color = "gray",
      teaching_color = "#08519c";

  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")

  var scale = d3.scale.ordinal()
    .domain(orders.department)
    .rangeRoundBands([0, width - padding], 0.1)

  var colorscale = d3.scale.linear()
    .domain([-2, 0, 9])
    .range([teaching_color, neutral_color, research_color])

  var sizescale = d3.scale.linear()
    .domain([0, 10])
    .range([3, scale.rangeBand()])

  var size = (i,j) => research_matrix[i][j] + teaching_matrix[i][j]
  var bal = (i,j) => research_matrix[i][j] - teaching_matrix[i][j]

  var matrix = svg.append("g")
      .attr("class", "matrix");

  var points = d3.merge(d3.range(n).map( (i) => d3.range(n).map( (j) => {
    return { i: i, j: j}
  })))

  var g = matrix
    .selectAll("g")
      .data(points)
    .enter()
      .append("g")
        .attr("class", (d) => "cell x_" + to_class(dept_names[d.i]) + " y_" + to_class(dept_names[d.j]))
        .attr("transform", (d) => "translate(" + scale(d.i) + "," + (padding + scale(d.j)) + ")" )
//        .attr("opacity", (d) => (d.i > d.j) ? "1.0" : "0.5" )
        .attr("fill", "transparent")

  g.append("title")
    .text((d) => dept_names[d.i] + " & " + dept_names[d.j] +
               "\nResearch: " + research_matrix[d.i][d.j] +
               ", Teaching: " + teaching_matrix[d.i][d.j])

  g.append("rect")
    .attr("class", "background")
    .attr("rx", 1)
    .attr("ry", 1)
    .attr("stroke", "none")
    .attr("width", scale.rangeBand())
    .attr("height", scale.rangeBand())
    .attr("opacity", 0.2)
    .attr("fill", "none")

  g.append("rect")
    .attr("class", "sum")
    .attr("rx", 1)
    .attr("ry", 1)


  // dots for linkages

  var circle = g.selectAll("circle")
    .data( (d) => d3.range(size(d.i, d.j)).map( (k) => d ) )

  var radius = (scale.rangeBand() / cell_packing - cell_padding) / 2.0

  circle.enter()
    .append("circle")
    .attr("r", radius)
    .attr("cx", (d,i) => (stroke_width / 2.0) + radius + i % cell_packing * (radius * 2 + cell_padding))
    .attr("cy", (d,i) => (stroke_width / 2.0) + radius + Math.floor(i / cell_packing) * (radius * 2 + cell_padding))
    .attr("fill", (d, i) => {
      var s = size(d.i, d.j)
      var b = bal(d.i, d.j)
      return (i < s - Math.abs(b)) ? neutral_color : (b > 0) ? research_color : teaching_color
    })

  // Rules

  svg.append("g")
    .attr("class", "x_labels")
    .attr("transform", "translate(0," + padding + ")")
   .selectAll("text")
    .data(dept_names)
   .enter().append("g")
    .attr("transform", (d, i) => "translate(" + (scale(i) + 5) + ",-5)rotate(-55)")
   .append("text")
    .attr("class", (d, i) => "dept" + i)
    .attr("dominant-baseline", "middle")
    .text( (d) => trim(d, trim_value) )
    .attr("fill", "black")
   .call(highlight.bind(null, "x_"))

  svg.append("g")
    .attr("class", "y_labels")
    .attr("transform", "translate(" + (width - padding) + ",0)")
   .selectAll("text")
    .data(dept_names)
   .enter().append("text")
    .attr("class", (d,i) => "dept" + i)
    .attr("y", (d,i) => padding + scale(i))
    .attr("dy",  scale.rangeBand() / 2.0)
    .attr("dominant-baseline", "middle")
    .text( (d) => trim(d, 20) )
    .attr("fill", "black")
   .call(highlight.bind(null, "y_"))

  // behavior

  d3.select("#order").on("change", function() {
//    clearTimeout(timeout)
    order(this.value)
  })

  function highlight(prefix, sel) {
    sel.on("mouseover", (d) => {
      d3.selectAll(".cell.selected").classed("selected", false)
      d3.selectAll(".cell." + prefix + to_class(d)).classed("selected", true)
    })
  }

  function order(value) {
    scale.domain(orders[value]);

    var t = svg.transition().duration(2500);

    t.selectAll(".x_labels g")
        .delay(function(d, i) { return scale(i) * 4; })
        .attr("transform", (d, i) => "translate(" + (scale(i) + 5) + ",-5)rotate(-55)")

    t.selectAll(".cell")
        .delay(function(d) { return scale(d.i) * 4; })
        .attr("transform", (d) => "translate(" + scale(d.i) + "," + (padding + scale(d.j)) + ")" )
//        .attr("opacity", (d) => (d.i > d.j) ? "1.0" : "0.5" )

    t.selectAll(".y_labels text")
        .delay(function(d, i) { return scale(i) * 4; })
        .attr("y", (d,i) => padding + scale(i))
  }

  function update() {
    var details = d3.select(".toggle input").property("checked")

    if(details) {
      svg.selectAll(".matrix circle")
        .transition()
          .attr("visibility", "visible")
      svg.selectAll(".matrix .sum")
          .attr("stroke", "grey")
          .attr("width", scale.rangeBand())
          .attr("height", scale.rangeBand())
          .attr("fill", "transparent")
          .attr("opacity", "0.2")

    } else {
      svg.selectAll(".matrix circle")
        .transition()
        .attr("visibility", "hidden")
      svg.selectAll(".matrix .sum")
          .attr("stroke", "none")
          .attr("width", (d) => sizescale( size(d.i,d.j) ))
          .attr("height", (d) => sizescale( size(d.i,d.j) ))
          .attr("fill", (d) => {
            var b = bal(d.i, d.j)
            return colorscale(b)
          })
          .attr("opacity", (d) => size(d.i,d.j) > 0 ? "1.0" : "0.2")
    }
  }

  update()

  d3.select(".toggle")
    .on("change", update)
})