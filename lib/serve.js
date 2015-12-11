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
var fs           = require('fs-extra');
var url          = require('url');
var finalhandler = require('finalhandler');
var statuses     = require('statuses');
var _extend      = require('util')._extend;
//var queryString  = require('querystring');

var config = require('../config');

var index       = config.index || ['index.html', 'default.htm'];
var extend      = config.extend || ['html', 'htm'];
var exclude     = config.exclude || [];
var root        = determineRoot(config.root);
var dist        = config.dist || 'dist';
var indexLen    = index.length;
var indexExtend = extend.length;

var staticServe = require('./static')(root, index);
var nunjucks    = require('./nunjucks')(root, config.nunjucks || {});

/**
 * Module exports.
 * @public
 */

module.exports = serve;


function serve(req, res) {
    var pathname = parseUrl(req).pathname;
    var extName  = path.extname(pathname);

    console.log("path : " + pathname);

    // dir
    if (pathname === '/' || (pathname && pathname.substr(-1) === '/')) {
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

/*
 * 如果访问的是目录的话（/ 或者 /xx/ ）， 按照设置的索引文件挨个读取，如果存在此文件，则渲染返回，否则返回 404
 * */
function findDefault(pathname, req, res) {
    var fileDirectory = path.resolve(root + pathname) + '/'; // 当前将要访问文件的目录
    var i = 0;

    function findFile(filePath) {
        if (i >= indexLen) {
            error(res, 404);
            return false;
        }
        filePath = path.resolve(filePath);
        fs.stat(filePath, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log('ENOENT');
                } else {
                    error(res, 500, '读取索引文件状态出错！' + err);
                    //throw (new Error('读取索引文件状态出错！' + err));
                }
                //return false;
            }
            if (stats && stats.isFile()) {
                render(pathname + path.basename(filePath), req, res);
                //distribute(filePath, extend, req, res);
            } else {
                i++;
                findFile(fileDirectory + index[i]);
            }
        });
    }

    findFile(fileDirectory + index[0]);
}

function findExtend(pathname, req, res) {
    var fileName = path.resolve(root + pathname) + '.'; // 当前将要访问文件
    var i = 0;

    function findFile(filePath) {
        if (i >= indexExtend) {
            error(res, 404);
            return false;
        }
        filePath = path.resolve(filePath);
        fs.stat(filePath, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log('ENOENT');
                } else {
                    error(res, 500, '读取索引文件状态出错！' + err);
                    //throw (new Error('读取索引文件状态出错！' + err));
                }
                //return false;
            }
            if (stats && stats.isFile()) {
                render(pathname + path.basename(filePath), req, res);
            } else {
                i++;
                findFile(fileName + extend[i]);
            }
        });
    }

    findFile(fileName + extend[0]);
}


function distribute(pathname, extName, req, res) {
    var fileName = path.resolve(root + pathname);
    var file     = path.basename(pathname);
    var ext      = extName.replace('.', '');
    var done     = function () {};

    if (extend.indexOf(ext) > -1) {
        fs.stat(fileName, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    error(res, 404);
                } else {
                    error(res, 500, '读取文件状态出错！' + err);
                    //throw (new Error('读取文件状态出错！' + err));
                }
            }
            if (stats && stats.isFile()) {
                render(pathname, req, res);
            }
        });
    } else {
        done = finalhandler(req, res);
        staticServe(req, res, done);
        //console.log('staticServe');
    }
}

function render(fileName, req, res) {
    var data       = preData(req, res);
    var done       = function () {};
    var production = process.env.NODE_ENV === 'production';
    var pathName   = path.resolve(root + fileName);

    if (production) {
        fs.stat(pathName, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    error(res, 404);
                } else {
                    error(res, 500, '读取文件状态出错！' + err);
                }
            }
            if (stats && stats.isFile()) {
                // todo
                // 确定是先生成再返回，还是一起生成，直接调用 serveStatic
                // 更改访问的路径，加上 dist 目录
                console.log(req.url);
                req.url = req.url + config.dist + '/';
                console.log(req.url);
                done = finalhandler(req, res);
                staticServe(req, res, done);
            }
        });

        return false;
    }

    fileName = fileName.slice(1, fileName.length);

    nunjucks.render(fileName, data, function (err, file) {

        if (err) {
            error(res, 500, err);
            return false;
        }

        writeFile(fileName, file);

        res._headers = null;
        // send basic response
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Content-Length', Buffer.byteLength(file));
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.write(file);
        res.end();
        //console.log('nunjucks');
    });
}

function writeFile(fileName, file) {
    var target = path.resolve(root + '/' + dist + '/' + fileName);
    var has    = false;

    exclude.forEach(function (name, index) {
        if (target.indexOf(name) > -1) {
            has = true;
        }
    });

    if (has) {
        return false;
    }

    fs.outputFile(target, file, function (err) {
        if (err) {
            console.log('文件：' + target + '生成失败，错误详情：' + err);
            return false;
        }
        console.log('文件：' + target + ' 生成成功');
    });

}

function error(res, status, msg) {
    msg          = (msg || statuses[status]).toString();
    res._headers = null;
    // send basic response
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Length', Buffer.byteLength(msg));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(msg);
    res.end();
    //console.log('nunjucks');
}

function preData(req, res) {
    var query = url.parse(req.url, true).query;

    if (typeof config.data === 'function') {
        return config.data(query);
    } else {
        return _extend(query, config.data);
    }
}

function determineRoot(root) {
    if (!root) {
        //throw (new Error('Root Path is required!'));
        root = path.resolve(__dirname + '/../public');
    }

    return root;
}