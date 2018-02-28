(function (root, factory) {
    if (typeof customLoader === 'function'){ customLoader(factory, 'dates'); }
    else if (typeof define === 'function' && define.amd){ define([], factory); }
    else if(typeof exports === 'object'){ module.exports = factory(); }
    else{ root.returnExports = factory();
        window.dates = factory(); }
}(this, function () {

    'use strict';

    var
        // tests that it is a date string, not a valid date. 88/88/8888 would be true
        dateRegExp = /^(\d{1,2})([\/-])(\d{1,2})([\/-])(\d{4})\b/,
        // 2015-05-26T00:00:00
        tsRegExp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\b/,

        daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        days = [],
        days3 = [],
        dayDict = {},

        months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        monthAbbr = [],
        monthDict = {},

        datePattern = /yyyy|yy|mm|m|MM|M|dd|d/g,
        datePatternLibrary = {
            yyyy: function(date) {
                return date.getFullYear();
            },
            yy: function(date) {
                return (date.getFullYear() + '').substring(2);
            },
            mm: function(date) {
                return pad(date.getMonth() + 1);
            },
            m: function(date) {
                return date.getMonth() + 1;
            },
            MM: function(date) {
                return months[date.getMonth()];
            },
            M: function(date) {
                return monthAbbr[date.getMonth()];
            },
            dd: function(date) {
                return pad(date.getDate());
            },
            d: function(date) {
                return date.getDate();
            }
        },

        dates,

        length = (function() {
            var
                sec = 1000,
                min = sec * 60,
                hr = min * 60,
                day = hr * 24,
                week = day * 7;
            return {
                sec: sec,
                min: min,
                hr: hr,
                day: day,
                week: week
            };
        }());

    // populate day-related structures
    daysOfWeek.forEach(function(day, index) {
        dayDict[day] = index;
        var abbr = day.substr(0, 2);
        days.push(abbr);
        dayDict[abbr] = index;
        abbr = day.substr(0, 3);
        days3.push(abbr);
        dayDict[abbr] = index;
    });

    // populate month-related structures
    months.forEach(function(month, index) {
        monthDict[month] = index;
        var abbr = month.substr(0, 3);
        monthAbbr.push(abbr);
        monthDict[abbr] = index;
    });

    function isLeapYear(dateOrYear) {
        var year = dateOrYear instanceof Date ? dateOrYear.getFullYear() : dateOrYear;
        return !(year % 400) || (!(year % 4) && !!(year % 100));
    }

    function isValidObject (date) {
        var ms;
        if (typeof date === 'object' && date instanceof Date) {
            ms = date.getTime();
            return !isNaN(ms) && ms > 0;
        }
        return false;
    }

    function isDate(value) {
        var parts, day, month, year, hours, minutes, seconds, ms;
        switch (typeof value) {
            case 'object':
                return isValidObject(value);
            case 'string':
                // is it a date in US format?
                parts = dateRegExp.exec(value);
                if (parts && parts[2] === parts[4]) {
                    month = +parts[1];
                    day = +parts[3];
                    year = +parts[5];
                    // rough check of a year
                    if (0 < year && year < 2100 && 1 <= month && month <= 12 && 1 <= day &&
                        day <= (month === 2 && isLeapYear(year) ? 29 : monthLengths[month - 1])) {
                        return true;
                    }
                }
                // is it a timestamp in a standard format?
                parts = tsRegExp.exec(value);
                if (parts) {
                    year = +parts[1];
                    month = +parts[2];
                    day = +parts[3];
                    hours = +parts[4];
                    minutes = +parts[5];
                    seconds = +parts[6];
                    if (0 < year && year < 2100 && 1 <= month && month <= 12 && 1 <= day &&
                        day <= (month === 2 && isLeapYear(year) ? 29 : monthLengths[month - 1]) &&
                        hours < 24 && minutes < 60 && seconds < 60) {
                        return true;
                    }
                }
            // intentional fall-down
        }
        return false;
    }

    function pad(num) {
        return (num < 10 ? '0' : '') + num;
    }

    function getMonth(dateOrIndex) {
        return typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getMonth();
    }

    function getMonthIndex(name) {
        // TODO: do we really want a 0-based index? or should it be a 1-based one?
        var index = monthDict[name];
        return typeof index === 'number' ? index : void 0;
    }

    function getMonthName(date) {
        return months[getMonth(date)];
    }

    function getFirstSunday(date) {
        // returns a negative index related to the 1st of the month
        var d = new Date(date.getTime());
        d.setDate(1);
        return -d.getDay();
    }

    function getDaysInPrevMonth(date) {
        var d = new Date(date);
        d.setMonth(d.getMonth() - 1);
        return getDaysInMonth(d);
    }

    function getDaysInMonth(date) {
        var month = date.getMonth();
        return month === 1 && isLeapYear(date) ? 29 : monthLengths[month];
    }

    function toDate(str) {
        if (typeof str !== 'string') {
            return str;
        }
        if (isTimestamp(str)) {
            // 2000-02-29T00:00:00
            return fromTimestamp(str);
        }
        // 11/20/2000
        var parts = dateRegExp.exec(str);
        if (parts && parts[2] === parts[4]) {
            return new Date(+parts[5], +parts[1] - 1, +parts[3]);
        }
        return new Date(-1); // invalid date
    }

    function formatDatePattern(date, pattern) {
        // 'M d, yyyy' Dec 5, 2015
        // 'MM dd yy' December 05 15
        // 'm-d-yy' 1-1-15
        // 'mm-dd-yyyy' 01-01-2015
        // 'm/d/yy' 12/25/15

        return pattern.replace(datePattern, function(name) {
            return datePatternLibrary[name](date);
        });
    }

    function format(date, delimiterOrPattern) {
        if (delimiterOrPattern && delimiterOrPattern.length > 1) {
            return formatDatePattern(date, delimiterOrPattern);
        }
        var
            del = delimiterOrPattern || '/',
            y = date.getFullYear(),
            m = date.getMonth() + 1,
            d = date.getDate();

        return [pad(m), pad(d), y].join(del);
    }

    function dateToStr(date, delimiter) {
        return format(date, delimiter);
    }

    function formatTime(date, usePeriod) {
        if (typeof date === 'string') {
            date = toDate(date);
        }

        var
            period = 'AM',
            hours = date.getHours(),
            minutes = date.getMinutes(),
            retval,
            seconds = date.getSeconds();

        if (hours > 11) {
            hours -= 12;
            period = 'PM';
        }
        if (hours === 0) {
            hours = 12;
        }

        retval = hours + ':' + pad(minutes) + ':' + pad(seconds);

        if (usePeriod) {
            retval = retval + ' ' + period;
        }

        return retval;
    }

    function period(date) {
        if (typeof date === 'string') {
            date = toDate(date);
        }

        var hours = date.getHours();

        return hours > 11 ? 'PM' : 'AM';
    }

    function toISO(date, includeTZ) {
        var
            str,
            now = new Date(),
            then = new Date(date.getTime());
        then.setHours(now.getHours());
        str = then.toISOString();
        if (!includeTZ) {
            str = str.split('.')[0];
            str += '.00Z';
        }
        return str;
    }

    function natural(date) {
        if (typeof date === 'string') {
            date = this.from(date);
        }

        var
            year = date.getFullYear().toString().substr(2),
            month = date.getMonth() + 1,
            day = date.getDate(),
            hours = date.getHours(),
            minutes = date.getMinutes(),
            period = 'AM';

        if (hours > 11) {
            hours -= 12;
            period = 'PM';
        }
        if (hours === 0) {
            hours = 12;
        }

        return hours + ':' + pad(minutes) + ' ' + period + ' on ' + pad(month) + '/' + pad(day) + '/' + year;
    }

    function addDays (date, days) {
        console.warn('addDays is deprecated. Instead, use `add`');
        return add(date, days);
    }

    function add (date, amount, dateType) {
        return subtract(date, -amount, dateType);
    }

    function subtract(date, amount, dateType) {
        // subtract N days from date
        var
            time = date.getTime(),
            tmp = new Date(time);

        if(dateType === 'month'){
            tmp.setMonth(tmp.getMonth() - amount);
            return tmp;
        }
        if(dateType === 'year'){
            tmp.setFullYear(tmp.getFullYear() - amount);
            return tmp;
        }

        return new Date(time - length.day * amount);
    }

    function subtractDate(date1, date2, dateType) {
        // dateType: week, day, hr, min, sec
        // past dates have a positive value
        // future dates have a negative value

        var divideBy = {
                week: length.week,
                day: length.day,
                hr: length.hr,
                min: length.min,
                sec: length.sec
            },
            utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()),
            utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        dateType = dateType.toLowerCase();

        return Math.floor((utc2 - utc1) / divideBy[dateType]);
    }

    function isLess (d1, d2) {
        if(isValidObject(d1) && isValidObject(d2)){
            return d1.getTime() < d2.getTime();
        }
        return false;
    }

    function isGreater (d1, d2) {
        if(isValidObject(d1) && isValidObject(d2)){
            return d1.getTime() > d2.getTime();
        }
        return false;
    }

    function diff(date1, date2) {
        // return the difference between 2 dates in days
        var utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()),
            utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        return Math.abs(Math.floor((utc2 - utc1) / length.day));
    }

    function copy (date) {
        if(isValidObject(date)){
            return new Date(date.getTime());
        }
        return date;
    }

    function getNaturalDay(date, compareDate, noDaysOfWeek) {

        var
            today = compareDate || new Date(),
            daysAgo = subtractDate(date, today, 'day');

        if (!daysAgo) {
            return 'Today';
        }
        if (daysAgo === 1) {
            return 'Yesterday';
        }

        if (daysAgo === -1) {
            return 'Tomorrow';
        }

        if (daysAgo < -1) {
            return format(date);
        }

        return !noDaysOfWeek && daysAgo < daysOfWeek.length ? daysOfWeek[date.getDay()] : format(date);
    }

	function toTimestamp (date) {
		return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
			pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
	}

	function fromTimestamp (str) {
		// 2015-05-26T00:00:00

		// strip timezone // 2015-05-26T00:00:00Z
		str = str.split('Z')[0];

		// ["2000-02-30T00:00:00", "2000", "02", "30", "00", "00", "00", index: 0, input: "2000-02-30T00:00:00"]
		var parts = tsRegExp.exec(str);
		// TODO: do we need a validation?
		if (parts) {
			// new Date(1995, 11, 17, 3, 24, 0);
			return new Date(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5], parseInt(parts[6], 10));
		}
		// TODO: what do we return for an invalid date? null?
		return new Date(-1);
	}

	function isTimestamp (str) {
		return typeof str === 'string' && tsRegExp.test(str);
	}

    dates = {
    	// convertors
		format: format,
		formatTime: formatTime,
		toDate: toDate,
		isValid: isDate,
		isDate: isDate,
		isValidObject: isValidObject,
		toISO: toISO,
		toTimestamp: toTimestamp,
		fromTimestamp: fromTimestamp,
		isTimestamp: isTimestamp,
		// math
        subtract: subtract,
        add: add,
        diff: diff,
		subtractDate: subtractDate,
        isLess: isLess,
        isGreater: isGreater,
		// special types
        isLeapYear: isLeapYear,
        getMonthIndex: getMonthIndex,
        getMonthName: getMonthName,
        getFirstSunday: getFirstSunday,
        getDaysInMonth: getDaysInMonth,
        getDaysInPrevMonth: getDaysInPrevMonth,
        // helpers
        period: period,
        natural: natural,
        getNaturalDay: getNaturalDay,
		// utils
		copy: copy,
		clone: copy,
		length: length,
		pad: pad,
		// lists
		months: {
			full: months,
			abbr: monthAbbr,
			dict: monthDict
		},
		days: {
			full: daysOfWeek,
			abbr: days,
			abbr3: days3,
			dict: dayDict
		},
		// deprecated
		dateToStr: function (date) {
			console.warn('deprecated - Use format instead');
			return format(date);
		},
		formatDate: function (date) {
			console.warn('deprecated - Use format instead');
			return format(date);
		},
		strToDate: function (str) {
			console.warn('deprecated - Use toDate instead');
			return toDate(str)
		},
		isDateType: function (item) {
			console.warn('deprecated - Use isDate instead');
			return isDate(item);
		},
        timestamp: {
            to: function(date) {
				console.warn('deprecated - Use toTimestamp instead');
				return toTimestamp(date);
            },
            from: function(str) {
				console.warn('deprecated - Use fromTimestamp instead');
				return fromTimestamp(str);
            },
            is: function(str) {
				console.warn('deprecated - Use isTimestamp instead');
				return isTimestamp(str);
            }
        }
    };

    return dates;

}));