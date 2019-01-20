/**
* Copyright (c) 2017 Intel Corporation
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
var hooker = require('hooker'),
    uuid = require('node-uuid'),
    contextProvider = require('./../context-provider').instance(),
    Responder = require('../response'),
    util = require('util');

var generateRequestId = function(){
    return 'api:' + uuid.v4();
};

/**
 * This function hooks all callbacks associated to
 * the express server's verbs
 */
var logger;
/**
 * It receive a array of callbacks, and hooks each of them,
 * to log every call. By default, the summary of the log
 * it will be
 * @param callbacks
 * @returns none
 */
function applyHookLog(callbacks) {
    hooker.hook(callbacks, '0', {
        passName: true,
        pre: function() {
            var req = arguments[1]; // request of the application
            var res = arguments[2];
            res.requestId = req.headers['x-iotkit-requestid'] ? req.headers['x-iotkit-requestid'] : generateRequestId();
            res.forceLogLevel = req.headers['x-intel-loglevel'];

            contextProvider.set('requestid', res.requestId);

            logger.info('REQUESTED: ' + req.url + ' HTTP Code: ' + res.statusCode, {
                requestId: res.requestId,
                forceLogLevel: res.forceLogLevel
            });
            logger.debug('REQUEST', {
                object: req,
                forceLogLevel: res.forceLogLevel
            });
        },
        post: function() {
            var req = arguments[2];
            var res = arguments[3];
            logger.info('RESPONDED: ' + req.url + ' HTTP Code: ' + res.statusCode, {
                requestId: res.requestId,
                forceLogLevel: res.forceLogLevel
            });
            logger.debug('RESPONSE', {
                object: res,
                requestId: res.requestId,
                forceLogLevel: res.forceLogLevel
            });
        }
    });
}
/***
 * TODO Review synchronising in the output with the start
 * and end logging messages of the API calls
 * @returns none
 */

function applyLogToCommonReturnOutput() {
    hooker.hook(Responder,'response', function() {
        var res = arguments[0].res;
        logger.debug('Returned: ' + util.inspect(arguments[1]),
            {requestId:res.requestId, forceLogLevel: res.forceLogLevel});
    });
}
module.exports.intercept = function (clazz, log) {
    logger = log;
    var getCallbacksMap = clazz.routes.get;
    var postCallbacksMap = clazz.routes.post;
    var putCallbacksMap = clazz.routes.put;
    var deleteCallbacksMap = clazz.routes.delete;
    var i;
    logger.debug('Applying hook to log to GET callbacks');
    for (i = 0; i < getCallbacksMap.length; i++) {
        applyHookLog(getCallbacksMap[i].callbacks);
    }
    logger.debug('Applying hook to log to POST callbacks');
    for (i = 0; i < postCallbacksMap.length; i++) {
        applyHookLog(postCallbacksMap[i].callbacks);
    }
    logger.debug('Applying hook to log to PUT callbacks');
    for (i = 0; i < putCallbacksMap.length; i++) {
        applyHookLog(putCallbacksMap[i].callbacks);
    }
    logger.debug('Applying hook to log to DELETE callbacks');
    for (i = 0; i < deleteCallbacksMap.length; i++) {
        applyHookLog(deleteCallbacksMap[i].callbacks);
    }
  applyLogToCommonReturnOutput();
//    applyLogToCommonReturnMessage();
};


/**
 * TODO Review synchronising in the output with the start
 * and end logging messages of the API calls
 * @returns none
 */
/*
function applyLogToCommonReturnMessage() {
    hooker.hook(common,'returnMessage', function() {
        var res = arguments[0].res;
        logger.debug('Returned: ' + util.inspect(arguments[1]),
                    {requestId:res.requestId, forceLogLevel: res.forceLogLevel});
    });
};
*/
