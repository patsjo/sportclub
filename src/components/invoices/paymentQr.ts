import { IClubInfoProps, IInvoiceProps } from '../../models/mobxClubModel';

/** The payment QR codes of an invoice that is paid manually (not with the Swish payment on the web page) */

export type PaymentQrType = NonNullable<IInvoiceProps['accountType']> | 'Swish';

export interface IPaymentQr {
  type: PaymentQrType;
  /** What is encoded in the QR code */
  value: string;
}

export interface IPaymentQrInvoice {
  invoiceId: number;
  /** The message of the payment, see paymentMessage */
  message: string;
  invoiceDate: string;
  dueDate: string;
  /** What is left to pay */
  amount: number;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

/** At most 2 decimals with a decimal point, e.g. 150 or 150.5 */
const formatAmount = (amount: number) => String(Math.round(amount * 100) / 100);

/** YYYY-MM-DD (or with a time) to YYYYMMDD */
const formatDate = (date: string) => digitsOnly(date.substring(0, 10));

/** The same characters and length as swishMessage in php/include/invoices.php */
export const swishMessage = (text: string) =>
  text
    .replace(/[^a-zA-Z0-9åäöÅÄÖ :;.,?!()"-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50)
    .trim();

/**
 * The message of the payment, the same as on the PDF. The event fees: the template (invoice.invoiceMessage, e.g.
 * "Täv.avg {0}, {1}") with the year of the period and the name of the recipient. Other invoices: the message of the
 * invoice ({namn} is already the name of the recipient).
 */
export const paymentMessage = (
  invoice: {
    batchType: string;
    message: string;
    recipientName: string;
    invoiceDate: string;
    periodTo?: string | null;
  },
  eventFeesTemplate: string
) =>
  invoice.batchType === 'EVENT_FEES'
    ? eventFeesTemplate
        .replaceAll('{0}', (invoice.periodTo || invoice.invoiceDate).substring(0, 4))
        .replaceAll('{1}', invoice.recipientName)
    : invoice.message;

/** Non-ASCII as \u escapes, the bank apps don't all read UTF-8 in the QR code */
const asciiJson = (value: object) =>
  JSON.stringify(value).replace(/[\u0080-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/** The Swish payment link, scanned in the Swish app or with the camera. Nothing is editable (no edit parameter). */
export const swishQr = (swishNumber: string, amount: number, message: string): IPaymentQr => {
  const params = new URLSearchParams({
    sw: digitsOnly(swishNumber),
    amt: formatAmount(amount),
    cur: 'SEK',
    msg: swishMessage(message),
    src: 'qr'
  });
  return { type: 'Swish', value: `https://app.swish.nu/1/p/sw/?${params.toString().replace(/\+/g, '%20')}` };
};

/**
 * The invoice QR code (UsingQR, JSON) the Swedish bank apps read when paying an invoice, with the message of the
 * payment as the reference (the invoice number when there is no message)
 */
export const bankQr = (
  accountType: NonNullable<IInvoiceProps['accountType']>,
  account: string,
  clubInfo: Pick<IClubInfoProps, 'name' | 'organisationNumber'>,
  invoice: IPaymentQrInvoice
): IPaymentQr => {
  const payload = {
    uqr: 1,
    tp: 1,
    nme: clubInfo.name,
    cc: 'SE',
    cid: clubInfo.organisationNumber || undefined,
    iref: swishMessage(invoice.message) || String(invoice.invoiceId),
    idt: formatDate(invoice.invoiceDate),
    ddt: formatDate(invoice.dueDate),
    due: Math.round(invoice.amount * 100) / 100,
    cur: 'SEK',
    pt: accountType === 'Bankgiro' ? 'BG' : accountType === 'PlusGirot' ? 'PG' : 'IBAN',
    acc: accountType === 'IBAN' ? account.replace(/\s/g, '').toUpperCase() : account.trim()
  };
  return { type: accountType, value: asciiJson(payload) };
};

/**
 * The QR codes to pay the invoice with, the bank account first (Bankgiro, PlusGirot or IBAN) and then Swish. Swish only
 * when the Swish payment on the web page isn't turned on. Nothing when less than 1 kr is left.
 */
export const paymentQrs = (
  settings: Pick<IInvoiceProps, 'account' | 'accountType' | 'swishNumber'>,
  clubInfo: Pick<IClubInfoProps, 'name' | 'organisationNumber'>,
  invoice: IPaymentQrInvoice,
  swishEnabled: boolean
): IPaymentQr[] => {
  if (invoice.amount < 1) return [];
  const qrs: IPaymentQr[] = [];
  if (settings.accountType && settings.account?.trim()) {
    qrs.push(bankQr(settings.accountType, settings.account, clubInfo, invoice));
  }
  if (!swishEnabled && settings.swishNumber && digitsOnly(settings.swishNumber).length > 0) {
    qrs.push(swishQr(settings.swishNumber, invoice.amount, invoice.message));
  }
  return qrs;
};
