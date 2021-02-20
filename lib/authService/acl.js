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
const CacheFactory = require("../cache");

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
        //Check: Is accountId/username authorized
        var match = topic.match(/server\/metric\/([^\/]*)\/(.*)/);
        if (match === null || match === undefined || match.length !== 3) {
            res.sendStatus(400);
            return;
        }
        var accountId = match[1];
        var did = match[2];
        var allowed = await this.cache.getValue(accountId + "/" + did, "acl");
        if (!allowed || allowed === undefined || did !== username) {
            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }
}

module.exports = Acl;