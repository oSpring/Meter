/**
 * Created by AndrewLiang on 2015/11/23.
 */
'use strict';

var http = require('http'),
    serve = require('./lib/serve'),

    config    = require('./config');


// Create server
var server = http.createServer(function(req, res){
    serve(req, res);
});

// Listen
server.listen(config.port || 8080);

console.log('Linsten on 127.0.0.1:' + config.port);
