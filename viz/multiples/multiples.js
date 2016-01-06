// This file must be pre-processed for Safari, as it uses arrow functions.

"use strict";

function empty_matrix(n) {
  var m = Array(n);
  var i = -1;while (i++ < n) {
    m[i] = Array(n);
    var j = -1;while (j++ < n) {
      m[i][j] = 0.0;
    }
  }
  return m;
}

function trim(d, n) {
  return d.length > n ? d.slice(0, n - 3) + "..." : d;
}

queue().defer(d3.csv, "../data-6.1,6.3.csv").defer(d3.csv, "../data-6.2.csv").defer(d3.csv, "../data-6.4.csv").await(function (err, depts, research, teaching) {
  if (err) {
    throw err;
  }

  // convert data from JSON to javascript types
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
  dept_names.sort();
  var n = dept_names.length;

  var official = depts.map(function (d) {
    return d.department;
  });

  // prepare the matrices

  function populate(xs, m) {
    xs.forEach(function (x) {
      var i = dept_names.indexOf(x.department1);
      var j = dept_names.indexOf(x.department2);
      m[i][j] = m[j][i] = x.links;
    });
    return m;
  }

  var research_matrix = populate(research, empty_matrix(n));
  var teaching_matrix = populate(teaching, empty_matrix(n));

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

  var research_totals = research_matrix.map(function (d) {
    return d.reduce(function (x, y) {
      return x + y;
    }, 0.0);
  });
  var teaching_totals = teaching_matrix.map(function (d) {
    return d.reduce(function (x, y) {
      return x + y;
    }, 0.0);
  });

  var m = [].concat(research_totals).concat(teaching_totals).reduce(function (x, y) {
    return x + y;
  }, 0.0);
  var k = 2 * Math.PI / m;

  function angle(i) {
    var r = research_totals.slice(0, i).reduce(function (x, y) {
      return x + y;
    }, 0.0);
    var t = teaching_totals.slice(0, i).reduce(function (x, y) {
      return x + y;
    }, 0.0);
    return (r + t) * k;
  }

  function centroid(i) {
    var startAngle = angle(i);
    var endAngle = angle(i + 1);
    var center = (startAngle + endAngle) / 2.0;
    return { startAngle: center - chord_width,
      endAngle: center + chord_width };
  }

  // visualization proper

  var arc = d3.svg.arc().startAngle(function (d, i) {
    return angle(i);
  }).endAngle(function (d, i) {
    return angle(i + 1);
  });

  var chord = d3.svg.chord().radius(radius - thickness - chord_padding).source(function (d) {
    var i = dept_names.indexOf(d.department1);
    return centroid(i);
  }).target(function (d) {
    var i = dept_names.indexOf(d.department2);
    return centroid(i);
  });

  var fill = d3.scale.category20c().domain(d3.range(n));

  var offset = function offset(i) {
    return [radius + (radius * 2.0 + h_padding) * (i % rows), radius + (radius * 2.0 + v_padding * 3) * 2 * Math.floor(i / rows)];
  };

  var svg = d3.select("body").append("svg").attr("width", (radius * 2.0 + h_padding) * rows + border.left + border.right).attr("height", (radius * 2.0 + v_padding * 3) * 2 * (Math.floor(dept_names.length / rows) + 1) + border.top + border.bottom).append("g").attr("transform", "translate(" + border.left + "," + border.top + ")");

  svg.append("g").attr("class", "modes").selectAll("g").data(d3.range(0, Math.floor(dept_names.length / rows) + 1)).enter().append("g").attr("transform", function (d, i) {
    return "translate(0," + (radius + (radius * 2.0 + v_padding * 3) * 2 * i) + ")";
  }).selectAll("text").data(['research', 'teaching']).enter().append("text").attr("class", "label").attr("text-anchor", "end").attr("dx", -15).attr("y", function (d, i) {
    return (radius * 2 + v_padding) * i;
  }).text(function (d) {
    return trim(d, trim_value);
  });

  var pair = svg.selectAll(".pair").data(dept_names).enter().append("g").attr("class", function (d) {
    return "pair " + d;
  }).attr("transform", function (d, i) {
    return "translate(" + offset(i) + ")";
  });

  pair.append("text").attr("class", "label").attr("text-anchor", "middle").attr("dy", -(radius + v_padding)).text(function (d) {
    return trim(d, trim_value);
  });

  var radial = pair.selectAll(".radial").data(function (dept) {
    return ['research', 'teaching'].map(function (mode) {
      return { mode: mode, dept: dept };
    });
  }).enter().append("g").attr("class", function (d) {
    return "radial " + d.mode;
  }).attr("transform", function (d) {
    return "translate(0," + (d.mode === 'research' ? 0.0 : radius * 2.0 + v_padding) + ")";
  });

  radial.append("g").selectAll(".arc").data(function (d) {
    return dept_names.map(function (dn) {
      return { focus: d.dept, dept: dn };
    });
  }).enter().append("path").attr("class", "arc").attr("d", arc.innerRadius(function (d) {
    return radius - thickness + (d.focus === d.dept ? focus_thickness / 2.0 : 0.0);
  }).outerRadius(function (d) {
    return radius + (d.focus === d.dept ? focus_thickness : 0.0);
  })).attr("fill", function (d, i) {
    return fill(i);
  });

  radial.append("g").selectAll(".chord").data(function (d) {
    var i = dept_names.indexOf(d.dept);
    var links = (d.mode === 'teaching' ? teaching_matrix[i] : research_matrix[i]) || [];
    var chords = [];
    links.forEach(function (l, i) {
      if (l > 0) {
        chords.push({ department1: d.dept, department2: dept_names[i], links: l });
      }
    });
    return chords;
  }).enter().append("path").attr("class", "chord").attr("d", chord).attr("fill", function (d) {
    return fill(dept_names.indexOf(d.department2));
  });
});
