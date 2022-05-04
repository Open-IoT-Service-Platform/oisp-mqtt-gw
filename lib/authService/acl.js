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

const CacheFactory = require("../cache"),
    SUBSCRIBE = "1",
    PUBLISH = "2";

class Acl {
    constructor(config, logger){
        this.config = config;
        this.logger = logger;
        this.cache = new CacheFactory(this.config, this.logger).getInstance();
    }
    async acl(req, res) {
        var username = req.query.username;
        if (username === this.config.broker.username) {
            // superuser
            this.logger.info("Superuser ACL accepted!");
            res.sendStatus(200);
            return;
        }
        var topic = req.query.topic;
        this.logger.debug("ACL request for username " + username + " and topic " + topic);
        // allow all $SYS topics
        if (topic.startsWith("$SYS/")) {
            res.sendStatus(200);
            return;
        }

        /*Check: Is accountId/username authorized to publish certain topic 
         * ACL verification for SparkplugB message type 
        */
        var splitTopic = topic.split("/");
        if (splitTopic[0] === "spBv1.0") {
              var spBAccountId =  splitTopic[1];
              var spBMessageType= splitTopic[2];
              var spBEonId =  splitTopic[3];
              var spBdevId =  splitTopic[4]; 
             if (spBMessageType=== "DDATA" || spBMessageType=== "DBIRTH"|| spBMessageType=== "DCMD") {   
                  this.logger.debug("Granting spB ACL for device id: "+ spBdevId + "and datatype: "+ spBMessageType);
                  var spBAclKey=spBAccountId + "/" +spBdevId;
                  let allowed = await this.cache.getValue( spBAclKey , "acl");
                      if (!allowed || allowed === undefined || spBdevId !== username) {
                          res.sendStatus(400);
                      } else {
                          res.sendStatus(200);
                      }
              }else if (spBMessageType=== "NCMD" || spBMessageType=== "NBIRTH" ||spBMessageType=== "NDEATH" ||spBMessageType=== "NDATA") {
                 this.logger.debug("Granting spB ACL for node: "+ spBEonId +" with messagetype: " + spBMessageType);
                 var spBNodeAclKey = spBAccountId + "/" + spBEonId;
                 let allowed = await this.cache.getValue( spBNodeAclKey , "acl");
                 if (!allowed || allowed === undefined) {
                     res.sendStatus(400);
                 } else {
                     res.sendStatus(200);
                 } 
             }
 
        } else { 
            //Check: Is accountId/username authorized
            var access = req.query.access;
            var accountId = null;
            var deviceId = null;
            var re = this.config.topics.prefix + "\\/([^\\/]*)\\/DCMD\\/([^\\/]*)\\/(.*)";
            var match = topic.match(new RegExp(re));
            if (match !== null && match !== undefined && match.length === 4) {
                if (access !== SUBSCRIBE) {
                    res.sendStatus(400);
                    return;
                }
                accountId = match[1];
                deviceId = match[3];
            }
            match = topic.match(/server\/metric\/([^\/]*)\/(.*)/);
            if (match !== null && match !== undefined && match.length === 3) {
                if (access !== PUBLISH) {
                    res.sendStatus(400);
                    return;
                }
                accountId = match[1];
                deviceId = match[2];
            }
            if (accountId === null || deviceId === null) {
                res.sendStatus(400);
                return;
            }
            var allowed = await this.cache.getValue(accountId + "/" + deviceId, "acl");
            if (!allowed || allowed === undefined || deviceId !== username) {
                res.sendStatus(400);
            } else {
                res.sendStatus(200);
            } 
        }   
    }
}

module.exports = Acl;
