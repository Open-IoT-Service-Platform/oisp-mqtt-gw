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

var fs = require('fs')

var extractConfig = function(envVar) {
    var result = null;
    try {
        result = JSON.parse(envVar);
    } catch (err) {
        throw new Error("Could not parse " + envVar + ":" + err);
    }
    var mappedResults = {};
    Object.keys(result).forEach(key => {
        var value = result[key];
        if (typeof(value)  == "string" && value.startsWith("@@")) {
            var newVar = value.substr(2);
            var newJson = process.env[newVar];
            value = extractConfig(newJson);
        }
        mappedResults[key] = value;
    });
    return mappedResults;
}
var parsedConfig = extractConfig(process.env.OISP_MQTT_GATEWAY_CONFIG);
/* default configuration handled with dynamic environment */
var config = {
    "broker": {
        "host": parsedConfig.mqttBrokerUrl,
        "port": parsedConfig.mqttBrokerPort,
        "retain": false,
        "secure": true,
        "retries": 30,
        "username": parsedConfig.mqttBrokerUsername,
        "password": parsedConfig.mqttBrokerPassword,
        "mqttGWSecret": parsedConfig.aesKey
    },
    "cache": {
        "host": parsedConfig.redisConf.hostname,
        "port": parsedConfig.redisConf.port
    },
    "topics": {
        "subscribe": {
            "data_ingestion": "server/metric/+/+",
            "health": "server/devices/+/health"
        }
    },
    "api": {
        host: parsedConfig.frontendUri,
        port: parsedConfig.frontendPort,
        protocol: "https",
        strictSSL: true,
        timeout: 10000,
        path: {
            submit: {
                data: '/v1/api/data/{deviceid}'
            },
            apiHealth: '/v1/api/health'
        },
        username: parsedConfig.frontendSystemUser,
        password: parsedConfig.frontendSystemPassword
    },
    "health": {
        port: 4005
    },
    "ENV": process.env.NODE_ENV,
    logger: {
        transport: {
            console: {
                handleExceptions: true,
                json: false,
                colorize: true,
                prettyPrint: false,
                timestamp: true,
                exitOnError: false,
                logstash: true,
                level: 'all'
            },
            file: {
                handleExceptions: true,
                filename: "gateway.log",
                prettyPrint: false,
                json: false,
                timestamp: true,
                exitOnError: false,
                maxsize: 268435456, //256 MB
                maxFiles: 7,
                level: 'all'
            }
        },
        "logLevel": "info", //Default verbosity,
        "maxLines": 30
    }
};

// TODO
/* override for local development if NODE_ENV is defined to local */
if (process.env.NODE_ENV && (process.env.NODE_ENV.toLowerCase().indexOf("local") !== -1)) {
    // config.broker.host = "broker";
    // config.broker.port = 1883;
    config.broker.secure = true;
    //config.broker.username = "gateway";
    //config.broker.password = "changeit";

    // config.api.host = "localhost";
    config.api.port = 80;
    config.api.protocol = "http";
    // config.api.username = "gateway@intel.com";
    // config.api.password = "gateway";
    config.logger.transport.file.filename = "gateway.log";
    config.logger.transport.console.json = false;
    config.logger.transport.console.prettyPrint = false;
    config.logger.transport.console.logstash = false;
}
module.exports = config;
