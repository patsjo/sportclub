import dayjs, { Dayjs } from 'dayjs';
import { IEventFeePeriod } from '../models/invoiceModel';

/** The period must have ended at least two days ago (not today, not yesterday) */
export const lastAllowedPeriodEnd = (today: Dayjs) => today.startOf('day').add(-2, 'days');

export interface IEventFeePeriodSuggestion {
  from: Dayjs;
  to: Dayjs;
  /** The day after the last invoiced period, the start can't be changed (no overlap or gap) */
  fixedFrom?: Dayjs;
  maxTo: Dayjs;
  /** Nothing to invoice yet, the last invoiced period ends too late */
  empty: boolean;
}

/** The next break date (MMDD, e.g. "1031") on or after the date */
const nextBreakDate = (date: Dayjs, breakMonthDay: string) => {
  const sameYear = dayjs(`${date.format('YYYY')}${breakMonthDay}`, 'YYYYMMDD');
  return sameYear.isBefore(date, 'day') ? sameYear.add(1, 'year') : sameYear;
};

/**
 * The next period of event fees to invoice. It starts the day after the last invoiced period, and ends on the next
 * break date (the end of the season), at the latest two days ago. Without invoiced periods it is the last season.
 */
export const suggestEventFeePeriod = (
  periods: IEventFeePeriod[],
  breakMonthDay: string,
  today: Dayjs = dayjs()
): IEventFeePeriodSuggestion => {
  const maxTo = lastAllowedPeriodEnd(today);
  const lastTo = periods
    .map(p => dayjs(p.periodTo))
    .sort((a, b) => a.valueOf() - b.valueOf())
    .pop();

  if (lastTo) {
    const from = lastTo.add(1, 'day');
    const breakDate = nextBreakDate(from, breakMonthDay);
    const to = breakDate.isAfter(maxTo, 'day') ? maxTo : breakDate;
    return { from, to, fixedFrom: from, maxTo, empty: from.isAfter(maxTo, 'day') };
  }

  const seasonEnd = dayjs(`${today.add(-6, 'months').format('YYYY')}${breakMonthDay}`, 'YYYYMMDD');
  const to = seasonEnd.isAfter(maxTo, 'day') ? maxTo : seasonEnd;
  return { from: seasonEnd.add(-1, 'year').add(1, 'day'), to, maxTo, empty: false };
};

/** The period can be invoiced (the same check as the server), the start is only a warning (eventFeePeriodStartWarning) */
export const isEventFeePeriodValid = (suggestion: IEventFeePeriodSuggestion, from: Dayjs, to: Dayjs) =>
  !from.isAfter(to, 'day') && !to.isAfter(suggestion.maxTo, 'day');

/** The start isn't the day after the last invoiced period: an overlap (fees invoiced twice) or a gap (fees not invoiced) */
export const eventFeePeriodStartWarning = (
  suggestion: IEventFeePeriodSuggestion,
  from: Dayjs
): 'OVERLAP' | 'GAP' | undefined =>
  !suggestion.fixedFrom || from.isSame(suggestion.fixedFrom, 'day')
    ? undefined
    : from.isBefore(suggestion.fixedFrom, 'day')
      ? 'OVERLAP'
      : 'GAP';
