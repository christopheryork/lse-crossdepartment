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

  var rows = 6,
      radius = 50,
      r_padding = 0.3,
      h_padding = 35,
      v_padding = 10,
      chord_width = 0.05,
      thickness = 5,
      focus_thickness = 3,
      chord_padding = 1,
      trim_value = 20,
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

  var offset = (i) => {
    return [ radius + ((radius * 2.0) + h_padding) * (i % rows),
             radius + ((radius * 2.0) + v_padding * 3) * 2 * Math.floor(i/rows) ]
  }

  var svg = d3.select("body").append("svg")
        .attr("width", ((radius * 2.0) + h_padding) * rows + border.left + border.right)
        .attr("height", ((radius * 2.0) + v_padding * 3) * 2 * (Math.floor(dept_names.length/rows)+1) + border.top + border.bottom)
      .append("g")
        .attr("transform", "translate(" + border.left + "," + border.top + ")")

  svg.append("g")
    .attr("class", "modes")
    .selectAll("g")
      .data(d3.range(0, Math.floor(dept_names.length/rows) + 1))
    .enter().append("g")
      .attr("transform", (d,i) => "translate(0," + (radius + ((radius * 2.0) + v_padding * 3) * 2 * i) + ")")
    .selectAll("text")
      .data(['research', 'teaching'])
    .enter()
        .append("text")
        .attr("class", "label")
        .attr("text-anchor", "end")
        .attr("dx", -15)
        .attr("y", (d,i) => ((radius * 2) + v_padding) * i)
        .text( (d) => trim(d, trim_value) )

  var pair = svg.selectAll(".pair")
      .data(dept_names)
    .enter()
      .append("g")
        .attr("class", d => "pair " + d)
        .attr("transform", (d,i) => "translate(" + offset(i) + ")")

  pair.append("text")
    .attr("class", "label")
    .attr("text-anchor", "middle")
    .attr("dy", -(radius + v_padding))
    .text( (d) => trim(d, trim_value) )

  var radial = pair
    .selectAll(".radial")
      .data( (dept) => ['research', 'teaching'].map( (mode) => { return { mode: mode, dept: dept }}))
    .enter()
      .append("g")
        .attr("class", (d) => "radial " + d.mode)
        .attr("transform", (d) => "translate(0," + (d.mode === 'research' ? 0.0 : radius * 2.0 + v_padding ) + ")" )

  radial.append("g")
    .selectAll(".arc")
      .data( (d) => dept_names.map( (dn) => { return { focus: d.dept, dept: dn } }))
    .enter()
      .append("path")
        .attr("class", "arc")
        .attr("d", arc
             .innerRadius( (d) => radius - thickness + (d.focus === d.dept ? focus_thickness / 2.0 : 0.0 ))
             .outerRadius( (d) => radius + (d.focus === d.dept ? focus_thickness : 0.0 ))
        )
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
