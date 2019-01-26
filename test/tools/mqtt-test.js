"use strict"
//Usage: copy device.json from agent/data directory
var mqtt = require('mqtt');
var config = require("./device.json")
var accountId = config.account_id;
var cid = config.sensor_list[0].cid;
var deviceId = config.device_id;
var on = new Date().now;
var temp = Math.random() * 30;
var password = config.device_token;
var messageObj =  {
    "on": on,
    "accountId": accountId,
    "did": deviceId,
    "data": [
        {
            "componentId": cid,
            "on": on,
            "loc": [ 45.5434085, -122.654422, 124.3 ],
            "value": temp.toString()
        }
    ]
}


var topic = "server/metric/" + accountId +"/" + deviceId;
var message = JSON.stringify(messageObj);
var options = {
    "username": deviceId,
    "password": password,
    "rejectUnauthorized": false
}
var client  = mqtt.connect('mqtts://localhost:8883', options);

client.on('connect', function () {
    console.log("connected to broker!!");
    console.log("Now submitting message ", message);
    client.publish(topic, message, function (err) {
        if (err) {
            console.error("Could not publish");
        }
        var on = new Date().now;
        var temp = Math.random() * 30;
        messageObj.on = on;
        messageObj.data[0].on = on;
        messageObj.data[0].value = temp.toString();
        delete messageObj.deviceToken;
        message = JSON.stringify(messageObj);
        console.log("Now submitting message ", message);
        client.publish(topic, message, function (err) {
            if (err) {
                console.error("Could not publish");
            }
            console.log("Published - now ending session");
            client.end();
        })
    })
})
