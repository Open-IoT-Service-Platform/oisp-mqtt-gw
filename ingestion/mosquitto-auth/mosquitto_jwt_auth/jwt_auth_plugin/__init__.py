# Copyright (c) 2017-2020 Intel Corporation
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

'''
   JWT authentication plugin.

   It verifies JWT token with provided deviceid and makes sure that
   only deviceid owned by this token is passed in topics.

   Please note that some exceptions will cause broker to crash.

   required files in this script's directory: pub_jwt_key.pem, config.py
'''

import os
import time
from jwcrypto import jwk,jwt
from Crypto.Cipher import AES
#from jwcrypto.common import json_encode
import sys
import redis
from . import config
import json
import base64
from keycloak import KeycloakOpenID


key_path = config.JWT_PUB_KEY
gwSecretPath = config.MQTT_GW_SECRET

server_url=config.keycloakConfDict["auth-server-url"]
if not server_url.endswith("/"):
    server_url = server_url + "/";
client_id = config.keycloakConfDict["mqtt-broker-id"]
realm_name =  config.keycloakConfDict["realm"]
client_secret_key =  config.keycloakConfDict["mqtt-broker-secret"]

keycloak_openid = KeycloakOpenID(server_url = server_url,
                    client_id = client_id,
                    realm_name = realm_name,
                    client_secret_key = client_secret_key)

certs = keycloak_openid.certs()

print("jwt_auth_plugin.py: key loaded", file=sys.stderr)

print("jwt_auth_plugin.py: Superusers:", [superuser for superuser in config.SUPERUSERS], file=sys.stderr)

#connecting to redis
r = redis.Redis(host= config.REDIS_IP, port= config.REDIS_PORT)

def check_user_pass(deviceid, token):
  '''
     string deviceid, string token
     return 1 on auth success, 0 on auth failure, other value on internal error.
  '''
  try:
    print("jwt_auth_plugin.py: check_user_pass(deviceid =", deviceid, ", token=<deleted>)", file=sys.stderr)
    #
    # first we check if deviceid is special user - SUPERUSER, used by our internal components
    #
    if deviceid in config.SUPERUSERS.keys():
      if token == config.SUPERUSERS[deviceid]:
         print("jwt_auth_plugin.py: super user authenticated: ", deviceid, file=sys.stderr)
         return 1 # success
      else:
         print("jwt_auth_plugin.py: FAILED super user authenticated: ", deviceid, file=sys.stderr)
         return 0 # auth failed

    if deviceid == '' and token == '':
      print("jwt_auth_plugin.py: no deviceid nor token - rejected", file=sys.stderr)
      return 0

    #
    # device+token flow - verify JWT and match device id in username and in token
    #
    try:
        options = {"verify_signature": True, "verify_aud": True, "exp": True}
        dec = keycloak_openid.decode_token(token, key=certs, options=options)
    except:
        print("jwt_auth_plugin.py: Token signature is wrong", file=sys.stderr)
        return 0
    print("jwt_auth_plugin.py: JWT token is valid (deviceid =", deviceid, file=sys.stderr)
    token_device_id = dec['sub']
    tokenType = dec["type"]

    if not tokenType == "device":
        print("jwt_auth_plugin.py: Not a device token! Rejected.", file=sys.stderr)
        return 0

    tokenAccount = dec["accounts"][0]["id"]
    if deviceid != token_device_id:
      print("jwt_auth_plugin.py: Provided deviceid (", deviceid,") is not matching one in token (", token_device_id, ") - will not authenticate!", file=sys.stderr)
      return 0 # auth failed
    else:
      print("jwt_auth_plugin.py: Auth success for DeviceId =", deviceid, "; token_device_id =", token_device_id, file=sys.stderr)
      redisKey = tokenAccount + "." + deviceid
      r.hset(redisKey, "aid", tokenAccount)
      return 1

  except:
    print("jwt_auth_plugin.py: Other exception for device id =", deviceid, sys.exc_info()[0], file=sys.stderr)
    raise # die to track error faster - esp. on not included mongo errors
    return -1 # error!

def checkAccountAndDevice(allowed_topic, parts, aid, did):
    '''
        Checks wether topic fits to allowed_topic containing {accountId} and {deviceId}
    '''
    if not r'{accountid}' in allowed_topic or not r'{deviceid}' in allowed_topic:
        return 0 # no accountid or deviceid match needed
    allowed_parts = allowed_topic.split('/')
    if not (len(parts) == 4 and len(allowed_parts) == 4 and parts[0] == allowed_parts[0] and parts[1] == allowed_parts[1]):
        return 0 # no match
    if parts[2] == aid and parts[3] == did:
        return 1
    else:
        print("jwt_auth_plugin.py: Path does not fit to credentials", file=sys.stderr)
        return 0

def topic_acl(topic, deviceid):
    '''
        string topic, string deviceid
        return 1 on OK to access, 0 to deny, other value on internal error.
    '''
    try:
        print("jwt_auth_plugin.py: topic_acl('", topic, "', '", deviceid, "')", file=sys.stderr)

        #
        # Allow superusers to sub/pub everywhere:
        #
        if deviceid in config.SUPERUSERS.keys():
            print("jwt_auth_plugin.py: ACL allowed - deviceid is one for superuser!", file=sys.stderr)
            return 1 # allow

        #
        # Empty user and health or activation topic - allow
        #
        #
        # Match topic against allowed topics:
        #
        parts = topic.split('/')
        aid = parts[2]
        rediskey = aid + "." + deviceid
        aid_redis = r.hget(rediskey, "aid")
        if aid_redis is None: # account+deviceid not in redis => never authenticated
            print("jwt_auth_plugin.py: device not authenticated for the topic", deviceid, file=sys.stderr)
            return 0 #deny
        for allowed_topic in config.ALLOWED_TOPICS:
            # We need to check whether aid and deviceId fit to jwt credentials:
            if checkAccountAndDevice(allowed_topic, parts, aid_redis.decode(), deviceid) == 1:
                return 1 # allow since match found
        #
        # if we run out of allowed topics - deny access:
        #
        print("jwt_auth_plugin.py: ACL check failed for deviceid", deviceid, "- no match for valid topics", file=sys.stderr)
        return 0 # deny
    except Exception as e:
        print("jwt_auth_plugin.py: Other exception for device id =", deviceid, str(e), sys.exc_info()[0], file=sys.stderr)
        return -1


def selftest():
     print("jwt_auth_plugin.py: Starting selftest execution", file=sys.stderr)

#
# Execute tests if called directly (python __init__.py)
#
if __name__ == "__main__":
   selftest()   #commented only for test case
