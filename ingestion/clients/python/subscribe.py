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
import ssl

BROKER = process.env.BROKER_IP
PORT = process.env.BROKER_PORT

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, rc):
    if rc == 0:
        print ("Connection success")
        # Subscribing in on_connect() means that if we lose the connection and
        # reconnect then subscriptions will be renewed.
        client.subscribe("topic/data")
    else:
        print ("Connection failed with result code " + str(rc))
        sys.exit(1)

    
# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(msg.topic + ": " + str(msg.payload))

print("Starting..")
client = mqtt.Client()


client.on_connect = on_connect
client.on_message = on_message
#client.tls_set('/app/mosquitto-1.3.5/certs/ca.crt')

#client.tls_set("../../mosquitto-auth/certs/ca.crt", tls_version=ssl.PROTOCOL_TLSv1_2)
#client.username_pw_set('60-03-08-96-05-d8',
#  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiIwOWE4YTc4OS02MDE3LTQ5OGQtOGE5Yi00ODM1ZmVmYjFlZjIiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6IjYwLTAzLTA4LTk2LTA1LWQ4IiwiZXhwIjoiMjAyNC0wNy0zMVQyMDo0MjoxOC43OTRaIn0.G-UYamflST-IYlzuLmE_h7LbtoyrZpMIXPHsi1hU-HNeEI2akpP0vBXa3U0OpEC1KvcqqfmKPS6zBi4Q-98EhQ6zKjAW7aiNTANGnWcaR3_sX7r0JqEwNOZtcNDCNSFm28QVfwzQUWAppORX8waKPb-t1SE3on_NQj0lTB3vaHBZThEzAomP3uvaZz0a8qfYXAUM0h4MQviCU3mS_5ccLxAQzNrCggU9rd6b31uCV3mNd3c69bDWlNugXs8LCjkylR8XIbt0COFmDYi2hh-zCBm5kVghTJ0moTseUlz0hB-fgbwFzSQR4rh525-Uw1HrC0OPlIblnye-pAhOoybYQQ'
#  )
client.tls_set('/app/keys/ca.crt', tls_version=2)
#client.tls_insecure_set(True)
client.username_pw_set('admin', 'password') #this is uncommented before on 13/06/2018

#client.tls_set("../certs/ca.crt", tls_version=ssl.PROTOCOL_TLSv1)

#client.tls_insecure_set(True)

client.connect(BROKER, PORT, 60)
client.on('error', function(err) {
  console.log(err);
});
client.loop_forever()
