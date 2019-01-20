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



DEVID=demoacc-power01
#TOPIC=server/metric/accountid-34343-454/$DEVID
TOPIC=server/devices/$DEVID/health


mosquitto_sub -h process.env.BROKER_IP -p process.env.BROKER_PORT -d -q 2 \
   -t $TOPIC \
   -u $DEVID \
   -P "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJiNGI2NDZlYS04MTQ0LTQ5ZGItOWY4Yi01MTYyZjFiOTk4MmUiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImRlbW9hY2MtcG93ZXIwMSIsImV4cCI6IjIwMjQtMTAtMTBUMDc6NTI6MzYuNTY1WiJ9.UMOej6BA8kBTxM2Ec2YGL7xdScRHFPP-zkw4rCO11HKjvk_H35VA8ReDI5yklHz2m91WerMLU8xonmse_tN61XfN1AumAgkdaImf8xvBr1ZqrNSt_NinFVIZcjhuRAH2Y_9Pra293d1Fg3KwgToaGJp11SwHjwzLSi5rvMXfuifBrWEGBIk0x_GBxnQvfQRRa0MtfgaZv7kPIAgkV6jNSm92n5vkXnYEiNWARqQ-6N05nhWBUDhFdJAdINA4fMBAsFd9sthtYjIyPXTSKFO93WDOUQHor8CkQaA3qvuXZleNIHpPrQYMCC3zk04FU5AdUQon5XMfMtAdAHSeVAC4MQ"
    
   