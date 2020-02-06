#!/bin/bash -x
# Copyright (c) 2017 Intel Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


rm -f jwt_auth_plugin.so
set -e
gcc \
     -Wall -Werror -std=c99 -ggdb -fPIC \
     -shared jwt_auth_plugin.c \
     -o jwt_auth_plugin.so \
     `python3-config --cflags --ldflags`

set +e
set +x

echo ''
echo ''
echo ''
echo "REMEMBER TO ADD THE FOLLOWING TO THE mosquitto.conf:"
echo "auth_plugin   /full/path/to/mosquitto_jwt_auth/jwt_auth_plugin.so     // .so file"
echo "auth_opt_path /full/path/to/mosquitto_jwt_auth/                       // dir with README.txt"
echo ''
echo ''
echo ''
