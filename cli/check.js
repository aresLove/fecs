/**
 * @file 代码风格检查入口
 * @author chris<wfsr@foxmail.com>
 */

var fs         = require('vinyl-fs');

var util       = require('../lib/util');
var jschecker  = require('../lib/js/checker');
var csschecker = require('../lib/css/checker');

/**
 * 不同的输入流处理
 *
 * @namespace
 */
var streams = {

    /**
     * 处理文件系统中的代码
     *
     * @param {Object} options minimist 处理后的 cli 参数
     */
    files: function (options) {
        var patterns = util.buildPattern(options._, options.type);

        return fs.src(patterns, {cwdbase: true})
            .pipe(jschecker(options))
            .pipe(csschecker(options));
    },

    /**
     * 处理从 stdin 输入的代码
     *
     * @param {Object} options minimist 处理后的 cli 参数
     */
    stdin: function (options) {
        var through = require('through2');
        var File = require('vinyl');

        var type = (options.t || options.type || 'js').split(',')[0];
        var handler = type === 'js' ? jschecker(options) : (type === 'css' ? csschecker(options) : through());

        return process.stdin
            .pipe(
                through.obj(function (chunk, enc, cb) {
                    cb(null, new File({contents: chunk, path: 'current-file.' + type}));
                }
            ))
            .pipe(handler);
    }
};

/**
 * check 处理入口
 *
 * @param {Object} options minimist 处理后的 cli 参数
 */
exports.run = function (options) {
    console.time('fecs');

    var log = require('../lib/log')(options.color);
    var reporter = require('../lib/reporter').get(log, options);

    streams[options.stream ? 'stdin' : 'files'](options)
        .pipe(reporter)
        .once('end', function (success, json) {
            console.timeEnd('fecs');

            if (!success && options.format) {
                var formatter = require('../lib/formatter');

                if (formatter[options.format]) {
                    formatter[options.format](json);
                }
            }

            process.exit(success ? 0 : 1);
        });
};
