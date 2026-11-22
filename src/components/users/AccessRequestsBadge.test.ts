import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { combineAlerts } from '../badges/AlertBadge';
import { accessRequestsLevel } from './AccessRequestsBadge';

const now = dayjs('2026-11-22T12:00:00');

describe('accessRequestsLevel', () => {
  it('is blue within 24 hours, or without a date', () => {
    expect(accessRequestsLevel('2026-11-22 11:00:00', now)).toBe('info');
    expect(accessRequestsLevel('2026-11-21 12:00:01', now)).toBe('info');
    expect(accessRequestsLevel(undefined, now)).toBe('info');
  });

  it('is yellow within 72 hours', () => {
    expect(accessRequestsLevel('2026-11-21 12:00:00', now)).toBe('warning');
    expect(accessRequestsLevel('2026-11-19 12:00:01', now)).toBe('warning');
  });

  it('is red after 72 hours', () => {
    expect(accessRequestsLevel('2026-11-19 12:00:00', now)).toBe('error');
    expect(accessRequestsLevel('2026-10-01 08:00:00', now)).toBe('error');
  });
});

describe('combineAlerts', () => {
  it('sums the counts in the strongest colour', () => {
    expect(
      combineAlerts([
        { count: 2, level: 'warning', title: '2 unpaid invoices' },
        { count: 1, level: 'info', title: '1 pending request' }
      ])
    ).toEqual({ count: 3, level: 'warning', title: '2 unpaid invoices, 1 pending request' });
    expect(
      combineAlerts([
        { count: 1, level: 'warning', title: 'a' },
        { count: 1, level: 'error', title: 'b' }
      ])?.level
    ).toBe('error');
  });

  it('is undefined without anything waiting', () => {
    expect(combineAlerts([undefined, undefined])).toBeUndefined();
    expect(combineAlerts([{ count: 0, level: 'error', title: 'none' }])).toBeUndefined();
  });

  it('keeps a single alert as it is', () => {
    expect(combineAlerts([undefined, { count: 4, level: 'info', title: 'x' }])).toEqual({
      count: 4,
      level: 'info',
      title: 'x'
    });
  });
});
