# iotkit-gateway
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FOpen-IoT-Service-Platform%2Foisp-mqtt-gw.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FOpen-IoT-Service-Platform%2Foisp-mqtt-gw?ref=badge_shield)

==============

This repository contains a Bridge between MQTT and Kafka for OISP.
The Bridge also handles the auth, acl and load-balancing for MQTT and MQTT with SparkplugB

## 1. To enable SparkplugB Data Ingestion capability only at GW

 To enable sparkplugB functionality, add config related to sparkplugB in the config.js 

 1. Add below section in the config section on file config.js 

 SparkplugB config which must be set when handling SparplugB standard message

 - @spBKafkaProduce: true -> will enable producing kafka message on topic "SparkplugB" with spB format data 
   @ngsildKafkaProduce: true -> will enable producing kafka message on topic "ngsildSpB" with ngsild format data 
 - @subscribe -> Subscribed to all the topic with "spBv1.0" at start 



``` bash
     "sparkplug": {
        "spBKafkaProduce": true, 
        "spBkafkaTopic": "sparkplugB",
        "ngsildKafkaProduce": false,
        "ngsildKafkaTopic": "ngsildSpB"
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

### 1. To enable NGSI-LD Data Ingestion capability over SpB  at GW

1. To enable NGSI-LD format data sharing, set flag of sparkplugB and NGSI-ld true as shown below 

@ngsildKafkaProduce: true -> will enable producing kafka message on topic "ngsildSpB" with ngsild format data for 
    metric whose names are like :
        name: "Relationship/xxxx" or "Property/xxxx"

``` bash
     "sparkplug": {
        "spBKafkaProduce": true, 
        "spBkafkaTopic": "sparkplugB",
        "ngsildKafkaProduce": true, 
        "ngsildKafkaTopic": "ngsildSpB"
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

- Config Table for Different flag setting  when SparkplugB is enable "enabled": true;

| spBKafkaProduce     | ngsildKafkaProduce      | KafkaTopic     |
| ------------- | ------------- | -------- |
| true          | true        | SpB NGSI-LD format metric on "ngsildSpB" topic; Rest on "sparkplugB"  |
| true          | false        | All message on "sparkplugB"  |
| false          | true        | SpB NGSI-LD format metric on "ngsildSpB" topic; Rest ignored  |
| false         | false        | All message on "metric"  |


2. NGSI-LD message format converted from received SpB message format

 - For conversion of Relationship NGSI-LD Data

Eg. of SpB message payload containing NGSI-LD format Relationship Data:

``` bash
{
    "timestamp":1655974018778,"
    "metrics":
	    [{
	    "name":"Relationship/https://industry-fusion.com/types/v0.9/hasFilter",
	    "alias":"fbb3b7cd-a5ff-491b-ad61-d43edf513b7a",
	    "timestamp":1655974018777,
	    "dataType":"string",
	    "value":"urn:filter:1"}],
    "seq":2
},
```

Eg. of SpB Converted into NGSI-LD Relationship data format: 

``` bash
{
  “id”: “urn:plasmacutter:1\\https://industry-fusion.com/types/v0.9/hasFilter”,
  “entityId”: “urn:plasmacutter:1”,
  “name”: “https://industry-fusion.com/types/v0.9/hasFilter”,
  “type”: “https://uri.etsi.org/ngsi-ld/Relationship”,
  “https://uri.etsi.org/ngsi-ld/hasObject”: “urn:filter:1”,
  “nodeType”: “@id”,
  “index”: 0
}
```
-  For conversion of Property NGSI-LD Data with nodeType @value(Means literals)


``` bash
{
    "timestamp":1655974018778,"
    "metrics":
	    [{
	    "name":"Property/https://industry-fusion.com/types/v0.9/state",
	    "alias":"fbb3b7cd-a5ff-491b-ad61-d43edf513b7a",
	    "timestamp":1655974018777,
	    "dataType":"string",
	    "value":"https://industry-fusion.com/types/v0.9/state_OFF"}],
    "seq":2
},
```

Eg. of SpB Converted into NGSI-LD Property data format:

``` bash
{
  “id”: “urn:plasmacutter:1\\https://industry-fusion.com/types/v0.9/state”,
  “entityId”: “urn:plasmacutter:1”,
  “name”: “https://industry-fusion.com/types/v0.9/state”,
  “type”: “https://uri.etsi.org/ngsi-ld/Property”,
  “https://uri.etsi.org/ngsi-ld/hasValue”: “https://industry-fusion.com/types/v0.9/state_OFF”,
  “nodeType”: “@value”,
  “index”: 0
}
```

-  For conversion of Property NGSI-LD Data with nodeType @id (Means IRI type)

SpB message payload containing NGSI-LD format of Property with IRI type i.e @id Will be Template. It will be added in next release of it. Eg. of template Spb data can be as below:

``` bash
timestamp: 12345,
	metrics: [{
                name : "propertyInstanceIRI",
                type : template,
                timestamp : 12345,
                value: {
		   “templateRef” : “propertyTemplate”
		   “isdefination”:  false,
		   “metrics”: [
		    {   “name”: "https://industry-fusion.com/types/v0.9/state",
                “dataType” : “string”-> always string
                “ valueType” : “@id”,
                “value”:  "https://industry-fusion.com/types/v0.9/state_OFF",
                "index": 0
            }]
		 }
	  }],
            seq: 1
```


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FOpen-IoT-Service-Platform%2Foisp-mqtt-gw.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FOpen-IoT-Service-Platform%2Foisp-mqtt-gw?ref=badge_large)
