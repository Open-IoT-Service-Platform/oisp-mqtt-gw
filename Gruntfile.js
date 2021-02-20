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
    //var buildID = grunt.option('buildID') || 'local';
    grunt.initConfig({
        //pkg: grunt.file.readJSON('package.json'),
        dirs: {
            jshint: 'buildscripts/jshint',
            jsfiles: ['Gruntfile.js',
                      'app.js',
                      'lib/**/*.js',
                      'api/**/*.js',
                      'test/unit/*.js']
        },
        jshint: {
          options: {
            "curly": true,
            "eqeqeq": true,
            "immed": true,
            "latedef": false,
            "newcap": true,
            "noarg": true,
            "sub": true,
            "undef": true,
            "eqnull": true,
            "browser": true,
            "unused": true,
            "node": true,
            "multistr": true,
            "esversion": 8,
            "globals": {
                "angular": true,
                "confirm": true,
                "Rickshaw": true,
                "iotApp": true,
                "iotController": true,
                "iotServices": true,
                "iotAppLogin": true,
                "iotDirectives": true,
                "$": true,
                "moment": true,
                "flipCounter": true,
                "uuid": true,
                "describe"   : false,
                "it"         : false,
                "before"     : false,
                "beforeEach" : false,
                "after"      : false,
                "afterEach"  : false,
                "done"       : false            
            }
          },
          gruntfile: ['Gruntfile.js'],
          src: ['<%= dirs.jsfiles %>'],

        },
        mochaTest: {
          test: {
              options: {
                  reporter: 'spec',
                  clearRequireCache: true
              },
              src: ['test/unit/*.js']
          },
      },
      nyc: {
        cover: {
          options: {
            include: ['lib/**', 'api/**', 'config.js'],
            exclude: '*Tests.js',
            reporter: ['lcov', 'text-summary'],
            all: true
          },
          cmd: false,
          args: ['grunt', 'test']
        }
      }

		});
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-simple-nyc');
    grunt.registerTask('default', ['jshint', 'test', 'coverage']);
    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask( "coverage", [ "nyc" ]);
};
