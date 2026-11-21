import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { invoicesBadgeStatus } from './InvoicesBadge';

const today = dayjs('2026-11-21T15:30:00');

describe('invoicesBadgeStatus', () => {
  it('is red when an invoice is overdue', () => {
    expect(invoicesBadgeStatus(1, '2026-12-31', today)).toBe('overdue');
    expect(invoicesBadgeStatus(0, '2026-11-20', today)).toBe('overdue');
  });

  it('is yellow at most five days to the due date', () => {
    expect(invoicesBadgeStatus(0, '2026-11-21', today)).toBe('dueSoon');
    expect(invoicesBadgeStatus(0, '2026-11-26', today)).toBe('dueSoon');
  });

  it('is blue more than five days to the due date, or without a due date', () => {
    expect(invoicesBadgeStatus(0, '2026-11-27', today)).toBe('unpaid');
    expect(invoicesBadgeStatus(0, undefined, today)).toBe('unpaid');
  });
});
