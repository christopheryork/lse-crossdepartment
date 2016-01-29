// This file must be pre-processed for Safari, as it uses arrow functions.

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

  var width, height,
      innerRadius, outerRadius, chordRadius, labelRadius

  var margins = { top: 0, left: 150, right: 50, bottom: 0 }

  var svg = d3.select("body").append("svg")

  var g = svg.append("g")
        .attr("transform", "translate(" + margins.left + "," + margins.top + ")")


  function add_nodes(elem) {
    elem = elem.selectAll("g")
       .data(dept_names)
      .enter()
       .append("g")
       .attr("class", "dept")

    elem.append("text")
      .text( (d) => d )

    elem.append("path")
  }

  var nodes1 = g.append("g").call(add_nodes)
  var nodes2 = g.append("g").call(add_nodes)


  // render different views of data

  function render_common() {
    svg.attr("width", width + margins.left + margins.right)
       .attr("height", height + margins.top + margins.bottom)
  }

  function render_matrix() {
    render_common()
  }

  function render_chords() {
    render_common()
  }

  var render = {
    matrix: render_matrix,
    chords: render_chords
  }


  // select current view

  function show(d) {
    d3.selectAll("#viz li")
      .classed("selected", false)
    d3.select("#viz #" + d)
      .classed("selected", true)
    render[d].call()
  }

  d3.select("#viz")
     .selectAll("li")
    .data(d3.keys(render))
     .enter().append("li")
      .attr("id", (d) => d)
      .text((d) => d)
     .on("click", show)


  // layout

  function relayout(minWidth) {
    width = minWidth - margins.left - margins.right
    height = minWidth * 0.7 - margins.top - margins.bottom

    innerRadius = Math.min(width / 2.0, height) * .41
    outerRadius = innerRadius * 1.05
    chordRadius = innerRadius * 0.99
    labelRadius = innerRadius * 1.1
  }

  window.onresize = function() {
    var v_id = d3.select("#viz li.selected").attr("id"),
        v_fn = render[v_id]

    relayout(window.innerWidth)
    if(v_fn) { v_fn.call() }
  }


  // initial state

  relayout(window.innerWidth)
  show(d3.keys(render)[0])

})


// Utility functions

function empty_matrix(n) {
  return d3.range(0,n).map( () => {
    return d3.range(0,n).map( () => 0.0 )
  })
}

function total(matrix, i) {
  return matrix[i].reduce( (a,b) => a+b )
}