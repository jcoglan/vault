SHELL := /bin/bash
PATH  := node_modules/.bin:$(PATH)

.PHONY: all clean

all:
	esbuild --bundle --sourcemap --watch \
		test/browser/index.js \
		--outfile=test/browser/bundle.js

clean:
	rm -rf test/browser/bundle*
