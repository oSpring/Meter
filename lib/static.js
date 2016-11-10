/**
 * Created by AndrewLiang on 2015/11/24.
 */
'use strict';

var serveStatic = require('serve-static');

// Serve up root folder
module.exports = function(root, index){
    return serveStatic(root, {'index': index});
};
