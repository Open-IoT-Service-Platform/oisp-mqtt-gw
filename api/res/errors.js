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


module.exports = {

    Errors: {
        Generic: {
            InvalidRequest: {code: 400, status: 400, message: "Invalid request"},
            NotAuthorized: {code: 401, status: 401, message: "Not Authorized"},
            InternalServerError: {code: 500, status: 500, message: "Internal Server Error"},
            Connection:{
                Timeout:{code:1002, status:504, message:"Connection Error"},
                MaxTriesReached:{code:1001, status:504, message:"Connection Error"}
            }
        }
    }
};
