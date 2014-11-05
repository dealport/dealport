'use strict';

module.exports = function(grunt)
{
        // TODO: versioning of generated bundle files, to be used when an error is reported.

        grunt.initConfig({
                pkg: grunt.file.readJSON('package.json'),
                jshint: {
                        all: ['Gruntfile.js', 'lib/**/*.js'],
                        options: require('./package.json').jshintConfig
                },
                browserify: {
                        options: {
                                browserifyOptions: {
                                        debug: true
                                }
                        },
                        build: {
                                src: 'lib/browser-init.js',
                                dest: 'generated-web/bundle.js'
                        }
                },
                stylerefs: {
                        options: {
                                outputMode: 'import',
                                filter: 'less'
                        },
                        build: {
                                src: ['lib/browser-init.js'],
                                dest: 'generated-web/bundle.less'
                        }
                },
                less: {
                        options: {
                                dumpLineNumbers: 'comments',
                                sourceMap: true,
                                relativeUrls: true
                        },
                        build: {
                                src: ['generated-web/bundle.less'],
                                dest: 'generated-web/bundle.css'
                        }
                }
        });

        grunt.task.registerTask('primuslib', 'Generate the primus client library', function()
        {
                var fs = require('fs');
                fs.writeFileSync('generated-web/primus.js', require('./lib/primus-server')().library());
        });

        grunt.loadNpmTasks('grunt-contrib-jshint');
        grunt.loadNpmTasks('grunt-browserify');
        grunt.loadNpmTasks('stylerefs');
        grunt.loadNpmTasks('grunt-contrib-less');


        grunt.registerTask('lint', ['jshint']);
        grunt.registerTask('default', ['jshint', 'primuslib', 'browserify', 'stylerefs', 'less']);
};