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
var config = require('../../config');
var common = require('../../lib/common');

var ConnectionOptions = require('./iot.connection.def.js');

var PUT_METHOD = 'PUT';
var POST_METHOD = 'POST';

var apiconf = config.api;

//variable to be returned
var IoTKiT = {};
/**
 * Connection attributes to redirect to Intel Itendtity Main Page
 */
function DeviceActivateOption(data) {
    this.pathname = common.buildPath(apiconf.path.device.act, data.deviceId);
    this.token = null;
    ConnectionOptions.call(this);
    this.method = PUT_METHOD;
    this.body =  JSON.stringify(data.body);
}
DeviceActivateOption.prototype = new ConnectionOptions();
DeviceActivateOption.prototype.constructor = DeviceActivateOption;
IoTKiT.DeviceActivateOption = DeviceActivateOption;

function DeviceMetadataOption (data) {
    this.pathname = common.buildPath(apiconf.path.device.update, data.deviceId);
    this.token = data.deviceToken;
    ConnectionOptions.call(this);
    this.method = PUT_METHOD;
    this.body = JSON.stringify(data.body);
}
DeviceMetadataOption.prototype = new ConnectionOptions();
DeviceMetadataOption.prototype.constructor = DeviceMetadataOption;
IoTKiT.DeviceMetadataOption = DeviceMetadataOption;
/**
 * Build an object option for Request package.
 * @param data
 * @constructor
 * */
function DeviceComponentOption (data) {
    this.pathname = common.buildPath(apiconf.path.device.components, data.deviceId);
    this.token = data.deviceToken;
    ConnectionOptions.call(this);
    this.method = POST_METHOD;
    this.body = JSON.stringify(data.body);
}
DeviceComponentOption.prototype = new ConnectionOptions();
DeviceComponentOption.prototype.constructor = DeviceComponentOption;
IoTKiT.DeviceComponentOption = DeviceComponentOption;


/**
 * @description Build an object option for Request package.
 * @param data
 * @constructor
 */
function DeviceSubmitDataOption (data) {
    this.pathname = common.buildPath(apiconf.path.submit.data, data.deviceId);
    ConnectionOptions.call(this);
    this.method = POST_METHOD;
    this.headers["Content-type"] = "application/json";
    this.headers["Authorization"] = "Bearer " + data.deviceToken;
    if (data.forwarded) {
        this.headers["forwarded"] = true;
        delete data.forwarded;
    }
    this.body = JSON.stringify(data.body);
}
DeviceSubmitDataOption.prototype = new ConnectionOptions();
DeviceSubmitDataOption.prototype.constructor = DeviceSubmitDataOption;
IoTKiT.DeviceSubmitDataOption = DeviceSubmitDataOption;

module.exports = IoTKiT;
