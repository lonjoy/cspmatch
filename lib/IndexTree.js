/**
 * 中文句子匹配
 *
 * 使用方法：
 * var index = new IndexTree();
 * index.add('句型', '代码', '类型', '数据模板');	// 添加句型。  类型：c:条件  a:动作  如果类型为条件，则需要提供数据模板，如 {{0}}会下雨
 * var ret = index.match('句子');   // 匹配，失败返回false
 */
 
var Mustache = require('mustache'); 
var Segment = require('Segment').Segment; 
var POSTAG = require('Segment').POSTAG;
var debug = console.log;
var util = require('util');
var inspect = util.inspect;
 
var MIN_MATCH_PERCENT = 0.8;	// 字符串非完全匹配时的最小百分比
 
var IndexTree = module.exports = function () {
	// 索引
	this.TREE = {};
	
	// 代码
	this.CODE = {};
	
	// 分词器
	var segment1 = this.segment1 = new Segment();
	// 使用单字分词
	segment1.use(['URLTokenizer', 'PunctuationTokenizer', 'ForeignTokenizer', 'SingleTokenizer', 'EmailOptimizer'])
			.loadDict('dict.txt')			// 盘古词典
			.loadDict('dict2.txt')			// 扩展词典（用于调整原盘古词典）
			.loadDict('names.txt')			// 常见名词、人名
			.loadDict('wildcard.txt', 'WILDCARD', true);		// 通配符
	var segment2 = this.segment2 = new Segment();
	segment2.useDefault();
}

/**
 * 添加索引
 *
 * @param {string} text 文本
 * @param {string} code 代码
 * @param {string} type 类型
 * @param {string} data 数据模板
 */
IndexTree.prototype.add = function (text, code, type, data) {
	var words = getIndexWords(this.segment1, text);
	//debug(words);
	
	// 保存代码
	this.CODE[words.id] = { c: code, t: type}
	if (data)
		this.CODE[words.id].d = data;
	
	// 添加索引
	addToIndex(this.TREE, words.index, words.id, 0);
}
 
/**
 * 匹配
*
* @param {string} text 文本
*/
IndexTree.prototype.match = function (text) {
	var words1 = wordFilter(this.segment1.doSegment(text));
	var words2 = wordFilter(this.segment2.doSegment(text));
	//debug(words1);
	//debug(words2);
	var tmpwords1 = words1.slice(0);
	var tmpwords2 = words2.slice(0);
	var endcur = parseInt(words1.length * MIN_MATCH_PERCENT);	// 非完全匹配阀值
	var cur1 = 0;
	var cur2 = 0;
	var len2 = 0;
	do {
		//debug('========================== match ==========================');
		//debug('cur1=' + cur1 + ', cur2=' + cur2 + ', len2=' + len2);
		//debug(tmpwords1);
		//debug(tmpwords2);
		
		var ret = findFromIndex(this, {
			words1:	tmpwords1,
			words2:	tmpwords2,
			cur1:	0,
			cur2:	0,
			len2:	1,
			last1:	0,
			TREE:	this.TREE
		});
		
		// 如果匹配成功
		if (ret !== false) {
			if (cur1 > 0)
				ret.fully = false;
			ret.start = cur1;
			ret.text = this.segment1.toString(words1.slice(ret.start, ret.start + ret.length));
			ret.code = this.CODE[ret.template].c;
			ret.type = this.CODE[ret.template].t;
			//debug(this.CODE[ret.template]);
			// 如果是条件类型，则渲染结果
			if (ret.type === 'c' && this.CODE[ret.template].d)
				ret.data = Mustache.to_html(this.CODE[ret.template].d, ret.arguments);
			return ret;
		}
		
		cur1++;
		len2++;
		if (len2 > words2[cur2].w.length) {
			cur2++
			len2 = 1;
			tmpwords2 = words2.slice(cur2);
		}
		tmpwords1 = words1.slice(cur1);
	} while (cur1 < endcur);
	
	return false;
}
 
 
 /**
 * 生成用于索引的单词列表
 *
 * @param {Segment} segment实例
 * @param {string} text 文本
 * @return {object}
 */
