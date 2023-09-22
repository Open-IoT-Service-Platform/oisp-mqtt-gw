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

var fs = require('fs');
var loglevel = process.env.LOGLEVEL;
if (loglevel === undefined) {
    loglevel = "debug"; //Default verbosity
}

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
if (parsedConfig.kafkaConfig !== undefined) {
    if (parsedConfig.kafkaConfig.linger === undefined) {
        parsedConfig.kafkaConfig.linger = 50;
    }
    if (parsedConfig.kafkaConfig.partitioner === undefined) {
        parsedConfig.kafkaConfig.partitioner = "defaultPartitioner";
    }
}
var config = {
    "broker": {
        "host": parsedConfig.mqttBrokerUrl,
        "port": parsedConfig.mqttBrokerLocalPort,
        "retain": false,
        "secure": false,
        "retries": 30,
        "username": parsedConfig.mqttBrokerUsername,
        "password": parsedConfig.mqttBrokerPassword
    },
    "authService": {
        "port": parsedConfig.authServicePort,
        "auth-server-url": parsedConfig.keycloakConfig["auth-server-url"],
        "realm": parsedConfig.keycloakConfig.realm,
        "resource": parsedConfig.keycloakConfig["mqtt-broker-id"],
        "credentials": {
            "secret": parsedConfig.keycloakClientSecret
        },
        "bearer-only": true,
        "verify-token-audience": true,
        "confidential-port": 0,
        "ssl-required": parsedConfig.keycloakConfig["ssl-required"]
    },
    "cache": {
        "host": parsedConfig.redisConf.hostname,
        "port": parsedConfig.redisConf.port
    },
    "kafka": {
      "host": parsedConfig.kafkaConfig.uri,
      "metricsTopic": parsedConfig.kafkaConfig.topicsObservations,
      "actuationsTopic": parsedConfig.kafkaConfig.topicsActuations,
      "replication": parsedConfig.kafkaConfig.replication,
      "requestTimeout": parsedConfig.kafkaConfig.requestTimeout,
      "maxRetryTime": parsedConfig.kafkaConfig.maxRetryTime,
      "retries": parsedConfig.kafkaConfig.retries,
      "linger": parsedConfig.kafkaConfig.linger,
      "partitioner": parsedConfig.kafkaConfig.partitioner
    },
    "postgres": {
      "host": parsedConfig.postgresConfig.hostname,
      "dbname": parsedConfig.postgresConfig.dbname,
      "port": parsedConfig.postgresConfig.port,
      "username": parsedConfig.postgresConfig.username,
      "password": parsedConfig.postgresConfig.password
    },
    "topics": {
        "prefix": parsedConfig.topicsPrefix || "server",
        "publish": {
            "error": "server/error/{accountId}/{deviceId}",
            "actuation": "/{accountId}/DCMD/{gatewayId}/{deviceId}"
        }
    },
    /*SparkplugB config which must be set when handling SparplugB standard message
    * @enabled: true -> it enables the spB message handlers and parsing functionality at GW
    * @spBKafkaProduce: true -> will enable producing kafka message on topic "SparkplugB" with spB format data 
    * @ngsildKafkaProduce: true -> will enable producing kafka message on topic "ngsildSpB" with ngsild format data for Metrics 
    *  - with name : "Relationship/xxxxx" OR "Properties/xxxx"
    * 
    */
    "sparkplug": {
        "spBKafkaProduce": parsedConfig.spbEnable || true,
        "spBkafKaTopic": parsedConfig.spbTopic || "sparkplugB",
        "ngsildKafkaProduce": parsedConfig.ngsildEnable || false,
        "ngsildKafkaTopic": parsedConfig.ngsildTopic || "ngsildSpB",
        "topics": {
            "subscribe": {
                "sparkplugb_data_ingestion": "spBv1.0/+/+/+/+"
            },
            "publish": {
            "error": "server/error/{accountId}/{deviceId}"
             }
        }
    },
    "api": {
        host: parsedConfig.frontendUri,
        port: parsedConfig.frontendPort,
        protocol: "http",
        strictSSL: false,
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
        "logLevel": loglevel,
        "maxLines": 30
    }
};

// TODO
/* override for local development if NODE_ENV is defined to local */
if (process.env.NODE_ENV && (process.env.NODE_ENV.toLowerCase().indexOf("local") !== -1)) {

    config.api.port = 80;
    config.api.protocol = "http";

    config.logger.transport.file.filename = "gateway.log";
    config.logger.transport.console.json = false;
    config.logger.transport.console.prettyPrint = false;
    config.logger.transport.console.logstash = false;
}
module.exports = config;
