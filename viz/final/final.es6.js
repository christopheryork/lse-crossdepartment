//
// Cross-Departmental Research and Teaching DV
//
// (c) London School of Economics 2016
//
//     Christopher York
//     Communications Division
//     C.York@lse.ac.uk
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

  var timeout

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

    viz.filter( (d) => d === cur_viz)
       .call(render[cur_viz], cur_order)

    viz.transition()
       .duration(500)
       .attr("opacity", (d) => d === cur_viz ? 1 : 0)
  }


  // layout entire application

  function relayout(minWidth) {
    width = minWidth - margins.right
    height = minWidth * 0.7 - margins.bottom

    svg.attr("width", width)
       .attr("height", height)

    d3.keys(render).forEach( (viz) => {
      render[viz].relayout()
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
       .on("click", (d) => show(d, cur_order))

    viz_li.classed("selected", (d) => d === viz)
  }


  // order selector

  function render_order(order) {

    // TODO.  generate the order HTML using D3?

    d3.select('#order input[value="' + order + '"]').property('checked', true)

    d3.select("#order").on("change", function(d) {
      var order = d3.select('#order :checked').node().value
      clearTimeout(timeout)
      show(cur_viz, order)
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

    var legend_cell = 7,
        legend_packing = 1,
        cell_packing = 4, // should be ceiling(sqrt(max count of links))
        cell_padding = 1,
        stroke_width = 1.0,
        trim_value = 27,
        research_color_1 = "red",
        research_color_2 = "yellow",
        neutral_color = "gray",
        empty_color = "#dadad9",
        teaching_color = "#35b7e5"

    var points = d3.merge(d3.range(n).map( (i) => d3.range(n).map( (j) => {
      return { i: i, j: j}
    })))

    var links_matrix = matrix_add(research_matrix, teaching_matrix),
        links_sum = links_matrix.map(sum),
        balance_matrix = matrix_subtract(research_matrix, teaching_matrix),
        balance_sum = balance_matrix.map(sum)

    var orders = {
      department: d3.range(n).sort( (a, b) => d3.ascending(dept_names[a], dept_names[b])),
      faculty: d3.range(n).sort( (a, b) => faculty[b] - faculty[a] ),
      links: d3.range(n).sort( (a, b) => links_sum[b] - links_sum[a] ),
      emphasis: d3.range(n).sort( (a, b) => balance_sum[b] - balance_sum[a])
    }

    var scale = d3.scale.ordinal()

    var colorscale = d3.scale.linear()
      .domain([-9, -2, 0, 4.5, 9])
      .range([teaching_color, teaching_color, neutral_color, research_color_1, research_color_2])

    var sizescale = d3.scale.linear()
      .domain([0, 11])  // should be max count of links

    var csd = colorscale.domain()

    var chart = function(g, order) {

      scale.domain(orders[order])

      sizescale.range([3, scale.rangeBand()])

      g.attr("transform", "translate(0,100)")

      // cells (links)

      var cell = g.selectAll(".cell")
          .data(points)

      var cell_enter = cell.enter()
          .append("g")
            .attr("class", (d) => "cell x_" + to_class(dept_names[d.i]) + " y_" + to_class(dept_names[d.j]) + " no_advance")
            .attr("transform", (d) => "translate(" + scale(d.i) + "," + scale(d.j) + ")" )
            .attr("fill", "transparent")

      cell_enter.append("title")
        .text((d) => dept_names[d.i] + " & " + dept_names[d.j] +
                   "\nResearch: " + research_matrix[d.i][d.j] +
                   ", Teaching: " + teaching_matrix[d.i][d.j])

      cell_enter.append("rect")
        .attr("class", "background")
        .attr("rx", 1)
        .attr("ry", 1)
        .attr("stroke", "none")
        .attr("width", scale.rangeBand())
        .attr("height", scale.rangeBand())
        .attr("opacity", 0.2)
        .attr("fill", "none")

      cell_enter.append("rect")
        .attr("class", "sum")
        .attr("rx", 1)
        .attr("ry", 1)

      cell_enter.selectAll(".sum")
          .attr("stroke", "none")
          .attr("x", (d) => scale.rangeBand() / 2.0 - sizescale( links_matrix[d.i][d.j] ) / 2.0)
          .attr("y", (d) => scale.rangeBand() / 2.0 - sizescale( links_matrix[d.i][d.j] ) / 2.0)
          .attr("width", (d) => sizescale( links_matrix[d.i][d.j] ))
          .attr("height", (d) => sizescale( links_matrix[d.i][d.j] ))
          .attr("fill", (d) => {
            return links_matrix[d.i][d.j] > 0 ? colorscale(balance_matrix[d.i][d.j]) : empty_color
          })
          .attr("opacity", 1.0)

      // rules (nodes)

      var xlabs = g.selectAll(".x.labels")
        .data(dept_names)
       .enter().append("g")
        .attr("class", "x labels no_advance")
        .attr("transform", (d, i) => "translate(" + (scale(i) + 5) + ",-15)rotate(-45)")

      xlabs.append("rect")
        .attr("fill", "transparent")
        .attr("width", 200)
        .attr("height", scale.rangeBand())

      xlabs.append("text")
        .attr("class", (d, i) => "dept" + i)
        .attr("dominant-baseline", "middle")
        .attr("dy", scale.rangeBand() / 2.0)
        .text( (d) => trim(d, trim_value))
        .attr("fill", "black")

      xlabs.call(highlight.bind(null, "x_"))

      var ylabs = g.selectAll(".y.labels")
        .data(dept_names)
       .enter().append("g")
        .attr("class", "y labels no_advance")
        .attr("transform", (d,i) => "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")")

      ylabs.append("rect")
        .attr("fill", "transparent")
        .attr("width", 200)
        .attr("height", scale.rangeBand())

      ylabs.append("text")
        .attr("class", (d,i) => "dept" + i)
        .attr("dominant-baseline", "middle")
        .attr("dy", scale.rangeBand() / 2.0)
        .text( (d) => trim(d, trim_value))
        .attr("fill", "black")

      ylabs.call(highlight.bind(null, "y_"))

      // legends

      var tick = g.selectAll(".tick")
          .data(d3.range(d3.min(csd), d3.max(csd)))
        .enter().append("g")
          .attr("class", "tick")
          .attr("transform", (d,i) => "translate(-150," + (50 + (legend_cell + legend_packing) * i) +  ")")

      tick.append("rect")
            .attr("width", legend_cell)
            .attr("height", legend_cell)
            .attr("fill", (d) => colorscale(d))

      tick.append("g")
        .append("text")
          .attr("dominant-baseline", "hanging")
          .attr("dx", legend_cell * 1.5)
          .attr("fill", "black")
          .text( (d, i) => i === 0 ? "more teaching links" : d === 0 ? "balanced" : d === d3.max(csd) - 1 ? "more research links" : "")

      var ssd = sizescale.domain()
      var tick2 = g.selectAll(".tick2")
         .data(d3.range(ssd[0], ssd[1], 2))
        .enter().append("g")
         .attr("class", "tick2")
         .attr("transform", (d,i) => "translate(-150," + (scale.rangeBand() * i + 200) + ")")

      tick2.append("rect")
         .attr("x", (d,i) => scale.rangeBand() / 2.0 - sizescale(i) / 2.0)
         .attr("y", (d,i) => scale.rangeBand() / 2.0 - sizescale(i) / 2.0)
         .attr("width", (d,i) => sizescale(i) )
         .attr("height", (d,i) => sizescale(i) )
         .attr("fill", neutral_color)

      tick2.append("text")
        .attr("dx", scale.rangeBand() * 1.2)
        .attr("dy", scale.rangeBand() / 2.0)
        .attr("dominant-baseline", "middle")
        .text( (d, i) => d + (i === 0 ? " total links" : ""))

      // animation

      var trans = g.transition().duration(2500)

      trans.selectAll(".x.labels")
          .delay(function(d, i) { return scale(i) * 4; })
          .attr("transform", (d, i) => "translate(" + (scale(i) + 5) + ",-15)rotate(-45)")

      trans.selectAll(".cell")
          .delay(function(d) { return scale(d.i) * 4; })
          .attr("transform", (d) => "translate(" + scale(d.i) + "," + scale(d.j) + ")" )

      trans.selectAll(".y.labels")
          .delay(function(d, i) { return scale(i) * 4; })
          .attr("transform", (d,i) => "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")")

      // behavior

      function highlight(prefix, sel) {
        sel.on("mouseover", (d) => {
          d3.selectAll(".cell.selected").classed("selected", false)
          d3.selectAll(".cell." + prefix + to_class(d)).classed("selected", true)
        })
      }

    }

    chart.relayout = function () {
      scale.rangeRoundBands([0, width - margins.left - margins.right], 0.1)
    }

    return chart
  }


  // initial layout and first render

  relayout(window.innerWidth)
  show('chord', 'department')
  timeout = setTimeout(advance, firstSlide)

})


// Utility functions

function trim(s, n) {
  return (s.length > n) ? (s.slice(0,n-3)+"...") : s
}

function to_class(s) {
  return s.toLowerCase().replace(/\W/g, '_')
}

// Matrix manipulation

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