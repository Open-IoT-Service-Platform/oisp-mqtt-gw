"use strict"
var mqtt = require('mqtt');
var accountId = "a4ae08b1-bc4b-415a-9e4a-f28f1ab50675";
var cid = "b9ff1bfd-48a7-40a0-8771-0f2cc1e4becd";
var deviceId = "testDeviceID";
var on = new Date().now;
var temp = Math.random() * 30;
var password = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI5NDYxM2Q0Ni1iMmU5LTRiNTMtOTI5Yy02YTA1YzQxMGY4YmMiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6InRlc3REZXZpY2VJRCIsImV4cCI6MTg2Mjk0Mzg1MzE0MiwiYWNjb3VudHMiOlt7ImlkIjoiYTRhZTA4YjEtYmM0Yi00MTVhLTllNGEtZjI4ZjFhYjUwNjc1Iiwicm9sZSI6ImRldmljZSJ9XSwidHlwZSI6ImRldmljZSJ9.pnvejiZjb2SOxAlDYYvwKp3F9raaU4CBzYRxhEj69CK0iVpr5q3XXiET2od2hQeXkkZ5Z64m-0ddFCGKJXD5fJ1ZVRpni-xnWZd70Yujsf61otsysvHsVmw2bKq0NiyLxboodqnu5l_eS5jsz7MrDY40a4Mf5DdutRqFwvXWy_JbhwRN3PpVWui5GT7OD3dXM4-Bm4MQPPP7lYfmF5RYlU5FdREK2oGLq7X0VctBn-JMdJPieYLWdP_sXPk6GCFsLtVyWCuyrQ8xBla6BQ_eHp1xlqe-VhKXUfthQCKakk912amGovgohOFgDMs8Qz814VUpVzLH_81v9bUmwPuSjg"
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
