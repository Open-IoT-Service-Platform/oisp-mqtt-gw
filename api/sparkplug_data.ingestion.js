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
const CacheFactory = require("../lib/cache");
const { QueryTypes } = require('sequelize');
var uuidValidate = require('uuid-validate');

var me;

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
                clientId: 'spBFrontend-metrics',
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
                this.logger.warn(`SparkplugB Metric producer disconnected!: ${e.timestamp}`);
                this.kafkaProducer.connect();
            });
            this.kafkaProducer.on(CONNECT, e => logger.debug("Kafka SparkplugB metric producer connected: " + e));
            this.kafkaProducer.connect();
          } catch(e) {
              this.logger.error("Exception occured while creating Kafka SparkplugB Producer: " + e);
          }
    }
    start(timer) {
        this.intervalObj = setInterval(() => {
            if (this.messageArray.length === 0) {
                return;
            }
            this.logger.debug('messageHash consist of ' + this.messageArray.length + " Items");
            var payloads;

             // If config enabled for producing kafka message on SparkPlugB topic
            if(config.sparkplug.spBKafkaProduce){
                payloads = {
                    topic: config.sparkplug.spBkafkaTopic,
                    messages: this.messageArray
                };
            }else{
                payloads = {
                    topic: config.kafka.metricsTopic,
                    messages: this.messageArray
                };
            }
            this.logger.info("will now deliver Kafka message:   " + JSON.stringify(payloads));
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
    var topics_subscribe= config.sparkplug.topics.subscribe;
    var topics_publish = config.sparkplug.topics.publish;
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

    /*Validate SpB Node & Device are with proper seq number and store in cache
    * To Do: In future add function to send node command for RE-BIRTH message in case seq number or CID/alias not matched
    */
    me.validateSpbDevSeq= async function (topic,bodyMessage) { 
        let subTopic = topic.split("/");
        var accountId = subTopic[1];
        var devID = subTopic[4]; 
        var eonID = subTopic[3];
        var redisSeqKey = accountId +"/"+ eonID;
        try{
            if (subTopic[2] === "NBIRTH") {
                if (bodyMessage.seq === 0) {
                    let redisResult = await me.cache.setValue(redisSeqKey, "seq", 0 );
                    if (redisResult !== null || redisResult !== undefined) {
                        me.logger.debug("NBIRTH  message of eonid: "+ eonID +" has right seq no. 0  and stored in redis ");
                        return true;  
                    } else { 
                        me.logger.warn("Could not store birth seq value in redis with key: "+ redisSeqKey +", this will effect seq no verification for data message");
                        return false;                         
                    } 
                }else{
                    me.logger.error("Sequence is not 0 so ignoring BIRTH message for eonID: " + eonID+", and seq no: "+ bodyMessage.seq);
                    return false;
                }   
            } else if ( subTopic[2] === "DDATA" || subTopic[2] === "DBIRTH" || subTopic[2] === "NDATA" ) {
                var redisSeq= await me.cache.getValue(redisSeqKey, "seq");
                if (redisSeq === null || redisSeq === undefined) {
                    me.logger.warn("Could not load seq value from redis for topic: "+ subTopic[2] +" and dev :"+ devID);
                    return false;            
                }
                if ((bodyMessage.seq > redisSeq && bodyMessage.seq <= 255) || (bodyMessage.seq === 0 && redisSeq === 255)) {
                    redisSeq=bodyMessage.seq;
                    let redisResult = await me.cache.setValue(redisSeqKey, "seq", redisSeq );    
                    if (!redisResult) {
                        me.logger.warn("Could not store seq value in redis, this will effect seq no verification for data message");
                        return false;
                    } else {   
                        me.logger.debug("Valid seq, Data Seq: " + redisSeq+ " added for dev: " + devID );
                        return true;
                    }   
                } else {
                    me.logger.error("Sequence is not more than previous seq number so ignoring message for devID: " + devID+", and seq no: "+ bodyMessage.seq);
                    return false;
                }
            }
        } catch (err) {
            me.logger.error("ERROR in validating the SparkPlugB payload " + err);     
            return false ;
        }
        
    };
     /**Retrive data from SQL to cache if not present in cache to enhance performance
      * SQL check also is useful for verify if the alias/cid sent is previously registered alias or not
      */

    me.getSpBDidAndDataType = async function (item) {
        var cid = item.alias;
        //check whether cid = uuid
        if (!uuidValidate(cid)) {
            throw new Error("cid not UUID. Rejected!");
        }
        var value = await me.cache.getValues(cid);
        var didAndDataType;
        if (value === null || (Array.isArray(value) && value.length === 1 && value[0] === null)) {
            me.logger.debug("Could not find " + cid + "in cache. Now trying sql query.");
            // no cached value found => make db lookup and store in cache
            var sqlquery='SELECT devices.id,"dataType" FROM dashboard.device_components,dashboard.devices,dashboard.component_types WHERE "componentId"::text=\'' + cid + '\' and "deviceUID"::text=devices.uid::text and device_components."componentTypeId"::text=component_types.id::text';
            me.logger.debug("Applying SQL query: " + sqlquery);
            didAndDataType =  await me.cache.sequelize.query(sqlquery, { type: QueryTypes.SELECT });
            me.logger.debug("Result of sql query: " + JSON.stringify(didAndDataType));
        } else {
            me.logger.debug("Found in cache: " + JSON.stringify(value));
            didAndDataType = [value];
        }

        if (didAndDataType === undefined || didAndDataType === null) {
            throw new Error("DB lookup failed!");
        }
        var redisResult = await me.cache.setValue(cid, "id", didAndDataType[0].id) && me.cache.setValue(cid, "dataType", didAndDataType[0].dataType);
        didAndDataType[0].dataElement = item;
        if (redisResult) {
            return didAndDataType[0];
        } else {
            me.logger.warn("Could not store db value in redis. This will significantly reduce performance");
            return didAndDataType[0];
        }
    };

    me.createKafakaPubData = function(topic,bodyMessage){
        /*** For forwarding sparkplugB data directly without kafka metrics format
        * @param  spBkafkaProduce is set in the config file 
        *  */  
         var subTopic = topic.split("/");
         var accountId = subTopic[1];
         var devID = subTopic[4]; 

        if (config.sparkplug.spBKafkaProduce ) {
            me.logger.info(" Selecting kafka message topic SparkplugB with spB format payload for data type: "+subTopic[2]);
               
            /* Validating each component of metric payload if they are valid or not 
            * By verifying there existence in DB or cache
            */
            bodyMessage.metrics.forEach(item => {             
                var kafkaMessage = item;
                if (kafkaMessage === null || kafkaMessage === undefined) {                   
                    var msg = "Validation of " + JSON.stringify(item.name) + " for type " + item.dataType + " failed!";
                    me.logger.warn(msg);
                    me.sendErrorOverChannel(topic, devID, msg);
                    return false;
                }else if(subTopic[2] === "NBIRTH"){
                    var key = topic;
                    var message = {key, value: JSON.stringify(kafkaMessage)};
                    me.kafkaAggregator.addMessage(message);
                    return true;                   
                } 
                /**Validating component id in the database to check for DDATA */
               else if (subTopic[2] === "DDATA" || subTopic[2] === "DBIRTH") {
                    me.getSpBDidAndDataType(item).then(values => {
                        if (values) {
                            me.logger.debug("SpB payload is valid with component registered.");
                            var key = topic;
                            var message = {key, value: JSON.stringify(kafkaMessage)};
                            me.kafkaAggregator.addMessage(message);
                            return true;
                        }
                    }).catch(function(err) {
                        me.logger.warn("Could not send data to Kafka due to SpB not availiable in DB/cache " + err);
                        return false;
                    }); 
                } else {
                    me.logger.warn("Unknown data type of message, unable to form kafka message");
                    return false;
                }                 
            });

        }else if (!config.sparkplug.spBKafkaProduce) {    
        /*** For forwarding sparkplugB data according to  kafka metrics format to be shown in dashboard
         * @param  kafkaProduce is set in the config file 
         *  */  
            me.logger.info("Kafka metric topic is selected as to meet frontend dashboard data format");
            // For NBIRTH message type with kafka topic, ignoring the kafka send
            let subTopic = topic.split("/");
            if (subTopic[2] === "NBIRTH") {
                me.logger.info("Received spB NBIRTH message, ignoring currently kafka forward for metric topic");
                return true;
            }

            // Go through payload metrics and check whether cid/alias is correct
            // Check CID in catch or SQL table for security check of component registered
            var promarray = [];
            bodyMessage.metrics.forEach(item => {
                var value = me.getSpBDidAndDataType(item);
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
                        me.sendErrorOverChannel(accountId, devID, msg);
                        return false;
                     }
                    var key = accountId + "." + kafkaMessage.cid;
                    var message = {key, value: JSON.stringify(kafkaMessage)};

                    me.kafkaAggregator.addMessage(message);
                });
            })
            .catch(function(err) {
                me.logger.warn("Could not send data to Kafka " + err);
            });
            return true;
        } 
    };

    me.processDataIngestion = function (topic, message) {
             
        /*
            It will be checked if the ttl exist, if it exits the package need to be discarded
        */
        me.logger.info(
          "Data Submission Detected : " + topic + " Message: " + JSON.stringify(message)
        );
        
        var bodyMessage;
        if (message.body === undefined) {
            bodyMessage = message;
        } else {
            bodyMessage = message.body;
        }
        
        if (!validator.validate(bodyMessage, dataSchema["SPARKPLUGB"])) {
            me.logger.info("Schema rejected message! Message will be discarded: " + bodyMessage);
            return null;
        } else {  
         /* Validating SpB seq number if it is alligned with previous or not  
         *  To Do: If seq number is incorrect, send command to device for resend Birth Message
         */
           me.validateSpbDevSeq(topic,bodyMessage).then(values =>{
                if(values){
                    me.createKafakaPubData(topic,bodyMessage);
                 }
            }).catch(function(err){
                 me.logger.warn("Could not send data to Kafka due to SpB Validity failure " + err);

            });  
        }

    };
    me.connectTopics = function() {
        me.broker.bind(topics_subscribe.sparkplugb_data_ingestion, me.processDataIngestion);
        return true;
    };
    me.handshake = function () {
        if (me.broker) {
            me.broker.on('reconnect', function(){
                me.logger.debug('Reconnect topics' );
                me.broker.unbind(topics_subscribe.sparkplugb_data_ingestion, function () {
                    me.token = null;
                    me.connectTopics();
                    me.sessionObject = {};
                });
            });
        }
    };

    // setup channel to provide error feedback to device agent
    me.sendErrorOverChannel = function(topic, did, message) {
        var path = me.broker.buildPath(topics_publish.error, [topic, did]);
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
            cid: dataElement.alias,
            on: dataElement.timestamp,
            value: value
        };
        if (dataElement.systemOn !== undefined) {
            msg.systemOn = dataElement.systemOn;
        } else {
            msg.systemOn = dataElement.timestamp;
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
