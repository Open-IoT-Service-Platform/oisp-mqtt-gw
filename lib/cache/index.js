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

const redis = require("redis");
var me;

class CacheFactory {
    constructor(conf, logger) {
        if (!CacheFactory.instance) {
            CacheFactory.instance = new Cache(conf, logger);
        }
    }
    getInstance() {
        return CacheFactory.instance;
    }
}

class Cache {

    constructor(conf, log)
    {
        this.redisClient = redis.createClient({port: conf.cache.port, host: conf.cache.host});
		this.config = conf;
        this.logger = log;
        me = this;
        this.redisClient.on("error", function(err) {
            me.logger.info("Error in Redis client: " + err);
          });
    }
    
    async setValue(key, valueType, value) {
        return new Promise((resolve, reject) => {
            this.redisClient.hmset(key, valueType, value, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    async getValue(key, valueType) {
        return new Promise((resolve, reject) => {
            this.redisClient.hgetall(key, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        resolve(result[valueType]);
                    } catch (err) {
                        me.logger.error("Could not find valueType " + valueType + "in " + key);
                        return null;
                    }
                }
            });
        });
    }
    async getValues(key) {
        return new Promise((resolve, reject) => {
            this.redisClient.hgetall(key, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
}
module.exports = CacheFactory;
