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

import socket
import os
import json

#
# This mosquitto public ip address (may be internal) and port.
#
#THIS_MACHINE_IP = str([ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith("127.")][0])
#THIS_MACHINE_BROKER_PORT = "27018"
#THIS_MACHINE_BROKER_PORT = ""
#
#                 "host1[:port1][,host2[:port2],...[,hostN[:portN]]"
#
# print(os.environ["MONGO_IP"])
# MONGO_INSTANCES = os.environ["MONGO_IP"]

#
# Number of mongo db record saving attempts before giving up
#
AUTORECONNECT_ATTEMPTS = 5
#
# confirm write operation to how many mongo nodes before confirmation?
#
#MONGO_W = 3 # "majority" # possible values: uint, "majority"

#
# Time to wait for data replication on mongo cluster
#

# public key for JWT
JWT_PUB_KEY = os.environ["JWT_PUB_KEY"]
MQTT_GW_SECRET = os.environ["MQTT_GW_SECRET"]
#redis configuration
REDIS_IP = os.environ["REDIS_IP"]
REDIS_PORT = os.environ["REDIS_PORT"]


#
# consult function topic_acl before making changes here - esp. if related to {accountid}!
#
#       - topics ending with activation and health are allowed even without password
#       - topics with {accountid} require special care! - consult code!
#
ALLOWED_TOPICS = [
   "server/metric/{accountid}/{deviceid}",
   "device/{deviceid}/health",
   "device/{deviceid}/control"
]


#
# those users can login using username/password and can pub/sub to any topic:
#
SUPERUSERS = {}
SUPERUSERS[os.environ["BROKER_USERNAME"]] = os.environ["BROKER_PASSWORD"];
