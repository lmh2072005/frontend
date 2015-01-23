function showMsgFn(opts) {
    var defaultOpts = {
        area: $(document),
        msg: '',
        type: 'warning',
        css: {},
        duration: 1000,
        callback: null,
        hideType: 'fadeOut'
    },
    hideType = {
        hide: function (obj) { obj.hide(); },
        fadeOut: function (obj) { obj.fadeOut(); },
        fadeUp: function (obj) {
            obj.animate({ 'top': '-=40px', 'opacity': 0}, 2000, function () {
                obj.hide();
            });
        }
    },
    msgTypeColor = {
        warning : '#ff3300',
        success: '#20a936'
    };
    opts = $.extend(defaultOpts, opts);
    var area = $(opts.area);
    var submitMsgBox = $('#uiShowMsgBox'), areaOffset = area.offset();
    if (!submitMsgBox[0]) {
        submitMsgBox = $('<div id="uiShowMsgBox">' + opts.msg + '</div>');
        $('body').append(submitMsgBox);
    } else {
        submitMsgBox.html(opts.msg);
    }
    submitMsgBox.css({
        'position':'absolute',
        'text-align':'center',
        'font-size':'16px',
        'opacity':1,
        'left': areaOffset.left,
        'top': areaOffset.top,
        'width': area.outerWidth(),
        'height': area.outerHeight(),
        'line-height': area.outerHeight() + 'px',
        'color': msgTypeColor[opts.type]
    }).css(opts.css).show();
    setTimeout(function () {
        var hideTypeFn = hideType[opts.hideType];
        if (typeof hideTypeFn === 'function') {
            hideTypeFn(submitMsgBox);
        }
        if (typeof opts.callback === 'function') {
            opts.callback.call(null, opts);
        }
    }, opts.duration);
}