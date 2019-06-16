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
import config
import json
import base64

key_path = config.JWT_PUB_KEY
gwSecretPath = config.MQTT_GW_SECRET

print >> sys.stderr, "jwt_auth_plugin.py: trying to load public RSA key from: ", key_path
if os.path.exists(key_path):
    with open(key_path, 'rb') as f:
        try:
            pubKey = jwk.JWK.from_pem(f.read())
        except:
            print >> sys.stderr, "jwt_auth_plugin.py: Cannot read ", key_path
            sys.exit(1);
else:
    print >> sys.stderr, "jwt_auth_plugin.py: Cannot find ", key_path
    sys.exit(1)

if os.path.exists(gwSecretPath):
    with open(gwSecretPath, 'rb') as f:
        try:
            bgwSecret = f.read()
        except:
            print >> sys.stderr, "jwt_auth_plugin.py: Cannot read ", gwSecretPath
            sys.exit(1);
else:
    print >> sys.stderr, "jwt_auth_plugin.py: Cannot find ", gwSecretPath
    sys.exit(1)

gwSecret = base64.b64decode(bgwSecret.strip())
print >> sys.stderr, "jwt_auth_plugin.py: key loaded";

print >> sys.stderr, "jwt_auth_plugin.py: Superusers:", [superuser for superuser in config.SUPERUSERS]

#connecting to redis
r = redis.Redis(host= config.REDIS_IP, port= config.REDIS_PORT)

