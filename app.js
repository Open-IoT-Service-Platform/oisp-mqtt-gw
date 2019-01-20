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
var Broker = require("./lib/mqtt/connector"),
    apiData = require('./api/data.ingestion'),
    config = require("./config"),
    logger = require("./lib/logger").init(config),
    health = require('./lib/health');

logger.info("OISP MQTT-gateway authorization agent");

process.env.APP_ROOT = __dirname;

var brokerConnector = Broker.singleton(config.broker, logger);
brokerConnector.connect(function(err) {
    if (!err) {
        // Manage Connections to API Server

        var apiDataConnector = new apiData(logger);
        apiDataConnector.bind(brokerConnector);
        health.init(brokerConnector);
    } else {
        logger.error("Error on Broker connection ", err);
    }
});


process.on("uncaughtException", function(err) {
    logger.error("UncaughtException:" + err.message);
    logger.debug(err.stack);
    process.exit(1);
});
