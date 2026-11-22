import { describe, expect, it } from 'vitest';
import { bankQr, paymentMessage, paymentQrs, swishMessage, swishQr } from './paymentQr';

const clubInfo = { name: 'OK Orion', organisationNumber: '835000-4209' };
const invoice = {
  invoiceId: 123,
  message: 'Täv.avg 2026, Patrik Sjökvist',
  invoiceDate: '2026-11-01',
  dueDate: '2026-12-01 00:00:00',
  amount: 150.5
};
const settings = { account: '916-0219', accountType: 'Bankgiro' as const, swishNumber: '123-198 58 37' };

describe('paymentMessage', () => {
  const template = 'Täv.avg {0}, {1}';
  const fees = {
    batchType: 'EVENT_FEES',
    message: 'Something else',
    recipientName: 'Patrik Sjökvist',
    invoiceDate: '2027-01-10',
    periodTo: '2026-12-31'
  };

  it('is the year of the period and the name for the event fees', () => {
    expect(paymentMessage(fees, template)).toBe('Täv.avg 2026, Patrik Sjökvist');
    expect(paymentMessage({ ...fees, periodTo: undefined }, template)).toBe('Täv.avg 2027, Patrik Sjökvist');
  });

  it('is the message of the invoice for other invoices', () => {
    expect(
      paymentMessage({ ...fees, batchType: 'GENERAL', message: 'Medlemsavgift 2026, Patrik Sjökvist' }, template)
    ).toBe('Medlemsavgift 2026, Patrik Sjökvist');
  });
});

describe('swishMessage', () => {
  it('keeps the characters Swish allows and at most 50', () => {
    expect(swishMessage('Faktura #12 & {x}   åäö')).toBe('Faktura 12 x åäö');
    expect(swishMessage('a'.repeat(60))).toHaveLength(50);
  });
});

describe('swishQr', () => {
  it('is the Swish payment link without editable fields', () => {
    const qr = swishQr('123-198 58 37', 150.5, 'Täv.avg 2026, Patrik Sjökvist');
    expect(qr.type).toBe('Swish');
    const url = new URL(qr.value);
    expect(url.origin + url.pathname).toBe('https://app.swish.nu/1/p/sw/');
    expect(url.searchParams.get('sw')).toBe('1231985837');
    expect(url.searchParams.get('amt')).toBe('150.5');
    expect(url.searchParams.get('cur')).toBe('SEK');
    expect(url.searchParams.get('msg')).toBe('Täv.avg 2026, Patrik Sjökvist');
    expect(url.searchParams.get('edit')).toBeNull();
    expect(qr.value).not.toContain('+');
  });
});

describe('bankQr', () => {
  it('is UsingQR JSON with the payment message as reference', () => {
    const qr = bankQr('Bankgiro', '916-0219', clubInfo, invoice);
    expect(qr.value).toMatch(/^[\x20-\x7e]+$/);
    expect(JSON.parse(qr.value)).toEqual({
      uqr: 1,
      tp: 1,
      nme: 'OK Orion',
      cc: 'SE',
      cid: '835000-4209',
      iref: 'Täv.avg 2026, Patrik Sjökvist',
      idt: '20261101',
      ddt: '20261201',
      due: 150.5,
      cur: 'SEK',
      pt: 'BG',
      acc: '916-0219'
    });
  });

  it('escapes non-ASCII and formats IBAN and PlusGirot', () => {
    const iban = bankQr(
      'IBAN',
      'se45 5000 0000 0583 9825 7466',
      { name: 'Värend GN', organisationNumber: '' },
      invoice
    );
    expect(iban.value).toContain('V\\u00e4rend');
    const parsed = JSON.parse(iban.value);
    expect(parsed.nme).toBe('Värend GN');
    expect(parsed.pt).toBe('IBAN');
    expect(parsed.acc).toBe('SE4550000000058398257466');
    expect(parsed.cid).toBeUndefined();
    expect(JSON.parse(bankQr('PlusGirot', '12 34 56-7', clubInfo, invoice).value).pt).toBe('PG');
  });
});

describe('paymentQrs', () => {
  it('has the bank account first and Swish only when the Swish payment is off', () => {
    expect(paymentQrs(settings, clubInfo, invoice, false).map(q => q.type)).toEqual(['Bankgiro', 'Swish']);
    expect(paymentQrs(settings, clubInfo, invoice, true).map(q => q.type)).toEqual(['Bankgiro']);
    expect(paymentQrs({ swishNumber: '1231985837' }, clubInfo, invoice, false).map(q => q.type)).toEqual(['Swish']);
    expect(paymentQrs({ accountType: 'Bankgiro' }, clubInfo, invoice, true)).toEqual([]);
  });

  it('has the invoice number as reference when there is no message', () => {
    expect(JSON.parse(bankQr('Bankgiro', '916-0219', clubInfo, { ...invoice, message: '' }).value).iref).toBe('123');
  });

  it('has nothing when less than 1 kr is left', () => {
    expect(paymentQrs(settings, clubInfo, { ...invoice, amount: 0.5 }, false)).toEqual([]);
  });
});
