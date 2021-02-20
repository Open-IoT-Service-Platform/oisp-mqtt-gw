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

const request = require("request");
const { createVerifier } = require('fast-jwt');
const CacheFactory = require("../cache");
var verifier;
var me;

// @brief retrieves public key for a given realName
// @param keycloakHost includes protocol, port and root folder, e.g. http://keycloak:1234/auth
// @return public key if successful null or true if token is valid, false if not, and exception if problems with service
var getPublicKeyForRealm = function(keycloakHost, realmName){
    return new Promise(function(resolve, reject) {
        const options = {
            method: 'GET',
            url: `${keycloakHost}/realms/${realmName}`
        };
        me.logger.debug("Requesting " + JSON.stringify(options));
        request(options, (error, response) => {
            if (error) {
                reject(new Error(error));
            }
            var public_key = "-----BEGIN PUBLIC KEY-----\n" + JSON.parse(response.body).public_key + "\n-----END PUBLIC KEY-----";
            resolve(public_key);
        });
    });
};

var verifyAndDecodeToken = function(token) {
    me.logger.debug("decode token: " + token);
    var payload;
    try {
        payload = verifier(token);
    } catch(e) {
        me.logger.info("Could not verify token!");
        return null;
    }
    return payload;
};

class Authenticate {

    constructor(config, logger){
        this.config = config;
        this.logger = logger;
        this.cache = new CacheFactory(this.config, this.logger).getInstance();
        me = this;
    }
    async initialize() {
        var authService = this.config.authService;
        this.public_key = await getPublicKeyForRealm(authService["auth-server-url"], authService.realm);
        if (this.public_key !== undefined) {
            this.logger.info("public_key retrieved: " + this.public_key);
            verifier = createVerifier({key: this.public_key});
        } else {
            process.exit(1); // could not get key, this is serious so try again later
        }
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
        if (this.public_key === undefined) {
            res.sendStatus(400); // no key, no access
            return;
        }
        var decoded_token = verifyAndDecodeToken(token);
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
        res.sendStatus(200);
    }
}
module.exports = Authenticate;