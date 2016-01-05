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

queue().defer(d3.csv, "../data-6.1,6.3.csv")
       .defer(d3.csv, "../data-6.2.csv")
       .defer(d3.csv, "../data-6.4.csv")
       .await( (err, depts, research, teaching) => {
  if(err) { throw err }

  // convert data from JSON to javascript types
  research.forEach( (d) => d.links = +d.links )
  teaching.forEach( (d) => d.links = +d.links )

  // prepare list of nodes; should be a superset of depts list
  var rd1 = research.map( (d) => d.department1 )
  var rd2 = research.map( (d) => d.department2 )
  var td1 = teaching.map( (d) => d.department1 )
  var td2 = teaching.map( (d) => d.department2 )
  var dept_names = d3.set([].concat(rd1).concat(rd2).concat(td1).concat(td2)).values()
  dept_names.sort()
  var n = dept_names.length

  var official = depts.map( (d) => d.department )

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

  // prepare layout

  var radius = 50,
      padding = 10,
      chord_width = 0.05,
      thickness = 5,
      chord_padding = 1,
      trim_value = 15,
      research_color = "#f16913",
      neutral_color = "gray",
      teaching_color = "#08519c",
      border = { top: 20, right: 0, bottom: 0, left: 50 };

  var research_totals = research_matrix.map( (d) => d.reduce( (x,y) => x + y, 0.0 ))
  var teaching_totals = teaching_matrix.map( (d) => d.reduce( (x,y) => x + y, 0.0 ))

  var m = ([]).concat(research_totals).concat(teaching_totals).reduce( (x,y) => x + y, 0.0)
  var k = 2 * Math.PI / m

  function angle(i) {
    var r = research_totals.slice(0,i).reduce( (x,y) => x + y, 0.0)
    var t = teaching_totals.slice(0,i).reduce( (x,y) => x + y, 0.0)
    return (r + t) * k
  }

  function centroid(i) {
    var startAngle = angle(i)
    var endAngle = angle(i+1)
    var center = (startAngle + endAngle) / 2.0
    return { startAngle: center - chord_width,
             endAngle: center + chord_width }
  }

  // visualization proper

  var arc = d3.svg.arc()
    .innerRadius(radius - thickness)
    .outerRadius(radius)
    .startAngle( (d,i) => angle(i))
    .endAngle( (d,i) => angle(i+1))

  var chord = d3.svg.chord()
    .radius(radius - thickness - chord_padding)
    .source( (d) => {
      var i = dept_names.indexOf(d.department1)
      return centroid(i)
    })
    .target( (d) => {
      var i = dept_names.indexOf(d.department2)
      return centroid(i)
    })

  var fill = d3.scale.category20c()
    .domain(d3.range(n))

  var svg = d3.select("body").append("svg")
        .attr("width", (radius * 2.0 + padding) * dept_names.length + border.left + border.right)
        .attr("height", (radius * 2.0 + padding) * 2 + border.top + border.bottom)
      .append("g")
        .attr("transform", "translate(" + border.left + "," + border.top + ")")

  var x_label = svg.append("g")
      .attr("class", "x_label")
    .selectAll("text")
      .data(dept_names)
    .enter().append("text")
      .attr("text-anchor", "middle")
      .attr("x", (d,i) => (radius + ((radius * 2.0) + padding) * i))
      .attr("dy", -5)
      .text( (d) => trim(d, trim_value) )

  var pair = svg.selectAll(".pair")
      .data(['research', 'teaching'])
    .enter()
      .append("g")
        .attr("class", d => "pair " + d)
        .attr("transform", (d,i) => "translate(0," + (radius + ((radius * 2.0) + padding) * i) + ")")

  pair.append("text")
    .attr("class", "y_label")
    .attr("text-anchor", "end")
    .attr("dx", -5)
    .text( (d) => trim(d, trim_value) )

  var radial = pair
    .selectAll(".radial")
      .data( (mode) => dept_names.map( (d) => { return { mode: mode, dept: d }}))
    .enter()
      .append("g")
        .attr("class", (d) => "radial " + d.dept)
        .attr("transform", (d,i) => "translate(" + (radius + ((radius * 2.0) + padding) * i) + ",0)" )

  radial.append("g")
    .selectAll(".arc")
      .data(dept_names)
    .enter()
      .append("path")
        .attr("class", "arc")
        .attr("d", arc)
        .attr("fill", (d,i) => fill(i))

  radial.append("g")
    .selectAll(".chord")
      .data((d) => {
        var i = dept_names.indexOf(d.dept)
        var links = (d.mode === 'teaching' ? teaching_matrix[i] : research_matrix[i]) || []
        var chords = []
        links.forEach( (l,i) => {
          if(l > 0) {
            chords.push( {department1: d.dept, department2: dept_names[i], links: l} )
          }
        })
        return chords
      })
    .enter()
      .append("path")
        .attr("class", "chord")
        .attr("d", chord)
        .attr("fill", (d) => fill( dept_names.indexOf(d.department2) ) )
})
