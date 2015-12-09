import sys
import pandas as pd


research = pd.read_csv('raw2.csv')
teaching = pd.read_csv('raw5.csv')

research = research[ ['department', 'faculty', 'research_links' ] ]
teaching = teaching[ ['department', 'teaching_links' ] ]

df = pd.DataFrame.merge(research, teaching, how='outer', on='department').sort(['department'])

df.to_csv(sys.stdout, index=False)
