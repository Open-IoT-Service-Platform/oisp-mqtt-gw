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
var dateUtil;
/**
 * Interface to manage the Metric Payload require by Advances Analytics.
 * @constructor
 */
function Metric () {
    this.accountId = null;
    this.did  = null;
    this.on = dateUtil.newTimeStamp();
    this.count = 0;
    this.data = [];
}
Metric.prototype.dataAsRoot = function (value) {
    var cid = this.nameOfComponentId || "cid";
    var theValue = value.v || value.value;
    if (value && theValue) {
        var dataTemporal = {
            "on": value.on || this.on,
            "value": theValue.toString() //Convertion since JSON schema required.
        };
        dataTemporal[cid] = value.componentId || value.cid || this.globalCid;
        if (value.loc) {
            dataTemporal.loc = value.loc;
        }
        if (value.attributes) {
            dataTemporal.attributes = value.attributes;
        }
        this.data.push(dataTemporal);
    }
};
Metric.prototype.dataAsArray = function (msg) {
    var l = msg.data.length;
    this.globalCid = msg.cid;
    for (var i = 0; i < l; i++) {
        var value = msg.data[i];
        this.dataAsRoot(value);
    }
};
/**
 * This convert the Mesagge at Analitics RT to Adavance Analytics Data Injection Payload
 * @param msg
 * @returns {Metric}
 */
Metric.prototype.convertToMQTTPayload= function(msg) {
    this.accountId = msg.accountId || msg.domainId;
    this.did = msg.deviceId;
    this.on = msg.on || this.on;
    this.data = [];
    if (Array.isArray(msg.data)) {
        this.dataAsArray(msg);
    } else {
        this.dataAsRoot(msg);
    }
    this.count = this.data.length;
    return this;
};
Metric.prototype.fromMQTTToRestPayload = function(msg) {
    this.on = msg.on || this.on;
    this.accountId = msg.accountId;
    this.data = [];
    this.nameOfComponentId = "componentId";
    if (Array.isArray(msg.data)) {
        this.dataAsArray(msg);
    } else {
        this.dataAsRoot(msg);
    }
    /*
    Since the health require de account id it will  not delete
    */

    /**
     * Since the schema validatation of Rest Interface if so hard
     * it is removed the none require paramaters
     */
    delete this.did;
    delete this.count;
    delete this.nameOfComponentId;
    return this;
};
module.exports.init = function (Util) {
  dateUtil = Util;
  return Metric;
};
