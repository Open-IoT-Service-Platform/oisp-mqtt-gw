#!/bin/bash

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



echo ""
echo "============================================"
echo " OISP Authorization Gateway "
echo "============================================"

# reset logs directory
if [ -f *.log ]; then
	echo "   clearing logs..."
   rm *.log
fi

export BASE_DIR="${PWD}"
FOREVER=${BASE_DIR}/node_modules/.bin/forever

${FOREVER} -m 1 \
              -a -l "${BASE_DIR}/forever.log" \
              --sourceDir $BASE_DIR \
              --minUptime 1s \
              --spinSleepTime 3s app.js

${FOREVER} list

echo "done"
echo ""
