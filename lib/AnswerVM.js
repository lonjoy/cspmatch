/**
 * 虚拟机
 *
 * 使用方法：
 * var vm = new AnswerVM();
 * vm.run('js代码', { done: function (data) { console.log('输出内容：' + data); },
 * 				fail: function (err) { console.error('出错：' + err); },
 * 				timeout: 60000,
 * 				arguments: 参数,
 * 				data: 数据
 * 				});
 * 在虚拟机中可使用的函数和数据：
 * $.print('打印内容');
 * $.exit(); 正常结束      $.exit('出错信息'); 异常退出
 * $.argv 参数     $.data 上一个条件语句提供的数据
 */
 
var vm = require('vm'); 
var debug = console.log;
 
var AnswerVM = module.exports = function () {
	
}

/**
 * 执行代码
 *
 * @param {string} code 脚本代码
 * @param {object} options 选项
 */
AnswerVM.prototype.run = function (code, options) {
	var sandbox = new Sandbox(options);
	//debug(sandbox);
	var code = this.compile(code);
	//debug(code);
	
	try {
		vm.runInNewContext(code, {'$': sandbox,
			setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
			Buffer: Buffer, require: require, console: console, debug: console.log
		});
	}
	catch (err) {
		sandbox.exit(err.stack);
	}
}

/**
 * 编译代码
 *
 * @param {string} code 脚本代码
 * @return {string}
 */
AnswerVM.prototype.compile = function (code) {
	return '(function () {\
	$._tid = setTimeout(function () { if ($.hasExit === false) $.exit("Timeout.");}, $.options.timeout);\
	try { ' + code + '\n } catch (err) { $.exit(err.stack); }\
	})();';
}

/**
 * 沙箱
 */
var Sandbox = function (options) {
	if (typeof options.done != 'function')
		options.done = function () { console.log('warning: missing calback function "done"'); }
	if (typeof options.fail != 'function')
		options.fail = function () { console.log('warning: missing calback function "fail"'); }
	if (isNaN(options.timeout))
		options.timeout = 60000;
	if (typeof options.arguments == 'undefined')
		this.argv = [];
	else
		this.argv = options.arguments;
	if (typeof options.data == 'undefined')
		this.data = '';
	else
		this.data = options.data;
	this.options = options;
	this._output = '';
	this.hasExit = false;
	//debug(this);
}

/**
 * 结束
 *
 * @param {string} err 出错信息
 */
Sandbox.prototype.exit = function (err) {
	if (err)
		this.options.fail(err);
	else
		this.options.done(this._output);
	this.hasExit = true;
	clearTimeout(this._tid);
	//debug(this);
}

/**
 * 输出结果
 *
 * @param {string} text 文本
 */
Sandbox.prototype.print = function (text) {
	this._output += text;
	return this;
}
