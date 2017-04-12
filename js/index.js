$(function () {
	//搜索按钮
	$('#searchButton').button({
		icons : {
			primary : 'ui-icon-search',
		},
	});

	//提问按钮
	$('#quesButton').button({
		icons : {
			primary : 'ui-icon-lightbulb',
		},
	}).click(function () {
		if ($.cookie('user')){	//如果用户登录了，点击提问按钮，弹出提问对话框
			$('#question').dialog('open');
		}else {		//如果用户没有登录，提示错误信息，1s后自动关闭对话框并打开登录对话框
			$('#error').dialog('open');
			setTimeout(function () {
				$('#error').dialog('close');
				$('#login').dialog('open');
			}, 1000);
		}
	});

	//通过ajax实现提问、回答和评论的数据交互
	$.ajax({
		//通过ajax获取提问和回答的数据并显示
		url : 'show_content.php',
		type : 'POST',
		success : function (response, status, xhr) {
			var json = $.parseJSON(response);		//把返回的数据转换成json格式，方便操作
			var html = '';
			var arr = [];		//数组，用来操作指定索引的editor文本内容
			var summary = [];		//存储摘要（部分）内容
			//遍历json，把数据通过改变html内容添加元素节点的方式添加到显示内容content的div里
			$.each(json, function (index, value) {
				html += '<h4>' + value.user + '发表于' + value.date + '</h4><h3>' + value.title + '</h3><div class="editor">' + value.content + '</div><div class="bottom"><span class="comment" dataID="' + value.id + '">' + value.count + '条评论</span><span class="up">收起</span></div><hr noshade="noshade" size="1"/><div class="commentList"></div>';
			});
			$('.content').append(html);

			//使用字符串截取的方式显示摘要
			$.each($('.editor'), function (index, value) {
				arr[index] = $(value).html();		//存储原始的完整html字符串
				summary[index] = arr[index].substr(0, 200);		//从第一个字符开始截取指定数量的字符作为摘要内容
				//把特殊字符替换成空字符（注意这里第二个传参pos是最后一位的索引值）
				if (summary[index].substring(199, 200) == '<') {
					summary[index] = replacePos(summary[index], 200, '');
				}
				if (summary[index].substring(198, 200) == '</') {
					summary[index] = replacePos(summary[index], 200, '');	//注意，替换两个以上字符时，先从后面的开始替换，顺序不能错
					summary[index] = replacePos(summary[index], 199, '');
				}
				//默认显示摘要
				if (arr[index].length > 200) {	//当原始html字符串长度大于指定长度的时候
					summary[index] += '...<span class="down">显示全文</span>';	//在摘要后面动态加上“显示全文”span元素节点
					$(value).html(summary[index]);	//显示摘要内容
				}
				$('.bottom .up').hide();	//隐藏全部的“收起”
			});
			//切换显示全文
			$.each($('.editor'), function (index, value) {	//当用户点击“显示全文”时触发，但因为“显示全文”是动态添加，需要使用事件委托
				$(this).on('click', '.down', function () {	//事件委托，委托“显示全文”的父元素editor触发事件
					$('.editor').eq(index).html(arr[index]);		//把文本内容还原成原始的html字符串，显示全文内容
					$(this).hide();	//隐藏“显示全文”
					$('.bottom .up').eq(index).show();	//显示“收起”
				});
			});
			//切换显示摘要
			$.each($('.bottom'), function (index, value) {	//当用户点击“收起”时触发，这里可以不用事件委托，但为了和显示全文统一，也使用事件委托
				$(this).on('click', '.up', function () {
					$('.editor').eq(index).html(summary[index]);		//把文本内容设置为指定数量的字符，显示摘要
					$(this).hide();	//隐藏“收起”
					$('.editor .down').eq(index).show();	//显示“显示全文”
				});
			});

			//评论功能
			$.each($('.bottom'), function (index, value) {
				$(this).on('click', '.comment', function () {		//点击“x条评论”触发，因为评论表单元素是动态添加的，要用事件委托方式
					var commentThis = this;		//此处this表示.comment
					if ($.cookie('user')){		//如果用户登录了，可以使用发表评论功能
						if (!$('.commentList').eq(index).has('form').length) {	//如果评论列表不存在，先添加评论列表元素节点
							//加载显示评论区
							$.ajax({	//通过ajax加载评论的数据
								url : 'show_comment.php',
								type : 'POST',
								data : {
									titleid : $(commentThis).attr('dataID'),
								},
								beforeSend : function (jqXHR, settings) {		//提交成功之前执行，显示加载中提示信息
									$('.commentList').eq(index).append('<dl class="commentLoad"><dd>正在加载评论</dd></dl>');
								},
								success : function (response, status) {		//提交成功后执行的回调函数
									$('.commentList').eq(index).find('.commentLoad').hide();	//隐藏加载中提示信息
									//显示评论内容
									var jsonComment = $.parseJSON(response);		//把返回的数据转换成json格式，方便操作
									var count = 0;	//服务器端分页的页数
									$.each(jsonComment, function (index2, value) {	//添加显示评论内容区域的html元素节点
										count = value.count;
										$('.commentList').eq(index).append('<dl class="commentContent"><dt>' + value.user + '</dt><dd>' + value.comment + '</dd><dd class="date">' + value.date + '</dd></dl>');
									});
									//加载显示更多评论
									$('.commentList').eq(index).append('<dl><dd><span class="loadMore">加载更多评论</span></dd></dl>');
									var page = 2;	//每次加载增加的评论数
									if (page > count) {	//当page大于服务器端分页的页数count时，也就是全部数据都加载完毕了，移除click事件，点击之后不能再加载
										$('.commentList').eq(index).find('.loadMore').off('click');
										$('.commentList').eq(index).find('.loadMore').hide();	//全部数据都加载完毕之后，隐藏加载更多按钮
									}
									$('.commentList').eq(index).find('.loadMore').button().on('click', function () {
										$('.commentList').eq(index).find('.loadMore').button('disable');
										$.ajax({
											url : 'show_comment.php',
											type : 'POST',
											data : {
												titleid : $(commentThis).attr('dataID'),
												page : page,
											},
											beforeSend : function (jqXHR, settings) {
												$('.commentList').eq(index).find('.loadMore').html('<img src="img/more_load.gif"/>');
											},
											success : function (response, status) {
												var jsonCommentMore = $.parseJSON(response);		//把返回的数据转换成json格式，方便操作
												$.each(jsonCommentMore, function (index3, value) {	//添加显示评论内容区域的html元素节点
													$('.commentList').eq(index).find('.commentContent').last().after('<dl class="commentContent"><dt>' + value.user + '</dt><dd>' + value.comment + '</dd><dd class="date">' + value.date + '</dd></dl>');
												});
												$('.commentList').eq(index).find('.loadMore').button('enable');
												$('.commentList').eq(index).find('.loadMore').html('加载更多评论');
												page++;
												if (page > count) {	//当page大于服务器端分页的页数count时，也就是全部数据都加载完毕了，移除click事件，点击之后不能再加载
													$('.commentList').eq(index).find('.loadMore').off('click');
													$('.commentList').eq(index).find('.loadMore').hide();	//全部数据都加载完毕之后，隐藏加载更多按钮
												}
											}
										});
									});
									//添加发表评论的表单元素
									$('.commentList').eq(index).append('<form><dl class="addComment"><dt><textarea name="comment"></textarea></dt><dd><input type="hidden" name="titleid" value="' + $(commentThis).attr('dataID') + '"/><input type="hidden" name="user" value="' + $.cookie('user') + '"/><input type="button" value="发表"></dd></dl></form>');
									//提交评论表单
									$('.commentList').eq(index).find('input[type=button]').button().click(function () {
										var _this = this;	//传递this，此处this是$('.commentList').eq(index).find('input[type=button]')
										$('.commentList').eq(index).find('form').ajaxSubmit({	//限定表单，把评论绑定在对应的问题上，防止互相混乱
											url : 'add_comment.php',
											type : 'POST',
											beforeSubmit : function (formData, jqForm, options) {
												$('#loading').dialog('open');
												$(_this).button('disable');
											},
											success : function (responseText, statusText) {
												if (responseText) {
													$(_this).button('enable');
													$('#loading').css('background', 'url(img/success.gif) no-repeat 20px center').html('发表成功！');
													setTimeout(function () {
														//提交评论后，自动在评论区最上方显示用户最新发表的评论
														var date = new Date();
														$('.commentList').eq(index).prepend('<dl class="commentContent"><dt>' + $.cookie('user') + '</dt><dd>' + $('.commentList').eq(index).find('textarea').val() + '</dd><dd>' + date.getFullYear() + '-' + (date.getMonth()+ 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '</dd></dl>');
														$('#loading').dialog('close');
														$('#loading').css('background', 'url(img/loading.gif) no-repeat 20px center').html('数据交互中...');
														$('.commentList').eq(index).find('form').resetForm();
													},1000);
												}
											},
										});
									});
								},
							});
						}
						if ($('.commentList').eq(index).is(':hidden')) {	//如果评论列表是隐藏的话，点击之后打开
							$('.commentList').eq(index).show();
						}else {			//如果评论列表是打开的话，点击之后隐藏
							$('.commentList').eq(index).hide();
						}
					}else {		//如果用户没有登录，提示错误信息，1s后自动关闭对话框并打开登录对话框
						$('#error').dialog('open');
						setTimeout(function () {
							$('#error').dialog('close');
							$('#login').dialog('open');
						}, 1000);
					}
				});
			});
		},
	});

	//替换特殊字符的函数
	function replacePos(strObj, pos, replacetext) {	//传参：strObj是原始字符串，pos是位置的索引值，从0开始，replacetext是替换的字符串
		var str = strObj.substr(0, pos-1) + replacetext + strObj.substring(pos, strObj.length);
		return str;
	};

	//提问对话框
	$('#question').dialog({
		autoOpen : false,
		modal : true,
		resizable : false,
		width : 500,
		height : 360,
		buttons : {
			'发布' : function () {
				$(this).ajaxSubmit({	//通过ajax提交提问
					url : 'add_content.php',
					type : 'POST',
					data : {
						user : $.cookie('user'),	//用户名
						content : $('.uEditorIframe').contents().find('#iframeBody').html(),	//问题描述内容
					},
					beforeSubmit : function (formData, jqForm, options) {
						$('#loading').dialog('open');		//提交之后，显示loading对话框，提示用户数据交互中
						$('#question').dialog('widget').find('button').eq(1).button('disable');	//点击提交表单之后，禁用提交按钮，防止多次点击
					},
					success : function (responseText, statusText) {
						if (responseText) {
							$('#question').dialog('widget').find('button').eq(1).button('enable');	//提交数据成功之后，启用提交按钮
							//显示数据发布成功提示信息
							$('#loading').css('background', 'url(img/success.gif) no-repeat 20px center').html('发布成功！');
							//设置1s之后自动关闭提问和提示对话框，并重置提问、提示对话框和编辑器插件的文本内容
							setTimeout(function () {
								$('#loading').dialog('close');
								$('#loading').css('background', 'url(img/loading.gif) no-repeat 20px center').html('数据交互中...');
								$('#question').dialog('close');
								$('#question').resetForm();
								$('.uEditorIframe').contents().find('#iframeBody').html('请输入问题描述...');
							},1000);
						}
					},
				});
			}
		}
	});
	$('.uEditorCustom').uEditor();	//给提问对话框引入文本编辑器插件

	//错误提示信息对话框
	$('#error').dialog({
		autoOpen : false,
		modal : true,
		closeOnEscape : false,
		resizable : false,
		draggable : false,
		width : 180,
		height : 50,
	}).parent().find('.ui-widget-header').hide();

	//当用户注册成功之后，自动默认为登录状态，右上角显示用户名|退出
	$('#member, #logout').hide();		//一开始用户名和退出隐藏

	if ($.cookie('user')) {		//若用户注册成功（即生成了cookie），显示“用户名|退出”
		$('#member, #logout').show();
		$('#regA, #loginA').hide();
		$('#member').html($.cookie('user'));	//通过cookie获取显示的用户名
	}else {			//若用户没有注册成功（即没有生成cookie），显示“注册|登录”
		$('#member, #logout').hide();
		$('#regA, #loginA').show();
	}

	//退出登录状态
	$('#logout').click(function () {	//用户点击了退出按钮之后
		$.removeCookie('user');		//删除cookie
		window.location.href = '/jquery-zhiwen/';	//直接跳转到首页
	});

	//以对话框形式设置数据交互中的提示信息
	$('#loading').dialog({
		autoOpen : false,
		modal : true,
		closeOnEscape : false,
		resizable : false,
		draggable : false,
		width : 180,
		height : 50,
	}).parent().find('.ui-widget-header').hide();	//隐藏loading对话框的header标头部分

	//注册对话框
	//点击注册后弹出注册对话框
	$('#regA').click(function () {
		$('#reg').dialog('open');
	});
	//注册对话框初始化
	$('#reg').dialog({
		autoOpen : false,
		modal : true,
		resizable : false,
		width : 320,
		height : 340,
		buttons : {
			'提交' : function () {
				$(this).submit();
			}
		}		//buttonset()把注册对话框中的性别单选框转换成按钮选择
	}).buttonset().validate({
		//注册表单验证
		//验证成功后执行的函数，阻止表单的默认提交行为，使用ajax方式代替默认提交
		submitHandler : function (form) {
			$(form).ajaxSubmit({
				url : 'add.php',
				type : 'POST',
				beforeSubmit : function (formData, jqForm, options) {
					$('#loading').dialog('open');		//提交之后，显示loading对话框，提示用户数据交互中
					$('#reg').dialog('widget').find('button').eq(1).button('disable');	//点击提交表单之后，禁用提交按钮，防止多次点击
				},
				success : function (responseText, statusText) {
					if (responseText) {
						$('#reg').dialog('widget').find('button').eq(1).button('enable');	//提交数据成功之后，启用提交按钮
						//显示数据新增成功提示信息
						$('#loading').css('background', 'url(img/success.gif) no-repeat 20px center').html('注册成功！');
						$.cookie('user', $('#user').val());		//生成一个cookie，保存用户名user
						//设置1s之后自动关闭注册和提示对话框，并重置注册表单和提示对话框，在页面右上角显示已登录状态“用户名|退出”
						setTimeout(function () {
							$('#loading').dialog('close');
							$('#loading').css('background', 'url(img/loading.gif) no-repeat 20px center').html('数据交互中...');
							$('#reg').dialog('close');
							$('#reg').resetForm();
							$('#reg span.star').html('*').removeClass('succ');
							$('#member, #logout').show();
							$('#regA, #loginA').hide();
							$('#member').html($.cookie('user'));	//通过cookie获取页面右上角显示的用户名
						},1000);
					}
				},
			});
		},
		//根据显示的错误信息条数动态改变注册对话框的高度
		showErrors : function (errorMap, errorList) {		//获取错误提示句柄
			var errors = this.numberOfInvalids();		//获取错误信息的总条数
			if (errors > 0) {		//如果有错误信息，增加注册对话框的高度
				$('#reg').dialog('option', 'height', errors*20 + 340);
			}else {		//如果没有错误信息，恢复注册对话框的高度初始值
				$('#reg').dialog('option', 'height', 340);
			}
			this.defaultShowErrors();		//执行默认的显示错误信息
		},
		//高亮显示错误的输入框
		highlight : function (element, errorClass) {
			$(element).css('border', '1px solid #630');
			$(element).parent().find('span').html('*').removeClass('succ');	//输入错误之后把成功图标移除
		},
		//验证成功的输入框移出错误高亮，恢复默认的样式
		unhighlight : function (element, errorClass) {
			$(element).css('border', '1px solid #ccc');
			$(element).parent().find('span').html('&nbsp;').addClass('succ');	//验证成功后，把输入框后面的 *星号替换成成功的图标
		},
		//在输入框上方列表显示错误提示信息
		errorLabelContainer : 'ol.regError',	//把错误信息存放到列表ol里，在输入框上方列表显示
		wrapper : 'li',		//给错误信息包裹li标签
		//验证规则，需要验证的元素是user帐号、pass密码、email邮箱、date生日
		rules : {
			user : {
				required : true,
				minlength : 2,
				remote : {	//验证用户输入的用户名是否已被占用，即核对数据库是否已经有相同的用户名
					url : 'is_user.php',	//通过ajax发送数据来验证
					type : 'POST',
				},
			},
			pass : {
				required : true,
				minlength : 6,
			},
			email : {
				required : true,
				email : true,
			},
			date : {
				date : true,
			},
		},
		//验证错误时显示的错误信息
		messages : {
			user : {
				required : '帐号不得为空！',
				minlength : jQuery.format('帐号不得少于{0}位！'),
				remote : '帐号被占用，请重新输入',
			},
			pass : {
				required : '密码不得为空！',
				minlength : jQuery.format('密码不得少于{0}位！'),
			},
			email : {
				required : '邮箱不得为空！',
				minlength : '请输入正确的邮箱地址！',
			},
		},
	});

	//注册对话框中的生日日期选择框
	$('#birthday').datepicker({
		changeMonth : true,
		changeYear : true,
		yearSuffix : '',
		maxDate : 0,	//生日是过去时，未来的日期是不能选择的，可选的最大时期就是当日日期
		yearRange : '1940:2020',
	});

	//注册对话框中的邮箱自动补全功能
	$('#email').autocomplete({
		delay : 0,		//设置不延迟显示
		autoFocus : true,		//设置自动选定第一个选项
		source : function (request, response) {		//利用回调函数自定义邮箱补全功能
			//定义变量
			var hosts = ['qq.com', '163.com', '126.com', 'gmail.com', 'sina.com.cn', 'hotmail.com'],	//补全菜单显示的邮箱域名的数据源
					term = request.term,		//获取用户输入的内容
					name = term,		//邮箱的用户名
					host = '',		//邮箱的域名
					ix = term.indexOf('@'),		//获取 @ 的位置索引值
					result = [];	//最终呈现的完整格式的邮件列表的数组

			result.push(term);	//在自动补全菜单第一条单独显示用户输入的内容

			//获取用户输入的用户名和域名
			if (ix > -1) {	//如果用户输入了 @符号，需要对用户名name和域名host进行筛选
				name = term.slice(0, ix);
				host = term.slice(ix+1);
			}

			//如果用户已经输入@和后面的域名，那么就找到相关的域名提示，比如aaa@1，就提示aaa@163.com；如果没有相关的域名提示，就不显示
			//如果用户还没有输入@或后面的域名，那么就把所有候选的域名都提示出来
			if(name){		//如果name有值
				//如果host有值的情况下，返回筛选出的hosts数组里面带有host字符串的值；如果没有匹配的，就会返回空
				//否则，如果host没有值，也就是用户没有输入域名，那么就返回数据源所有的域名
				var findedHosts = (host ? $.grep(hosts, function (value,index) {return value.indexOf(host) > -1;}) : hosts),
						findedResult = $.map(findedHosts, function (value, index) {		//修改findedHosts数组里的数据
																return name + '@' + value;	//返回完整格式的邮箱地址
														});
				result = result.concat(findedResult);		//最终呈现的完整格式的邮箱地址列表数组
			}
			response(result);		//显示自动补全下拉菜单的内容
		},
	});


	//登录对话框
	//点击登录后弹出登录对话框
	$('#loginA').click(function () {
		$('#login').dialog('open');
	});
	//登录对话框初始化
	$('#login').dialog({
		autoOpen : false,
		modal : true,
		resizable : false,
		width : 320,
		height : 240,
		buttons : {
			'登录' : function () {
				$(this).submit();
			}
		}
	}).validate({
		//登录表单验证
		submitHandler : function (form) {		//验证成功后执行
			$(form).ajaxSubmit({		//ajax提交
				url : 'login.php',
				type : 'POST',
				beforeSubmit : function (formData, jqForm, options) {
					$('#loading').dialog('open');		//提交之后，显示loading对话框，提示用户数据交互中
					$('#login').dialog('widget').find('button').eq(1).button('disable');	//点击登录之后，禁用登录按钮，防止多次点击
				},
				success : function (responseText, statusText) {
					if (responseText) {
						$('#login').dialog('widget').find('button').eq(1).button('enable');	//提交数据成功之后，启用登录按钮
						//显示登录成功提示信息
						$('#loading').css('background', 'url(img/success.gif) no-repeat 20px center').html('登录成功!');
						//生成一个cookie，保存帐号和密码信息
						if ($('#expires').is(':checked')) {		//如果用户选择了7天内免登录
							$.cookie('user', $('#loginUser').val(), {		//那么设置cookie的过期时间为7天
								expires : 7,
							});
						}else {
							$.cookie('user', $('#loginUser').val());	//如果用户没有选择7天内免登录，那么默认关闭浏览器后就清除cookie
						}
						//设置1s之后自动关闭登录和提示对话框，并重置登录表单和提示对话框，在页面右上角显示已登录状态“用户名|退出”
						setTimeout(function () {
							$('#loading').dialog('close');
							$('#loading').css('background', 'url(img/loading.gif) no-repeat 20px center').html('数据交互中...');
							$('#login').dialog('close');
							$('#login').resetForm();
							$('#login span.star').html('*').removeClass('succ');
							$('#member, #logout').show();
							$('#regA, #loginA').hide();
							$('#member').html($.cookie('user'));	//通过cookie获取显示的用户名
						},1000);
					}
				},
			});
		},
		//根据显示的错误信息条数动态改变登录对话框的高度
		showErrors : function (errorMap, errorList) {		//获取错误提示句柄
			var errors = this.numberOfInvalids();		//获取错误信息的总条数
			if (errors > 0) {		//如果有错误信息，增加登录对话框的高度
				$('#login').dialog('option', 'height', errors*20 + 240);
			}else {		//如果没有错误信息，恢复登录对话框的高度初始值
				$('#login').dialog('option', 'height', 240);
			}
			this.defaultShowErrors();		//执行默认的显示错误信息
		},
		//高亮显示错误的输入框
		highlight : function (element, errorClass) {
			$(element).css('border', '1px solid #630');
			$(element).parent().find('span').html('*').removeClass('succ');	//输入错误之后把成功图标移除
		},
		//验证成功的输入框移出错误高亮，恢复默认的样式
		unhighlight : function (element, errorClass) {
			$(element).css('border', '1px solid #ccc');
			$(element).parent().find('span').html('&nbsp;').addClass('succ');	//验证成功后，把输入框后面的 *星号替换成成功的图标
		},
		//在输入框上方列表显示错误提示信息
		errorLabelContainer : 'ol.loginError',	//把错误信息存放到列表ol里，在输入框上方列表显示
		wrapper : 'li',		//给错误信息包裹li标签
		//验证规则，需要验证的元素是loginUser帐号、loginPass密码
		rules : {
			loginUser : {
				required : true,
				minlength : 2,
			},
			loginPass : {
				required : true,
				minlength : 6,
				remote : {		//帐号和密码发送到服务器端验证，只需在密码用ajax发送数据验证即可
					url : 'login.php',
					type : 'POST',
					data : {		//需要额外发送帐号的信息
						loginUser : function () {
							return $('#loginUser').val();
						},
					},
				},
			},
		},
		//验证错误时显示的错误信息
		messages : {
			loginUser : {
				required : '帐号不得为空！',
				minlength : jQuery.format('帐号不得少于{0}位！'),
			},
			loginPass : {
				required : '密码不得为空！',
				minlength : jQuery.format('密码不得少于{0}位！'),
				remote : '帐号或密码不正确！',
			}
		}
	});

	//选项卡
	$('#tabs').tabs();

	//折叠菜单
	$('#accordion').accordion({
		header : 'h3',
	});

});
