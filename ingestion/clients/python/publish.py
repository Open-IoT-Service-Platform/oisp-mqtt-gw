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


#!/usr/bin/python

import sys
import time
import paho.mqtt.client as mqtt

BROKER = process.env.BROKER_IP
PORT = process.env.BROKER_PORT

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, rc):
    if rc == 0:
        print ("Connection success")
        send()
    else:
        print ("Connection failed with result code " + str(rc))
        sys.exit(1)


# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(msg.topic + ": " + str(msg.payload))

def send():
    while True:
        msg = "Message " + time.ctime()
        #client.publish("server/data/60-03-08-96-05-d8", "%.2f" % i)
        client.publish("topic/data", msg)
        print msg
        time.sleep(1)

print("Starting..")
client = mqtt.Client()

client.on_connect = on_connect
client.on_message = on_message

#client.tls_set("../../mosquitto-auth/certs/ca.crt", tls_version=ssl.PROTOCOL_TLSv1_2)
#client.username_pw_set('53bb53ee4d525a4013e0dd42',
#  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiIxMjAwMjkwYi1kM2U2LTQxNTMtOTJjYS04NjkwOWY1ZDZhMDEiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6IjUzYmI1M2VlNGQ1MjVhNDAxM2UwZGQ0MiIsImV4cCI6IjIwMjQtMDctMjVUMjM6NTY6NDcuMDQyWiJ9.vm92TxdBX37y47fNh37HbCRZLPhW7kuFK6QirwgxE0FbPj4f4iQlKuamoqm79Gpd15tEXIcm7c653CZpSXjPe2GnoI9HLvbE8YyRn7_3n2lmKU0eXWJVfKbgD11YTkf7dFHEMSHMtbUktlWeuIIxERpoVsvqmnlUfFsMou0pi68owOY3ymTbKMutlI806yicP-so0EtUDb3IHiWs-9UhoMMdZak3UNDXgRcXPkg5Y1AAPqek4TS5iwIR5Pd44hPyWBqtofpQQyO0mB_PdEKt-o4ilb90EOX44wEHqGtEUv5rZ7zdEl-KxTip3Dx5ji58-IaC5BJUbxznvxyU_7kJhg'
#  )
client.tls_set('/app/keys/ca.crt', tls_version=2)
#client.tls_insecure_set(True)
client.username_pw_set('admin', 'password') #this is uncommented before on 13/06/2018
client.connect(BROKER, PORT, 60)
client.on('error', function(err) {
  console.log(err);
});
#real work happens in on_conect after connection completes
client.loop_forever()