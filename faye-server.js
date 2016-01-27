var http = require('http'),
    faye = require('faye'),
    fayeRedis = require('faye-redis');

var options = {
    redisHost: process.env.FAYE_REDIS_HOST || 'localhost',
    redisPort: process.env.FAYE_REDIS_PORT || 6379,
    listenPort: process.env.FAYE_PORT || 80,
    mount: process.env.FAYE_MOUNT || '/stream',
    timeout: process.env.FAYE_TIMEOUT || 45,
    publishPassword: process.env.FAYE_PUBLISH_PASS || '',
    clientPassword: process.env.FAYE_SUBSCRIBE_PASS || ''
};

var bayeux = new faye.NodeAdapter({
    mount: options.mount,
    timeout: options.timeout,
    engine: {
        type: fayeRedis,
        host: options.redisHost,
        port: options.redisPort
    }
});

var server = http.createServer(function(request, response) {
	if (request.url.match(/^\/health\/?$/i)) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('OK');
	} else {
		response.writeHead(401, {'Content-Type': 'text/plain'});
    	response.end('Unauthorized');
	}
});

bayeux.addExtension({
  incoming: function(message, callback) {
    if (!message.channel.match(/^\/meta\//)) {
      var password = message.ext && message.ext.password;
      if (password !== options.publishPassword)
        message.error = '401::Unauthorized';
    } else if (message.channel === '/meta/subscribe') {
    	var clientPassword = message.password;
    	if (clientPassword !== options.clientPassword)
        	message.error = '401::Unauthorized';
    }

    callback(message);
  },

  outgoing: function(message, callback) {
    if (message.ext) delete message.ext.password;
    callback(message);
  }
});

bayeux.attach(server);

console.log('Listening on port ' + options.listenPort);
server.listen(options.listenPort);
