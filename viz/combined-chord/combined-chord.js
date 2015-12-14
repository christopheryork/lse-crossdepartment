// This file must be pre-processed for Safari, as it uses arrow functions.

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
  dept_names.sort();

  // prepare the matrix

  var matrix = dept_names.map(function (d) {
    return dept_names.map(function (d) {
      return 0.0;
    });
  });

  [].concat(research).concat(teaching).forEach(function (d) {
    if (d.department1 > d.department2) {
      alert('bad data');
    }
    var d1 = dept_names.indexOf(d.department1);
    var d2 = dept_names.indexOf(d.department2);
    matrix[d1][d2] = matrix[d2][d1] += d.links;
  });

  // visualization proper

  var width = 1200,
      height = 400,
      innerRadius = Math.min(width / 2.0, height) * .41,
      outerRadius = innerRadius * 1.05,
      chordRadius = innerRadius * 0.99,
      labelRadius = innerRadius * 1.1;

  var fill = d3.scale.category20c().domain(dept_names);

  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + width / 4.0 + "," + height / 2 + ")");

  var layout = d3.layout.chord().padding(.01).sortSubgroups(d3.descending).sortChords(d3.ascending).matrix(matrix);

  // outer circle

  var dept = svg.append("g").attr("class", "dept").selectAll("g").data(layout.groups).enter().append("g");

  var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);

  dept.append("path").attr("fill", function (d) {
    return fill(dept_names[d.index]);
  }).attr("d", arc);

  var label_arc = d3.svg.arc().innerRadius(labelRadius).outerRadius(labelRadius);

  dept.append("text").attr("class", function (d, i) {
    return "group" + i;
  }).each(function (d) {
    return d.angle = (d.startAngle + d.endAngle) / 2;
  }).attr("transform", function (d) {
    return "translate(" + label_arc.centroid(d) + ")";
  }).attr("text-anchor", function (d) {
    return d.angle > Math.PI ? "end" : null;
  }).text(function (d) {
    return dept_names[d.index];
  }).attr("opacity", 0.0);

  // chords

  var chord = d3.svg.chord().radius(chordRadius);

  var link = svg.append("g").attr("class", "chord").selectAll("path").data(layout.chords).enter().append("path").attr("class", function (d) {
    return "group" + d.source.index + " group" + d.target.index;
  }).attr("d", chord).style("fill", function (d) {
    return fill(dept_names[d.source.index]);
  });

  // interactivity

  dept.on("mouseover", function (d, i) {
    var groups = d3.set([i]);
    d3.selectAll(".chord path").filter(function (d) {
      return d.source.index === i || d.target.index === i;
    }).each(function (d) {
      groups.add(d.source.index);
      groups.add(d.target.index);
    });
    groups.forEach(function (j) {
      d3.selectAll(".dept .group" + j).transition().attr("opacity", 1.0);
    });
    d3.selectAll(".chord path").transition().attr("opacity", 0.05);
    d3.selectAll(".chord path.group" + i).transition().attr("opacity", 1.0);
  });

  dept.on("mouseout", function (d, i) {
    d3.selectAll(".dept text").transition().attr("opacity", 0.0);
    d3.selectAll(".chord path").transition().attr("opacity", 0.2);
  });
});
