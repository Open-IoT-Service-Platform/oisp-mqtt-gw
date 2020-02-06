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

# public key for JWT
oispConf = os.environ["OISP_MQTT_BROKER_CONFIG"]
oispConfDict = json.loads(oispConf)
redisConf = os.environ[oispConfDict["redisConf"][2:]]
redisConfDict = json.loads(redisConf)
JWT_PUB_KEY = oispConfDict["jwtPubKey"]
MQTT_GW_SECRET = oispConfDict["aesKey"]
#redis configuration
REDIS_IP = redisConfDict["hostname"]
REDIS_PORT = redisConfDict["port"]

keycloakConf = os.environ["OISP_KEYCLOAK_CONFIG"]
keycloakConfDict = json.loads(keycloakConf)


#
# consult function topic_acl before making changes here - esp. if related to {accountid}!
#
#       - topics ending with activation and health are allowed even without password
#       - topics with {accountid} require special care! - consult code!
#
ALLOWED_TOPICS = [
   "server/metric/{accountid}/{deviceid}",
   "device/health/{accountid}/{deviceid}",
   "device/control/{accountid}/{deviceid}"
]


#
# those users can login using username/password and can pub/sub to any topic:
#
SUPERUSERS = {}
SUPERUSERS[oispConfDict["mqttBrokerUserName"]] = oispConfDict["mqttBrokerPassword"]
