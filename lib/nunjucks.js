/**
 * Created by AndrewLiang on 2015/11/24.
 */
var config    = require('../config');
var nunjucks    = require('nunjucks');

nunjucks.configure(config.root, config.nunjucks);

module.exports = nunjucks;