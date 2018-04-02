(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
		dateRegExp = /^(\d{1,2})([\/-])(\d{1,2})([\/-])(\d{4})\b/,

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
		if (parts && parts[2] === parts[4]) {
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
		// 'M d, yyyy' Dec 5, 2015
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
},{}],2:[function(require,module,exports){
require('./date-picker');
const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');
const focusManager = require('./focusManager');
require('./icon-calendar');

const defaultPlaceholder = 'MM/DD/YYYY';
const defaultMask = 'XX/XX/XXXX';
const props = ['label', 'name', 'placeholder', 'mask', 'min', 'max', 'time'];
const bools = ['required', 'time', 'static'];

const FLASH_TIME = 1000;

class DateInput extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	attributeChanged (name, value) {
		// need to manage value manually
		if (name === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		if (value === this.strDate) {
			return;
		}
		const isInit = !this.strDate;
		this.strDate = dates.isValid(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate, isInit);
		});
	}

	get value () {
		return this.strDate;
	}

	get valid () {
		return this.isValid();
	}

	onLabel (value) {
		this.labelNode.innerHTML = value;
	}

	onMin (value) {
		const d = dates.toDate(value);
		this.minDate = d;
		this.minInt = d.getTime();
		this.picker.min = value;
	}

	onMax (value) {
		const d = dates.toDate(value);
		this.maxDate = d;
		this.maxInt = d.getTime();
		this.picker.max = value;
	}


	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<div class="input-wrapper">
		<input ref="input" class="empty" />
		<icon-calendar />
	</div>
</label>`;
	}

	constructor () {
		super();
		this.showing = false;
	}

	setValue (value, silent) {
		if (value === this.typedValue) {
			return;
		}
		value = this.format(value);
		this.typedValue = value;
		this.input.value = value;
		const len = this.input.value.length === this.mask.length;
		const valid = this.validate();
		if (valid) {
			this.strDate = value;
			this.picker.value = value;
			if (!silent) {
				this.emit('change', { value: value });
			}
		}

		if (!silent && valid && !this.static) {
			setTimeout(this.hide.bind(this), 300);
		}
		return value;
	}

	format (value) {
		return  util.formatDate(value, this.mask);
	}

	isValid (value = this.input.value) {
		if(!value && !this.required){
			return true;
		}
		return dates.isValid(this.input.value);
	}

	validate () {
		if (this.isValid(this.input.value)) {
			this.classList.remove('invalid');
			return true;
		}
		this.classList.add('invalid');
		return false;
	}

	flash (addFocus) {
		this.classList.add('warning');
		setTimeout(() => {
			this.classList.remove('warning');
		}, FLASH_TIME);

		if(addFocus){
			this.focus();
		}
	}

	show () {
		if (this.showing) {
			return;
		}
		this.showing = true;
		this.picker.onShow();
		this.picker.classList.add('show');

		window.requestAnimationFrame(() => {
			const win = dom.box(window);
			const box = dom.box(this.picker);
			if (box.x + box.w > win.h) {
				this.picker.classList.add('right-align');
			}
			if (box.top + box.h > win.h) {
				this.picker.classList.add('bottom-align');
			}
		});
	}

	hide () {
		if (!this.showing || window.keepPopupsOpen) {
			return;
		}
		this.showing = false;
		dom.classList.remove(this.picker, 'right-align bottom-align show');
		dom.classList.toggle(this, 'invalid', !this.isValid());
		console.log('ONHIDE');
		this.picker.onHide();
	}

	focus () {
		onDomReady(this, () => {
			this.input.focus();
		});
	}

	blur () {
		if (this.input) {
			this.input.blur();
		}
	}

	domReady () {
		this.time = this.time || this.hasTime;
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		if (this.name) {
			this.input.setAttribute('name', this.name);
		}
		if (this.label) {
			this.labelNode.innerHTML = this.label;
		}
		this.connectKeys();

		this.picker = dom('date-picker', { time: this.time, tabindex: '0' }, this);
		this.picker.onDomReady(() => {
			this.picker.on('change', (e) => {
				this.setValue(e.value, e.silent);
			});
			if (this.static) {
				this.show();
			} else {
				this.focusHandle = focusManager(this, this.show.bind(this), this.hide.bind(this));
			}
		});
	}

	connectKeys () {
		this.on(this.input, 'keydown', util.stopEvent);
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e);
		});
	}

	destroy () {
		if (this.focusHandle) {
			this.focusHandle.remove();
		}
	}
}

customElements.define('date-input', DateInput);

module.exports = DateInput;
},{"./date-picker":3,"./focusManager":8,"./icon-calendar":9,"./onKey":10,"./util":12,"@clubajax/base-component":"@clubajax/base-component","@clubajax/dates":1,"@clubajax/dom":"@clubajax/dom"}],3:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');
const util = require('./util');
require('./time-input');

// TODO:
// https://axesslab.com/accessible-datepickers/
// http://whatsock.com/tsg/Coding%20Arena/ARIA%20Date%20Pickers/ARIA%20Date%20Picker%20(Basic)/demo.htm

const props = ['min', 'max'];

// range-left/range-right mean that this is one side of a date-range-picker
const bools = ['range-picker', 'range-left', 'range-right', 'time'];

class DatePicker extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	get templateString () {
		return `
<div class="calendar" ref="calNode">
<div class="cal-header" ref="headerNode">
	<span class="cal-yr-lft" ref="lftYrNode" tabindex="0" role="button" aria-label="Previous Year"></span>
	<span class="cal-lft" ref="lftMoNode" tabindex="0" role="button" aria-label="Previous Month"></span>
	<span class="cal-month" ref="monthNode" role="presentation"></span>	
	<span class="cal-rgt" ref="rgtMoNode" tabindex="0"  role="button" aria-label="Next Month"></span>
	<span class="cal-yr-rgt" ref="rgtYrNode" tabindex="0" role="button" aria-label="Next Year"></span>
</div>
<div class="cal-container" ref="container"></div>
<div class="cal-footer" ref="calFooter">
	<span ref="footerLink" tabindex="0" role="button" aria-label="Set Date to Today"></span>
</div>
</div>
<input class="focus-loop" aria-hidden="true"/>
`;
	}

	set value (value) {
		this.setValue(dates.isDate(value) ? dates.toDate(value) : today);
	}

	get value () {
		if (!this.valueDate) {
			const value = this.getAttribute('value') || today;
			this.valueDate = dates.toDate(value);
		}
		return this.valueDate;
	}

	onMin (value) {
		this.minDate = util.getMinDate(value);
		if (this.timeInput) {
			this.timeInput.min = value;
		}
		this.render();
	}

	onMax (value) {
		this.maxDate = util.getMaxDate(value);
		if (this.timeInput) {
			this.timeInput.max = value;
		}
		this.render();
	}

	constructor () {
		super();
		this.current = new Date();
		this.previous = {};
	}

	setDisplay (...args) {
		// used by date-range-picker
		if (args.length === 2) {
			this.current.setFullYear(args[0]);
			this.current.setMonth(args[1]);
		} else if (typeof args[0] === 'object') {
			this.current.setFullYear(args[0].getFullYear());
			this.current.setMonth(args[0].getMonth());
		} else if (args[0] > 12) {
			this.current.setFullYear(args[0]);
		} else {
			this.current.setMonth(args[0]);
		}
		this.valueDate = dates.copy(this.current);
		this.noEvents = true;
		this.render();
	}

	getFormattedValue () {
		let str = this.valueDate === today ? '' : !!this.valueDate ? dates.format(this.valueDate) : '';
		if (this.time) {
			str += ` ${this.timeInput.value}`;
		}
		return str;
	}

	emitEvent (silent) {
		const date = this.valueDate;
		if (this.time) {
			if (!this.timeInput.valid) {
				this.timeInput.validate();
				return;
			}
			util.addTimeToDate(this.timeInput.value, date);
		}
		const event = {
			value: this.getFormattedValue(),
			silent,
			date
		};
		if (this['range-picker']) {
			event.first = this.firstRange;
			event.second = this.secondRange;
		}
		this.emit('change', event);
	}

	emitDisplayEvents () {
		const month = this.current.getMonth(),
			year = this.current.getFullYear();

		if (!this.noEvents && (month !== this.previous.month || year !== this.previous.year)) {
			this.fire('display-change', { month: month, year: year });
		}

		this.noEvents = false;
		this.previous = {
			month: month,
			year: year
		};
	}

	onHide () {
		// not an attribute; called by owner
	}

	onShow () {
		this.current = dates.copy(this.valueDate);
		this.render();
	}

	setValue (valueObject) {
		this.valueDate = valueObject;
		this.current = dates.copy(this.valueDate);
		onDomReady(this, () => {
			this.render();
		});
	}

	onClickDay (node, silent) {
		const
			day = +node.textContent,
			isFuture = node.classList.contains('future'),
			isPast = node.classList.contains('past'),
			isDisabled = node.classList.contains('disabled');

		if (isDisabled) {
			return;
		}

		this.current.setDate(day);
		if (isFuture) {
			this.current.setMonth(this.current.getMonth() + 1);
		}
		if (isPast) {
			this.current.setMonth(this.current.getMonth() - 1);
		}

		this.valueDate = dates.copy(this.current);

		if (this.timeInput) {
			this.timeInput.setDate(this.valueDate);
		}

		this.emitEvent(silent);

		if (this['range-picker']) {
			this.clickSelectRange();
		}

		if (isFuture || isPast) {
			this.render();
		} else {
			this.selectDay();
		}
	}

	selectDay () {
		if (this['range-picker']) {
			return;
		}
		console.log('SELECT DAY');
		const now = this.querySelector('.selected');
		const node = this.dayMap[this.current.getDate()];
		if (now) {
			now.classList.remove('selected');
		}
		node.classList.add('selected');

	}

	focusDay () {
		const node = this.container.querySelector('div.highlighted[tabindex="0"]') ||
			this.container.querySelector('div.selected[tabindex="0"]');
		if (node) {
			node.focus();
		}
	}

	highlightDay (date) {
		let node;
		if (this.isValidDate(date)) {
			node = this.container.querySelector('div[tabindex="0"]');
			if (node) {
				node.setAttribute('tabindex', '-1');
			}

			const shouldRerender = date.getMonth() !== this.current || date.getFullYear() !== this.current.getFullYear();

			this.current = date;
			if (shouldRerender) {
				this.render();
			} else {
				const dateSelector = util.toAriaLabel(this.current);
				node = this.container.querySelector(`div[aria-label="${dateSelector}"]`);
				node.setAttribute('tabindex', '0');
			}
			this.focusDay();
		}
	}

	isValidDate (date) {
		// used by arrow keys
		date = dates.zeroTime(date);
		if (this.minDate) {
			if (dates.is(date).less(this.minDate)) {
				return false;
			}
		}
		if (this.maxDate) {
			if (dates.is(date).greater(this.maxDate)) {
				return false;
			}
		}
		return true;
	}

	onClickMonth (direction) {
		this.current.setMonth(this.current.getMonth() + direction);
		this.render();
	}

	onClickYear (direction) {
		this.current.setFullYear(this.current.getFullYear() + direction);
		this.render();
	}

	clearRange () {
		this.hoverDate = 0;
		this.setRange(null, null);
	}

	setRange (firstRange, secondRange) {
		this.firstRange = firstRange;
		this.secondRange = secondRange;
		this.displayRange();
		this.setRangeEndPoints();
	}

	clickSelectRange () {
		const
			prevFirst = !!this.firstRange,
			prevSecond = !!this.secondRange,
			rangeDate = dates.copy(this.current);

		if (this.isOwned) {
			this.fire('select-range', {
				first: this.firstRange,
				second: this.secondRange,
				current: rangeDate
			});
			return;
		}
		if (this.secondRange) {
			this.fire('reset-range');
			this.firstRange = null;
			this.secondRange = null;
		}
		if (this.firstRange && this.isValidRange(rangeDate)) {
			this.secondRange = rangeDate;
			this.hoverDate = 0;
			this.setRange(this.firstRange, this.secondRange);
		} else {
			this.firstRange = null;
		}
		if (!this.firstRange) {
			this.hoverDate = 0;
			this.setRange(rangeDate, null);
		}
		this.fire('select-range', {
			first: this.firstRange,
			second: this.secondRange,
			prevFirst: prevFirst,
			prevSecond: prevSecond
		});
	}

	hoverSelectRange (e) {
		if (this.firstRange && !this.secondRange && e.target.classList.contains('on')) {
			this.hoverDate = e.target._date;
			this.displayRange();
		}
	}

	displayRangeToEnd () {
		if (this.firstRange) {
			this.hoverDate = dates.copy(this.current);
			this.hoverDate.setMonth(this.hoverDate.getMonth() + 1);
			this.displayRange();
		}
	}

	displayRange () {
		let beg = this.firstRange;
		let end = this.secondRange ? this.secondRange.getTime() : this.hoverDate;
		const map = this.dayMap;
		if (!beg || !end) {
			Object.keys(map).forEach(function (key, i) {
				map[key].classList.remove('range');
			});
		} else {
			beg = beg.getTime();
			Object.keys(map).forEach(function (key, i) {
				if (inRange(map[key]._date, beg, end)) {
					map[key].classList.add('range');
				} else {
					map[key].classList.remove('range');
				}
			});
		}
	}

	hasRange () {
		return !!this.firstRange && !!this.secondRange;
	}

	isValidRange (date) {
		if (!this.firstRange) {
			return true;
		}
		return date.getTime() > this.firstRange.getTime();
	}

	setRangeEndPoints () {
		this.clearEndPoints();
		if (this.firstRange) {
			if (this.firstRange.getMonth() === this.current.getMonth()) {
				this.dayMap[this.firstRange.getDate()].classList.add('range-first');
			}
			if (this.secondRange && this.secondRange.getMonth() === this.current.getMonth()) {
				this.dayMap[this.secondRange.getDate()].classList.add('range-second');
			}
		}
	}

	clearEndPoints () {
		const first = this.querySelector('.range-first'),
			second = this.querySelector('.range-second');
		if (first) {
			first.classList.remove('range-first');
		}
		if (second) {
			second.classList.remove('range-second');
		}
	}

	domReady () {
		if (this['range-left']) {
			this.classList.add('left-range');
			this['range-picker'] = true;
			this.isOwned = true;
		}
		if (this['range-right']) {
			this.classList.add('right-range');
			this['range-picker'] = true;
			this.isOwned = true;
		}
		if (this.isOwned) {
			this.classList.add('minimal');
		}
		this.current = dates.copy(this.value);
		this.render();
		this.connect();
	}

	render () {
		// dateNum increments, starting with the first Sunday
		// showing on the monthly calendar. This is usually the
		// previous month, so dateNum will start as a negative number
		destroy(this.bodyNode);

		this.dayMap = {};

		let
			node = dom('div', { class: 'cal-body' }),
			i, tx, isThisMonth, day, css, isSelected, isToday, hasSelected, defaultDateSelector, minmax, isHighlighted,
			nextMonth = 0,
			isRange = this['range-picker'],
			d = this.current,
			incDate = dates.copy(d),
			daysInPrevMonth = dates.getDaysInPrevMonth(d),
			daysInMonth = dates.getDaysInMonth(d),
			dateNum = dates.getFirstSunday(d),
			dateToday = getSelectedDate(today, d),
			dateSelected = getSelectedDate(this.valueDate, d, true),
			highlighted = d.getDate(),
			dateObj = dates.add(new Date(d.getFullYear(), d.getMonth(), 1), dateNum),
			defaultDate = 15;

		this.monthNode.innerHTML = dates.getMonthName(d) + ' ' + d.getFullYear();

		for (i = 0; i < 7; i++) {
			dom("div", { html: dates.days.abbr[i], class: 'day-of-week' }, node);
		}

		for (i = 0; i < 42; i++) {

			minmax = dates.isLess(dateObj, this.minDate) || dates.isGreater(dateObj, this.maxDate);

			tx = dateNum + 1 > 0 && dateNum + 1 <= daysInMonth ? dateNum + 1 : "&nbsp;";

			isThisMonth = false;
			isSelected = false;
			isHighlighted = false;
			isToday = false;

			if (dateNum + 1 > 0 && dateNum + 1 <= daysInMonth) {
				// current month
				tx = dateNum + 1;
				isThisMonth = true;
				css = 'day on';
				if (dateToday === tx) {
					isToday = true;
					css += ' today';
				}
				if (dateSelected === tx && !isRange) {
					isSelected = true;
					hasSelected = true;
					css += ' selected';
				} else if (tx === highlighted) {
					css += ' highlighted';
					isHighlighted = true;
				}

				// if (tx === defaultDate) {
				// 	defaultDateSelector = util.toAriaLabel(dateObj);
				// }
			} else if (dateNum < 0) {
				// previous month
				tx = daysInPrevMonth + dateNum + 1;
				css = 'day off past';
			} else {
				// next month
				tx = ++nextMonth;
				css = 'day off future';
			}

			if (minmax) {
				css = 'day disabled';
				if (isSelected) {
					css += ' selected';
				}
				if (isToday) {
					css += ' today';
				}
			}

			const ariaLabel = util.toAriaLabel(dateObj);
			day = dom("div", {
				html: `<span>${tx}</span>`,
				class: css,
				'aria-label': ariaLabel,
				tabindex: isSelected || isHighlighted ? 0 : -1
			}, node);

			dateNum++;
			dateObj.setDate(dateObj.getDate() + 1);
			if (isThisMonth) {
				// Keep a map of all the days
				// use it for adding and removing selection/hover classes
				incDate.setDate(tx);
				day._date = incDate.getTime();
				this.dayMap[tx] = day;
			}
		}

		this.container.appendChild(node);
		this.bodyNode = node;
		this.setFooter();
		this.displayRange();
		this.setRangeEndPoints();

		this.emitDisplayEvents();

		if (this.timeInput) {
			this.timeInput.setDate(this.current);
		}
	}

	setFooter () {
		if (this.timeInput) {
			if (this.current) {
				this.timeInput.value = this.valueDate;
			}
			return;
		}
		if (this.time) {
			this.timeInput = dom('time-input', {
				label: 'Time:',
				required: true,
				value: this.value,
				min: this.minDate,
				max: this.maxDate,
				'event-name': 'time-change'
			}, this.calFooter);
			this.timeInput.setDate(this.current);
			this.timeInput.on('time-change', this.emitEvent.bind(this));
			destroy(this.footerLink);
		} else {
			const d = new Date();
			this.footerLink.innerHTML = dates.format(d, 'E MMMM dd, yyyy');
		}
	}

	connect () {
		this.on(this.container, 'click', (e) => {
			this.fire('pre-click', e, true, true);
			const node = e.target.closest('.day');
			if (node) {
				this.onClickDay(node);
			}
		});

		this.on(this.container, 'keydown', (e) => {
			let date;
			let stopEvent = false;
			let num;
			console.log('container.key', e.key);
			switch (e.key) {
				case 'ArrowLeft' :
					num = -1;
					break;
				case 'ArrowRight' :
					num = 1;
					break;
				case 'ArrowUp' :
					num = -7;
					break;
				case 'ArrowDown':
					num = 7;
					break;
				case 'Enter':
					this.onClickDay(e.target);
					break;
				case ' ':
					this.onClickDay(e.target, true);
					this.focusDay();
					return util.stopEvent(e);
			}

			if (num) {
				this.highlightDay(dates.add(this.current, num));
				e.preventDefault();
				e.stopImmediatePropagation();
				return false;
			}
		});

		this.on(document, 'keydown', (e) => {
			console.log('doc.key', e.key);
			if (e.key === ' ' && isControl(e.target, this)) {
				this.emit(e.target, 'click');
				return util.stopEvent(e);
			}
		});

		this.on(this.lftMoNode, 'click', () => {
			this.onClickMonth(-1);
		});

		this.on(this.rgtMoNode, 'click', () => {
			this.onClickMonth(1);
		});

		this.on(this.lftYrNode, 'click', () => {
			this.onClickYear(-1);
		});

		this.on(this.rgtYrNode, 'click', () => {
			this.onClickYear(1);
		});

		this.on(this.footerLink, 'click', () => {
			this.setValue(new Date());
		});

		if (this['range-picker']) {
			this.on(this.container, 'mouseover', this.hoverSelectRange.bind(this));
		}
	}
}

const today = new Date();

function isControl (node, picker) {
	console.log('isControl');
	return node === picker.lftMoNode || node === picker.rgtMoNode || node === picker.lftYrNode || node === picker.rgtYrNode || node === picker.footerLink;
}

function getSelectedDate (date, current) {
	if (date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear()) {
		return date.getDate();
	}
	return -999; // index must be out of range, and -1 is the last day of the previous month
}

function destroy (node) {
	if (node) {
		dom.destroy(node);
	}
}

function inRange (dateTime, begTime, endTime) {
	return dateTime >= begTime && dateTime <= endTime;
}

customElements.define('date-picker', DatePicker);

module.exports = DatePicker;
},{"./time-input":11,"./util":12,"@clubajax/base-component":"@clubajax/base-component","@clubajax/dates":1,"@clubajax/dom":"@clubajax/dom"}],4:[function(require,module,exports){
require('./date-range-picker');
const DateInput = require('./date-input');
const dates = require('@clubajax/dates');

const props = ['label', 'name', 'placeholder'];
const bools = ['range-expands'];

class DateRangeInput extends DateInput {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" />
	
</label>
<date-range-picker ref="picker" tabindex="0"></date-range-picker>`;
	}

	constructor () {
		super();
		this.mask = 'XX/XX/XXXX - XX/XX/XXXX'
	}

	isValid (value) {
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}
}

customElements.define('date-range-input', DateRangeInput);

module.exports = DateRangeInput;
},{"./date-input":2,"./date-range-picker":6,"@clubajax/dates":1}],5:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');
require('./date-input');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');

const props = ['left-label', 'right-label', 'name', 'placeholder'];
const bools = ['range-expands', 'required'];

const DELIMITER = ' - ';

class DateRangeInputs extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	set value (value) {
		this.setValue(value);
	}

	get value () {
		if (!this.leftInput.value || !this.rightInput.value) {
			return null;
		}
		return `${this.leftInput.value}${DELIMITER}${this.rightInput.value}`;
	}

	attributeChanged (prop, value) {
		if (prop === 'value') {
			this.value = value;
		}
	}

	get values () {
		return {
			start: this.leftInput.value,
			end: this.leftInput.value
		};
	}

	constructor () {
		super();
		this.fireOwnDomready = true;
		this.mask = 'XX/XX/XXXX';
	}

	isValid (value) {
		if (!value) {
			return true; // TODO: required
		}
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}

	setValue (value, silent) {
		if (!this.isValid(value)) {
			console.error('Invalid dates', value);
			return;
		}
		onDomReady(this, () => {
			const ds = value ? value.split(/\s*-\s*/) : ['', ''];
			this.isBeingSet = true;
			this.leftInput.setValue(ds[0], silent);
			this.rightInput.setValue(ds[1], silent);
			this.isBeingSet = false;
		});
	}

	clear (silent) {
		this.leftInput.setValue('', true);
		this.rightInput.setValue('', true);
		if (!silent) {
			this.emit('change', { value: null });
		}
	}

	emitEvent () {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => {
			const value = this.value;
			if (this.isValid(value)) {
				this.emit('change', { value });
			}
		}, 100);
	}

	connected () {
		this.leftInput = dom('date-input', {
			label: this['left-label'],
			required: this.required,
			placeholder: this.placeholder
		}, this);
		this.rightInput = dom('date-input', {
			label: this['right-label'],
			required: this.required,
			placeholder: this.placeholder
		}, this);

		this.leftInput.on('change', (e) => {
			const changesDate = dates.toDate(this.rightInput.value) < dates.toDate(e.value);
			if (!this.rightInput.value || changesDate) {
				if (e.value) {
					this.rightInput.setValue(e.value, true, true);
				}
				if (changesDate) {
					this.rightInput.flash(true);
				} else if (!this.isBeingSet) {
					this.rightInput.focus();
				}
			} else {
				this.emitEvent();
			}
			e.stopPropagation();
			e.preventDefault();
			return false;
		});

		this.rightInput.on('change', (e) => {
			const changesDate = dates.toDate(this.leftInput.value) > dates.toDate(e.value);
			if (!this.leftInput.value || changesDate) {
				if (e.value) {
					this.leftInput.setValue(e.value, true, true);
				}
				if (changesDate) {
					this.leftInput.flash(true);
				} else if (!this.isBeingSet) {
					this.leftInput.focus();
				}
			} else {
				this.emitEvent();
			}
			e.stopPropagation();
			e.preventDefault();

			return false;
		});

		onDomReady([this.leftInput, this.rightInput], () => {
			this.fire('domready');
		});
		this.connected = function () {};
	}

	domReady () {

	}
}

customElements.define('date-range-inputs', DateRangeInputs);

module.exports = DateRangeInputs;
},{"./date-input":2,"@clubajax/base-component":"@clubajax/base-component","@clubajax/dates":1,"@clubajax/dom":"@clubajax/dom"}],6:[function(require,module,exports){
require('./date-picker');
const BaseComponent = require('@clubajax/base-component');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');

const props = ['value'];
const bools = ['range-expands'];

class DateRangePicker extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	onValue (value) {
		// might need attributeChanged
		this.strDate = dates.isDate(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate, true);
		});
	}

	constructor () {
		super();
	}

	setValue (value, noEmit) {
		if (!value) {
			this.valueDate = '';
			this.clearRange();

		} else if (typeof value === 'string') {
			var dateStrings = split(value);
			this.valueDate = dates.toDate(value);
			this.firstRange = dates.toDate(dateStrings[0]);
			this.secondRange = dates.toDate(dateStrings[1]);
			this.setDisplay();
			this.setRange(noEmit);
		}
	}

	domReady () {
		this.leftCal = dom('date-picker', {'range-left': true}, this);
		this.rightCal = dom('date-picker', {'range-right': true}, this);
		this.rangeExpands = this['range-expands'];

		this.connectEvents();
		// if (this.initalValue) {
		// 	this.setValue(this.initalValue);
		// } else {
		// 	this.setDisplay();
		// }
	}

	setDisplay () {
		const
			first = this.firstRange ? new Date(this.firstRange.getTime()) : new Date(),
			second = new Date(first.getTime());

		second.setMonth(second.getMonth() + 1);
		this.leftCal.setDisplay(first);
		this.rightCal.setDisplay(second);
	}

	setRange (noEmit) {
		this.leftCal.setRange(this.firstRange, this.secondRange);
		this.rightCal.setRange(this.firstRange, this.secondRange);
		if (!noEmit && this.firstRange && this.secondRange) {

			const
				beg = dates.dateToStr(this.firstRange),
				end = dates.dateToStr(this.secondRange);

			this.emit('change', {
				firstRange: this.firstRange,
				secondRange: this.secondRange,
				begin: beg,
				end: end,
				value: beg + DELIMITER + end

			});
		}
	}

	clearRange () {
		this.leftCal.clearRange();
		this.rightCal.clearRange();
	}

	calculateRange (e, which) {
		e = e.detail || e;

		if (e.first === this.leftCal.firstRange) {
			if (!e.second) {
				this.rightCal.clearRange();
				this.rightCal.setRange(this.leftCal.firstRange, null);
			} else {
				this.rightCal.setRange(this.leftCal.firstRange, this.leftCal.secondRange);
			}
		}
	}

	connectEvents () {
		this.leftCal.on('display-change', function (e) {
			let
				m = e.detail.month,
				y = e.detail.year;
			if (m + 1 > 11) {
				m = 0;
				y++;
			} else {
				m++;
			}
			this.rightCal.setDisplay(y, m);
		}.bind(this));

		this.rightCal.on('display-change', function (e) {
			let
				m = e.detail.month,
				y = e.detail.year;
			if (m - 1 < 0) {
				m = 11;
				y--;
			} else {
				m--;
			}
			this.leftCal.setDisplay(y, m);
		}.bind(this));

		this.leftCal.on('change', function (e) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		}.bind(this));

		this.rightCal.on('change', function (e) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		}.bind(this));


		if (!this.rangeExpands) {
			this.rightCal.on('reset-range', function (e) {
				this.leftCal.clearRange();
			}.bind(this));

			this.leftCal.on('reset-range', function (e) {
				this.rightCal.clearRange();
			}.bind(this));
		}


		this.leftCal.on('select-range', function (e) {
			this.calculateRange(e, 'left');
			e = e.detail;
			if (this.rangeExpands && e.first && e.second) {
				if (isDateCloserToLeft(e.current, e.first, e.second)) {
					this.firstRange = e.current;
				} else {
					this.secondRange = e.current;
				}
				this.setRange();
			} else if (e.first && e.second) {
				// new range
				this.clearRange();
				this.firstRange = e.current;
				this.secondRange = null;
				this.setRange();
			} else if (e.first && !e.second) {
				this.secondRange = e.current;
				this.setRange();
			}
			else {
				this.firstRange = e.current;
				this.setRange();
			}
		}.bind(this));

		this.rightCal.on('select-range', function (e) {
			this.calculateRange(e, 'right');

			e = e.detail;
			if (this.rangeExpands && e.first && e.second) {
				if (isDateCloserToLeft(e.current, e.first, e.second)) {
					this.firstRange = e.current;
				} else {
					this.secondRange = e.current;
				}
				this.setRange();
			} else if (e.first && e.second) {
				// new range
				this.clearRange();
				this.firstRange = e.current;
				this.secondRange = null;
				this.setRange();
			} else if (e.first && !e.second) {
				this.secondRange = e.current;
				this.setRange();
			}
			else {
				this.firstRange = e.current;
				this.setRange();
			}
		}.bind(this));

		this.on(this.rightCal, 'mouseover', function () {
			this.leftCal.displayRangeToEnd();
		}.bind(this));
	}

	destroy () {
		this.rightCal.destroy();
		this.leftCal.destroy();
	}
}

