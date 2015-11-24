/**
 * Created by AndrewLiang on 2015/11/23.
 */
'use strict';

module.exports = {
    port    : 8080,
    index   : ['index', 'default'],
    root    : 'E:/Andrew/serve-komplete/pubilc',
    extend  : ['html', 'htm'],
    nunjucks: {
        autoescape      : true,  // (默认值: true) 控制输出是否被转义，查看 Autoescaping
        throwOnUndefined: false, // (default: false) 当输出为 null 或 undefined 会抛出异常
        trimBlocks      : false, // (default: false) 自动去除 block/tag 后面的换行符
        lstripBlocks    : false, // (default: false) 自动去除 block/tag 签名的空格
        watch           : false, // (默认值: false) 当模板变化时重新加载
        noCache         : false  // (default: false) 不使用缓存，每次都重新编译
    }
};