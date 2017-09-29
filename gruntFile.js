'use strict';

const path = require('path');

module.exports = function (grunt) {
    

    grunt.initConfig({

        'http-server': {
            main: {
                // where to serve from (root is least confusing)
                root: '.',
                // port (if you run several projects at once these should all be different)
                port: '8200',
                // host (0.0.0.0 is most versatile: it gives localhost, and it works over an Intranet)
                host: '0.0.0.0',
                cache: -1,
                showDir: true,
                autoIndex: true,
                ext: "html",
                runInBackground: false
                // route requests to another server:
                //proxy: dev.machine:80
            }
        }
    });

    // watch build task
    grunt.registerTask('build-dev', function (which) {


    });

    // task that builds vendor and dev files during development
    grunt.registerTask('build', function (which) {

    });

    // The general task: builds, serves and watches
    grunt.registerTask('dev', function (which) {

    });

    // alias for server
    grunt.registerTask('serve', function (which) {
        grunt.task.run('http-server');
    });

	grunt.registerTask('deploy', function (which) {
		const compile = require('./scripts/compile');
		compile(grunt);
	});

    grunt.loadNpmTasks('grunt-http-server');
};