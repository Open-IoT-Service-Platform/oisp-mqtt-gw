#
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



#----------------------------------------------------------------------------------------------------------------------
# targets
#----------------------------------------------------------------------------------------------------------------------

SHELL:=/bin/bash

build:
	@$(call msg,"Starting Iot Gateway ...");
	@if [ -f data/keys/private.pem ]; then echo "RSA keys existing already"; else \
		mkdir -p data/keys; \
		openssl genpkey -algorithm RSA -out data/keys/private.pem -pkeyopt rsa_keygen_bits:2048; chmod +x data/keys/private.pem; \
		openssl rsa -pubout -in data/keys/private.pem -out data/keys/public.pem; \
	fi;
	@if [ -f data/keys/server.key ]; then echo "SSL key existing already. Skipping creating self signed cert."; else \
		echo "Creating self signed SSL certificate."; \
		openssl req -new -x509 -days 1826 -key data/keys/private.pem -out data/keys/ca.crt -subj "/C=UK/ST=NRW/L=London/O=My/OU=DO/CN=broker/emailAddress=donotreply@www.streammyiot.com"; \
		chmod +x data/keys/ca.crt; \
		openssl req  -nodes -new -keyout data/keys/server.key -out data/keys/server.csr -subj "/C=UK/ST=NRW/L=London/O=My Inc/OU=DevOps/CN=broker/emailAddress=donotreply@www.streammyiot.com"; \
		openssl x509 -req -in data/keys/server.csr -CA data/keys/ca.crt -CAkey data/keys/private.pem -CAcreateserial -out data/keys/server.crt -days 360; \
	fi;
	@if [ -f data/keys/mqtt/mqtt_gw_secret.key ]; then echo "MQTT/GW key existing already. Skipping creating new key"; else \
		echo "Creating MQTT/GW secret."; \
		mkdir -p data/keys/mqtt; \
		openssl rand -base64  16 > data/keys/mqtt/mqtt_gw_secret.key; \
	fi;

	@touch $@
	@chmod +x docker.sh

	@./docker.sh create

start: build
	@./docker.sh up

stop:
	@$(call msg,"Stopping IoT gateway ...");
	@./docker.sh stop

clean :
	docker stop iotkitgateway_gateway_1
	docker stop iotkitgateway_broker_1
	docker-compose stop
	docker-compose rm -f
	docker rmi -f iotkitgateway_gateway
	docker rmi -f iotkitgateway_broker
#----------------------------------------------------------------------------------------------------------------------
# helper functions
#----------------------------------------------------------------------------------------------------------------------

define msg
	tput setaf 2 && \
	for i in $(shell seq 1 120 ); do echo -n "-"; done; echo "" && \
	echo -e "\t"$1 && \
	for i in $(shell seq 1 120 ); do echo -n "-"; done; echo "" && \
	tput sgr0
endef
