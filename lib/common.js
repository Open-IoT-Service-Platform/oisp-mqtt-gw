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
module.exports.time = {
        timeStamp : function () {
            return new Date().getTime();
        },
        epochTime : function(date) {
            date = date || new Date();
            return parseInt(date/1000);
        },
        newTimeStamp : function () {
            return Math.round(new Date().getTime());
        }
    };
/**
 * @description Build a path replacing patter {} by the data arguments
 * @param path string the represent a URL path
 * @param data Array or string
 * @returns {*}
 */

module.exports.buildPath = function (path, data) {
    var re = /{\w+}/;
    var pathReplace = path;
    if (Array.isArray(data)) {
        data.forEach(function (value) {
            pathReplace = pathReplace.replace(re, value);
        });
    } else {
        pathReplace = pathReplace.replace(re, data);
    }
    return pathReplace;
};


/**
 * @description: Extract the device id from the Topic string.
 * The patter shall be /xxxxx/device/yyy
 * @param topic
 * @returns {*}
 */
module.exports.getDeviceFromServerTopic = function (topic) {
    var deviceid = topic.split('/');
    return deviceid[2];
};