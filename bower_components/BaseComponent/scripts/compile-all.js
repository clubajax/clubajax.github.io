const exName = 'BaseComponent';
const outputName = 'index';
const outputPath = `./dist/${outputName}.js`;
const files = ['./src/BaseComponent.js', './src/properties.js', './src/template.js', './src/refs.js'];

console.log('');
const babel = require("babel-core");

function babelize (code) {
	let options = {
		presets: ["latest"]
	};
	let result = babel.transform(code, options);
	return result.code;
}

function run () {
	const fs = require('fs');
	const hasModule = /require|exports/;


	const codes = files.map((fileName) => {
		lines = fs.readFileSync(fileName).toString().split('\n').filter(function (line) {
			return !hasModule.test(line);
		});
		return babelize(lines.join('\n'));
	});

	const code = codes.map((str, index) => {
		str = str.replace("'use strict';", '');
		if (index) {
			return `(function () {
				${str}			
}());`;
		}
		return str;
	}).join('\n\n');

	const output = `${prefix}\n${code}\n${suffix}`;

	fs.writeFileSync(outputPath, output);
}


const prefix = `(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(["@clubajax/on"], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node / CommonJS
        module.exports = factory(require('@clubajax/on'));
    } else {
        // Browser globals (root is window)
        root['${exName}'] = factory(root.on);
    }
	}(this, function (on) {
"use strict";`;

const suffix = `
	return ${exName};

}));`;

run();