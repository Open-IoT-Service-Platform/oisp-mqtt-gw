/**
* Copyright (c) 2022 Intel Corporation
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

'use strict';
const Logger = require('./logger.js');
const Rest = require('./rest.js');

module.exports = function KairosDb (conf) {
  const config = conf;
  const logger = new Logger(config);
  const rest = new Rest(config);

  let headers;

  this.postDatapoints = async function (body) {
    headers = {};

    logger.debug(`send alert with body ${JSON.stringify(body)}`);
    headers['Content-type'] = 'application/json';

    const options = {
      hostname: config.kairosdb.hostname,
      protocol: config.kairosdb.protocol,
      port: config.kairosdb.port,
      path: '/api/v1/datapoints',
      method: 'POST',
      headers
    };
    return await rest.postBody({ options, body, disableChunks: true });
  };
};
