/**
 * Created by AndrewLiang on 2015/11/24.
 */
'use strict';

/**
 * Module dependencies.
 * @private
 */

var parseUrl     = require('parseurl');
var path         = require('path');
var fs           = require('fs');
var finalhandler = require('finalhandler');

var resolve = path.resolve;
var config  = require('../config');

var index  = config.index  || ['index', 'default'];
var extend = config.extend || ['html', 'htm'];
var root   = determineRoot(config.root);

var staticServe = require('./static');
var nunjucks    = require('./nunjucks');


/**
 * Module exports.
 * @public
 */

module.exports = serve;


function serve(req, res) {
    var pathname = parseUrl(req).path;
    var extName  = path.extname(pathname);

    // dir
    if (pathname === '/' || pathname[pathname.length - 1] === '/') {
        findDefault(pathname, req, res);
        return false;
    }

    // file
    if (extName) {
        distribute(pathname, extName, req, res);
        return false;
    }

    // file no extend
    findExtend(pathname, req, res);
}

function redirect() {

}

function findDefault(pathname, req, res) {
    var file = root + pathname;


    function findFile(path) {
        fs.stat(path, function () {

        })
    }
}

function findExtend(pathname, req, res) {

}

function distribute(pathname, extName, req, res) {
    var fileName = path.basename(pathname);
    var ext      = extName.replace('.', '');
    var done     = function(){};

    if (extend.indexOf(ext) > -1) {
        var file = nunjucks.render(fileName, {});
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        //res.setHeader('Content-Length', file.length);
        res.write(file);
        res.end();
        //console.log('nunjucks');
    } else {
        done = finalhandler(req, res);
        staticServe(req, res, done);
        //console.log('staticServe');
    }
}

function determineRoot(root) {
    var last, len;

    if (!root) {
        throw (new Error('Root Path is required!'));
    }

    root = root.split('');
    len  = root.length;
    last = root[len - 1];

    if (last === '/') {
        root.splice(len - 1, 1);
    }
    return root.join('');
}