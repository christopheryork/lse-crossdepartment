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

//   - why do new links occasionally appear on focus?                     DONE
//     also gradients go off  e.g. faculty limited to 3                   DONE
//   - code cleanup: keep version where paths disappear                   DONE
//   - move metrics to tspans after labels                                DONE

//   - correct data: some faculty counts are 0                            DONE
//   - focus during transition causes craziness                           DONE
//   - interpolation error for balance on dual                            DONE

//   - attach chord links to appropriate arcs                             DONE
//   - correctly delayed interpolation for chord links                    DONE
//   - format R + T key labels in chord diagram                           DONE

//   - first chord is not focusing (probably a Javascript if(0) problem)  DONE

//   - pie layout sorting is incorrect: see "EDUCATION UCL"               DONE
//   - only display the novel metrics in the axes                         DONE
//   - improve formatting of balance labels                               DONE

//   - speed tweak: add/remove visualizations instead of using visible    DONE
//   - never advance while focused, never focus while advancing
//   - labels for dual chord should not repeat                            DONE
//   - moving quickly over focus occasionally overrides labels            DONE?

//   - chords: keep focused through selection of new layout               NOT TO DO
//   - arcs: on focus, show dept label and metric                         NOT TO DO
//   - arc click: show labels of affiliated depts                         NOT TO DO
//   - highlight the root department?                                     DONE
//   - description of project at bottom
//   - chord titles shouldn't disappear                                   DONE
//   - invisible arcs behind for mouse events?                            DONE

//   - hover space that is larger than arc                                DONE
//   - chord colors during selection should be by *opposite* dept color   DONE
//   - relayout on resize of window                                       DONE
//   - each view in a separate group, fade in on select                   DONE
//   - move through modes on a timer                                      DONE
//   - shouldn't advance modes during hover on a department               DONE
//   - faculty sorting for dual chord                                     DONE

//   - non-directed graph, so chords should be gradient colored           DONE
//   - problems mousing in and out of chords / out of sync                DONE
//   - labels should only appear for local chords                         DONE
//   - arcs should transition in a progressive fashion?
//   - space for labels at top of chords                                  DONE
//   - when a transition occurs during a hover, chords go out of order    DONE
//   - put values next to departments                                     DONE
//   - move viz selector into title line                                  DONE
//   - add "explore the data" to title                                    DONE
//   - add "research" & "teaching" titles to chord diagrams               DONE
//   - rename "chord" & "matrix"                                          DONE
//   - outer margins need adjusting                                       DONE
//   - minimum sizes for each visualization                               DONE
//   - keep viz selector on the same line when window small               DONE
//   - chords slow with gradients turned on                               DONE

//   - matrix needs to rescale after window resize                        DONE
//   - matrix is cut off on right                                         OLD PROBLEM
//   - matrix should scroll with labels?

//   - small multiples with new label layout scheme

"use strict";