def check_user_pass(deviceid, token):
  '''
     string deviceid, string token
     return 1 on auth success, 0 on auth failure, other value on internal error.
  '''
  try:
    print >> sys.stderr, "jwt_auth_plugin.py: check_user_pass(deviceid =", deviceid, ", token=<deleted>)"
    #
    # first we check if deviceid is special user - SUPERUSER, used by our internal components
    #
    if deviceid in config.SUPERUSERS.keys():
      if token == config.SUPERUSERS[deviceid]:
         print >> sys.stderr, "jwt_auth_plugin.py: super user authenticated: ", deviceid
         return 1 # success
      else:
         print >> sys.stderr, "jwt_auth_plugin.py: FAILED super user authenticated: ", deviceid
         return 0 # auth failed

    if deviceid == '' and token == '':
      print >> sys.stderr, "jwt_auth_plugin.py: no deviceid nor token - rejected"
      return 0

    #
    # device+token flow - verify JWT and match device id in username and in token
    #
    try:
        decoded = jwt.JWT(key = pubKey, jwt = token).claims
        dec = json.loads(decoded)
    except:
        print >> sys.stderr, "jwt_auth_plugin.py: Token signature is wrong"
        return 0;
    print >> sys.stderr, "jwt_auth_plugin.py: JWT token is valid (deviceid =", deviceid
    token_device_id = dec['sub']
    tokenType = dec["type"]
    tokenExp = dec["exp"]

    #encrypt
    cipher = AES.new(gwSecret, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(token)
    redisToken = dict();
    redisToken["ciphertext"] = base64.b64encode(ciphertext);
    redisToken["tag"] = base64.b64encode(tag);
    redisToken["iv"] = base64.b64encode(cipher.nonce);

    if tokenExp < time.time() * 1000:
        print >> sys.stderr, "jwt_auth_plugin.py: Token expired"
        return 0

    if not tokenType == "device":
        print >> sys.stderr, "jwt_auth_plugin.py: Not a device token! Rejected."
        return 0

    tokenAccount = dec["accounts"][0]["id"]
    if deviceid != token_device_id:
      print >> sys.stderr, "jwt_auth_plugin.py: Provided deviceid (", deviceid,") is not matching one in token (", token_device_id, ") - will not authenticate!"
      return 0 # auth failed
    else:
      print >> sys.stderr, "jwt_auth_plugin.py: Auth success for DeviceId =", deviceid, "; token_device_id =", token_device_id
      redisKey = tokenAccount + "." + deviceid
      r.hset(redisKey, "aid", tokenAccount)
      r.hset(redisKey, "ciphertext", redisToken["ciphertext"])
      r.hset(redisKey, "tag", redisToken["tag"])
      r.hset(redisKey, "iv", redisToken["iv"])
      return 1
    #
  except:
    print >> sys.stderr, "jwt_auth_plugin.py: Other exception for device id =", deviceid, sys.exc_info()[0]
    raise # die to track error faster - esp. on not included mongo errors
    return -1 # error!

def topic_acl(topic, deviceid):
  '''
     string topic, string deviceid
     return 1 on OK to access, 0 to deny, other value on internal error.
  '''
  try:
     print >> sys.stderr, "jwt_auth_plugin.py: topic_acl('", topic, "', '", deviceid, "')"

     #
     # Allow superusers to sub/pub everywhere:
     #
     if deviceid in config.SUPERUSERS.keys():
       print >> sys.stderr, "jwt_auth_plugin.py: ACL allowed - deviceid is one for superuser!"
       return 1 # allow

     parts = topic.split('/');
     #aid = r.hget(deviceid, "aid")
     aid = parts[2];
     rediskey = aid + "." + deviceid
     if not aid == r.hget(rediskey, "aid"):
      print >> sys.stderr, "jwt_auth_plugin.py: device not authenticated", deviceid
      return 0 #deny
     #
     # Empty user and health or activation topic - allow
     #
     #
     # Match topic against allowed topics:
     #
     for allowed_topic in config.ALLOWED_TOPICS:
         # special case for topic with accountid inside:
         if allowed_topic.startswith("server/metric/{accountid}/{deviceid}"):
            if not topic.startswith("server/metric/"):
              continue;
            parts = topic.split('/')
            if len(parts) == 4 and parts[0] == "server"  and parts[1] == "metric" and parts[2] == aid and parts[3] == deviceid:
               return 1 # allow
            else:
                print >> sys.stderr, "jwt_auth_plugin.py: Path does not fit to credentials"
                return 0 # deny
         elif "{accountid}" in allowed_topic:
            print >> sys.stderr, "jwt_auth_plugin.py: WARNING: another topic with accountID in it. This is unexpected - fix your configuration: ", allowed_topic
         else: # any other topic (no accountid assumed)
            expected = allowed_topic.replace("{deviceid}", deviceid)
            print >> sys.stderr,"this is the expected and topic", expected, topic
            if topic == expected:
               return 1 # allow

     #
     # if we run out of allowed topics - deny access:
     #
     print >> sys.stderr, "jwt_auth_plugin.py: ACL check failed for deviceid", deviceid, "- run out of valid topics"
     return 0 # deny
  except:
     print >> sys.stderr, "jwt_auth_plugin.py: Other exception for device id =", deviceid, sys.exc_info()[0]
     return -1


def selftest():
     print >> sys.stderr, "jwt_auth_plugin.py: Starting selftest execution"

     #
     # prepare test data
     #
     config.SUPERUSERS["admin"] = "password"

     #
     # authentication tests:
     #

     # Super user:
     assert check_user_pass("admin", "password") == 1
     assert check_user_pass("admin", "PASSWORD") == 0

     # empty:
     assert check_user_pass("", "") == 0


     # Valid token:
     validToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiIwYjBjYzE2My0wYjdjLTQzZTEtYjI2Yy1hYTFmM2M5YzBlNjQiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImRldmljZUlEIiwiZXhwIjoxODYyNzY2NzM1NzM1LCJhY2NvdW50cyI6W3siaWQiOiJhNGFlMDhiMS1iYzRiLTQxNWEtOWU0YS1mMjhmMWFiNTA2NzUiLCJyb2xlIjoiZGV2aWNlIn1dLCJ0eXBlIjoiZGV2aWNlIn0.ojwrYt1X1sTmFNEz1YSfQrFXyz6Vh4kTX-M_aRtRvCU2aPEIFcMeVAkBXMxWWVAVcmthLwUByVZgZQLUg3FUfvQrWb-302YsMfPGF4iYYEjtJl_1bhozVIqd6wYGk_pCaz-4LZ1vGCh3AJcdERFQlGHNMfbMTedCPm3pIuQ1vsIDTdcAve47_W6gd9D54_AE_DFHATJZ8llBmezyyrNBkH6b075s_SCNmXj-_raghTUzbE9jE9RVW5KrEA5dxCEoRQI0dOmjHSN5cJx1TIaM3IIIPUr-HtviICRTQvFbmUmprMebIURiAOLri3M-tMK669rXA8ltuK-H3oz92kshuw"
     invalidToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJjN2M3ZjU2NC02NTQ1LTQxNmItOWIxNC0wNzcwNzM2NTBhOTQiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImZha2VEZXZpZGVJZCIsImV4cCI6MTg2MjkxMzI1OTY3MCwiYWNjb3VudHMiOlt7ImlkIjoiYTRhZTA4YjEtYmM0Yi00MTVhLTllNGEtZjI4ZjFhYjUwNjc1Iiwicm9sZSI6ImRldmljZSJ9XSwidHlwZSI6ImRldmljZSJ9.DIBFmY6IwN7Cc1llMJuVHrXYyw6X5DNoBtwVCv5dLqoN8iipFarRMx1J4QGg30l2Ba_c3yqFciPHmVflswTtga9TICvPRwCvatno1t62Gzpz56gZFp1TbNCrYuzoyK6Xpym7YLBLxhbJ2BvCJHOe0u9xvAx_I26JdLcqm0f51GyvwgX9z0D2eSVRf8y_QsCfZ11WR9P8HP8_m5IOHzahe3OP8PMpd4fW3rpBfUwNIMIByzBx4stfEnuRALuCBTODMwxOPi-f8grgiOmB_gjV_BI3vPkeYd4VLKqzEDHhNRSJhggPWgmHtX6rQRAnxHUzIK51oNmqEuGKb1XhzCYAJQ"
     otherAidToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJiNTc2ZTU3NS0zMzRlLTQwNGYtYjZhYy1mNmJiYmIzY2YxNjAiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImRldmlkZUlkMiIsImV4cCI6MTg2MjkxMzk0ODU3MywiYWNjb3VudHMiOlt7ImlkIjoiYmUwOGNkYzAtODcyNi00NDZhLWE1NmQtZDU3MmVjNzM2M2ZiIiwicm9sZSI6ImRldmljZSJ9XSwidHlwZSI6ImRldmljZSJ9.nG_6zD6bhJ6XG-eJB5H90Bw1w50yTybRpDxykU4DePagjFRwIfQ-5MFNr8adFUwVEpVhE-xQXY4YLKEo2wwOiqt3io1Y4n55s9YAgjCJEg1x4zcbbxHtLKYKpX05EZ-7XESTK2fl7Y66jHv3XTJfwGRiM4SGAdFNZ3ZwcV3BG9LU-3bDUCvmcUGfNKK9jO3E660_X4fS7k6vd3_poUpScfMCZ-7NuIFJTJ2ihmPeWF8fDAnMcVW1Ou8IFsLJukLB78XnN8T_dp2thuvWA_tEpaBwI8rpdoK2yuJYUetiszQ6wnU2zMFWTmwn5hIu3N5Fyc_Q5B3tYfRU5KFa6pt9qQ"
     expiredDeviceToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI2OGMwZjMxZC1iY2YzLTRiZTAtYWQ2OC1lYThkOWQ3NzlmOGQiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImV4cGlyZWREZXZpY2VJRCIsImV4cCI6MTU0NzU2MzA1MjQ1MCwiYWNjb3VudHMiOlt7ImlkIjoiYTRhZTA4YjEtYmM0Yi00MTVhLTllNGEtZjI4ZjFhYjUwNjc1Iiwicm9sZSI6ImRldmljZSJ9XSwidHlwZSI6ImRldmljZSJ9.ii-vO56vkTxuxKD-44awqa6pqdIQPBaiSx6lDPZH1F7HRnmWCl5A0pfvfDcwAz4ULqAlOZ9bE_q_5ckomH3t7Im3cGZhCGgl5Aw21x5I8D_QIKQot7XMsUDk3n8ni0_wF_39QpOa63lpluvM1izvs6eSHN0fiHuMO4SkYhVnnucPTq54TE8MnluCuaiEBwAiRvo_ZDheizIezisx7gfjoLr3lfFudByEqmie8A44_z6EqTKyE6zlrUJwKV22w_lCuWdShlOgXqOg_Z8-iJm4L48ydiWA6WnFuEDTwXsZRv_X8EsRV4mt8sE4UT8z-GNUjrr875tdaZcWDgqPvLFVPQ"
     wrongSignedDeviceToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiIyYTA4OTA0Yi0yYTQ1LTRlODEtOWYxMC03ODJlY2EzZGRkOTgiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6Indyb25nU2lnbmVkRGV2aWNlSUQiLCJleHAiOjE4NjI5NTIyNDkwODYsImFjY291bnRzIjpbeyJpZCI6ImM0OGU0Yjk1LTc0ZGItNDZhYy1hNjA0LTZkMzcyZDRhMjVjYiIsInJvbGUiOiJkZXZpY2UifV0sInR5cGUiOiJkZXZpY2UifQ.VGHZwAON16K6Nvwc_dgZkwrcc5qza0gHpv3dsMc8fOBp2bEyGxOIt9O9a8KArQpm-Nc9ElMjCqheGuTbeM98oAeLdsynAySy-TmQH4RKn-1XRAHovv35CYdRrbkAH1u1pn4_0ScfY4S1d2_VFuCet_k11E93Bv6SfyX4DwtHHajmBDTy0mCW98M82q0eX3pwgHLsgUOusgV4hQuw7AYXUAkfgKElwfV4UbORiAhtxZidyuMSvrBgbUlIiIFyVokqE7NChOWYAxwNRRd1eNtISqrjrahFhmPykDS77CiEa8YeWaaV9FTqTtOcE5qikn3hPEZdJc6mCEfZmBWGjzw0KA"
     userToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI1ZWJiNjcxYy03ZmU2LTRjN2EtOTM0ZC0xM2Y1NGU3YmJlNWUiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImU3MDJmYWM5LTQzNTQtNGY5My04YTQyLTM2YTAxN2I1YzllZSIsImV4cCI6MTU0NzY0NDg0MTQ0OCwiYWNjb3VudHMiOnt9LCJ0eXBlIjoidXNlciJ9.hthCx_BweuPEW7YSTIiZJOb0UqXQWp37TafUbrJqOD17bHBQT-He5Vtk8icI3JqdVxHRzF_CHPCPMY1PxXzymoH00tYLeYmvfjZNa4vuD1I9ijHWT_qlGo7frK6ksm4KdmhI5TbN2Sf_Fc1CHaEqhyqJTa1yw4Pw2hj-Lu0rBW5w5xzO_a_16mYy58vf_L6NId1mKz_in-IFnXUdTM2A46c4rjt0ADjiAul-PMTXvfLbmDtf8QfBKKPdmwRCP8Qk3sy5NTCfCuqb54ZdOn1FxO2mAptMxgoD8OYNmy35BFcbdgoOPFOEJgADs0m9iRpY-c6JGZpQvF_cY3V1Xtv94A"
     aid = "a4ae08b1-bc4b-415a-9e4a-f28f1ab50675"
     otherAid = "be08cdc0-8726-446a-a56d-d572ec7363fb"
     deviceId = "deviceID"
     fakeDeviceId = "fakeDeviceId"
     expiredDeviceId = "expiredDeviceID"
     otherDeviceId = "devideId2"
     wrongSignedDeviceId = "wrongSignedDeviceID"
     testUser = "testUser"
     assert check_user_pass(deviceId, validToken) == 1
     redisToken = r.hgetall(deviceId)
     decipher = AES.new(gwSecret, AES.MODE_GCM,
             nonce=base64.b64decode(redisToken["iv"]))
     decodedToken = decipher.decrypt_and_verify(
        base64.b64decode(redisToken['ciphertext']),
        base64.b64decode(redisToken['tag']))
     assert decodedToken == validToken

     assert check_user_pass(deviceId, wrongSignedDeviceId) == 0

     # Incorrect token signature:
     assert check_user_pass(deviceId, invalidToken) == 0
     assert check_user_pass(testUser, userToken) == 0
     #print >> sys.stderr, "assert incorrect token signature"
     # Device id not matching one in the token:
     assert check_user_pass(fakeDeviceId, validToken) == 0
     assert check_user_pass(expiredDeviceId, expiredDeviceToken) == 0

     #
     # ACL tests:
     #


     # special tests for topic with account id: server/metric/{accountid}/{deviceid}
     assert topic_acl("server/metric/" + aid + "/" + deviceId, deviceId) == 1
     assert topic_acl("server/metric/" + aid + "/" + fakeDeviceId, deviceId) == 0
     assert topic_acl("server/metric/" + aid + "/" + deviceId, fakeDeviceId) == 0
     assert topic_acl("server/metric/" + aid + "/" + deviceId, fakeDeviceId) == 0
     assert topic_acl("server/metric/" + otherAid + "/" + deviceId, deviceId) == 0
     #assert topic_acl("server/metric/ACCOUNTID/demoacc-power01/", "demoacc-power01") == 0
     #assert topic_acl("server/metric/ACCOUNTID/demoacc-OTHER", "demoacc-power01") == 0
     #assert topic_acl("server/metric/ACCOUNTID/demoacc-OTHER/", "demoacc-power01") == 0
     # non existing topic:
     #assert topic_acl("server/ACCOUNTID/demoacc-power01", "demoacc-power01") == 0
     # no username:
     #assert topic_acl("device/demoacc-power01/health", "") == 1
     #assert topic_acl("device/demoacc-power01/", "") == 0

     # Success!
     print >> sys.stderr, "\n\n===========================================\n"
     print >> sys.stderr,     "|  Testing complete! Working as expected. |"
     print >> sys.stderr, "\n\n===========================================\n"
#
# Execute tests if called directly (python __init__.py)
#
if __name__ == "__main__":
   selftest()   #commented only for test case
