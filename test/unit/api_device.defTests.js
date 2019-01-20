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

var assert =  require('chai').assert,
    rewire = require('rewire');
var url = require('url');

var GlobalConfig = require('../../config');

var fileToTest = "../../api/def/device.def.js";

describe(fileToTest, function(){
    var toTest = rewire(fileToTest);
    var logger  = {
        info : function(){},
        error : function() {},
        debug : function() {}
    };
    console.debug = function() {
        console.log(arguments);
    };
    function makeTokenBearer (token) {
        return "Bearer " + token;
    }
    it('Shall Return the DeviceActivateOption for Request  >', function(done) {
        var config = {
            api: {
                protocol: "http",
                host: "myapi",
                port: 1000,
                device: {
                    act: 'devices/{deviceid}/activation',
                    update: 'devices/{deviceid}'
                }
            }
        };
        toTest.__set__('config', config);
        var data = {
            deviceId: 20000,
            body: {a: 1,
                   b: 2,
                   c: [1,2,3]
                    }
        };

        var deTest = new toTest.DeviceActivateOption(data);
        var urD = url.parse(deTest.url);
        assert.equal(urD.hostname, GlobalConfig.api.host, "the host data is missing");
        assert.equal(urD.port, GlobalConfig.api.port, "the port were missing");
        assert.equal(urD.pathname, "/v1/api/devices/20000/activation", "path improper formed");
        assert.equal(deTest.body, JSON.stringify(data.body));
        assert.equal(deTest.method, "PUT", "The verb is incorrect");
        assert.isString(deTest.headers['x-iotkit-requestid'], 'request-id was not generated');
        assert.lengthOf(deTest.headers['x-iotkit-requestid'], 44, 'x-iotkit-requestid header was shorter or longer than expected');
        done();
    });
    it('Shall Return the DeviceMetadataOption for Request  >', function(done) {
        var config = {
            api: {
                proxy: {
                    host: "myprox",
                    port: 2222
                },
                protocol: "http",
                host: "myapi",
                port: 1000,
                device: {
                    act: 'devices/{deviceid}/activation',
                    update: 'devices/{deviceid}'
                }
            },

        };
        toTest.__set__('config', config);
        var data = {
            deviceId: 20000,
            body: {a: 1,
                b: 2,
                c: [1,2,3]
            }
        };

        var deTest = new toTest.DeviceMetadataOption(data);

        var urlD = url.parse(deTest.url);

        assert.equal(urlD.hostname, GlobalConfig.api.host, "the host data is missing");
        assert.equal(urlD.port, GlobalConfig.api.port, "the port were missing");
        assert.equal(urlD.pathname, "/v1/api/devices/20000", "path improper formed");
        assert.equal(deTest.body, JSON.stringify(data.body));
        assert.equal(deTest.method, "PUT", "The verb is incorrect");
        //var Proxy = GlobalConfig.api.proxy.host + ":" + GlobalConfig.api.proxy.port;
        //assert.equal(deTest.proxy, Proxy, "The verb is incorrect");
        assert.isString(deTest.headers['x-iotkit-requestid'], 'request-id was not generated');
        assert.lengthOf(deTest.headers['x-iotkit-requestid'], 44, 'x-iotkit-requestid header was shorter or longer than expected');
        done();
    });
    it('Shall Return the DeviceComponentOption for Request  >', function(done) {
        var config = {
            api: {
                proxy: {
                    host: "myprox",
                    port: 2222
                },
                protocol: "http",
                host: "myapi",
                port: 1000,
                device: {
                    act: 'devices/{deviceid}/activation',
                    update: 'devices/{deviceid}',
                    components: '/devices/{deviceid}/components'
                }
            },
        };
        toTest.__set__('config', config);
        var data = {
            deviceId: 20000,
            deviceToken: "Thisis Mytoken",
            body: {a: 1,
                b: 2,
                c: [1,2,3]
            }
        };

        var deTest = new toTest.DeviceComponentOption(data);

        var urlD = url.parse(deTest.url);


        assert.equal(urlD.hostname, GlobalConfig.api.host, "the host data is missing");
        assert.equal(urlD.port, GlobalConfig.api.port, "the port were missing");
        assert.equal(urlD.pathname, "/v1/api/devices/20000/components", "path improper formed");
        assert.equal(deTest.body, JSON.stringify(data.body));
        assert.equal(deTest.method, "POST", "The verb is incorrect");
       // var Proxy = config.api.proxy.host + ":" + config.api.proxy.port;
      //  assert.equal(deTest.proxy, Proxy, "The verb is incorrect");
        assert.isObject(deTest.headers, "Shall be an Object with a Key-Value for HTTP Header");
        assert.property(deTest.headers, "Content-type", "The content Type has not Set");
        assert.property(deTest.headers, "Authorization", "The Authorization Header has not set");
        assert.equal(deTest.headers["Authorization"], makeTokenBearer(data.deviceToken),
            "The Authorization Header has not set");
        assert.isString(deTest.headers['x-iotkit-requestid'], 'request-id was not generated');
        assert.lengthOf(deTest.headers['x-iotkit-requestid'], 44, 'x-iotkit-requestid header was shorter or longer than expected');
        done();
    });
    it('Shall Return the DeviceComponentOption for Request  >', function(done) {
        var config = {
            api: {
                proxy: {
                    host: "myprox",
                    port: 2222
                },
                protocol: "http",
                host: "myapi3",
                port: 1000,
                device: {
                    act: 'devices/{deviceid}/activation',
                    update: 'devices/{deviceid}',
                    components: '/devices/{deviceid}/components'
                },
                submit: {
                    data: '/v1/api/data/{deviceid}'
                }
            }
        };
        toTest.__set__('config', config);
        var data = {
            deviceId: 20022,
            deviceToken: "Thisis Mytoken",
            body: {a: 1,
                d: 2,
                n: [2,3]
            }
        };

        var deTest = new toTest.DeviceSubmitDataOption(data);

        var urlD = url.parse(deTest.url);


        assert.equal(urlD.hostname, GlobalConfig.api.host, "the host data is missing");
        assert.equal(urlD.port, GlobalConfig.api.port, "the port were missing");
        assert.equal(urlD.pathname, "/v1/api/data/admin/20022", "path improper formed");
        assert.equal(deTest.body, JSON.stringify(data.body));
        assert.equal(deTest.method, "POST", "The verb is incorrect");
        assert.isObject(deTest.headers, "Shall be an Object with a Key-Value for HTTP Header");
        assert.property(deTest.headers, "Content-type", "The content Type has not Set");
        assert.property(deTest.headers, "Authorization", "The Authorization Header has not set");
        assert.equal(deTest.headers["Authorization"], makeTokenBearer(data.deviceToken),
            "The Authorization Header has not set");
        assert.isString(deTest.headers['x-iotkit-requestid'], 'request-id was not generated');
        assert.lengthOf(deTest.headers['x-iotkit-requestid'], 44, 'x-iotkit-requestid header was shorter or longer than expected');
        done();
    });
});