queue().defer(d3.csv, "../data-6.1,6.3.csv")
       .defer(d3.csv, "../data-6.2.csv")
       .defer(d3.csv, "../data-6.4.csv")
       .await( (err, depts, research, teaching) => {
  if(err) { throw err }


  // convert data from JSON to javascript types
  depts.forEach( (d) => { d.faculty = +d.faculty; d.research_links = +d.research_links; d.teaching_links = +d.teaching_links })
  research.forEach( (d) => d.links = +d.links )
  teaching.forEach( (d) => d.links = +d.links )


  // prepare department names & faculty count per department

  let dept_names = uniq( research.map( (d) => d.department1 ),
                         research.map( (d) => d.department2 ),
                         teaching.map( (d) => d.department1 ),
                         teaching.map( (d) => d.department2 ) )
  let n = dept_names.length
  let faculty = d3.range(n).map( () => 0 )
  depts.forEach( (d) => faculty[ dept_names.indexOf(d.department) ] = d.faculty )


  // prepare the data matrices

  const sum = (vector) => vector.reduce( (a,b) => a+b, 0.0 )
  const matrix_add = lift( (a,b) => a+b )
  const matrix_subtract = lift( (a,b) => a-b )

  const populate_departments = populate.bind( null, (x) => dept_names.indexOf(x.department1),
                                                    (x) => dept_names.indexOf(x.department2),
                                                    (x) => x.links )

  let research_matrix = populate_departments(research, constant_matrix(n))
  let teaching_matrix = populate_departments(teaching, constant_matrix(n))

  let research_sum = research_matrix.map(sum)
  let teaching_sum = teaching_matrix.map(sum)

  let links_matrix = matrix_add(research_matrix, teaching_matrix)
  let links_sum = links_matrix.map(sum)
  let balance_matrix = matrix_subtract(research_matrix, teaching_matrix)
  let balance_sum = balance_matrix.map(sum)

  let links_max = d3.max(links_matrix, (v) => d3.max(v))


  // application state

  let cur_viz, cur_order


  // cross-visualization configuration

  const margins = { top: 0, left: 150, right: 0, bottom: 0 }
  const min_width = 800

  const first_slide_pause = 2500
  const n_slide_pause = 7500
  const slide_transition_dur = 500


  let width

  let svg = d3.select("svg")

  let svg_g = svg.append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")")


  // timer cycling through orders

  // convention: the timer will not advance while the mouse is hovering over any element
  //             with the class "no_advance"

  let timeout

  function advance() {
    let keys = d3.keys(orders)
    let i = keys.indexOf(cur_order)
    let next_order = keys[ (i + 1) % keys.length ]

    let hover_count = 0
    d3.select(".no_advance:hover").each( () => ++hover_count )

    if(hover_count === 0) {
      show(cur_viz, next_order)
    }

    timeout = setTimeout(advance, n_slide_pause)
  }


  // transition application state and render everything

  function show(viz, order) {
    cur_viz = viz
    cur_order = order

    render_all()
  }


  // order selector

  const format_number = (n) => !isNaN(n) ? d3.format("d")(n) : null
  let orders =  {
    department: { label: 'department',
                  weights: d3.range(0,n).map( () => 1),
                  sorted: d3.range(0,n).sort( (a,b) => d3.ascending(dept_names[a], dept_names[b]) ),
                  ticks: d3.range(0,n).map( (i) => dept_names[i].charAt(0) ) },
    faculty:    { label: 'faculty size',
                  weights: faculty.map( (d) => d || 0),
                  sorted: d3.range(0,n).sort( (a,b) => d3.descending(faculty[a], faculty[b]) ),
                  ticks: d3.range(0,n).map( (i) => format_number(faculty[i]) ) },
    links:      { label: 'count of links',
                  weights: links_sum,
                  sorted: d3.range(0,n).sort( (a,b) => d3.descending(links_sum[a], links_sum[b]) ),
                  ticks: d3.range(0,n).map( (i) => format_number(links_sum[i]) ) },
    emphasis:   { label: 'link balance',
                  weights: balance_sum,
                  sorted: d3.range(0,n).sort( (a,b) => d3.descending(balance_sum[a], balance_sum[b]) ),
                  ticks: d3.range(0,n).map( (i) => {
                    let v = balance_sum[i]
                    let prefix = (v > 0) ? 'R+' : (v < 0) ? 'T+' : ''
                    return prefix + Math.abs(v)
                  }),
                  hints: d3.range(0,n).map( (i) => 'R ' + research_sum[i] + ' - T ' + teaching_sum[i] ) }
  }


  // calculate list of only major ticks for each order
  d3.keys(orders).forEach( (key) => {
    let config = orders[key]
    let major = d3.set( config.sorted.slice(0,1) )
    for(let i=1; i<n; i++) {
      let j = config.sorted[i-1]
      let k = config.sorted[i]
      if(config.ticks[j] !== config.ticks[k])
        major.add(k)
    }
    orders[key].major_ticks = major
  })

  function render_order(order) {
    let order_div = d3.select("#order dd")
        .selectAll("div")
        .data(d3.keys(orders))

    let order_div_e = order_div.enter().append("div")
    order_div_e.append("input")
        .attr("id", (d) => d )
        .attr("type", "radio")
        .attr("name", "order")
        .attr("value", (d) => d)
    order_div_e.append("label")
        .attr("for", (d) => d )
        .text( (d) => orders[d].label )

    order_div.select("input")
        .property("checked", (d) => d === order )
  }

  d3.select("#order").on("change", () => {
    let new_order = d3.select("#order input:checked").node().value
    clearTimeout(timeout)
    if(new_order !== cur_order) {
      show(cur_viz, new_order)
    }
  })


  // render complete tree of visualizations

  const visualizations = {
    chord: { label: 'By Department', component: render_dual() },
    matrix: { label: 'All the Data', component: render_matrix() }
  }


  function render_all() {
    render_viz_selector(cur_viz)
    render_order(cur_order)

    d3.select("body")
      .attr("class", cur_viz + " " + cur_order)

    let viz = svg_g.selectAll(".viz")
      .data([cur_viz], (key) => key)

    viz.exit()
      .transition()
        .duration(slide_transition_dur)
        .attr("opacity", 0)
      .remove()

    viz.enter().append("g")
      .attr("class", "viz")
      .attr("opacity", 0)

    viz.attr("class", ['viz', cur_viz, cur_order].join(' '))
       .call( (g) => visualizations[g.data()].component(g, cur_order) )

    viz.transition()
        .duration(slide_transition_dur)
        .attr("opacity", 1)
  }


  // layout entire application when browser window resized

  function relayout(minWidth) {
    minWidth = Math.max(minWidth, min_width)

    width = minWidth - margins.right

    svg.attr("width", width)

    d3.keys(visualizations).forEach( (viz) => {
      visualizations[viz].component.relayout()
    })
  }

  window.onresize = function() {
    relayout(browser_width())
    render_all()
  }


  // current viz selector

  function render_viz_selector(viz) {
    let viz_li = d3.select("#viz ul")
        .selectAll("li")
        .data(d3.keys(visualizations))

    viz_li.enter().append("li")
        .attr("id", (d) => d )
        .text( (d) => visualizations[d].label )
       .on("click", (d) => show(d, cur_order) )

    viz_li.classed("selected", (d) => d === viz)
  }


  // dual-chord viz

  function render_dual() {

    let hoverRadius, innerRadius, outerRadius, chordRadius, labelRadius

    const margins = { top: 80, left: 0, right: 0, bottom: 0 }

    const τ = 2 * Math.PI
    const pie_rotate = τ * 5 / 8          // when ordered, start in lower left corner so labels fall downwards

    const padAngle = 0.01
    const chordWidth = 0.04

    const label_margin = 1.5
    const label_padding = 5
    const title_margin = 20
    const marker_circle_radius = 1.5

    const axis_label_cutoff = 0.1

    const label_trim_len = 27

    const sorting_opacity = 0.5
    const defocus_opacity = 0.0625
    const resting_opacity = 0.7
    const label_delay = 1500
    const label_dur = 750

    let height

    let fill = d3.scale.category20c()
      .domain(d3.range(0, n))

    let arc = d3.svg.arc()
    let label_arc = d3.svg.arc()
    let hover_arc = d3.svg.arc()
    let chord = d3.svg.chord()

    let immediate = true

    const arc_center = (d, width) => {
      width = width || 0.1
      let c = d3.mean([d.startAngle, d.endAngle])
      let s = d3.max([d.startAngle, c - width])
      let t = d3.min([c + width, d.endAngle])

      return { startAngle: s, endAngle: t }
    }

    let pie = d3.layout.pie()
      .startAngle(pie_rotate)
      .endAngle(τ + pie_rotate)
      .padAngle(padAngle)

    let layouts = {}
    d3.keys(orders).map( (key => {
      layouts[key] = pie.sort(null)
                        .value( (i) => orders[key].weights[i] )
                     (orders[key].sorted)
    }))

    const mode_dur = 2500

    // based on position of each node (arc), generate layout for links (chords)
    function calc_links(data, node_positions) {

      let node_positions_idx = Array(n)
      node_positions.forEach( (d) => node_positions_idx[d.data] = d)

      let links = []
      let i=-1; while(i++<n-1) {
        let j=i; while(j++<n-1) {
          let val = data[i][j]
          if(val > 0) {
            links.push({ source: arc_center(node_positions_idx[i], chordWidth),
                         target: arc_center(node_positions_idx[j], chordWidth),
                         source_dept: i,
                         target_dept: j })
          }
        }
      }
      return links
    }

    function relayout_labels(nodes) {
      // add defs to svg header, if not already present
      if(svg.select('#markerCircle').empty()) {
        svg.append('defs')
          .append('marker')
            .attr('id', 'markerCircle')
            .attr('markerWidth', marker_circle_radius * 2)
            .attr('markerHeight', marker_circle_radius * 2)
            .attr('refX', marker_circle_radius)
            .attr('refY', marker_circle_radius)
          .append('circle')
            .attr('r', marker_circle_radius)
            .attr('cx', marker_circle_radius)
            .attr('cy', marker_circle_radius)
      }

      // constraint relaxing algorithm for label positions

      const sign = (x) => x > 0 ? 1 : -1
      const adjust = 2

      // returns the upper-left point in the rectangle
      // negative sizes indicate label's origin is on opposite side
      const attach_point = (point, size) => {
        let attach = point.slice()
        attach[0] += Math.min(0, size[0])
        attach[1] += Math.min(0, size[1])
        return attach
      }

      // check if two rectangles intersect,
      const rect_intersect = (point1, size1, point2, size2, tolerance = 0) => {
        let r1 = { x1: point1[0], y1: point1[1], x2: point1[0] + size1[0], y2: point1[1] + size1[1] }
        let r2 = { x1: point2[0], y1: point2[1], x2: point2[0] + size2[0], y2: point2[1] + size2[1] }
        let separate = /* left */  Math.max(r1.x1, r1.x2) + tolerance < Math.min(r2.x1, r2.x2) - tolerance ||
                       /* above */ Math.max(r1.y1, r1.y2) + tolerance < Math.min(r2.y1, r2.y2) - tolerance ||
                       /* right */ Math.min(r1.x1, r1.x2) - tolerance > Math.max(r2.x1, r2.x2) + tolerance ||
                       /* below */ Math.min(r1.y1, r1.y2) - tolerance > Math.max(r2.y1, r2.y2) + tolerance
        return !separate
      }

      // NB not a general solution to circle-rectangle intersection!
      //    this approach requires the rectangle's longest side to be shorter than the circle's diameter
      function circle_intersect(point, size, center, radius) {
        let x1 = point[0], y1 = point[1], x2 = point[0] + size[0], y2 = point[1] + size[1]
        let in_circle = (x,y) => Math.sqrt( Math.pow(x - center[0], 2) + Math.pow(y - center[1], 2) ) < radius

        return in_circle(x1, y1) || in_circle(x1, y2) || in_circle(x2, y2) || in_circle(x2, y1)
      }

      // unconventional use of D3: because bounding box isn't available until text node added to DOM,
      // we do final updates of the layout inside D3 join
      let labels = nodes.select('.label_info text')
      labels.each( function(d) {
        let bbox = this.getBBox()
        d.labelPosition = label_arc.centroid(d)

        // Convention: positive label size values indicate origin in upper left corner
        //             negative label size moves origin to opposite side
        d.labelSize = [ bbox.width, bbox.height ]

        // put in margin before or after label
        d.labelSize[0] += label_padding

        // adjust origin of label to match quadrant
        d.labelSize[0] *= -sign(d.labelPosition[0])
        d.labelSize[1] *= -sign(d.labelPosition[1])
      })

      // relax the label positions until they are not overlapping

      // the following algorithm works for labels with origin in upper right; text-anchor, dx, dy etc will CANNOT be used on
      // the <text> elements.

      let relaxing

      relaxing = true; while(relaxing) {
        // move labels that overlap the circle (... could be done by direct calculation)
        relaxing = false
        nodes.each( (d0,i0) => {
          if(circle_intersect(d0.labelPosition, d0.labelSize, [0,0], labelRadius)) {
            d0.labelPosition[1] += sign(d0.labelPosition[1]) * adjust
            relaxing = true
          }
        })
      }

      relaxing = true; while(relaxing) {
        // move labels that overlap each other
        relaxing = false
        nodes.each( (d0,i0) => {
          nodes.each( (d1,i1) => {
            if(i0===i1) return
            if(!rect_intersect(d0.labelPosition, d0.labelSize,
                               d1.labelPosition, d1.labelSize, label_margin)) return
            // only nudge the outermost of the two labels
            if(!(Math.abs(d0.labelPosition[0]) < Math.abs(d1.labelPosition[0]))) return
            d1.labelPosition[1] += sign(d1.labelPosition[1]) * adjust
            relaxing = true
          })
        })
      }

      // transfer layout into DOM

      labels
        .attr('transform', (d) => 'translate(' + attach_point(d.labelPosition, d.labelSize) + ')')
        .attr('dy', '0.9em') // cross-browser workaround approximating <text dominant-baseline="text-before-edge">...
        .attr('dx', (d) => -label_padding * sign(d.labelPosition[0]))


      // lines
      let label_rule = (d) => {
        let attach = d.labelPosition.slice()
        attach[1] += d.labelSize[1] / 2
        return [arc.centroid(d), label_arc.centroid(d), attach ]
      }

      nodes.select('polyline')
        .attr('points', label_rule)

    }

    function install_defs(g) {
      let defs = g.select('defs')
      if(defs.empty()) {
        defs = g.append('defs')
        defs.append('marker')
            .attr('id', 'markerCircle')
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('refX', 1.5)
            .attr('refY', 1.5)
          .append('circle')
            .attr('r', 1.5)
            .attr('cx', 1.5)
            .attr('cy', 1.5)
      }
      return defs
    }

    let uid = 0

    function append_chords(g, node_positions) {

      // set up for chords

      uid++

      // ensure svg defs declared
      let defs = install_defs(g)

      const percent = d3.format("%")

      const link_id = (d) => [d.source_dept, d.target_dept].join("x")

      let gradient = defs.selectAll("linearGradient")
          .data( (matrix) => calc_links(matrix, node_positions),
                             link_id )

      var gradient_e = gradient.enter().append("linearGradient")
        .attr("gradientUnits", "userSpaceOnUse")

      gradient.attr("id", (d) => "gradient-" + link_id(d) + "-" + uid )
              .attr("x1", (d) => arc.centroid(d.source)[0] )
              .attr("y1", (d) => arc.centroid(d.source)[1] )
              .attr("x2", (d) => arc.centroid(d.target)[0] )
              .attr("y2", (d) => arc.centroid(d.target)[1] )

      let stop = gradient.selectAll("stop")
        .data( (d) => [d.source_dept, d.target_dept] )
      stop.enter().append("stop")

      stop.attr("offset", (d,i) => percent(i) )
          .attr("stop-color", (d) => fill(d) )

      // transition chords (i.e. cross-department links)

      let link = g.selectAll(".link")
          .data( (matrix) => calc_links(matrix, node_positions),
                             link_id )

      link.enter().append("path")
        .attr("class", "link")

      link.attr("fill", (d) => "url(#gradient-" + link_id(d) + "-" + uid + ")" )
        .attr("d", chord)
        .attr("opacity", 0)

      link.transition()
        .delay( (d,i) => i * 8 )
        .duration(1000)
        .attr("opacity", resting_opacity)
    }


    function update(g, order) {

      // update chords layout
      let node_positions = layouts[order]

      // disallow focus during transition
      g.classed("transitioning", true)
      g.selectAll(".link")
        .attr("opacity", 0)

      // transition nodes (i.e. department arcs)

      let node = g.selectAll(".dept")
          .data(node_positions, (d) => d.data)

      node.exit().remove()          // never actually used

      let node_e = node.enter().append("g")
          .attr("class", (d) => "dept dept-" + d.data)

      node_e.append("path")
        .attr("class", "arc")
        .attr("id", (d) => "arc-" + d.data)
        .attr("fill", (d) => fill(d.data) )
        .attr("d", arc)             // TODO unclear why this is necessary

      let node_textpath_e = node_e.append("text")
        .attr("class", "axis label")
        .attr("dy", "-0.25em")
        .append("textPath")
          .attr("xlink:href", (d) => "#arc-" + d.data)
      node_textpath_e.append('tspan')
        .attr('class', 'tick')
        .attr('x', '0.25em')
      node_textpath_e.append('tspan')
        .attr('class', 'hint')
        .attr('x', '0.25em')

      // On DOM creation, render without any transitions
      node_e.each( () => immediate = true)

      let label_info = node_e.append("g")
        .attr("class", "label_info")
        .attr("opacity", 0)
      label_info.append('polyline')
        .attr('marker-end', 'url(#markerCircle)')
      label_info.append("text")

      node_e.append("path")
        .attr("class", "hover")

      let trans = node.transition()
        .duration(immediate ? 0 : 250)
        .attr("opacity", sorting_opacity)

      trans = trans.transition()
        .duration(immediate ? 0 : mode_dur)

      trans.select(".arc")
        .attrTween("d", function(d,i) { // "this" below requires function...
                let interp = d3.interpolate(this._current || d, d)
                this._current = d
                return (t) => arc(interp(t))
        })

      trans = trans.transition()
        .duration(250)
        .attr("opacity", 1)
        .call(endAll, () => {
          append_chords(g, node_positions)
          g.classed("transitioning", false)
          stats()
        })

      node.select(".hover")
          .attr("d", hover_arc)

      node.select(".axis.label")
          .attr("class", (d) => "axis label " + (orders[order].major_ticks.has(d.data) ? "major" : "minor") +
                                (d.endAngle - d.startAngle < axis_label_cutoff ? " narrow" : ""))

      node.select(".axis.label .tick")
        .text( (d) => orders[order].ticks[d.data] )

      node.select(".axis.label .hint")
        .text( (d) => orders[order].hints ? orders[order].hints[d.data] : orders[order].ticks[d.data] )

      node.select(".label_info text")
        .text( (d) => trim(dept_names[d.data], label_trim_len))

      node.call(relayout_labels)
    }

    function focus(g, dept) {

      if(g.classed('transitioning')) return

      let matrix = g.data()[0]
      let linked_to = (d, dept) => d.source_dept===dept || d.target_dept===dept

      // pop the focused node & link out

      let focus_delta = (outerRadius - innerRadius) / 2

      let focus_arc = d3.svg.arc()
        .innerRadius(innerRadius + focus_delta)
        .outerRadius(outerRadius + focus_delta)

      let focus_chord = d3.svg.chord()
        .source( (d) => Object.assign(d.source, { radius: d.source_dept===dept ? chordRadius + focus_delta : chordRadius } ))
        .target( (d) => Object.assign(d.target, { radius: d.target_dept===dept ? chordRadius + focus_delta : chordRadius } ))

      let trans = g.transition("labels")

      trans.selectAll(".dept .label_info")
        .attr("opacity", 0)

      // first step: chords and arc

      trans = trans.transition("focus")
        .duration(500)

      trans.selectAll(".dept .arc")
          .attr("d", (d,i) => d.data===dept ? focus_arc(d,i) : arc(d,i))

      trans.selectAll(".link")
          .attr("opacity", (d) => linked_to(d, dept) ? 1 : (dept===null ?  resting_opacity : defocus_opacity)) // TODO NB must pass 0 through
        .attr("d", (d,i) => linked_to(d, dept) ? focus_chord(d,i) : chord(d,i))

      // second step: labels, silently

      trans = trans.transition("labels")
        .duration(0)

      trans.selectAll(".dept")
          .filter( (d) => matrix[d.data][dept] > 0 || d.data === dept )
          .call(relayout_labels)

      trans = trans.transition("labels")
        .duration(500)

      trans.selectAll(".dept .label_info")
           .attr("opacity", (d) => matrix[d.data][dept] > 0 || d.data === dept ? 1 : 0)
    }

    let chart = function(g, order) {

      svg.attr('height', height)

      g.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')

      // pair of graph connection diagrams

      const matrix_titles = [ 'Research', 'Teaching' ]

      let chord = g.selectAll(".chord")
        .data([research_matrix, teaching_matrix])

      chord.enter().append("g")
          .attr("class", "chord no_advance")
        .append("text")
          .attr("class", "title")
          .attr("text-anchor", "middle")
          .attr("dy", "0.5em")
          .text( (d,i) => matrix_titles[i] )

      chord.select(".title")
          .attr("transform", "translate(" + -labelRadius + ",0)rotate(270)")

      chord.attr("transform", (d,i) => "translate(" + (labelRadius * 2 * i + labelRadius) + "," + labelRadius + ")")
           .call(update, order)

      // behavior

      // [ focus each chord diagram separately since labels must be repositioned ]
      chord.selectAll(".hover")
             .on("mouseenter", (d) => chord.each( function() { focus(d3.select(this), d.data) }))
             .on("mouseout", (d) => chord.each( function() { focus(d3.select(this), null) }))

      immediate = false

    }

    chart.relayout = function() {
      innerRadius = (width - 100) * 0.205

      outerRadius = innerRadius * 1.05
      chordRadius = innerRadius * 0.99
      labelRadius = innerRadius * 1.175

      hoverRadius = innerRadius * 0.7

      height = labelRadius * 2.25 + margins.top + margins.bottom

      arc.innerRadius(innerRadius)
         .outerRadius(outerRadius)

      label_arc.innerRadius(outerRadius)
               .outerRadius(labelRadius)

      hover_arc.innerRadius(hoverRadius)
               .outerRadius(labelRadius)

      chord.radius(chordRadius)

      immediate = true
    }

    return chart
  }


  // matrix viz


  function render_matrix() {

    const margins = { top: 130, left: 0, right: 320, bottom: 0 }
    const tick_margins = { top: 50, left: 8, right: 0, bottom: 0 }
    const tick2_margins = { top: 230, left: 8, right: 0, bottom: 0 }

    const axis_width = 200

    const legend_width = 150
    const legend_cell = 7
    const legend_packing = 1
    const label_trim_value = 23

    const mode_dur = 2500

    const colors = // NB hand-tweaked for this dataset!
      [ [-9,  "#35b7e5"],
        [-2,  "#35b7e5"],
        [0,   "gray"],
        [4.5, "red"],
        [9,   "yellow"] ]

    const empty_color = "#dadad9"

    const points = d3.merge(d3.range(n).map( (i) => d3.range(n).map( (j) => {
      return { i: i, j: j}
    })))

    let scale = d3.scale.ordinal()

    let colorscale = d3.scale.linear()
      .domain(colors.map( (d) => d[0] ))
      .range(colors.map( (d) => d[1] ))

    let sizescale = d3.scale.linear()
      .domain([0, links_max-1])

    let csd = colorscale.domain()

    let immediate = true


    let chart = function(g, order) {

      // margins

      svg.attr('height', width - margins.left - margins.right + margins.top)      // TODO. avoid global DOM alteration

      g.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')

      scale.domain(orders[order].sorted)

      sizescale.range([3, scale.rangeBand()])

      // cells (links)

      let cell = g.selectAll(".cell")
          .data(points)

      let cell_enter = cell.enter()
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

      cell_enter.append("rect")
        .attr("class", "sum")

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

      // On DOM creation, render without any transitions
      cell_enter.each( () => immediate = true)

      // rules (nodes)

      function axis(g, prefix) {
        let labs = g.selectAll(".labels." + prefix)
          .data(dept_names)

        labs.exit().remove()

        let labs_e = labs.enter().append("g")
          .attr("class", (d,i) => prefix + " labels no_advance " + (prefix + "_" + to_class(d)))

        labs_e.append("rect")
          .attr("class", "background")
          .attr("fill", "transparent")
          .attr("width", axis_width)
          .attr("height", scale.rangeBand())

        labs_e.call(highlight.bind(null, prefix + "_"))

        let labs_e_text = labs_e.append("text")
          .attr("class", (d, i) => "node dept" + i)
          .attr("transform", "translate(0," + scale.rangeBand() / 2.0 + ")")
          .attr("dx", "2.2em")
          .attr("dy", "0.35em")

        labs_e_text.append("tspan")
            .attr("class", "label")
        let subs = labs_e_text.append("tspan")
            .attr("dx", "0.5em")
        subs.append("tspan")
            .attr("class", "metric")
        subs.append("tspan")
            .attr("class", "hint")

        // update cycle

        let node = labs.select(".node")
        node.select(".label").text( (d) => trim(d, label_trim_value) )
        node.select(".metric").text( (d,i) => orders[order].ticks[i] )
        node.select(".hint").text( (d,i) => orders[order].hints ? orders[order].hints[i] : orders[order].ticks[i] )
      }

      g.call(axis, "x")
      g.call(axis, "y")

      // legends

      let tick = g.selectAll(".tick")
          .data(d3.range(d3.min(csd), d3.max(csd)))
        .enter().append("g")
          .attr("class", "tick")
          .attr("transform", (d,i) => "translate(" + [-legend_width + tick_margins.left, tick_margins.top + (legend_cell + legend_packing) * i] +  ")")

      tick.append("rect")
            .attr("width", legend_cell)
            .attr("height", legend_cell)
            .attr("fill", (d) => colorscale(d))

      tick.append("g")
        .append("text")
          .attr("dx", legend_cell * 1.5)
          .attr("dy", "0.65em")
          .attr("fill", "black")
          .text( (d, i) => i === 0 ? "more teaching links" : d === 0 ? "balanced" : d === d3.max(csd) - 1 ? "more research links" : "")

      let ssd = sizescale.domain()
      let tick2 = g.selectAll(".tick2")
         .data(d3.range(ssd[0], ssd[1], 2))
        .enter().append("g")
         .attr("class", "tick2")
         .attr("transform", (d,i) => "translate(" + [-legend_width + tick_margins.left, tick2_margins.top + scale.rangeBand() * i] + ")")

      tick2.append("rect")
         .attr("x", (d,i) => scale.rangeBand() / 2.0 - sizescale(i) / 2.0)
         .attr("y", (d,i) => scale.rangeBand() / 2.0 - sizescale(i) / 2.0)
         .attr("width", (d,i) => sizescale(i) )
         .attr("height", (d,i) => sizescale(i) )
         .attr("fill", "grey")

      tick2.append("text")
        .attr("transform", "translate(" + [scale.rangeBand() * 1.2, scale.rangeBand() / 2.0] + ")")
        .attr("dy", "0.35em")
        .text( (d, i) => d + (i === 0 ? " total links" : ""))

      // finish layout

      g.selectAll(".cell .background")
        .attr("width", scale.rangeBand())
        .attr("height", scale.rangeBand())

      g.selectAll(".cell .sum")
          .attr("width", (d) => sizescale( links_matrix[d.i][d.j] ))
          .attr("height", (d) => sizescale( links_matrix[d.i][d.j] ))

      // animation

      let trans = g.transition()
          .duration(immediate ? 0 : mode_dur)

      trans.selectAll(".x.labels")
          .delay( (d, i) => immediate ? 0 : scale(i) * 4 )
          .attr("transform", (d, i) => "translate(" + scale(i) + ",-15)rotate(-45)")

      trans.selectAll(".cell")
            .delay( (d) => immediate ? 0 : scale(d.i) * 4 )
            .attr("transform", (d) => "translate(" + scale(d.i) + "," + scale(d.j) + ")" )

      trans.selectAll(".y.labels")
          .delay( (d, i) => immediate ? 0 : scale(i) * 4 )
          .attr("transform", (d,i) => "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")")

      immediate = false

      // behavior

      function highlight(prefix, sel) {
        sel.on("mouseover", (d) => {
          d3.selectAll(".cell.selected").classed("selected", false)
          d3.selectAll(".labels.selected").classed("selected", false)
          d3.selectAll(".cell." + prefix + to_class(d)).classed("selected", true)
          d3.selectAll(".labels." + prefix + to_class(d)).classed("selected", true)
        })
      }

    }

    chart.relayout = function () {
      scale.rangeRoundBands([0, width - margins.left - margins.right], 0.1)
      immediate = true
    }

    return chart
  }


  // initial layout and first render

  relayout(browser_width())
  show('chord', 'department')
  timeout = setTimeout(advance, first_slide_pause)

})


