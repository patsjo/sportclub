import dayjs from 'dayjs';
import { TFunction } from 'i18next';

const GetDayOfWeek = (date: dayjs.Dayjs, t: TFunction): string => {
  const dayOfWeek = date.isoWeekday();
  return t(`calendar.DayOfWeek${dayOfWeek}`);
};

export const GetMonthName = (date: dayjs.Dayjs, t: TFunction): string => {
  const month = date.format('M');
  const year = date.format('YYYY');
  return `${t(`calendar.Month${month}`)} - ${year}`;
};

const GetGaussEasterSunday = (year: number): dayjs.Dayjs => {
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
  const easterSunday = dayjs(`${year.toString()}-03-22`, 'YYYY-MM-DD');
  easterSunday.add(d + e, 'days');

  if (d === 29 && e === 6) {
    easterSunday.add(-7, 'days');
  }

  if (d === 28 && e === 6 && (11 * M + 11) % 30 < 19) {
    easterSunday.add(-7, 'days');
  }
  return easterSunday;
};

const GetHolidayName = (date: dayjs.Dayjs, t: TFunction): string | undefined => {
  if (!date) {
    return undefined;
  }

  const year = date.year();
  const mmddStr = date.format('MMDD');
  const dayOfWeek = date.isoWeekday();
  const easterSunday = GetGaussEasterSunday(year);

  if (mmddStr === '1224') {
    return t('holidays.christmasEve');
  } else if (mmddStr === '1231') {
    return t('holidays.newYearsEve');
  } else if (mmddStr === '0101') {
    return t('holidays.newYearsDay');
  } else if (mmddStr === '0106') {
    return t('holidays.epiphany');
  } else if (mmddStr === '0501') {
    return t('holidays.mayDay');
  } else if (mmddStr === '0606') {
    return t('holidays.nationalDay');
  } else if (mmddStr === '1225') {
    return t('holidays.christmasDay');
  } else if (mmddStr === '1226') {
    return t('holidays.boxingDay');
  } else if (mmddStr === '1031') {
    return t('holidays.halloween');
  } else if (mmddStr === '0214') {
    return t('holidays.valentinesDay');
  } else if (dayOfWeek === 5 && ['0619', '0620', '0621', '0622', '0623', '0624', '0625'].includes(mmddStr)) {
    return t('holidays.midsummerEve');
  } else if (dayOfWeek === 6 && ['0620', '0621', '0622', '0623', '0624', '0625', '0626'].includes(mmddStr)) {
    return t('holidays.midsummerDay');
  } else if (dayOfWeek === 6 && ['1031', '1101', '1102', '1103', '1104', '1105', '1106'].includes(mmddStr)) {
    return t('holidays.allSaintsDay');
  } else if (date.diff(easterSunday, 'days') === -2) {
    return t('holidays.goodFriday');
  } else if (date.diff(easterSunday, 'days') === -1) {
    return t('holidays.easterEve');
  } else if (date.diff(easterSunday, 'days') === 0) {
    return t('holidays.easterSunday');
  } else if (date.diff(easterSunday, 'days') === 1) {
    return t('holidays.easterMonday');
  } else if (date.diff(easterSunday, 'days') === 39) {
    return t('holidays.ascensionDay');
  }
  return undefined;
};

const GetHolidayColor = (date: dayjs.Dayjs): 'grey' | 'red' | 'black' | undefined => {
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

interface IDate {
  date: dayjs.Dayjs;
  dayOfWeek: string;
  color: 'grey' | 'red' | 'black' | undefined;
  holidayName?: string;
}

export const GetDates = (startDate: dayjs.Dayjs, numberOfDates: number, t: TFunction) => {
  const dates: IDate[] = [];

  for (let i = 0; i < numberOfDates; i++) {
    const date = startDate.clone().add(i, 'days');
    dates.push({
      date: date,
      dayOfWeek: GetDayOfWeek(date, t),
      color: GetHolidayColor(date),
      holidayName: GetHolidayName(date, t)
    });
  }
  return dates;
};
