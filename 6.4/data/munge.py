import sys
import pandas as pd
import numpy as np

import itertools


df = pd.read_csv(sys.stdin)

data = []

def permute(d):
  global data                # sometimes it's easier to cheat a little

  depts = d['Departments'].split(', ')
  total = d['Total']
  for x, y in itertools.permutations(depts, 2):
    if x < y:
      data = data + [ { 'department1': x,
                        'department2': y,
                        'links': total } ]

  return df.size


df.apply(permute, axis=1)

df2 = pd.DataFrame(data, columns=['department1', 'department2', 'links'])

df2 = df2.drop_duplicates().sort(['department1', 'department2'])

df2.to_csv(sys.stdout, index=False)
