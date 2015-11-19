#!/usr/bin/env ruby

require 'csv'

input = ARGV[0]

puts "Source\tTarget"
CSV.foreach(input) do |depts, links, total, programs|
  depts = depts.split(',').map(&:strip).sort

  depts.permutation(2).each do |a, b|
    puts "#{a}\t#{b}"
  end
end

