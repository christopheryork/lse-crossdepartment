#!/usr/bin/env ruby

require 'csv'

input = ARGV[0]


pairs = []

puts "department1,department2,links"
CSV.foreach(input) do |depts, links, total, programs|
  depts = depts.split(',').map(&:strip).sort

  depts.permutation(2).each do |a,b|
    s = "#{a},#{b}"
    unless pairs.include? s
      puts "#{a},#{b},#{total}"
      pairs << s
    end
  end
end
