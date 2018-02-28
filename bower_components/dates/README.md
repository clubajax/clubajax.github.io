# date
A small utility library for managing date objects. Good alternative to Moment, and its larger footprint.

## Getting Started

To install using bower:

	bower install clubajax/dates --save

You may also use `npm` if you prefer. Or, you can clone the repository with your generic clone commands as a standalone 
repository or submodule.

	git clone git://github.com/clubajax/dates.git

It is recommended that you set the config.path of RequireJS to make `dates` accessible as an
absolute path.

dates has no dependencies.

## Support

dates supports all modern browsers, and is tested on IE10 and up. 

## Docs

 - `format(date, delimiterOrPattern)` - Formats a date string from a date object, based on the pattern of the third object. If `delimiterOrPattern` is:
  - One character, it is assumed to be a delimiter, and used to separate the numbers of a default date string _(mm/dd/yyyy)_
  - Otherwise, the format of the date string is constructed based on some of the common standard patterns, such as what is used in [Java](https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html)
 - `formatTime(date, usePeriod)` - Formats a typical time string _(12:00 AM)_. The period (AM/PM) is optional.
 - `period(date)` - Returns AM or PM based on the date object.
 - `toDate(str)` - Returns a date object based on the date string.
 - `getNaturalDay(date, compareDate, noDaysOfWeek)` - Returns simple natural dates (Yesterday, Today, Tommorrow) or the date. Will add Mon, Tues, etc, unless `noDaysOfWeek` is true. `compareDate` is usually the current date.
 - `toTimestamp(date)` - Returns a timestamp based on the date object.
 - `fromTimestamp(string)` - Returns a date based on the timestamp.
 - `isTimestamp(string)` - Returns a boolean on whether the argument is a timestamp.
 - `subtract(date, amount, dateType)` - Subtracts N "something" (day, week, month, year) from a date object.
 - `add(date, amount, dateType)` - Adds N "something" (day, week, month, year) from a date object.
 - `subtractDate(date1, date2, datepart)` - Subtracts date1 from date2 and returns the difference based on the increment of the third parameter (in days, weeks, etc).
 - `copy(date)` - Returns a copy of a date object.
 - `isLess(date1, date2)` - Returns if first date is less than second date.
 - `isGreater(date1, date2)` - Returns if first date is greater than second date.
 - `diff(date1, date2)` - The difference, in days, between two date objects. Always a positive value.
 - `isValid(date)` - Determines if the date object or date string is a valid date.
 - `isValidObject(value)` - Determines if the value is a valid date object.
 - `isLeapYear(dateOrYear)` - Determines if the date or year is a leap year.
 - `getMonthIndex(name)` - Returns the zero-based index, given a month name, which can be a full name or abbreviation (January or Jan).
 - `getFirstSunday(date)` - For use in building calendars.
 - `getDaysInMonth(date)` - For use in building calendars.
 - `getDaysInPrevMonth(date)` - For use in building calendars.
 - `getMonthName(date)` - Returns the month name of a date.
 
 
## License

This uses the [MIT license](./LICENSE). Feel free to use, and redistribute at will.