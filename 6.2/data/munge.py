import sys
import pandas as pd


df = pd.read_csv(sys.stdin)

def min(d):
    return d['department1'] if d['department1'] < d['department2'] else d['department2']

def max(d):
    return d['department1'] if d['department1'] > d['department2'] else d['department2']

df2 = pd.DataFrame({'links':       df['links'],
                    'department1': df.apply(min, axis=1),
                    'department2': df.apply(max, axis=1)})

df2 = df2.drop_duplicates().sort(['department1', 'department2'])

df2.to_csv(sys.stdout, index=False)
