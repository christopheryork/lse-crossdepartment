default: data-6.4.csv

raw0.csv:
	tr "\r" "\n" < excel-revised-table.csv > raw0.csv

raw1.csv: raw0.csv
	sed 's/Philosophy, Logic and Scientific Method/Philosophy\/Logic\/Scientific Method/g' raw0.csv > raw1.csv

data-6.4.csv: raw1.csv
	python munge.py < raw1.csv > data-6.4.csv

clean:
	rm raw*.csv data-6.4.csv
