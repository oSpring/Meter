/**
 * Created by AndrewLiang on 2015/11/24.
 */
'use strict';

var serveStatic = require('serve-static');
var config      = require('../config');

// Serve up config.root folder
module.exports = serveStatic(config.root, {'index': config.index});
