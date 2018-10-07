const dom = window.dom;
const dates = window.dates;
const linkToPublicCalendar = 'media.redtigerkarate@gmail.com';
const apiKey = 'AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs';

// Mike public Karate Calendar:
// https://calendar.google.com/calendar/embed?src=957ttrgqkedrv1iplduhcodi8o%40group.calendar.google.com&ctz=America%2FChicago
// id: 957ttrgqkedrv1iplduhcodi8o@group.calendar.google.com

// Media RTK Calendar:
// https://calendar.google.com/calendar/embed?src=media.redtigerkarate%40gmail.com&ctz=America%2FChicago
// https://calendar.google.com/calendar/b/1?cid=bWVkaWEucmVkdGlnZXJrYXJhdGVAZ21haWwuY29t
// id: media.redtigerkarate%40gmail.com
// bWVkaWEucmVkdGlnZXJrYXJhdGVAZ21haWwuY29t@group.calendar.google.com

function fetchCalendar (timeMin, timeMax, callback) {

	const params = {
		calendarId: encodeURIComponent(linkToPublicCalendar),
		singleEvents: true,
		orderBy: 'startTime',
		timeZone: 'America%2FChicago',
		maxAttendees: 1,
		maxResults: 250,
		sanitizeHtml: true,
		timeMin: encodeURIComponent(timeMin),
		timeMax: encodeURIComponent(timeMax),
		key: apiKey
	};

	function stringParams () {
		return Object.keys(params).reduce((arr, key) => {
			arr.push(`${key}=${params[key]}`);
			return arr;
		}, []).join('&');
	}

	const url = `https://clients6.google.com/calendar/v3/calendars/${linkToPublicCalendar}/events?${stringParams()}`;

	fetch(url)
	.then(e => e.json())
	.then((e) => {
		// e.items.forEach(createEvent);
		callback(e);
	});
}

// const timeMin = '2018-08-01T00:00:00-05:00';
// const timeMax = '2019-12-07T00:00:00-05:00';
// fetchCalendar(timeMin, timeMax);

function getDateContainers () {
	const list = [];
	dom.queryAll('[start-date]').forEach((node) => {
		list.push({
			node: node,
			beg: dates.toDate(dom.attr(node, 'start-date')),
			end: dates.toDate(dom.attr(node, 'end-date'))
		});
	});
	const beg = dates.toTimestamp(dates.min(list.map(function (item) {
		return item.beg;
	})), true);
	const end = dates.toTimestamp(dates.max(list.map(function (item) {
		return item.end;
	})), true);

	fetchCalendar(beg, end, function (events) {
		parseEvents(events, list);
	});
}

function parseEvents (events, list) {
	console.log('PARSE', events);
	const semesterNode = dom.query('[semester]');
	events.items.forEach(util.updateEvent);
	list.forEach(function (item) {
		events.items.forEach(function (event) {
			if (util.inRange(event.start, item.beg, item.end)) {
				if (/semester|notice/.test(event.type)) {
					createEvent(event, semesterNode);
				} else {
					createEvent(event, item.node, true);
				}
			}
		});
	});


}

let currentMonth;

function createEvent (event, parent, updateMonths) {
	// parse
	const type = event.type;
	const allDay = !!event.start.date;
	const start = dates.toDate(event.start.dateTime || event.start.date);
	const end = dates.toDate(event.end.dateTime || event.end.date);
	const multiDay = start.getDate() !== end.getDate() || start.getMonth() !== end.getMonth();
	const month = dates.getMonthName(start) + ' ' + start.getFullYear();
	if (updateMonths && currentMonth !== month) {
		currentMonth = month;
		dom('div', { class: 'month', html: month }, parent);
	}

	// console.log('start', start);
	// console.log('end', end);
	// console.log(event.summary, ' - ', type);
	dom('div', {
		class: 'event',
		html: [
			dom('h3', { html: event.summary, class: type }),
			// allDay ? getDates(start, end) : getTimes(start, end),
			util.getDayAndTime(start, end, allDay, multiDay),
			util.getDescription(event.description),
			util.getLocation(event.location),
		]
	}, parent);
}

const util = {
	updateEvent: function (event) {
		event.type = util.getType(event.summary);
		event.description = event.description ? event.description.replace(/{{\w*}}/, '') : null;
	},
	inRange: function (eventDate, beg, end) {
		const date = dates.toDate(eventDate.date || eventDate.dateTime).getTime();
		return date >= beg.getTime() && date <= end.getTime();
	},
	getDescription: function (txt) {
		if (!txt) {
			return null;
		}
		return dom('div', { class: 'description', html: txt });
	},
	getLocation: function (txt) {
		if (!txt) {
			return null;
		}
		return dom('div', {
			class: 'location', html: [
				dom('span', { class: 'pin' }),
				dom('span', { html: txt })
			]
		});
	},
	getType: function (str) {
		const reg = /Semester|Test|Camp|Tournament|Championship/i;
		const match = reg.exec(str);
		return match ? 'tag-' + match[0].toLowerCase() : 'tag-notice';
	},

	getDates: function (start, end) {
		if (dates.getMonthName(start) === dates.getMonthName(end)) {
			return dom('div', { class: 'times', html: dates.format(start, 'MMM d') + '-' + dates.format(end, 'd') });
		} else {

		}
		return dom('div', { class: 'times', html: 'WEEK' });
	},

	getTimes: function (start, end) {
		const day = dates.format(start, 'e, MMM d');
		const time = dates.format(start, 'h:m') + '-' + dates.format(end, 'h:mA');
		return dom('div', { class: 'times', html: [day, time] });
	},

	isSamePeriod: function (start, end) {
		const h1 = start.getHours();
		const h2 = end.getHours();
		return (h1 <= 12 && h2 <= 12) || (h1 > 12 && h2 > 12);
	},

	isWeek: function (start, end) {
		return dates.diff(start, end) === 5;
	},

	getDayAndTime: function (start, end, allDay, multiDay) {
		if (allDay) {
			if (multiDay) {
				if (util.isWeek(start, end)) {
					return 'Week of ' + dates.format(start, 'MMM d');
				}
				return dates.format(start, 'MMM d') + ' - ' + dates.format(end, 'MMM d');
			}
			return dates.format(start, 'e, MMM d');
		}
		let days;
		let time;
		if (util.isSamePeriod(start, end)) {
			time = dates.format(start, 'h:m') + '-' + dates.format(end, 'h:ma');
		} else {
			time = dates.format(start, 'h:ma') + ' - ' + dates.format(end, 'h:ma');
		}
		if (multiDay) {
			days = dates.format(start, 'MMM d') + ' - ' + dates.format(end, 'MMM d');
		} else {
			days = dates.format(start, 'e, MMM d');
		}
		return dom('div', { class: 'times', html: [days, time] });
	}
};


getDateContainers();