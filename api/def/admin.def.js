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
var url = require('url');

var ConnectionOptions = require('./iot.connection.def.js');
var GET_METHOD = 'GET';

var apiconf = config.api;

//variable to be returned
var IoTKiT = {};
/**
 * Connection attributes to redirect to Intel Itendtity Main Page
 */
function ApiHealthOption() {
    this.pathname = apiconf.path.apiHealth;
    this.token = null;
    ConnectionOptions.call(this);
    this.method = GET_METHOD;
}
ApiHealthOption.prototype = new ConnectionOptions();
ApiHealthOption.prototype.constructor = ApiHealthOption;
IoTKiT.ApiHealthOption = ApiHealthOption;

function HealthOption() {
    this.pathname = apiconf.path.health;
    this.token = null;
    ConnectionOptions.call(this);
    this.method = GET_METHOD;
}
HealthOption.prototype = new ConnectionOptions();
HealthOption.prototype.constructor = HealthOption;
IoTKiT.HealthOption = HealthOption;

function ExternalInfoOption() {
    this.pathname = '';
    this.token = null;
    ConnectionOptions.call(this);
    var urlT =  {
            hostname: 'ipinfo.io',
            port: 80,
            protocol: 'http'
    };
    this.url = url.format(urlT);
    this.method = GET_METHOD;
}
ExternalInfoOption.prototype = new ConnectionOptions();
ExternalInfoOption.prototype.constructor = ExternalInfoOption;
IoTKiT.ExternalInfoOption = ExternalInfoOption;



module.exports = IoTKiT;
