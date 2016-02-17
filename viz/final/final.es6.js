//
// Cross-Departmental Research and Teaching DV
//
// (c) Christopher York 2016
//     Communications Division
//     London School of Economics
//

// This file must be pre-processed for Safari, as it uses arrow functions.

// TODO
//   - chord colors during selection should be by *opposite* dept color   DONE
//   - relayout on resize of window                                       DONE
//   - each view in a separate group, fade in on select
//   - move through modes on a timer                                      DONE
//   - shouldn't advance modes during hover on a department               DONE
//   - faculty sorting for dual chord                                     DONE


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


  // extract faculty counts per department

  var faculty = d3.range(n).map( () => 0)
  depts.forEach( (d) => faculty[dept_names.indexOf(d.department)] = d.faculty)


  // prepare the data matrices

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

  var sum = (vector) => vector.reduce( (a,b) => a+b, 0.0)
  var matrix_add = lift( (a,b) => a+b )
  var matrix_subtract = lift( (a,b) => a-b )

  var research_matrix = populate(research, constant_matrix(n))
  var teaching_matrix = populate(teaching, constant_matrix(n))


  // application state

  var cur_viz,
      cur_order


  // cross-visualization configuration

  var width, height

  var margins = { top: 0, left: 150, right: 50, bottom: 0 },
      firstSlide = 2500,
      slideSpeed = 7500,
      orders = [ 'department', 'links', 'emphasis', 'faculty' ]

  var svg = d3.select("body")
    .append("svg")

  var svg_g = svg.append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")")


  // timer cycling through available orders

  var timeout = setTimeout(advance, firstSlide)

  function advance() {
    var i = orders.indexOf(cur_order)
    var next_order = orders[ (i + 1) % orders.length ]

    var hover_count = 0
    d3.select(".no_advance:hover").each( () => ++hover_count )

    if(hover_count === 0) {
      show(cur_viz, next_order)
    }

    timeout = setTimeout(advance, slideSpeed)
  }


  // transition application state

  function show(viz, order) {
    cur_viz = viz
    cur_order = order

    render_all()
  }


  // render complete tree of components

  var render = {
    chord: render_dual(),
    matrix: render_matrix()
  }

  function render_all() {
    render_viz_selector(cur_viz)
    render_order(cur_order)

    var viz = svg_g.selectAll(".viz")
      .data(d3.keys(render))

    viz.enter().append("g")
      .attr("class", "viz")

    viz.attr("visibility", (d) => d === cur_viz ? "visible" : "hidden")

    viz.filter( (d) => d === cur_viz )
       .call(render[cur_viz], cur_order)
  }


  // layout entire application

  function relayout(minWidth) {
    width = minWidth - margins.right
    height = minWidth * 0.7 - margins.bottom

    svg.attr("width", width)
       .attr("height", height)

    d3.keys(render).forEach( (key) => {
      render[key].relayout()
    })
  }

  window.onresize = function() {
    relayout(window.innerWidth)
    render_all()
  }


  // viz selector

  function render_viz_selector(viz) {
    var viz_li = d3.select("#viz")
       .selectAll("li")
      .data(d3.keys(render))

    viz_li.enter().append("li")
        .attr("id", (d) => d)
        .text((d) => d)
       .on("click", show)

    viz_li.classed("selected", (d) => d === viz)
  }


  // order selector

  function render_order(order) {

    // TODO.  generate the order HTML using D3?

    d3.select('#order input[value="' + order + '"]').property('checked', true)

    d3.select("#order").on("change", function(d) {
      var order = d3.select('#order :checked').node().value
      show(cur_viz, order)
      clearTimeout(timeout)
    })
  }


  // dual-chord viz

  function render_dual() {

    var innerRadius, outerRadius, chordRadius, labelRadius

    const padAngle = 0.01,
          chordWidth = 0.04,
          mode_dur = 750

    var fill = d3.scale.category20c()
      .domain(d3.range(0, n))

    var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)

    var label_arc = d3.svg.arc()
      .innerRadius(labelRadius)
      .outerRadius(outerRadius)

    var chord = d3.svg.chord()
      .radius(chordRadius)

    var dominant_arc = (d) => d3.min([d.source_index, d.target_index])
    var linked_to = (d, i) => d.source_index === i || d.target_index === i

    function arc_center(d, width) {
      width = width || 0.1
      var c = d3.mean([d.startAngle, d.endAngle]),
          s = d3.max([d.startAngle, c - width]),
          t = d3.min([c + width, d.endAngle])

      return { startAngle: s, endAngle: t }
    }

    function calc_links(data, node_positions) {
      var links = []
      var i=-1; while(i++<n-1) {
        var j=-1; while(j++<i-1) {
          var val = data[i][j]
          if(val > 0) {
            links.push({ source: arc_center(node_positions[i], chordWidth),
                         target: arc_center(node_positions[j], chordWidth),
                         value: val,
                         source_index: i,
                         target_index: j})
          }
        }
      }
      return links
    }

    var pie = d3.layout.pie()
      .padAngle(padAngle)

    var sortsum = (a,b) => d3.descending( sum(a), sum(b) )

    var layouts = {
      department: pie.sort(null).value(Number)( d3.range(0,n).map(d3.functor(1)) ),
      faculty:    pie.sort(d3.ascending).value(Number)( faculty.map( (d) => d || 0) ),
      links:      pie.sort(sortsum).value(sum)( matrix_add(research_matrix, teaching_matrix) ),
      emphasis:   pie.sort(sortsum).value(sum)( matrix_subtract(research_matrix, teaching_matrix) )
    }

    function update(g, order) {

      // update chords layout
      var node_positions = layouts[order]

      // transition nodes (department arcs)

      var node = g.selectAll(".dept")
          .data(node_positions)

      node.exit().remove()          // never actually used

      var node_g = node.enter().append("g")
          .attr("class", (d) => "dept no_advance")

      node_g.append("path")
        .attr("fill", (d,i) => fill(i))

      node_g.append("text")
        .attr("opacity", 0)

      var trans = node.transition()
        .duration(mode_dur)

      trans.select("path")
          .attrTween("d", function(d) { // "this" below requires function...
            var interp = d3.interpolate(this._current || d, d)
            this._current = d
            return (t) => arc(interp(t))
          })

      trans.select("text")
        .attr("transform", (d) => "translate(" + label_arc.centroid(d) + ")" )
        .attr("text-anchor", (d) => arc_center(d, chordWidth).startAngle < Math.PI ? "start" : "end")
        .text( (d, i) => trim(dept_names[i], 27))

      // transition links (chords)

      var link = g.selectAll(".link")
          .data((matrix) => calc_links(matrix, node_positions),
                (d) => [d.source_index, d.target_index].join("x"))

      link.exit()
        .transition()
          .duration(mode_dur)
          .attr("opacity", 0)
        .remove()

      link.enter()
        .append("path")
          .attr("class", "link")
          .attr("fill", (d) => fill(dominant_arc(d)))
          .attr("opacity", 0)

      link.transition()
        .duration(mode_dur)
          .attr("opacity", 1)
          .attrTween("d", function(d) { // "this" below requires function...
            var interp = d3.interpolate(this._current || d, d)
            this._current = d
            return (t) => chord(interp(t))
          })
    }

    function focus(g, d0, i0) {
      // collect list of linked departments
      var affiliated = d3.set()
      g.selectAll(".link")
        .filter( (d) => linked_to(d, i0) )
        .each( (d) => { affiliated.add(d.source_index); affiliated.add(d.target_index) })

      // transition graph
      var trans = g.transition()
      trans.selectAll(".dept text")
        .attr("opacity", (d,i) => affiliated.has(i) || i === i0 ? 1 : 0)
      trans.selectAll(".link")
        .attr("opacity", (d,i) => linked_to(d, i0) ? 1 : 0.05)
        .attr("fill", (d) => linked_to(d, i0) ? fill(i0) : fill(dominant_arc(d, i0)) )
    }

    function defocus() {
      var trans = d3.select(this).transition()
      trans.selectAll(".link")
        .attr("fill", (d) => fill(dominant_arc(d)))
        .attr("opacity", 1)
      trans.selectAll(".dept text")
        .attr("opacity", 0)
    }

    var chart = function(g, order) {
      var chord = g.selectAll(".chord")
        .data([research_matrix, teaching_matrix])

      chord.enter().append("g")
        .attr("class", "chord")

      chord.attr("transform", (d,i) => "translate(" + (labelRadius * 2 * i + labelRadius) + "," + labelRadius + ")")
           .call(update, order)

      var depts = chord.selectAll(".dept")

      depts.on("mouseenter", focus.bind(null, chord))
           .on("mouseout", defocus)
    }

    chart.relayout = function() {
      innerRadius = Math.min((width - 100) / 2.0, height) * .41
      outerRadius = innerRadius * 1.05
      chordRadius = innerRadius * 0.99
      labelRadius = innerRadius * 1.15

      arc.innerRadius(innerRadius)
         .outerRadius(outerRadius)

      label_arc.innerRadius(labelRadius)
               .outerRadius(outerRadius)

      chord.radius(chordRadius)
    }

    return chart
  }


  function render_matrix() {

    var chart = function(g, order) {
      var elems = g.selectAll("text").data([order])

      elems.enter().append("text")

      elems.attr("x", width / 2)
           .attr("y", height / 2)
           .text( (d) => d )
    }

    chart.relayout = function () {
    }

    return chart
  }


  // initial layout and first render

  relayout(window.innerWidth)
  show('chord', 'department')

})


// Utility functions

function trim(s, n) {
  return (s.length > n) ? (s.slice(0,n-3)+"...") : s
}

function constant_matrix(n, c) {
  c = c || 0.0
  return d3.range(0,n).map( () => {
    return d3.range(0,n).map( () => c )
  })
}

function lift(fn) {
  return function(a,b) {

    var n = a.length,
        c = constant_matrix(n)

    var i=-1; while(i++<n-1) {
      var j=-1; while(j++<n-1) {
        c[i][j] = fn(a[i][j], b[i][j])
      }
    }

    return c
  }
}