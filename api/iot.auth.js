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


/**
 * Created by ammarch on 5/16/14.
 */
var config = require('../config');

var ConnectionOptions = require('./def/iot.connection.def.js');

var IoTKiT = {};
/**
 * Connection attributes to redirect to Intel Itendtity Main Page
 */
function GetTokenOption () {
    this.pathname = config.api.path.auth.token;
    ConnectionOptions.call(this);
    this.method = 'POST';
    this.body =  JSON.stringify({username: config.api.username,
                                 password: config.api.password});
    this.headers["Content-type"] = "application/json";
}
GetTokenOption.prototype = new ConnectionOptions();
GetTokenOption.prototype.constructor = GetTokenOption;
IoTKiT.GetTokenOption = GetTokenOption;
module.exports = IoTKiT;





