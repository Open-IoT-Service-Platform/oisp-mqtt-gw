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

/* default configuration handled with dynamic environment */
var config = {
    "broker": {
        "host": process.env.BROKER_IP,
        "port": process.env.BROKER_PORT,
        "retain": false,
        "secure": true,
        "retries": 30,
        "username": process.env.BROKER_USERNAME,
        "password": process.env.BROKER_PASSWORD,
        "key": 'data/keys/ssl/server.key',
        "cert": 'data/keys/ssl/server.cert',
        "ca": 'data/keys/ssl/server.cert',
        "mqttGWSecret": process.env.MQTT_GW_SECRET
    },
    "cache": {
        "host": process.env.REDIS_IP,
        "port": process.env.REDIS_PORT
    },
    "topics": {
        "subscribe": {
            "data_ingestion": "server/metric/+/+",
            "health": "server/devices/+/health"
        }
    },
    "api": {
        host: process.env.DASHBOARD_IP,
        port: 443,
        protocol: "https",
        strictSSL: false,
        timeout: 10000,
        path: {
            submit: {
                data: '/v1/api/data/{deviceid}'
            },
            apiHealth: '/v1/api/health'
        },
        username: process.env.DASHBOARD_USERNAME,
        password: process.env.DASHBOARD_PASSWORD
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
        "logLevel": "debug", //Default verbosity,
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
