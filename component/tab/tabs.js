/**
 * Created by bossliu on 14-10-18.
 * tab slideTab
 */
;!function ($) {
    "use strict"
    function Tab (element, options) {
        var self = this;
        self.$element = $(element);
        self.options = options;
        self.contentBox = self.$element.siblings('.tabContent');
        self.tabItems = self.$element.find('>li');
        self.itemWidth = self.tabItems.eq(0).outerWidth();
        if(self.options.type == 'slideTab'){
            self.contentBox = self.$element.closest('.slideTabBox')
                .find('.tabContent:first').parent().find('>.tabContent');
        }
        self.$element.on('click', 'li', function(){
            var li = $(this), index = li.index(), curContent = self.contentBox.eq(index);
            li.addClass('active').siblings().removeClass('active');
            curContent.addClass('active').siblings('.tabContent').removeClass('active');
            (typeof  self.options.change === 'function') && self.options.change.call(li, curContent, self.$element, index);
        });
        self.$element.find('li.active').trigger('click');
        self._slideTabInit();
        (typeof options.afterInit === 'function') && options.afterInit.call(null, self);
    };
    Tab.prototype._slideTabInit = function () {
        var self = this,
            options = self.options,
            $ele = self.$element,
            tabLeftArrow,
            tabRightArrow;
        var flag = true;
        if(options.type == 'slideTab'){
            $ele.width(self.itemWidth * self.tabItems.length);
            tabLeftArrow = $ele.closest('.slideTabBox').find('.leftTabArrow:first');
            tabRightArrow = $ele.closest('.slideTabBox').find('.rightTabArrow:first');
            tabLeftArrow.on('click', function(){
                var leftArrow = $(this);
                if($ele.position().left == 0 || !flag){
                    return;
                }else{
                    flag = false;
                    $ele.animate({
                        right:'-=' + self.itemWidth
                    },500, function(){
                        if($ele.position().left == 0){
                            leftArrow.addClass('disableArrow');
                        }
                        tabRightArrow.removeClass('disableArrow');
                        flag = true;
                    });
                }
            });
            tabRightArrow.on('click', function(){
                var rightArrow = $(this);
                if(parseInt($ele.css('right'), 10) == 0 || !flag){
                    return;
                }else{
                    flag = false;
                    $ele.animate({
                        right:'+='+self.itemWidth
                    },500, function(){
                        if(parseInt($ele.css('right'), 10) == 0){
                            rightArrow.addClass('disableArrow');
                        }
                        tabLeftArrow.removeClass('disableArrow');
                        flag = true;
                    });
                }
            });
        }

    };
    $.fn.Tab = function (option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('Tab'),
                options = $.extend({}, $.fn.Tab.defaults, typeof option === 'object' && option || {});
            if (!data) {
                $this.data('Tab', (data = new Tab($this[0], options)));
            }
            if (typeof option === 'object') {
                $this.data('Tab').options = options;
            }else if (typeof option === 'string') {
                data[option]();
            }
        });
    }
    $.fn.Tab.defaults = {
        type: 'normal',  //normal slideTab
        afterInit:null,
        change : null  //change tab callback
    };
    $.fn.Tab.Constructor = Tab;
}(window.jQuery);