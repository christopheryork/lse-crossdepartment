#!/usr/bin/env ruby

require 'csv'

input = ARGV[0]


=begin

nodedef>name VARCHAR,label VARCHAR
s1,Site number 1
s2,Site number 2
s3,Site number 3
edgedef>node1 VARCHAR,node2 VARCHAR, weight DOUBLE
s1,s2,1.2341
s2,s3,0.453
s3,s2, 2.34
s3,s1, 0.871

=end

colors = ["#d53e4f","#f46d43","#fdae61","#fee08b","#ffffbf","#e6f598","#abdda4","#66c2a5","#3288bd"].reverse

nodes = {}
edges = []

def node(nodes, label)
  nodes[label] = nodes[label] || "s#{nodes.size}"
  return nodes[label]
end

colors = colors.map do |hex|
  r = hex.slice(1,2).to_i(16)
  g = hex.slice(3,2).to_i(16)
  b = hex.slice(5,2).to_i(16)
  "#{r},#{g},#{b}"
end

# parse input

CSV.foreach(input) do |src, tgt, weight|
  edges << { src: node(nodes, src), tgt: node(nodes, tgt), weight: weight }
end

# generate output

puts "nodedef>name VARCHAR,label VARCHAR"
nodes.each_pair do |label, id|
  puts "#{id},#{label}"
end

puts "edgedef>node1 VARCHAR,node2 VARCHAR,weight DOUBLE,color VARCHAR"
edges.each do |e|
  wgt = e[:weight].to_i
  clr = colors[wgt-1]
  puts "#{e[:src]},#{e[:tgt]},#{wgt},'#{clr}'"
end

