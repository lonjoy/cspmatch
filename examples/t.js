var debug = console.log;
//var StringMatch = require('./lib/StringMatch');
var IndexTree = require('../index').Index;
var VM = require('../index').VM;
var text;
text = '你是谁？';
//text = '私信我';
text = '如果明明不';
text = '他说如果明天下雨怎么';
//text = '100加23';
//text = '刘德华是谁';
//text = '发邮件给admin@mail.com';
//text = '发邮件给张学友';
text = '发邮件给李小明的妈妈';
//text = '打开http://baidu.com';

// 程序模板
var CODES = [
	{s: '如果{今天}下雨', c: '$weather.like($argv[0], "下雨")', t: 'c', d: '{{0}}会下雨'},
	{s: '如果{今天}晴天', c: '$weather.like($argv[0], "晴天")', t: 'c'},
	
	{s: '私信我', c: '$weibo.send("我").exit()', t: 'a'},
	{s: '发邮件给{刘德华}', c: '$email.send($argv[0]).exit()', t: 'a'},
	{s: '发邮件给{刘德华}的{妈妈}', c: '$.print("亲爱的" + $.argv[0] + $.argv[1] + "，您好！").exit()', t: 'a'},
	{s: '发邮件给{admin@mail.com}', c: '$email.send($argv[0]).exit()', t: 'a'},
	{s: '打开{http://site.com}', c: '$browser.open($.argv[0])', t: 'a'},
	
	{s: '{今天}的天气', c: '$.print(weather.query($argv[0])).exit()', t: 'a'},
	{s: '你是谁', c: '$.print($me.about).exit()', t: 'a'},
	{s: '你是什么', c: '$.print($me.about).exit()', t: 'a'},
	{s: '如果明明没有', c: '$.print("test").exit()', t: 'c'},
	
	{s: '{一}加{一}', c: '$.print(Number($argv[0]) + Number($argv[1])).exit()', t: 'a'},
	{s: '{张学友}是谁', c: '$.print($people.about($argv[0])).exit()', t: 'a'}
];


var index = new IndexTree();
//index.add(CODES[0].s, CODES[0].c, CODES[0].t);
for (var i in CODES)
	index.add(CODES[i].s, CODES[i].c, CODES[i].t, CODES[i].d);
//debug(index.TREE);
	
debug('=============================================================================');
debug('文本：' + text);
var ret = index.match(text);
debug(ret);
/*
var sm = new StringMatch();
sm.match('如果明天刮风？', function (ret) {
	if (ret.length < 1)
		debug('找不到结果！');
	else if (ret.length > 1) {
		debug('你要问的是哪个问题？');
		for (var i in ret)
			debug(ret[i].s);
	}
	else {
		debug(ret[0].s);
		debug(ret[0].c);
	}
	sm.db.close();
});

//setTimeout(function () { debug('end()'); }, 20000);
*/

if (ret !== false) {
	var vm = new VM();
	vm.run(ret.code, {
		arguments:	ret.arguments,
		data:		ret.data,
		done:	function (data) {
					debug('=============================================================================');
					debug('输出：' + data);
				},
		fail:	function (err) {
					debug('=============================================================================');
					debug('出错：' + err);
				}
	});
}