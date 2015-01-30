/**
 * Created by aaron.liu on 14-12-08.
 * 自动选择，支持单选和多选，支持只读必须，自定义显示字段和过滤字段等等
 * $.fn.AutoSelect.defaults = {
        readOnly: false, //是否可以输入
        searchItems: 10, //搜索智能提示的数量限制
        maxItems: 1000,  // 最多能选择的数量
        isMultiple: true, //是否多选
        hiddenName: 'test', //存储key的隐藏域名字
        source: null, //静态数据源
        remote: '', //远程数据源地址
        key: 'id', //数据源key字段
        valueDefault: 'name',//数据源默认名字字段
        valueEn: '',//数据源英文名字段
        requiredField: 'required', //必填字段名字（afterinit调用setValue设置默认值required不能删除）
        filterField: 'name,email',//智能提示过滤的字段
        autocompleteWidth: '', // 智能提示下拉框宽度
        afterInit: null,  //初始化完成事件
        change: null, //选择时触发change事件
        msgTemplate: '最多选择{0}条数据', //错误提示信息模板
        focusShowMenu: false, //focus时显示下拉列表
        menuItemTpl: '{{name}}({{email}})' // 下拉menu模板
    };
 */
; (function ($) {
    "use strict";
    function AutoSelect(element, options) {
        this.$element = $(element);
        this.options = options;
        this.$menu = $('<div class="uiComponentAutoSelectMenu"><ul></ul></div>');
        this.$msgBox = $('<div class="uiComponentSelectMsgBox"></div>');
        this.init();
    }
    AutoSelect.prototype = {
        Constructor: AutoSelect,
        init: function () {
            var self = this,
                options = this.options,
                $ele = self.$element;
            $ele.addClass('uiComponentAutoSelectInput').attr('autocomplete', 'off');
            self.emailReg = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            self.similarEmailReg = /([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;
            self.selectedItems = [];  //初始化选中项
            //初始化存放key的隐藏域
            self.$hiddenEl = $ele.parent().find('input[type="hidden"][name="' + options.hiddenName + '"]');
            if (!self.$hiddenEl[0]) {
                self.$hiddenEl = $('<input type="hidden" name="' + options.hiddenName + '" />');
            }
            $ele.wrap($('<div class="uiComponentAutoSelect"></div>'));
            self.$wrap = $ele.parent().width($ele.outerWidth(true));
            self.$hiddenEl.insertBefore($ele);
            //msgTemplate
            options.msgTemplate = options.msgTemplate.replace(/\{\d+\}/g, options.maxItems);
            //多选时初始化展示多选的box
            if (options.isMultiple) {
                self.$multipleBox = $('<div class="uiComponentAutoSelectMultipleBox">' +
                    '<ul class="uiComponentClear">' +
                    '<li class="uiComponentAutoSelectSearchBox"></li>' +
                    '</ul>' +
                    '</div>');
                self.$multipleBox.appendTo($ele.parent()).width($ele.width());
                $ele.appendTo(self.$multipleBox.find('.uiComponentAutoSelectSearchBox'))
                    .width(20);
                $ele.data('placeholder', $ele.attr('placeholder'));
                self.setPlaceHolder();
                self.$wrap.width(self.$multipleBox.outerWidth());
            }
            //提示消息box
            self.$msgBox.appendTo(self.$wrap);
            //初始化autocomplete下拉box
            if (options.readOnly) {
                $ele.attr('readonly', 'readonly');
            } else {
                self.$menu.appendTo($('body'));
                self.$menu.width(options.autocompleteWidth || self.$wrap.width());
            }
            //绑定事件
            self.bindEvent();
            if ($.isFunction(options.afterInit)) {
                options.afterInit.call(self, options);
            }
        },
        bindEvent: function () {
            var self = this,
                options = self.options;
            self.$element.bind('focus', $.proxy(self.focus, self));
            self.$element.bind('blur', $.proxy(self.blur, self));
            self.$element.bind('paste', function () {
                var _this = $(this);
                setTimeout(function () {
                    self.checkEmailSelect();
                }, 150);
            });
            self.$menu.delegate('li', 'mouseover', function () {
                $(this).addClass('active').siblings().removeClass('active');
            });
            self.$menu.delegate('li', 'click', function (e) {
                clearTimeout(self.blurSetValTimer);
                self.selectMenu();
            });
            if (!options.readOnly) {
                self.$element.bind('keyup', $.proxy(self.keyup, self));
                self.$element.bind('keydown', $.proxy(self.keydown, self));
            }
            self.$hiddenEl.bind('change', function () {
                var ids = $(this).val().split(',');
                self.addItems(ids);
            })
            self.$wrap.bind('click', function (e) {
                var curKey,
                    target = $(e.target);
                if (options.isMultiple) {
                    if (target.is('i')) {
                        curKey = target.closest('li').data('id');
                        self.deleteItem(curKey);
                    } else {
                        self.$element.show().trigger('focus');
                    }
                } else {
                    self.$element.focus();
                }
            });

        },
        getListPos: function () {
            var self = this,
                $ele = self.$element,
                left = $ele.offset().left,
                top = $ele.offset().top + $ele.outerHeight(true);
            if (self.options.isMultiple) {
                left = self.$multipleBox.offset().left;
                top = self.$multipleBox.offset().top + self.$multipleBox.outerHeight(true);
            }
            return {
                left: left,
                top: top
            };
        },
        getEmailSource: function () {
            var source = this.options.source,
                emails = $.map(source, function (v, k) {
                    return v['email'];
                });
            return emails;
        },
        setSearchBoxWidth: function () {
            var self = this,
                $ele = self.$element;
            $ele.width(0);  //reset position
            $ele.width(self.$multipleBox.width() - $ele.position().left - 1);
        },
        getUniqueId: (function () {
            var id = 1;
            return function () {
                return id += 1;
            };
        })(),
        setPlaceHolder: function () {
            var self = this,
                $ele = self.$element,
                placeHolder = $ele.data('placeholder') || $ele.attr('placeholder') || '';
            if (self.selectedItems.length > 0) {
                $ele.attr('placeholder', '');
            } else {
                self.setSearchBoxWidth();
                $ele.attr('placeholder', placeHolder).show();
            }
        },
        focus: function (e) {
            var self = this,
                $ele = self.$element,
                opts = self.options;
            if (opts.isMultiple) {
                self.setSearchBoxWidth();
                self.setPlaceHolder();
                $ele.show();
            }
            if (opts.focusShowMenu) {
                self.lookup();
            }
        },
        blur: function (e) {
            var self = this,
                options = self.options,
                $ele = self.$element,
                eleVal = $.trim($ele.val()),
                $hiddenEle = self.$hiddenEl,
                hiddenVal = $hiddenEle.val().split(','),
                equalFlag = false;
            if (eleVal == '') {
                if (!options.isMultiple && hiddenVal.length > 0) {
                    self.deleteItem(hiddenVal);
                }
            } else {
                self.blurSetValTimer = setTimeout(function () {
                    $.each(options.source, function (k, v) {
                        if (v[options.valueDefault] == eleVal) {
                            if ($.inArray(v[options.key] + '', hiddenVal) == -1) {
                                self.selectItem(v);
                            }
                            equalFlag = true;
                            return false;
                        }
                    })
                }, 200);
            }
            if (this.options.isMultiple) {
                $ele.width(20).hide().val('');
                self.setPlaceHolder();
            } else if (!equalFlag) {
                $ele.val('');
                $hiddenEle.val('');
            }
        },
        blurSetValTimer: null,
        keydown: function (e) {
            switch (e.keyCode) {
                case 8:
                    this.query = this.$element.val();
                    break;
                case 9: // tab
                case 13: // enter
                    //阻止提交表单
                    e.preventDefault();
                    break;
                default:
                    break;
            }
        },
        keyup: function (e) {
            var self = this,
                options = self.options,
                menuVisible = self.$menu.is(':visible');
            switch (e.which) {
                case 8:
                    if (self.query != '') {
                        this.lookup();
                        return;
                    }
                    //退格删除选择项
                    var selectedValue = self.getValue(),
                        selectedValueLen = selectedValue.length,
                        deletingItem; //要删除的项
                    if (selectedValueLen) {
                        deletingItem = selectedValue[selectedValueLen -1];
                        if (!deletingItem[options['requiredField']]) {   //非必填项可以删除
                            self.deleteItem(selectedValue[selectedValueLen - 1][options['key']]);
                        }
                    }
                    break;
                case 13: // enter
                    if (!menuVisible) {
                        return;
                    }
                    this.selectMenu();
                    break;
                case 16: // shift
                case 17: // ctrl
                case 18: // alt
                    break;
                case 27: // escape
                    this.hideMenu();
                    break;
                case 38: // up arrow
                    e.preventDefault();
                    this.prev();
                    break;
                case 40: // down arrow
                    e.preventDefault();
                    this.next();
                    break;
                case 59://分号
                case 186://IE
                    //核对邮箱选择
                    self.checkEmailSelect();
                    break;
                default:
                    this.lookup();
                    break;
            }
            e.stopPropagation();
            e.preventDefault();
        },
        lookup: function () {
            var self = this,
                options = self.options;
            self.query = self.$element.val();
            self.queryItems = $.grep(options.source, function (v, k) {
                return self.matcher(v);
            });
            self.queryItems = self.sorter(self.queryItems);
            self.renderMenu(self.queryItems);
        },
        matcher: function (item) {
            var options = this.options, query = this.query.toLowerCase();
            if (query == '' && options.focusShowMenu) {
                return true;
            }
            if (query == '') {
                return false;
            }
            var filterField = options.filterField.split(','), filterResult = 0;
            $.each(filterField, function (k, v) {
                filterResult = ~item[v].toLowerCase().indexOf(query);
                if (filterResult) {
                    return false;
                }
            })
            return filterResult;
        },
        sorter: function (items) {
            var options = this.options,
                query = this.query.toLowerCase(),
                item,
                valueDefault = '',
                valueEn = '',
                nearestItems = [], //和查询最接近的
                nearerItems = [],
                nearItems = [];
            while (item = items.shift()) {
                valueDefault = item[options.valueDefault].toLowerCase();
                valueEn = options.valueEn ? item[options.valueEn].toLowerCase() : '';
                if (!valueDefault.indexOf(query) || !valueEn.indexOf(query)) {
                    nearestItems.push(item);
                } else if (~valueDefault.indexOf(query) || ~valueEn.indexOf(query)) {
                    nearerItems.push(item);
                } else {
                    nearItems.push(item)
                }
            }
            return nearestItems.concat(nearerItems, nearItems);
        },
        prev: function (e) {
            var active = this.$menu.find('.active').removeClass('active'),
                prev = active.prev();
            if (!prev.length) {
                prev = this.$menu.find('li').last();
            }
            prev.addClass('active');
        },
        next: function (event) {
            var active = this.$menu.find('.active').removeClass('active'),
                next = active.next();
            if (!next.length) {
                next = $(this.$menu.find('li')[0]);
            }
            next.addClass('active');
        },
        selectMenu: function () {
            var self = this,
                options = self.options,
                activeItem = self.$menu.find('.active'),
                activeData = activeItem.data('item');
            self.selectItem(activeData);
            self.hideMenu();
        },
        selectItem: function (item) {
            var self = this,
                options = self.options,
                limitMsgBox = self.$msgBox;
            if (options.isMultiple) {
                self.filterSameArea(item['id']);
                if (self.selectedItems.length >= options.maxItems) {
                    limitMsgBox.text(options.msgTemplate).show();
                    self.$element.val('');
                    return false;
                } else {
                    limitMsgBox.hide();
                }
                self.selectedItems.push(item);
                self.setPlaceHolder();
            } else {
                self.selectedItems = [item];
            }
            self.renderSelectedValue();
            self.change(item);
        },
        deleteItem: function (key) {
            var self = this,
                options = self.options,
                limitMsgBox = self.$msgBox;
            if (limitMsgBox[0]) {
                limitMsgBox.hide();
            }
            self.selectedItems = $.grep(self.selectedItems, function (v, k) {
                return v[options['key']] != key;
            });
            self.renderSelectedValue();
        },
        addItems: function (items) {
            var self = this;
            $.each(items, function (k, v) {
                var item;
                if (typeof v === 'string') {
                    item = self.getItemFromId(v);
                } else {
                    item = v;
                }
                item && self.selectItem(item);
            });
        },
        getItemFromId: function (id) {
            var source = this.options.source, item;
            $.each(source, function (k, v) {
                if (v['id'] == id) {
                    item = v;
                    return false;
                }
            })
            return item;
        },
        checkEmailSelect: function () {
            var self = this,
                options = self.options,
                emails = self.getEmailSource(),
                vals = self.$element.val().replace(/；/g, ';'),
                valsArr = vals.replace(/;$/, '').split(';');
            var newVals = vals;
            //根据输入的值判断是否为已存在的邮箱，是则自动选择上
            $.each(valsArr, function (k, v) {
                var index;
                self.emailReg.lastIndex = 0;
                self.similarEmailReg.lastIndex = 0;
                var similarEmail = self.similarEmailReg.exec(v),
                    similarMatchStr;
                if (self.emailReg.test(v) && (index = $.inArray(v, emails)) > -1) {
                    similarMatchStr = v;
                    setFilledEmail();
                } else if (similarEmail && (index = $.inArray(similarEmail[0], emails)) > -1) {
                    similarMatchStr = similarEmail['input']
                                            .replace(/\(/g, '\\(')
                                            .replace(/\)/g, '\\)').replace(/\:/g, '\\:');
                    setFilledEmail();
                }
                function setFilledEmail() {
                    newVals = newVals.replace(new RegExp(similarMatchStr + '(;|$)'), '');
                    self.selectItem(options.source[index]);
                    self.$element.val(newVals);
                }
            });

        },
        getSelectedKeys: function () {
            var options = this.options,
                keys = $.map(this.selectedItems, function (v, k) {
                    return parseInt(v[options.key]);
                });
            return keys;
        },
        change: function (item) {
            var self = this,
                options = self.options;
            if ($.isFunction(options.change)) {
                options.change.call(self, options);
            }
            self.$element.trigger('change');
        },
        filterSameArea: function (key) {  //过滤已经存在的选项
            var self = this,
                options = self.options,
                selectedItems = self.selectedItems,
                keys = $.map(selectedItems, function (v, k) {
                    return v['id'] + '';
                }),
                arrIndex = $.inArray(key + '', keys);
            if (~arrIndex) {
                selectedItems.splice(arrIndex, 1);
            }
        },
        transferObjToStr: function (obj) {
            var self = this,
                retStr = '';
            if (obj === null || obj === undefined || typeof obj === 'number' || typeof obj === 'boolean' || obj instanceof Function) {
                retStr = '"' + String(obj) + '"';
            } else if (typeof obj === 'string') {
                retStr = '"' + obj + '"';
            } else if ($.isArray(obj)) {
                retStr += '[';
                for (var i, j = obj.length; i < j; i++) {
                    retStr += self.transferObjToStr(obj[i]);
                    if (i < j - 1) {
                        retStr += ',';
                    }
                }
                retStr += ']';
            } else if ($.isPlainObject(obj)) {
                retStr += '{';
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        retStr += '"' + (i + '') + '":';
                        retStr += self.transferObjToStr(obj[i]) + ',';
                    }
                }
                retStr = retStr.substring(0, retStr.length - 1);
                retStr += '}';
            } else if (obj instanceof Date) {
                retStr = obj.getTime();
            }
            return retStr;
        },
        hideMenu: function () {
            this.$menu.hide();
        },
        renderMenu: function (items) {
            var self = this, options = self.options, menuReg = /{{(\w+)}}/g;
            items = $.map(items.slice(0, options.searchItems), function (v, k) {
                var key,
                    itemContent = options.menuItemTpl;
                // 根据传入的模板替换相应的内容
                while (key = menuReg.exec(options.menuItemTpl)) {
                    itemContent = itemContent.replace(new RegExp('\{\{' + key[1] + '\}\}', 'g'), v[key[1]]);
                }
                var itemStr = self.transferObjToStr(v);
                return '<li title="' + v[options['valueDefault']] + '" data-item=\'' + itemStr + '\'>' + itemContent + '</li>';
            });
            self.$menu.find('ul').empty().append(items.join(''));
            self.$menu.show().find('li:first').addClass('active');
            var menuPos = self.getListPos();
            self.$menu.css({
                left: menuPos.left,
                top: menuPos.top
            });
        },
        setValue: function (ids) {
            var self = this,
                options = self.options;
            self.selectedItems = [];
            if (ids == '' || ids == null) {
                self.renderSelectedValue();
                return;
            }
            if (typeof ids === 'string') {
                ids = [parseInt(ids)];
            } else if (typeof ids === 'number') {
                ids = [ids];
            }
            if (!options.isMultiple) {
                ids = [ids[0]];
            }
            $.each(ids, function (i, id) {
                var item;
                $.each(options.source, function (k, v) {
                    if (v[options.key] == id) {
                        item = v;
                        item['id'] = parseInt(id);
                        item['name'] = v[options.valueDefault];
                        self.selectedItems.push(item);
                        return false;
                    }
                });
            });
            self.setPlaceHolder();
            self.renderSelectedValue();
        },
        getValue: function () {
            return this.selectedItems || '';
        },
        renderSelectedValue: function () {
            var self = this,
                options = self.options,
                selectedItems = self.selectedItems,
                keys = $.map(selectedItems, function (v, k) {
                    return v[options['key']];
                }),
                $ele = self.$element,
                $hiddenEl = self.$hiddenEl,
                multItems = '',
                multSearchBox;
            if (!options.isMultiple) {
                $ele.val(selectedItems[0] && selectedItems[0][options['valueDefault']] || '');
                $hiddenEl.val(keys[0] || '');
            } else {
                $hiddenEl.val(keys.join(','));
                multSearchBox = $ele.parent();
                $.each(selectedItems, function (k, v) {
                    var valueDefault = v[options['valueDefault']],
                        closeItem = '<i>×</i>';
                    //是否为必选项
                    if (v[options['requiredField']]) {
                        closeItem = '';
                    }
                    multItems += '<li data-id="' + v[options['key']] + '" title="' + valueDefault + '"><span>' + valueDefault + '</span>' + closeItem + '</li>';
                });
                multSearchBox.prevAll().remove();
                $(multItems).insertBefore(multSearchBox);
                $ele.val('');
                self.setSearchBoxWidth();
            }
        },
        destroy: function () {

        }
    };
    $.fn.AutoSelect = function (option) {
        return this.each(function () {
            var $this = $(this),
                data = $this.data('AutoSelect'),
                opts = typeof option === 'object' ? option : {},
                options = $.extend({}, $.fn.AutoSelect.defaults, opts);
            var init = function () {
                $this.data('AutoSelect', (data = new AutoSelect($this[0], options)));
            };
            if (!data) {
                if (options.source) {
                    init();
                } else if (options.remote) {
                    $.get(options.remote, function (result) {
                        if (typeof result == 'string') {
                            result = $.parseJSON(result);
                        }
                        if (result['success']) {
                            options.source = result['data'];
                            init();
                        } else {
                            data.showOtips(result['message'], true);
                        }
                    })
                }
            }
            if (typeof option === 'string') {
                data[option]();
            }
        });
    };
    $.fn.AutoSelect.defaults = {
        readOnly: false, //是否可以输入
        searchItems: 10, //搜索智能提示的数量限制
        maxItems: 1000,  // 最多能选择的数量
        isMultiple: true, //是否多选
        hiddenName: 'test', //存储key的隐藏域名字
        source: null, //静态数据源
        remote: '', //远程数据源地址
        key: 'id', //数据源key字段
        valueDefault: 'name',//数据源默认名字字段
        valueEn: '',//数据源英文名字段
        requiredField: 'required', //必填字段名字（afterinit调用setValue设置默认值required不能删除）
        filterField: 'name,email',//智能提示过滤的字段
        autocompleteWidth: '', // 智能提示下拉框宽度
        afterInit: null,  //初始化完成事件
        change: null, //选择时触发change事件
        msgTemplate: '最多选择{0}条数据', //错误提示信息模板
        focusShowMenu: false, //focus时显示下拉列表
        menuItemTpl: '{{name}}({{email}})' // 下拉menu模板
    };
    $.fn.AutoSelect.Constructor = AutoSelect;
    $(document).bind('click.autoSelect', function (e) {
        var target = $(e.target);
        if (!target.is('.uiComponentAutoSelectMenu')
            && !target.parents('.uiComponentAutoSelectMenu').length
            && !target.is('input[type="submit"]')
            && !target.is('.uiComponentAutoSelectInput')
            && !target.is('.uiComponentAutoSelectMultipleBox .uiComponentClear')) {
            $('.uiComponentAutoSelectMenu').hide();
        }
    });
})(window.jQuery);