// Utility functions

function stats() {
  // confirm node counts
  let stats = [ "linearGradient", ".link", ".dept", "path", "text", "tspan" ]
  stats.forEach( (sel) => console.log(sel + " : " + d3.selectAll(sel).size()))
  console.log("total : " + d3.selectAll("*").size())
}

function browser_width() {
  return window.innerWidth - 20                 // account for cross-browser scrollbar on the right
}

function trim(s, n, m=null) {
  m = m===s ? null : m
  m = m ? " [" + m + "]" : ""
  s = (s.length + m.length > n) ? (s.slice(0,n-m.length-3) + "...") : s
  return s + m
}

function to_class(s) {
  return s.toLowerCase().replace(/\W/g, '_')
}

function uniq() {
  let vals = []
  for(let i=0; i<arguments.length; i++) {
    vals = vals.concat(arguments[i])
  }
  return d3.set(vals).values()
}

function endAll(transition, callback) {
  var n = 0;
  transition.each(function() { ++n; })
    .each('end', function() {
      if (!--n) callback.apply(this, arguments);
    });
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

    let n = a.length,
        c = constant_matrix(n)

    let i=-1; while(i++<n-1) {
      let j=-1; while(j++<n-1) {
        c[i][j] = fn(a[i][j], b[i][j])
      }
    }

    return c
  }
}

function populate(proj1, proj2, valfn, xs, m) {
  xs.forEach( (x) => {
    let i = proj1(x)
    let j = proj2(x)
    if(m[i][j] || m[j][i]) {
      console.log("WARNING: " + i + " x " + j + " = " + m[i][j] + " or " + m[j][i] + " or " + valfn(x) + "?")
    }
    m[i][j] = m[j][i] = valfn(x)
  })
  return m
}