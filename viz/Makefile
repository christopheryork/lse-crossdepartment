default: data-6.1,6.3.csv data-6.2.csv data-6.4.csv

data-6.1,6.3.csv:
	cd ../6.1,6.3/data && $(MAKE) && cp data*.csv ../../viz

data-6.2.csv:
	cd ../6.2/data && $(MAKE) && cp data*.csv ../../viz

data-6.4.csv:
	cd ../6.4/data && $(MAKE) && cp data*.csv ../../viz

clean:
	rm data*.csv
