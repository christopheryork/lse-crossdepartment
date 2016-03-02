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

queue().defer(d3.csv, "../data-6.1,6.3.csv").defer(d3.csv, "../data-6.2.csv").defer(d3.csv, "../data-6.4.csv").await(function (err, depts, research, teaching) {
  if (err) {
    throw err;
  }

  // convert data from JSON to javascript types
  depts.forEach(function (d) {
    d.faculty = +d.faculty;d.research_links = +d.research_links;d.teaching_links = +d.teaching_links;
  });
  research.forEach(function (d) {
    return d.links = +d.links;
  });
  teaching.forEach(function (d) {
    return d.links = +d.links;
  });

  // prepare department names & faculty count per department

  var dept_names = uniq(research.map(function (d) {
    return d.department1;
  }), research.map(function (d) {
    return d.department2;
  }), teaching.map(function (d) {
    return d.department1;
  }), teaching.map(function (d) {
    return d.department2;
  }));
  var n = dept_names.length;
  var faculty = d3.range(n).map(function () {
    return 0;
  });
  depts.forEach(function (d) {
    return faculty[dept_names.indexOf(d.department)] = d.faculty;
  });

  // prepare the data matrices

  var sum = function sum(vector) {
    return vector.reduce(function (a, b) {
      return a + b;
    }, 0.0);
  };
  var matrix_add = lift(function (a, b) {
    return a + b;
  });
  var matrix_subtract = lift(function (a, b) {
    return a - b;
  });

  var populate_departments = populate.bind(null, function (x) {
    return dept_names.indexOf(x.department1);
  }, function (x) {
    return dept_names.indexOf(x.department2);
  }, function (x) {
    return x.links;
  });

  var research_matrix = populate_departments(research, constant_matrix(n));
  var teaching_matrix = populate_departments(teaching, constant_matrix(n));

  var links_matrix = matrix_add(research_matrix, teaching_matrix);
  var links_sum = links_matrix.map(sum);
  var balance_matrix = matrix_subtract(research_matrix, teaching_matrix);
  var balance_sum = balance_matrix.map(sum);

  var links_max = d3.max(links_matrix, function (v) {
    return d3.max(v);
  });

  // application state

  var cur_viz = undefined,
      cur_order = undefined;

  // cross-visualization configuration

  var margins = { top: 0, left: 150, right: 0, bottom: 0 };
  var min_width = 800;

  var first_slide_pause = 2500;
  var n_slide_pause = 7500;
  var slide_transition_dur = 500;

  var width = undefined;

  var svg = d3.select("body").append("svg");

  var svg_g = svg.append("g").attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // timer cycling through orders

  // convention: the timer will not advance while the mouse is hovering over any ele
  //             with the class "no_advance"

  var timeout = undefined;

  function advance() {
    var keys = d3.keys(orders);
    var i = keys.indexOf(cur_order);
    var next_order = keys[(i + 1) % keys.length];

    var hover_count = 0;
    d3.select(".no_advance:hover").each(function () {
      return ++hover_count;
    });

    if (hover_count === 0) {
      show(cur_viz, next_order);
    }

    timeout = setTimeout(advance, n_slide_pause);
  }

  // transition application state and render everything

  function show(viz, order) {
    cur_viz = viz;
    cur_order = order;

    render_all();
  }

  // render complete tree of visualizations

  var visualizations = {
    chord: { label: 'By Department', component: render_dual() },
    matrix: { label: 'All the Data', component: render_matrix() }
  };

  function render_all() {
    render_viz_selector(cur_viz);
    render_order(cur_order);

    var viz = svg_g.selectAll(".viz").data(d3.keys(visualizations));

    viz.enter().append("g").attr("class", "viz");

    viz.filter(function (d) {
      return d === cur_viz;
    }).call(visualizations[cur_viz].component, cur_order);

    viz.attr('visibility', function (d) {
      return d === cur_viz ? 'visible' : 'hidden';
    }) // req'd for mouse event handling
    .transition().duration(slide_transition_dur).attr("opacity", function (d) {
      return d === cur_viz ? 1 : 0;
    });
  }

  // layout entire application when browser window resized

  function relayout(minWidth) {
    minWidth = Math.max(minWidth, min_width);

    width = minWidth - margins.right;

    svg.attr("width", width);

    d3.keys(visualizations).forEach(function (viz) {
      visualizations[viz].component.relayout();
    });
  }

  window.onresize = function () {
    relayout(window.innerWidth);
    render_all();
  };

  // current viz selector

  function render_viz_selector(viz) {
    var viz_li = d3.select("#viz ul").selectAll("li").data(d3.keys(visualizations));

    viz_li.enter().append("li").attr("id", function (d) {
      return d;
    }).text(function (d) {
      return visualizations[d].label;
    }).on("click", function (d) {
      return show(d, cur_order);
    });

    viz_li.classed("selected", function (d) {
      return d === viz;
    });
  }

  // order selector

  var orders = {
    department: { label: 'department', metric: function metric(i) {
        return dept_names[i];
      }, sort: d3.ascending },
    links: { label: 'count of links', metric: function metric(i) {
        return links_sum[i];
      }, sort: d3.descending },
    emphasis: { label: 'link balance', metric: function metric(i) {
        var n = balance_sum[i];return n < 0 ? n + " T" : n > 0 ? n + " R" : "0";
      }, sort: d3.ascending },
    faculty: { label: 'faculty size', metric: function metric(i) {
        return faculty[i];
      }, sort: d3.descending }
  };

  var depts_by_metric = {};
  d3.keys(orders).forEach(function (key) {
    var config = orders[key];
    depts_by_metric[key] = d3.range(n).sort(function (a, b) {
      return config.sort(config.metric(a), config.metric(b));
    });
  });

  function render_order(order) {
    var order_div = d3.select("#order dd").selectAll("div").data(d3.keys(orders));

    var order_div_e = order_div.enter().append("div");
    order_div_e.append("input").attr("id", function (d) {
      return d;
    }).attr("type", "radio").attr("name", "order").attr("value", function (d) {
      return d;
    });
    order_div_e.append("label").attr("for", function (d) {
      return d;
    }).text(function (d) {
      return orders[d].label;
    });

    order_div.select("input").property("checked", function (d) {
      return d === order;
    });
  }

  d3.select("#order").on("change", function () {
    var new_order = d3.select("#order input:checked").node().value;
    clearTimeout(timeout);
    if (new_order !== cur_order) {
      show(cur_viz, new_order);
    }
  });

  // dual-chord viz

  function render_dual() {

    var innerRadius = undefined,
        outerRadius = undefined,
        chordRadius = undefined,
        labelRadius = undefined;

    var margins = { top: 80, left: 0, right: 0, bottom: 0 };

    var τ = 2 * Math.PI;
    var pie_rotate = τ * 5 / 8; // when ordered, start in lower left corner so labels fall downwards

    var padAngle = 0.01;
    var chordWidth = 0.04;
    var mode_dur = 750;

    var label_margin = 1.5;
    var label_padding = 5;
    var title_margin = 20;
    var marker_circle_radius = 1.5;

    var label_trim_len = 27;

    var defocus_opacity = 0.0625;
    var resting_opacity = 0.8;
    var label_delay = 1500;
    var label_dur = 500;

    var height = undefined;

    var fill = d3.scale.category20c().domain(d3.range(0, n));

    var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    var label_arc = d3.svg.arc().innerRadius(labelRadius).outerRadius(outerRadius);

    var chord = d3.svg.chord().radius(chordRadius);

    var linked_to = function linked_to(d, i) {
      return d.source_index === i || d.target_index === i;
    };

    var arc_center = function arc_center(d, width) {
      width = width || 0.1;
      var c = d3.mean([d.startAngle, d.endAngle]);
      var s = d3.max([d.startAngle, c - width]);
      var t = d3.min([c + width, d.endAngle]);

      return { startAngle: s, endAngle: t };
    };

    var pie = d3.layout.pie().startAngle(pie_rotate).endAngle(τ + pie_rotate).padAngle(padAngle);

    var sortsum = function sortsum(a, b) {
      return d3.descending(sum(a), sum(b));
    };

    // TODO.  use depts_by_metric?
    var layouts = {
      department: pie.sort(null).value(Number)(d3.range(0, n).map(d3.functor(1))),
      faculty: pie.sort(d3.ascending).value(Number)(faculty.map(function (d) {
        return d || 0;
      })),
      links: pie.sort(sortsum).value(sum)(links_matrix),
      emphasis: pie.sort(sortsum).value(sum)(balance_matrix)
    };

    // based on position of each node (arc), generate layout for links (chords)
    function calc_links(data, node_positions) {
      var links = [];
      var i = -1;while (i++ < n - 1) {
        var j = -1;while (j++ < i - 1) {
          var val = data[i][j];
          if (val > 0) {
            links.push({ source: arc_center(node_positions[i], chordWidth),
              target: arc_center(node_positions[j], chordWidth),
              value: val,
              source_index: i,
              target_index: j });
          }
        }
      }
      return links;
    }

    function relayout_labels(nodes) {
      // add defs to svg header, if not already present
      if (svg.select('#markerCircle').empty()) {
        svg.append('defs').append('marker').attr('id', 'markerCircle').attr('markerWidth', marker_circle_radius * 2).attr('markerHeight', marker_circle_radius * 2).attr('refX', marker_circle_radius).attr('refY', marker_circle_radius).append('circle').attr('r', marker_circle_radius).attr('cx', marker_circle_radius).attr('cy', marker_circle_radius);
      }

      // constraint relaxing algorithm for label positions

      var sign = function sign(x) {
        return x > 0 ? 1 : -1;
      };
      var adjust = 2;

      // returns the upper-left point in the rectangle
      // negative sizes indicate label's origin is on opposite side
      var attach_point = function attach_point(point, size) {
        var attach = point.slice();
        attach[0] += Math.min(0, size[0]);
        attach[1] += Math.min(0, size[1]);
        return attach;
      };

      // check if two rectangles intersect,
      var rect_intersect = function rect_intersect(point1, size1, point2, size2) {
        var tolerance = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

        var r1 = { x1: point1[0], y1: point1[1], x2: point1[0] + size1[0], y2: point1[1] + size1[1] };
        var r2 = { x1: point2[0], y1: point2[1], x2: point2[0] + size2[0], y2: point2[1] + size2[1] };
        var separate = /* left */Math.max(r1.x1, r1.x2) + tolerance < Math.min(r2.x1, r2.x2) - tolerance ||
        /* above */Math.max(r1.y1, r1.y2) + tolerance < Math.min(r2.y1, r2.y2) - tolerance ||
        /* right */Math.min(r1.x1, r1.x2) - tolerance > Math.max(r2.x1, r2.x2) + tolerance ||
        /* below */Math.min(r1.y1, r1.y2) - tolerance > Math.max(r2.y1, r2.y2) + tolerance;
        return !separate;
      };

      // NB not a general solution to circle-rectangle intersection!
      //    this approach requires the rectangle's longest side to be shorter than the circle's diameter
      function circle_intersect(point, size, center, radius) {
        var x1 = point[0],
            y1 = point[1],
            x2 = point[0] + size[0],
            y2 = point[1] + size[1];
        var in_circle = function in_circle(x, y) {
          return Math.sqrt(Math.pow(x - center[0], 2) + Math.pow(y - center[1], 2)) < radius;
        };

        return in_circle(x1, y1) || in_circle(x1, y2) || in_circle(x2, y2) || in_circle(x2, y1);
      }

      // unconventional use of D3: because bounding box isn't available until text node added to DOM,
      // we do final updates of the layout inside D3 join
      var labels = nodes.select('text');
      labels.each(function (d) {
        var bbox = this.getBBox();
        d.labelPosition = label_arc.centroid(d);

        // Convention: positive label size values indicate origin in upper left corner
        //             negative label size moves origin to opposite side
        d.labelSize = [bbox.width, bbox.height];

        // put in margin before or after label
        d.labelSize[0] += label_padding;

        // adjust origin of label to match quadrant
        d.labelSize[0] *= -sign(d.labelPosition[0]);
        d.labelSize[1] *= -sign(d.labelPosition[1]);
      });

      // relax the label positions until they are not overlapping

      // the following algorithm works for labels with origin in upper right; text-anchor, dx, dy etc will CANNOT be used on
      // the <text> elements.

      var relaxing = undefined;

      relaxing = true;while (relaxing) {
        // move labels that overlap the circle (... could be done by direct calculation)
        relaxing = false;
        nodes.each(function (d0, i0) {
          if (circle_intersect(d0.labelPosition, d0.labelSize, [0, 0], labelRadius)) {
            d0.labelPosition[1] += sign(d0.labelPosition[1]) * adjust;
            relaxing = true;
          }
        });
      }

      relaxing = true;while (relaxing) {
        // move labels that overlap each other
        relaxing = false;
        nodes.each(function (d0, i0) {
          nodes.each(function (d1, i1) {
            if (i0 === i1) return;
            if (!rect_intersect(d0.labelPosition, d0.labelSize, d1.labelPosition, d1.labelSize, label_margin)) return;
            // only nudge the outermost of the two labels
            if (!(Math.abs(d0.labelPosition[0]) < Math.abs(d1.labelPosition[0]))) return;
            d1.labelPosition[1] += sign(d1.labelPosition[1]) * adjust;
            relaxing = true;
          });
        });
      }

      // transfer layout into DOM

      labels.attr('transform', function (d) {
        return 'translate(' + attach_point(d.labelPosition, d.labelSize) + ')';
      }).attr('dy', '0.9em') // cross-browser workaround approximating <text dominant-baseline="text-before-edge">...
      .attr('dx', function (d) {
        return -label_padding * sign(d.labelPosition[0]);
      });

      // lines
      var label_rule = function label_rule(d) {
        var attach = d.labelPosition.slice();
        attach[1] += d.labelSize[1] / 2;
        return [arc.centroid(d), label_arc.centroid(d), attach];
      };

      nodes.select('polyline').attr('points', label_rule);
    }

    function install_defs(g) {
      var defs = g.select('defs');
      if (defs.empty()) {
        defs = g.append('defs');
        defs.append('marker').attr('id', 'markerCircle').attr('markerWidth', 3).attr('markerHeight', 3).attr('refX', 1.5).attr('refY', 1.5).append('circle').attr('r', 1.5).attr('cx', 1.5).attr('cy', 1.5);
      }
      return defs;
    }

    function update(g, order) {

      // ensure svg defs declared
      var defs = install_defs(g);

      // update chords layout
      var node_positions = layouts[order];

      // label formatter
      var label_fmt = function label_fmt(d, i) {
        return trim(dept_names[i], label_trim_len, orders[order].metric(i));
      };

      // transition nodes (i.e. department arcs)

      var node = g.selectAll(".dept").data(node_positions);

      node.exit().remove(); // never actually used

      var node_g = node.enter().append("g").attr("class", function (d) {
        return "dept";
      });

      node_g.append("path").attr("fill", function (d, i) {
        return fill(i);
      });

      var label_info = node_g.append("g").attr("class", "label_info").attr("opacity", 0);
      label_info.append('polyline').attr('marker-end', 'url(#markerCircle)');
      label_info.append("text");

      var trans = node.transition().duration(mode_dur);

      trans.select("path").attrTween("d", function (d) {
        // "this" below requires function...
        var interp = d3.interpolate(this._current || d, d);
        this._current = d;
        return function (t) {
          return arc(interp(t));
        };
      });

      node.select("text").text(label_fmt);

      node.call(relayout_labels);

      // set up for chords
      //
      // TODO.  preferable not to calculate the link layout twice...

      var percent = d3.format("%");

      var link_id = function link_id(d) {
        return [d.source_index, d.target_index].join("x");
      };

      var gradient = defs.selectAll("linearGradient").data(function (matrix) {
        return calc_links(matrix, node_positions);
      }, link_id);

      gradient.exit().remove();

      var gradient_e = gradient.enter().append("linearGradient").attr("id", function (d) {
        return "gradient-" + link_id(d);
      }).attr("gradientUnits", "userSpaceOnUse");

      gradient.attr("x1", function (d) {
        return arc.centroid(d.source)[0];
      }).attr("y1", function (d) {
        return arc.centroid(d.source)[1];
      }).attr("x2", function (d) {
        return arc.centroid(d.target)[0];
      }).attr("y2", function (d) {
        return arc.centroid(d.target)[1];
      });

      var stop = gradient.selectAll("stop").data(function (d) {
        return [d.source_index, d.target_index];
      });
      stop.exit().remove();
      stop.enter().append("stop");
      stop.attr("offset", function (d, i) {
        return percent(i);
      });
      stop.attr("stop-color", function (d) {
        return fill(d);
      });

      // transition chords (i.e. cross-department links)

      var link = g.selectAll(".link").data(function (matrix) {
        return calc_links(matrix, node_positions);
      }, link_id);

      link.exit().transition().duration(mode_dur).attr("opacity", 0).remove();

      link.enter().append("path").attr("class", "link").attr("fill", function (d, i) {
        return "url(#gradient-" + link_id(d) + ")";
      }).attr("opacity", resting_opacity);

      link.transition().duration(mode_dur).attr("opacity", resting_opacity).attrTween("d", function (d) {
        // "this" below requires function...
        var interp = d3.interpolate(this._current || d, d);
        this._current = d;
        return function (t) {
          return chord(interp(t));
        };
      });
    }

    function focus(g, d0, i0) {

      // collect list of linked departments
      var affiliated = d3.set();
      g.selectAll(".link").filter(function (d) {
        return linked_to(d, i0);
      }).each(function (d) {
        affiliated.add(d.source_index);affiliated.add(d.target_index);
      });

      // silently move labels to focused dept

      g.selectAll(".dept .label_info").attr("opacity", 0);

      g.selectAll(".dept").filter(function (d, i) {
        return affiliated.has(i) || i === i0;
      }).call(relayout_labels);

      // transition the chords, then fade in labels

      g.transition().selectAll(".link").attr("opacity", function (d, i) {
        return linked_to(d, i0) ? 1 : defocus_opacity;
      });
      // TODO.  use gradients instead
      //          .attr("fill", (d) => linked_to(d, i0) ? fill(i0) : fill(dominant_arc(d, i0)) )

      var trans = g.transition().delay(label_delay).duration(label_dur);

      trans.selectAll(".dept .label_info").attr("opacity", function (d, i) {
        return affiliated.has(i) || i === i0 ? 1 : 0;
      });
      trans.select(".title").attr("opacity", 0);
    }

    function defocus(g) {

      g.classed('focused', false);

      g.transition().selectAll(".dept .label_info").attr("opacity", 0);

      var trans = g.transition().delay(label_dur);

      trans.selectAll(".link")
      // TODO.  use gradients instead
      //        .attr("fill", (d) => fill(dominant_arc(d)))
      .attr("opacity", resting_opacity);

      trans.select(".title").attr("opacity", 1);
    }

    var chart = function chart(g, order) {

      // margins

      // TODO.  not best to use a global here
      svg.attr('height', height);

      g.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

      // pair of graph connection diagrams

      var matrix_titles = ['Research', 'Teaching'];

      var chord = g.selectAll(".chord").data([research_matrix, teaching_matrix]);

      chord.enter().append("g").attr("class", "chord no_advance").append("text").attr("class", "title").attr("text-anchor", "middle").text(function (d, i) {
        return matrix_titles[i];
      });

      chord.select(".title").attr("transform", "translate(0," + -(labelRadius + title_margin) + ")");

      chord.attr("transform", function (d, i) {
        return "translate(" + (labelRadius * 2 * i + labelRadius) + "," + labelRadius + ")";
      }).call(update, order);

      // behavior

      // [ focus each chord diagram separately since labels must be repositioned ]

      chord.selectAll(".dept path").on("mouseenter", function (d, i) {
        return chord.each(function () {
          focus(d3.select(this), d, i);
        });
      }).on("mouseout", function (d, i) {
        return chord.each(function () {
          defocus(d3.select(this), d, i);
        });
      });
    };

    chart.relayout = function () {
      height = width * 0.7 - margins.bottom;

      innerRadius = Math.min((width - 100) / 2.0, height) * .41;
      outerRadius = innerRadius * 1.05;
      chordRadius = innerRadius * 0.99;
      labelRadius = innerRadius * 1.15;

      arc.innerRadius(innerRadius).outerRadius(outerRadius);

      label_arc.innerRadius(labelRadius).outerRadius(outerRadius);

      chord.radius(chordRadius);
    };

    return chart;
  }

  // matrix viz

  function render_matrix() {

    var margins = { top: 110, left: 0, right: 300, bottom: 0 };
    var tick_margins = { top: 50, left: 8, right: 0, bottom: 0 };
    var tick2_margins = { top: 230, left: 8, right: 0, bottom: 0 };

    var axis_width = 200;

    var legend_width = 150;
    var legend_cell = 7;
    var legend_packing = 1;
    var label_trim_value = 27;

    var mode_dur = 2500;

    var colors = // NB hand-tweaked for this dataset!
    [[-9, "#35b7e5"], [-2, "#35b7e5"], [0, "gray"], [4.5, "red"], [9, "yellow"]];

    var empty_color = "#dadad9";

    var points = d3.merge(d3.range(n).map(function (i) {
      return d3.range(n).map(function (j) {
        return { i: i, j: j };
      });
    }));

    var scale = d3.scale.ordinal();

    var colorscale = d3.scale.linear().domain(colors.map(function (d) {
      return d[0];
    })).range(colors.map(function (d) {
      return d[1];
    }));

    var sizescale = d3.scale.linear().domain([0, links_max - 1]);

    var csd = colorscale.domain();

    var immediate = true;

    var chart = function chart(g, order) {

      // margins

      svg.attr('height', width - margins.bottom); // TODO. avoid global DOM alteration

      g.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

      scale.domain(depts_by_metric[order]);

      sizescale.range([3, scale.rangeBand()]);

      // cells (links)

      var cell = g.selectAll(".cell").data(points);

      var cell_enter = cell.enter().append("g").attr("class", function (d) {
        return "cell x_" + to_class(dept_names[d.i]) + " y_" + to_class(dept_names[d.j]) + " no_advance";
      }).attr("transform", function (d) {
        return "translate(" + scale(d.i) + "," + scale(d.j) + ")";
      }).attr("fill", "transparent");

      cell_enter.append("title").text(function (d) {
        return dept_names[d.i] + " & " + dept_names[d.j] + "\nResearch: " + research_matrix[d.i][d.j] + ", Teaching: " + teaching_matrix[d.i][d.j];
      });

      cell_enter.append("rect").attr("class", "background").attr("rx", 1).attr("ry", 1).attr("stroke", "none").attr("opacity", 0.2).attr("fill", "none");

      cell_enter.append("rect").attr("class", "sum").attr("rx", 1).attr("ry", 1);

      cell_enter.selectAll(".sum").attr("stroke", "none").attr("x", function (d) {
        return scale.rangeBand() / 2.0 - sizescale(links_matrix[d.i][d.j]) / 2.0;
      }).attr("y", function (d) {
        return scale.rangeBand() / 2.0 - sizescale(links_matrix[d.i][d.j]) / 2.0;
      }).attr("width", function (d) {
        return sizescale(links_matrix[d.i][d.j]);
      }).attr("height", function (d) {
        return sizescale(links_matrix[d.i][d.j]);
      }).attr("fill", function (d) {
        return links_matrix[d.i][d.j] > 0 ? colorscale(balance_matrix[d.i][d.j]) : empty_color;
      }).attr("opacity", 1.0);

      // rules (nodes)

      var label_fmt = function label_fmt(d, i) {
        return trim(d, label_trim_value, orders[order].metric(i));
      };

      var xlabs = g.selectAll(".x.labels").data(dept_names);

      var xlabs_e = xlabs.enter().append("g").attr("class", "x labels no_advance").attr("transform", function (d, i) {
        return "translate(" + (scale(i) + 5) + ",-15)rotate(-45)";
      });

      xlabs_e.append("rect").attr("fill", "transparent").attr("width", axis_width).attr("height", scale.rangeBand());

      xlabs_e.append("text").attr("class", function (d, i) {
        return "dept" + i;
      }).attr("dominant-baseline", "middle").attr("dy", scale.rangeBand() / 2.0).attr("fill", "black");

      xlabs_e.call(highlight.bind(null, "x_"));

      xlabs.select("text").text(label_fmt);

      var ylabs = g.selectAll(".y.labels").data(dept_names).enter().append("g").attr("class", "y labels no_advance").attr("transform", function (d, i) {
        return "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")";
      });

      ylabs.append("rect").attr("fill", "transparent").attr("width", axis_width).attr("height", scale.rangeBand());

      ylabs.append("text").attr("class", function (d, i) {
        return "dept" + i;
      }).attr("dominant-baseline", "middle").attr("dy", scale.rangeBand() / 2.0).text(label_fmt).attr("fill", "black");

      ylabs.call(highlight.bind(null, "y_"));

      // legends

      var tick = g.selectAll(".tick").data(d3.range(d3.min(csd), d3.max(csd))).enter().append("g").attr("class", "tick").attr("transform", function (d, i) {
        return "translate(" + [-legend_width + tick_margins.left, tick_margins.top + (legend_cell + legend_packing) * i] + ")";
      });

      tick.append("rect").attr("width", legend_cell).attr("height", legend_cell).attr("fill", function (d) {
        return colorscale(d);
      });

      tick.append("g").append("text").attr("dominant-baseline", "hanging").attr("dx", legend_cell * 1.5).attr("fill", "black").text(function (d, i) {
        return i === 0 ? "more teaching links" : d === 0 ? "balanced" : d === d3.max(csd) - 1 ? "more research links" : "";
      });

      var ssd = sizescale.domain();
      var tick2 = g.selectAll(".tick2").data(d3.range(ssd[0], ssd[1], 2)).enter().append("g").attr("class", "tick2").attr("transform", function (d, i) {
        return "translate(" + [-legend_width + tick_margins.left, tick2_margins.top + scale.rangeBand() * i] + ")";
      });

      tick2.append("rect").attr("x", function (d, i) {
        return scale.rangeBand() / 2.0 - sizescale(i) / 2.0;
      }).attr("y", function (d, i) {
        return scale.rangeBand() / 2.0 - sizescale(i) / 2.0;
      }).attr("width", function (d, i) {
        return sizescale(i);
      }).attr("height", function (d, i) {
        return sizescale(i);
      }).attr("fill", "grey");

      tick2.append("text").attr("dx", scale.rangeBand() * 1.2).attr("dy", scale.rangeBand() / 2.0).attr("dominant-baseline", "middle").text(function (d, i) {
        return d + (i === 0 ? " total links" : "");
      });

      // finish layout

      g.selectAll(".cell .background").attr("width", scale.rangeBand()).attr("height", scale.rangeBand());

      g.selectAll(".cell .sum").attr("width", function (d) {
        return sizescale(links_matrix[d.i][d.j]);
      }).attr("height", function (d) {
        return sizescale(links_matrix[d.i][d.j]);
      });

      // animation

      var trans = g.transition().duration(immediate ? 0 : mode_dur);

      trans.selectAll(".x.labels").delay(function (d, i) {
        return immediate ? 0 : scale(i) * 4;
      }).attr("transform", function (d, i) {
        return "translate(" + (scale(i) + 5) + ",-15)rotate(-45)";
      });

      trans.selectAll(".cell").delay(function (d) {
        return immediate ? 0 : scale(d.i) * 4;
      }).attr("transform", function (d) {
        return "translate(" + scale(d.i) + "," + scale(d.j) + ")";
      });

      trans.selectAll(".y.labels").delay(function (d, i) {
        return immediate ? 0 : scale(i) * 4;
      }).attr("transform", function (d, i) {
        return "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")";
      });

      immediate = false;

      // behavior

      function highlight(prefix, sel) {
        sel.on("mouseover", function (d) {
          d3.selectAll(".cell.selected").classed("selected", false);
          d3.selectAll(".cell." + prefix + to_class(d)).classed("selected", true);
        });
      }
    };

    chart.relayout = function () {
      scale.rangeRoundBands([0, width - margins.left - margins.right], 0.1);
      immediate = true;
    };

    return chart;
  }

  // initial layout and first render

  relayout(window.innerWidth);
  show('chord', 'department');
  timeout = setTimeout(advance, first_slide_pause);
});

