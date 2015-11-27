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
var queryString  = require('querystring');

var config  = require('../config');

var index  = config.index  || ['index.html', 'default.htm'];
var extend = config.extend || ['html', 'htm'];
var root   = determineRoot(config.root);
var indexLen = index.length;
var indexExtend = extend.length;

var staticServe = require('./static');
var nunjucks    = require('./nunjucks');


/**
 * Module exports.
 * @public
 */

module.exports = serve;


function serve(req, res) {
    var pathname = parseUrl(req).pathname;
    var extName  = path.extname(pathname);

    console.log("pathname : " + pathname);

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
    var i    = 0;

    function findFile(filePath) {
        if(i>=indexLen){
            error(res, 404);
            return false;
        }
        filePath = path.resolve(filePath);
        console.log('filePath : ' + filePath);
        fs.stat(filePath, function (err,stats) {
            if(err){
                if(err.code === 'ENOENT'){
                    console.log('ENOENT');
                }else{
                    error(res, 500, '读取索引文件状态出错！' + err);
                    //throw (new Error('读取索引文件状态出错！' + err));
                }
                //return false;
            }
            if(stats && stats.isFile()){
                render(pathname + path.basename(filePath), req, res);
                //distribute(filePath, extend, req, res);
            }else{
                i++;
                findFile(fileDirectory+index[i]);
            }
        });
    }

    findFile(fileDirectory+index[0]);
}

function findExtend(pathname, req, res) {
    var fileName = path.resolve(root + pathname) + '.'; // 当前将要访问文件
    var i    = 0;

    function findFile(filePath) {
        if(i>=indexExtend){
            error(res, 404);
            return false;
        }
        filePath = path.resolve(filePath);
        fs.stat(filePath, function (err,stats) {
            if(err){
                if(err.code === 'ENOENT'){
                    console.log('ENOENT');
                }else{
                    error(res, 500, '读取索引文件状态出错！' + err);
                    //throw (new Error('读取索引文件状态出错！' + err));
                }
                //return false;
            }
            if(stats && stats.isFile()){
                render(pathname + path.basename(filePath), req, res);
            }else{
                i++;
                findFile(fileName + extend[i]);
            }
        });
    }
    findFile(fileName + extend[0]);
}



function distribute(pathname, extName, req, res) {
    var fileName = path.resolve(root + pathname);
    var file = path.basename(pathname);
    var ext      = extName.replace('.', '');
    var done     = function(){};

    if (extend.indexOf(ext) > -1) {
        fs.stat(fileName, function(err, stats){
            if(err){
                if(err.code === 'ENOENT'){
                    error(res, 404);
                }else{
                    error(res, 500, '读取文件状态出错！' + err);
                    //throw (new Error('读取文件状态出错！' + err));
                }
            }
            if(stats && stats.isFile()){
                render(pathname, req, res);
            }
        });
    } else {
        done = finalhandler(req, res);
        staticServe(req, res, done);
        //console.log('staticServe');
    }
}

function render(fileName, req, res){
    var data   = preData(req, res);

    fileName = fileName.split('/');
    fileName.splice(0,1);
    fileName = fileName.join('/');

    nunjucks.render(fileName, data, function(err, file){

        if(err){
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

function writeFile(fileName, file){
    var target = path.resolve(config.root + '/' + config.dist) + '/';

    fs.outputFile(target + fileName, file, function (err) {
        console.log(err);
    });
}

function error(res, status, msg){
    msg = (msg || statuses[status]).toString();
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

function preData(req, res){
    return config.data(url.parse(req.url, true).query);
}

function determineRoot(root) {
    var last, len;

    if (!root) {
        throw (new Error('Root Path is required!'));
    }

    return root;

    /*root = root.split('');
    len  = root.length;
    last = root[len - 1];

    if (last === '/') {
        root.splice(len - 1, 1);
    }
    return root.join('');*/
}