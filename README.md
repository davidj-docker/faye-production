# Faye Production (Docker)

A Dockerfile that creates a Faye server running on NodeJS for publishing and subscribing to messages. Inspired by https://github.com/nickjj/docker-faye and modified for client authentication, working in an Apache Mesos & Marathon cluster (with health checks). Uses faye-redis for allowing scaling to multiple instances.

### Default configuration
```javascript
var options = {
    redisHost: process.env.FAYE_REDIS_HOST || 'localhost',
    redisPort: process.env.FAYE_REDIS_PORT || 6379,
    listenPort: process.env.FAYE_PORT || 4242,
    mount: process.env.FAYE_MOUNT || '/stream',
    timeout: process.env.FAYE_TIMEOUT || 45,
    publishPassword: process.env.FAYE_PUBLISH_PASS || '',
    clientPassword: process.env.FAYE_SUBSCRIBE_PASS || ''
};
```
### Deployment in Marathon

```json
{
    "id": "/faye-server",
    "args": null,
    "user": null,
    "instances": 1,
    "cpus": 0.2,
    "mem": 1536,
    "disk": 0,
    "container": {
        "type": "DOCKER",
        "docker": {
            "network": "BRIDGE",
            "portMappings": [
                {
                    "containerPort": 80,
                    "hostPort": 0,
                    "servicePort": 0,
                    "protocol": "tcp"
                }
            ],
            "parameters": [
                { "key": "env", "value": "FAYE_REDIS_HOST=reddis.domain.com" },
                { "key": "env", "value": "FAYE_REDIS_PORT=6379" },
                { "key": "env", "value": "FAYE_PORT=80" },
                { "key": "env", "value": "FAYE_MOUNT=/stream" },
                { "key": "env", "value": "FAYE_TIMEOUT=45" },
                { "key": "env", "value": "FAYE_PUBLISH_PASS=PasswordForPublishing" },
                { "key": "env", "value": "FAYE_SUBSCRIBE_PASS=PasswordForSubscribing" }
            ],
            "image": "davidj/faye-production:latest"
        }
    },
    "upgradeStrategy": {
        "minimumHealthCapacity": 1,
        "maximumOverCapacity": 0.5
    },
    "healthChecks": [
        {
            "protocol": "HTTP",
            "path": "/health/",
            "gracePeriodSeconds": 300,
            "intervalSeconds": 5,
            "portIndex": 0,
            "timeoutSeconds": 5,
            "maxConsecutiveFailures": 2
        }
    ]
}
```
### Connecting in browser

```javascript
var client = new Faye.Client('https://faye-server.domain.com/stream', {timeout: 120});
client.disable('websocket'); // Optionally disable websockets if using HTTP/HTTPS load balancer
client.addExtension({
    outgoing: function(message, callback) {
        if (message.channel == '/meta/subscribe') {
            message.password = 'PasswordForSubscribing';
        }

        callback(message);
    }
});

client.subscribe('/channel', function(message) {
    console.log('Received message: ' + JSON.stringify(message));
});
```
