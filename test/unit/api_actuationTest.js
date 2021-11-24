/**
* Copyright (c) 2021 Intel Corporation
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

var assert =  require('chai').assert,
    rewire = require('rewire');
var fileToTest = "../../api/actuation.js";

describe(fileToTest, function() {

    process.env.OISP_KEYCLOAK_CONFIG = '{\
        "listenerPort": 4080, \
        "auth-server-url": "keycloak" \
    }';
    process.env.OISP_KAFKA_CONFIG = '{\
        "uri": "uri", \
        "partitions": 1, \
        "metricsPartitions": 1, \
        "replication": 1, \
        "timeoutMs": 10000, \
        "topicsObservations": "metricsTopic", \
        "actuationsTopic": "actuationsTopic", \
        "topicsRuleEngine": "rules-update", \
        "topicsHeartbeatName": "heartbeat", \
        "topicsHeartbeatInterval": 5000, \
        "maxPayloadSize": 1234456, \
        "retries": 10, \
        "requestTimeout": 4, \
        "maxRetryTime": 10 \
    }';
    process.env.OISP_MQTT_GATEWAY_CONFIG = '{ \
        "mqttBrokerUrl": "brokerUrl", \
        "mqttBrokerLocalPort": "1234", \
        "mqttBrokerUsername": "brokerUsername", \
        "mqttBrokerPassword": "brokerPassword", \
        "authServicePort": "2345", \
        "redisConf": "@@OISP_REDIS_CONFIG", \
        "kafkaConfig": "@@OISP_KAFKA_CONFIG", \
        "postgresConfig": "@@OISP_POSTGRES_CONFIG", \
        "keycloakConfig": "@@OISP_KEYCLOAK_CONFIG", \
        "aesKey": "/app/keys/mqtt/mqtt_gw_secret.key" \
    }';

    process.env.OISP_REDIS_CONFIG = '{\
        "hostname": "redis",\
        "port": "6379",\
        "password": "password" \
    }';

    process.env.OISP_POSTGRES_CONFIG = '{\
        "dbname": "oisp",\
        "hostname": "postgres-ro",\
        "writeHostname": "postgres",\
        "port": "5432",\
        "su_username": "su_username",\
        "su_password": "su_password",\
        "username": "username",\
        "password": "password"\
    }';

    var config = {
        "mqttBrokerUrl": "brokerUrl",
        "mqttBrokerLocalPort": "1234",
        "mqttBrokerUsername": "brokerUsername",
        "mqttBrokerPassword": "brokerPassword",
        "authServicePort": "2345",
        "topics": {
            "prefix": "topics/publish",
            "publish": {
                "actuation": "/{accountId}/{gatewayId}/{deviceId}"
            }
        },
        "cache": {
            "hostname": "redis",
            "port": "6379",
            "password": "password"
        },
        "kafka": {
            "host": "uri",
            "partitions": 1,
            "metricsPartitions": 1,
            "replication": 1,
            "timeoutMs": 10000,
            "actuationsTopic": "actuationsTopic",
            "metricsTopic": "metricsTopic",
            "topicsRuleEngine": "rules-update",
            "topicsHeartbeatName": "heartbeat",
            "topicsHeartbeatInterval": 5000,
            "maxPayloadSize": 1234456,
            "retries": 10,
            "requestTimeout": 4,
            "maxRetryTime": 10
        },
        "postgres": {
            "dbname": "oisp",
            "hostname": "postgres-ro",
            "writeHostname": "postgres",
            "port": "5432",
            "su_username": "su_username",
            "su_password": "su_password",
            "username": "username",
            "password": "password"
        },
        "aesKey": "/app/keys/mqtt/mqtt_gw_secret.key"
    };
    var ToTest = rewire(fileToTest);

    var actuation = {
        componentId: "testComponent",
        command: "testCommand",
        accountId: "testAccount",
        gatewayId: "testGateway",
        deviceId: "testDevice" ,
        params: [{
            name: "testParam",
            value: "0"
        }]
    };

    var data = {
        value: {
            toString: function() {
                return JSON.stringify(actuation);
            }
        }
    };

    var Kafka = function() {
        return {
            consumer: function(){
                return {
                    connect: function() {
                        return Promise.resolve();
                    },
                    on: function() {},
                    subscribe: function() {
                        return Promise.resolve();
                    },
                    run: function(handler) {
                        handler.eachMessage({topic: "actuationsTopic", partition: 0, message: data });
                        return Promise.resolve();
                    },
                    events: "event"
                };
            }
        };
    };

    var logger = {
        error: function() {},
        debug: function() {},
        info: function() {}
    };

    it('Shall initialize actuation consumer', function(done) {
        var mqttBroker = {
            publish: function() {},
            buildPath: function() {},
        };
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        var apiActuationConnector = new ToTest(logger, mqttBroker);
        assert.isObject(apiActuationConnector);
        done();
    });

    it('Shall publish consumed actuation data', function(done) {
        var mqttBroker = {
            publish: function(path, message) {
                try {
                    assert.equal(path, "topics/publish/" + actuation.accountId + "/" + actuation.gatewayId + "/" + actuation.deviceId, "Message published to wrong topic!");
                    assert.equal(message.metrics[0].value, false, "Message value not handled correctly!");
                    assert.equal(message.metrics[0].dataType, "Boolean", "Message data type not handled correctly!");
                    assert.equal(message.metrics[0].command, actuation.command, "Message command not handled correctly!");
                    assert.equal(message.metrics[0].name, actuation.params[0].name, "Message metric name not handled correctly!");
                    assert.isDefined(message.metrics[0].timestamp, "Message timestamp not handled correctly!");
                    assert.isDefined(message.timestamp, "Message timestamp not handled correctly!");
                } catch(err) {
                    done(err);
                    return;
                }
                done();
            },
            buildPath: function() {
                return config.topics.prefix + "/" + actuation.accountId + "/" + actuation.gatewayId + "/" +  actuation.deviceId;
            }
        };
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        var apiActuationConnector = new ToTest(logger, mqttBroker);
        apiActuationConnector.start();
    });
});
