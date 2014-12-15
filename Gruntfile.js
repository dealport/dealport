/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */
'use strict';

module.exports = function(grunt)
{
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
                },
                compress: {
                        bundlejs: {
                                options: {
                                        mode: 'gzip',
                                        level: 9,
                                        pretty: true
                                },
                                files: [{
                                        src: ['generated-web/bundle.js'],
                                        dest: 'generated-web/bundle.js.gz'
                                }]
                        },
                        bundlecss: {
                                options: {
                                        mode: 'gzip',
                                        level: 9,
                                        pretty: true
                                },
                                files: [{
                                        src: ['generated-web/bundle.css'],
                                        dest: 'generated-web/bundle.css.gz'
                                }]
                        }
                }
        });

        grunt.task.registerTask('mongoskin-workaround', function()
        {
                // delete mongoskin/node_modules/mongodb so that it uses our mongodb version instead
                grunt.file.delete('./node_modules/mongoskin/node_modules/mongodb');
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
        grunt.loadNpmTasks('grunt-contrib-compress');


        grunt.registerTask('lint', ['jshint']);
        grunt.registerTask('no-css', ['mongoskin-workaround', 'jshint', 'primuslib', 'browserify', 'compress:bundlejs']);
        grunt.registerTask('no-lint', ['mongoskin-workaround', 'primuslib', 'browserify', 'compress:bundlejs', 'stylerefs', 'less', 'compress:bundlecss']);
        grunt.registerTask('default', ['mongoskin-workaround', 'jshint', 'primuslib', 'browserify', 'compress:bundlejs', /*'stylerefs',*/ 'less', 'compress:bundlecss']);
};