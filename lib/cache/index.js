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
const { Sequelize } = require('sequelize');
const { QueryTypes } = require('sequelize');
var uuidValidate = require('uuid-validate');

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
		if (process.env.PGSSLMODE === "require") {
			this.sequelize = new Sequelize(conf.postgres.dbname, conf.postgres.username, conf.postgres.password, {
				host: conf.postgres.host,
				port: conf.postgres.port,
				dialect: 'postgres',
				dialectOptions: {
					ssl: {
						rejectUnauthorized: false
					}
				},
			});
		} else {
			this.sequelize = new Sequelize(conf.postgres.dbname, conf.postgres.username, conf.postgres.password, {
				host: conf.postgres.host,
				port: conf.postgres.port,
				dialect: 'postgres'
			});
		}

        this.sequelize.authenticate()
        .then(() => {
            console.log('DB connection has been established.');
        })
        .catch(error => {
            console.error('Unable to connect to DB:', error);
        });

        this.config = conf;
        this.logger = log;
        me = this;
        this.redisClient.on("error", function(err) {
            me.logger.info("Error in Redis client: " + err);
          });
    }
    async initialize() {


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
                    resolve(result[valueType]);
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
    async getDidAndDataType(item) {
        var cid = item.componentId;
        //check whether cid = uuid
        if (!uuidValidate(cid)) {
            throw new Error("cid not UUID. Rejected!");
        }

        var value = await this.getValues(cid);
        var didAndDataType;
        if (value === null || (Array.isArray(value) && value.length === 1 && value[0] === null)) {
            me.logger.debug("Could not find " + cid + "in cache. Now trying sql query.");
            // no cached value found => make db lookup and store in cache
            var sqlquery='SELECT devices.id,"dataType" FROM dashboard.device_components,dashboard.devices,dashboard.component_types WHERE "componentId"::text=\'' + cid + '\' and "deviceUID"::text=devices.uid::text and device_components."componentTypeId"::text=component_types.id::text';
            me.logger.debug("Applying SQL query: " + sqlquery);
            didAndDataType = await this.sequelize.query(sqlquery, { type: QueryTypes.SELECT });
            me.logger.debug("Result of sql query: " + JSON.stringify(didAndDataType));
        } else {
            me.logger.debug("Found in cache: " + JSON.stringify(value));
            didAndDataType = [value];
        }

        if (didAndDataType === undefined || didAndDataType === null) {
            throw new Error("DB lookup failed!");
        }
        var redisResult = await this.setValue(cid, "id", didAndDataType[0].id) && this.setValue(cid, "dataType", didAndDataType[0].dataType);
        didAndDataType[0].dataElement = item;
        if (redisResult) {
            return didAndDataType[0];
        } else {
            me.logger.warn("Could not store db value in redis. This will significantly reduce performance");
            return didAndDataType[0];
        }
    }

}
module.exports = CacheFactory;