const DELIMITER = ' - ';
const today = new Date();

function str (d) {
	if (!d) {
		return null;
	}
	return dates.dateToStr(d);
}

function split (value) {
	if (value.indexOf(',') > -1) {
		return value.split(/\s*,\s*/);
	}
	return value.split(/\s*-\s*/);
}

function isDateCloserToLeft (date, left, right) {
	const diff1 = dates.diff(date, left),
		diff2 = dates.diff(date, right);
	return diff1 <= diff2;
}

customElements.define('date-range-picker', DateRangePicker);

module.exports = DateRangePicker;
},{"./date-picker":3,"@clubajax/base-component":"@clubajax/base-component","@clubajax/dates":1,"@clubajax/dom":"@clubajax/dom"}],7:[function(require,module,exports){
const DateInput = require('./date-input');
const util = require('./util');

// FIXME: time-input blur does not close calendar

class DateTimeInput extends DateInput {
	constructor () {
		super();
		this.hasTime = true;
	}

	domReady () {
		this.mask = 'XX/XX/XXXX XX:XX pm';
		super.domReady();
	}

	format (value) {
		const parts = value.split(' ');
		const dateStr = parts[0] || '';
		const timeStr = `${parts[1] || ''} ${parts[2] || ''}`;
		const date = util.formatDate(dateStr, this.mask);
		let time = util.formatTime(timeStr);
		time = this.setAMPM(time, util.getAMPM(value));
		return `${date} ${time}`;
	}

	setAMPM (value, ampm) {
		let isAM;
		if (ampm) {
			isAM = /a/i.test(ampm);
		} else if (/[ap]/.test(value)) {
			isAM = /a/i.test(value);
		} else {
			isAM = this.isAM;
		}
		value = value.replace(/\s*[ap]m/i, '') + (isAM ? ' am' : ' pm');
		this.isAM = isAM;
		this.isPM = !isAM;
		return value;
	}
}

customElements.define('date-time-input', DateTimeInput);

module.exports = DateTimeInput;
},{"./date-input":2,"./util":12}],8:[function(require,module,exports){
const on = require('@clubajax/on');

module.exports = function (component, show, hide) {
	const input = component.input;
	const picker = component.picker;
	const timeInput = picker.timeInput;
	const focusLoop = picker.querySelector('input.focus-loop');

	let current;
	let inPicker = false;

	function onNavigate (e, tabbingBackwards) {
		const first = picker.querySelector('[tabindex="0"]');

		if (e.target === picker) {
			if (tabbingBackwards) {
				input.focus();
				return stop(e);
			} else {
				first.focus();
				return stop(e);
			}
		}

		if (e.target === focusLoop) {
			console.log('focus-loop');
			first.focus();
			return stop(e);
		}
		current = getParent(e.target);

		inPicker = current === picker;
		if (!current) {
			hide();
		}

		return true;
	}

	const upHandle = on(document, 'keyup', (e) => {
		if (e.key === 'Escape') {
			hide();
			return;
		}
		if (e.key === 'Tab') {
			return onNavigate(e, e.shiftKey);
		}
	});

	on(input, 'focus', show);

	const docHandle = on(document.body, 'mousedown', (e) => {
		return onNavigate(e);
	});

	function getParent (node) {
		if (node === input) {
			return input;
		}
		if (node === picker) {
			return picker;
		}
		if (node === timeInput) {
			return timeInput;
		}
		if (node === document.body || !node.parentNode) {
			return null;
		}
		return getParent(node.parentNode);
	}

	function stop (e) {
		e.preventDefault();
		e.stopImmediatePropagation();
		return false;
	}

	//show();

	return on.makeMultiHandle([upHandle, docHandle]);
};

},{"@clubajax/on":"@clubajax/on"}],9:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');

class Icon extends BaseComponent {
	get templateString () {
		return `
<?xml version="1.0" ?>
<svg viewBox="0 0 12 13" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs></defs>
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="mvp-projectdb-web" transform="translate(-544.000000, -84.000000)" fill="#0A0B09">
            <g id="Header" transform="translate(0.000000, 70.000000)">
                <g id="Calender-&amp;-Date" transform="translate(544.000000, 14.000000)">
                    <g id="fa-calendar">
                        <path d="M0.284719899,11.8128991 C0.452589453,11.9813033 0.656812922,12.0652381 0.884559514,12.0652381 L10.3162623,12.0652381 C10.5445435,12.0652381 10.7482323,11.9813033 10.9166365,11.8128991 C11.0845061,11.6450296 11.1684408,11.4408061 11.1684408,11.2130595 L11.1684408,2.63300073 C11.1684408,2.40525413 11.0845061,2.20103066 10.9166365,2.03316111 C10.7482323,1.86529156 10.5445435,1.78135678 10.3162623,1.78135678 L9.45232214,1.78135678 L9.45232214,1.13340169 C9.45232214,0.845243441 9.34432963,0.593439111 9.14064078,0.37745408 C8.92465575,0.173230611 8.6723168,0.0652380952 8.38469317,0.0652380952 L7.95272311,0.0652380952 C7.66456486,0.0652380952 7.41276053,0.173230611 7.1967755,0.37745408 C6.99255203,0.593439111 6.88455951,0.845243441 6.88455951,1.13340169 L6.88455951,1.78135678 L4.31679688,1.78135678 L4.31679688,1.13340169 C4.31679688,0.845243441 4.20880437,0.593439111 4.0045809,0.37745408 C3.78859587,0.173230611 3.53679154,0.0652380952 3.24863329,0.0652380952 L2.81666323,0.0652380952 C2.52850498,0.0652380952 2.27670065,0.173230611 2.06071562,0.37745408 C1.85649215,0.593439111 1.74849964,0.845243441 1.74849964,1.13340169 L1.74849964,1.78135678 L0.896855692,1.78135678 C0.656812922,1.78135678 0.452589453,1.86529156 0.284719899,2.03316111 C0.116850346,2.20103066 0.0323809524,2.40525413 0.0323809524,2.63300073 L0.0323809524,11.2130595 C0.0323809524,11.4408061 0.116850346,11.6450296 0.284719899,11.8128991 L0.284719899,11.8128991 Z M0.884559514,9.28095582 L2.81666323,9.28095582 L2.81666323,11.2130595 L0.884559514,11.2130595 L0.884559514,9.28095582 Z M0.884559514,6.70089701 L2.81666323,6.70089701 L2.81666323,8.84898576 L0.884559514,8.84898576 L0.884559514,6.70089701 Z M0.884559514,4.34911941 L2.81666323,4.34911941 L2.81666323,6.26892695 L0.884559514,6.26892695 L0.884559514,4.34911941 Z M2.6006782,1.13340169 C2.6006782,1.07299003 2.62473594,1.02540917 2.66055524,0.977293695 C2.70867071,0.941474396 2.75678619,0.917416657 2.81666323,0.917416657 L3.24863329,0.917416657 C3.30851033,0.917416657 3.35662581,0.941474396 3.40474128,0.977293695 C3.44056058,1.02540917 3.46461832,1.07299003 3.46461832,1.13340169 L3.46461832,3.06497079 C3.46461832,3.12538244 3.44056058,3.1729633 3.40474128,3.22107878 C3.35662581,3.2574327 3.30851033,3.28095582 3.24863329,3.28095582 L2.81666323,3.28095582 C2.75678619,3.28095582 2.70867071,3.2574327 2.66055524,3.22107878 C2.62473594,3.1729633 2.6006782,3.12538244 2.6006782,3.06497079 L2.6006782,1.13340169 L2.6006782,1.13340169 Z M3.24863329,9.28095582 L5.38442586,9.28095582 L5.38442586,11.2130595 L3.24863329,11.2130595 L3.24863329,9.28095582 Z M3.24863329,6.70089701 L5.38442586,6.70089701 L5.38442586,8.84898576 L3.24863329,8.84898576 L3.24863329,6.70089701 Z M3.24863329,4.34911941 L5.38442586,4.34911941 L5.38442586,6.26892695 L3.24863329,6.26892695 L3.24863329,4.34911941 Z M5.81639592,9.28095582 L7.96448467,9.28095582 L7.96448467,11.2130595 L5.81639592,11.2130595 L5.81639592,9.28095582 Z M5.81639592,6.70089701 L7.96448467,6.70089701 L7.96448467,8.84898576 L5.81639592,8.84898576 L5.81639592,6.70089701 Z M5.81639592,4.34911941 L7.96448467,4.34911941 L7.96448467,6.26892695 L5.81639592,6.26892695 L5.81639592,4.34911941 Z M7.73673808,1.13340169 C7.73673808,1.07299003 7.7602612,1.02540917 7.79661511,0.977293695 C7.84473059,0.941474396 7.89231145,0.917416657 7.95272311,0.917416657 L8.38469317,0.917416657 C8.44457021,0.917416657 8.49268568,0.941474396 8.54026654,0.977293695 C8.57662046,1.02540917 8.6006782,1.07299003 8.6006782,1.13340169 L8.6006782,3.06497079 C8.6006782,3.12538244 8.57662046,3.1729633 8.54026654,3.22107878 C8.49268568,3.2574327 8.44457021,3.28095582 8.38469317,3.28095582 L7.95272311,3.28095582 C7.89231145,3.28095582 7.84473059,3.2574327 7.79661511,3.22107878 C7.7602612,3.1729633 7.73673808,3.12538244 7.73673808,3.06497079 L7.73673808,1.13340169 L7.73673808,1.13340169 Z M8.39645473,9.28095582 L10.3162623,9.28095582 L10.3162623,11.2130595 L8.39645473,11.2130595 L8.39645473,9.28095582 Z M8.39645473,6.70089701 L10.3162623,6.70089701 L10.3162623,8.84898576 L8.39645473,8.84898576 L8.39645473,6.70089701 Z M8.39645473,4.34911941 L10.3162623,4.34911941 L10.3162623,6.26892695 L8.39645473,6.26892695 L8.39645473,4.34911941 Z"></path>
                    </g>
                </g>
            </g>
        </g>
    </g>
</svg>

`;
	}
}


customElements.define('icon-calendar', Icon);

module.exports = Icon;

},{"@clubajax/base-component":"@clubajax/base-component"}],10:[function(require,module,exports){
const util = require('./util');

function onKey (e) {
	let str = this.typedValue || '';
	const beg = e.target.selectionStart;
	const end = e.target.selectionEnd;
	const k = e.key;

	if (k === 'Enter') {
		if (this.hide) {
			this.hide();
		}
		this.emit('change', { value: this.value });
	}

	if (k === 'Escape') {
		if (!this.isValid()) {
			this.value = this.strDate;
			this.hide();
			this.input.blur();
		}
	}

	if (util.isControl(e)) {
		util.stopEvent(e);
		return;
	}

	function setSelection (pos) {
		e.target.selectionEnd = pos;
	}

	if (!util.isNum(k)) {
		// handle paste, backspace
		if (this.input.value !== this.typedValue) {
			this.setValue(this.input.value, true);
		}

		const value = this.input.value;
		const type = util.is(value).type();

		if (util.isArrowKey[k]) {

			// FIXME: test is not adding picker time
			// 12/12/2017 06:30 am'

			const inc = k === 'ArrowUp' ? 1 : -1;
			if (/time/.test(type)) {
				const HR = type === 'time' ? [0,2] : [11,13];
				const MN = type === 'time' ? [3,5] : [14,16];
				if (end >= HR[0] && end <= HR[1]) {
					this.setValue(util.incHours(value, inc), true);
				} else if (end >= MN[0] && end <= MN[1]) {
					this.setValue(util.incMinutes(value, inc, 15), true);
				} else {
					this.setValue(value.replace(/([ap]m)/i, str => /a/i.test(str) ? 'pm' : 'am' ), true);
					// this.setValue(value, true, /a/i.test(value) ? 'pm' : 'am');
				}
			}

			if (/date/.test(type)) {
				if (end <= 2 ) {
					this.setValue(util.incMonth(value, inc), true);
				} else if (end < 5) {
					this.setValue(util.incDate(value, inc), true);
				} else if (end < 11) {
					this.setValue(util.incYear(value, inc), true);
				}
			}

		} else if (/[ap]/i.test(k) && /time/.test(type)) {
			this.setValue(this.setAMPM(value, k === 'a' ? 'am' : 'pm'), true);
		}

		setSelection(beg);
		util.stopEvent(e);
		return;
	}
	if (str.length !== end && beg === end) {
		// handle selection or middle-string edit
		let temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
		const nextCharPos = util.nextNumPos(beg + 1, temp);
		if (nextCharPos > -1) {
			temp = util.removeCharAtPos(temp, beg + 1);
		}

		const value = this.setValue(temp, true);
		const nextChar = value.charAt(beg + 1);

		setSelection(/[\s\/:]/.test(nextChar) ? beg + 2 : beg + 1);
		util.stopEvent(e);
		return;

	} else if (end !== beg) {
		// selection replace
		let temp = util.replaceText(this.typedValue, k, beg, end, 'X');
		const value = this.setValue(temp, true);

		setSelection(beg + 1);
		util.stopEvent(e);
		return;
	}


	this.setValue(str + k, true);
}

module.exports = onKey;
},{"./util":12}],11:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');

const defaultPlaceholder = 'HH:MM am/pm';
const defaultMask = 'XX:XX';
const props = ['label', 'name', 'placeholder', 'mask', 'event-name', 'min', 'max'];
const bools = ['required'];
const EVENT_NAME = 'change';

