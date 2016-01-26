import sys
import pandas as pd
import numpy as np

import itertools


df = pd.read_csv(sys.stdin)

def permute(d):
  depts = d['Departments'].split(', ')
  total = d['Total']

  data = []

  for x, y in itertools.permutations(depts, 2):
    if x < y:
        data = data + [ { 'department1': x,
                          'department2': y,
                          'links': total } ]

  return data

# explode permutations to a simple list of tuples
data = df.apply(permute, axis=1).tolist()
data = list(itertools.chain(*data))

df2 = pd.DataFrame(data, columns=['department1', 'department2', 'links'])

# for table 6.4, duplicates indicate different links so sum them
df2 = df2.groupby(['department1', 'department2']).sum()

df2.to_csv(sys.stdout)
