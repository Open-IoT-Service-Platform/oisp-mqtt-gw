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

const express = require('express');
const Authenticate = require('./authenticate');
const Acl =  require('./acl');
const app = express();

var init = function(conf, log, cb)
{
    var auth = new Authenticate(conf, log);
    auth.initialize();
    var acl = new Acl(conf, log);
    var config = conf;
    app.use(express.json());

    app.get('/auth', (req, res) => {
        auth.authenticate(req, res);
    });

    app.get('/acl', (req, res) => {
        acl.acl(req, res);
    });
    app.get('/v1/api/health', (req, res) => {
        res.sendStatus(200);
    });

    app.listen(config.authService.port, () => {
        console.log(`Auth/ACL Service started and listening on port ${config.authService.port}`);
        cb();
    });
};
module.exports.init = init;
