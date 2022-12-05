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

const { assert } = require('chai');
const chai = require('chai');
global.should = chai.should();
const rewire = require('rewire');
const toTest = rewire('../kairosdb/app.js');

const logger = {
  debug: function () {},
  error: function () {}
};

const Logger = function () {
  return logger;
};

describe('Test processMessage', function () {
  it('Should send a Property with IRI nodetype', async function () {
    const kairosdb = {
      postDatapoints: function (datapoint) {
        assert.equal(datapoint[0].name, 'default\\entityId\\name');
        assert.equal(datapoint[0].value, 'value');
        assert.equal(datapoint[0].tags.type, 'https://uri.etsi.org/ngsi-ld/Property');
        assert.equal(datapoint[0].tags.nodeType, '@id');
        assert.equal(datapoint[0].timestamp, 1);
        return { statusCode: 204 };
      }
    };

    const kafkamessage = {
      topic: 'topic',
      partition: 'partition',
      message: {
        value: JSON.stringify({
          id: 'id',
          entityId: 'entityId',
          name: 'name',
          type: 'https://uri.etsi.org/ngsi-ld/Property',
          'https://uri.etsi.org/ngsi-ld/hasValue': 'value',
          nodeType: '@id'
        }),
        timestamp: 1
      }
    };
    const revert = toTest.__set__('kairosdb', kairosdb);
    toTest.__set__('Logger', Logger);
    const processMessage = toTest.__get__('processMessage');
    await processMessage(kafkamessage);
    revert();
  });
  it('Should send a Relationship', async function () {
    const kairosdb = {
      postDatapoints: function (datapoint) {
        assert.equal(datapoint[0].name, 'default\\entityId\\relationship');
        assert.equal(datapoint[0].value, 'object');
        assert.equal(datapoint[0].tags.type, 'https://uri.etsi.org/ngsi-ld/Relationship');
        assert.equal(datapoint[0].tags.nodeType, '@id');
        assert.equal(datapoint[0].timestamp, 999999);
        return { statusCode: 204 };
      }
    };

    const kafkamessage = {
      topic: 'topic',
      partition: 'partition',
      message: {
        value: JSON.stringify({
          id: 'id',
          entityId: 'entityId',
          name: 'relationship',
          type: 'https://uri.etsi.org/ngsi-ld/Relationship',
          'https://uri.etsi.org/ngsi-ld/hasObject': 'object',
          nodeType: '@id'
        }),
        timestamp: 999999
      }
    };
    const revert = toTest.__set__('kairosdb', kairosdb);
    toTest.__set__('Logger', Logger);
    const processMessage = toTest.__get__('processMessage');
    await processMessage(kafkamessage);
    revert();
  });
  it('Should send a Property with @value nodetype', async function () {
    const kairosdb = {
      postDatapoints: function (datapoint) {
        assert.equal(datapoint[0].name, 'default\\entityId\\name');
        assert.equal(datapoint[0].value, 'value');
        assert.equal(datapoint[0].tags.type, 'https://uri.etsi.org/ngsi-ld/Property');
        assert.equal(datapoint[0].tags.nodeType, '@value');
        assert.equal(datapoint[0].timestamp, 1);
        return { statusCode: 204 };
      }
    };

    const kafkamessage = {
      topic: 'topic',
      partition: 'partition',
      message: {
        value: JSON.stringify({
          id: 'id',
          entityId: 'entityId',
          name: 'name',
          type: 'https://uri.etsi.org/ngsi-ld/Property',
          'https://uri.etsi.org/ngsi-ld/hasValue': 'value',
          nodeType: '@value'
        }),
        timestamp: 1
      }
    };
    const revert = toTest.__set__('kairosdb', kairosdb);
    toTest.__set__('Logger', Logger);
    const processMessage = toTest.__get__('processMessage');
    await processMessage(kafkamessage);
    revert();
  });
  it('Should send a Property with @value nodetype and valueType', async function () {
    const kairosdb = {
      postDatapoints: function (datapoint) {
        assert.equal(datapoint[0].name, 'default\\entityId\\name');
        assert.equal(datapoint[0].value, 'value');
        assert.equal(datapoint[0].tags.type, 'https://uri.etsi.org/ngsi-ld/Property');
        assert.equal(datapoint[0].tags.nodeType, '@value');
        assert.equal(datapoint[0].tags.valueType, 'http://www.w3.org/2001/XMLSchema#string');
        assert.equal(datapoint[0].timestamp, 1);
        return { statusCode: 204 };
      }
    };

    const kafkamessage = {
      topic: 'topic',
      partition: 'partition',
      message: {
        value: JSON.stringify({
          id: 'id',
          entityId: 'entityId',
          name: 'name',
          type: 'https://uri.etsi.org/ngsi-ld/Property',
          'https://uri.etsi.org/ngsi-ld/hasValue': 'value',
          nodeType: '@value',
          valueType: 'http://www.w3.org/2001/XMLSchema#string'
        }),
        timestamp: 1
      }
    };
    const revert = toTest.__set__('kairosdb', kairosdb);
    toTest.__set__('Logger', Logger);
    const processMessage = toTest.__get__('processMessage');
    await processMessage(kafkamessage);
    revert();
  });
});
