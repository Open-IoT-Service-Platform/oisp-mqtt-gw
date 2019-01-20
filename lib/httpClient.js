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
/**
 *
 * @param options object that contains attributes of the connection
 * @param callback function to be called at the end of the request
 * @param useHttp if true, it sends a HTTP request, If not, it uses a
 * HTTPS request
 */
var request = require('request');

function processResponse(res, body, callback) {
    var data = null;
    if (res.statusCode === 200 || res.statusCode === 201) {
        if (res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') > -1) {
            try {
                data = JSON.parse(body);
            } catch (e) {
                data = null;
            }
        } else {
            data = null;
        }
    } else if (res.statusCode === 204) {
        data = {
                status: "Done"
             };
    }
    return callback(data);
}

module.exports.httpRequest = function createRequest(options, callback) {
   request(options, function (error, response, body) {
        if(error) {
            console.log('error=', error);
        }
            if (!error && (response.statusCode === 200 ||
                       response.statusCode === 201 ||
                       response.statusCode === 204)) {

            processResponse(response, body, function (data) {
                return callback(null, data);
            });

            } else {
                var data = {};
                try {
                    data = JSON.parse(body);
                } catch (e) {

                }
                error = error || data;
                return callback(error, null);
            }

    });
};
