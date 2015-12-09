default: data-6.4.csv

raw0.csv:
	cat tabula-CrossDepResearch_report_finaldraft-* > raw0.csv

raw1.csv: raw0.csv
	tr -d '\r' < raw0.csv > raw1.csv

raw2.csv: raw1.csv
	sed "1s/.*/department1,department2,links/" raw1.csv > raw2.csv

raw3.csv: raw2.csv
	patch raw2.csv -i law.diff -o raw3.csv

data-6.4.csv: raw1.csv
	python munge.py < raw1.csv > data-6.4.csv

clean:
	rm raw*.csv data-6.4.csv
