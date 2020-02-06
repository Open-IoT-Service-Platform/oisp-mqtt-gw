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


if [ "$1" != "skip" ]; then
  echo "============================================================="
  echo " start waitforit => should be done on platform-launcher layer"
  echo " but for the time being executed here as well                "
  echo "============================================================="

  REDIS=$(echo ${OISP_REDIS_CONFIG} | jq '.hostname' | tr -d '"')
  REDISPORT=$(echo ${OISP_REDIS_CONFIG} | jq '.port' | tr -d '"')
  KEYCLOAK=$(echo ${OISP_KEYCLOAK_CONFIG} | jq '.["auth-server-url"]' | tr -d '"')
  KEYCLOAK=${KEYCLOAK/http:\/\//}
  KEYCLOAK=${KEYCLOAK//\/keycloak/}
  echo /app/wait-for-it.sh ${REDIS}:${REDISPORT} -t 300 -- /app/wait-for-it.sh ${KEYCLOAK} -t 300 -- /app/start-broker.sh skip
  /app/wait-for-it.sh ${REDIS}:${REDISPORT} -t 300 -- /app/wait-for-it.sh ${KEYCLOAK} -t 300 -- /app/start-broker.sh skip
  exit 0
fi

echo "============================================"
echo " start MQTT broker with OISP auth module "
echo "============================================"

ROOTPATH=/app
#ROOTPATH=$PWD

cp ${ROOTPATH}/mosquitto/mosquitto.conf ${ROOTPATH}/mosquitto/mosquitto-oisp.conf
PORT=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.mqttBrokerPort' | tr -d '"')
CAFILE=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.cafile' | tr -d '"')
KEYFILE=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.keyfile' | tr -d '"')
CERTFILE=$(echo ${OISP_MQTT_BROKER_CONFIG} | jq   '.certfile' | tr -d '"')
PRODUCTION=false
echo "PORT $PORT CAFILE $CAFILE KEYFILE $KEYFILE CERTFILE $CERTFILE PRODUCTION $PRODUCTION"
echo "auth_plugin ${ROOTPATH}/mosquitto/mosquitto_jwt_auth/jwt_auth_plugin.so" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "auth_opt_path ${ROOTPATH}/mosquitto/mosquitto_jwt_auth/" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "port $PORT" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "cafile $CAFILE" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "keyfile $KEYFILE" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "certfile $CERTFILE" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "tls_version tlsv1.2" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

echo "require_certificate $PRODUCTION" >> ${ROOTPATH}/mosquitto/mosquitto-oisp.conf

${ROOTPATH}/mosquitto/src/mosquitto -c ${ROOTPATH}/mosquitto/mosquitto-oisp.conf
