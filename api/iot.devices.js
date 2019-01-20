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


"use strict";
var httpClient = require('../lib/httpClient');
var DeviceDef = require('./def/device.def.js');
var AuthDef = require('./iot.auth');
var async = require('async');
/**
 * It passes to a callback the access token
 */
module.exports.registerDevice = function(data, callback) {
  var devOpt = new DeviceDef.DeviceActivateOption(data);
  return httpClient.httpRequest(devOpt, callback);
};
/**
 * @description It will put a data to analytics UI using device id at data.
 * @param data the data contain the device id and metadata at body to sent
 * @param callback
 */
module.exports.updateMetadataDevice = function(data, callback) {
    var metaDataOpt = new DeviceDef.DeviceMetadataOption(data);
    return httpClient.httpRequest(metaDataOpt, callback);
};

module.exports.submitData = function (data, callback) {
    var submitDataOpt = new DeviceDef.DeviceSubmitDataOption(data);
    return httpClient.httpRequest(submitDataOpt, callback);
};
/**
 * The function will Register all components to Analytics using POST
 * if the body is an Array it will send individual post since the bulk api is
 * not ready
 * @param data
 * @param callback
 */
module.exports.registerComponents = function (data, callback){
    var tmp = data.body;
    delete data.body;
    //TODO this shall be replace with Parallel
    // when the bulk operation be ready.
    if (!Array.isArray(tmp)) {
        tmp = [tmp];
    }
    async.parallel(tmp.map(function (comp) {
            var tempData = JSON.parse(JSON.stringify(data));
            tempData.body = comp;
            return function (done) {
               var compOpt = new DeviceDef.DeviceComponentOption(tempData);
               httpClient.httpRequest(compOpt, function(err, response){
                    done(err, response);
               });
            };
       }), function (err, response) {
            console.info("Components Attributes Send To Analytics UI ");
            callback(err, response);
        }
    );
};
/**
 *
 * @param callback
 */
module.exports.getCredential = function (callback) {
    var authOption = new AuthDef.GetTokenOption();
    return httpClient.httpRequest(authOption, callback);
};
