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
var logger = require('./logger'),
    config = require('../../config').logger,
    formatter = require('./formatter'),
    os = require('os');

var loggerInstance = null;
var machineName = os.hostname();

module.exports.init = function init () {
    if (null == loggerInstance) {
        var formatterInstance = new formatter({machineName: machineName,
                                               env: process.env.NODE_ENV,
                                               maxLines: config.maxLines
                                               });
        this.loggerInstance = new logger(formatterInstance);
    }
    return this.loggerInstance;
};

module.exports.hooks = function (appserver) {
   var hook = require('./intel.logger.hooker');
    hook.intercept(appserver, module.exports.init());
};