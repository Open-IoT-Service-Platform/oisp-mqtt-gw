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

var config = require("../config");
var { Kafka, logLevel } = require('kafkajs');

function getDataType(data) {
    switch(typeof data) {
        case "number":
            return "Double";
        case "boolean":
            return "Boolean";
        case "string":
            if (data === "0" || data === "1") {
                return "Boolean";
            }
            return "String";
        default:
            return "Unknown";
    }
}

function normalizeBoolean(b) {
    if (typeof b === "boolean") {
        return b;
    }
    if (b === "1") {
        return true;
    } else if (b === "0") {
        return false;
    } else {
        return null;
    }
}

// Builds a Sparkplug B compliant feedback message from OISP Actuation message
class FeedbackMessage {
    constructor(msg, logger) {
        var timestamp = Date.now();
        this.timestamp = timestamp;
        this.metrics = msg.params.map(param => {
            var dataType = getDataType(param.value);
            if (dataType === "Unknown") {
                logger.warn("Received data with unknown data type from OISP for: " +
                    msg.accountId + "/" + msg.deviceId);
            }
            var value = param.value;
            if (dataType === "Boolean") {
                value = normalizeBoolean(value);
            }
            return {
                name: param.name,
                cid: msg.componentId,
                command: msg.command,
                timestamp: timestamp,
                value: value,
                dataType: dataType,
            };
        });
    }
}

class ActuationConsumer {
    constructor(logger, mqttBroker) {
        this.logger = logger;
        this.mqttBroker = mqttBroker;
        var brokers = config.kafka.host.split(",");
        const kafka = new Kafka({
            logLevel: logLevel.INFO,
            brokers: brokers,
            clientId: "frontend-actuations",
            requestTimeout: config.kafka.requestTimeout,
            retry: {
                maxRetryTime: config.kafka.maxRetryTime,
                retries: config.kafka.retries
            }
        });
        this.kafkaConsumer = kafka.consumer({ groupId: "actuation-consumer-group"});
        const { CONNECT, DISCONNECT } = this.kafkaConsumer.events;
        this.kafkaConsumer.on(DISCONNECT, e => {
            this.logger.error(`Actuation consumer disconnected!: ${e.timestamp}`);
            this.kafkaConsumer.connect();
        });
        this.kafkaConsumer.on(CONNECT, e => this.logger.info("Kafka actuation consumer connected: " + e));
    }

    start() {
        return this.kafkaConsumer.connect().then(() => {
            return this.kafkaConsumer.subscribe({ topic: config.kafka.actuationsTopic });
        }).then(() => {
            return this.kafkaConsumer.run({ eachMessage: this.messageHandler() });
        }).catch(err => {
            this.logger.error("Starting kafka actuation consumer failed: " + err);
            process.exit(1);
        });
    }

    resume() {
        this.kafkaConsumer.resume([{ topic: config.kafka.actuationsTopic }]);
    }

    stop() {
        this.kafkaConsumer.pause([{ topic: config.kafka.actuationsTopic }]);
    }

    messageHandler() {
        var logger = this.logger;
        var mqttBroker = this.mqttBroker;

        return function({ topic, message }) {
            if (topic !== config.kafka.actuationsTopic) {
                return;
            }
            message = JSON.parse(message.value.toString());
            var accountId = message.accountId;
            var gatewayId = message.gatewayId;
            var deviceId = message.deviceId;
            logger.info("Received actuation for: " + accountId + "/" + deviceId);
            var payload = new FeedbackMessage(message, logger);
            var path = mqttBroker.buildPath(config.topics.prefix + config.topics.publish.actuation, [accountId, gatewayId, deviceId]);
            return mqttBroker.publish(path, payload, null);
        };
    }
}

module.exports = ActuationConsumer;
