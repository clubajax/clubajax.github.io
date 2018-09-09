(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'dates');
	}
	else if (typeof define === 'function' && define.amd) {
		define([], factory);
	}
	else if (typeof exports === 'object') {
		module.exports = factory();
	}
	else {
		root.returnExports = factory();
		window.dates = factory();
	}
}(this, function () {

	const
		// tests that it is a date string, not a valid date. 88/88/8888 would be true
		dateRegExp = /^(\d{1,4})([\/-])(\d{1,2})([\/-])(\d{1,4})\b/,

		// 2015-05-26T00:00:00
		tsRegExp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\b/,

		// 12:30 am
		timeRegExp = /(\d\d):(\d\d)(?:\s|:)(\d\d|[ap]m)(?:\s)*([ap]m)*/i,

		daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		days = [],
		days3 = [],
		dayDict = {},

		months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		monthAbbr = [],
		monthDict = {},

		// https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
		//
		datePattern = /yyyy|yy|MMMM|MMM|MM|M|dd|d|E|e|H|h|m|s|A|a/g,
		datePatternLibrary = {
			yyyy: function (date) {
				return date.getFullYear();
			},
			yy: function (date) {
				return (date.getFullYear() + '').substring(2);
			},
			MMMM: function (date) {
				return months[date.getMonth()];
			},
			MMM: function (date) {
				return monthAbbr[date.getMonth()];
			},
			MM: function (date) {
				return pad(date.getMonth() + 1);
			},

			M: function (date) {
				return date.getMonth() + 1;
			},
			dd: function (date) {
				return pad(date.getDate());
			},
			d: function (date) {
				return date.getDate();
			},
			E: function (date) {
				return daysOfWeek[date.getDay()];
			},
			e: function (date) {
				return days3[date.getDay()];
			},
			H: function (date) {
				return pad(date.getHours());
			},
			h: function (date) {
				var hr = date.getHours();
				if (hr > 12) {
					hr -= 12;
				}
				if (hr === 0) {
					hr = 12;
				}
				return pad(hr);
			},
			m: function (date) {
				return pad(date.getMinutes());
			},
			s: function (date) {
				return pad(date.getSeconds());
			},
			A: function (date) {
				return this.a(date).toUpperCase();
			},
			a: function (date) {
				return date.getHours() >= 12 ? 'pm' : 'am';
			},

			// not standard:
			mmmm: function (date) {
				return this.MMMM(date);
			},
			mmm: function (date) {
				return this.MMM(date);
			},
			mm: function (date) {
				return this.MM(date);
			}
		},

		length = (function () {
			const
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
	daysOfWeek.forEach(function (day, index) {
		dayDict[day] = index;
		let abbr = day.substr(0, 2);
		days.push(abbr);
		dayDict[abbr] = index;
		abbr = day.substr(0, 3);
		days3.push(abbr);
		dayDict[abbr] = index;
	});

	// populate month-related structures
	months.forEach(function (month, index) {
		monthDict[month] = index;
		const abbr = month.substr(0, 3);
		monthAbbr.push(abbr);
		monthDict[abbr] = index;
	});

	function isLeapYear (dateOrYear) {
		const year = dateOrYear instanceof Date ? dateOrYear.getFullYear() : dateOrYear;
		return !(year % 400) || (!(year % 4) && !!(year % 100));
	}

	function isValidObject (date) {
		let ms;
		if (typeof date === 'object' && date instanceof Date) {
			ms = date.getTime();
			return !isNaN(ms) && ms > 0;
		}
		return false;
	}

	function isDate (value) {
		if (typeof value === 'object') {
			return isValidObject(value);
		}
		let parts, day, month, year, hours, minutes, seconds, ms;

		if (timeRegExp.test(value)) {
			// does it have a valid time format?
			parts = timeRegExp.exec(value);
			let hr = parseInt(parts[1]);
			let mn = parseInt(parts[2]);
			let sc = 0;
			if (isNaN(hr) || isNaN(mn)) {
				return false;
			}
			if (/[ap]m/i.test(value)) {
				// uses am/pm
				if (hr > 12) {
					return false;
				}

			} else {
				// 24 hour clock
				sc = parseInt(parts[3]);
			}
			// assumes 24 hour clock here
			if (sc < 0 || sc > 59 || mn < 0 || mn > 59 || hr < 0 || hr > 23) {
				return false;
			}
			// continue with date...
		}

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

		return false;
	}

	function pad (num) {
		return (num < 10 ? '0' : '') + num;
	}

	function getMonth (dateOrIndex) {
		return typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getMonth();
	}

	function getMonthIndex (name) {
		const index = monthDict[name];
		return typeof index === 'number' ? index : void 0;
	}

	function getMonthName (date) {
		return months[getMonth(date)];
	}

	function getFirstSunday (date) {
		// returns a negative index related to the 1st of the month
		const d = new Date(date.getTime());
		d.setDate(1);
		return -d.getDay();
	}

	function getDaysInPrevMonth (date) {
		const d = new Date(date);
		d.setMonth(d.getMonth() - 1);
		return getDaysInMonth(d);
	}

	function getDaysInMonth (date) {
		const month = date.getMonth();
		return month === 1 && isLeapYear(date) ? 29 : monthLengths[month];
	}

	function toDate (value) {
		if (typeof value !== 'string') {
			return value;
		}
		if (isTimestamp(value)) {
			// 2000-02-29T00:00:00
			return fromTimestamp(value);
		}
		let date = new Date(-1);

		// 11/20/2000
		let parts = dateRegExp.exec(value);
		console.log('parts', parts, value);
		if (parts && parts[2] === parts[4]) {
			console.log('WAT');
			date = new Date(+parts[5], +parts[1] - 1, +parts[3]);
		}

		if (timeRegExp.test(value)) {
			parts = timeRegExp.exec(value);
			let hr = parseInt(parts[1]);
			let mn = parseInt(parts[2]);
			let sc = value.split(':').length === 3 ? parseInt(parts[3]) : 0;
			if (isNaN(hr) || isNaN(mn)) {
				return date;
			}
			if (/[ap]m/i.test(value)) {
				// uses am/pm
				if (/pm/i.test(value)) {
					if (hr !== 12) {
						hr += 12;
					}
				} else if (hr === 12) {
					hr = 0;
				}

			} else {
				// 24 hour clock
				sc = parseInt(parts[3]);
			}
			date.setHours(hr);
			date.setMinutes(mn);
			date.setSeconds(sc);
		}

		return date;
	}

	function formatDatePattern (date, pattern) {
		// 'MMM d, yyyy' Dec 5, 2015
		// 'MM dd yy' December 05 15
		// 'm-d-yy' 1-1-15
		// 'mm-dd-yyyy' 01-01-2015
		// 'm/d/yy' 12/25/15
		// time:
		// 'yyyy/MM/dd h:m A' 2016/01/26 04:23 AM

		if (/^m\/|\/m\//.test(pattern)) {
			console.warn('Invalid pattern. Did you mean:', pattern.replace('m', 'M'));
		}

		return pattern.replace(datePattern, function (name) {
			return datePatternLibrary[name](date);
		});
	}

	function format (date, delimiterOrPattern) {
		if (delimiterOrPattern && delimiterOrPattern.length > 1) {
			return formatDatePattern(date, delimiterOrPattern);
		}
		const
			del = delimiterOrPattern || '/',
			y = date.getFullYear(),
			m = date.getMonth() + 1,
			d = date.getDate();

		return [pad(m), pad(d), y].join(del);
	}

	function toISO (date, includeTZ) {
		const
			now = new Date(),
			then = new Date(date.getTime());
		then.setHours(now.getHours());
		let str = then.toISOString();
		if (!includeTZ) {
			str = str.split('.')[0];
			str += '.00Z';
		}
		return str;
	}

	function natural (date) {
		if (typeof date === 'string') {
			date = this.from(date);
		}

		let
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

	function add (date, amount, dateType) {
		return subtract(date, -amount, dateType);
	}

	function subtract (date, amount, dateType) {
		// subtract N days from date
		const
			time = date.getTime(),
			tmp = new Date(time);

		if (dateType === 'month') {
			tmp.setMonth(tmp.getMonth() - amount);
			return tmp;
		}
		if (dateType === 'year') {
			tmp.setFullYear(tmp.getFullYear() - amount);
			return tmp;
		}

		return new Date(time - length.day * amount);
	}

	function subtractDate (date1, date2, dateType) {
		// dateType: week, day, hr, min, sec
		// past dates have a positive value
		// future dates have a negative value

		const
			divideBy = {
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
		if (isValidObject(d1) && isValidObject(d2)) {
			return d1.getTime() < d2.getTime();
		}
		return false;
	}

	function isGreater (d1, d2) {
		if (isValidObject(d1) && isValidObject(d2)) {
			return d1.getTime() > d2.getTime();
		}
		return false;
	}

	function diff (date1, date2) {
		// return the difference between 2 dates in days
		const
			utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()),
			utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

		return Math.abs(Math.floor((utc2 - utc1) / length.day));
	}

	function copy (date) {
		if (isValidObject(date)) {
			return new Date(date.getTime());
		}
		return date;
	}

	function getNaturalDay (date, compareDate, noDaysOfWeek) {

		const
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

	function zeroTime (date) {
		date = copy(date);
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);
		return date;
	}

	function toTimestamp (date) {
		return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
			pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
	}

	function fromTimestamp (str) {
		// 2015-05-26T00:00:00

		// strip timezone // 2015-05-26T00:00:00Z
		str = str.split('Z')[0];

		const parts = tsRegExp.exec(str);
		if (parts) {
			// new Date(1995, 11, 17, 3, 24, 0);
			return new Date(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5], +parts[6]);
		}
		return new Date(-1);
	}

	function isTimestamp (str) {
		return typeof str === 'string' && tsRegExp.test(str);
	}

	function toUtcTimestamp (date) {
		return toTimestamp(toUTC(date));
	}

	function fromUtcTimestamp (date) {
		date = toDate(date);
		const tz = date.getTimezoneOffset() * 60000;
		const time = date.getTime() + tz;
		const tzDate = new Date(time);
		return new Date(tzDate.toUTCString());
	}

	function toUTC (date) {
		date = toDate(date);
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	}

	function is (d1) {
		return {
			less (d2) {
				return isLess(d1, d2);
			},
			greater (d2) {
				return isGreater(d1, d2);
			},
			valid () {
				return isDate(d1);
			},
			timestamp () {
				return isTimestamp(d1);
			},
			equal(d2) {
				return toDate(d1).getTime() === toDate(d2).getTime();
			},
			equalDate (d2) {
				return d1.getFullYear() === d2.getFullYear() &&
					d1.getMonth() === d2.getMonth() &&
					d1.getDate() === d2.getDate();
			},
			equalTime (d2) {
				return d1.getHours() === d2.getHours() &&
					d1.getMinutes() && d2.getMinutes() &&
					d1.getSeconds() === d2.getSeconds();
			},
			time () {
				if (typeof d1 !== 'string') {
					throw new Error('value should be a string');
				}
				return timeRegExp.test(d1);
			},
			date () {
				if (typeof d1 !== 'string') {
					throw new Error('value should be a string');
				}
				return dateRegExp.test(d1);
			}
		}
	}

	return {
		// converters
		format: format,
		toDate: toDate,
		isValid: isDate,
		isDate: isDate,
		isValidObject: isValidObject,
		toISO: toISO,
		toUTC: toUTC,
		toTimestamp: toTimestamp,
		fromTimestamp: fromTimestamp,
		isTimestamp: isTimestamp,
		toUtcTimestamp: toUtcTimestamp,
		fromUtcTimestamp: fromUtcTimestamp,
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
		natural: natural,
		getNaturalDay: getNaturalDay,
		// utils
		is: is,
		zeroTime: zeroTime,
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
		}
	};
}));