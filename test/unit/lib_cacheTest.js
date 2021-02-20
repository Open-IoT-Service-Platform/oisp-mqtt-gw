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
var expect = require('chai').expect;


var fileToTest = "../../lib/cache/index.js";

describe(fileToTest, function(){
    var ToTest = rewire(fileToTest);

    it('Shall test singleton capability', function(done){
        var config = {
            cache: {
                port: 1234,
                host: "redishost"
            },
            postgres: {
                dbname: "dbname",
                username: "username",
                password: "password",
                host: "postgres",
                port: 1235
            }
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
        var Sequelize = class Sequelize {
            constructor() {
            }
            authenticate(){
                return Promise.resolve();
            }
        };
        ToTest.__set__("redis", redis);
        ToTest.__set__("Sequelize", Sequelize);
        var CacheFactory = new ToTest(config, logger);
        var cache = CacheFactory.getInstance();

        // create 2nd object and compare singleton capability
        var config2 = {
            cache: {
                port: 1234,
                host: "redishost2"
            },
            postgres: {
                dbname: "dbname2",
                username: "username2",
                password: "password2",
                host: "postgres2",
                port: 1235
            }
        };
        var CacheFactory2 = new ToTest(config2, logger);
        var cache2 = CacheFactory2.getInstance();
        if (cache2 !== cache) {
            assert.fail("Singleton objects are not identical");
        }
        done();    
    });
    it('Shall retrieve did and dataType from redisCache', function(done){
        ToTest = rewire(fileToTest); // to reset the singleton
        var cid = "895cac7d-49d1-4650-9b63-a6c7c0c9c4c7";
        var config = {
            cache: {
                port: 1234,
                host: "redishost"
            },
            postgres: {
                dbname: "dbname",
                username: "username",
                password: "password",
                host: "postgres",
                port: 1235
            }
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var redisValue = {
            id: "did",
            dataType: "dataType"
        };
        var redis = {
            createClient: function() {
                return {
                    hgetall: function(key, callback) {
                        callback(null, redisValue);
                    },
                    on: function(){},
                    hmset: function(key, valueType, value, callback){
                        assert.equal(key, cid, "wrong key received");
                        expect(valueType).to.be.oneOf(["id", "dataType"]);
                        expect(value).to.be.oneOf(["did", "dataType"]);
                        callback(null, true);
                    }
                };
            }
        };
        var Sequelize = class Sequelize {
            constructor() {
            }
            authenticate(){
                return Promise.resolve();
            }
        };
        ToTest.__set__("redis", redis);
        ToTest.__set__("Sequelize", Sequelize);
        var CacheFactory = new ToTest(config, logger);
        var cache = CacheFactory.getInstance();
        cache.getDidAndDataType({componentId: "895cac7d-49d1-4650-9b63-a6c7c0c9c4c7"})
        .then((result) => {
            assert.deepEqual(result, redisValue, "Wrong redis value received");
            done();
        })
        .catch((e) => done(e));
    });
});