default: data-6.1,6.3.csv data-6.2.csv data-6.4.csv dual/dual.js combined-chord/combined-chord.js matrix/matrix.js multiples/multiples.js final/final.js

data-6.1,6.3.csv:
	cd ../6.1,6.3/data && $(MAKE) && cp data*.csv ../../viz

data-6.2.csv:
	cd ../6.2/data && $(MAKE) && cp data*.csv ../../viz

data-6.4.csv:
	cd ../6.4/data && $(MAKE) && cp data*.csv ../../viz

dual/dual.js: dual/dual.es6.js
	babel dual/dual.es6.js -o dual/dual.js

combined-chord/combined-chord.js: combined-chord/combined-chord.es6.js
	babel combined-chord/combined-chord.es6.js -o combined-chord/combined-chord.js

matrix/matrix.js: matrix/matrix.es6.js
	babel matrix/matrix.es6.js -o matrix/matrix.js

multiples/multiples.js: multiples/multiples.es6.js
	babel multiples/multiples.es6.js -o multiples/multiples.js

final/final.js: final/final.es6.js
	babel final/final.es6.js -o final/final.js

clean:
	rm data*.csv
	rm combined-chord/combined-chord.js
	rm dual/dual.js
	rm matrix/matrix.js
	rm multiples/multiples.js
	rm final/final.js