// Utility functions

function trim(s, n) {
  var m = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  m = m === s ? null : m;
  m = m ? " [" + m + "]" : "";
  s = s.length + m.length > n ? s.slice(0, n - m.length - 3) + "..." : s;
  return s + m;
}

function to_class(s) {
  return s.toLowerCase().replace(/\W/g, '_');
}

function uniq() {
  var vals = [];
  for (var i = 0; i < arguments.length; i++) {
    vals = vals.concat(arguments[i]);
  }
  return d3.set(vals).values();
}

// Matrix manipulation

function constant_matrix(n, c) {
  c = c || 0.0;
  return d3.range(0, n).map(function () {
    return d3.range(0, n).map(function () {
      return c;
    });
  });
}

function lift(fn) {
  return function (a, b) {

    var n = a.length,
        c = constant_matrix(n);

    var i = -1;while (i++ < n - 1) {
      var j = -1;while (j++ < n - 1) {
        c[i][j] = fn(a[i][j], b[i][j]);
      }
    }

    return c;
  };
}

function populate(proj1, proj2, valfn, xs, m) {
  xs.forEach(function (x) {
    var i = proj1(x);
    var j = proj2(x);
    if (m[i][j] || m[j][i]) {
      console.log("WARNING: " + i + " x " + j + " = " + m[i][j] + " or " + m[j][i] + " or " + valfn(x) + "?");
    }
    m[i][j] = m[j][i] = valfn(x);
  });
  return m;
}
