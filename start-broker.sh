#!/bin/bash

# Copyright (c) 2019 Intel Corporation
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
echo " start MQTT broker with OISP auth module "
echo "============================================"

cp /app/mosquitto/mosquitto.conf /app/mosquitto/mosquitto-oisp.conf
PORT=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.mqttBrokerPort' | tr -d '"')
CAFILE=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.cafile' | tr -d '"')
KEYFILE=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.keyfile' | tr -d '"')
CERTFILE=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.certfile' | tr -d '"')
PRODUCTION=false
echo "PORT $PORT CAFILE $CAFILE KEYFILE $KEYFILE CERTFILE $CERTFILE PRODUCTION $PRODUCTION"
echo "auth_plugin /app/mosquitto/mosquitto_jwt_auth/jwt_auth_plugin.so" >> /app/mosquitto/mosquitto-oisp.conf

echo "auth_opt_path /app/mosquitto/mosquitto_jwt_auth/" >> /app/mosquitto/mosquitto-oisp.conf

echo "port $PORT" >> /app/mosquitto/mosquitto-oisp.conf

echo "cafile $CAFILE" >> /app/mosquitto/mosquitto-oisp.conf

echo "keyfile $KEYFILE" >> /app/mosquitto/mosquitto-oisp.conf

echo "certfile $CERTFILE" >> /app/mosquitto/mosquitto-oisp.conf

echo "tls_version tlsv1.2" >> /app/mosquitto/mosquitto-oisp.conf

echo "require_certificate $PRODUCTION" >> /app/mosquitto/mosquitto-oisp.conf

/app/mosquitto/src/mosquitto -c /app/mosquitto/mosquitto-oisp.conf
