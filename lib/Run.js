/**
 *  运行代码
 */

// 初始化Jscex
var Jscex = require("jscex-jit");
require("jscex-async").init(Jscex);
Jscex.log = function () {}
 
var IndexTree = require('../index').Index;
var VM = require('../index').VM; 
 
var debug;
if (process.env.QUICKWEB_DEBUG && /run/.test(process.env.QUICKWEB_DEBUG))
  debug = function(x) { console.error('Run: %s', x); };
else
  debug = function() { };
  
  

// 运行代码并返回结果
var runCodeAsync = function (vm, code, argv, data) {
	return Jscex.Async.Task.create(function (t) {
		vm.run(code, {
			arguments:	argv,
			data:		data,
			done: function (data) {
					t.complete('success', {success: data});
			},
			fail: function (err) {
					t.complete('success', {error: err});
			},
			timeout: 2000,
			sandbox: {Jscex: Jscex}
		});
	});
}

// 运行所有结果 Jscex
var runAllAsync = eval(Jscex.compile('async', function (retarr, callback) {
	var vm = new VM();
	var r;
	var data = '';
	for (var i in retarr) {
		r = $await(runCodeAsync(vm, retarr[i].code, retarr[i].arguments, data));
		if (r.error) {
			callback(r.error);
			return;
		}
		if (retarr[i].data != '')
			data = retarr[i].data;
	}
	callback(null, r.success);
}));

// 运行所有结果
var runAll = function () {
  runAllAsync.apply(null, arguments).start();
}


// 模块输出
exports.runAll = runAll;
exports.runAllAsync = runAllAsync;



/* 使用方法：
  var index = new IndexTree();
  var ret = index.match(text);
  runAll(ret, function (error, success) {
    if (error)
      debug('出错：' + error);
    else
      debug('成功：' + success);
  });
*/
