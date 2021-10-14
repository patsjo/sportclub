import { TFunction } from 'i18next';
import moment from 'moment';

const GetDayOfWeek = (date: moment.Moment, t: TFunction): string => {
  const dayOfWeek = date.isoWeekday();
  return t(`calendar.DayOfWeek${dayOfWeek}`);
};

export const GetMonthName = (date: moment.Moment, t: TFunction): string => {
  const month = date.format('M');
  const year = date.format('YYYY');
  return `${t(`calendar.Month${month}`)} - ${year}`;
};

const GetGaussEasterSunday = (year: number): moment.Moment => {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const k = Math.floor(year / 100);
  const p = Math.floor((13 + 8 * k) / 25);
  const q = Math.floor(k / 4);
  const M = (15 - p + k - q) % 30;
  const N = (4 + k - q) % 7;
  const d = (19 * a + M) % 30;
  const e = (2 * b + 4 * c + 6 * d + N) % 7;
  const easterSunday = moment(`${year.toString()}-03-22`, 'YYYY-MM-DD');
  easterSunday.add(d + e, 'days');

  if (d === 29 && e === 6) {
    easterSunday.add(-7, 'days');
  }

  if (d === 28 && e === 6 && (11 * M + 11) % 30 < 19) {
    easterSunday.add(-7, 'days');
  }
  return easterSunday;
};

const GetHolidayName = (date: moment.Moment, t: TFunction): string | undefined => {
  if (!date) {
    return undefined;
  }

  const year = date.year();
  const mmddStr = date.format('MMDD');
  const dayOfWeek = date.isoWeekday();
  const easterSunday = GetGaussEasterSunday(year);

  if (mmddStr === '1224') {
    return 'Julafton';
  } else if (mmddStr === '1231') {
    return 'Nyårsafton';
  } else if (mmddStr === '0101') {
    return 'Nyårsdagen';
  } else if (mmddStr === '0106') {
    return 'Trettondagen';
  } else if (mmddStr === '0501') {
    return 'Första maj';
  } else if (mmddStr === '0606') {
    return 'Nationaldagen';
  } else if (mmddStr === '1225') {
    return 'Juldagen';
  } else if (mmddStr === '1226') {
    return 'Annandag jul';
  } else if (mmddStr === '1031') {
    return 'Halloween';
  } else if (mmddStr === '0214') {
    return 'Alla hjärtans dag';
  } else if (dayOfWeek === 5 && ['0619', '0620', '0621', '0622', '0623', '0624', '0625'].includes(mmddStr)) {
    return 'Midsommarafton';
  } else if (dayOfWeek === 6 && ['0620', '0621', '0622', '0623', '0624', '0625', '0626'].includes(mmddStr)) {
    return 'Midsommardagen';
  } else if (dayOfWeek === 6 && ['1031', '1101', '1102', '1103', '1104', '1105', '1106'].includes(mmddStr)) {
    return 'Alla helgons dag';
  } else if (date.diff(easterSunday, 'days') === -2) {
    return 'Långfredagen';
  } else if (date.diff(easterSunday, 'days') === -1) {
    return 'Påskafton';
  } else if (date.diff(easterSunday, 'days') === 0) {
    return 'Påskdagen';
  } else if (date.diff(easterSunday, 'days') === 1) {
    return 'Annandag påsk';
  } else if (date.diff(easterSunday, 'days') === 39) {
    return 'Kristi Himmelsfärdsdag';
  }
  return undefined;
};

const GetHolidayColor = (date: moment.Moment): 'grey' | 'red' | 'black' | undefined => {
  if (!date) {
    return undefined;
  }

  const year = date.year();
  const mmddStr = date.format('MMDD');
  const dayOfWeek = date.isoWeekday();
  const easterSunday = GetGaussEasterSunday(year);

  if (['1224', '1231'].includes(mmddStr)) {
    return 'grey';
  } else if (['0101', '0106', '0501', '0606', '1225', '1226'].includes(mmddStr)) {
    return 'red';
  } else if (dayOfWeek === 5 && ['0619', '0620', '0621', '0622', '0623', '0624', '0625'].includes(mmddStr)) {
    return 'red';
  } else if (dayOfWeek === 6 && ['0620', '0621', '0622', '0623', '0624', '0625', '0626'].includes(mmddStr)) {
    return 'red';
  } else if (dayOfWeek === 6 && ['1031', '1101', '1102', '1103', '1104', '1105', '1106'].includes(mmddStr)) {
    return 'red';
  } else if ([-2, 1, 39].includes(date.diff(easterSunday, 'days'))) {
    return 'red';
  } else if (dayOfWeek === 6) {
    return 'grey';
  } else if (dayOfWeek === 7) {
    return 'red';
  } else {
    return 'black';
  }
};

export const GetDates = (startDate: moment.Moment, numberOfDates: number, t: TFunction) => {
  const dates = [];

  for (let i = 0; i < numberOfDates; i++) {
    const date = startDate.clone().add(i, 'days');
    dates.push({
      date: date,
      dayOfWeek: GetDayOfWeek(date, t),
      color: GetHolidayColor(date),
      holidayName: GetHolidayName(date, t),
    });
  }
  return dates;
};
