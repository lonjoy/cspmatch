使用方法
=======================

## 索引 cspmatch.Index

```javascript
	// 创建实例
	var index = new IndexTree();
	
	/* 添加句子
		index.add('句型', '代码', '类型', '数据模板');
		类型：c:条件  a:动作  如果类型为条件，则需要提供数据模板(使用Mustache，通过{{0}}可以获取第一个参数)，如 {{0}}会下雨
	*/
	index.add('如果{今天}下雨', '$.print($.argv[0] + \'会下雨\').exit();', 'a', '{{0}}会下雨');
	
	/* 匹配一句话
		var ret = index.matchOne('句子');
		成功返回匹配信息，失败返回false
	*/
	var ret = index.matchOne('如果明天下雨');
	
	/* 匹配一段话
		var ret = index.match('句子');
		自动将句子用逗号、句号、问号等分割成多段，并逐个匹配，返回数组
	*/
	var ret = index.match('如果明天下雨，发邮件给张学友。');
```

## 虚拟机 cspmatch.VM

```javascript
	// 创建实例
	var vm = new AnswerVM();
	
	/* 运行代码
		vm.run('js代码', { done: function (data) { console.log('输出内容：' + data); },
						fail: function (err) { console.error('出错：' + err); },
						timeout: 超时时间（毫秒）,
						arguments: 参数,
						data: 数据
				});
		在虚拟机中可使用的函数和数据：
		$.print('打印内容');
		$.exit(); 正常结束      $.exit('出错信息'); 异常退出
		$.argv 参数     $.data 上一个条件语句提供的数据
	*/
	vm.run('$.print($.argv[0] + \'会下雨\').exit();', {
		done: function (data) { response.sendJSON({success: data}); },
		fail: function (err) { response.sendError({error: err}); },
		timeout: 60000,
		arguments: ['明天'],
		data: '明天会下雨'});
```
