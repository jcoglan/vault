SHELL := /bin/bash
PATH  := node_modules/.bin:$(PATH)

.PHONY: all clean

all:
	webpack --display-modules --watch

clean:
	rm -rf spec/browser_bundle.js*
