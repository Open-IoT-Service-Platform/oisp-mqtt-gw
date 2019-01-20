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
const fs = require('fs');
var devices = require('../api/iot.devices');
var config = require("../config");
var util = require("../lib/common").time;
var Metric = require("../lib/Metric.data").init(util);
var topics_subscribe = config.topics.subscribe;
const crypto = require("crypto");
const redis = require("redis");
const NodeCache = require("node-cache");
var redisClient = redis.createClient({port: config.cache.port, host: config.cache.host});
var mqttGWKey  = Buffer.from(fs.readFileSync(config.broker.mqttGWSecret, "utf8"), "base64");
const tokenCache = new NodeCache({stdTTL: 3600});

module.exports = function(logger) {
    var me = this;
    me.logger = logger;
    /**
     * @descritpion xxxxxxx
     * @param topic: it is the MQTT topic subscribe, the topic has device id in between
     * @param message: the message contain the code require to ask for authorization token.
    */
    me.token = null;


    me.getToken = function (did) {
        return new Promise(function(resolve, reject) {
            tokenCache.get(did, function(err, value) {
                if (!err && value !== undefined) {
                    resolve(value);
                }
                else{
            //handle cache miss
                    redisClient.hgetall(did, function(err, obj) {
                        if (err) {
                            reject("Could not retrieve token: " + err);
                        }

                        var iv = Buffer.from(obj.iv, 'base64');
                        var ciphertext = Buffer.from(obj.ciphertext, 'base64');
                        var tag = Buffer.from(obj.tag, 'base64');
                        me.logger.debug("Now decrypting token: " + obj.iv + " " + obj.tag + " " + obj.ciphertext);

                        const algorithm = "aes-128-gcm";
                        const decipher = crypto.createDecipheriv(algorithm, mqttGWKey, iv);
                        decipher.setAuthTag(tag);
                        try {
                            var decrypted = decipher.update(ciphertext, "utf-8");
                            decrypted += decipher.final("utf-8");
                        } catch(err) {
                            reject("Could not decrypt token.:" + err)
                        }
                        var token = decrypted.toString("utf8");
                        tokenCache.set(did, token)
                        resolve(token);
                    });
                }
            });
        });
    };
    me.processDataIngestion = function (topic, message) {
        /*
            It will be checked if the ttl exist, if it exits the package need to be discarded
        */
        me.logger.debug("Data Submission Detected : " + topic + " Message " + JSON.stringify(message));

        if (!message.forwarded) {
            //It set to set 0 since we do not want to enter to a loop

            var did = message.did;
            if (did === undefined || did === null) {
                me.logger.error("Could not find DID in message.");
                return;
            }

            me.getToken(did)
            .then(function(token) {
                if (token === null) {
                    return;
                }
                delete message.deviceToken;

                if (did && token) {
                    var metric = new Metric();
                    var data = {
                        deviceId: did,
                        deviceToken: token,
                        body: metric.fromMQTTToRestPayload(message),
                        forwarded: true //It set to set 0 since we do not want to enter to a loop
                    };

                    me.logger.debug("For Forward - device id " + did);
                    devices.submitData(data, function (err, response) {
                        if (!err) {
                            me.logger.info("Response From data Submission from API " + JSON.stringify(response));
                        } else {
                            me.logger.error("Data Submission Error " + JSON.stringify(err));
                        }
                    });
                } else {
                    me.logger.error("Incorrect data submission message format - " + JSON.stringify(message));
                }
            })
            .catch(err => {
                me.logger.error("Could not send message: " + err)
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
    /**
    * @description It's bind to the MQTT topics
    * @param broker
    */
    me.bind = function (broker) {
        me.broker = broker;
        me.handshake();
        me.connectTopics();

    };
};
