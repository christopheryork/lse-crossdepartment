default: data-6.2.csv

raw0.csv: excel-revised-table.csv
	tr "\r" "\n" < excel-revised-table.csv > raw0.csv

raw1.csv: raw0.csv
	sed 's/Philosophy, Logic and Scientific Method/Philosophy\/Logic\/Scientific Method/g;s/IR/International Relations/g' raw0.csv > raw1.csv

raw2.csv: raw1.csv
	sed 's/\"//g;s/, /,/g;s/ ,/,/g' raw1.csv > raw2.csv

raw3.csv: raw2.csv
	sed "1s/.*/department1,department2,links/" raw2.csv > raw3.csv

data-6.2.csv: raw3.csv
	python munge.py < raw3.csv > data-6.2.csv

clean:
	rm raw*.csv data-6.2.csv
