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
var fileToTest = "../../lib/common.js";

describe(fileToTest, function() {
    var toTest = rewire(fileToTest);

    console.debug = function () {
        console.log(arguments);
    };
    it('Shall Replace the {token} by the data  >', function (done) {
        var myPath = "path_to_build/{xxxx}/activation";
        var data = 1234545;
        var newPath = toTest.buildPath(myPath, data);
        var replace_path = "path_to_build/" + data + "/activation";
        assert.equal(newPath, replace_path, "Invalid Convertion");

        var newPath1 = toTest.buildPath(replace_path, data);
        assert.equal(newPath1, "path_to_build/" + data + "/activation", "Invalid Convertion");
        done();
    });
    it('Shall Replace the {token}s by the Array of data  >', function (done) {
        var myPath = "to_build/{xxxx}/act/{yyy}/tion/{zzzz}";
        var data = [1111, 2222, 3333];

        var newPath = toTest.buildPath(myPath, data);
        var replace_path = "to_build/" + data[0] + "/act/" + data[1] + "/tion/" + data[2];
        assert.equal(newPath, replace_path, "Invalid Convertion");

        var newPath1 = toTest.buildPath(replace_path, data);
        assert.equal(newPath1, "to_build/" + data[0] + "/act/" + data[1] + "/tion/" + data[2], "Invalid Convertion");
        done();
    });
    it('shall not replace any other word > ', function (done) {
        var myPath = "to_build/act/tion/xxx}";
        var data = [1111, 2222, 3333];
        var newPath = toTest.buildPath(myPath, data);

        assert.equal(newPath, "to_build/act/tion/xxx}", "Invalid Conversion");
        var data2 = 1111;

        var newPath1 = toTest.buildPath(myPath, data2);
        assert.equal(newPath1, "to_build/act/tion/xxx}", "Invalid Conversion");
        done();
    });

    it('shall give proper time  ', function (done) {
        var testTimestamp =  toTest.time.timeStamp();
        toTest.time.epochTime(new Date());
        toTest.time.newTimeStamp();
        assert.isAtMost(testTimestamp, new Date().getTime() , "Invalid Test time");
        done();
    });

    it('shall get device id > ', function (done) {
        var myTopic = "xx/yyyy/deviceId";
        var deviceid = toTest.getDeviceFromServerTopic(myTopic);
        assert.equal(deviceid, "deviceId", "Invalid Conversion");
        done();
    });
});
