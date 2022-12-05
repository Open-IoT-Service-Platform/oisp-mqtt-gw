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

const GROUPID = 'kairosdbkafkabridge';
const CLIENTID = 'kairosdbkafkaclient';
const { Kafka } = require('kafkajs');
const fs = require('fs');
const config = require('../config/config.json');
const KairosDb = require('../lib/kairosdb.js');
const Logger = require('../lib/logger.js');
const runningAsMain = require.main === module;

const kairosdb = new KairosDb(config);
const logger = new Logger(config);

const kafka = new Kafka({
  clientId: CLIENTID,
  brokers: config.kafka.brokers
});

const processMessage = async function ({ topic, partition, message }) {
  const body = JSON.parse(message.value);
  if (body.type === undefined) { // deletion of attribute, ignore it
    return;
  }
  const datapoint = {};
  datapoint.name = `default\\${body.entityId}\\${body.name}`;
  datapoint.timestamp = message.timestamp;

  if (body.type === 'https://uri.etsi.org/ngsi-ld/Property') {
    let value = body['https://uri.etsi.org/ngsi-ld/hasValue'];
    if (!isNaN(value)) {
      value = Number(value);
    }
    datapoint.value = body['https://uri.etsi.org/ngsi-ld/hasValue'];
    datapoint.tags = {
      type: 'https://uri.etsi.org/ngsi-ld/Property',
      nodeType: body.nodeType
    };
    if (body.valueType !== undefined && body.valueType !== null) {
      datapoint.tags.valueType = body.valueType;
    }
  } else if (body.type === 'https://uri.etsi.org/ngsi-ld/Relationship') {
    datapoint.value = body['https://uri.etsi.org/ngsi-ld/hasObject'];
    datapoint.tags = {
      type: 'https://uri.etsi.org/ngsi-ld/Relationship',
      nodeType: body.nodeType
    };
  } else {
    logger.error('Could not send Datapoints: Neither Property nor Relationship');
    return;
  }
  const result = await kairosdb.postDatapoints([datapoint]);

  if (result === undefined && result.statusCode !== 204) {
    logger.error(`submission to KairosDB failed with statuscode ${result.statusCode} and ${JSON.stringify(result.body)}`);
    if (result !== undefined && result.statusCode !== 400) { // 400 means that there is problem with the sample syntax. Do not retry then. Otherwise, it must be server problem, so retry.
      throw new Error('Problems to reach server. Retry.');
    }
  }
};

const consumer = kafka.consumer({ groupId: GROUPID, allowAutoTopicCreation: false });
console.log(JSON.stringify(config));

const startListener = async function () {
  await consumer.connect();
  await consumer.subscribe({ topic: config.kairosdb.topic, fromBeginning: false });

  await consumer.run({ eachMessage: async ({ topic, partition, message }) => processMessage({ topic, partition, message }) }).catch(e => console.error(`[example/consumer] ${e.message}`, e));

  const errorTypes = ['unhandledRejection', 'uncaughtException'];
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  errorTypes.map(type =>
    process.on(type, async e => {
      try {
        console.log(`process.on ${type}`);
        console.error(e);
        await consumer.disconnect();
        process.exit(0);
      } catch (_) {
        process.exit(1);
      }
    }));

  signalTraps.map(type =>
    process.once(type, async () => {
      try {
        await consumer.disconnect();
      } finally {
        process.kill(process.pid, type);
      }
    }));
  try {
    fs.writeFileSync('/tmp/ready', 'ready');
    fs.writeFileSync('/tmp/healthy', 'healthy');
  } catch (err) {
    logger.error(err);
  }
};

if (runningAsMain) {
  logger.info('Now staring Kafka listener');
  startListener();
}
