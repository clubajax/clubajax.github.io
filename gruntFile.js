'use strict';

const path = require('path');

module.exports = function (grunt) {

	let
		PORT = 8900,
		nm = path.resolve(__dirname, 'node_modules'),
		vendorAliases = ['@clubajax/custom-elements-polyfill', '@clubajax/dom', '@clubajax/on', '@clubajax/base-component'],
		baseAliases = ['date-picker'],
		sourceMaps = 1,
		watch = false,
		watchPort = 35750,
		devBabel = 0,
		babelTransform = devBabel ? [[
			'babelify', {
				global: true,
				presets: ['@babel/preset-env']
			}]] : [];
	
    grunt.initConfig({
		browserify: {
			vendor: {
				// different convention than "dev" - this gets the external
				// modules to work properly
				// Note that vendor does not run through babel - not expecting
				// any transforms. If we were, that should either be built into
				// the app or be another vendor-type file
				src: ['.'],
				dest: 'dist/vendor.js',
				options: {
					// expose the modules
					alias: vendorAliases.map(function (module) {
						return module + ':';
					}),
					// not consuming any modules
					external: null,
					transform: babelTransform,
					browserifyOptions: {
						debug: sourceMaps
					}
				}
			},
			datePicker: {
				files: {
					'dist/date-picker.js': ['scripts/date-picker.js']
				},
				options: {
					// not using browserify-watch; it did not trigger a page reload
					watch: false,
					keepAlive: false,
					external: vendorAliases,
					alias: {},
					browserifyOptions: {
						debug: sourceMaps
					},
					// transform not using babel in dev-mode.
					// if developing in IE or using very new features,
					// change devBabel to `true`
					transform: babelTransform,
					postBundleCB: function (err, src, next) {
						console.timeEnd('build');
						next(err, src);
					}
				}
			}
		},

		sass: {
			// deploy: {
			// 	options: {
			// 		// case sensitive!
			// 		sourceMap: true
			// 	},
			// 	// 'path/to/result.css': 'path/to/source.scss'
			// 	files: {
			// 		'dist/date-picker.css': './node_modules/date-picker/date-picker.scss'
			// 	}
			// },
			dev: {
				options: {
					// case sensitive!
					sourceMap: true
				},
				// 'path/to/result.css': 'path/to/source.scss'
				files: {
					'dist/date-picker.css': './node_modules/date-picker/src/date-picker.scss'
				}
			}
		},

        'http-server': {
            main: {
                root: '.',
                port: PORT,
                host: '0.0.0.0',
                cache: -1,
                showDir: true,
                autoIndex: true,
                ext: "html",
                runInBackground: false
            }
        }
    });

    // watch build task
    grunt.registerTask('build-dev', function (which) {
		grunt.task.run('sass:dev');
		grunt.task.run('browserify:datePicker');

    });

	grunt.registerTask('build', function (which) {
		grunt.task.run('browserify:vendor');
		grunt.task.run('build-dev');
	});

    // The general task: builds, serves and watches
    grunt.registerTask('dev', function (which) {
		grunt.task.run('build');
    	grunt.task.run('serve');
    });

    // alias for server
    grunt.registerTask('serve', function (which) {
        grunt.task.run('http-server');
    });

	grunt.registerTask('deploy', function (which) {
		const compile = require('./scripts/compile');
		compile(grunt);
	});

	grunt.loadNpmTasks('grunt-sass');
	grunt.loadNpmTasks('grunt-concurrent');
	//grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-http-server');

};