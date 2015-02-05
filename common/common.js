/**
 * Created by bossliu on 15-1-30.
 */
// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

Date.prototype.add = function (obj) { // obj = {year:1,month:-1,day:2};
    var year = this.getFullYear(), month = this.getMonth(), time = this.getHours() * 60 * 60 * 1000 + this.getMinutes() * 60 * 1000;
    for (var q in obj) {
        if (q == "year") {
            year += obj[q]
        } else if (q == "month") {
            month += obj[q];
            if (month > 12) {
                year += parseInt(month / 12);
                month -= 12;
            } else if (month < 1) {
                month = 12 + month;
                year += parseInt(month / 12);
            }
        } else if (q == "day") {
            time += obj[q] * 24 * 60 * 60 * 1000;
        } else if (q == "hour") {
            time += obj[q] * 60 * 60 * 1000;
        } else if (q == "minute") {
            time += obj[q] * 60 * 1000;
        }
    }
    return new Date(new Date(year + "/" + (month + 1) + "/" + this.getDate()).getTime() + time);
}

//
function magicTime(localDate, serviceDate) {  // localDate = "2014/01/12 12:30"
    var tempLocalDate = localDate.replace(/-/g, "/");
    if (typeof serviceDate == "string") {
        //var serviceDate = new Date($.ajax({ async: false }).getResponseHeader("Date"));
        //网上看到的 serviceDate = new Date(new Date(serviceDate) + 3600000 * 8);
        //转为相应的时区（东八区），不过http响应头返回的Date就是当前时区的，所以不需要再计算
        serviceDate = new Date(serviceDate);
    }
    var date = new Date(tempLocalDate),
        now = serviceDate ? serviceDate : new Date(),
        dateTime = date.getTime(),
        maxDate = now.getTime(),
        miniDate = now.addDate({ day: -30 }).getTime(),
        minDay = now.addDate({ hour: -24 }).getTime(),
        minHour = now.addDate({ hour: -1 }).getTime();

    if (date.toString() == "Invalid Date") {
        return localDate;
    }
    if (dateTime <= miniDate || dateTime > maxDate) {
        return localDate;
    } else if (dateTime <= minDay) {
        return Math.floor((maxDate - dateTime) / (1000 * 60 * 60 * 24)) + "天前";
    } else if (dateTime <= minHour) {
        return Math.floor((maxDate - dateTime) / (1000 * 60 * 60)) + "小时前";
    } else {
        var minutesDiff = Math.floor((dateTime - maxDate) / 60000);
        if (minutesDiff == 0 || minutesDiff == 1 || minutesDiff == -1) {
            return "刚刚";
        } else {
            return (minutesDiff * -1) + "分钟前";
        }
    }
}
//获取字节数
function getCharCount(str) {
    str = $.trim(str);
    var byteLength = function (b) {
        var a;
        if (typeof b == "undefined") {
            return 0;
        }
        a = b.match(/[^\x00-\x80]/g);
        return (b.length + (!a ? 0 : a.length))
    };
    if (str.length > 0) {
        return Math.ceil(byteLength(str) / 2);
    } else {
        return 0
    }
}