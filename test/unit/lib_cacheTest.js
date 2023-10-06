/**
* Copyright (c) 2021 Intel Corporation
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


var assert =  require('chai').assert,
    rewire = require('rewire');

var fileToTest = "../../lib/cache/index.js";

describe(fileToTest, function(){
    var ToTest = rewire(fileToTest);

    it('Shall test singleton capability', function(done){
        var config = {
            cache: {
                port: 1234,
                host: "redishost"
            },
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var redis = {
            createClient: function() {
                return {
                    on: function(){}
                };
            }
        };
        ToTest.__set__("redis", redis);
        var CacheFactory = new ToTest(config, logger);
        var cache = CacheFactory.getInstance();

        // create 2nd object and compare singleton capability
        var config2 = {
            cache: {
                port: 1234,
                host: "redishost2"
            }
        };
        var CacheFactory2 = new ToTest(config2, logger);
        var cache2 = CacheFactory2.getInstance();
        if (cache2 !== cache) {
            assert.fail("Singleton objects are not identical");
        }
        done();    
    });
});