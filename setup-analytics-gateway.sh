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
echo " OISP Authorization Gateway - Setup"
echo "============================================"

# clanton has no sudo
if [[ `which sudo` = "" ]];
then
	SUDO=""
else
	SUDO="sudo"
fi

# inject the file which starts the agent into the init process at run level 5
echo "copying startup script"
if [[ -d /etc/rc5.d/ ]]
then
	${SUDO} cp -f ./S85start-analytics-gateway.sh /etc/rc5.d/
else
	echo "no /etc/rc5.d directory - startup script not copied"
fi

# npm install
# npm install forever
# # installing local packages
# npm install --production

echo "done"
echo ""
