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

function to_class(s) {
  return s.toLowerCase().replace(/\W/g, '_');
}

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

  console.log("populating research matrix");
  var research_matrix = populate(research, empty_matrix(n));
  console.log("populating teaching matrix");
  var teaching_matrix = populate(teaching, empty_matrix(n));

  console.log("departments");
  console.log(JSON.stringify(dept_names));

  console.log("research");
  research_matrix.forEach(function (d) {
    return console.log(JSON.stringify(d));
  });

  console.log("research sums");
  dept_names.forEach(function (d, di) {
    console.log(d + " : " + research_matrix[di].reduce(function (a, b) {
      return a + b;
    }));
  });

  console.log("teaching sums");
  dept_names.forEach(function (d, di) {
    console.log(d + " : " + teaching_matrix[di].reduce(function (a, b) {
      return a + b;
    }));
  });

  // prepare the orders

  var _faculty = d3.range(n).map(function () {
    return 0;
  });
  depts.forEach(function (d) {
    return _faculty[dept_names.indexOf(d.department)] = d.faculty;
  });

  function count_links(di) {
    return research_matrix[di].reduce(function (a, b) {
      return a + b;
    }) + teaching_matrix[di].reduce(function (a, b) {
      return a + b;
    });
  }

  function balance_links(di) {
    return research_matrix[di].reduce(function (a, b) {
      return a + b;
    }) - teaching_matrix[di].reduce(function (a, b) {
      return a + b;
    });
  }

  var orders = {
    department: d3.range(n).sort(function (a, b) {
      return d3.ascending(dept_names[a], dept_names[b]);
    }),
    faculty: d3.range(n).sort(function (a, b) {
      return _faculty[b] - _faculty[a];
    }),
    links: d3.range(n).sort(function (a, b) {
      return count_links(b) - count_links(a);
    }),
    balance: d3.range(n).sort(function (a, b) {
      return balance_links(b) - balance_links(a);
    })
  };

  var metrics = {
    faculty: function faculty(d) {
      return _faculty[d];
    },
    links: function links(d) {
      return count_links(d);
    },
    balance: function balance(d) {
      return balance_links(d);
    }
  };

  // visualization proper

  var width = 850,
      height = 700,
      margins = { top: 90, left: 150, right: 50, bottom: 0 },
      legend_cell = 7,
      legend_packing = 1,
      cell_packing = 3,
      cell_padding = 1,
      stroke_width = 1.0,
      trim_value = 27,
      research_color_1 = "red",
      research_color_2 = "yellow",
      neutral_color = "gray",
      empty_color = "#dadad9",
      teaching_color = "#35b7e5",
      firstSlide = 2500,
      slideSpeed = 7500;

  var svg = d3.select("body").append("svg").attr("width", width + margins.left + margins.right).attr("height", height + margins.top + margins.bottom).append("g").attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  var scale = d3.scale.ordinal().domain(orders.department).rangeRoundBands([0, width - margins.left - margins.right], 0.1);

  var colorscale = d3.scale.linear().domain([-9, -2, 0, 4.5, 9]).range([teaching_color, teaching_color, neutral_color, research_color_1, research_color_2]);

  var sizescale = d3.scale.linear().domain([0, 10]).range([3, scale.rangeBand()]);

  var size = function size(i, j) {
    return research_matrix[i][j] + teaching_matrix[i][j];
  };
  var bal = function bal(i, j) {
    return research_matrix[i][j] - teaching_matrix[i][j];
  };

  var csd = colorscale.domain();

  var legend = svg.append("g").attr("class", "legend").attr("transform", "translate(" + (-margins.left + 10) + ",200)");

  legend.append("g").attr("class", "tick_container");
  legend.append("g").attr("class", "tick2_container");

  var matrix = svg.append("g").attr("class", "matrix");

  var points = d3.merge(d3.range(n).map(function (i) {
    return d3.range(n).map(function (j) {
      return { i: i, j: j };
    });
  }));

  var g = matrix.selectAll("g").data(points).enter().append("g").attr("class", function (d) {
    return "cell x_" + to_class(dept_names[d.i]) + " y_" + to_class(dept_names[d.j]);
  }).attr("transform", function (d) {
    return "translate(" + scale(d.i) + "," + scale(d.j) + ")";
  }).attr("fill", "transparent");

  g.append("title").text(function (d) {
    return dept_names[d.i] + " & " + dept_names[d.j] + "\nResearch: " + research_matrix[d.i][d.j] + ", Teaching: " + teaching_matrix[d.i][d.j];
  });

  g.append("rect").attr("class", "background").attr("rx", 1).attr("ry", 1).attr("stroke", "none").attr("width", scale.rangeBand()).attr("height", scale.rangeBand()).attr("opacity", 0.2).attr("fill", "none");

  g.append("rect").attr("class", "sum").attr("rx", 1).attr("ry", 1);

  // dots for linkages

  var circle = g.selectAll("circle").data(function (d) {
    return d3.range(size(d.i, d.j)).map(function (k) {
      return d;
    });
  });

  var radius = (scale.rangeBand() / cell_packing - cell_padding) / 2.0;

  circle.enter().append("circle").attr("r", radius).attr("cx", function (d, i) {
    return stroke_width / 2.0 + radius + i % cell_packing * (radius * 2 + cell_padding);
  }).attr("cy", function (d, i) {
    return stroke_width / 2.0 + radius + Math.floor(i / cell_packing) * (radius * 2 + cell_padding);
  }).attr("fill", function (d, i) {
    var s = size(d.i, d.j);
    var b = bal(d.i, d.j);
    return i < s - Math.abs(b) ? neutral_color : b > 0 ? research_color_1 : teaching_color;
  });

  // Rules

  var xlabs = svg.append("g").attr("class", "x labels").selectAll("text").data(dept_names).enter().append("g").attr("transform", function (d, i) {
    return "translate(" + scale(i) + ",0)rotate(-45)";
  });

  xlabs.append("rect").attr("fill", "transparent").attr("width", 200).attr("height", scale.rangeBand());

  xlabs.append("text").attr("class", function (d, i) {
    return "dept" + i;
  }).attr("dominant-baseline", "middle").attr("dy", scale.rangeBand() / 2.0).text(function (d) {
    return trim(d, trim_value);
  }).attr("fill", "black");

  xlabs.call(highlight.bind(null, "x_"));

  var ylabs = svg.append("g").attr("class", "y labels").selectAll("g").data(dept_names).enter().append("g").attr("transform", function (d, i) {
    return "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")";
  });

  ylabs.append("rect").attr("fill", "transparent").attr("width", 200).attr("height", scale.rangeBand());

  ylabs.append("text").attr("class", function (d, i) {
    return "dept" + i;
  }).attr("dominant-baseline", "middle").attr("dy", scale.rangeBand() / 2.0).text(function (d) {
    return trim(d, trim_value);
  }).attr("fill", "black");

  ylabs.call(highlight.bind(null, "y_"));

  // behavior

  d3.select("#order").on("change", function () {
    clearTimeout(timeout);
    var val = d3.select('#order :checked').node().value;
    order(val);
  });

  function highlight(prefix, sel) {
    sel.on("mouseover", function (d) {
      d3.selectAll(".cell.selected").classed("selected", false);
      d3.selectAll(".cell." + prefix + to_class(d)).classed("selected", true);
    });
  }

  function order(value, duration) {
    scale.domain(orders[value]);

    var t = svg.transition().duration(duration || 2500);

    t.selectAll(".x.labels g").delay(function (d, i) {
      return scale(i) * 4;
    }).attr("transform", function (d, i) {
      return "translate(" + (scale(i) + 5) + ",-5)rotate(-45)";
    });

    t.selectAll(".cell").delay(function (d) {
      return scale(d.i) * 4;
    }).attr("transform", function (d) {
      return "translate(" + scale(d.i) + "," + scale(d.j) + ")";
    });

    t.selectAll(".y.labels g").delay(function (d, i) {
      return scale(i) * 4;
    }).attr("transform", function (d, i) {
      return "translate(" + (width - margins.right - margins.left) + "," + scale(i) + ")";
    });
  }

  function update() {
    var details = d3.select(".toggle input").property("checked");

    if (details) {
      svg.selectAll(".matrix circle").transition().attr("visibility", "visible");
      svg.selectAll(".matrix .sum").attr("stroke", "grey").attr("x", 0).attr("y", 0).attr("width", scale.rangeBand()).attr("height", scale.rangeBand()).attr("fill", "transparent").attr("opacity", "0.2");
    } else {
      svg.selectAll(".matrix circle").transition().attr("visibility", "hidden");
      svg.selectAll(".matrix .sum").attr("stroke", "none").attr("x", function (d) {
        return scale.rangeBand() / 2.0 - sizescale(size(d.i, d.j)) / 2.0;
      }).attr("y", function (d) {
        return scale.rangeBand() / 2.0 - sizescale(size(d.i, d.j)) / 2.0;
      }).attr("width", function (d) {
        return sizescale(size(d.i, d.j));
      }).attr("height", function (d) {
        return sizescale(size(d.i, d.j));
      }).attr("fill", function (d) {
        var b = bal(d.i, d.j);
        return size(d.i, d.j) > 0 ? colorscale(b) : empty_color;
      }).attr("opacity", 1.0);
    }

    var tick = legend.select("g.tick_container").selectAll(".tick").data(d3.range(d3.min(csd), d3.max(csd))).enter().append("g").attr("class", "tick").attr("transform", function (d, i) {
      return "translate(0,-" + (legend_cell + legend_packing) * i + ")";
    });

    tick.append("rect").attr("width", legend_cell).attr("height", legend_cell).attr("fill", function (d) {
      return colorscale(d);
    });

    tick.append("g").append("text").attr("dominant-baseline", "hanging").attr("dx", legend_cell * 1.5).attr("fill", "black").text(function (d, i) {
      return i === 0 ? "more teaching links" : d === 0 ? "balanced" : d === d3.max(csd) - 1 ? "more research links" : "";
    });

    var ssd = sizescale.domain();
    var tick2 = legend.select("g.tick2_container").selectAll(".tick2").data(d3.range(ssd[0], ssd[1])).enter().append("g").attr("class", "tick2").attr("transform", function (d, i) {
      return "translate(0," + (scale.rangeBand() * i + 40) + ")";
    });

    tick2.append("rect").attr("x", function (d, i) {
      return scale.rangeBand() / 2.0 - sizescale(i) / 2.0;
    }).attr("y", function (d, i) {
      return scale.rangeBand() / 2.0 - sizescale(i) / 2.0;
    }).attr("width", function (d, i) {
      return sizescale(i);
    }).attr("height", function (d, i) {
      return sizescale(i);
    }).attr("fill", neutral_color);

    tick2.append("text").attr("dx", scale.rangeBand() * 1.2).attr("dy", scale.rangeBand() / 2.0).attr("dominant-baseline", "middle").text(function (d, i) {
      return d + (i === 0 ? " total links" : "");
    });
  }

  update();

  // start off moving into alphabetical order

  d3.select(".toggle").on("change", update);

  var timeout = setTimeout(advance, firstSlide);

  function advance() {
    var keys = [];
    d3.selectAll('#order input[type="radio"]').each(function () {
      keys.push(this.value);
    });

    var val = checked_order();
    var nextval = keys[(keys.indexOf(val) + 1) % keys.length];

    order(nextval);
    d3.select('#order input[value="' + nextval + '"]').property('checked', true);

    timeout = setTimeout(advance, slideSpeed);
  }

  function checked_order() {
    return d3.select('#order :checked').node().value;
  }
});
