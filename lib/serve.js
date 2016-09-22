/**
 * Created by AndrewLiang on 2015/11/24.
 */
'use strict';

/**
 * Module dependencies.
 */


/*
 * Define Variable
 * fullPath     : "E:\Andrew\serve-komplete\public\pure.html"
 * fullDistPath : "E:\Andrew\serve-komplete\public\dist\pure.html"
 * fullDotPath  : "E:\Andrew\serve-komplete\public\pure."
 * filePath     : "\pure.html"
 * fullFilePath : "\dist\pure.html",
 * fileName     : "pure",
 * fullFileName : "pure.html",
 * extName      : "html"
 * fullExtName  : ".html"
 * */
var parseUrl     = require('parseurl');
var path         = require('path');
var fs           = require('fs-extra');
var url          = require('url');
var finalhandler = require('finalhandler');
var statuses     = require('statuses');
var _extend      = require('util')._extend;

var config = require('../config');

var index       = config.index || ['index.html', 'default.htm'];
var extend      = config.extend || ['html', 'htm'];
var exclude     = config.exclude || [];
var root        = determineRoot(config.root);
var dist        = config.dist || 'dist';
var indexLen    = index.length;
var indexExtend = extend.length;

var staticServe = require('./static')(root, index);
var engine      = require('./' + config.engine.name)(root, config.engine.setting || {});

/**
 * Module exports.
 * @public
 */

module.exports = serve;


function serve(req, res) {
    var filePath    = parseUrl(req).pathname;  // /index.html
    var fullExtName = path.extname(filePath);  // .html

    // dir
    if (filePath === '/' || (filePath && filePath.substr(-1) === '/')) {
        findDefaultFile(filePath, req, res);
        return false;
    }

    // file
    if (fullExtName) {
        distribute(filePath, fullExtName, req, res);
        return false;
    }

    // file no extend
    findExtend(filePath, req, res);
}

/*
 * 如果访问的是目录的话（/ 或者 /xx/ ）， 按照设置的索引文件挨个读取，如果存在此文件，则渲染返回，否则返回 404
 * */
function findDefaultFile(filePath, req, res) {
    var fileDirectory = path.resolve(root + filePath) + '/'; // 当前将要访问文件的目录

    var i = 0;

    function findFile(fullPath) {
        if (i >= indexLen) {
            error(res, 404, "", fullPath);
            return false;
        }
        fullPath = path.resolve(fullPath);
        fs.stat(fullPath, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    //console.log('ENOENT');
                    error(res, 404, "", fullPath);
                } else {
                    error(res, 500, '读取索引文件状态出错！' + err, "", fullPath);
                }
                return false;
            }
            if (stats && stats.isFile()) {
                render(filePath + path.basename(fullPath), req, res);
            } else {
                i++;
                findFile(fileDirectory + index[i]);
            }
        });
    }

    findFile(fileDirectory + index[0]);
}

function findExtend(filePath, req, res) {
    var fullDotPath = path.resolve(root + filePath) + '.'; // 当前将要访问文件 filePath /pure
    var i           = 0;
    
    function findFile(fullPath, ext) {
        if (i >= indexExtend) {
            return false;
        }

        // E:\Andrew\serve-komplete\public\pure.html
        fs.stat(fullPath, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    //console.log('ENOENT');
                    error(res, 404, "", fullPath);
                    return false;
                } else {
                    error(res, 500, '读取索引文件状态出错！' + err, "", fullPath);
                    return false;
                }
            }
            if (stats && stats.isFile()) {
                // /pure.html
                render(filePath + '.' + ext, req, res);
            } else {
                i++;
                findFile(fullDotPath + extend[i], extend[i]);
            }
        });
    }

    findFile(fullDotPath + extend[0], extend[0]);
}


function distribute(pathname, extName, req, res) {
    var fileName = path.resolve(root + pathname);
    var file     = path.basename(pathname);
    var ext      = extName.replace('.', '');
    var done     = function () {
    };

    if (extend.indexOf(ext) > -1) {
        fs.stat(fileName, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    error(res, 404, "", pathname);
                    return false;
                } else {
                    error(res, 500, '读取文件状态出错！' + err, "", pathname);
                    return false;
                }
            }
            if (stats && stats.isFile()) {
                render(pathname, req, res);
            }
        });
    } else {
        done = finalhandler(req, res);
        staticServe(req, res, done);
    }
}

function render(filePath, req, res) {
    var data       = preData(req, res);
    var done       = function () {};
    //var production = process.env.NODE_ENV === 'production';
    //var pathName   = path.resolve(root + filePath); //  E:\Andrew\serve-komplete\public\index.html
    //var filePath   = fileName; // /index.html

    /*if (production) {
        fs.stat(pathName, function (err, stats) {
            if (err) {
                if (err.code === 'ENOENT') {
                    error(res, 404, "", pathname);
                    return false;
                } else {
                    error(res, 500, '读取文件状态出错！' + err, "", pathname);
                    return false;
                }
            }
            if (stats && stats.isFile()) {
                // 更改访问的路径，加上 dist 目录
                req.url = req.url + config.dist + '/';
                done    = finalhandler(req, res);
                staticServe(req, res, done);
            }
        });

        return false;
    }*/

    

    var fullFileName     = filePath.slice(1, filePath.length);

    engine.render(fullFileName, data, function (err, file) {

        if (err) {
            console.log(err);
            error(res, 500, err, "", filePath);
            return false;
        }

        writeFile(fullFileName, file, function (err, file) {

            if (err) {
                console.log('文件：' + (config.dist + fullFileName) + '生成失败，错误详情：' + err);
                return false;
            }

            req.url = config.dist + filePath; // dist/pure.html

            done = finalhandler(req, res);
            staticServe(req, res, done);
        });
    });
}

function writeFile(fileName, file, callback) {
    var fullDistPath = path.resolve(root + '/' + dist + '/' + fileName);
    var has          = false;

    exclude.forEach(function (name, index) {
        if (fullDistPath.indexOf(name) > -1) {
            has = true;
        }
    });

    if (has) {
        return false;
    }

    fs.outputFile(fullDistPath, file, function (err) {
        if (callback) {
            callback(err, fullDistPath);
        }
    });

}

function error(res, status, msg, filePath) {
    msg = (msg || statuses[status]).toString();
    
    console.log(filePath + ' ' + msg);

    res._headers = null;
    
    // send basic response
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Length', Buffer.byteLength(filePath + ' ' + msg));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(filePath + ' ' + msg);
    res.end();

}

function preData(req, res) {
    var query = url.parse(req.url, true).query;
    
    var filePath = parseUrl(req).pathname;
    
    query.navPath = filePath.slice(1, filePath.length);

    if (typeof config.data === 'function') {
        return config.data(query);
    } else {
        return _extend(query, config.data);
    }
}

function determineRoot(root) {
    if (!root) {
        root = path.resolve(__dirname + '/../public');
        console.warn('Root Path is not set! Using ' + root + ' instead!');
    }

    return root;
}