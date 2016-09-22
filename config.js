/**
 * Created by AndrewLiang on 2015/11/23.
 */
'use strict';

module.exports = {
    port    : 8080,  // 访问端口 必须
    index   : ['index.html', 'default.htm', 'default.html'], // 当访问的地址是目录结尾时，默认查找的文件。 可选，默认 'index.html' 和 'default.htm'
    root    : '', //'D:/serve-komplete/public', // 项目文件所在的目录。可选，默认为 lib 所在目录同级的 public 目录
    extend  : ['html', 'htm'],  // 静态文件扩展名 可选 默认 'html', 'htm'
    exclude : ['layout.html','docs.html'],  // 排除的文件，即访问的时候不生成此文件的完整版本 可选，默认为空
    dist    : 'dist', // 生成的完整的文件所在的路径 root + dist， 可选 默认为 root + '/dist/'
    // 渲染引擎的配置，可选，默认为上面的配置
    engine: {
        name : "nunjucks",       // 渲染引擎的名称，默认为 nunjucks
        setting: {
            autoescape      : true,  // (默认值: true) 控制输出是否被转义，查看 Autoescaping
            throwOnUndefined: false, // (default: false) 当输出为 null 或 undefined 会抛出异常
            trimBlocks      : false, // (default: false) 自动去除 block/tag 后面的换行符
            lstripBlocks    : false, // (default: false) 自动去除 block/tag 签名的空格
            watch           : false, // (默认值: false) 当模板变化时重新加载
            noCache         : true  // (default: false) 不使用缓存，每次都重新编译
        }
    },
    /*
     * 渲染模板时候传递的数据，默认为空，可以是纯 json 数据，如果是纯 json 数据，则会将 query 查询参数和 data 合并。
     * 可以是函数，如果是函数，则会将 query 数据以对象的形式传递进此函数，并在函数执行完毕后，将数据返回给渲染引擎
     * */
    data : function(data){
        data.title = 'serve-komplete';
        return data;
    }
};