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
var url = require('url');
var uuid = require('node-uuid');
var config = require('../../config');

var apiconf = config.api;
/**
 * Top of the hierarchy. Common attributes to every
 * Connection Options
 */
function ConnectionOptions() {
    if (apiconf.proxy && apiconf.proxy.host) {
        this.proxy = apiconf.proxy.host + ":" + apiconf.proxy.port;
    }
    var urlT =  {
        hostname: apiconf.host,
        port: apiconf.port,
        pathname: this.pathname,
        protocol: apiconf.protocol
    };
    if (apiconf.strictSSL === false) {
        this.strictSSL = false;
    }

    this.url = url.format(urlT);
    this.timeout = apiconf.timeout;

    this.headers = {
                    "Content-type" : "application/json",
                    "x-iotkit-requestid" : 'gateway:' + uuid.v4()
                    };
    if (this.token) {
       this.headers["Authorization"] = "Bearer " + this.token;
    }
    delete this.token;
}

module.exports = ConnectionOptions;