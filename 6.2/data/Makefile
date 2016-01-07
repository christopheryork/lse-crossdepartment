default: data-6.2.csv

raw0.csv:
	cat tabula-CrossDepResearch_report_finaldraft-* > raw0.csv

# temporary: align table 6.2 with 6.4...  ask evelyn pauls to verify
raw1.csv: raw0.csv
	sed 's/Gender Institute/Gender/g;s/Social Psychology/Psychology/g;s/Geography and Environment/Geography/g;s/Media & Communications/Media and Communications/g;s/International Relations/IR/g;s/Philosophy, Logic, Scientific Method/Philosophy\/Logic\/Scientific Method/g' raw0.csv > raw1.csv

raw2.csv: raw1.csv
	sed 's/\"//g;s/, /,/g' raw1.csv > raw2.csv

raw3.csv: raw2.csv
	sed "1s/.*/department1,department2,links/" raw2.csv > raw3.csv

raw4.csv: raw3.csv
	patch raw3.csv -i law.diff -o raw4.csv

data-6.2.csv: raw4.csv
	python munge.py < raw4.csv > data-6.2.csv

clean:
	rm raw*.csv data-6.2.csv