class TimeInput extends BaseComponent {
	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	attributeChanged (name, value) {
		// need to manage value manually
		if (name === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		if (dates.isValidObject(value)) {
			// this.orgDate = value;
			// this.setDate(value);
			value = dates.format(value, 'h:m a');
			this.setAMPM(value);
		}
		this.strDate = util.stripDate(value);
		onDomReady(this, () => {
			this.setValue(this.strDate);
		});
	}

	get value () {
		return this.strDate;
	}

	get valid () {
		return this.isValid();
	}

	onLabel (value) {
		this.labelNode.innerHTML = value;
	}

	onMin (value) {
		this.minTime = dates.format(util.getMinTime(value), 'h:m a');
		this.minDate = util.getMinDate(value);
		this.validate();
	}

	onMax (value) {
		this.maxTime = dates.format(util.getMaxTime(value), 'h:m a');
		this.maxDate = util.getMaxDate(value);
		this.validate();
	}

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" class="empty" />
</label>`;
	}

	constructor () {
		super();
		this.typedValue = '';
	}

	setValue (value, silent, ampm) {
		const isReady = /[ap]m/i.test(value) || value.replace(/(?!X)\D/g, '').length >= 4;
		if (isReady) {
			this.setAMPM(value, getAMPM(value, ampm));
			value = util.formatTime(value);
			if (value.length === 5) {
				value = this.setAMPM(value);
			}
		}

		this.typedValue = value;
		this.input.value = value;
		const valid = this.validate();

		if (valid) {
			this.strDate = value;
			if (!silent) {
				this.emitEvent();
			}
		}
		return value;
	}

	setDate (value) {
		// sets the current date, but not the time
		// used when inside a date picker for min/max
		this.date = value;
		this.validate();
	}

	isValid (value = this.input.value) {
		if (!value && this.required) {
			this.emitError('This field is required');
			return false;
		}
		if (this.date && value) {
			if (this.minDate && dates.is(this.date).equalDate(this.minDate)) {
				if (util.is(value).less(this.minTime)) {
					const msg = this.min === 'now' ? 'Value must be in the future' : `Value is less than the minimum, ${this.min}`;
					this.emitError(msg);
					return false;
				}
			}
			if (this.maxDate && dates.is(this.date).equalDate(this.maxDate)) {
				if (util.is(value).greater(this.maxTime)) {
					const msg = this.max === 'now' ? 'Value must be in the past' : `Value is greater than the maximum, ${this.max}`;
					this.emitError(msg);
					return false;
				}
			}
		} else if (value) {
			if (this.minTime) {
				if (util.is(value).less(this.minTime)) {
					const msg = this.min === 'now' ? 'Value must be in the future' : `Value is less than the minimum, ${this.min}`;
					this.emitError(msg);
					return false;
				}
			}
			if (this.maxTime) {
				if (util.is(value).greater(this.maxTime)) {
					const msg = this.max === 'now' ? 'Value must be in the past' : `Value is greater than the maximum, ${this.max}`;
					this.emitError(msg);
					return false;
				}
			}
		}
		return util.timeIsValid(value);
	}

	validate () {
		if (this.isValid()) {
			this.classList.remove('invalid');
			this.emitError(null);
			return true;
		}
		this.classList.add('invalid');
		return false;
	}

	setAMPM (value, ampm) {
		let isAM;
		if (ampm) {
			isAM = /a/i.test(ampm);
		} else if (/[ap]/.test(value)) {
			isAM = /a/i.test(value);
		} else {
			isAM = this.isAM;
		}
		value = value.replace(/\s*[ap]m/i, '') + (isAM ? ' am' : ' pm');
		this.isAM = isAM;
		this.isPM = !isAM;
		return value;
	}

	focus () {
		this.onDomReady(() => {
			this.input.focus();
		});
	}

	blur () {
		this.onDomReady(() => {
			this.input.blur();
			this.validate();
			this.emitEvent();
		})
	}

	domReady () {
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		if (this.name) {
			this.input.setAttribute('name', this.name);
		}
		if (this.label) {
			this.labelNode.innerHTML = this.label;
		}
		this.eventName = this['event-name'] || EVENT_NAME;
		this.emitType = this.eventName === EVENT_NAME ? 'emit' : 'fire';
		this.connectKeys();
	}

	emitEvent () {
		const value = this.value;
		if (value === this.lastValue || !this.isValid(value)) {
			return;
		}
		this.lastValue = value;
		this[this.emitType](this.eventName, { value }, true);
	}

	emitError (msg) {
		if (msg === this.validationError) {
			return;
		}
		this.validationError = msg;
		this.fire('validation', { message: msg }, true);
	}

	connectKeys () {
		this.on(this.input, 'keydown', util.stopEvent);
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e);
		});
		this.on(this.input, 'blur', () => {
			this.blur();
		});
	}
}

function getAMPM (value, ampm) {
	if (ampm) {
		return ampm;
	}
	if (/a/i.test(value)) {
		return 'am';
	}
	if (/p/i.test(value)) {
		return 'pm';
	}
	return '';
}

customElements.define('time-input', TimeInput);

module.exports = TimeInput;
},{"./onKey":10,"./util":12,"@clubajax/base-component":"@clubajax/base-component","@clubajax/dates":1,"@clubajax/dom":"@clubajax/dom","@clubajax/on":"@clubajax/on"}],12:[function(require,module,exports){
const dates = require('@clubajax/dates');

function round (n, r, down) {
	return (Math.ceil(n / r) * r) - (down ? r : 0);
}

function incMinutes (value, inc, mult = 1) {

	const type = is(value).type();
	const MN = type === 'time' ? [3,5] : [14,16];

	let mn = parseInt(value.substring(MN[0], MN[1]));
	const org = mn;

	mn = round(mn, mult, inc === -1);

	if (mn === org) {
		mn += (inc * mult);
	}

	if (mn > 59) {
		mn = 0;
	}
	if (mn < 0) {
		mn = 45;
	}

	return `${value.substring(0, MN[0])}${pad(mn)}${value.substring(MN[1])}`;
}

function incHours (value, inc) {
	const type = is(value).type();
	const HR = type === 'time' ? [0,2] : [11,13];
	let hr = parseInt(value.substring(HR[0], HR[1]));
	hr += inc;
	if (hr < 1) {
		hr = 12;
	} else if (hr > 12) {
		hr = 1;
	}
	return `${value.substring(0, HR[0])}${pad(hr)}${value.substring(HR[1])}`;
}

function incMonth (value, inc) {
	let mo = parseInt(value.substring(0,2));
	mo += inc;
	if (mo > 12) {
		mo = 1;
	} else if (mo <= 0) {
		mo = 12;
	}
	return `${pad(mo)}${value.substring(2)}`;
}

function incDate (value, inc) {
	const date = dates.toDate(value);
	const max = dates.getDaysInMonth(date);
	let dt = parseInt(value.substring(3,5));
	dt += inc;
	if (dt <= 0) {
		dt = max;
	} else if (dt > max) {
		dt = 1;
	}
	return `${value.substring(0,2)}${pad(dt)}${value.substring(6)}`;
}

function incYear (value, inc) {
	let yr = parseInt(value.substring(6,10));
	yr += inc;
	return `${value.substring(0,5)}${pad(yr)}${value.substring(11)}`;
}

function pad (num) {
	if (num < 10) {
		return '0' + num;
	}
	return '' + num;
}

function toDateTime (value) {
	// FIXME: toTime() or to strTime() or DELETE - only used in util
	if (typeof value === 'object') {
		value = dates.format(value, 'h:m a');
	} else {
		value = stripDate(value);
	}
	const hr = getHours(value);
	const mn = getMinutes(value);
	const sc = getSeconds(value);
	if (isNaN(hr) || isNaN(mn)) {
		throw new Error('Invalid time ' + time);
	}
	const date = new Date();
	date.setHours(hr);
	date.setMinutes(mn);
	date.setSeconds(sc);
	return date;
}

function timeIsValid (value) {
	// 12:34 am
	if (value.length < 8) {
		return false;
	}
	const hr = getHours(value);
	const mn = getMinutes(value);
	if (isNaN(hr) || isNaN(mn)) {
		return false;
	}
	if (!/[ap]m/i.test(value)) {
		return false;
	}
	if (hr < 0 || hr > 12) {
		return false;
	}
	if (mn < 0 || mn > 59) {
		return false;
	}
	return true;
}

function timeIsInRange (time, min, max, date) {
	if (!min && !max) {
		return true;
	}

	if (date) {
		// first check date range, before time range
		console.log('date.range', date, '/', min, '/', max);
		return true;
	}


	console.log('time.range', time, '/', min, '/', max);
	const d = toDateTime(time);
	// isGreater: 1st > 2nd
	if (min && !dates.is(d).greater(toDateTime(min))) {
		return false;
	}
	if (max && !dates.is(d).less(toDateTime(max))) {
		return false;
	}

	return true;
}

function addTimeToDate (time, date) {
	if (!timeIsValid(time)) {
		console.warn('time is not valid', time);
		return date;
	}
	let hr = getHours(time);
	const mn = getMinutes(time);
	if (/pm/i.test(time) && hr !== 12) {
		hr += 12;
	}
	date.setHours(hr);
	date.setMinutes(mn);
	return date;
}

function nextNumPos (beg, s) {
	let char, i, found = false;
	for (i = 0; i < s.length; i++) {
		if (i < beg) {
			continue;
		}
		char = s.charAt(i);
		if (!isNaN(parseInt(char))) {
			char = parseInt(char);
		}
		if (typeof char === 'number') {
			found = true;
			break;
		}
	}

	return found ? i : -1;
}

const numReg = /[0-9]/;

function isNum (k) {
	return numReg.test(k);
}

const control = {
	'Shift': 1,
	'Enter': 1,
	'Backspace': 1,
	'Delete': 1,
	'ArrowLeft': 1,
	'ArrowRight': 1,
	'Escape': 1,
	'Command': 1,
	'Tab': 1,
	'Meta': 1,
	'Alt': 1
};

const isArrowKey = {
	'ArrowUp': 1,
	'ArrowDown': 1
};

function isControl (e) {
	return control[e.key];
}

function timeToSeconds (value) {
	const isAM = /am/i.test(value);
	let hr = getHours(value);
	if (isAM && hr === 12) {
		hr = 0;
	} else if (!isAM && hr !== 12) {
		hr += 12;
	}
	let mn = getMinutes(value);
	const sc = getSeconds(value);
	if (isNaN(hr) || isNaN(mn)) {
		throw new Error('Invalid time ' + time);
	}
	mn *= 60;
	hr *= 3600;
	return hr + mn + sc;
}

function getHours (value) {
	return parseInt(value.substring(0, 2));
}

function getMinutes (value) {
	return parseInt(value.substring(3, 5));
}

function getSeconds (value) {
	if (value.split(':').length === 3) {
		return parseInt(value.substring(6, 8));
	}
	return 0;
}

function stripDate (str) {
	return str.replace(/\d+[\/-]\d+[\/-]\d+\s*/, '');
}

function stopEvent (e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
	return false;
}

function removeCharAtPos (str, pos) {
	return str.substring(0, pos) + str.substring(pos + 1);
}

function replaceText (str, chars, beg, end, xChars) {
	chars = chars.padEnd(end - beg, xChars);
	return str.substring(0, beg) + chars + str.substring(end);
}

function formatDate (s, mask) {
	function sub (pos) {
		let subStr = '';
		for (let i = pos; i < mask.length; i++) {
			if (mask[i] === 'X') {
				break;
			}
			subStr += mask[i];
		}
		return subStr;
	}

	s = s.replace(/(?!X)\D/g, '');
	const maskLength = mask.match(/X/g).join('').length;
	let f = '';
	const len = Math.min(s.length, maskLength);
	for (let i = 0; i < len; i++) {
		if (mask[f.length] !== 'X') {
			f += sub(f.length);
		}
		f += s[i];
	}
	return f;
}

function formatTime (s) {
	s = s.replace(/(?!X)\D/g, '');
	s = s.substring(0, 4);
	if (s.length < 4) {
		s = `0${s}`;
	}
	if (s.length >= 2) {
		s = s.split('');
		s.splice(2, 0, ':');
		s = s.join('');
	}
	return s;
}

function getAMPM (value) {
	const result = /[ap]m/.exec(value);
	return result ? result[0] : null;
}

function getMinDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setHours(0);
	value.setMinutes(0);
	value.setSeconds(0);
	value.setMilliseconds(0);
	return value;
}

function getMaxDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setHours(23);
	value.setMinutes(59);
	value.setSeconds(59);
	value.setMilliseconds(999);
	return value;
}

function getMinTime (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setSeconds(value.getSeconds() - 2);
	return value;
}

function getMaxTime (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setSeconds(value.getSeconds() + 2);
	return value;
}

function toAriaLabel (date) {
	date = dates.toDate(date);
	return dates.format(date, 'd, E MMMM yyyy');
}

function is (value) {
	return {
		less (time) {
			return timeToSeconds(value) < timeToSeconds(time);
		},
		greater (time) {
			return timeToSeconds(value) > timeToSeconds(time);
		},
		dateAndTime () {
			return dates.is(value).date() && dates.is(value).time();
		},
		time () {
			return dates.is(value).time();
		},
		date () {
			return dates.is(value).date();
		},
		type () {
			if (this.dateAndTime()) {
				return 'datetime';
			}
			if (this.time()) {
				return 'time';
			}
			if (this.date()) {
				return 'date';
			}
			return '';
		}
	}
}

module.exports = {
	is,
	addTimeToDate,
	timeIsValid,
	incMinutes,
	incHours,
	incMonth,
	incDate,
	incYear,
	round,
	pad,
	isNum,
	control,
	isArrowKey,
	isControl,
	stopEvent,
	nextNumPos,
	removeCharAtPos,
	replaceText,
	formatDate,
	formatTime,
	getAMPM,
	getMinDate,
	getMaxDate,
	toAriaLabel,
	getMinTime,
	getMaxTime,
	timeIsInRange,
	toDateTime,
	timeToSeconds,
	stripDate
};

},{"@clubajax/dates":1}],13:[function(require,module,exports){
require('date-picker/src/date-input');
require('date-picker/src/date-picker');
require('date-picker/src/date-range-input');
require('date-picker/src/date-range-inputs');
require('date-picker/src/date-range-picker');
require('date-picker/src/date-time-input');
require('date-picker/src/time-input');
},{"date-picker/src/date-input":2,"date-picker/src/date-picker":3,"date-picker/src/date-range-input":4,"date-picker/src/date-range-inputs":5,"date-picker/src/date-range-picker":6,"date-picker/src/date-time-input":7,"date-picker/src/time-input":11}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGNsdWJhamF4L2RhdGVzL3NyYy9kYXRlcy5qcyIsIm5vZGVfbW9kdWxlcy9kYXRlLXBpY2tlci9zcmMvZGF0ZS1pbnB1dC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRlLXBpY2tlci9zcmMvZGF0ZS1waWNrZXIuanMiLCJub2RlX21vZHVsZXMvZGF0ZS1waWNrZXIvc3JjL2RhdGUtcmFuZ2UtaW5wdXQuanMiLCJub2RlX21vZHVsZXMvZGF0ZS1waWNrZXIvc3JjL2RhdGUtcmFuZ2UtaW5wdXRzLmpzIiwibm9kZV9tb2R1bGVzL2RhdGUtcGlja2VyL3NyYy9kYXRlLXJhbmdlLXBpY2tlci5qcyIsIm5vZGVfbW9kdWxlcy9kYXRlLXBpY2tlci9zcmMvZGF0ZS10aW1lLWlucHV0LmpzIiwibm9kZV9tb2R1bGVzL2RhdGUtcGlja2VyL3NyYy9mb2N1c01hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZGF0ZS1waWNrZXIvc3JjL2ljb24tY2FsZW5kYXIuanMiLCJub2RlX21vZHVsZXMvZGF0ZS1waWNrZXIvc3JjL29uS2V5LmpzIiwibm9kZV9tb2R1bGVzL2RhdGUtcGlja2VyL3NyYy90aW1lLWlucHV0LmpzIiwibm9kZV9tb2R1bGVzL2RhdGUtcGlja2VyL3NyYy91dGlsLmpzIiwic2NyaXB0cy9kYXRlLXBpY2tlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ptQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgY3VzdG9tTG9hZGVyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y3VzdG9tTG9hZGVyKGZhY3RvcnksICdkYXRlcycpO1xuXHR9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdH1cblx0ZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuXHRcdHdpbmRvdy5kYXRlcyA9IGZhY3RvcnkoKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cblx0Y29uc3Rcblx0XHQvLyB0ZXN0cyB0aGF0IGl0IGlzIGEgZGF0ZSBzdHJpbmcsIG5vdCBhIHZhbGlkIGRhdGUuIDg4Lzg4Lzg4ODggd291bGQgYmUgdHJ1ZVxuXHRcdGRhdGVSZWdFeHAgPSAvXihcXGR7MSwyfSkoW1xcLy1dKShcXGR7MSwyfSkoW1xcLy1dKShcXGR7NH0pXFxiLyxcblxuXHRcdC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcblx0XHR0c1JlZ0V4cCA9IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSlcXGIvLFxuXG5cdFx0Ly8gMTI6MzAgYW1cblx0XHR0aW1lUmVnRXhwID0gLyhcXGRcXGQpOihcXGRcXGQpKD86XFxzfDopKFxcZFxcZHxbYXBdbSkoPzpcXHMpKihbYXBdbSkqL2ksXG5cblx0XHRkYXlzT2ZXZWVrID0gWydTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheSddLFxuXHRcdGRheXMgPSBbXSxcblx0XHRkYXlzMyA9IFtdLFxuXHRcdGRheURpY3QgPSB7fSxcblxuXHRcdG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxuXHRcdG1vbnRoTGVuZ3RocyA9IFszMSwgMjgsIDMxLCAzMCwgMzEsIDMwLCAzMSwgMzEsIDMwLCAzMSwgMzAsIDMxXSxcblx0XHRtb250aEFiYnIgPSBbXSxcblx0XHRtb250aERpY3QgPSB7fSxcblxuXHRcdC8vIGh0dHBzOi8vZG9jcy5vcmFjbGUuY29tL2phdmFzZS83L2RvY3MvYXBpL2phdmEvdGV4dC9TaW1wbGVEYXRlRm9ybWF0Lmh0bWxcblx0XHQvL1xuXHRcdGRhdGVQYXR0ZXJuID0gL3l5eXl8eXl8TU1NTXxNTU18TU18TXxkZHxkfEV8ZXxIfGh8bXxzfEF8YS9nLFxuXHRcdGRhdGVQYXR0ZXJuTGlicmFyeSA9IHtcblx0XHRcdHl5eXk6IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCk7XG5cdFx0XHR9LFxuXHRcdFx0eXk6IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiAoZGF0ZS5nZXRGdWxsWWVhcigpICsgJycpLnN1YnN0cmluZygyKTtcblx0XHRcdH0sXG5cdFx0XHRNTU1NOiBmdW5jdGlvbiAoZGF0ZSkge1xuXHRcdFx0XHRyZXR1cm4gbW9udGhzW2RhdGUuZ2V0TW9udGgoKV07XG5cdFx0XHR9LFxuXHRcdFx0TU1NOiBmdW5jdGlvbiAoZGF0ZSkge1xuXHRcdFx0XHRyZXR1cm4gbW9udGhBYmJyW2RhdGUuZ2V0TW9udGgoKV07XG5cdFx0XHR9LFxuXHRcdFx0TU06IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiBwYWQoZGF0ZS5nZXRNb250aCgpICsgMSk7XG5cdFx0XHR9LFxuXG5cdFx0XHRNOiBmdW5jdGlvbiAoZGF0ZSkge1xuXHRcdFx0XHRyZXR1cm4gZGF0ZS5nZXRNb250aCgpICsgMTtcblx0XHRcdH0sXG5cdFx0XHRkZDogZnVuY3Rpb24gKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuIHBhZChkYXRlLmdldERhdGUoKSk7XG5cdFx0XHR9LFxuXHRcdFx0ZDogZnVuY3Rpb24gKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0RGF0ZSgpO1xuXHRcdFx0fSxcblx0XHRcdEU6IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiBkYXlzT2ZXZWVrW2RhdGUuZ2V0RGF5KCldO1xuXHRcdFx0fSxcblx0XHRcdGU6IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiBkYXlzM1tkYXRlLmdldERheSgpXTtcblx0XHRcdH0sXG5cdFx0XHRIOiBmdW5jdGlvbiAoZGF0ZSkge1xuXHRcdFx0XHRyZXR1cm4gcGFkKGRhdGUuZ2V0SG91cnMoKSk7XG5cdFx0XHR9LFxuXHRcdFx0aDogZnVuY3Rpb24gKGRhdGUpIHtcblx0XHRcdFx0dmFyIGhyID0gZGF0ZS5nZXRIb3VycygpO1xuXHRcdFx0XHRpZiAoaHIgPiAxMikge1xuXHRcdFx0XHRcdGhyIC09IDEyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChociA9PT0gMCkge1xuXHRcdFx0XHRcdGhyID0gMTI7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHBhZChocik7XG5cdFx0XHR9LFxuXHRcdFx0bTogZnVuY3Rpb24gKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuIHBhZChkYXRlLmdldE1pbnV0ZXMoKSk7XG5cdFx0XHR9LFxuXHRcdFx0czogZnVuY3Rpb24gKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuIHBhZChkYXRlLmdldFNlY29uZHMoKSk7XG5cdFx0XHR9LFxuXHRcdFx0QTogZnVuY3Rpb24gKGRhdGUpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuYShkYXRlKS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0fSxcblx0XHRcdGE6IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiBkYXRlLmdldEhvdXJzKCkgPj0gMTIgPyAncG0nIDogJ2FtJztcblx0XHRcdH0sXG5cblx0XHRcdC8vIG5vdCBzdGFuZGFyZDpcblx0XHRcdG1tbW06IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLk1NTU0oZGF0ZSk7XG5cdFx0XHR9LFxuXHRcdFx0bW1tOiBmdW5jdGlvbiAoZGF0ZSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5NTU0oZGF0ZSk7XG5cdFx0XHR9LFxuXHRcdFx0bW06IGZ1bmN0aW9uIChkYXRlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLk1NKGRhdGUpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRsZW5ndGggPSAoZnVuY3Rpb24gKCkge1xuXHRcdFx0Y29uc3Rcblx0XHRcdFx0c2VjID0gMTAwMCxcblx0XHRcdFx0bWluID0gc2VjICogNjAsXG5cdFx0XHRcdGhyID0gbWluICogNjAsXG5cdFx0XHRcdGRheSA9IGhyICogMjQsXG5cdFx0XHRcdHdlZWsgPSBkYXkgKiA3O1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c2VjOiBzZWMsXG5cdFx0XHRcdG1pbjogbWluLFxuXHRcdFx0XHRocjogaHIsXG5cdFx0XHRcdGRheTogZGF5LFxuXHRcdFx0XHR3ZWVrOiB3ZWVrXG5cdFx0XHR9O1xuXHRcdH0oKSk7XG5cblx0Ly8gcG9wdWxhdGUgZGF5LXJlbGF0ZWQgc3RydWN0dXJlc1xuXHRkYXlzT2ZXZWVrLmZvckVhY2goZnVuY3Rpb24gKGRheSwgaW5kZXgpIHtcblx0XHRkYXlEaWN0W2RheV0gPSBpbmRleDtcblx0XHRsZXQgYWJiciA9IGRheS5zdWJzdHIoMCwgMik7XG5cdFx0ZGF5cy5wdXNoKGFiYnIpO1xuXHRcdGRheURpY3RbYWJicl0gPSBpbmRleDtcblx0XHRhYmJyID0gZGF5LnN1YnN0cigwLCAzKTtcblx0XHRkYXlzMy5wdXNoKGFiYnIpO1xuXHRcdGRheURpY3RbYWJicl0gPSBpbmRleDtcblx0fSk7XG5cblx0Ly8gcG9wdWxhdGUgbW9udGgtcmVsYXRlZCBzdHJ1Y3R1cmVzXG5cdG1vbnRocy5mb3JFYWNoKGZ1bmN0aW9uIChtb250aCwgaW5kZXgpIHtcblx0XHRtb250aERpY3RbbW9udGhdID0gaW5kZXg7XG5cdFx0Y29uc3QgYWJiciA9IG1vbnRoLnN1YnN0cigwLCAzKTtcblx0XHRtb250aEFiYnIucHVzaChhYmJyKTtcblx0XHRtb250aERpY3RbYWJicl0gPSBpbmRleDtcblx0fSk7XG5cblx0ZnVuY3Rpb24gaXNMZWFwWWVhciAoZGF0ZU9yWWVhcikge1xuXHRcdGNvbnN0IHllYXIgPSBkYXRlT3JZZWFyIGluc3RhbmNlb2YgRGF0ZSA/IGRhdGVPclllYXIuZ2V0RnVsbFllYXIoKSA6IGRhdGVPclllYXI7XG5cdFx0cmV0dXJuICEoeWVhciAlIDQwMCkgfHwgKCEoeWVhciAlIDQpICYmICEhKHllYXIgJSAxMDApKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzVmFsaWRPYmplY3QgKGRhdGUpIHtcblx0XHRsZXQgbXM7XG5cdFx0aWYgKHR5cGVvZiBkYXRlID09PSAnb2JqZWN0JyAmJiBkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xuXHRcdFx0bXMgPSBkYXRlLmdldFRpbWUoKTtcblx0XHRcdHJldHVybiAhaXNOYU4obXMpICYmIG1zID4gMDtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gaXNEYXRlICh2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gaXNWYWxpZE9iamVjdCh2YWx1ZSk7XG5cdFx0fVxuXHRcdGxldCBwYXJ0cywgZGF5LCBtb250aCwgeWVhciwgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIG1zO1xuXG5cdFx0aWYgKHRpbWVSZWdFeHAudGVzdCh2YWx1ZSkpIHtcblx0XHRcdC8vIGRvZXMgaXQgaGF2ZSBhIHZhbGlkIHRpbWUgZm9ybWF0P1xuXHRcdFx0cGFydHMgPSB0aW1lUmVnRXhwLmV4ZWModmFsdWUpO1xuXHRcdFx0bGV0IGhyID0gcGFyc2VJbnQocGFydHNbMV0pO1xuXHRcdFx0bGV0IG1uID0gcGFyc2VJbnQocGFydHNbMl0pO1xuXHRcdFx0bGV0IHNjID0gMDtcblx0XHRcdGlmIChpc05hTihocikgfHwgaXNOYU4obW4pKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdGlmICgvW2FwXW0vaS50ZXN0KHZhbHVlKSkge1xuXHRcdFx0XHQvLyB1c2VzIGFtL3BtXG5cdFx0XHRcdGlmIChociA+IDEyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIDI0IGhvdXIgY2xvY2tcblx0XHRcdFx0c2MgPSBwYXJzZUludChwYXJ0c1szXSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBhc3N1bWVzIDI0IGhvdXIgY2xvY2sgaGVyZVxuXHRcdFx0aWYgKHNjIDwgMCB8fCBzYyA+IDU5IHx8IG1uIDwgMCB8fCBtbiA+IDU5IHx8IGhyIDwgMCB8fCBociA+IDIzKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdC8vIGNvbnRpbnVlIHdpdGggZGF0ZS4uLlxuXHRcdH1cblxuXHRcdC8vIGlzIGl0IGEgZGF0ZSBpbiBVUyBmb3JtYXQ/XG5cdFx0cGFydHMgPSBkYXRlUmVnRXhwLmV4ZWModmFsdWUpO1xuXHRcdGlmIChwYXJ0cyAmJiBwYXJ0c1syXSA9PT0gcGFydHNbNF0pIHtcblx0XHRcdG1vbnRoID0gK3BhcnRzWzFdO1xuXHRcdFx0ZGF5ID0gK3BhcnRzWzNdO1xuXHRcdFx0eWVhciA9ICtwYXJ0c1s1XTtcblx0XHRcdC8vIHJvdWdoIGNoZWNrIG9mIGEgeWVhclxuXHRcdFx0aWYgKDAgPCB5ZWFyICYmIHllYXIgPCAyMTAwICYmIDEgPD0gbW9udGggJiYgbW9udGggPD0gMTIgJiYgMSA8PSBkYXkgJiZcblx0XHRcdFx0ZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlzIGl0IGEgdGltZXN0YW1wIGluIGEgc3RhbmRhcmQgZm9ybWF0P1xuXHRcdHBhcnRzID0gdHNSZWdFeHAuZXhlYyh2YWx1ZSk7XG5cdFx0aWYgKHBhcnRzKSB7XG5cdFx0XHR5ZWFyID0gK3BhcnRzWzFdO1xuXHRcdFx0bW9udGggPSArcGFydHNbMl07XG5cdFx0XHRkYXkgPSArcGFydHNbM107XG5cdFx0XHRob3VycyA9ICtwYXJ0c1s0XTtcblx0XHRcdG1pbnV0ZXMgPSArcGFydHNbNV07XG5cdFx0XHRzZWNvbmRzID0gK3BhcnRzWzZdO1xuXHRcdFx0aWYgKDAgPCB5ZWFyICYmIHllYXIgPCAyMTAwICYmIDEgPD0gbW9udGggJiYgbW9udGggPD0gMTIgJiYgMSA8PSBkYXkgJiZcblx0XHRcdFx0ZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkgJiZcblx0XHRcdFx0aG91cnMgPCAyNCAmJiBtaW51dGVzIDwgNjAgJiYgc2Vjb25kcyA8IDYwKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIHBhZCAobnVtKSB7XG5cdFx0cmV0dXJuIChudW0gPCAxMCA/ICcwJyA6ICcnKSArIG51bTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldE1vbnRoIChkYXRlT3JJbmRleCkge1xuXHRcdHJldHVybiB0eXBlb2YgZGF0ZU9ySW5kZXggPT09ICdudW1iZXInID8gZGF0ZU9ySW5kZXggOiBkYXRlT3JJbmRleC5nZXRNb250aCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0TW9udGhJbmRleCAobmFtZSkge1xuXHRcdGNvbnN0IGluZGV4ID0gbW9udGhEaWN0W25hbWVdO1xuXHRcdHJldHVybiB0eXBlb2YgaW5kZXggPT09ICdudW1iZXInID8gaW5kZXggOiB2b2lkIDA7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRNb250aE5hbWUgKGRhdGUpIHtcblx0XHRyZXR1cm4gbW9udGhzW2dldE1vbnRoKGRhdGUpXTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldEZpcnN0U3VuZGF5IChkYXRlKSB7XG5cdFx0Ly8gcmV0dXJucyBhIG5lZ2F0aXZlIGluZGV4IHJlbGF0ZWQgdG8gdGhlIDFzdCBvZiB0aGUgbW9udGhcblx0XHRjb25zdCBkID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuXHRcdGQuc2V0RGF0ZSgxKTtcblx0XHRyZXR1cm4gLWQuZ2V0RGF5KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXREYXlzSW5QcmV2TW9udGggKGRhdGUpIHtcblx0XHRjb25zdCBkID0gbmV3IERhdGUoZGF0ZSk7XG5cdFx0ZC5zZXRNb250aChkLmdldE1vbnRoKCkgLSAxKTtcblx0XHRyZXR1cm4gZ2V0RGF5c0luTW9udGgoZCk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXREYXlzSW5Nb250aCAoZGF0ZSkge1xuXHRcdGNvbnN0IG1vbnRoID0gZGF0ZS5nZXRNb250aCgpO1xuXHRcdHJldHVybiBtb250aCA9PT0gMSAmJiBpc0xlYXBZZWFyKGRhdGUpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGhdO1xuXHR9XG5cblx0ZnVuY3Rpb24gdG9EYXRlICh2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0fVxuXHRcdGlmIChpc1RpbWVzdGFtcCh2YWx1ZSkpIHtcblx0XHRcdC8vIDIwMDAtMDItMjlUMDA6MDA6MDBcblx0XHRcdHJldHVybiBmcm9tVGltZXN0YW1wKHZhbHVlKTtcblx0XHR9XG5cdFx0bGV0IGRhdGUgPSBuZXcgRGF0ZSgtMSk7XG5cblx0XHQvLyAxMS8yMC8yMDAwXG5cdFx0bGV0IHBhcnRzID0gZGF0ZVJlZ0V4cC5leGVjKHZhbHVlKTtcblx0XHRpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG5cdFx0XHRkYXRlID0gbmV3IERhdGUoK3BhcnRzWzVdLCArcGFydHNbMV0gLSAxLCArcGFydHNbM10pO1xuXHRcdH1cblxuXHRcdGlmICh0aW1lUmVnRXhwLnRlc3QodmFsdWUpKSB7XG5cdFx0XHRwYXJ0cyA9IHRpbWVSZWdFeHAuZXhlYyh2YWx1ZSk7XG5cdFx0XHRsZXQgaHIgPSBwYXJzZUludChwYXJ0c1sxXSk7XG5cdFx0XHRsZXQgbW4gPSBwYXJzZUludChwYXJ0c1syXSk7XG5cdFx0XHRsZXQgc2MgPSB2YWx1ZS5zcGxpdCgnOicpLmxlbmd0aCA9PT0gMyA/IHBhcnNlSW50KHBhcnRzWzNdKSA6IDA7XG5cdFx0XHRpZiAoaXNOYU4oaHIpIHx8IGlzTmFOKG1uKSkge1xuXHRcdFx0XHRyZXR1cm4gZGF0ZTtcblx0XHRcdH1cblx0XHRcdGlmICgvW2FwXW0vaS50ZXN0KHZhbHVlKSkge1xuXHRcdFx0XHQvLyB1c2VzIGFtL3BtXG5cdFx0XHRcdGlmICgvcG0vaS50ZXN0KHZhbHVlKSkge1xuXHRcdFx0XHRcdGlmIChociAhPT0gMTIpIHtcblx0XHRcdFx0XHRcdGhyICs9IDEyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChociA9PT0gMTIpIHtcblx0XHRcdFx0XHRociA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gMjQgaG91ciBjbG9ja1xuXHRcdFx0XHRzYyA9IHBhcnNlSW50KHBhcnRzWzNdKTtcblx0XHRcdH1cblx0XHRcdGRhdGUuc2V0SG91cnMoaHIpO1xuXHRcdFx0ZGF0ZS5zZXRNaW51dGVzKG1uKTtcblx0XHRcdGRhdGUuc2V0U2Vjb25kcyhzYyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRhdGU7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JtYXREYXRlUGF0dGVybiAoZGF0ZSwgcGF0dGVybikge1xuXHRcdC8vICdNIGQsIHl5eXknIERlYyA1LCAyMDE1XG5cdFx0Ly8gJ01NIGRkIHl5JyBEZWNlbWJlciAwNSAxNVxuXHRcdC8vICdtLWQteXknIDEtMS0xNVxuXHRcdC8vICdtbS1kZC15eXl5JyAwMS0wMS0yMDE1XG5cdFx0Ly8gJ20vZC95eScgMTIvMjUvMTVcblx0XHQvLyB0aW1lOlxuXHRcdC8vICd5eXl5L01NL2RkIGg6bSBBJyAyMDE2LzAxLzI2IDA0OjIzIEFNXG5cblx0XHRpZiAoL15tXFwvfFxcL21cXC8vLnRlc3QocGF0dGVybikpIHtcblx0XHRcdGNvbnNvbGUud2FybignSW52YWxpZCBwYXR0ZXJuLiBEaWQgeW91IG1lYW46JywgcGF0dGVybi5yZXBsYWNlKCdtJywgJ00nKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHBhdHRlcm4ucmVwbGFjZShkYXRlUGF0dGVybiwgZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdHJldHVybiBkYXRlUGF0dGVybkxpYnJhcnlbbmFtZV0oZGF0ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JtYXQgKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybikge1xuXHRcdGlmIChkZWxpbWl0ZXJPclBhdHRlcm4gJiYgZGVsaW1pdGVyT3JQYXR0ZXJuLmxlbmd0aCA+IDEpIHtcblx0XHRcdHJldHVybiBmb3JtYXREYXRlUGF0dGVybihkYXRlLCBkZWxpbWl0ZXJPclBhdHRlcm4pO1xuXHRcdH1cblx0XHRjb25zdFxuXHRcdFx0ZGVsID0gZGVsaW1pdGVyT3JQYXR0ZXJuIHx8ICcvJyxcblx0XHRcdHkgPSBkYXRlLmdldEZ1bGxZZWFyKCksXG5cdFx0XHRtID0gZGF0ZS5nZXRNb250aCgpICsgMSxcblx0XHRcdGQgPSBkYXRlLmdldERhdGUoKTtcblxuXHRcdHJldHVybiBbcGFkKG0pLCBwYWQoZCksIHldLmpvaW4oZGVsKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvSVNPIChkYXRlLCBpbmNsdWRlVFopIHtcblx0XHRjb25zdFxuXHRcdFx0bm93ID0gbmV3IERhdGUoKSxcblx0XHRcdHRoZW4gPSBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG5cdFx0dGhlbi5zZXRIb3Vycyhub3cuZ2V0SG91cnMoKSk7XG5cdFx0bGV0IHN0ciA9IHRoZW4udG9JU09TdHJpbmcoKTtcblx0XHRpZiAoIWluY2x1ZGVUWikge1xuXHRcdFx0c3RyID0gc3RyLnNwbGl0KCcuJylbMF07XG5cdFx0XHRzdHIgKz0gJy4wMFonO1xuXHRcdH1cblx0XHRyZXR1cm4gc3RyO1xuXHR9XG5cblx0ZnVuY3Rpb24gbmF0dXJhbCAoZGF0ZSkge1xuXHRcdGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdGRhdGUgPSB0aGlzLmZyb20oZGF0ZSk7XG5cdFx0fVxuXG5cdFx0bGV0XG5cdFx0XHR5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpLnRvU3RyaW5nKCkuc3Vic3RyKDIpLFxuXHRcdFx0bW9udGggPSBkYXRlLmdldE1vbnRoKCkgKyAxLFxuXHRcdFx0ZGF5ID0gZGF0ZS5nZXREYXRlKCksXG5cdFx0XHRob3VycyA9IGRhdGUuZ2V0SG91cnMoKSxcblx0XHRcdG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKSxcblx0XHRcdHBlcmlvZCA9ICdBTSc7XG5cblx0XHRpZiAoaG91cnMgPiAxMSkge1xuXHRcdFx0aG91cnMgLT0gMTI7XG5cdFx0XHRwZXJpb2QgPSAnUE0nO1xuXHRcdH1cblx0XHRpZiAoaG91cnMgPT09IDApIHtcblx0XHRcdGhvdXJzID0gMTI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGhvdXJzICsgJzonICsgcGFkKG1pbnV0ZXMpICsgJyAnICsgcGVyaW9kICsgJyBvbiAnICsgcGFkKG1vbnRoKSArICcvJyArIHBhZChkYXkpICsgJy8nICsgeWVhcjtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZCAoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuXHRcdHJldHVybiBzdWJ0cmFjdChkYXRlLCAtYW1vdW50LCBkYXRlVHlwZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzdWJ0cmFjdCAoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuXHRcdC8vIHN1YnRyYWN0IE4gZGF5cyBmcm9tIGRhdGVcblx0XHRjb25zdFxuXHRcdFx0dGltZSA9IGRhdGUuZ2V0VGltZSgpLFxuXHRcdFx0dG1wID0gbmV3IERhdGUodGltZSk7XG5cblx0XHRpZiAoZGF0ZVR5cGUgPT09ICdtb250aCcpIHtcblx0XHRcdHRtcC5zZXRNb250aCh0bXAuZ2V0TW9udGgoKSAtIGFtb3VudCk7XG5cdFx0XHRyZXR1cm4gdG1wO1xuXHRcdH1cblx0XHRpZiAoZGF0ZVR5cGUgPT09ICd5ZWFyJykge1xuXHRcdFx0dG1wLnNldEZ1bGxZZWFyKHRtcC5nZXRGdWxsWWVhcigpIC0gYW1vdW50KTtcblx0XHRcdHJldHVybiB0bXA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBEYXRlKHRpbWUgLSBsZW5ndGguZGF5ICogYW1vdW50KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHN1YnRyYWN0RGF0ZSAoZGF0ZTEsIGRhdGUyLCBkYXRlVHlwZSkge1xuXHRcdC8vIGRhdGVUeXBlOiB3ZWVrLCBkYXksIGhyLCBtaW4sIHNlY1xuXHRcdC8vIHBhc3QgZGF0ZXMgaGF2ZSBhIHBvc2l0aXZlIHZhbHVlXG5cdFx0Ly8gZnV0dXJlIGRhdGVzIGhhdmUgYSBuZWdhdGl2ZSB2YWx1ZVxuXG5cdFx0Y29uc3Rcblx0XHRcdGRpdmlkZUJ5ID0ge1xuXHRcdFx0XHR3ZWVrOiBsZW5ndGgud2Vlayxcblx0XHRcdFx0ZGF5OiBsZW5ndGguZGF5LFxuXHRcdFx0XHRocjogbGVuZ3RoLmhyLFxuXHRcdFx0XHRtaW46IGxlbmd0aC5taW4sXG5cdFx0XHRcdHNlYzogbGVuZ3RoLnNlY1xuXHRcdFx0fSxcblx0XHRcdHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuXHRcdFx0dXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cblx0XHRkYXRlVHlwZSA9IGRhdGVUeXBlLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRyZXR1cm4gTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gZGl2aWRlQnlbZGF0ZVR5cGVdKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzTGVzcyAoZDEsIGQyKSB7XG5cdFx0aWYgKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKSB7XG5cdFx0XHRyZXR1cm4gZDEuZ2V0VGltZSgpIDwgZDIuZ2V0VGltZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiBpc0dyZWF0ZXIgKGQxLCBkMikge1xuXHRcdGlmIChpc1ZhbGlkT2JqZWN0KGQxKSAmJiBpc1ZhbGlkT2JqZWN0KGQyKSkge1xuXHRcdFx0cmV0dXJuIGQxLmdldFRpbWUoKSA+IGQyLmdldFRpbWUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGlmZiAoZGF0ZTEsIGRhdGUyKSB7XG5cdFx0Ly8gcmV0dXJuIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gMiBkYXRlcyBpbiBkYXlzXG5cdFx0Y29uc3Rcblx0XHRcdHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuXHRcdFx0dXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cblx0XHRyZXR1cm4gTWF0aC5hYnMoTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gbGVuZ3RoLmRheSkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29weSAoZGF0ZSkge1xuXHRcdGlmIChpc1ZhbGlkT2JqZWN0KGRhdGUpKSB7XG5cdFx0XHRyZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0ZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldE5hdHVyYWxEYXkgKGRhdGUsIGNvbXBhcmVEYXRlLCBub0RheXNPZldlZWspIHtcblxuXHRcdGNvbnN0XG5cdFx0XHR0b2RheSA9IGNvbXBhcmVEYXRlIHx8IG5ldyBEYXRlKCksXG5cdFx0XHRkYXlzQWdvID0gc3VidHJhY3REYXRlKGRhdGUsIHRvZGF5LCAnZGF5Jyk7XG5cblx0XHRpZiAoIWRheXNBZ28pIHtcblx0XHRcdHJldHVybiAnVG9kYXknO1xuXHRcdH1cblx0XHRpZiAoZGF5c0FnbyA9PT0gMSkge1xuXHRcdFx0cmV0dXJuICdZZXN0ZXJkYXknO1xuXHRcdH1cblxuXHRcdGlmIChkYXlzQWdvID09PSAtMSkge1xuXHRcdFx0cmV0dXJuICdUb21vcnJvdyc7XG5cdFx0fVxuXG5cdFx0aWYgKGRheXNBZ28gPCAtMSkge1xuXHRcdFx0cmV0dXJuIGZvcm1hdChkYXRlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gIW5vRGF5c09mV2VlayAmJiBkYXlzQWdvIDwgZGF5c09mV2Vlay5sZW5ndGggPyBkYXlzT2ZXZWVrW2RhdGUuZ2V0RGF5KCldIDogZm9ybWF0KGRhdGUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gemVyb1RpbWUgKGRhdGUpIHtcblx0XHRkYXRlID0gY29weShkYXRlKTtcblx0XHRkYXRlLnNldEhvdXJzKDApO1xuXHRcdGRhdGUuc2V0TWludXRlcygwKTtcblx0XHRkYXRlLnNldFNlY29uZHMoMCk7XG5cdFx0ZGF0ZS5zZXRNaWxsaXNlY29uZHMoMCk7XG5cdFx0cmV0dXJuIGRhdGU7XG5cdH1cblxuXHRmdW5jdGlvbiB0b1RpbWVzdGFtcCAoZGF0ZSkge1xuXHRcdHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCkgKyAnLScgKyBwYWQoZGF0ZS5nZXRNb250aCgpICsgMSkgKyAnLScgKyBwYWQoZGF0ZS5nZXREYXRlKCkpICsgJ1QnICtcblx0XHRcdHBhZChkYXRlLmdldEhvdXJzKCkpICsgJzonICsgcGFkKGRhdGUuZ2V0TWludXRlcygpKSArICc6JyArIHBhZChkYXRlLmdldFNlY29uZHMoKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tVGltZXN0YW1wIChzdHIpIHtcblx0XHQvLyAyMDE1LTA1LTI2VDAwOjAwOjAwXG5cblx0XHQvLyBzdHJpcCB0aW1lem9uZSAvLyAyMDE1LTA1LTI2VDAwOjAwOjAwWlxuXHRcdHN0ciA9IHN0ci5zcGxpdCgnWicpWzBdO1xuXG5cdFx0Y29uc3QgcGFydHMgPSB0c1JlZ0V4cC5leGVjKHN0cik7XG5cdFx0aWYgKHBhcnRzKSB7XG5cdFx0XHQvLyBuZXcgRGF0ZSgxOTk1LCAxMSwgMTcsIDMsIDI0LCAwKTtcblx0XHRcdHJldHVybiBuZXcgRGF0ZSgrcGFydHNbMV0sICtwYXJ0c1syXSAtIDEsICtwYXJ0c1szXSwgK3BhcnRzWzRdLCArcGFydHNbNV0sICtwYXJ0c1s2XSk7XG5cdFx0fVxuXHRcdHJldHVybiBuZXcgRGF0ZSgtMSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpc1RpbWVzdGFtcCAoc3RyKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnICYmIHRzUmVnRXhwLnRlc3Qoc3RyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvVXRjVGltZXN0YW1wIChkYXRlKSB7XG5cdFx0cmV0dXJuIHRvVGltZXN0YW1wKHRvVVRDKGRhdGUpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21VdGNUaW1lc3RhbXAgKGRhdGUpIHtcblx0XHRkYXRlID0gdG9EYXRlKGRhdGUpO1xuXHRcdGNvbnN0IHR6ID0gZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDA7XG5cdFx0Y29uc3QgdGltZSA9IGRhdGUuZ2V0VGltZSgpICsgdHo7XG5cdFx0Y29uc3QgdHpEYXRlID0gbmV3IERhdGUodGltZSk7XG5cdFx0cmV0dXJuIG5ldyBEYXRlKHR6RGF0ZS50b1VUQ1N0cmluZygpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvVVRDIChkYXRlKSB7XG5cdFx0ZGF0ZSA9IHRvRGF0ZShkYXRlKTtcblx0XHRyZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCBkYXRlLmdldEhvdXJzKCksIGRhdGUuZ2V0TWludXRlcygpLCBkYXRlLmdldFNlY29uZHMoKSkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaXMgKGQxKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGxlc3MgKGQyKSB7XG5cdFx0XHRcdHJldHVybiBpc0xlc3MoZDEsIGQyKTtcblx0XHRcdH0sXG5cdFx0XHRncmVhdGVyIChkMikge1xuXHRcdFx0XHRyZXR1cm4gaXNHcmVhdGVyKGQxLCBkMik7XG5cdFx0XHR9LFxuXHRcdFx0dmFsaWQgKCkge1xuXHRcdFx0XHRyZXR1cm4gaXNEYXRlKGQxKTtcblx0XHRcdH0sXG5cdFx0XHR0aW1lc3RhbXAgKCkge1xuXHRcdFx0XHRyZXR1cm4gaXNUaW1lc3RhbXAoZDEpO1xuXHRcdFx0fSxcblx0XHRcdGVxdWFsKGQyKSB7XG5cdFx0XHRcdHJldHVybiB0b0RhdGUoZDEpLmdldFRpbWUoKSA9PT0gdG9EYXRlKGQyKS5nZXRUaW1lKCk7XG5cdFx0XHR9LFxuXHRcdFx0ZXF1YWxEYXRlIChkMikge1xuXHRcdFx0XHRyZXR1cm4gZDEuZ2V0RnVsbFllYXIoKSA9PT0gZDIuZ2V0RnVsbFllYXIoKSAmJlxuXHRcdFx0XHRcdGQxLmdldE1vbnRoKCkgPT09IGQyLmdldE1vbnRoKCkgJiZcblx0XHRcdFx0XHRkMS5nZXREYXRlKCkgPT09IGQyLmdldERhdGUoKTtcblx0XHRcdH0sXG5cdFx0XHRlcXVhbFRpbWUgKGQyKSB7XG5cdFx0XHRcdHJldHVybiBkMS5nZXRIb3VycygpID09PSBkMi5nZXRIb3VycygpICYmXG5cdFx0XHRcdFx0ZDEuZ2V0TWludXRlcygpICYmIGQyLmdldE1pbnV0ZXMoKSAmJlxuXHRcdFx0XHRcdGQxLmdldFNlY29uZHMoKSA9PT0gZDIuZ2V0U2Vjb25kcygpO1xuXHRcdFx0fSxcblx0XHRcdHRpbWUgKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGQxICE9PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcigndmFsdWUgc2hvdWxkIGJlIGEgc3RyaW5nJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRpbWVSZWdFeHAudGVzdChkMSk7XG5cdFx0XHR9LFxuXHRcdFx0ZGF0ZSAoKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZDEgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCd2YWx1ZSBzaG91bGQgYmUgYSBzdHJpbmcnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZGF0ZVJlZ0V4cC50ZXN0KGQxKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdC8vIGNvbnZlcnRlcnNcblx0XHRmb3JtYXQ6IGZvcm1hdCxcblx0XHR0b0RhdGU6IHRvRGF0ZSxcblx0XHRpc1ZhbGlkOiBpc0RhdGUsXG5cdFx0aXNEYXRlOiBpc0RhdGUsXG5cdFx0aXNWYWxpZE9iamVjdDogaXNWYWxpZE9iamVjdCxcblx0XHR0b0lTTzogdG9JU08sXG5cdFx0dG9VVEM6IHRvVVRDLFxuXHRcdHRvVGltZXN0YW1wOiB0b1RpbWVzdGFtcCxcblx0XHRmcm9tVGltZXN0YW1wOiBmcm9tVGltZXN0YW1wLFxuXHRcdGlzVGltZXN0YW1wOiBpc1RpbWVzdGFtcCxcblx0XHR0b1V0Y1RpbWVzdGFtcDogdG9VdGNUaW1lc3RhbXAsXG5cdFx0ZnJvbVV0Y1RpbWVzdGFtcDogZnJvbVV0Y1RpbWVzdGFtcCxcblx0XHQvLyBtYXRoXG5cdFx0c3VidHJhY3Q6IHN1YnRyYWN0LFxuXHRcdGFkZDogYWRkLFxuXHRcdGRpZmY6IGRpZmYsXG5cdFx0c3VidHJhY3REYXRlOiBzdWJ0cmFjdERhdGUsXG5cdFx0aXNMZXNzOiBpc0xlc3MsXG5cdFx0aXNHcmVhdGVyOiBpc0dyZWF0ZXIsXG5cdFx0Ly8gc3BlY2lhbCB0eXBlc1xuXHRcdGlzTGVhcFllYXI6IGlzTGVhcFllYXIsXG5cdFx0Z2V0TW9udGhJbmRleDogZ2V0TW9udGhJbmRleCxcblx0XHRnZXRNb250aE5hbWU6IGdldE1vbnRoTmFtZSxcblx0XHRnZXRGaXJzdFN1bmRheTogZ2V0Rmlyc3RTdW5kYXksXG5cdFx0Z2V0RGF5c0luTW9udGg6IGdldERheXNJbk1vbnRoLFxuXHRcdGdldERheXNJblByZXZNb250aDogZ2V0RGF5c0luUHJldk1vbnRoLFxuXHRcdC8vIGhlbHBlcnNcblx0XHRuYXR1cmFsOiBuYXR1cmFsLFxuXHRcdGdldE5hdHVyYWxEYXk6IGdldE5hdHVyYWxEYXksXG5cdFx0Ly8gdXRpbHNcblx0XHRpczogaXMsXG5cdFx0emVyb1RpbWU6IHplcm9UaW1lLFxuXHRcdGNvcHk6IGNvcHksXG5cdFx0Y2xvbmU6IGNvcHksXG5cdFx0bGVuZ3RoOiBsZW5ndGgsXG5cdFx0cGFkOiBwYWQsXG5cdFx0Ly8gbGlzdHNcblx0XHRtb250aHM6IHtcblx0XHRcdGZ1bGw6IG1vbnRocyxcblx0XHRcdGFiYnI6IG1vbnRoQWJicixcblx0XHRcdGRpY3Q6IG1vbnRoRGljdFxuXHRcdH0sXG5cdFx0ZGF5czoge1xuXHRcdFx0ZnVsbDogZGF5c09mV2Vlayxcblx0XHRcdGFiYnI6IGRheXMsXG5cdFx0XHRhYmJyMzogZGF5czMsXG5cdFx0XHRkaWN0OiBkYXlEaWN0XG5cdFx0fVxuXHR9O1xufSkpOyIsInJlcXVpcmUoJy4vZGF0ZS1waWNrZXInKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdAY2x1YmFqYXgvYmFzZS1jb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ0BjbHViYWpheC9kb20nKTtcbmNvbnN0IGRhdGVzID0gcmVxdWlyZSgnQGNsdWJhamF4L2RhdGVzJyk7XG5jb25zdCB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5jb25zdCBvbktleSA9IHJlcXVpcmUoJy4vb25LZXknKTtcbmNvbnN0IGZvY3VzTWFuYWdlciA9IHJlcXVpcmUoJy4vZm9jdXNNYW5hZ2VyJyk7XG5yZXF1aXJlKCcuL2ljb24tY2FsZW5kYXInKTtcblxuY29uc3QgZGVmYXVsdFBsYWNlaG9sZGVyID0gJ01NL0REL1lZWVknO1xuY29uc3QgZGVmYXVsdE1hc2sgPSAnWFgvWFgvWFhYWCc7XG5jb25zdCBwcm9wcyA9IFsnbGFiZWwnLCAnbmFtZScsICdwbGFjZWhvbGRlcicsICdtYXNrJywgJ21pbicsICdtYXgnLCAndGltZSddO1xuY29uc3QgYm9vbHMgPSBbJ3JlcXVpcmVkJywgJ3RpbWUnLCAnc3RhdGljJ107XG5cbmNvbnN0IEZMQVNIX1RJTUUgPSAxMDAwO1xuXG5jbGFzcyBEYXRlSW5wdXQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHMsICd2YWx1ZSddO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdGF0dHJpYnV0ZUNoYW5nZWQgKG5hbWUsIHZhbHVlKSB7XG5cdFx0Ly8gbmVlZCB0byBtYW5hZ2UgdmFsdWUgbWFudWFsbHlcblx0XHRpZiAobmFtZSA9PT0gJ3ZhbHVlJykge1xuXHRcdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0fVxuXG5cdHNldCB2YWx1ZSAodmFsdWUpIHtcblx0XHRpZiAodmFsdWUgPT09IHRoaXMuc3RyRGF0ZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBpc0luaXQgPSAhdGhpcy5zdHJEYXRlO1xuXHRcdHRoaXMuc3RyRGF0ZSA9IGRhdGVzLmlzVmFsaWQodmFsdWUpID8gdmFsdWUgOiAnJztcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdHJEYXRlLCBpc0luaXQpO1xuXHRcdH0pO1xuXHR9XG5cblx0Z2V0IHZhbHVlICgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdHJEYXRlO1xuXHR9XG5cblx0Z2V0IHZhbGlkICgpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZhbGlkKCk7XG5cdH1cblxuXHRvbkxhYmVsICh2YWx1ZSkge1xuXHRcdHRoaXMubGFiZWxOb2RlLmlubmVySFRNTCA9IHZhbHVlO1xuXHR9XG5cblx0b25NaW4gKHZhbHVlKSB7XG5cdFx0Y29uc3QgZCA9IGRhdGVzLnRvRGF0ZSh2YWx1ZSk7XG5cdFx0dGhpcy5taW5EYXRlID0gZDtcblx0XHR0aGlzLm1pbkludCA9IGQuZ2V0VGltZSgpO1xuXHRcdHRoaXMucGlja2VyLm1pbiA9IHZhbHVlO1xuXHR9XG5cblx0b25NYXggKHZhbHVlKSB7XG5cdFx0Y29uc3QgZCA9IGRhdGVzLnRvRGF0ZSh2YWx1ZSk7XG5cdFx0dGhpcy5tYXhEYXRlID0gZDtcblx0XHR0aGlzLm1heEludCA9IGQuZ2V0VGltZSgpO1xuXHRcdHRoaXMucGlja2VyLm1heCA9IHZhbHVlO1xuXHR9XG5cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48bGFiZWw+XG5cdDxzcGFuIHJlZj1cImxhYmVsTm9kZVwiPjwvc3Bhbj5cblx0PGRpdiBjbGFzcz1cImlucHV0LXdyYXBwZXJcIj5cblx0XHQ8aW5wdXQgcmVmPVwiaW5wdXRcIiBjbGFzcz1cImVtcHR5XCIgLz5cblx0XHQ8aWNvbi1jYWxlbmRhciAvPlxuXHQ8L2Rpdj5cbjwvbGFiZWw+YDtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2hvd2luZyA9IGZhbHNlO1xuXHR9XG5cblx0c2V0VmFsdWUgKHZhbHVlLCBzaWxlbnQpIHtcblx0XHRpZiAodmFsdWUgPT09IHRoaXMudHlwZWRWYWx1ZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YWx1ZSA9IHRoaXMuZm9ybWF0KHZhbHVlKTtcblx0XHR0aGlzLnR5cGVkVmFsdWUgPSB2YWx1ZTtcblx0XHR0aGlzLmlucHV0LnZhbHVlID0gdmFsdWU7XG5cdFx0Y29uc3QgbGVuID0gdGhpcy5pbnB1dC52YWx1ZS5sZW5ndGggPT09IHRoaXMubWFzay5sZW5ndGg7XG5cdFx0Y29uc3QgdmFsaWQgPSB0aGlzLnZhbGlkYXRlKCk7XG5cdFx0aWYgKHZhbGlkKSB7XG5cdFx0XHR0aGlzLnN0ckRhdGUgPSB2YWx1ZTtcblx0XHRcdHRoaXMucGlja2VyLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRpZiAoIXNpbGVudCkge1xuXHRcdFx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHsgdmFsdWU6IHZhbHVlIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICghc2lsZW50ICYmIHZhbGlkICYmICF0aGlzLnN0YXRpYykge1xuXHRcdFx0c2V0VGltZW91dCh0aGlzLmhpZGUuYmluZCh0aGlzKSwgMzAwKTtcblx0XHR9XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG5cblx0Zm9ybWF0ICh2YWx1ZSkge1xuXHRcdHJldHVybiAgdXRpbC5mb3JtYXREYXRlKHZhbHVlLCB0aGlzLm1hc2spO1xuXHR9XG5cblx0aXNWYWxpZCAodmFsdWUgPSB0aGlzLmlucHV0LnZhbHVlKSB7XG5cdFx0aWYoIXZhbHVlICYmICF0aGlzLnJlcXVpcmVkKXtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0ZXMuaXNWYWxpZCh0aGlzLmlucHV0LnZhbHVlKTtcblx0fVxuXG5cdHZhbGlkYXRlICgpIHtcblx0XHRpZiAodGhpcy5pc1ZhbGlkKHRoaXMuaW5wdXQudmFsdWUpKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ2ludmFsaWQnKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ2ludmFsaWQnKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmbGFzaCAoYWRkRm9jdXMpIHtcblx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ3dhcm5pbmcnKTtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnd2FybmluZycpO1xuXHRcdH0sIEZMQVNIX1RJTUUpO1xuXG5cdFx0aWYoYWRkRm9jdXMpe1xuXHRcdFx0dGhpcy5mb2N1cygpO1xuXHRcdH1cblx0fVxuXG5cdHNob3cgKCkge1xuXHRcdGlmICh0aGlzLnNob3dpbmcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5zaG93aW5nID0gdHJ1ZTtcblx0XHR0aGlzLnBpY2tlci5vblNob3coKTtcblx0XHR0aGlzLnBpY2tlci5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcblx0XHRcdGNvbnN0IHdpbiA9IGRvbS5ib3god2luZG93KTtcblx0XHRcdGNvbnN0IGJveCA9IGRvbS5ib3godGhpcy5waWNrZXIpO1xuXHRcdFx0aWYgKGJveC54ICsgYm94LncgPiB3aW4uaCkge1xuXHRcdFx0XHR0aGlzLnBpY2tlci5jbGFzc0xpc3QuYWRkKCdyaWdodC1hbGlnbicpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGJveC50b3AgKyBib3guaCA+IHdpbi5oKSB7XG5cdFx0XHRcdHRoaXMucGlja2VyLmNsYXNzTGlzdC5hZGQoJ2JvdHRvbS1hbGlnbicpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0aGlkZSAoKSB7XG5cdFx0aWYgKCF0aGlzLnNob3dpbmcgfHwgd2luZG93LmtlZXBQb3B1cHNPcGVuKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuc2hvd2luZyA9IGZhbHNlO1xuXHRcdGRvbS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMucGlja2VyLCAncmlnaHQtYWxpZ24gYm90dG9tLWFsaWduIHNob3cnKTtcblx0XHRkb20uY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLCAnaW52YWxpZCcsICF0aGlzLmlzVmFsaWQoKSk7XG5cdFx0Y29uc29sZS5sb2coJ09OSElERScpO1xuXHRcdHRoaXMucGlja2VyLm9uSGlkZSgpO1xuXHR9XG5cblx0Zm9jdXMgKCkge1xuXHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0dGhpcy5pbnB1dC5mb2N1cygpO1xuXHRcdH0pO1xuXHR9XG5cblx0Ymx1ciAoKSB7XG5cdFx0aWYgKHRoaXMuaW5wdXQpIHtcblx0XHRcdHRoaXMuaW5wdXQuYmx1cigpO1xuXHRcdH1cblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHR0aGlzLnRpbWUgPSB0aGlzLnRpbWUgfHwgdGhpcy5oYXNUaW1lO1xuXHRcdHRoaXMubWFzayA9IHRoaXMubWFzayB8fCBkZWZhdWx0TWFzaztcblx0XHR0aGlzLm1hc2tMZW5ndGggPSB0aGlzLm1hc2subWF0Y2goL1gvZykuam9pbignJykubGVuZ3RoO1xuXHRcdHRoaXMuaW5wdXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQnKTtcblx0XHR0aGlzLmlucHV0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCB0aGlzLnBsYWNlaG9sZGVyIHx8IGRlZmF1bHRQbGFjZWhvbGRlcik7XG5cdFx0aWYgKHRoaXMubmFtZSkge1xuXHRcdFx0dGhpcy5pbnB1dC5zZXRBdHRyaWJ1dGUoJ25hbWUnLCB0aGlzLm5hbWUpO1xuXHRcdH1cblx0XHRpZiAodGhpcy5sYWJlbCkge1xuXHRcdFx0dGhpcy5sYWJlbE5vZGUuaW5uZXJIVE1MID0gdGhpcy5sYWJlbDtcblx0XHR9XG5cdFx0dGhpcy5jb25uZWN0S2V5cygpO1xuXG5cdFx0dGhpcy5waWNrZXIgPSBkb20oJ2RhdGUtcGlja2VyJywgeyB0aW1lOiB0aGlzLnRpbWUsIHRhYmluZGV4OiAnMCcgfSwgdGhpcyk7XG5cdFx0dGhpcy5waWNrZXIub25Eb21SZWFkeSgoKSA9PiB7XG5cdFx0XHR0aGlzLnBpY2tlci5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdFx0dGhpcy5zZXRWYWx1ZShlLnZhbHVlLCBlLnNpbGVudCk7XG5cdFx0XHR9KTtcblx0XHRcdGlmICh0aGlzLnN0YXRpYykge1xuXHRcdFx0XHR0aGlzLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuZm9jdXNIYW5kbGUgPSBmb2N1c01hbmFnZXIodGhpcywgdGhpcy5zaG93LmJpbmQodGhpcyksIHRoaXMuaGlkZS5iaW5kKHRoaXMpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGNvbm5lY3RLZXlzICgpIHtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXlkb3duJywgdXRpbC5zdG9wRXZlbnQpO1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXByZXNzJywgdXRpbC5zdG9wRXZlbnQpO1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXVwJywgKGUpID0+IHtcblx0XHRcdG9uS2V5LmNhbGwodGhpcywgZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRkZXN0cm95ICgpIHtcblx0XHRpZiAodGhpcy5mb2N1c0hhbmRsZSkge1xuXHRcdFx0dGhpcy5mb2N1c0hhbmRsZS5yZW1vdmUoKTtcblx0XHR9XG5cdH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLWlucHV0JywgRGF0ZUlucHV0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlSW5wdXQ7IiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0BjbHViYWpheC9iYXNlLWNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdAY2x1YmFqYXgvZGF0ZXMnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ0BjbHViYWpheC9kb20nKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnJlcXVpcmUoJy4vdGltZS1pbnB1dCcpO1xuXG4vLyBUT0RPOlxuLy8gaHR0cHM6Ly9heGVzc2xhYi5jb20vYWNjZXNzaWJsZS1kYXRlcGlja2Vycy9cbi8vIGh0dHA6Ly93aGF0c29jay5jb20vdHNnL0NvZGluZyUyMEFyZW5hL0FSSUElMjBEYXRlJTIwUGlja2Vycy9BUklBJTIwRGF0ZSUyMFBpY2tlciUyMChCYXNpYykvZGVtby5odG1cblxuY29uc3QgcHJvcHMgPSBbJ21pbicsICdtYXgnXTtcblxuLy8gcmFuZ2UtbGVmdC9yYW5nZS1yaWdodCBtZWFuIHRoYXQgdGhpcyBpcyBvbmUgc2lkZSBvZiBhIGRhdGUtcmFuZ2UtcGlja2VyXG5jb25zdCBib29scyA9IFsncmFuZ2UtcGlja2VyJywgJ3JhbmdlLWxlZnQnLCAncmFuZ2UtcmlnaHQnLCAndGltZSddO1xuXG5jbGFzcyBEYXRlUGlja2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48ZGl2IGNsYXNzPVwiY2FsZW5kYXJcIiByZWY9XCJjYWxOb2RlXCI+XG48ZGl2IGNsYXNzPVwiY2FsLWhlYWRlclwiIHJlZj1cImhlYWRlck5vZGVcIj5cblx0PHNwYW4gY2xhc3M9XCJjYWwteXItbGZ0XCIgcmVmPVwibGZ0WXJOb2RlXCIgdGFiaW5kZXg9XCIwXCIgcm9sZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBZZWFyXCI+PC9zcGFuPlxuXHQ8c3BhbiBjbGFzcz1cImNhbC1sZnRcIiByZWY9XCJsZnRNb05vZGVcIiB0YWJpbmRleD1cIjBcIiByb2xlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzIE1vbnRoXCI+PC9zcGFuPlxuXHQ8c3BhbiBjbGFzcz1cImNhbC1tb250aFwiIHJlZj1cIm1vbnRoTm9kZVwiIHJvbGU9XCJwcmVzZW50YXRpb25cIj48L3NwYW4+XHRcblx0PHNwYW4gY2xhc3M9XCJjYWwtcmd0XCIgcmVmPVwicmd0TW9Ob2RlXCIgdGFiaW5kZXg9XCIwXCIgIHJvbGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiTmV4dCBNb250aFwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwteXItcmd0XCIgcmVmPVwicmd0WXJOb2RlXCIgdGFiaW5kZXg9XCIwXCIgcm9sZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJOZXh0IFllYXJcIj48L3NwYW4+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtY29udGFpbmVyXCIgcmVmPVwiY29udGFpbmVyXCI+PC9kaXY+XG48ZGl2IGNsYXNzPVwiY2FsLWZvb3RlclwiIHJlZj1cImNhbEZvb3RlclwiPlxuXHQ8c3BhbiByZWY9XCJmb290ZXJMaW5rXCIgdGFiaW5kZXg9XCIwXCIgcm9sZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJTZXQgRGF0ZSB0byBUb2RheVwiPjwvc3Bhbj5cbjwvZGl2PlxuPC9kaXY+XG48aW5wdXQgY2xhc3M9XCJmb2N1cy1sb29wXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIvPlxuYDtcblx0fVxuXG5cdHNldCB2YWx1ZSAodmFsdWUpIHtcblx0XHR0aGlzLnNldFZhbHVlKGRhdGVzLmlzRGF0ZSh2YWx1ZSkgPyBkYXRlcy50b0RhdGUodmFsdWUpIDogdG9kYXkpO1xuXHR9XG5cblx0Z2V0IHZhbHVlICgpIHtcblx0XHRpZiAoIXRoaXMudmFsdWVEYXRlKSB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKCd2YWx1ZScpIHx8IHRvZGF5O1xuXHRcdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy50b0RhdGUodmFsdWUpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy52YWx1ZURhdGU7XG5cdH1cblxuXHRvbk1pbiAodmFsdWUpIHtcblx0XHR0aGlzLm1pbkRhdGUgPSB1dGlsLmdldE1pbkRhdGUodmFsdWUpO1xuXHRcdGlmICh0aGlzLnRpbWVJbnB1dCkge1xuXHRcdFx0dGhpcy50aW1lSW5wdXQubWluID0gdmFsdWU7XG5cdFx0fVxuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRvbk1heCAodmFsdWUpIHtcblx0XHR0aGlzLm1heERhdGUgPSB1dGlsLmdldE1heERhdGUodmFsdWUpO1xuXHRcdGlmICh0aGlzLnRpbWVJbnB1dCkge1xuXHRcdFx0dGhpcy50aW1lSW5wdXQubWF4ID0gdmFsdWU7XG5cdFx0fVxuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmN1cnJlbnQgPSBuZXcgRGF0ZSgpO1xuXHRcdHRoaXMucHJldmlvdXMgPSB7fTtcblx0fVxuXG5cdHNldERpc3BsYXkgKC4uLmFyZ3MpIHtcblx0XHQvLyB1c2VkIGJ5IGRhdGUtcmFuZ2UtcGlja2VyXG5cdFx0aWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIoYXJnc1swXSk7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1sxXSk7XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdLmdldEZ1bGxZZWFyKCkpO1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKGFyZ3NbMF0uZ2V0TW9udGgoKSk7XG5cdFx0fSBlbHNlIGlmIChhcmdzWzBdID4gMTIpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKGFyZ3NbMF0pO1xuXHRcdH1cblx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLmNvcHkodGhpcy5jdXJyZW50KTtcblx0XHR0aGlzLm5vRXZlbnRzID0gdHJ1ZTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG5cblx0Z2V0Rm9ybWF0dGVkVmFsdWUgKCkge1xuXHRcdGxldCBzdHIgPSB0aGlzLnZhbHVlRGF0ZSA9PT0gdG9kYXkgPyAnJyA6ICEhdGhpcy52YWx1ZURhdGUgPyBkYXRlcy5mb3JtYXQodGhpcy52YWx1ZURhdGUpIDogJyc7XG5cdFx0aWYgKHRoaXMudGltZSkge1xuXHRcdFx0c3RyICs9IGAgJHt0aGlzLnRpbWVJbnB1dC52YWx1ZX1gO1xuXHRcdH1cblx0XHRyZXR1cm4gc3RyO1xuXHR9XG5cblx0ZW1pdEV2ZW50IChzaWxlbnQpIHtcblx0XHRjb25zdCBkYXRlID0gdGhpcy52YWx1ZURhdGU7XG5cdFx0aWYgKHRoaXMudGltZSkge1xuXHRcdFx0aWYgKCF0aGlzLnRpbWVJbnB1dC52YWxpZCkge1xuXHRcdFx0XHR0aGlzLnRpbWVJbnB1dC52YWxpZGF0ZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR1dGlsLmFkZFRpbWVUb0RhdGUodGhpcy50aW1lSW5wdXQudmFsdWUsIGRhdGUpO1xuXHRcdH1cblx0XHRjb25zdCBldmVudCA9IHtcblx0XHRcdHZhbHVlOiB0aGlzLmdldEZvcm1hdHRlZFZhbHVlKCksXG5cdFx0XHRzaWxlbnQsXG5cdFx0XHRkYXRlXG5cdFx0fTtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdGV2ZW50LmZpcnN0ID0gdGhpcy5maXJzdFJhbmdlO1xuXHRcdFx0ZXZlbnQuc2Vjb25kID0gdGhpcy5zZWNvbmRSYW5nZTtcblx0XHR9XG5cdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCBldmVudCk7XG5cdH1cblxuXHRlbWl0RGlzcGxheUV2ZW50cyAoKSB7XG5cdFx0Y29uc3QgbW9udGggPSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSxcblx0XHRcdHllYXIgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKTtcblxuXHRcdGlmICghdGhpcy5ub0V2ZW50cyAmJiAobW9udGggIT09IHRoaXMucHJldmlvdXMubW9udGggfHwgeWVhciAhPT0gdGhpcy5wcmV2aW91cy55ZWFyKSkge1xuXHRcdFx0dGhpcy5maXJlKCdkaXNwbGF5LWNoYW5nZScsIHsgbW9udGg6IG1vbnRoLCB5ZWFyOiB5ZWFyIH0pO1xuXHRcdH1cblxuXHRcdHRoaXMubm9FdmVudHMgPSBmYWxzZTtcblx0XHR0aGlzLnByZXZpb3VzID0ge1xuXHRcdFx0bW9udGg6IG1vbnRoLFxuXHRcdFx0eWVhcjogeWVhclxuXHRcdH07XG5cdH1cblxuXHRvbkhpZGUgKCkge1xuXHRcdC8vIG5vdCBhbiBhdHRyaWJ1dGU7IGNhbGxlZCBieSBvd25lclxuXHR9XG5cblx0b25TaG93ICgpIHtcblx0XHR0aGlzLmN1cnJlbnQgPSBkYXRlcy5jb3B5KHRoaXMudmFsdWVEYXRlKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG5cblx0c2V0VmFsdWUgKHZhbHVlT2JqZWN0KSB7XG5cdFx0dGhpcy52YWx1ZURhdGUgPSB2YWx1ZU9iamVjdDtcblx0XHR0aGlzLmN1cnJlbnQgPSBkYXRlcy5jb3B5KHRoaXMudmFsdWVEYXRlKTtcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRvbkNsaWNrRGF5IChub2RlLCBzaWxlbnQpIHtcblx0XHRjb25zdFxuXHRcdFx0ZGF5ID0gK25vZGUudGV4dENvbnRlbnQsXG5cdFx0XHRpc0Z1dHVyZSA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdmdXR1cmUnKSxcblx0XHRcdGlzUGFzdCA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXN0JyksXG5cdFx0XHRpc0Rpc2FibGVkID0gbm9kZS5jbGFzc0xpc3QuY29udGFpbnMoJ2Rpc2FibGVkJyk7XG5cblx0XHRpZiAoaXNEaXNhYmxlZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudC5zZXREYXRlKGRheSk7XG5cdFx0aWYgKGlzRnV0dXJlKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgodGhpcy5jdXJyZW50LmdldE1vbnRoKCkgKyAxKTtcblx0XHR9XG5cdFx0aWYgKGlzUGFzdCkge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpIC0gMSk7XG5cdFx0fVxuXG5cdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy5jb3B5KHRoaXMuY3VycmVudCk7XG5cblx0XHRpZiAodGhpcy50aW1lSW5wdXQpIHtcblx0XHRcdHRoaXMudGltZUlucHV0LnNldERhdGUodGhpcy52YWx1ZURhdGUpO1xuXHRcdH1cblxuXHRcdHRoaXMuZW1pdEV2ZW50KHNpbGVudCk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMuY2xpY2tTZWxlY3RSYW5nZSgpO1xuXHRcdH1cblxuXHRcdGlmIChpc0Z1dHVyZSB8fCBpc1Bhc3QpIHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2VsZWN0RGF5KCk7XG5cdFx0fVxuXHR9XG5cblx0c2VsZWN0RGF5ICgpIHtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc29sZS5sb2coJ1NFTEVDVCBEQVknKTtcblx0XHRjb25zdCBub3cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3RlZCcpO1xuXHRcdGNvbnN0IG5vZGUgPSB0aGlzLmRheU1hcFt0aGlzLmN1cnJlbnQuZ2V0RGF0ZSgpXTtcblx0XHRpZiAobm93KSB7XG5cdFx0XHRub3cuY2xhc3NMaXN0LnJlbW92ZSgnc2VsZWN0ZWQnKTtcblx0XHR9XG5cdFx0bm9kZS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXG5cdH1cblxuXHRmb2N1c0RheSAoKSB7XG5cdFx0Y29uc3Qgbm9kZSA9IHRoaXMuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJ2Rpdi5oaWdobGlnaHRlZFt0YWJpbmRleD1cIjBcIl0nKSB8fFxuXHRcdFx0dGhpcy5jb250YWluZXIucXVlcnlTZWxlY3RvcignZGl2LnNlbGVjdGVkW3RhYmluZGV4PVwiMFwiXScpO1xuXHRcdGlmIChub2RlKSB7XG5cdFx0XHRub2RlLmZvY3VzKCk7XG5cdFx0fVxuXHR9XG5cblx0aGlnaGxpZ2h0RGF5IChkYXRlKSB7XG5cdFx0bGV0IG5vZGU7XG5cdFx0aWYgKHRoaXMuaXNWYWxpZERhdGUoZGF0ZSkpIHtcblx0XHRcdG5vZGUgPSB0aGlzLmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdkaXZbdGFiaW5kZXg9XCIwXCJdJyk7XG5cdFx0XHRpZiAobm9kZSkge1xuXHRcdFx0XHRub2RlLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnLTEnKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgc2hvdWxkUmVyZW5kZXIgPSBkYXRlLmdldE1vbnRoKCkgIT09IHRoaXMuY3VycmVudCB8fCBkYXRlLmdldEZ1bGxZZWFyKCkgIT09IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpO1xuXG5cdFx0XHR0aGlzLmN1cnJlbnQgPSBkYXRlO1xuXHRcdFx0aWYgKHNob3VsZFJlcmVuZGVyKSB7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCBkYXRlU2VsZWN0b3IgPSB1dGlsLnRvQXJpYUxhYmVsKHRoaXMuY3VycmVudCk7XG5cdFx0XHRcdG5vZGUgPSB0aGlzLmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBkaXZbYXJpYS1sYWJlbD1cIiR7ZGF0ZVNlbGVjdG9yfVwiXWApO1xuXHRcdFx0XHRub2RlLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5mb2N1c0RheSgpO1xuXHRcdH1cblx0fVxuXG5cdGlzVmFsaWREYXRlIChkYXRlKSB7XG5cdFx0Ly8gdXNlZCBieSBhcnJvdyBrZXlzXG5cdFx0ZGF0ZSA9IGRhdGVzLnplcm9UaW1lKGRhdGUpO1xuXHRcdGlmICh0aGlzLm1pbkRhdGUpIHtcblx0XHRcdGlmIChkYXRlcy5pcyhkYXRlKS5sZXNzKHRoaXMubWluRGF0ZSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAodGhpcy5tYXhEYXRlKSB7XG5cdFx0XHRpZiAoZGF0ZXMuaXMoZGF0ZSkuZ3JlYXRlcih0aGlzLm1heERhdGUpKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRvbkNsaWNrTW9udGggKGRpcmVjdGlvbikge1xuXHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIGRpcmVjdGlvbik7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdG9uQ2xpY2tZZWFyIChkaXJlY3Rpb24pIHtcblx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyBkaXJlY3Rpb24pO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRjbGVhclJhbmdlICgpIHtcblx0XHR0aGlzLmhvdmVyRGF0ZSA9IDA7XG5cdFx0dGhpcy5zZXRSYW5nZShudWxsLCBudWxsKTtcblx0fVxuXG5cdHNldFJhbmdlIChmaXJzdFJhbmdlLCBzZWNvbmRSYW5nZSkge1xuXHRcdHRoaXMuZmlyc3RSYW5nZSA9IGZpcnN0UmFuZ2U7XG5cdFx0dGhpcy5zZWNvbmRSYW5nZSA9IHNlY29uZFJhbmdlO1xuXHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0dGhpcy5zZXRSYW5nZUVuZFBvaW50cygpO1xuXHR9XG5cblx0Y2xpY2tTZWxlY3RSYW5nZSAoKSB7XG5cdFx0Y29uc3Rcblx0XHRcdHByZXZGaXJzdCA9ICEhdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0cHJldlNlY29uZCA9ICEhdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdHJhbmdlRGF0ZSA9IGRhdGVzLmNvcHkodGhpcy5jdXJyZW50KTtcblxuXHRcdGlmICh0aGlzLmlzT3duZWQpIHtcblx0XHRcdHRoaXMuZmlyZSgnc2VsZWN0LXJhbmdlJywge1xuXHRcdFx0XHRmaXJzdDogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0XHRzZWNvbmQ6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRcdGN1cnJlbnQ6IHJhbmdlRGF0ZVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICh0aGlzLnNlY29uZFJhbmdlKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ3Jlc2V0LXJhbmdlJyk7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBudWxsO1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UgJiYgdGhpcy5pc1ZhbGlkUmFuZ2UocmFuZ2VEYXRlKSkge1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IHJhbmdlRGF0ZTtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHRcdHRoaXMuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5maXJzdFJhbmdlID0gbnVsbDtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHRcdHRoaXMuc2V0UmFuZ2UocmFuZ2VEYXRlLCBudWxsKTtcblx0XHR9XG5cdFx0dGhpcy5maXJlKCdzZWxlY3QtcmFuZ2UnLCB7XG5cdFx0XHRmaXJzdDogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0c2Vjb25kOiB0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0cHJldkZpcnN0OiBwcmV2Rmlyc3QsXG5cdFx0XHRwcmV2U2Vjb25kOiBwcmV2U2Vjb25kXG5cdFx0fSk7XG5cdH1cblxuXHRob3ZlclNlbGVjdFJhbmdlIChlKSB7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSAmJiAhdGhpcy5zZWNvbmRSYW5nZSAmJiBlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ29uJykpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gZS50YXJnZXQuX2RhdGU7XG5cdFx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdH1cblx0fVxuXG5cdGRpc3BsYXlSYW5nZVRvRW5kICgpIHtcblx0XHRpZiAodGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IGRhdGVzLmNvcHkodGhpcy5jdXJyZW50KTtcblx0XHRcdHRoaXMuaG92ZXJEYXRlLnNldE1vbnRoKHRoaXMuaG92ZXJEYXRlLmdldE1vbnRoKCkgKyAxKTtcblx0XHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZGlzcGxheVJhbmdlICgpIHtcblx0XHRsZXQgYmVnID0gdGhpcy5maXJzdFJhbmdlO1xuXHRcdGxldCBlbmQgPSB0aGlzLnNlY29uZFJhbmdlID8gdGhpcy5zZWNvbmRSYW5nZS5nZXRUaW1lKCkgOiB0aGlzLmhvdmVyRGF0ZTtcblx0XHRjb25zdCBtYXAgPSB0aGlzLmRheU1hcDtcblx0XHRpZiAoIWJlZyB8fCAhZW5kKSB7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdyYW5nZScpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGJlZyA9IGJlZy5nZXRUaW1lKCk7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRpZiAoaW5SYW5nZShtYXBba2V5XS5fZGF0ZSwgYmVnLCBlbmQpKSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LmFkZCgncmFuZ2UnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdyYW5nZScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRoYXNSYW5nZSAoKSB7XG5cdFx0cmV0dXJuICEhdGhpcy5maXJzdFJhbmdlICYmICEhdGhpcy5zZWNvbmRSYW5nZTtcblx0fVxuXG5cdGlzVmFsaWRSYW5nZSAoZGF0ZSkge1xuXHRcdGlmICghdGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpID4gdGhpcy5maXJzdFJhbmdlLmdldFRpbWUoKTtcblx0fVxuXG5cdHNldFJhbmdlRW5kUG9pbnRzICgpIHtcblx0XHR0aGlzLmNsZWFyRW5kUG9pbnRzKCk7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKHRoaXMuZmlyc3RSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLmZpcnN0UmFuZ2UuZ2V0RGF0ZSgpXS5jbGFzc0xpc3QuYWRkKCdyYW5nZS1maXJzdCcpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuc2Vjb25kUmFuZ2UgJiYgdGhpcy5zZWNvbmRSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLnNlY29uZFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgncmFuZ2Utc2Vjb25kJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJFbmRQb2ludHMgKCkge1xuXHRcdGNvbnN0IGZpcnN0ID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcucmFuZ2UtZmlyc3QnKSxcblx0XHRcdHNlY29uZCA9IHRoaXMucXVlcnlTZWxlY3RvcignLnJhbmdlLXNlY29uZCcpO1xuXHRcdGlmIChmaXJzdCkge1xuXHRcdFx0Zmlyc3QuY2xhc3NMaXN0LnJlbW92ZSgncmFuZ2UtZmlyc3QnKTtcblx0XHR9XG5cdFx0aWYgKHNlY29uZCkge1xuXHRcdFx0c2Vjb25kLmNsYXNzTGlzdC5yZW1vdmUoJ3JhbmdlLXNlY29uZCcpO1xuXHRcdH1cblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHRpZiAodGhpc1sncmFuZ2UtbGVmdCddKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ2xlZnQtcmFuZ2UnKTtcblx0XHRcdHRoaXNbJ3JhbmdlLXBpY2tlciddID0gdHJ1ZTtcblx0XHRcdHRoaXMuaXNPd25lZCA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzWydyYW5nZS1yaWdodCddKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ3JpZ2h0LXJhbmdlJyk7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pc093bmVkKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ21pbmltYWwnKTtcblx0XHR9XG5cdFx0dGhpcy5jdXJyZW50ID0gZGF0ZXMuY29weSh0aGlzLnZhbHVlKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdHRoaXMuY29ubmVjdCgpO1xuXHR9XG5cblx0cmVuZGVyICgpIHtcblx0XHQvLyBkYXRlTnVtIGluY3JlbWVudHMsIHN0YXJ0aW5nIHdpdGggdGhlIGZpcnN0IFN1bmRheVxuXHRcdC8vIHNob3dpbmcgb24gdGhlIG1vbnRobHkgY2FsZW5kYXIuIFRoaXMgaXMgdXN1YWxseSB0aGVcblx0XHQvLyBwcmV2aW91cyBtb250aCwgc28gZGF0ZU51bSB3aWxsIHN0YXJ0IGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5cdFx0ZGVzdHJveSh0aGlzLmJvZHlOb2RlKTtcblxuXHRcdHRoaXMuZGF5TWFwID0ge307XG5cblx0XHRsZXRcblx0XHRcdG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdjYWwtYm9keScgfSksXG5cdFx0XHRpLCB0eCwgaXNUaGlzTW9udGgsIGRheSwgY3NzLCBpc1NlbGVjdGVkLCBpc1RvZGF5LCBoYXNTZWxlY3RlZCwgZGVmYXVsdERhdGVTZWxlY3RvciwgbWlubWF4LCBpc0hpZ2hsaWdodGVkLFxuXHRcdFx0bmV4dE1vbnRoID0gMCxcblx0XHRcdGlzUmFuZ2UgPSB0aGlzWydyYW5nZS1waWNrZXInXSxcblx0XHRcdGQgPSB0aGlzLmN1cnJlbnQsXG5cdFx0XHRpbmNEYXRlID0gZGF0ZXMuY29weShkKSxcblx0XHRcdGRheXNJblByZXZNb250aCA9IGRhdGVzLmdldERheXNJblByZXZNb250aChkKSxcblx0XHRcdGRheXNJbk1vbnRoID0gZGF0ZXMuZ2V0RGF5c0luTW9udGgoZCksXG5cdFx0XHRkYXRlTnVtID0gZGF0ZXMuZ2V0Rmlyc3RTdW5kYXkoZCksXG5cdFx0XHRkYXRlVG9kYXkgPSBnZXRTZWxlY3RlZERhdGUodG9kYXksIGQpLFxuXHRcdFx0ZGF0ZVNlbGVjdGVkID0gZ2V0U2VsZWN0ZWREYXRlKHRoaXMudmFsdWVEYXRlLCBkLCB0cnVlKSxcblx0XHRcdGhpZ2hsaWdodGVkID0gZC5nZXREYXRlKCksXG5cdFx0XHRkYXRlT2JqID0gZGF0ZXMuYWRkKG5ldyBEYXRlKGQuZ2V0RnVsbFllYXIoKSwgZC5nZXRNb250aCgpLCAxKSwgZGF0ZU51bSksXG5cdFx0XHRkZWZhdWx0RGF0ZSA9IDE1O1xuXG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gZGF0ZXMuZ2V0TW9udGhOYW1lKGQpICsgJyAnICsgZC5nZXRGdWxsWWVhcigpO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IDc7IGkrKykge1xuXHRcdFx0ZG9tKFwiZGl2XCIsIHsgaHRtbDogZGF0ZXMuZGF5cy5hYmJyW2ldLCBjbGFzczogJ2RheS1vZi13ZWVrJyB9LCBub2RlKTtcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgNDI7IGkrKykge1xuXG5cdFx0XHRtaW5tYXggPSBkYXRlcy5pc0xlc3MoZGF0ZU9iaiwgdGhpcy5taW5EYXRlKSB8fCBkYXRlcy5pc0dyZWF0ZXIoZGF0ZU9iaiwgdGhpcy5tYXhEYXRlKTtcblxuXHRcdFx0dHggPSBkYXRlTnVtICsgMSA+IDAgJiYgZGF0ZU51bSArIDEgPD0gZGF5c0luTW9udGggPyBkYXRlTnVtICsgMSA6IFwiJm5ic3A7XCI7XG5cblx0XHRcdGlzVGhpc01vbnRoID0gZmFsc2U7XG5cdFx0XHRpc1NlbGVjdGVkID0gZmFsc2U7XG5cdFx0XHRpc0hpZ2hsaWdodGVkID0gZmFsc2U7XG5cdFx0XHRpc1RvZGF5ID0gZmFsc2U7XG5cblx0XHRcdGlmIChkYXRlTnVtICsgMSA+IDAgJiYgZGF0ZU51bSArIDEgPD0gZGF5c0luTW9udGgpIHtcblx0XHRcdFx0Ly8gY3VycmVudCBtb250aFxuXHRcdFx0XHR0eCA9IGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRpc1RoaXNNb250aCA9IHRydWU7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb24nO1xuXHRcdFx0XHRpZiAoZGF0ZVRvZGF5ID09PSB0eCkge1xuXHRcdFx0XHRcdGlzVG9kYXkgPSB0cnVlO1xuXHRcdFx0XHRcdGNzcyArPSAnIHRvZGF5Jztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZGF0ZVNlbGVjdGVkID09PSB0eCAmJiAhaXNSYW5nZSkge1xuXHRcdFx0XHRcdGlzU2VsZWN0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGhhc1NlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRjc3MgKz0gJyBzZWxlY3RlZCc7XG5cdFx0XHRcdH0gZWxzZSBpZiAodHggPT09IGhpZ2hsaWdodGVkKSB7XG5cdFx0XHRcdFx0Y3NzICs9ICcgaGlnaGxpZ2h0ZWQnO1xuXHRcdFx0XHRcdGlzSGlnaGxpZ2h0ZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gaWYgKHR4ID09PSBkZWZhdWx0RGF0ZSkge1xuXHRcdFx0XHQvLyBcdGRlZmF1bHREYXRlU2VsZWN0b3IgPSB1dGlsLnRvQXJpYUxhYmVsKGRhdGVPYmopO1xuXHRcdFx0XHQvLyB9XG5cdFx0XHR9IGVsc2UgaWYgKGRhdGVOdW0gPCAwKSB7XG5cdFx0XHRcdC8vIHByZXZpb3VzIG1vbnRoXG5cdFx0XHRcdHR4ID0gZGF5c0luUHJldk1vbnRoICsgZGF0ZU51bSArIDE7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb2ZmIHBhc3QnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gbmV4dCBtb250aFxuXHRcdFx0XHR0eCA9ICsrbmV4dE1vbnRoO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9mZiBmdXR1cmUnO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobWlubWF4KSB7XG5cdFx0XHRcdGNzcyA9ICdkYXkgZGlzYWJsZWQnO1xuXHRcdFx0XHRpZiAoaXNTZWxlY3RlZCkge1xuXHRcdFx0XHRcdGNzcyArPSAnIHNlbGVjdGVkJztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaXNUb2RheSkge1xuXHRcdFx0XHRcdGNzcyArPSAnIHRvZGF5Jztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBhcmlhTGFiZWwgPSB1dGlsLnRvQXJpYUxhYmVsKGRhdGVPYmopO1xuXHRcdFx0ZGF5ID0gZG9tKFwiZGl2XCIsIHtcblx0XHRcdFx0aHRtbDogYDxzcGFuPiR7dHh9PC9zcGFuPmAsXG5cdFx0XHRcdGNsYXNzOiBjc3MsXG5cdFx0XHRcdCdhcmlhLWxhYmVsJzogYXJpYUxhYmVsLFxuXHRcdFx0XHR0YWJpbmRleDogaXNTZWxlY3RlZCB8fCBpc0hpZ2hsaWdodGVkID8gMCA6IC0xXG5cdFx0XHR9LCBub2RlKTtcblxuXHRcdFx0ZGF0ZU51bSsrO1xuXHRcdFx0ZGF0ZU9iai5zZXREYXRlKGRhdGVPYmouZ2V0RGF0ZSgpICsgMSk7XG5cdFx0XHRpZiAoaXNUaGlzTW9udGgpIHtcblx0XHRcdFx0Ly8gS2VlcCBhIG1hcCBvZiBhbGwgdGhlIGRheXNcblx0XHRcdFx0Ly8gdXNlIGl0IGZvciBhZGRpbmcgYW5kIHJlbW92aW5nIHNlbGVjdGlvbi9ob3ZlciBjbGFzc2VzXG5cdFx0XHRcdGluY0RhdGUuc2V0RGF0ZSh0eCk7XG5cdFx0XHRcdGRheS5fZGF0ZSA9IGluY0RhdGUuZ2V0VGltZSgpO1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0eF0gPSBkYXk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5ib2R5Tm9kZSA9IG5vZGU7XG5cdFx0dGhpcy5zZXRGb290ZXIoKTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblxuXHRcdHRoaXMuZW1pdERpc3BsYXlFdmVudHMoKTtcblxuXHRcdGlmICh0aGlzLnRpbWVJbnB1dCkge1xuXHRcdFx0dGhpcy50aW1lSW5wdXQuc2V0RGF0ZSh0aGlzLmN1cnJlbnQpO1xuXHRcdH1cblx0fVxuXG5cdHNldEZvb3RlciAoKSB7XG5cdFx0aWYgKHRoaXMudGltZUlucHV0KSB7XG5cdFx0XHRpZiAodGhpcy5jdXJyZW50KSB7XG5cdFx0XHRcdHRoaXMudGltZUlucHV0LnZhbHVlID0gdGhpcy52YWx1ZURhdGU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICh0aGlzLnRpbWUpIHtcblx0XHRcdHRoaXMudGltZUlucHV0ID0gZG9tKCd0aW1lLWlucHV0Jywge1xuXHRcdFx0XHRsYWJlbDogJ1RpbWU6Jyxcblx0XHRcdFx0cmVxdWlyZWQ6IHRydWUsXG5cdFx0XHRcdHZhbHVlOiB0aGlzLnZhbHVlLFxuXHRcdFx0XHRtaW46IHRoaXMubWluRGF0ZSxcblx0XHRcdFx0bWF4OiB0aGlzLm1heERhdGUsXG5cdFx0XHRcdCdldmVudC1uYW1lJzogJ3RpbWUtY2hhbmdlJ1xuXHRcdFx0fSwgdGhpcy5jYWxGb290ZXIpO1xuXHRcdFx0dGhpcy50aW1lSW5wdXQuc2V0RGF0ZSh0aGlzLmN1cnJlbnQpO1xuXHRcdFx0dGhpcy50aW1lSW5wdXQub24oJ3RpbWUtY2hhbmdlJywgdGhpcy5lbWl0RXZlbnQuYmluZCh0aGlzKSk7XG5cdFx0XHRkZXN0cm95KHRoaXMuZm9vdGVyTGluayk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGQgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0dGhpcy5mb290ZXJMaW5rLmlubmVySFRNTCA9IGRhdGVzLmZvcm1hdChkLCAnRSBNTU1NIGRkLCB5eXl5Jyk7XG5cdFx0fVxuXHR9XG5cblx0Y29ubmVjdCAoKSB7XG5cdFx0dGhpcy5vbih0aGlzLmNvbnRhaW5lciwgJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdHRoaXMuZmlyZSgncHJlLWNsaWNrJywgZSwgdHJ1ZSwgdHJ1ZSk7XG5cdFx0XHRjb25zdCBub2RlID0gZS50YXJnZXQuY2xvc2VzdCgnLmRheScpO1xuXHRcdFx0aWYgKG5vZGUpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrRGF5KG5vZGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmNvbnRhaW5lciwgJ2tleWRvd24nLCAoZSkgPT4ge1xuXHRcdFx0bGV0IGRhdGU7XG5cdFx0XHRsZXQgc3RvcEV2ZW50ID0gZmFsc2U7XG5cdFx0XHRsZXQgbnVtO1xuXHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhaW5lci5rZXknLCBlLmtleSk7XG5cdFx0XHRzd2l0Y2ggKGUua2V5KSB7XG5cdFx0XHRcdGNhc2UgJ0Fycm93TGVmdCcgOlxuXHRcdFx0XHRcdG51bSA9IC0xO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdBcnJvd1JpZ2h0JyA6XG5cdFx0XHRcdFx0bnVtID0gMTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnQXJyb3dVcCcgOlxuXHRcdFx0XHRcdG51bSA9IC03O1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHRcdG51bSA9IDc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ0VudGVyJzpcblx0XHRcdFx0XHR0aGlzLm9uQ2xpY2tEYXkoZS50YXJnZXQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICcgJzpcblx0XHRcdFx0XHR0aGlzLm9uQ2xpY2tEYXkoZS50YXJnZXQsIHRydWUpO1xuXHRcdFx0XHRcdHRoaXMuZm9jdXNEYXkoKTtcblx0XHRcdFx0XHRyZXR1cm4gdXRpbC5zdG9wRXZlbnQoZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChudW0pIHtcblx0XHRcdFx0dGhpcy5oaWdobGlnaHREYXkoZGF0ZXMuYWRkKHRoaXMuY3VycmVudCwgbnVtKSk7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbihkb2N1bWVudCwgJ2tleWRvd24nLCAoZSkgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2RvYy5rZXknLCBlLmtleSk7XG5cdFx0XHRpZiAoZS5rZXkgPT09ICcgJyAmJiBpc0NvbnRyb2woZS50YXJnZXQsIHRoaXMpKSB7XG5cdFx0XHRcdHRoaXMuZW1pdChlLnRhcmdldCwgJ2NsaWNrJyk7XG5cdFx0XHRcdHJldHVybiB1dGlsLnN0b3BFdmVudChlKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5sZnRNb05vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKC0xKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5yZ3RNb05vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKDEpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmxmdFlyTm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5vbkNsaWNrWWVhcigtMSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKHRoaXMucmd0WXJOb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tZZWFyKDEpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmZvb3RlckxpbmssICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuc2V0VmFsdWUobmV3IERhdGUoKSk7XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMub24odGhpcy5jb250YWluZXIsICdtb3VzZW92ZXInLCB0aGlzLmhvdmVyU2VsZWN0UmFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0fVxuXHR9XG59XG5cbmNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcblxuZnVuY3Rpb24gaXNDb250cm9sIChub2RlLCBwaWNrZXIpIHtcblx0Y29uc29sZS5sb2coJ2lzQ29udHJvbCcpO1xuXHRyZXR1cm4gbm9kZSA9PT0gcGlja2VyLmxmdE1vTm9kZSB8fCBub2RlID09PSBwaWNrZXIucmd0TW9Ob2RlIHx8IG5vZGUgPT09IHBpY2tlci5sZnRZck5vZGUgfHwgbm9kZSA9PT0gcGlja2VyLnJndFlyTm9kZSB8fCBub2RlID09PSBwaWNrZXIuZm9vdGVyTGluaztcbn1cblxuZnVuY3Rpb24gZ2V0U2VsZWN0ZWREYXRlIChkYXRlLCBjdXJyZW50KSB7XG5cdGlmIChkYXRlLmdldE1vbnRoKCkgPT09IGN1cnJlbnQuZ2V0TW9udGgoKSAmJiBkYXRlLmdldEZ1bGxZZWFyKCkgPT09IGN1cnJlbnQuZ2V0RnVsbFllYXIoKSkge1xuXHRcdHJldHVybiBkYXRlLmdldERhdGUoKTtcblx0fVxuXHRyZXR1cm4gLTk5OTsgLy8gaW5kZXggbXVzdCBiZSBvdXQgb2YgcmFuZ2UsIGFuZCAtMSBpcyB0aGUgbGFzdCBkYXkgb2YgdGhlIHByZXZpb3VzIG1vbnRoXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3kgKG5vZGUpIHtcblx0aWYgKG5vZGUpIHtcblx0XHRkb20uZGVzdHJveShub2RlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpblJhbmdlIChkYXRlVGltZSwgYmVnVGltZSwgZW5kVGltZSkge1xuXHRyZXR1cm4gZGF0ZVRpbWUgPj0gYmVnVGltZSAmJiBkYXRlVGltZSA8PSBlbmRUaW1lO1xufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcGlja2VyJywgRGF0ZVBpY2tlcik7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVBpY2tlcjsiLCJyZXF1aXJlKCcuL2RhdGUtcmFuZ2UtcGlja2VyJyk7XG5jb25zdCBEYXRlSW5wdXQgPSByZXF1aXJlKCcuL2RhdGUtaW5wdXQnKTtcbmNvbnN0IGRhdGVzID0gcmVxdWlyZSgnQGNsdWJhamF4L2RhdGVzJyk7XG5cbmNvbnN0IHByb3BzID0gWydsYWJlbCcsICduYW1lJywgJ3BsYWNlaG9sZGVyJ107XG5jb25zdCBib29scyA9IFsncmFuZ2UtZXhwYW5kcyddO1xuXG5jbGFzcyBEYXRlUmFuZ2VJbnB1dCBleHRlbmRzIERhdGVJbnB1dCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzLCAndmFsdWUnXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48bGFiZWw+XG5cdDxzcGFuIHJlZj1cImxhYmVsTm9kZVwiPjwvc3Bhbj5cblx0PGlucHV0IHJlZj1cImlucHV0XCIgLz5cblx0XG48L2xhYmVsPlxuPGRhdGUtcmFuZ2UtcGlja2VyIHJlZj1cInBpY2tlclwiIHRhYmluZGV4PVwiMFwiPjwvZGF0ZS1yYW5nZS1waWNrZXI+YDtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubWFzayA9ICdYWC9YWC9YWFhYIC0gWFgvWFgvWFhYWCdcblx0fVxuXG5cdGlzVmFsaWQgKHZhbHVlKSB7XG5cdFx0Y29uc3QgZHMgPSB2YWx1ZS5zcGxpdCgvXFxzKi1cXHMqLyk7XG5cdFx0cmV0dXJuIGRhdGVzLmlzRGF0ZShkc1swXSkgJiYgZGF0ZXMuaXNEYXRlKGRzWzFdKTtcblx0fVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcmFuZ2UtaW5wdXQnLCBEYXRlUmFuZ2VJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVJhbmdlSW5wdXQ7IiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0BjbHViYWpheC9iYXNlLWNvbXBvbmVudCcpO1xucmVxdWlyZSgnLi9kYXRlLWlucHV0Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ0BjbHViYWpheC9kYXRlcycpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnQGNsdWJhamF4L2RvbScpO1xuXG5jb25zdCBwcm9wcyA9IFsnbGVmdC1sYWJlbCcsICdyaWdodC1sYWJlbCcsICduYW1lJywgJ3BsYWNlaG9sZGVyJ107XG5jb25zdCBib29scyA9IFsncmFuZ2UtZXhwYW5kcycsICdyZXF1aXJlZCddO1xuXG5jb25zdCBERUxJTUlURVIgPSAnIC0gJztcblxuY2xhc3MgRGF0ZVJhbmdlSW5wdXRzIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzLCAndmFsdWUnXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0dGhpcy5zZXRWYWx1ZSh2YWx1ZSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdGlmICghdGhpcy5sZWZ0SW5wdXQudmFsdWUgfHwgIXRoaXMucmlnaHRJbnB1dC52YWx1ZSkge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdHJldHVybiBgJHt0aGlzLmxlZnRJbnB1dC52YWx1ZX0ke0RFTElNSVRFUn0ke3RoaXMucmlnaHRJbnB1dC52YWx1ZX1gO1xuXHR9XG5cblx0YXR0cmlidXRlQ2hhbmdlZCAocHJvcCwgdmFsdWUpIHtcblx0XHRpZiAocHJvcCA9PT0gJ3ZhbHVlJykge1xuXHRcdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0fVxuXG5cdGdldCB2YWx1ZXMgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdGFydDogdGhpcy5sZWZ0SW5wdXQudmFsdWUsXG5cdFx0XHRlbmQ6IHRoaXMubGVmdElucHV0LnZhbHVlXG5cdFx0fTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuZmlyZU93bkRvbXJlYWR5ID0gdHJ1ZTtcblx0XHR0aGlzLm1hc2sgPSAnWFgvWFgvWFhYWCc7XG5cdH1cblxuXHRpc1ZhbGlkICh2YWx1ZSkge1xuXHRcdGlmICghdmFsdWUpIHtcblx0XHRcdHJldHVybiB0cnVlOyAvLyBUT0RPOiByZXF1aXJlZFxuXHRcdH1cblx0XHRjb25zdCBkcyA9IHZhbHVlLnNwbGl0KC9cXHMqLVxccyovKTtcblx0XHRyZXR1cm4gZGF0ZXMuaXNEYXRlKGRzWzBdKSAmJiBkYXRlcy5pc0RhdGUoZHNbMV0pO1xuXHR9XG5cblx0c2V0VmFsdWUgKHZhbHVlLCBzaWxlbnQpIHtcblx0XHRpZiAoIXRoaXMuaXNWYWxpZCh2YWx1ZSkpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgZGF0ZXMnLCB2YWx1ZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgZHMgPSB2YWx1ZSA/IHZhbHVlLnNwbGl0KC9cXHMqLVxccyovKSA6IFsnJywgJyddO1xuXHRcdFx0dGhpcy5pc0JlaW5nU2V0ID0gdHJ1ZTtcblx0XHRcdHRoaXMubGVmdElucHV0LnNldFZhbHVlKGRzWzBdLCBzaWxlbnQpO1xuXHRcdFx0dGhpcy5yaWdodElucHV0LnNldFZhbHVlKGRzWzFdLCBzaWxlbnQpO1xuXHRcdFx0dGhpcy5pc0JlaW5nU2V0ID0gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHRjbGVhciAoc2lsZW50KSB7XG5cdFx0dGhpcy5sZWZ0SW5wdXQuc2V0VmFsdWUoJycsIHRydWUpO1xuXHRcdHRoaXMucmlnaHRJbnB1dC5zZXRWYWx1ZSgnJywgdHJ1ZSk7XG5cdFx0aWYgKCFzaWxlbnQpIHtcblx0XHRcdHRoaXMuZW1pdCgnY2hhbmdlJywgeyB2YWx1ZTogbnVsbCB9KTtcblx0XHR9XG5cdH1cblxuXHRlbWl0RXZlbnQgKCkge1xuXHRcdGNsZWFyVGltZW91dCh0aGlzLmRlYm91bmNlKTtcblx0XHR0aGlzLmRlYm91bmNlID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHRoaXMudmFsdWU7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKHZhbHVlKSkge1xuXHRcdFx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHsgdmFsdWUgfSk7XG5cdFx0XHR9XG5cdFx0fSwgMTAwKTtcblx0fVxuXG5cdGNvbm5lY3RlZCAoKSB7XG5cdFx0dGhpcy5sZWZ0SW5wdXQgPSBkb20oJ2RhdGUtaW5wdXQnLCB7XG5cdFx0XHRsYWJlbDogdGhpc1snbGVmdC1sYWJlbCddLFxuXHRcdFx0cmVxdWlyZWQ6IHRoaXMucmVxdWlyZWQsXG5cdFx0XHRwbGFjZWhvbGRlcjogdGhpcy5wbGFjZWhvbGRlclxuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMucmlnaHRJbnB1dCA9IGRvbSgnZGF0ZS1pbnB1dCcsIHtcblx0XHRcdGxhYmVsOiB0aGlzWydyaWdodC1sYWJlbCddLFxuXHRcdFx0cmVxdWlyZWQ6IHRoaXMucmVxdWlyZWQsXG5cdFx0XHRwbGFjZWhvbGRlcjogdGhpcy5wbGFjZWhvbGRlclxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0dGhpcy5sZWZ0SW5wdXQub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBjaGFuZ2VzRGF0ZSA9IGRhdGVzLnRvRGF0ZSh0aGlzLnJpZ2h0SW5wdXQudmFsdWUpIDwgZGF0ZXMudG9EYXRlKGUudmFsdWUpO1xuXHRcdFx0aWYgKCF0aGlzLnJpZ2h0SW5wdXQudmFsdWUgfHwgY2hhbmdlc0RhdGUpIHtcblx0XHRcdFx0aWYgKGUudmFsdWUpIHtcblx0XHRcdFx0XHR0aGlzLnJpZ2h0SW5wdXQuc2V0VmFsdWUoZS52YWx1ZSwgdHJ1ZSwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGNoYW5nZXNEYXRlKSB7XG5cdFx0XHRcdFx0dGhpcy5yaWdodElucHV0LmZsYXNoKHRydWUpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCF0aGlzLmlzQmVpbmdTZXQpIHtcblx0XHRcdFx0XHR0aGlzLnJpZ2h0SW5wdXQuZm9jdXMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5lbWl0RXZlbnQoKTtcblx0XHRcdH1cblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnJpZ2h0SW5wdXQub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBjaGFuZ2VzRGF0ZSA9IGRhdGVzLnRvRGF0ZSh0aGlzLmxlZnRJbnB1dC52YWx1ZSkgPiBkYXRlcy50b0RhdGUoZS52YWx1ZSk7XG5cdFx0XHRpZiAoIXRoaXMubGVmdElucHV0LnZhbHVlIHx8IGNoYW5nZXNEYXRlKSB7XG5cdFx0XHRcdGlmIChlLnZhbHVlKSB7XG5cdFx0XHRcdFx0dGhpcy5sZWZ0SW5wdXQuc2V0VmFsdWUoZS52YWx1ZSwgdHJ1ZSwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGNoYW5nZXNEYXRlKSB7XG5cdFx0XHRcdFx0dGhpcy5sZWZ0SW5wdXQuZmxhc2godHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIXRoaXMuaXNCZWluZ1NldCkge1xuXHRcdFx0XHRcdHRoaXMubGVmdElucHV0LmZvY3VzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuZW1pdEV2ZW50KCk7XG5cdFx0XHR9XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cblx0XHRvbkRvbVJlYWR5KFt0aGlzLmxlZnRJbnB1dCwgdGhpcy5yaWdodElucHV0XSwgKCkgPT4ge1xuXHRcdFx0dGhpcy5maXJlKCdkb21yZWFkeScpO1xuXHRcdH0pO1xuXHRcdHRoaXMuY29ubmVjdGVkID0gZnVuY3Rpb24gKCkge307XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cblx0fVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcmFuZ2UtaW5wdXRzJywgRGF0ZVJhbmdlSW5wdXRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUmFuZ2VJbnB1dHM7IiwicmVxdWlyZSgnLi9kYXRlLXBpY2tlcicpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0BjbHViYWpheC9iYXNlLWNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdAY2x1YmFqYXgvZGF0ZXMnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ0BjbHViYWpheC9kb20nKTtcblxuY29uc3QgcHJvcHMgPSBbJ3ZhbHVlJ107XG5jb25zdCBib29scyA9IFsncmFuZ2UtZXhwYW5kcyddO1xuXG5jbGFzcyBEYXRlUmFuZ2VQaWNrZXIgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHNdO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdG9uVmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy5zdHJEYXRlID0gZGF0ZXMuaXNEYXRlKHZhbHVlKSA/IHZhbHVlIDogJyc7XG5cdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RyRGF0ZSwgdHJ1ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHNldFZhbHVlICh2YWx1ZSwgbm9FbWl0KSB7XG5cdFx0aWYgKCF2YWx1ZSkge1xuXHRcdFx0dGhpcy52YWx1ZURhdGUgPSAnJztcblx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR2YXIgZGF0ZVN0cmluZ3MgPSBzcGxpdCh2YWx1ZSk7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLnRvRGF0ZSh2YWx1ZSk7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBkYXRlcy50b0RhdGUoZGF0ZVN0cmluZ3NbMF0pO1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGRhdGVzLnRvRGF0ZShkYXRlU3RyaW5nc1sxXSk7XG5cdFx0XHR0aGlzLnNldERpc3BsYXkoKTtcblx0XHRcdHRoaXMuc2V0UmFuZ2Uobm9FbWl0KTtcblx0XHR9XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsID0gZG9tKCdkYXRlLXBpY2tlcicsIHsncmFuZ2UtbGVmdCc6IHRydWV9LCB0aGlzKTtcblx0XHR0aGlzLnJpZ2h0Q2FsID0gZG9tKCdkYXRlLXBpY2tlcicsIHsncmFuZ2UtcmlnaHQnOiB0cnVlfSwgdGhpcyk7XG5cdFx0dGhpcy5yYW5nZUV4cGFuZHMgPSB0aGlzWydyYW5nZS1leHBhbmRzJ107XG5cblx0XHR0aGlzLmNvbm5lY3RFdmVudHMoKTtcblx0XHQvLyBpZiAodGhpcy5pbml0YWxWYWx1ZSkge1xuXHRcdC8vIFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmluaXRhbFZhbHVlKTtcblx0XHQvLyB9IGVsc2Uge1xuXHRcdC8vIFx0dGhpcy5zZXREaXNwbGF5KCk7XG5cdFx0Ly8gfVxuXHR9XG5cblx0c2V0RGlzcGxheSAoKSB7XG5cdFx0Y29uc3Rcblx0XHRcdGZpcnN0ID0gdGhpcy5maXJzdFJhbmdlID8gbmV3IERhdGUodGhpcy5maXJzdFJhbmdlLmdldFRpbWUoKSkgOiBuZXcgRGF0ZSgpLFxuXHRcdFx0c2Vjb25kID0gbmV3IERhdGUoZmlyc3QuZ2V0VGltZSgpKTtcblxuXHRcdHNlY29uZC5zZXRNb250aChzZWNvbmQuZ2V0TW9udGgoKSArIDEpO1xuXHRcdHRoaXMubGVmdENhbC5zZXREaXNwbGF5KGZpcnN0KTtcblx0XHR0aGlzLnJpZ2h0Q2FsLnNldERpc3BsYXkoc2Vjb25kKTtcblx0fVxuXG5cdHNldFJhbmdlIChub0VtaXQpIHtcblx0XHR0aGlzLmxlZnRDYWwuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMuZmlyc3RSYW5nZSwgdGhpcy5zZWNvbmRSYW5nZSk7XG5cdFx0aWYgKCFub0VtaXQgJiYgdGhpcy5maXJzdFJhbmdlICYmIHRoaXMuc2Vjb25kUmFuZ2UpIHtcblxuXHRcdFx0Y29uc3Rcblx0XHRcdFx0YmVnID0gZGF0ZXMuZGF0ZVRvU3RyKHRoaXMuZmlyc3RSYW5nZSksXG5cdFx0XHRcdGVuZCA9IGRhdGVzLmRhdGVUb1N0cih0aGlzLnNlY29uZFJhbmdlKTtcblxuXHRcdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCB7XG5cdFx0XHRcdGZpcnN0UmFuZ2U6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdFx0c2Vjb25kUmFuZ2U6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRcdGJlZ2luOiBiZWcsXG5cdFx0XHRcdGVuZDogZW5kLFxuXHRcdFx0XHR2YWx1ZTogYmVnICsgREVMSU1JVEVSICsgZW5kXG5cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdGNsZWFyUmFuZ2UgKCkge1xuXHRcdHRoaXMubGVmdENhbC5jbGVhclJhbmdlKCk7XG5cdFx0dGhpcy5yaWdodENhbC5jbGVhclJhbmdlKCk7XG5cdH1cblxuXHRjYWxjdWxhdGVSYW5nZSAoZSwgd2hpY2gpIHtcblx0XHRlID0gZS5kZXRhaWwgfHwgZTtcblxuXHRcdGlmIChlLmZpcnN0ID09PSB0aGlzLmxlZnRDYWwuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKCFlLnNlY29uZCkge1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0XHRcdFx0dGhpcy5yaWdodENhbC5zZXRSYW5nZSh0aGlzLmxlZnRDYWwuZmlyc3RSYW5nZSwgbnVsbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMubGVmdENhbC5maXJzdFJhbmdlLCB0aGlzLmxlZnRDYWwuc2Vjb25kUmFuZ2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbm5lY3RFdmVudHMgKCkge1xuXHRcdHRoaXMubGVmdENhbC5vbignZGlzcGxheS1jaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0bGV0XG5cdFx0XHRcdG0gPSBlLmRldGFpbC5tb250aCxcblx0XHRcdFx0eSA9IGUuZGV0YWlsLnllYXI7XG5cdFx0XHRpZiAobSArIDEgPiAxMSkge1xuXHRcdFx0XHRtID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bSsrO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5yaWdodENhbC5zZXREaXNwbGF5KHksIG0pO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdkaXNwbGF5LWNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXRcblx0XHRcdFx0bSA9IGUuZGV0YWlsLm1vbnRoLFxuXHRcdFx0XHR5ID0gZS5kZXRhaWwueWVhcjtcblx0XHRcdGlmIChtIC0gMSA8IDApIHtcblx0XHRcdFx0bSA9IDExO1xuXHRcdFx0XHR5LS07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtLS07XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmxlZnRDYWwuc2V0RGlzcGxheSh5LCBtKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5yaWdodENhbC5vbignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblxuXG5cdFx0aWYgKCF0aGlzLnJhbmdlRXhwYW5kcykge1xuXHRcdFx0dGhpcy5yaWdodENhbC5vbigncmVzZXQtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR0aGlzLmxlZnRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0dGhpcy5sZWZ0Q2FsLm9uKCdyZXNldC1yYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHR9XG5cblxuXHRcdHRoaXMubGVmdENhbC5vbignc2VsZWN0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMuY2FsY3VsYXRlUmFuZ2UoZSwgJ2xlZnQnKTtcblx0XHRcdGUgPSBlLmRldGFpbDtcblx0XHRcdGlmICh0aGlzLnJhbmdlRXhwYW5kcyAmJiBlLmZpcnN0ICYmIGUuc2Vjb25kKSB7XG5cdFx0XHRcdGlmIChpc0RhdGVDbG9zZXJUb0xlZnQoZS5jdXJyZW50LCBlLmZpcnN0LCBlLnNlY29uZCkpIHtcblx0XHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0Ly8gbmV3IHJhbmdlXG5cdFx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5yaWdodENhbC5vbignc2VsZWN0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMuY2FsY3VsYXRlUmFuZ2UoZSwgJ3JpZ2h0Jyk7XG5cblx0XHRcdGUgPSBlLmRldGFpbDtcblx0XHRcdGlmICh0aGlzLnJhbmdlRXhwYW5kcyAmJiBlLmZpcnN0ICYmIGUuc2Vjb25kKSB7XG5cdFx0XHRcdGlmIChpc0RhdGVDbG9zZXJUb0xlZnQoZS5jdXJyZW50LCBlLmZpcnN0LCBlLnNlY29uZCkpIHtcblx0XHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0Ly8gbmV3IHJhbmdlXG5cdFx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5vbih0aGlzLnJpZ2h0Q2FsLCAnbW91c2VvdmVyJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5sZWZ0Q2FsLmRpc3BsYXlSYW5nZVRvRW5kKCk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGRlc3Ryb3kgKCkge1xuXHRcdHRoaXMucmlnaHRDYWwuZGVzdHJveSgpO1xuXHRcdHRoaXMubGVmdENhbC5kZXN0cm95KCk7XG5cdH1cbn1cblxuY29uc3QgREVMSU1JVEVSID0gJyAtICc7XG5jb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG5cbmZ1bmN0aW9uIHN0ciAoZCkge1xuXHRpZiAoIWQpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXHRyZXR1cm4gZGF0ZXMuZGF0ZVRvU3RyKGQpO1xufVxuXG5mdW5jdGlvbiBzcGxpdCAodmFsdWUpIHtcblx0aWYgKHZhbHVlLmluZGV4T2YoJywnKSA+IC0xKSB7XG5cdFx0cmV0dXJuIHZhbHVlLnNwbGl0KC9cXHMqLFxccyovKTtcblx0fVxuXHRyZXR1cm4gdmFsdWUuc3BsaXQoL1xccyotXFxzKi8pO1xufVxuXG5mdW5jdGlvbiBpc0RhdGVDbG9zZXJUb0xlZnQgKGRhdGUsIGxlZnQsIHJpZ2h0KSB7XG5cdGNvbnN0IGRpZmYxID0gZGF0ZXMuZGlmZihkYXRlLCBsZWZ0KSxcblx0XHRkaWZmMiA9IGRhdGVzLmRpZmYoZGF0ZSwgcmlnaHQpO1xuXHRyZXR1cm4gZGlmZjEgPD0gZGlmZjI7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1yYW5nZS1waWNrZXInLCBEYXRlUmFuZ2VQaWNrZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVSYW5nZVBpY2tlcjsiLCJjb25zdCBEYXRlSW5wdXQgPSByZXF1aXJlKCcuL2RhdGUtaW5wdXQnKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLy8gRklYTUU6IHRpbWUtaW5wdXQgYmx1ciBkb2VzIG5vdCBjbG9zZSBjYWxlbmRhclxuXG5jbGFzcyBEYXRlVGltZUlucHV0IGV4dGVuZHMgRGF0ZUlucHV0IHtcblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5oYXNUaW1lID0gdHJ1ZTtcblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHR0aGlzLm1hc2sgPSAnWFgvWFgvWFhYWCBYWDpYWCBwbSc7XG5cdFx0c3VwZXIuZG9tUmVhZHkoKTtcblx0fVxuXG5cdGZvcm1hdCAodmFsdWUpIHtcblx0XHRjb25zdCBwYXJ0cyA9IHZhbHVlLnNwbGl0KCcgJyk7XG5cdFx0Y29uc3QgZGF0ZVN0ciA9IHBhcnRzWzBdIHx8ICcnO1xuXHRcdGNvbnN0IHRpbWVTdHIgPSBgJHtwYXJ0c1sxXSB8fCAnJ30gJHtwYXJ0c1syXSB8fCAnJ31gO1xuXHRcdGNvbnN0IGRhdGUgPSB1dGlsLmZvcm1hdERhdGUoZGF0ZVN0ciwgdGhpcy5tYXNrKTtcblx0XHRsZXQgdGltZSA9IHV0aWwuZm9ybWF0VGltZSh0aW1lU3RyKTtcblx0XHR0aW1lID0gdGhpcy5zZXRBTVBNKHRpbWUsIHV0aWwuZ2V0QU1QTSh2YWx1ZSkpO1xuXHRcdHJldHVybiBgJHtkYXRlfSAke3RpbWV9YDtcblx0fVxuXG5cdHNldEFNUE0gKHZhbHVlLCBhbXBtKSB7XG5cdFx0bGV0IGlzQU07XG5cdFx0aWYgKGFtcG0pIHtcblx0XHRcdGlzQU0gPSAvYS9pLnRlc3QoYW1wbSk7XG5cdFx0fSBlbHNlIGlmICgvW2FwXS8udGVzdCh2YWx1ZSkpIHtcblx0XHRcdGlzQU0gPSAvYS9pLnRlc3QodmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpc0FNID0gdGhpcy5pc0FNO1xuXHRcdH1cblx0XHR2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1xccypbYXBdbS9pLCAnJykgKyAoaXNBTSA/ICcgYW0nIDogJyBwbScpO1xuXHRcdHRoaXMuaXNBTSA9IGlzQU07XG5cdFx0dGhpcy5pc1BNID0gIWlzQU07XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS10aW1lLWlucHV0JywgRGF0ZVRpbWVJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVRpbWVJbnB1dDsiLCJjb25zdCBvbiA9IHJlcXVpcmUoJ0BjbHViYWpheC9vbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb21wb25lbnQsIHNob3csIGhpZGUpIHtcblx0Y29uc3QgaW5wdXQgPSBjb21wb25lbnQuaW5wdXQ7XG5cdGNvbnN0IHBpY2tlciA9IGNvbXBvbmVudC5waWNrZXI7XG5cdGNvbnN0IHRpbWVJbnB1dCA9IHBpY2tlci50aW1lSW5wdXQ7XG5cdGNvbnN0IGZvY3VzTG9vcCA9IHBpY2tlci5xdWVyeVNlbGVjdG9yKCdpbnB1dC5mb2N1cy1sb29wJyk7XG5cblx0bGV0IGN1cnJlbnQ7XG5cdGxldCBpblBpY2tlciA9IGZhbHNlO1xuXG5cdGZ1bmN0aW9uIG9uTmF2aWdhdGUgKGUsIHRhYmJpbmdCYWNrd2FyZHMpIHtcblx0XHRjb25zdCBmaXJzdCA9IHBpY2tlci5xdWVyeVNlbGVjdG9yKCdbdGFiaW5kZXg9XCIwXCJdJyk7XG5cblx0XHRpZiAoZS50YXJnZXQgPT09IHBpY2tlcikge1xuXHRcdFx0aWYgKHRhYmJpbmdCYWNrd2FyZHMpIHtcblx0XHRcdFx0aW5wdXQuZm9jdXMoKTtcblx0XHRcdFx0cmV0dXJuIHN0b3AoZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmaXJzdC5mb2N1cygpO1xuXHRcdFx0XHRyZXR1cm4gc3RvcChlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZS50YXJnZXQgPT09IGZvY3VzTG9vcCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZvY3VzLWxvb3AnKTtcblx0XHRcdGZpcnN0LmZvY3VzKCk7XG5cdFx0XHRyZXR1cm4gc3RvcChlKTtcblx0XHR9XG5cdFx0Y3VycmVudCA9IGdldFBhcmVudChlLnRhcmdldCk7XG5cblx0XHRpblBpY2tlciA9IGN1cnJlbnQgPT09IHBpY2tlcjtcblx0XHRpZiAoIWN1cnJlbnQpIHtcblx0XHRcdGhpZGUoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGNvbnN0IHVwSGFuZGxlID0gb24oZG9jdW1lbnQsICdrZXl1cCcsIChlKSA9PiB7XG5cdFx0aWYgKGUua2V5ID09PSAnRXNjYXBlJykge1xuXHRcdFx0aGlkZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoZS5rZXkgPT09ICdUYWInKSB7XG5cdFx0XHRyZXR1cm4gb25OYXZpZ2F0ZShlLCBlLnNoaWZ0S2V5KTtcblx0XHR9XG5cdH0pO1xuXG5cdG9uKGlucHV0LCAnZm9jdXMnLCBzaG93KTtcblxuXHRjb25zdCBkb2NIYW5kbGUgPSBvbihkb2N1bWVudC5ib2R5LCAnbW91c2Vkb3duJywgKGUpID0+IHtcblx0XHRyZXR1cm4gb25OYXZpZ2F0ZShlKTtcblx0fSk7XG5cblx0ZnVuY3Rpb24gZ2V0UGFyZW50IChub2RlKSB7XG5cdFx0aWYgKG5vZGUgPT09IGlucHV0KSB7XG5cdFx0XHRyZXR1cm4gaW5wdXQ7XG5cdFx0fVxuXHRcdGlmIChub2RlID09PSBwaWNrZXIpIHtcblx0XHRcdHJldHVybiBwaWNrZXI7XG5cdFx0fVxuXHRcdGlmIChub2RlID09PSB0aW1lSW5wdXQpIHtcblx0XHRcdHJldHVybiB0aW1lSW5wdXQ7XG5cdFx0fVxuXHRcdGlmIChub2RlID09PSBkb2N1bWVudC5ib2R5IHx8ICFub2RlLnBhcmVudE5vZGUpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gZ2V0UGFyZW50KG5vZGUucGFyZW50Tm9kZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzdG9wIChlKSB7XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly9zaG93KCk7XG5cblx0cmV0dXJuIG9uLm1ha2VNdWx0aUhhbmRsZShbdXBIYW5kbGUsIGRvY0hhbmRsZV0pO1xufTtcbiIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdAY2x1YmFqYXgvYmFzZS1jb21wb25lbnQnKTtcblxuY2xhc3MgSWNvbiBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48P3htbCB2ZXJzaW9uPVwiMS4wXCIgPz5cbjxzdmcgdmlld0JveD1cIjAgMCAxMiAxM1wiIHZlcnNpb249XCIxLjFcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI+XG4gICAgPGRlZnM+PC9kZWZzPlxuICAgIDxnIHN0cm9rZT1cIm5vbmVcIiBzdHJva2Utd2lkdGg9XCIxXCIgZmlsbD1cIm5vbmVcIiBmaWxsLXJ1bGU9XCJldmVub2RkXCI+XG4gICAgICAgIDxnIGlkPVwibXZwLXByb2plY3RkYi13ZWJcIiB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoLTU0NC4wMDAwMDAsIC04NC4wMDAwMDApXCIgZmlsbD1cIiMwQTBCMDlcIj5cbiAgICAgICAgICAgIDxnIGlkPVwiSGVhZGVyXCIgdHJhbnNmb3JtPVwidHJhbnNsYXRlKDAuMDAwMDAwLCA3MC4wMDAwMDApXCI+XG4gICAgICAgICAgICAgICAgPGcgaWQ9XCJDYWxlbmRlci0mYW1wOy1EYXRlXCIgdHJhbnNmb3JtPVwidHJhbnNsYXRlKDU0NC4wMDAwMDAsIDE0LjAwMDAwMClcIj5cbiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XCJmYS1jYWxlbmRhclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cIk0wLjI4NDcxOTg5OSwxMS44MTI4OTkxIEMwLjQ1MjU4OTQ1MywxMS45ODEzMDMzIDAuNjU2ODEyOTIyLDEyLjA2NTIzODEgMC44ODQ1NTk1MTQsMTIuMDY1MjM4MSBMMTAuMzE2MjYyMywxMi4wNjUyMzgxIEMxMC41NDQ1NDM1LDEyLjA2NTIzODEgMTAuNzQ4MjMyMywxMS45ODEzMDMzIDEwLjkxNjYzNjUsMTEuODEyODk5MSBDMTEuMDg0NTA2MSwxMS42NDUwMjk2IDExLjE2ODQ0MDgsMTEuNDQwODA2MSAxMS4xNjg0NDA4LDExLjIxMzA1OTUgTDExLjE2ODQ0MDgsMi42MzMwMDA3MyBDMTEuMTY4NDQwOCwyLjQwNTI1NDEzIDExLjA4NDUwNjEsMi4yMDEwMzA2NiAxMC45MTY2MzY1LDIuMDMzMTYxMTEgQzEwLjc0ODIzMjMsMS44NjUyOTE1NiAxMC41NDQ1NDM1LDEuNzgxMzU2NzggMTAuMzE2MjYyMywxLjc4MTM1Njc4IEw5LjQ1MjMyMjE0LDEuNzgxMzU2NzggTDkuNDUyMzIyMTQsMS4xMzM0MDE2OSBDOS40NTIzMjIxNCwwLjg0NTI0MzQ0MSA5LjM0NDMyOTYzLDAuNTkzNDM5MTExIDkuMTQwNjQwNzgsMC4zNzc0NTQwOCBDOC45MjQ2NTU3NSwwLjE3MzIzMDYxMSA4LjY3MjMxNjgsMC4wNjUyMzgwOTUyIDguMzg0NjkzMTcsMC4wNjUyMzgwOTUyIEw3Ljk1MjcyMzExLDAuMDY1MjM4MDk1MiBDNy42NjQ1NjQ4NiwwLjA2NTIzODA5NTIgNy40MTI3NjA1MywwLjE3MzIzMDYxMSA3LjE5Njc3NTUsMC4zNzc0NTQwOCBDNi45OTI1NTIwMywwLjU5MzQzOTExMSA2Ljg4NDU1OTUxLDAuODQ1MjQzNDQxIDYuODg0NTU5NTEsMS4xMzM0MDE2OSBMNi44ODQ1NTk1MSwxLjc4MTM1Njc4IEw0LjMxNjc5Njg4LDEuNzgxMzU2NzggTDQuMzE2Nzk2ODgsMS4xMzM0MDE2OSBDNC4zMTY3OTY4OCwwLjg0NTI0MzQ0MSA0LjIwODgwNDM3LDAuNTkzNDM5MTExIDQuMDA0NTgwOSwwLjM3NzQ1NDA4IEMzLjc4ODU5NTg3LDAuMTczMjMwNjExIDMuNTM2NzkxNTQsMC4wNjUyMzgwOTUyIDMuMjQ4NjMzMjksMC4wNjUyMzgwOTUyIEwyLjgxNjY2MzIzLDAuMDY1MjM4MDk1MiBDMi41Mjg1MDQ5OCwwLjA2NTIzODA5NTIgMi4yNzY3MDA2NSwwLjE3MzIzMDYxMSAyLjA2MDcxNTYyLDAuMzc3NDU0MDggQzEuODU2NDkyMTUsMC41OTM0MzkxMTEgMS43NDg0OTk2NCwwLjg0NTI0MzQ0MSAxLjc0ODQ5OTY0LDEuMTMzNDAxNjkgTDEuNzQ4NDk5NjQsMS43ODEzNTY3OCBMMC44OTY4NTU2OTIsMS43ODEzNTY3OCBDMC42NTY4MTI5MjIsMS43ODEzNTY3OCAwLjQ1MjU4OTQ1MywxLjg2NTI5MTU2IDAuMjg0NzE5ODk5LDIuMDMzMTYxMTEgQzAuMTE2ODUwMzQ2LDIuMjAxMDMwNjYgMC4wMzIzODA5NTI0LDIuNDA1MjU0MTMgMC4wMzIzODA5NTI0LDIuNjMzMDAwNzMgTDAuMDMyMzgwOTUyNCwxMS4yMTMwNTk1IEMwLjAzMjM4MDk1MjQsMTEuNDQwODA2MSAwLjExNjg1MDM0NiwxMS42NDUwMjk2IDAuMjg0NzE5ODk5LDExLjgxMjg5OTEgTDAuMjg0NzE5ODk5LDExLjgxMjg5OTEgWiBNMC44ODQ1NTk1MTQsOS4yODA5NTU4MiBMMi44MTY2NjMyMyw5LjI4MDk1NTgyIEwyLjgxNjY2MzIzLDExLjIxMzA1OTUgTDAuODg0NTU5NTE0LDExLjIxMzA1OTUgTDAuODg0NTU5NTE0LDkuMjgwOTU1ODIgWiBNMC44ODQ1NTk1MTQsNi43MDA4OTcwMSBMMi44MTY2NjMyMyw2LjcwMDg5NzAxIEwyLjgxNjY2MzIzLDguODQ4OTg1NzYgTDAuODg0NTU5NTE0LDguODQ4OTg1NzYgTDAuODg0NTU5NTE0LDYuNzAwODk3MDEgWiBNMC44ODQ1NTk1MTQsNC4zNDkxMTk0MSBMMi44MTY2NjMyMyw0LjM0OTExOTQxIEwyLjgxNjY2MzIzLDYuMjY4OTI2OTUgTDAuODg0NTU5NTE0LDYuMjY4OTI2OTUgTDAuODg0NTU5NTE0LDQuMzQ5MTE5NDEgWiBNMi42MDA2NzgyLDEuMTMzNDAxNjkgQzIuNjAwNjc4MiwxLjA3Mjk5MDAzIDIuNjI0NzM1OTQsMS4wMjU0MDkxNyAyLjY2MDU1NTI0LDAuOTc3MjkzNjk1IEMyLjcwODY3MDcxLDAuOTQxNDc0Mzk2IDIuNzU2Nzg2MTksMC45MTc0MTY2NTcgMi44MTY2NjMyMywwLjkxNzQxNjY1NyBMMy4yNDg2MzMyOSwwLjkxNzQxNjY1NyBDMy4zMDg1MTAzMywwLjkxNzQxNjY1NyAzLjM1NjYyNTgxLDAuOTQxNDc0Mzk2IDMuNDA0NzQxMjgsMC45NzcyOTM2OTUgQzMuNDQwNTYwNTgsMS4wMjU0MDkxNyAzLjQ2NDYxODMyLDEuMDcyOTkwMDMgMy40NjQ2MTgzMiwxLjEzMzQwMTY5IEwzLjQ2NDYxODMyLDMuMDY0OTcwNzkgQzMuNDY0NjE4MzIsMy4xMjUzODI0NCAzLjQ0MDU2MDU4LDMuMTcyOTYzMyAzLjQwNDc0MTI4LDMuMjIxMDc4NzggQzMuMzU2NjI1ODEsMy4yNTc0MzI3IDMuMzA4NTEwMzMsMy4yODA5NTU4MiAzLjI0ODYzMzI5LDMuMjgwOTU1ODIgTDIuODE2NjYzMjMsMy4yODA5NTU4MiBDMi43NTY3ODYxOSwzLjI4MDk1NTgyIDIuNzA4NjcwNzEsMy4yNTc0MzI3IDIuNjYwNTU1MjQsMy4yMjEwNzg3OCBDMi42MjQ3MzU5NCwzLjE3Mjk2MzMgMi42MDA2NzgyLDMuMTI1MzgyNDQgMi42MDA2NzgyLDMuMDY0OTcwNzkgTDIuNjAwNjc4MiwxLjEzMzQwMTY5IEwyLjYwMDY3ODIsMS4xMzM0MDE2OSBaIE0zLjI0ODYzMzI5LDkuMjgwOTU1ODIgTDUuMzg0NDI1ODYsOS4yODA5NTU4MiBMNS4zODQ0MjU4NiwxMS4yMTMwNTk1IEwzLjI0ODYzMzI5LDExLjIxMzA1OTUgTDMuMjQ4NjMzMjksOS4yODA5NTU4MiBaIE0zLjI0ODYzMzI5LDYuNzAwODk3MDEgTDUuMzg0NDI1ODYsNi43MDA4OTcwMSBMNS4zODQ0MjU4Niw4Ljg0ODk4NTc2IEwzLjI0ODYzMzI5LDguODQ4OTg1NzYgTDMuMjQ4NjMzMjksNi43MDA4OTcwMSBaIE0zLjI0ODYzMzI5LDQuMzQ5MTE5NDEgTDUuMzg0NDI1ODYsNC4zNDkxMTk0MSBMNS4zODQ0MjU4Niw2LjI2ODkyNjk1IEwzLjI0ODYzMzI5LDYuMjY4OTI2OTUgTDMuMjQ4NjMzMjksNC4zNDkxMTk0MSBaIE01LjgxNjM5NTkyLDkuMjgwOTU1ODIgTDcuOTY0NDg0NjcsOS4yODA5NTU4MiBMNy45NjQ0ODQ2NywxMS4yMTMwNTk1IEw1LjgxNjM5NTkyLDExLjIxMzA1OTUgTDUuODE2Mzk1OTIsOS4yODA5NTU4MiBaIE01LjgxNjM5NTkyLDYuNzAwODk3MDEgTDcuOTY0NDg0NjcsNi43MDA4OTcwMSBMNy45NjQ0ODQ2Nyw4Ljg0ODk4NTc2IEw1LjgxNjM5NTkyLDguODQ4OTg1NzYgTDUuODE2Mzk1OTIsNi43MDA4OTcwMSBaIE01LjgxNjM5NTkyLDQuMzQ5MTE5NDEgTDcuOTY0NDg0NjcsNC4zNDkxMTk0MSBMNy45NjQ0ODQ2Nyw2LjI2ODkyNjk1IEw1LjgxNjM5NTkyLDYuMjY4OTI2OTUgTDUuODE2Mzk1OTIsNC4zNDkxMTk0MSBaIE03LjczNjczODA4LDEuMTMzNDAxNjkgQzcuNzM2NzM4MDgsMS4wNzI5OTAwMyA3Ljc2MDI2MTIsMS4wMjU0MDkxNyA3Ljc5NjYxNTExLDAuOTc3MjkzNjk1IEM3Ljg0NDczMDU5LDAuOTQxNDc0Mzk2IDcuODkyMzExNDUsMC45MTc0MTY2NTcgNy45NTI3MjMxMSwwLjkxNzQxNjY1NyBMOC4zODQ2OTMxNywwLjkxNzQxNjY1NyBDOC40NDQ1NzAyMSwwLjkxNzQxNjY1NyA4LjQ5MjY4NTY4LDAuOTQxNDc0Mzk2IDguNTQwMjY2NTQsMC45NzcyOTM2OTUgQzguNTc2NjIwNDYsMS4wMjU0MDkxNyA4LjYwMDY3ODIsMS4wNzI5OTAwMyA4LjYwMDY3ODIsMS4xMzM0MDE2OSBMOC42MDA2NzgyLDMuMDY0OTcwNzkgQzguNjAwNjc4MiwzLjEyNTM4MjQ0IDguNTc2NjIwNDYsMy4xNzI5NjMzIDguNTQwMjY2NTQsMy4yMjEwNzg3OCBDOC40OTI2ODU2OCwzLjI1NzQzMjcgOC40NDQ1NzAyMSwzLjI4MDk1NTgyIDguMzg0NjkzMTcsMy4yODA5NTU4MiBMNy45NTI3MjMxMSwzLjI4MDk1NTgyIEM3Ljg5MjMxMTQ1LDMuMjgwOTU1ODIgNy44NDQ3MzA1OSwzLjI1NzQzMjcgNy43OTY2MTUxMSwzLjIyMTA3ODc4IEM3Ljc2MDI2MTIsMy4xNzI5NjMzIDcuNzM2NzM4MDgsMy4xMjUzODI0NCA3LjczNjczODA4LDMuMDY0OTcwNzkgTDcuNzM2NzM4MDgsMS4xMzM0MDE2OSBMNy43MzY3MzgwOCwxLjEzMzQwMTY5IFogTTguMzk2NDU0NzMsOS4yODA5NTU4MiBMMTAuMzE2MjYyMyw5LjI4MDk1NTgyIEwxMC4zMTYyNjIzLDExLjIxMzA1OTUgTDguMzk2NDU0NzMsMTEuMjEzMDU5NSBMOC4zOTY0NTQ3Myw5LjI4MDk1NTgyIFogTTguMzk2NDU0NzMsNi43MDA4OTcwMSBMMTAuMzE2MjYyMyw2LjcwMDg5NzAxIEwxMC4zMTYyNjIzLDguODQ4OTg1NzYgTDguMzk2NDU0NzMsOC44NDg5ODU3NiBMOC4zOTY0NTQ3Myw2LjcwMDg5NzAxIFogTTguMzk2NDU0NzMsNC4zNDkxMTk0MSBMMTAuMzE2MjYyMyw0LjM0OTExOTQxIEwxMC4zMTYyNjIzLDYuMjY4OTI2OTUgTDguMzk2NDU0NzMsNi4yNjg5MjY5NSBMOC4zOTY0NTQ3Myw0LjM0OTExOTQxIFpcIj48L3BhdGg+XG4gICAgICAgICAgICAgICAgICAgIDwvZz5cbiAgICAgICAgICAgICAgICA8L2c+XG4gICAgICAgICAgICA8L2c+XG4gICAgICAgIDwvZz5cbiAgICA8L2c+XG48L3N2Zz5cblxuYDtcblx0fVxufVxuXG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnaWNvbi1jYWxlbmRhcicsIEljb24pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEljb247XG4iLCJjb25zdCB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIG9uS2V5IChlKSB7XG5cdGxldCBzdHIgPSB0aGlzLnR5cGVkVmFsdWUgfHwgJyc7XG5cdGNvbnN0IGJlZyA9IGUudGFyZ2V0LnNlbGVjdGlvblN0YXJ0O1xuXHRjb25zdCBlbmQgPSBlLnRhcmdldC5zZWxlY3Rpb25FbmQ7XG5cdGNvbnN0IGsgPSBlLmtleTtcblxuXHRpZiAoayA9PT0gJ0VudGVyJykge1xuXHRcdGlmICh0aGlzLmhpZGUpIHtcblx0XHRcdHRoaXMuaGlkZSgpO1xuXHRcdH1cblx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHsgdmFsdWU6IHRoaXMudmFsdWUgfSk7XG5cdH1cblxuXHRpZiAoayA9PT0gJ0VzY2FwZScpIHtcblx0XHRpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG5cdFx0XHR0aGlzLnZhbHVlID0gdGhpcy5zdHJEYXRlO1xuXHRcdFx0dGhpcy5oaWRlKCk7XG5cdFx0XHR0aGlzLmlucHV0LmJsdXIoKTtcblx0XHR9XG5cdH1cblxuXHRpZiAodXRpbC5pc0NvbnRyb2woZSkpIHtcblx0XHR1dGlsLnN0b3BFdmVudChlKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRTZWxlY3Rpb24gKHBvcykge1xuXHRcdGUudGFyZ2V0LnNlbGVjdGlvbkVuZCA9IHBvcztcblx0fVxuXG5cdGlmICghdXRpbC5pc051bShrKSkge1xuXHRcdC8vIGhhbmRsZSBwYXN0ZSwgYmFja3NwYWNlXG5cdFx0aWYgKHRoaXMuaW5wdXQudmFsdWUgIT09IHRoaXMudHlwZWRWYWx1ZSkge1xuXHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmlucHV0LnZhbHVlLCB0cnVlKTtcblx0XHR9XG5cblx0XHRjb25zdCB2YWx1ZSA9IHRoaXMuaW5wdXQudmFsdWU7XG5cdFx0Y29uc3QgdHlwZSA9IHV0aWwuaXModmFsdWUpLnR5cGUoKTtcblxuXHRcdGlmICh1dGlsLmlzQXJyb3dLZXlba10pIHtcblxuXHRcdFx0Ly8gRklYTUU6IHRlc3QgaXMgbm90IGFkZGluZyBwaWNrZXIgdGltZVxuXHRcdFx0Ly8gMTIvMTIvMjAxNyAwNjozMCBhbSdcblxuXHRcdFx0Y29uc3QgaW5jID0gayA9PT0gJ0Fycm93VXAnID8gMSA6IC0xO1xuXHRcdFx0aWYgKC90aW1lLy50ZXN0KHR5cGUpKSB7XG5cdFx0XHRcdGNvbnN0IEhSID0gdHlwZSA9PT0gJ3RpbWUnID8gWzAsMl0gOiBbMTEsMTNdO1xuXHRcdFx0XHRjb25zdCBNTiA9IHR5cGUgPT09ICd0aW1lJyA/IFszLDVdIDogWzE0LDE2XTtcblx0XHRcdFx0aWYgKGVuZCA+PSBIUlswXSAmJiBlbmQgPD0gSFJbMV0pIHtcblx0XHRcdFx0XHR0aGlzLnNldFZhbHVlKHV0aWwuaW5jSG91cnModmFsdWUsIGluYyksIHRydWUpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGVuZCA+PSBNTlswXSAmJiBlbmQgPD0gTU5bMV0pIHtcblx0XHRcdFx0XHR0aGlzLnNldFZhbHVlKHV0aWwuaW5jTWludXRlcyh2YWx1ZSwgaW5jLCAxNSksIHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuc2V0VmFsdWUodmFsdWUucmVwbGFjZSgvKFthcF1tKS9pLCBzdHIgPT4gL2EvaS50ZXN0KHN0cikgPyAncG0nIDogJ2FtJyApLCB0cnVlKTtcblx0XHRcdFx0XHQvLyB0aGlzLnNldFZhbHVlKHZhbHVlLCB0cnVlLCAvYS9pLnRlc3QodmFsdWUpID8gJ3BtJyA6ICdhbScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICgvZGF0ZS8udGVzdCh0eXBlKSkge1xuXHRcdFx0XHRpZiAoZW5kIDw9IDIgKSB7XG5cdFx0XHRcdFx0dGhpcy5zZXRWYWx1ZSh1dGlsLmluY01vbnRoKHZhbHVlLCBpbmMpLCB0cnVlKTtcblx0XHRcdFx0fSBlbHNlIGlmIChlbmQgPCA1KSB7XG5cdFx0XHRcdFx0dGhpcy5zZXRWYWx1ZSh1dGlsLmluY0RhdGUodmFsdWUsIGluYyksIHRydWUpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGVuZCA8IDExKSB7XG5cdFx0XHRcdFx0dGhpcy5zZXRWYWx1ZSh1dGlsLmluY1llYXIodmFsdWUsIGluYyksIHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9IGVsc2UgaWYgKC9bYXBdL2kudGVzdChrKSAmJiAvdGltZS8udGVzdCh0eXBlKSkge1xuXHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnNldEFNUE0odmFsdWUsIGsgPT09ICdhJyA/ICdhbScgOiAncG0nKSwgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0c2V0U2VsZWN0aW9uKGJlZyk7XG5cdFx0dXRpbC5zdG9wRXZlbnQoZSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChzdHIubGVuZ3RoICE9PSBlbmQgJiYgYmVnID09PSBlbmQpIHtcblx0XHQvLyBoYW5kbGUgc2VsZWN0aW9uIG9yIG1pZGRsZS1zdHJpbmcgZWRpdFxuXHRcdGxldCB0ZW1wID0gdGhpcy50eXBlZFZhbHVlLnN1YnN0cmluZygwLCBiZWcpICsgayArIHRoaXMudHlwZWRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcblx0XHRjb25zdCBuZXh0Q2hhclBvcyA9IHV0aWwubmV4dE51bVBvcyhiZWcgKyAxLCB0ZW1wKTtcblx0XHRpZiAobmV4dENoYXJQb3MgPiAtMSkge1xuXHRcdFx0dGVtcCA9IHV0aWwucmVtb3ZlQ2hhckF0UG9zKHRlbXAsIGJlZyArIDEpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZhbHVlID0gdGhpcy5zZXRWYWx1ZSh0ZW1wLCB0cnVlKTtcblx0XHRjb25zdCBuZXh0Q2hhciA9IHZhbHVlLmNoYXJBdChiZWcgKyAxKTtcblxuXHRcdHNldFNlbGVjdGlvbigvW1xcc1xcLzpdLy50ZXN0KG5leHRDaGFyKSA/IGJlZyArIDIgOiBiZWcgKyAxKTtcblx0XHR1dGlsLnN0b3BFdmVudChlKTtcblx0XHRyZXR1cm47XG5cblx0fSBlbHNlIGlmIChlbmQgIT09IGJlZykge1xuXHRcdC8vIHNlbGVjdGlvbiByZXBsYWNlXG5cdFx0bGV0IHRlbXAgPSB1dGlsLnJlcGxhY2VUZXh0KHRoaXMudHlwZWRWYWx1ZSwgaywgYmVnLCBlbmQsICdYJyk7XG5cdFx0Y29uc3QgdmFsdWUgPSB0aGlzLnNldFZhbHVlKHRlbXAsIHRydWUpO1xuXG5cdFx0c2V0U2VsZWN0aW9uKGJlZyArIDEpO1xuXHRcdHV0aWwuc3RvcEV2ZW50KGUpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cblx0dGhpcy5zZXRWYWx1ZShzdHIgKyBrLCB0cnVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBvbktleTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQGNsdWJhamF4L2Jhc2UtY29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdAY2x1YmFqYXgvZG9tJyk7XG5jb25zdCBvbiA9IHJlcXVpcmUoJ0BjbHViYWpheC9vbicpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdAY2x1YmFqYXgvZGF0ZXMnKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbmNvbnN0IG9uS2V5ID0gcmVxdWlyZSgnLi9vbktleScpO1xuXG5jb25zdCBkZWZhdWx0UGxhY2Vob2xkZXIgPSAnSEg6TU0gYW0vcG0nO1xuY29uc3QgZGVmYXVsdE1hc2sgPSAnWFg6WFgnO1xuY29uc3QgcHJvcHMgPSBbJ2xhYmVsJywgJ25hbWUnLCAncGxhY2Vob2xkZXInLCAnbWFzaycsICdldmVudC1uYW1lJywgJ21pbicsICdtYXgnXTtcbmNvbnN0IGJvb2xzID0gWydyZXF1aXJlZCddO1xuY29uc3QgRVZFTlRfTkFNRSA9ICdjaGFuZ2UnO1xuXG5jbGFzcyBUaW1lSW5wdXQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzLCAndmFsdWUnXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRhdHRyaWJ1dGVDaGFuZ2VkIChuYW1lLCB2YWx1ZSkge1xuXHRcdC8vIG5lZWQgdG8gbWFuYWdlIHZhbHVlIG1hbnVhbGx5XG5cdFx0aWYgKG5hbWUgPT09ICd2YWx1ZScpIHtcblx0XHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0aWYgKGRhdGVzLmlzVmFsaWRPYmplY3QodmFsdWUpKSB7XG5cdFx0XHQvLyB0aGlzLm9yZ0RhdGUgPSB2YWx1ZTtcblx0XHRcdC8vIHRoaXMuc2V0RGF0ZSh2YWx1ZSk7XG5cdFx0XHR2YWx1ZSA9IGRhdGVzLmZvcm1hdCh2YWx1ZSwgJ2g6bSBhJyk7XG5cdFx0XHR0aGlzLnNldEFNUE0odmFsdWUpO1xuXHRcdH1cblx0XHR0aGlzLnN0ckRhdGUgPSB1dGlsLnN0cmlwRGF0ZSh2YWx1ZSk7XG5cdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RyRGF0ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdHJldHVybiB0aGlzLnN0ckRhdGU7XG5cdH1cblxuXHRnZXQgdmFsaWQgKCkge1xuXHRcdHJldHVybiB0aGlzLmlzVmFsaWQoKTtcblx0fVxuXG5cdG9uTGFiZWwgKHZhbHVlKSB7XG5cdFx0dGhpcy5sYWJlbE5vZGUuaW5uZXJIVE1MID0gdmFsdWU7XG5cdH1cblxuXHRvbk1pbiAodmFsdWUpIHtcblx0XHR0aGlzLm1pblRpbWUgPSBkYXRlcy5mb3JtYXQodXRpbC5nZXRNaW5UaW1lKHZhbHVlKSwgJ2g6bSBhJyk7XG5cdFx0dGhpcy5taW5EYXRlID0gdXRpbC5nZXRNaW5EYXRlKHZhbHVlKTtcblx0XHR0aGlzLnZhbGlkYXRlKCk7XG5cdH1cblxuXHRvbk1heCAodmFsdWUpIHtcblx0XHR0aGlzLm1heFRpbWUgPSBkYXRlcy5mb3JtYXQodXRpbC5nZXRNYXhUaW1lKHZhbHVlKSwgJ2g6bSBhJyk7XG5cdFx0dGhpcy5tYXhEYXRlID0gdXRpbC5nZXRNYXhEYXRlKHZhbHVlKTtcblx0XHR0aGlzLnZhbGlkYXRlKCk7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48bGFiZWw+XG5cdDxzcGFuIHJlZj1cImxhYmVsTm9kZVwiPjwvc3Bhbj5cblx0PGlucHV0IHJlZj1cImlucHV0XCIgY2xhc3M9XCJlbXB0eVwiIC8+XG48L2xhYmVsPmA7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnR5cGVkVmFsdWUgPSAnJztcblx0fVxuXG5cdHNldFZhbHVlICh2YWx1ZSwgc2lsZW50LCBhbXBtKSB7XG5cdFx0Y29uc3QgaXNSZWFkeSA9IC9bYXBdbS9pLnRlc3QodmFsdWUpIHx8IHZhbHVlLnJlcGxhY2UoLyg/IVgpXFxEL2csICcnKS5sZW5ndGggPj0gNDtcblx0XHRpZiAoaXNSZWFkeSkge1xuXHRcdFx0dGhpcy5zZXRBTVBNKHZhbHVlLCBnZXRBTVBNKHZhbHVlLCBhbXBtKSk7XG5cdFx0XHR2YWx1ZSA9IHV0aWwuZm9ybWF0VGltZSh2YWx1ZSk7XG5cdFx0XHRpZiAodmFsdWUubGVuZ3RoID09PSA1KSB7XG5cdFx0XHRcdHZhbHVlID0gdGhpcy5zZXRBTVBNKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnR5cGVkVmFsdWUgPSB2YWx1ZTtcblx0XHR0aGlzLmlucHV0LnZhbHVlID0gdmFsdWU7XG5cdFx0Y29uc3QgdmFsaWQgPSB0aGlzLnZhbGlkYXRlKCk7XG5cblx0XHRpZiAodmFsaWQpIHtcblx0XHRcdHRoaXMuc3RyRGF0ZSA9IHZhbHVlO1xuXHRcdFx0aWYgKCFzaWxlbnQpIHtcblx0XHRcdFx0dGhpcy5lbWl0RXZlbnQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG5cblx0c2V0RGF0ZSAodmFsdWUpIHtcblx0XHQvLyBzZXRzIHRoZSBjdXJyZW50IGRhdGUsIGJ1dCBub3QgdGhlIHRpbWVcblx0XHQvLyB1c2VkIHdoZW4gaW5zaWRlIGEgZGF0ZSBwaWNrZXIgZm9yIG1pbi9tYXhcblx0XHR0aGlzLmRhdGUgPSB2YWx1ZTtcblx0XHR0aGlzLnZhbGlkYXRlKCk7XG5cdH1cblxuXHRpc1ZhbGlkICh2YWx1ZSA9IHRoaXMuaW5wdXQudmFsdWUpIHtcblx0XHRpZiAoIXZhbHVlICYmIHRoaXMucmVxdWlyZWQpIHtcblx0XHRcdHRoaXMuZW1pdEVycm9yKCdUaGlzIGZpZWxkIGlzIHJlcXVpcmVkJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmRhdGUgJiYgdmFsdWUpIHtcblx0XHRcdGlmICh0aGlzLm1pbkRhdGUgJiYgZGF0ZXMuaXModGhpcy5kYXRlKS5lcXVhbERhdGUodGhpcy5taW5EYXRlKSkge1xuXHRcdFx0XHRpZiAodXRpbC5pcyh2YWx1ZSkubGVzcyh0aGlzLm1pblRpbWUpKSB7XG5cdFx0XHRcdFx0Y29uc3QgbXNnID0gdGhpcy5taW4gPT09ICdub3cnID8gJ1ZhbHVlIG11c3QgYmUgaW4gdGhlIGZ1dHVyZScgOiBgVmFsdWUgaXMgbGVzcyB0aGFuIHRoZSBtaW5pbXVtLCAke3RoaXMubWlufWA7XG5cdFx0XHRcdFx0dGhpcy5lbWl0RXJyb3IobXNnKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLm1heERhdGUgJiYgZGF0ZXMuaXModGhpcy5kYXRlKS5lcXVhbERhdGUodGhpcy5tYXhEYXRlKSkge1xuXHRcdFx0XHRpZiAodXRpbC5pcyh2YWx1ZSkuZ3JlYXRlcih0aGlzLm1heFRpbWUpKSB7XG5cdFx0XHRcdFx0Y29uc3QgbXNnID0gdGhpcy5tYXggPT09ICdub3cnID8gJ1ZhbHVlIG11c3QgYmUgaW4gdGhlIHBhc3QnIDogYFZhbHVlIGlzIGdyZWF0ZXIgdGhhbiB0aGUgbWF4aW11bSwgJHt0aGlzLm1heH1gO1xuXHRcdFx0XHRcdHRoaXMuZW1pdEVycm9yKG1zZyk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSkge1xuXHRcdFx0aWYgKHRoaXMubWluVGltZSkge1xuXHRcdFx0XHRpZiAodXRpbC5pcyh2YWx1ZSkubGVzcyh0aGlzLm1pblRpbWUpKSB7XG5cdFx0XHRcdFx0Y29uc3QgbXNnID0gdGhpcy5taW4gPT09ICdub3cnID8gJ1ZhbHVlIG11c3QgYmUgaW4gdGhlIGZ1dHVyZScgOiBgVmFsdWUgaXMgbGVzcyB0aGFuIHRoZSBtaW5pbXVtLCAke3RoaXMubWlufWA7XG5cdFx0XHRcdFx0dGhpcy5lbWl0RXJyb3IobXNnKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLm1heFRpbWUpIHtcblx0XHRcdFx0aWYgKHV0aWwuaXModmFsdWUpLmdyZWF0ZXIodGhpcy5tYXhUaW1lKSkge1xuXHRcdFx0XHRcdGNvbnN0IG1zZyA9IHRoaXMubWF4ID09PSAnbm93JyA/ICdWYWx1ZSBtdXN0IGJlIGluIHRoZSBwYXN0JyA6IGBWYWx1ZSBpcyBncmVhdGVyIHRoYW4gdGhlIG1heGltdW0sICR7dGhpcy5tYXh9YDtcblx0XHRcdFx0XHR0aGlzLmVtaXRFcnJvcihtc2cpO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdXRpbC50aW1lSXNWYWxpZCh2YWx1ZSk7XG5cdH1cblxuXHR2YWxpZGF0ZSAoKSB7XG5cdFx0aWYgKHRoaXMuaXNWYWxpZCgpKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ2ludmFsaWQnKTtcblx0XHRcdHRoaXMuZW1pdEVycm9yKG51bGwpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHRoaXMuY2xhc3NMaXN0LmFkZCgnaW52YWxpZCcpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHNldEFNUE0gKHZhbHVlLCBhbXBtKSB7XG5cdFx0bGV0IGlzQU07XG5cdFx0aWYgKGFtcG0pIHtcblx0XHRcdGlzQU0gPSAvYS9pLnRlc3QoYW1wbSk7XG5cdFx0fSBlbHNlIGlmICgvW2FwXS8udGVzdCh2YWx1ZSkpIHtcblx0XHRcdGlzQU0gPSAvYS9pLnRlc3QodmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpc0FNID0gdGhpcy5pc0FNO1xuXHRcdH1cblx0XHR2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1xccypbYXBdbS9pLCAnJykgKyAoaXNBTSA/ICcgYW0nIDogJyBwbScpO1xuXHRcdHRoaXMuaXNBTSA9IGlzQU07XG5cdFx0dGhpcy5pc1BNID0gIWlzQU07XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG5cblx0Zm9jdXMgKCkge1xuXHRcdHRoaXMub25Eb21SZWFkeSgoKSA9PiB7XG5cdFx0XHR0aGlzLmlucHV0LmZvY3VzKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRibHVyICgpIHtcblx0XHR0aGlzLm9uRG9tUmVhZHkoKCkgPT4ge1xuXHRcdFx0dGhpcy5pbnB1dC5ibHVyKCk7XG5cdFx0XHR0aGlzLnZhbGlkYXRlKCk7XG5cdFx0XHR0aGlzLmVtaXRFdmVudCgpO1xuXHRcdH0pXG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0dGhpcy5tYXNrID0gdGhpcy5tYXNrIHx8IGRlZmF1bHRNYXNrO1xuXHRcdHRoaXMubWFza0xlbmd0aCA9IHRoaXMubWFzay5tYXRjaCgvWC9nKS5qb2luKCcnKS5sZW5ndGg7XG5cdFx0dGhpcy5pbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dCcpO1xuXHRcdHRoaXMuaW5wdXQuc2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicsIHRoaXMucGxhY2Vob2xkZXIgfHwgZGVmYXVsdFBsYWNlaG9sZGVyKTtcblx0XHRpZiAodGhpcy5uYW1lKSB7XG5cdFx0XHR0aGlzLmlucHV0LnNldEF0dHJpYnV0ZSgnbmFtZScsIHRoaXMubmFtZSk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmxhYmVsKSB7XG5cdFx0XHR0aGlzLmxhYmVsTm9kZS5pbm5lckhUTUwgPSB0aGlzLmxhYmVsO1xuXHRcdH1cblx0XHR0aGlzLmV2ZW50TmFtZSA9IHRoaXNbJ2V2ZW50LW5hbWUnXSB8fCBFVkVOVF9OQU1FO1xuXHRcdHRoaXMuZW1pdFR5cGUgPSB0aGlzLmV2ZW50TmFtZSA9PT0gRVZFTlRfTkFNRSA/ICdlbWl0JyA6ICdmaXJlJztcblx0XHR0aGlzLmNvbm5lY3RLZXlzKCk7XG5cdH1cblxuXHRlbWl0RXZlbnQgKCkge1xuXHRcdGNvbnN0IHZhbHVlID0gdGhpcy52YWx1ZTtcblx0XHRpZiAodmFsdWUgPT09IHRoaXMubGFzdFZhbHVlIHx8ICF0aGlzLmlzVmFsaWQodmFsdWUpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMubGFzdFZhbHVlID0gdmFsdWU7XG5cdFx0dGhpc1t0aGlzLmVtaXRUeXBlXSh0aGlzLmV2ZW50TmFtZSwgeyB2YWx1ZSB9LCB0cnVlKTtcblx0fVxuXG5cdGVtaXRFcnJvciAobXNnKSB7XG5cdFx0aWYgKG1zZyA9PT0gdGhpcy52YWxpZGF0aW9uRXJyb3IpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy52YWxpZGF0aW9uRXJyb3IgPSBtc2c7XG5cdFx0dGhpcy5maXJlKCd2YWxpZGF0aW9uJywgeyBtZXNzYWdlOiBtc2cgfSwgdHJ1ZSk7XG5cdH1cblxuXHRjb25uZWN0S2V5cyAoKSB7XG5cdFx0dGhpcy5vbih0aGlzLmlucHV0LCAna2V5ZG93bicsIHV0aWwuc3RvcEV2ZW50KTtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXlwcmVzcycsIHV0aWwuc3RvcEV2ZW50KTtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXl1cCcsIChlKSA9PiB7XG5cdFx0XHRvbktleS5jYWxsKHRoaXMsIGUpO1xuXHRcdH0pO1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2JsdXInLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmJsdXIoKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBnZXRBTVBNICh2YWx1ZSwgYW1wbSkge1xuXHRpZiAoYW1wbSkge1xuXHRcdHJldHVybiBhbXBtO1xuXHR9XG5cdGlmICgvYS9pLnRlc3QodmFsdWUpKSB7XG5cdFx0cmV0dXJuICdhbSc7XG5cdH1cblx0aWYgKC9wL2kudGVzdCh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gJ3BtJztcblx0fVxuXHRyZXR1cm4gJyc7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndGltZS1pbnB1dCcsIFRpbWVJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGltZUlucHV0OyIsImNvbnN0IGRhdGVzID0gcmVxdWlyZSgnQGNsdWJhamF4L2RhdGVzJyk7XG5cbmZ1bmN0aW9uIHJvdW5kIChuLCByLCBkb3duKSB7XG5cdHJldHVybiAoTWF0aC5jZWlsKG4gLyByKSAqIHIpIC0gKGRvd24gPyByIDogMCk7XG59XG5cbmZ1bmN0aW9uIGluY01pbnV0ZXMgKHZhbHVlLCBpbmMsIG11bHQgPSAxKSB7XG5cblx0Y29uc3QgdHlwZSA9IGlzKHZhbHVlKS50eXBlKCk7XG5cdGNvbnN0IE1OID0gdHlwZSA9PT0gJ3RpbWUnID8gWzMsNV0gOiBbMTQsMTZdO1xuXG5cdGxldCBtbiA9IHBhcnNlSW50KHZhbHVlLnN1YnN0cmluZyhNTlswXSwgTU5bMV0pKTtcblx0Y29uc3Qgb3JnID0gbW47XG5cblx0bW4gPSByb3VuZChtbiwgbXVsdCwgaW5jID09PSAtMSk7XG5cblx0aWYgKG1uID09PSBvcmcpIHtcblx0XHRtbiArPSAoaW5jICogbXVsdCk7XG5cdH1cblxuXHRpZiAobW4gPiA1OSkge1xuXHRcdG1uID0gMDtcblx0fVxuXHRpZiAobW4gPCAwKSB7XG5cdFx0bW4gPSA0NTtcblx0fVxuXG5cdHJldHVybiBgJHt2YWx1ZS5zdWJzdHJpbmcoMCwgTU5bMF0pfSR7cGFkKG1uKX0ke3ZhbHVlLnN1YnN0cmluZyhNTlsxXSl9YDtcbn1cblxuZnVuY3Rpb24gaW5jSG91cnMgKHZhbHVlLCBpbmMpIHtcblx0Y29uc3QgdHlwZSA9IGlzKHZhbHVlKS50eXBlKCk7XG5cdGNvbnN0IEhSID0gdHlwZSA9PT0gJ3RpbWUnID8gWzAsMl0gOiBbMTEsMTNdO1xuXHRsZXQgaHIgPSBwYXJzZUludCh2YWx1ZS5zdWJzdHJpbmcoSFJbMF0sIEhSWzFdKSk7XG5cdGhyICs9IGluYztcblx0aWYgKGhyIDwgMSkge1xuXHRcdGhyID0gMTI7XG5cdH0gZWxzZSBpZiAoaHIgPiAxMikge1xuXHRcdGhyID0gMTtcblx0fVxuXHRyZXR1cm4gYCR7dmFsdWUuc3Vic3RyaW5nKDAsIEhSWzBdKX0ke3BhZChocil9JHt2YWx1ZS5zdWJzdHJpbmcoSFJbMV0pfWA7XG59XG5cbmZ1bmN0aW9uIGluY01vbnRoICh2YWx1ZSwgaW5jKSB7XG5cdGxldCBtbyA9IHBhcnNlSW50KHZhbHVlLnN1YnN0cmluZygwLDIpKTtcblx0bW8gKz0gaW5jO1xuXHRpZiAobW8gPiAxMikge1xuXHRcdG1vID0gMTtcblx0fSBlbHNlIGlmIChtbyA8PSAwKSB7XG5cdFx0bW8gPSAxMjtcblx0fVxuXHRyZXR1cm4gYCR7cGFkKG1vKX0ke3ZhbHVlLnN1YnN0cmluZygyKX1gO1xufVxuXG5mdW5jdGlvbiBpbmNEYXRlICh2YWx1ZSwgaW5jKSB7XG5cdGNvbnN0IGRhdGUgPSBkYXRlcy50b0RhdGUodmFsdWUpO1xuXHRjb25zdCBtYXggPSBkYXRlcy5nZXREYXlzSW5Nb250aChkYXRlKTtcblx0bGV0IGR0ID0gcGFyc2VJbnQodmFsdWUuc3Vic3RyaW5nKDMsNSkpO1xuXHRkdCArPSBpbmM7XG5cdGlmIChkdCA8PSAwKSB7XG5cdFx0ZHQgPSBtYXg7XG5cdH0gZWxzZSBpZiAoZHQgPiBtYXgpIHtcblx0XHRkdCA9IDE7XG5cdH1cblx0cmV0dXJuIGAke3ZhbHVlLnN1YnN0cmluZygwLDIpfSR7cGFkKGR0KX0ke3ZhbHVlLnN1YnN0cmluZyg2KX1gO1xufVxuXG5mdW5jdGlvbiBpbmNZZWFyICh2YWx1ZSwgaW5jKSB7XG5cdGxldCB5ciA9IHBhcnNlSW50KHZhbHVlLnN1YnN0cmluZyg2LDEwKSk7XG5cdHlyICs9IGluYztcblx0cmV0dXJuIGAke3ZhbHVlLnN1YnN0cmluZygwLDUpfSR7cGFkKHlyKX0ke3ZhbHVlLnN1YnN0cmluZygxMSl9YDtcbn1cblxuZnVuY3Rpb24gcGFkIChudW0pIHtcblx0aWYgKG51bSA8IDEwKSB7XG5cdFx0cmV0dXJuICcwJyArIG51bTtcblx0fVxuXHRyZXR1cm4gJycgKyBudW07XG59XG5cbmZ1bmN0aW9uIHRvRGF0ZVRpbWUgKHZhbHVlKSB7XG5cdC8vIEZJWE1FOiB0b1RpbWUoKSBvciB0byBzdHJUaW1lKCkgb3IgREVMRVRFIC0gb25seSB1c2VkIGluIHV0aWxcblx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcblx0XHR2YWx1ZSA9IGRhdGVzLmZvcm1hdCh2YWx1ZSwgJ2g6bSBhJyk7XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSBzdHJpcERhdGUodmFsdWUpO1xuXHR9XG5cdGNvbnN0IGhyID0gZ2V0SG91cnModmFsdWUpO1xuXHRjb25zdCBtbiA9IGdldE1pbnV0ZXModmFsdWUpO1xuXHRjb25zdCBzYyA9IGdldFNlY29uZHModmFsdWUpO1xuXHRpZiAoaXNOYU4oaHIpIHx8IGlzTmFOKG1uKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0aW1lICcgKyB0aW1lKTtcblx0fVxuXHRjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcblx0ZGF0ZS5zZXRIb3Vycyhocik7XG5cdGRhdGUuc2V0TWludXRlcyhtbik7XG5cdGRhdGUuc2V0U2Vjb25kcyhzYyk7XG5cdHJldHVybiBkYXRlO1xufVxuXG5mdW5jdGlvbiB0aW1lSXNWYWxpZCAodmFsdWUpIHtcblx0Ly8gMTI6MzQgYW1cblx0aWYgKHZhbHVlLmxlbmd0aCA8IDgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0Y29uc3QgaHIgPSBnZXRIb3Vycyh2YWx1ZSk7XG5cdGNvbnN0IG1uID0gZ2V0TWludXRlcyh2YWx1ZSk7XG5cdGlmIChpc05hTihocikgfHwgaXNOYU4obW4pKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdGlmICghL1thcF1tL2kudGVzdCh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0aWYgKGhyIDwgMCB8fCBociA+IDEyKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdGlmIChtbiA8IDAgfHwgbW4gPiA1OSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdGltZUlzSW5SYW5nZSAodGltZSwgbWluLCBtYXgsIGRhdGUpIHtcblx0aWYgKCFtaW4gJiYgIW1heCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYgKGRhdGUpIHtcblx0XHQvLyBmaXJzdCBjaGVjayBkYXRlIHJhbmdlLCBiZWZvcmUgdGltZSByYW5nZVxuXHRcdGNvbnNvbGUubG9nKCdkYXRlLnJhbmdlJywgZGF0ZSwgJy8nLCBtaW4sICcvJywgbWF4KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cblx0Y29uc29sZS5sb2coJ3RpbWUucmFuZ2UnLCB0aW1lLCAnLycsIG1pbiwgJy8nLCBtYXgpO1xuXHRjb25zdCBkID0gdG9EYXRlVGltZSh0aW1lKTtcblx0Ly8gaXNHcmVhdGVyOiAxc3QgPiAybmRcblx0aWYgKG1pbiAmJiAhZGF0ZXMuaXMoZCkuZ3JlYXRlcih0b0RhdGVUaW1lKG1pbikpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdGlmIChtYXggJiYgIWRhdGVzLmlzKGQpLmxlc3ModG9EYXRlVGltZShtYXgpKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBhZGRUaW1lVG9EYXRlICh0aW1lLCBkYXRlKSB7XG5cdGlmICghdGltZUlzVmFsaWQodGltZSkpIHtcblx0XHRjb25zb2xlLndhcm4oJ3RpbWUgaXMgbm90IHZhbGlkJywgdGltZSk7XG5cdFx0cmV0dXJuIGRhdGU7XG5cdH1cblx0bGV0IGhyID0gZ2V0SG91cnModGltZSk7XG5cdGNvbnN0IG1uID0gZ2V0TWludXRlcyh0aW1lKTtcblx0aWYgKC9wbS9pLnRlc3QodGltZSkgJiYgaHIgIT09IDEyKSB7XG5cdFx0aHIgKz0gMTI7XG5cdH1cblx0ZGF0ZS5zZXRIb3Vycyhocik7XG5cdGRhdGUuc2V0TWludXRlcyhtbik7XG5cdHJldHVybiBkYXRlO1xufVxuXG5mdW5jdGlvbiBuZXh0TnVtUG9zIChiZWcsIHMpIHtcblx0bGV0IGNoYXIsIGksIGZvdW5kID0gZmFsc2U7XG5cdGZvciAoaSA9IDA7IGkgPCBzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKGkgPCBiZWcpIHtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblx0XHRjaGFyID0gcy5jaGFyQXQoaSk7XG5cdFx0aWYgKCFpc05hTihwYXJzZUludChjaGFyKSkpIHtcblx0XHRcdGNoYXIgPSBwYXJzZUludChjaGFyKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBjaGFyID09PSAnbnVtYmVyJykge1xuXHRcdFx0Zm91bmQgPSB0cnVlO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGZvdW5kID8gaSA6IC0xO1xufVxuXG5jb25zdCBudW1SZWcgPSAvWzAtOV0vO1xuXG5mdW5jdGlvbiBpc051bSAoaykge1xuXHRyZXR1cm4gbnVtUmVnLnRlc3Qoayk7XG59XG5cbmNvbnN0IGNvbnRyb2wgPSB7XG5cdCdTaGlmdCc6IDEsXG5cdCdFbnRlcic6IDEsXG5cdCdCYWNrc3BhY2UnOiAxLFxuXHQnRGVsZXRlJzogMSxcblx0J0Fycm93TGVmdCc6IDEsXG5cdCdBcnJvd1JpZ2h0JzogMSxcblx0J0VzY2FwZSc6IDEsXG5cdCdDb21tYW5kJzogMSxcblx0J1RhYic6IDEsXG5cdCdNZXRhJzogMSxcblx0J0FsdCc6IDFcbn07XG5cbmNvbnN0IGlzQXJyb3dLZXkgPSB7XG5cdCdBcnJvd1VwJzogMSxcblx0J0Fycm93RG93bic6IDFcbn07XG5cbmZ1bmN0aW9uIGlzQ29udHJvbCAoZSkge1xuXHRyZXR1cm4gY29udHJvbFtlLmtleV07XG59XG5cbmZ1bmN0aW9uIHRpbWVUb1NlY29uZHMgKHZhbHVlKSB7XG5cdGNvbnN0IGlzQU0gPSAvYW0vaS50ZXN0KHZhbHVlKTtcblx0bGV0IGhyID0gZ2V0SG91cnModmFsdWUpO1xuXHRpZiAoaXNBTSAmJiBociA9PT0gMTIpIHtcblx0XHRociA9IDA7XG5cdH0gZWxzZSBpZiAoIWlzQU0gJiYgaHIgIT09IDEyKSB7XG5cdFx0aHIgKz0gMTI7XG5cdH1cblx0bGV0IG1uID0gZ2V0TWludXRlcyh2YWx1ZSk7XG5cdGNvbnN0IHNjID0gZ2V0U2Vjb25kcyh2YWx1ZSk7XG5cdGlmIChpc05hTihocikgfHwgaXNOYU4obW4pKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRpbWUgJyArIHRpbWUpO1xuXHR9XG5cdG1uICo9IDYwO1xuXHRociAqPSAzNjAwO1xuXHRyZXR1cm4gaHIgKyBtbiArIHNjO1xufVxuXG5mdW5jdGlvbiBnZXRIb3VycyAodmFsdWUpIHtcblx0cmV0dXJuIHBhcnNlSW50KHZhbHVlLnN1YnN0cmluZygwLCAyKSk7XG59XG5cbmZ1bmN0aW9uIGdldE1pbnV0ZXMgKHZhbHVlKSB7XG5cdHJldHVybiBwYXJzZUludCh2YWx1ZS5zdWJzdHJpbmcoMywgNSkpO1xufVxuXG5mdW5jdGlvbiBnZXRTZWNvbmRzICh2YWx1ZSkge1xuXHRpZiAodmFsdWUuc3BsaXQoJzonKS5sZW5ndGggPT09IDMpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodmFsdWUuc3Vic3RyaW5nKDYsIDgpKTtcblx0fVxuXHRyZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gc3RyaXBEYXRlIChzdHIpIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXGQrW1xcLy1dXFxkK1tcXC8tXVxcZCtcXHMqLywgJycpO1xufVxuXG5mdW5jdGlvbiBzdG9wRXZlbnQgKGUpIHtcblx0aWYgKGUubWV0YUtleSB8fCBjb250cm9sW2Uua2V5XSkge1xuXHRcdHJldHVybjtcblx0fVxuXHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2hhckF0UG9zIChzdHIsIHBvcykge1xuXHRyZXR1cm4gc3RyLnN1YnN0cmluZygwLCBwb3MpICsgc3RyLnN1YnN0cmluZyhwb3MgKyAxKTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZVRleHQgKHN0ciwgY2hhcnMsIGJlZywgZW5kLCB4Q2hhcnMpIHtcblx0Y2hhcnMgPSBjaGFycy5wYWRFbmQoZW5kIC0gYmVnLCB4Q2hhcnMpO1xuXHRyZXR1cm4gc3RyLnN1YnN0cmluZygwLCBiZWcpICsgY2hhcnMgKyBzdHIuc3Vic3RyaW5nKGVuZCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdERhdGUgKHMsIG1hc2spIHtcblx0ZnVuY3Rpb24gc3ViIChwb3MpIHtcblx0XHRsZXQgc3ViU3RyID0gJyc7XG5cdFx0Zm9yIChsZXQgaSA9IHBvczsgaSA8IG1hc2subGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmIChtYXNrW2ldID09PSAnWCcpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRzdWJTdHIgKz0gbWFza1tpXTtcblx0XHR9XG5cdFx0cmV0dXJuIHN1YlN0cjtcblx0fVxuXG5cdHMgPSBzLnJlcGxhY2UoLyg/IVgpXFxEL2csICcnKTtcblx0Y29uc3QgbWFza0xlbmd0aCA9IG1hc2subWF0Y2goL1gvZykuam9pbignJykubGVuZ3RoO1xuXHRsZXQgZiA9ICcnO1xuXHRjb25zdCBsZW4gPSBNYXRoLm1pbihzLmxlbmd0aCwgbWFza0xlbmd0aCk7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRpZiAobWFza1tmLmxlbmd0aF0gIT09ICdYJykge1xuXHRcdFx0ZiArPSBzdWIoZi5sZW5ndGgpO1xuXHRcdH1cblx0XHRmICs9IHNbaV07XG5cdH1cblx0cmV0dXJuIGY7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRpbWUgKHMpIHtcblx0cyA9IHMucmVwbGFjZSgvKD8hWClcXEQvZywgJycpO1xuXHRzID0gcy5zdWJzdHJpbmcoMCwgNCk7XG5cdGlmIChzLmxlbmd0aCA8IDQpIHtcblx0XHRzID0gYDAke3N9YDtcblx0fVxuXHRpZiAocy5sZW5ndGggPj0gMikge1xuXHRcdHMgPSBzLnNwbGl0KCcnKTtcblx0XHRzLnNwbGljZSgyLCAwLCAnOicpO1xuXHRcdHMgPSBzLmpvaW4oJycpO1xuXHR9XG5cdHJldHVybiBzO1xufVxuXG5mdW5jdGlvbiBnZXRBTVBNICh2YWx1ZSkge1xuXHRjb25zdCByZXN1bHQgPSAvW2FwXW0vLmV4ZWModmFsdWUpO1xuXHRyZXR1cm4gcmVzdWx0ID8gcmVzdWx0WzBdIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0TWluRGF0ZSAodmFsdWUpIHtcblx0aWYgKHZhbHVlID09PSAnbm93Jykge1xuXHRcdHZhbHVlID0gbmV3IERhdGUoKTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IGRhdGVzLnRvRGF0ZSh2YWx1ZSk7XG5cdH1cblx0dmFsdWUuc2V0SG91cnMoMCk7XG5cdHZhbHVlLnNldE1pbnV0ZXMoMCk7XG5cdHZhbHVlLnNldFNlY29uZHMoMCk7XG5cdHZhbHVlLnNldE1pbGxpc2Vjb25kcygwKTtcblx0cmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBnZXRNYXhEYXRlICh2YWx1ZSkge1xuXHRpZiAodmFsdWUgPT09ICdub3cnKSB7XG5cdFx0dmFsdWUgPSBuZXcgRGF0ZSgpO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gZGF0ZXMudG9EYXRlKHZhbHVlKTtcblx0fVxuXHR2YWx1ZS5zZXRIb3VycygyMyk7XG5cdHZhbHVlLnNldE1pbnV0ZXMoNTkpO1xuXHR2YWx1ZS5zZXRTZWNvbmRzKDU5KTtcblx0dmFsdWUuc2V0TWlsbGlzZWNvbmRzKDk5OSk7XG5cdHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0TWluVGltZSAodmFsdWUpIHtcblx0aWYgKHZhbHVlID09PSAnbm93Jykge1xuXHRcdHZhbHVlID0gbmV3IERhdGUoKTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IGRhdGVzLnRvRGF0ZSh2YWx1ZSk7XG5cdH1cblx0dmFsdWUuc2V0U2Vjb25kcyh2YWx1ZS5nZXRTZWNvbmRzKCkgLSAyKTtcblx0cmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBnZXRNYXhUaW1lICh2YWx1ZSkge1xuXHRpZiAodmFsdWUgPT09ICdub3cnKSB7XG5cdFx0dmFsdWUgPSBuZXcgRGF0ZSgpO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gZGF0ZXMudG9EYXRlKHZhbHVlKTtcblx0fVxuXHR2YWx1ZS5zZXRTZWNvbmRzKHZhbHVlLmdldFNlY29uZHMoKSArIDIpO1xuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHRvQXJpYUxhYmVsIChkYXRlKSB7XG5cdGRhdGUgPSBkYXRlcy50b0RhdGUoZGF0ZSk7XG5cdHJldHVybiBkYXRlcy5mb3JtYXQoZGF0ZSwgJ2QsIEUgTU1NTSB5eXl5Jyk7XG59XG5cbmZ1bmN0aW9uIGlzICh2YWx1ZSkge1xuXHRyZXR1cm4ge1xuXHRcdGxlc3MgKHRpbWUpIHtcblx0XHRcdHJldHVybiB0aW1lVG9TZWNvbmRzKHZhbHVlKSA8IHRpbWVUb1NlY29uZHModGltZSk7XG5cdFx0fSxcblx0XHRncmVhdGVyICh0aW1lKSB7XG5cdFx0XHRyZXR1cm4gdGltZVRvU2Vjb25kcyh2YWx1ZSkgPiB0aW1lVG9TZWNvbmRzKHRpbWUpO1xuXHRcdH0sXG5cdFx0ZGF0ZUFuZFRpbWUgKCkge1xuXHRcdFx0cmV0dXJuIGRhdGVzLmlzKHZhbHVlKS5kYXRlKCkgJiYgZGF0ZXMuaXModmFsdWUpLnRpbWUoKTtcblx0XHR9LFxuXHRcdHRpbWUgKCkge1xuXHRcdFx0cmV0dXJuIGRhdGVzLmlzKHZhbHVlKS50aW1lKCk7XG5cdFx0fSxcblx0XHRkYXRlICgpIHtcblx0XHRcdHJldHVybiBkYXRlcy5pcyh2YWx1ZSkuZGF0ZSgpO1xuXHRcdH0sXG5cdFx0dHlwZSAoKSB7XG5cdFx0XHRpZiAodGhpcy5kYXRlQW5kVGltZSgpKSB7XG5cdFx0XHRcdHJldHVybiAnZGF0ZXRpbWUnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMudGltZSgpKSB7XG5cdFx0XHRcdHJldHVybiAndGltZSc7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5kYXRlKCkpIHtcblx0XHRcdFx0cmV0dXJuICdkYXRlJztcblx0XHRcdH1cblx0XHRcdHJldHVybiAnJztcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGlzLFxuXHRhZGRUaW1lVG9EYXRlLFxuXHR0aW1lSXNWYWxpZCxcblx0aW5jTWludXRlcyxcblx0aW5jSG91cnMsXG5cdGluY01vbnRoLFxuXHRpbmNEYXRlLFxuXHRpbmNZZWFyLFxuXHRyb3VuZCxcblx0cGFkLFxuXHRpc051bSxcblx0Y29udHJvbCxcblx0aXNBcnJvd0tleSxcblx0aXNDb250cm9sLFxuXHRzdG9wRXZlbnQsXG5cdG5leHROdW1Qb3MsXG5cdHJlbW92ZUNoYXJBdFBvcyxcblx0cmVwbGFjZVRleHQsXG5cdGZvcm1hdERhdGUsXG5cdGZvcm1hdFRpbWUsXG5cdGdldEFNUE0sXG5cdGdldE1pbkRhdGUsXG5cdGdldE1heERhdGUsXG5cdHRvQXJpYUxhYmVsLFxuXHRnZXRNaW5UaW1lLFxuXHRnZXRNYXhUaW1lLFxuXHR0aW1lSXNJblJhbmdlLFxuXHR0b0RhdGVUaW1lLFxuXHR0aW1lVG9TZWNvbmRzLFxuXHRzdHJpcERhdGVcbn07XG4iLCJyZXF1aXJlKCdkYXRlLXBpY2tlci9zcmMvZGF0ZS1pbnB1dCcpO1xucmVxdWlyZSgnZGF0ZS1waWNrZXIvc3JjL2RhdGUtcGlja2VyJyk7XG5yZXF1aXJlKCdkYXRlLXBpY2tlci9zcmMvZGF0ZS1yYW5nZS1pbnB1dCcpO1xucmVxdWlyZSgnZGF0ZS1waWNrZXIvc3JjL2RhdGUtcmFuZ2UtaW5wdXRzJyk7XG5yZXF1aXJlKCdkYXRlLXBpY2tlci9zcmMvZGF0ZS1yYW5nZS1waWNrZXInKTtcbnJlcXVpcmUoJ2RhdGUtcGlja2VyL3NyYy9kYXRlLXRpbWUtaW5wdXQnKTtcbnJlcXVpcmUoJ2RhdGUtcGlja2VyL3NyYy90aW1lLWlucHV0Jyk7Il19
