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

var ConnectionOptions = require('./iot.connection.def.js');
var GET_METHOD = 'GET';

var apiconf = config.api;
//variable to be returned
var IoTKiT = {};
/**
 */
function CatalogOption(data) {
    this.pathname = apiconf.path.cmpcatalog.catalog;
    this.token = data.deviceToken;
    ConnectionOptions.call(this);
    this.method = GET_METHOD;
}
CatalogOption.prototype = new ConnectionOptions();
CatalogOption.prototype.constructor = CatalogOption;
IoTKiT.CatalogOption = CatalogOption;

module.exports = IoTKiT;
