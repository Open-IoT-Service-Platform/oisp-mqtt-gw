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

'use strict';
var errorList = require('../../api/res/errors');


exports.errBuilder = (function() {
    return {
        build: function(errorObject, errors) {
            var error = new Error(errorObject.message, errorObject.code);
            if (errors) {
                error.errors = errors;
            }
            return error;
        },
        Errors: errorList.Errors
    };
})();
