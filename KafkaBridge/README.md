# Kafka Bridges

## Kairosdb

This bridge maps data from NGSI-LD Attributes topic to KairosDB API.
NGSI-LD topics looks as follows:

```
{
    "id": "urn\iri",
    "entityId": "urn",
    "name": "iri",
    "type": "https://uri.etsi.org/ngsi-ld/Property" or https://uri.etsi.org/ngsi-ld/Relationship",
    "https://uri.etsi.org/ngsi-ld/hasValue" or https://uri.etsi.org/ngsi-ld/hasObject": "value or object",
    "nodeType": "@id" or "@value",
    "index": i
}
```

KairosDB metrics are submitted to `POST http://[host]:[port]/api/v1/datapoints`:

```
[{
"name": "default\urn\iri",
"timestamp": ts,
"value": 321,
"tags": {
    "type":  "https://uri.etsi.org/ngsi-ld/Property" or "https://uri.etsi.org/ngsi-ld/Relationship"
}
}]
```