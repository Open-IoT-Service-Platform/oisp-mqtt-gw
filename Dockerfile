FROM node:14-alpine

ADD / /app
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -S appuser -G appuser

WORKDIR /app

RUN npm install -g grunt-cli && npm install && grunt && npm prune --production

RUN chmod 777 start-mqtt-kafka-bridge.sh wait-for-it.sh

USER appuser
ENTRYPOINT ["/bin/sh","start-mqtt-kafka-bridge.sh"]
