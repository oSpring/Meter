/**
 * Created by AndrewLiang on 2015/11/23.
 */
'use strict';


/**
 * Module dependencies.
 * @private
 */
var config    = require('../config');
var path     = require('path');
var resolve  = path.resolve;
var extname  = path.extname;
var url      = require('url');
var parseUrl = require('parseurl');
var fs       = require('fs');
var nunjucks = require('./nunjucks');

var EventEmitter = require('events').EventEmitter;
var createError  = require('http-errors');
var statuses     = require('statuses');

var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');

var serve = serveStatic(config.root, {'index': config.extend});

/**
 * Module exports.
 * @public
 */
module.exports = Static;

function Static(options) {

    this.opts        = Object.create(options || null);
    this.onDirectory = createNotFoundDirectoryListener();

    var root = this.opts.root;

    if (!root) {
        throw new TypeError('root path required')
    }

    if (typeof root !== 'string') {
        throw new TypeError('root path must be a string')
    }
}

Static.prototype.serve = function (req, res, next) {
    var fallthrough  = this.opts.fallthrough;
    var forwardError = !fallthrough;
    var originalUrl  = parseUrl.original(req);
    var path         = parseUrl(req).pathname;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (fallthrough) {
            return next();
        }

        //console.log("REQ : REQ");

        // method not allowed
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, HEAD');
        res.setHeader('Content-Length', '0');
        res.end();

        return;
    }

    // make sure redirect occurs at mount
    if (path === '/' && originalUrl.pathname.substr(-1) !== '/') {
        path = ''
    }


    var resolvePath = resolve(this.opts.root + path);

    //console.log("Path : " + resolvePath);
    this.read(resolvePath, this.opts, res);
    //this.read(path, this.opts, res);

};

Static.prototype.read = function (resolvePath, obj, res) {
    var self = this;

    var extend     = config.extend || ['html', 'htm'];
    var extendName = extname(resolvePath).replace('.','');
    var file       = path.basename(resolvePath);

    fs.stat(resolvePath, function (err, stat) {
        if (err && err.code === 'ENOENT' && !extendName && resolvePath[resolvePath.length - 1] !== sep) {
            return next(err)
        }
        if (err) {
            return self.onStatError(err, res);
        }
        if (stat.isDirectory()) {
            return self.redirect(self.path, res);
        }

        //console.log('extendName : ' + extendName);
        //console.log('indexOf    : ' + extend.indexOf(extendName));
        if(extend.indexOf(extendName)>-1){
            self.render(file, stat, res);
        }else{
            self.send(resolvePath, stat, res);
        }
    });
};

Static.prototype.render = function (fileName, stat, res) {
    //console.log("render : " + fileName);
    var file = nunjucks.render(fileName, {});
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Length', file.lenth);
    res.write(file);
    res.end();
};

Static.prototype.send = function (fileName, stat, res) {
    //console.log("reader : " + fileName);
    var done = finalhandler(req, res);
    serve(req, res, done);
    /*fs.readFile(fileName, function (err, file) {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Content-Length', file.length);
        res.write(file);
        res.end();
    });*/
};

Static.prototype.redirect = function (path, stat) {

};

Static.prototype.onStatError = function (error, res) {
    switch (error.code) {
        case 'ENAMETOOLONG':
        case 'ENOENT':
        case 'ENOTDIR':
            this.error(404, error, res);
            break;
        default:
            this.error(500, error, res);
            break;
    }
};

Static.prototype.error = function error(status, error, res) {
    // emit if listeners instead of responding
    if (listenerCount(this, 'error') !== 0) {
        /*return this.emit('error', createError(error, status, {
         expose: false
         }))*/
    }

    var msg = statuses[status];

    // wipe all existing headers
    res._headers = null;

    // send basic response
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.setHeader('Content-Length', Buffer.byteLength(msg));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(msg);
    res.end();
    //res.end(msg);
};


function listenerCount(emitter, type) {
    return EventEmitter.listenerCount || function (emitter, type) {
            return emitter.listeners(type).length;
        };
}

/**
 * Create a directory listener that just 404s.
 * @private
 */

function createNotFoundDirectoryListener() {
    return function notFound() {
        this.error(404)
    }
}