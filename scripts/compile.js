
function compile (grunt) {
	grunt.file.copy('./node_modules/@clubajax/mouse/dist/mouse.js', './dist/mouse.js');
}

module.exports = compile;
