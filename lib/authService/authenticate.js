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
"use esversion: 8";

const CacheFactory = require("../cache");
const Keycloak = require('keycloak-connect');
var me;

function verifyAndDecodeToken(token) {
    me.logger.debug("decode token: " + token);
    return me.keycloakAdapter.grantManager
        .createGrant({ access_token: token })
        .then(grant => grant.access_token.content)
        .catch(err => {
            me.logger.debug("Token decoding error: " + err);
            return null;
        });
}

class Authenticate {

    constructor(config, logger){
        this.config = config;
        this.logger = logger;
        this.cache = new CacheFactory(this.config, this.logger).getInstance();
        me = this;
    }
    async initialize() {
        var authService = this.config.authService;
        this.keycloakAdapter = new Keycloak({}, authService);
    }
    // expects "username" and "password" as url-query-parameters
    async authenticate(req, res) {

        this.logger.debug("Auth request " + JSON.stringify(req.query));
        var username = req.query.username;
        var token = req.query.password;
        if (username === this.config.broker.username && token === this.config.broker.password) {
            // superuser
            this.logger.info("Superuser connected");
            res.sendStatus(200);
            return;
        }
        var decoded_token =  await verifyAndDecodeToken(token);
        this.logger.debug("token decoded: " + JSON.stringify(decoded_token));
        if (decoded_token === null) {
            res.sendStatus(400);
            return;
        }
        // check whether accounts contains only one element and role is device
        var accounts = decoded_token.accounts;
        var did = decoded_token.sub;
        if (accounts === undefined || did === undefined || accounts.length !== 1 || accounts[0].role !== "device" || did !== username) {
            res.sendStatus(400);
            return;
        }
        var accountId = accounts[0].id;
        //put account/device into the list of accepted topics
        var key = accountId + "/" + did;
        await this.cache.setValue(key, "acl", true);

        // For SparkplugB put account/gateway(node) into the list of accepted topics to authenticate Node/gateway messages
        if (decoded_token.gateway !== undefined ||decoded_token.gateway === null) {
            var gatewayKey=accountId + "/"+ decoded_token.gateway;
            await this.cache.setValue(gatewayKey, "acl", true);
        }
        res.sendStatus(200);
    }
}
module.exports = Authenticate;