var getIndexWords = function (segment, text) {
	var TABLE = segment.getDict('TABLE');
	var indexs = [];
	var ids = [];
	var ws = segment.doSegment(text);
	//debug(ws);
	var es = false;
	for (var i in ws) {
		var w = ws[i];
		i = Number(i);
		if ((w.p & POSTAG.D_W) < 1 || w.w == '{' || w.w == '}')
			ids.push(w);
		if (w.w == '{') {
			es = i + 1;
			//debug('{ => ' + es);
			continue;
		}
		if (es === false) {
			if ((w.p & POSTAG.D_W) < 1)
				indexs.push({w: w.w});
		}
		else {
			if (w.w == '}') {
				//debug('} => ' + i);
				var nw = segment.toString(ws.slice(es, i));
				//debug(nw);
				if (nw in TABLE) {
					var w = TABLE[nw];
					indexs.push({p: w.p});
				}
				// 判断是否为网址、电子邮件等，使用分词器来判断
				else {
					var nws = segment.doSegment(nw);
					indexs.push({p: nws[0].p});
				}
				es = false;
			}
		}
	}
	//debug(indexs);
	return {
		id:		segment.toString(ids),
		index:	indexs
	};
}

/**
 * 过滤标点符号
 *
 * @param {array} words 单词数组
 * @return {array}
 */
var wordFilter = function (words) {
	var ret = [];
	for (var i in words)
		if ((words[i].p & POSTAG.D_W) < 1)
			ret.push(words[i]);
	return ret;
}

/**
 * 添加到索引
 *
 * @param {object} TREE索引树
 * @param {object} words 单词数组
 * @param {string} id 代码ID
 * @param {int} i 当前位置
 */
var addToIndex = function (TREE, words, id, i) {
	var word = words[i];
	//debug(word);
	if (word.w)
		var v = word.w;
	else
		var v = '#' + word.p;
	if (!TREE[v])
		TREE[v] = {}
	i++;
	if (!words[i])
		TREE[v]['$$$'] = id;
	else
		addToIndex(TREE[v], words, id, i);
	//debug(TREE);
}

/**
 * 从索引树中查找符合条件的文本
 *
 * @param {IndexTree} self IndexTree对象
 * @param {object} args 参数
 * @return object}
 */
var findFromIndex = function (self, args) {
	//debug('================= findFromIndex ====================');
	//debug(args);
	
	var currw1 = args.words1[args.cur1];
	var currw2 = args.words2[args.cur2];
	//debug(currw1);
	//debug(currw2);
			
	// 判断当前字，如果在索引树中
	if (currw1 && currw1.w in args.TREE) {
		//debug('测试单字');
		var nexTREE = args.TREE[currw1.w];
		// 计算位置
		var len2 = args.len2 + currw1.w.length;
		var cur2 = args.cur2;
		if (currw2 && len2 >= currw2.w.length) {
			var cur2 = args.cur2 + 1;
			len2 = 1;
		}
		// 查找下一个索引
		var ret = findFromIndex(self, {
			words1:	args.words1,
			words2: args.words2,
			cur1:	args.cur1 + 1,
			cur2:	cur2,
			len2:	len2,
			last1:	args.last1,
			TREE:	nexTREE
		});
		// 如过下一个字匹配，则返回结果，否则留给下面的词性匹配
		if (ret !== false)
			return ret;
	}
		
	// 如果单字不匹配，则判断词性
	if (currw1 && currw2 && ('#' + currw2.p) in args.TREE) {
		//debug('测试词性');
		var nexTREE = args.TREE['#' + currw2.p];
		// 跳到下一个位置
		// 下一个词
		var nextw = args.words2[args.cur2 + 1];
		if (nextw) {
			// 查询下一个词的开始位置
			var cur1 = false;
			for (var i = args.last1; i < args.words1.length; i++) {
				var tmpw = args.words1[i];
				if (nextw.w.substr(0, tmpw.w.length) == tmpw.w) {
					var cur1 = i;
					break;
				}
			}
			
			if (cur1 !== false) {
				var cur2 = args.cur2 + 1;
				var ret = findFromIndex(self, {
					words1:	args.words1,
					words2:	args.words2,
					cur1:	cur1,
					cur2:	cur2,
					len2:	1,
					last1:	cur1,
					TREE:	nexTREE
				});
				if (ret !== false) {
					// 加入匹配的{参数}
					if (!ret.arguments)
						ret.arguments = [];
					ret.arguments.unshift(currw2.w);
				}
				//debug('+++++++++++++++++');
				return ret;
			}
			else {
				var pushargument = [currw2.w];
			}
		}
		else {
			args.TREE = args.TREE['#' + currw2.p];
			args.cur1 = args.words1.length;
			var pushargument = [currw2.w];
		}
	}
	
	// 如果尾部不能完全匹配
	//debug('结束');
	//debug(args);
	if ('$$$' in args.TREE && args.cur1 >= parseInt(args.words1.length * MIN_MATCH_PERCENT)) {
		var ret = {length: args.cur1, template: args.TREE['$$$'], fully: false}
		if (pushargument)
			ret.arguments = pushargument;
		//debug(currw1);
		//debug(currw2);
		return ret;
	}
	else {
		//debug('***************************************');
		return false;
	}
}
