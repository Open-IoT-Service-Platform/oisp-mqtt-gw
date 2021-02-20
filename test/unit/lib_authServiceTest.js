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


var assert =  require('chai').assert,
    rewire = require('rewire');


var fileToTest = "../../lib/authService/authenticate.js";

describe(fileToTest, function(){
    var ToTest = rewire(fileToTest);

    it('Shall verify and decode token successfully', function(done){
        var decodedToken = {sub: "1234"};
        var verifier = function() {
            return decodedToken;
        };
        ToTest.__set__("verifier",verifier);
        var me = {
            logger: {
                info: function() {},
                debug: function() {}
            }
        };
        ToTest.__set__("me", me);
        var verifyAndDecodeToken = ToTest.__get__("verifyAndDecodeToken");
        var result = verifyAndDecodeToken("ex1123");
        assert.equal(decodedToken, result, "Wrong decoded Token");
        done();
    });
    it('Shall verify and decode token unsuccessfully', function(done){
        var message = "No valid token";
        var verifier = function() {
            throw new Error(message);
        };
        ToTest.__set__("verifier",verifier);
        var me = {
            logger: {
                info: function() {},
                debug: function() {}
            }
        };
        ToTest.__set__("me", me);
        var verifyAndDecodeToken = ToTest.__get__("verifyAndDecodeToken");
        var result = verifyAndDecodeToken("ex1123");
        assert.equal(result, null, "Wrong verfication result");
        done();
    });
    it('Shall receive public key', function(done){
        var request = function(options, callback) {
            assert.equal(options.method, "GET", "wrong request method");
            assert.equal(options.url, "http://keycloakurl:1234/auth/realms/realm", "wrong keycloak url");
            var response = {
                statusCode: 200,
                body: "{\"public_key\": \"publicKey\"}"
            };
            callback(null, response);
        };
        ToTest.__set__("request",request);
        var me = {
            logger: {
                debug: function() {}
            }
        };
        ToTest.__set__("me", me);
        var getPublicKeyForRealm = ToTest.__get__("getPublicKeyForRealm");
        getPublicKeyForRealm("http://keycloakurl:1234/auth", "realm")
        .then((result) => {
            assert.equal("-----BEGIN PUBLIC KEY-----\npublicKey\n-----END PUBLIC KEY-----", result, "Incorrect public key received");
            done();
        })
        .catch((e) => {
            done("Unexpected exception: " + e.message);
        });
    });
    it('Shall authenticate super user', function(done){
        var config = {
            broker: {
                username: "username",
                password: "password"
            },
            cache: {
                port: 1432,
                host: "cacheHost"
            } 
        };
        var CacheFactory = class {
            constructor() {

            }
            getInstance(){
                return class {

                };
            }
        };
        ToTest.__set__("CacheFactory", CacheFactory);
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var req = {
            query: {
                username: "username",
                password: "password" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 200, "Received wrong status");
                done();
            }
        };
        var authenticate = new ToTest(config, logger);
        authenticate.authenticate(req, res);
    });
    it('Authentication shall complain about missing public key ', function(done){
        var config = {
            broker: {
                username: "username",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var req = {
            query: {
                username: "username2",
                password: "password2" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 400, "Received wrong status");
                done();
            }
        };
        var authenticate = new ToTest(config, logger);
        authenticate.authenticate(req, res);
    });
    it('Authentication shall successfully validate a token', function(done){
        var decodedToken = {
            sub: "deviceId", 
            accounts: [{
                role: "device",
                id: "accountId"
            }]
        };
        var verifier = function() {
            return decodedToken;
        };
        ToTest.__set__("verifier",verifier);
        var config = {
            broker: {
                username: "username",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var req = {
            query: {
                username: "deviceId",
                password: "token" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 200, "Received wrong status");
                done();
            }
        };
        var cache = {
            setValue: function(key, type, value) {
                assert.equal(key, "accountId/deviceId", "Wrong cache value received.");
                assert.equal(type, "acl", "Wrong cache value received.");
                assert.equal(value, true, "Wrong cache value received.");
            }
        };
        /*var me = {
            logger: logger,
            config: config,
            public_key: "publicKey",
            cache: cache
        };*/
        var authenticate = new ToTest(config, logger);
        var me = ToTest.__get__("me", me);
        me.public_key = "publicKey";
        me.cache = cache;
        authenticate.authenticate(req, res);
    });
    it('Authentication shall detect wrong deviceId in username', function(done){
        var decodedToken = {
            sub: "deviceId", 
            accounts: [{
                role: "device",
                id: "accountId"
            }]
        };
        var verifier = function() {
            return decodedToken;
        };
        ToTest.__set__("verifier",verifier);
        var config = {
            broker: {
                username: "username",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var req = {
            query: {
                username: "wrongDeviceId",
                password: "token" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 400, "Received wrong status");
                done();
            }
        };
        var cache = {
            setValue: function(key, type, value) {
                assert.equal(key, "accountId/deviceId", "Wrong cache value received.");
                assert.equal(type, "acl", "Wrong cache value received.");
                assert.equal(value, true, "Wrong cache value received.");
            }
        };
        /*var me = {
            logger: logger,
            config: config,
            public_key: "publicKey",
            cache: cache
        };*/
        var authenticate = new ToTest(config, logger);
        var me = ToTest.__get__("me");
        me.public_key = "publicKey";
        me.cache = cache;
        authenticate.authenticate(req, res);
    });
    it('Authentication shall detect wrong role in token', function(done){
        var decodedToken = {
            sub: "deviceId", 
            accounts: [{
                role: "wrontRole",
                id: "accountId"
            }]
        };
        var verifier = function() {
            return decodedToken;
        };
        ToTest.__set__("verifier",verifier);
        var config = {
            broker: {
                username: "username",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var req = {
            query: {
                username: "deviceId",
                password: "token" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 400, "Received wrong status");
                done();
            }
        };
        var cache = {
            setValue: function(key, type, value) {
                assert.equal(key, "accountId/deviceId", "Wrong cache value received.");
                assert.equal(type, "acl", "Wrong cache value received.");
                assert.equal(value, true, "Wrong cache value received.");
            }
        };
        var authenticate = new ToTest(config, logger);
        var me = ToTest.__get__("me");
        me.public_key = "publicKey";
        me.cache = cache;
        authenticate.authenticate(req, res);
    });
    it('Authentication shall detect wrong account array', function(done){
        var decodedToken = {
            sub: "deviceId", 
            accounts: [{
                role: "device",
                id: "accountId"
            }, {
               role: "device",
               id: "accountId2" 
            }]
        };
        var verifier = function() {
            return decodedToken;
        };
        ToTest.__set__("verifier",verifier);
        var config = {
            broker: {
                username: "username",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var req = {
            query: {
                username: "deviceId",
                password: "token" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 400, "Received wrong status");
                done();
            }
        };
        var cache = {
            setValue: function(key, type, value) {
                assert.equal(key, "accountId/deviceId", "Wrong cache value received.");
                assert.equal(type, "acl", "Wrong cache value received.");
                assert.equal(value, true, "Wrong cache value received.");
            }
        };
        var authenticate = new ToTest(config, logger);
        var me = ToTest.__get__("me");
        me.public_key = "publicKey";
        me.cache = cache;
        authenticate.authenticate(req, res);
    });
});

fileToTest = "../../lib/authService/acl.js";

describe(fileToTest, function(){
    var ToTest = rewire(fileToTest);
    it('Shall give access control to superuser', function(done){
        class CacheFactory {
            constructor() {
            }
            getInstance() {
                return {
                    getDidAndDataType: function() {
                    }
                };
            }
        }
        ToTest.__set__("CacheFactory", CacheFactory);
        var config = {
            broker: {
                username: "superuser",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var acl = new ToTest(config, logger);
        var req = {
            query: {
                username: "superuser",
                topic: "topic" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 200, "Received wrong status");
                done();
            }
        };
        acl.acl(req, res);
    });
    it('Shall give access control to device', function(done){
        var Cache = class Acl {
            constructor(){

            }
            getValue(subtopic, key) {
                assert.equal(aidSlashDid, subtopic, "Wrong accountId/did subtopic");
                assert.equal(key, "acl", "Wrong key value");
                return true;
            }
        };
        class CacheFactory {
            constructor() {
            }
            getInstance() {
                return new Cache();
            }
        }
        var aidSlashDid = "accountId/deviceId";

        ToTest.__set__("CacheFactory", CacheFactory);
        var config = {
            broker: {
                username: "username",
                password: "password"
            }   
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var acl = new ToTest(config, logger);
        var req = {
            query: {
                username: "deviceId",
                topic: "/server/metric/" + aidSlashDid 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 200, "Received wrong status");
                done();
            }
        };
        acl.acl(req, res);
    });
    it('Shall deny access control to device with wrong topic', function(done){
        var Cache = class Acl {
            constructor(){

            }
            getValue(subtopic, key) {
                assert.equal(key, "did", "Wrong key value");
                return false;
            }
        };
        class CacheFactory {
            constructor() {
            }
            getInstance() {
                return new Cache();
            }
        }
        ToTest.__set__("CacheFactory", CacheFactory);
        var config = {
            broker: {
                username: "username",
                password: "password"
            }
        };
        var logger = {
            debug: function() {},
            info: function() {}
        };
        var acl = new ToTest(config, logger);
        var req = {
            query: {
                username: "deviceId",
                topic: "/server/metric/" + "wrong/topic" 
            }
        };
        var res = {
            sendStatus: function(status) {
                assert.equal(status, 400, "Received wrong status");
            }
        };
        acl.acl(req, res);
        req = {
            query: {
                username: "deviceId",
                topic: "/server/metric/" + "wrongtopic" 
            }
        };
        res = {
            sendStatus: function(status) {
                assert.equal(status, 400, "Received wrong status");
                done();
            }
        };
        acl.acl(req, res);
    });
});