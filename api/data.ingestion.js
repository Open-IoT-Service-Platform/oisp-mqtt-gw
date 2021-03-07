/**
* Copyright (c) 2017, 2020 Intel Corporation
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
const { Partitioners } = require('kafkajs');
var me;

const CacheFactory = require("../lib/cache");


// Round Robin partitioner used to handle single clients with
// too high throughput
const RoundRobinPartitioner = () => {
    var curPartition = 0;
    return ({ partitionMetadata}) => {
        var numPartitions = partitionMetadata.length;
        var partition = curPartition % numPartitions;
        curPartition++;
        return partition;
    };
};

// validate value
var validate = function(value, type) {
    if (type === "Number") {
        if (isNaN(value)) {
            return false;
        } else {
            return true;
        }
    } else if (type === "Boolean") {
        return value === "0" || value === "1";
    }
    else if (type === "String") {
        if (typeof value === "string") {
            return true;
        }
        return false;
    }

};

// normalize value
var normalizeBoolean = function (value, type) {
    if (type === "Boolean") {
        // checks: true, false, 0, 1, "0", "1"
        if (value === true || value === "1" || value === 1) {
            return "1";
        }
        if (value === false || value === "0" || value === 0) {
            return "0";
        }
        // checks: "trUe", "faLSE"
        try {
            if (value.toLowerCase() === "true") {
                return "1";
            }
            if (value.toLowerCase() === "false") {
                return "0";
            }
        } catch (e) {
            return "NaB";
        }
        return "NaB";
    }
    return value;
};

// @brief Aggregates messages for periodic executed Kafka producer
class KafkaAggregator {
    constructor(logger) {
        this.logger = logger;
        this.messageArray = [];
        var brokers = config.kafka.host.split(',');
        try {
            const kafka = new Kafka({
                logLevel: logLevel.INFO,
                brokers: brokers,
                clientId: 'frontend-metrics',
                requestTimeout: config.kafka.requestTimeout,
                retry: {
                    maxRetryTime: config.kafka.maxRetryTime,
                    retries: config.kafka.retries
                }
            });
            if (config.kafka.partitioner === "roundRobinPartitioner") {
                this.kafkaProducer = kafka.producer({createPartitioner: RoundRobinPartitioner});
                this.logger.info("Round Robin partitioner enforced");
            } else {
                this.kafkaProducer = kafka.producer({createPartitioner: Partitioners.DefaultPartitioner});
                this.logger.info("Default partitioner is used");
            }
            const { CONNECT, DISCONNECT } = this.kafkaProducer.events;
            this.kafkaProducer.on(DISCONNECT, e => {
                console.log(`Metric producer disconnected!: ${e.timestamp}`);
                this.kafkaProducer.connect();
            });
            this.kafkaProducer.on(CONNECT, e => logger.debug("Kafka metric producer connected: " + e));
            this.kafkaProducer.connect();
          } catch(e) {
              this.logger.error("Exception occured while creating Kafka Producer: " + e);
          }
    }
    start(timer) {
        this.intervalObj = setInterval(() => {
            if (this.messageArray.length === 0) {
                return;
            }
            console.log('messageHash consist of ' + this.messageArray.length + " Items");

            var payloads = {
                topic: config.kafka.metricsTopic,
                messages: this.messageArray
            };
            this.logger.debug("will now deliver Kafka message: " + JSON.stringify(payloads));
            this.kafkaProducer.send(payloads)
            .catch((err) => {
                return this.logger.error("Could not send message to Kafka: " + err);
              }
            );
            this.messageArray = [];
        }, timer);
    }
    stop() {
        clearInterval(this.intervalObj);
    }
    addMessage(message) {
        this.messageArray.push(message);
    }
}

module.exports = function(logger) {
    var topics_subscribe = config.topics.subscribe;
    var topics_publish = config.topics.publish;
    var dataSchema = require("../lib/schemas/data.json");
    var Validator = require('jsonschema').Validator;
    var validator = new Validator();
    var cache = new CacheFactory(config, logger).getInstance();
    me = this;
    me.kafkaAggregator = new KafkaAggregator(logger);
    me.kafkaAggregator.start(config.kafka.linger);

    me.logger = logger;
    me.cache = cache;
    me.token = null;

    me.stopAggregator = function() {
        me.kafkaAggregator.stop();
    };

    me.getToken = function (did) {
        /*jshint unused:false*/
        return new Promise(function(resolve, reject) {
          resolve(null);
        });
    };

    me.processDataIngestion = function (topic, message) {

        var did;
        var accountId;
        /*
            It will be checked if the ttl exist, if it exits the package need to be discarded
        */
        me.logger.debug(
          "Data Submission Detected : " + topic + " Message " + JSON.stringify(message)
        );

        //legacy mqtt format is putting actual message in body.
        //Future formats will directly send valid data.
        var bodyMessage;
        if (message.body === undefined) {
            bodyMessage = message;
        } else {
            bodyMessage = message.body;
        }

        if (!validator.validate(bodyMessage, dataSchema["POST"])) {
            me.logger.info("Schema rejected message! Message will be discarded: " + bodyMessage);
        } else {
            //Get accountId
            var match = topic.match(/server\/metric\/([^\/]*)\/(.*)/);
            accountId = match[1];

            // Go through data and check whether cid is correct
            // Also retrieve dataType
            var promarray = [];
            bodyMessage.data.forEach(item => {
                var value = me.cache.getDidAndDataType(item);
                promarray.push(value);
              }
            );
            Promise.all(promarray)
            .then(values => {
                values.map(item => {
                    var kafkaMessage = me.prepareKafkaPayload(item, accountId);
                    if (kafkaMessage === null) {
                        var msg = "Validation of " + JSON.stringify(item.dataElement) + " for type " + item.dataType + " failed!";
                        me.logger.warn(msg);
                        me.sendErrorOverChannel(accountId, did, msg);
                        return;
                    }
                    var key = accountId + "." + kafkaMessage.cid;
                    var message = {key, value: JSON.stringify(kafkaMessage)};

                    me.kafkaAggregator.addMessage(message);
                });
            })
            .catch(function(err) {
              me.logger.warn("Could not send data to Kafka " + err);
            });
        }
    };
    me.connectTopics = function() {
        me.broker.bind(topics_subscribe.data_ingestion, me.processDataIngestion);
        return true;
    };
    me.handshake = function () {
        if (me.broker) {
            me.broker.on('reconnect', function(){
                me.logger.debug('Reconnect topics' );
                me.broker.unbind(topics_subscribe.data_ingestion, function () {
                    me.token = null;
                    me.connectTopics();
                    me.sessionObject = {};
                });
            });
        }
    };

    // setup channel to provide error feedback to device agent
    me.sendErrorOverChannel = function(accountId, did, message) {
        var path = me.broker.buildPath(topics_publish.error, [accountId, did]);
        me.broker.publish(path, message, null);
    };
    /**
    * @description It's bind to the MQTT topics
    * @param broker
    */
    me.bind = function (broker) {
        me.broker = broker;
        me.handshake();
        me.connectTopics();
    };


    /**
     * Prepare datapoint from frontend data structure to Kafka like the following example:
     * {"dataType":"Number", "aid":"account_id", "cid":"component_id", "value":"1",
     * "systemOn": 1574262569420, "on": 1574262569420, "loc": null}
     */
    me.prepareKafkaPayload = function(didAndDataType, accountId){
        var dataElement = didAndDataType.dataElement;
        var value = normalizeBoolean(dataElement.value.toString(), didAndDataType.dataType);
        if (!validate(value, didAndDataType.dataType)) {
            return null;
        }
        const msg = {
            dataType: didAndDataType.dataType,
            aid: accountId,
            cid: dataElement.componentId,
            on: dataElement.on,
            value: value
        };
        if (dataElement.systemOn !== undefined) {
            msg.systemOn = dataElement.systemOn;
        } else {
            msg.systemOn = dataElement.on;
        }

        if (undefined !== dataElement.attributes) {
            msg.attributes = dataElement.attributes;
        }
        if (undefined !== dataElement.loc) {
            msg.loc = dataElement.loc;
        }

        return msg;
    };
};
