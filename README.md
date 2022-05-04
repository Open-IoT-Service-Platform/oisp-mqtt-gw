# iotkit-gateway
==============

This repository contains a Bridge between MQTT and Kafka for OISP.
The Bridge also handles the auth, acl and load-balancing for MQTT and MQTT with SparkplugB

## To enable SparkplugB Data Ingestion capability at GW

 To enable sparkplugB functionality, add config related to sparkplugB in the config.js 

 1. Add below section in the config section on file config.js 

 SparkplugB config which must be set when handling SparplugB standard message

 - @enabled: true -> it enables the spB message handlers and parsing functionality at GW
 - @spBKafkaProduce: true -> will enable producing kafka message on topic "SparkplugB" with spB format data 
 - @subscribe -> Subscribed to all the topic with "spBv1.0" at start 



``` bash
     "sparkplug": {
        "enabled": true,
        "spBKafkaProduce": true, 
        "spBkafkaTopic": "sparkplugB",
        "topics": {
            "subscribe": {
                "sparkplugb_data_ingestion": "spBv1.0/+/+/+/+"
            },
            "publish": {
            "error": "server/error/{accountId}/{deviceId}"
             }
        }
    },
```
  
  2. SpB-mqttgw uses different name of kafka client to get distinguished (ClientId: spBFrontend-metrics) 
  3. CID is used as alias, as sparkplugB standard suggest unique id as alias in data metric element.
   Data message looks like below:
``` bash
    var cid = "0c574252-31d5-4b76-bce6-53f2c56b544d";
    var DataMessage = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "float",
                value: 123
            }],
            seq: 1
         };
    ```