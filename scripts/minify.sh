#!/bin/bash

# sudo apt install -y npm && sudo npm install -y uglify-js -g && sudo npm install -y uglifycss -g

uglifyjs --compress --mangle --module -- awesome-code-element.js > awesome-code-element.min.js
uglifycss styles/default.css > styles/default.min.css
