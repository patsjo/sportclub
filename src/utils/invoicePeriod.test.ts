import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { isEventFeePeriodValid, suggestEventFeePeriod } from './invoicePeriod';

const period = (periodFrom: string, periodTo: string) => ({ batchId: 1, title: '', periodFrom, periodTo });
const day = (date: string) => dayjs(date);
const fmt = (date: dayjs.Dayjs) => date.format('YYYY-MM-DD');

describe('suggestEventFeePeriod', () => {
  it('suggests the last season without invoiced periods', () => {
    const s = suggestEventFeePeriod([], '1031', day('2026-11-17'));
    expect(fmt(s.from)).toBe('2025-11-01');
    expect(fmt(s.to)).toBe('2026-10-31');
    expect(fmt(s.maxTo)).toBe('2026-11-15');
    expect(s.fixedFrom).toBeUndefined();
    expect(s.empty).toBe(false);
  });

  it('starts the day after the last invoiced period and ends on the next break date', () => {
    const s = suggestEventFeePeriod(
      [period('2024-11-01', '2025-10-31'), period('2023-11-01', '2024-10-31')],
      '1031',
      day('2026-11-17')
    );
    expect(fmt(s.from)).toBe('2025-11-01');
    expect(fmt(s.fixedFrom!)).toBe('2025-11-01');
    expect(fmt(s.to)).toBe('2026-10-31');
  });

  it('ends two days ago when the season is not over', () => {
    const s = suggestEventFeePeriod([period('2025-11-01', '2026-03-31')], '1031', day('2026-06-10'));
    expect(fmt(s.from)).toBe('2026-04-01');
    expect(fmt(s.to)).toBe('2026-06-08');
  });

  it('is empty when the last period ends yesterday', () => {
    const s = suggestEventFeePeriod([period('2026-01-01', '2026-06-09')], '1031', day('2026-06-10'));
    expect(s.empty).toBe(true);
  });
});

describe('isEventFeePeriodValid', () => {
  const s = suggestEventFeePeriod([period('2024-11-01', '2025-10-31')], '1031', day('2026-11-17'));

  it('allows the suggested period', () => expect(isEventFeePeriodValid(s, s.from, s.to)).toBe(true));
  it('allows an earlier end', () => expect(isEventFeePeriodValid(s, s.from, day('2026-05-31'))).toBe(true));
  it('stops an overlap', () => expect(isEventFeePeriodValid(s, day('2025-10-31'), s.to)).toBe(false));
  it('stops a gap', () => expect(isEventFeePeriodValid(s, day('2025-11-02'), s.to)).toBe(false));
  it('stops yesterday', () => expect(isEventFeePeriodValid(s, s.from, day('2026-11-16'))).toBe(false));
  it('allows two days ago', () => expect(isEventFeePeriodValid(s, s.from, day('2026-11-15'))).toBe(true));
});
