/**
* Copyright (c) 2017 Intel Corporation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

module.exports = function(grunt) {
    // Project configuration.
    var buildID = grunt.option('buildID') || 'local';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        dirs: {
            jshint: 'buildscripts/jshint',
            jsfiles: ['Gruntfile.js',
                      'app.js',
                      'lib/**/*.js',
                      'api/**/*.js']
        },
        jshint: {
			options: {
				jshintrc: '<%= dirs.jshint %>/config.json',
				ignores: ['lib/deprected/*.js']
			},
			local: {
				src: ['<%= dirs.jsfiles %>'],
				options: {
					force: true
				}
			},
			teamcity: {
				src: ['<%= dirs.jsfiles %>'],
				options: {
					force: true,
					reporter: require('jshint-teamcity')
				}
			}
		},
        compress: {
            teamcity: {
                options: {
                    archive: 'dist/'+'<%= pkg.name %>_' + buildID + ".tgz",
                    mode: 'tgz'
                },
                files: [{cwd: '.',
                        expand: true,
                        src: ['**/*.js',
                               '**/*.*',
                               '!log.txt',
                               '!README.md',
                               '!buildscripts/**',
                                'node_modules/',
                                '!node_modules/grunt**/**',
                                '!node_modules/karma**/**',
                                '!node_modules/mocha**/**',
                                '!node_modules/jshint**/**',
                                '!node_modules/istanbul/**',
                                '!node_modules/supertest/**',
                                '!node_modules/sinon/**',
                                '!node_modules/chai/**',
                                '!node_modules/asserts/**',
                                '!node_modules/rewire/**',
                                '!build.sh',
                                '!deploy.sh',
                                '!dist/**',
                                '!test/**',
                                '!Gruntfile.js',
                            ],
                            /* this is the root folder of untar file */
                         dest: '<%= pkg.name %>/'
                        }
                    ]
                }
            },
        shell: {
            packaging: {
                command: 'tar --verbose --exclude-vcs -zc --directory=. -f dist/'+'<%= pkg.name %>_' + buildID + '.tgz' +
                         ' -X buildscripts/file_to_exclude.txt *'
                },
            teamcitypackage: {
                command: 'tar --exclude-vcs -zc --directory=. -f dist/'+'<%= pkg.name %>_' + buildID + '.tgz' + ' -X buildscripts/file_to_exclude.txt *'
            }
        },
        mocha_istanbul: {
            local: {
                src: 'test/unit', // the folder, not the files,
                options: {
                    ui: 'bdd',
                    reporter: 'spec',
                    mask: '**/**/**.js',
                    mochaOptions: ["--check-leaks","--sort"],
                    root: '.', // define where the cover task should consider the root of libraries that are covered by tests
                    coverageFolder: 'dist/coverage',
                    reportFormats: ['lcov']
                }
            },
            teamcity: {
                src: 'test/unit/', // the folder, not the files
                options: {
                    ui: 'bdd',
                    coverage: true,
                    recursive: true,
                    reporter: 'mocha-teamcity-reporter',
                    mask: '*Tests.js',
                    /*check: {
                        lines: 70,
                        statements: 70,
                        function: 70
                    },*/
                    root: '.', // define where the cover task should consider the root of libraries that are covered by tests
                    coverageFolder: 'dist/coverage',
                    reportFormats: ['lcov', 'teamcity']
                }
            }
        },
		bumpup: {
			setters: {
				version: function (old) {
					var ret = old;
                    
					if (buildID !== 'local') {
                        var ver = old.split(".");
						ver[2] = buildID;
                        ret = ver.join('.');
					}
					return ret;
				},
				date: function () {
					return new Date().toISOString();
				}
			},
			file: 'package.json'
		}
    });

    grunt.event.on('coverage', function(lcovFileContents, done){
        // Check below
        done();
    });

    grunt.loadNpmTasks('grunt-mocha-istanbul');
    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-bumpup');
    grunt.loadNpmTasks('grunt-shell');

    // Default task(s).
    grunt.registerTask('default', ['jshint:local', 'mocha_istanbul:local']);
    grunt.registerTask('teamcity_codevalidation', ['jshint:teamcity',
                                                   'mocha_istanbul:teamcity']);

    grunt.registerTask('packaging', ['bumpup', 'shell:teamcitypackage']);

};
