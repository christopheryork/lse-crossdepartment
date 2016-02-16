//
// Cross-Departmental Research and Teaching DV
//
// (c) Christopher York 2016
//     Communications
//     London School of Economics
//

// This file must be pre-processed for Safari, as it uses arrow functions.

// TODO
//   - chord colors during selection should be by *opposite* dept color
//   - relayout on resize of window
//   - each view in a separate group, fade in on select
//   - move through modes on a timer                                      DONE
//   - shouldn't advance modes during hover on a department
//   - faculty sorting for dual chord

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

  // prepare list of nodes; should be a superset of depts list
  var rd1 = research.map(function (d) {
    return d.department1;
  });
  var rd2 = research.map(function (d) {
    return d.department2;
  });
  var td1 = teaching.map(function (d) {
    return d.department1;
  });
  var td2 = teaching.map(function (d) {
    return d.department2;
  });
  var dept_names = d3.set([].concat(rd1).concat(rd2).concat(td1).concat(td2)).values();
  var n = dept_names.length;

  // prepare the matrices

  function populate(xs, m) {
    xs.forEach(function (x) {
      var i = dept_names.indexOf(x.department1);
      var j = dept_names.indexOf(x.department2);
      if (m[i][j] || m[j][i]) {
        console.log("WARNING: " + x.department1 + " x " + x.department2 + " = " + m[i][j] + " or " + m[j][i] + " or " + x.links + "?");
      }
      m[i][j] = m[j][i] = x.links;
    });
    return m;
  }

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

  var research_matrix = populate(research, constant_matrix(n));
  var teaching_matrix = populate(teaching, constant_matrix(n));

  // vizualization proper

  var width = window.innerWidth,
      height = width * 0.7,
      innerRadius = width * .175,
      outerRadius = innerRadius * 1.05,
      chordRadius = innerRadius * 0.99,
      labelRadius = innerRadius * 1.15,
      padAngle = 0.01,
      chordWidth = 0.04,
      mode_dur = 750,
      firstSlide = 2500,
      slideSpeed = 7500;

  var margins = { top: 0, left: 150, right: 50, bottom: 0 };

  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);

  var fill = d3.scale.category20c().domain(d3.range(0, n));

  var research_g = svg.append("g").attr("transform", "translate(" + (margins.left + labelRadius) + "," + (margins.top + labelRadius) + ")");

  var teaching_g = svg.append("g").attr("transform", "translate(" + (width - margins.right - labelRadius) + "," + (margins.top + labelRadius) + ")");

  var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);

  var label_arc = d3.svg.arc().innerRadius(labelRadius).outerRadius(outerRadius);

  var chord = d3.svg.chord().radius(chordRadius);

  function arc_center(d, width) {
    width = width || 0.1;
    var c = d3.mean([d.startAngle, d.endAngle]),
        s = d3.max([d.startAngle, c - width]);
    t = d3.min([c + width, d.endAngle]);

    return { startAngle: s, endAngle: t };
  }

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

  var pie = d3.layout.pie().padAngle(padAngle).value(sum);

  var sortsum = function sortsum(a, b) {
    return d3.descending(sum(a), sum(b));
  };

  var pies = {
    department: pie.sort(null)(constant_matrix(n, 1)),
    faculty: pie.sort(sortsum)(constant_matrix(n, 1)),
    links: pie.sort(sortsum)(matrix_add(research_matrix, teaching_matrix)),
    emphasis: pie.sort(sortsum)(matrix_subtract(research_matrix, teaching_matrix))
  };

  function update_chord(g, data, node_positions) {

    // update layout
    var link_info = calc_links(data, node_positions);

    // transition nodes

    var node = g.selectAll(".dept").data(node_positions);

    node.exit().remove();

    var node_g = node.enter().append("g").attr("class", function (d, i) {
      return "dept dept_" + i;
    });

    node_g.append("path").attr("fill", function (d, i) {
      return fill(i);
    });

    node_g.append("text").attr("opacity", 0);

    var trans = node.transition().duration(mode_dur);

    trans.select("path").attrTween("d", function (d) {
      // "this" below requires function...
      var interp = d3.interpolate(this._current || d, d);
      this._current = d;
      return function (t) {
        return arc(interp(t));
      };
    });

    trans.select("text").attr("transform", function (d) {
      return "translate(" + label_arc.centroid(d) + ")";
    }).attr("text-anchor", function (d) {
      return arc_center(d, chordWidth).startAngle < Math.PI ? "start" : "end";
    }).text(function (d, i) {
      return dept_names[i];
    });

    // transition links

    var link = g.selectAll(".link").data(link_info, function (d) {
      return [d.source_index, d.target_index].join("x");
    });

    link.exit().transition().duration(mode_dur).attr("opacity", 0).remove();

    link.enter().append("path").attr("class", "link").attr("fill", function (d) {
      return fill(d3.min([d.source_index, d.target_index]));
    }).attr("opacity", 0);

    link.transition().duration(mode_dur).attr("opacity", 1).attrTween("d", function (d) {
      // "this" below requires function...
      var interp = d3.interpolate(this._current || d, d);
      this._current = d;
      return function (t) {
        return chord(interp(t));
      };
    });
  }

  function listeners(elems) {

    elems.forEach(function (g) {
      g.selectAll(".dept").on("mouseenter", focus).on("mouseout", defocus);
    });

    function focus(d0, i0) {
      elems.forEach(function (g) {

        // collect list of linked departments
        var affiliated = d3.set();
        g.selectAll(".link").filter(function (d) {
          return d.source_index === i0 || d.target_index === i0;
        }).each(function (d) {
          affiliated.add(d.source_index);affiliated.add(d.target_index);
        });

        // transition graph
        var trans = g.transition();
        trans.selectAll(".dept text").attr("opacity", function (d, i) {
          return affiliated.has(i) || i === i0 ? 1 : 0;
        });
        trans.selectAll(".link").attr("opacity", function (d, i) {
          return d.source_index === i0 || d.target_index === i0 ? 1 : 0.05;
        });
      });
    }

    function defocus() {
      elems.forEach(function (g) {
        var trans = g.transition();
        trans.selectAll(".link").attr("opacity", 1);
        trans.selectAll(".dept text").attr("opacity", 0);
      });
    }
  }

  research_g.call(update_chord, research_matrix, pies.department);
  teaching_g.call(update_chord, teaching_matrix, pies.department);

  listeners([research_g, teaching_g]);

  // start off moving into alphabetical order

  function order(key) {
    research_g.call(update_chord, research_matrix, pies[key]);
    teaching_g.call(update_chord, teaching_matrix, pies[key]);
  }

  var timeout = setTimeout(advance, firstSlide);

  function advance() {
    var keys = [];
    d3.selectAll('#order input[type="radio"]').each(function () {
      keys.push(this.value);
    });

    var val = d3.select('#order :checked').node().value;
    var nextval = keys[(keys.indexOf(val) + 1) % keys.length];

    order(nextval);
    d3.select('#order input[value="' + nextval + '"]').property('checked', true);

    timeout = setTimeout(advance, slideSpeed);
  }

  d3.select("#order").on("change", function () {
    clearTimeout(timeout);
    var val = d3.select('#order :checked').node().value;
    order(val);
  });

  /*
  
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
  
    */
});

// Utility functions

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

function total(matrix, i) {
  return matrix[i].reduce(function (a, b) {
    return a + b;
  });
}
