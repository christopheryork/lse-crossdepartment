default: data-6.1,6.3.csv

raw0.csv: excel-revised-table-6.1.csv
	tr "\r" "\n" < excel-revised-table-6.1.csv > raw0.csv

raw1.csv: raw0.csv
	sed "s/ ,/,/g" raw0.csv > raw1.csv

raw2.csv: raw1.csv
	sed "1s/.*/department,total_groups,research_links,faculty/" raw1.csv > raw2.csv

raw3.csv: excel-revised-table-6.3.csv
	tr "\r" "\n" < excel-revised-table-6.3.csv > raw3.csv

raw4.csv: raw3.csv
	sed "s/ ,/,/g" raw3.csv > raw4.csv

raw5.csv: raw4.csv
	sed "1s/.*/department,teaching_links0,teaching_links/" raw4.csv > raw5.csv

data-6.1,6.3.csv: raw2.csv raw5.csv
	python munge.py > data-6.1,6.3.csv

clean:
	rm raw*.csv data-6.1,6.3.csv
