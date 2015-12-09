default: data-6.1,6.3.csv

raw0.csv:
	cat tabula-CrossDepResearch_report_finaldraft-0.csv > raw0.csv

raw1.csv: raw0.csv
	(tr -d '\r' < raw0.csv) | sed "s/ ,/,/g" > raw1.csv

raw2.csv: raw1.csv
	sed "1s/.*/department,total_groups,research_links,faculty/" raw1.csv > raw2.csv

raw3.csv:
	cat tabula-CrossDepResearch_report_finaldraft-5.csv tabula-CrossDepResearch_report_finaldraft-6.csv > raw3.csv

raw4.csv: raw3.csv
	(tr -d '\r' < raw3.csv) | sed "s/ ,/,/g" > raw4.csv

raw5.csv: raw4.csv
	sed "1s/.*/department,teaching_links0,teaching_links/" raw4.csv > raw5.csv

data-6.1,6.3.csv: raw2.csv raw5.csv
	python munge.py > data-6.1,6.3.csv

clean:
	rm raw*.csv data-6.1,6.3.csv
