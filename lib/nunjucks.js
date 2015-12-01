/**
 * Created by AndrewLiang on 2015/11/24.
 */
var nunjucks    = require('nunjucks');


module.exports = function(root, options){
    nunjucks.configure(root, options);
    return nunjucks;
};