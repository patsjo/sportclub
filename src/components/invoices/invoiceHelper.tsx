import { Tag } from 'antd';
import { TFunction } from 'i18next';
import { IInvoice, InvoiceStatus } from '../../models/invoiceModel';

const moneyFormatter = new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' });
// The non-breaking spaces from Intl (U+00A0 and U+202F) as normal spaces
const nonBreakingSpaces = new RegExp('[\\u00A0\\u202F]', 'g');

/** e.g. "103,00 kr" */
export const formatMoney = (value: number) => moneyFormatter.format(value).replace(nonBreakingSpaces, ' ');

/** What is left to pay, 0 when paid or cancelled */
export const invoiceLeft = (invoice: IInvoice) =>
  invoice.status === 'UNPAID' ? Math.max(0, Math.round((invoice.total - invoice.paidAmount) * 100) / 100) : 0;

/** Unpaid, but a part is paid (the status is still UNPAID in the database) */
export const isPartlyPaid = (invoice: IInvoice) => invoice.status === 'UNPAID' && invoice.paidAmount > 0;

export type InvoiceFilterStatus = InvoiceStatus | 'OVERDUE' | 'PARTLY_PAID';

const statusColors: Record<InvoiceFilterStatus, string> = {
  UNPAID: 'gold',
  PARTLY_PAID: 'orange',
  OVERDUE: 'red',
  PAID: 'green',
  OVERPAID: 'blue',
  CANCELLED: 'default',
  REFUNDED: 'magenta'
};

/** The statuses shown, e.g. overdue and partly paid */
export const invoiceDisplayStatuses = (invoice: IInvoice): InvoiceFilterStatus[] => {
  if (invoice.status !== 'UNPAID') return [invoice.status];
  const statuses: InvoiceFilterStatus[] = [];
  if (invoice.isOverdue) statuses.push('OVERDUE');
  if (isPartlyPaid(invoice)) statuses.push('PARTLY_PAID');
  return statuses.length > 0 ? statuses : ['UNPAID'];
};

/** Unpaid matches all unpaid invoices, also the overdue and partly paid */
export const invoiceMatchesStatus = (invoice: IInvoice, filter: InvoiceFilterStatus[]) =>
  filter.length === 0 ||
  filter.some(status =>
    status === 'UNPAID' ? invoice.status === 'UNPAID' : invoiceDisplayStatuses(invoice).includes(status)
  );

/** The status, and for a partly paid invoice what is paid and what is left */
export const InvoiceStatusTag = ({ invoice, t }: { invoice: IInvoice; t: TFunction }) => (
  <>
    {invoiceDisplayStatuses(invoice).map(status => (
      <Tag key={status} color={statusColors[status]}>
        {t(`invoices.Status${status}`)}
      </Tag>
    ))}
    {isPartlyPaid(invoice) ? (
      <div style={{ fontSize: 12, marginTop: 2, whiteSpace: 'nowrap' }}>
        {t('invoices.PartlyPaidInfo', {
          paid: formatMoney(invoice.paidAmount),
          left: formatMoney(invoiceLeft(invoice))
        })}
      </div>
    ) : null}
  </>
);

export const invoiceStatusOptions = (t: TFunction): { value: InvoiceFilterStatus; label: string }[] =>
  (['UNPAID', 'PARTLY_PAID', 'OVERDUE', 'PAID', 'OVERPAID', 'REFUNDED', 'CANCELLED'] as InvoiceFilterStatus[]).map(
    status => ({
      value: status,
      label: t(`invoices.Status${status}`)
    })
  );

/** Cancelled and refunded invoices are owed nothing */
export const isClosed = (invoice: IInvoice) => invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED';

/** A status the economy responsible changes to, partly paid is unpaid with a paid amount */
export type InvoiceChangeStatus = InvoiceStatus | 'PARTLY_PAID';

export const invoiceChangeStatuses: InvoiceChangeStatus[] = [
  'PAID',
  'PARTLY_PAID',
  'OVERPAID',
  'REFUNDED',
  'CANCELLED',
  'UNPAID'
];

/** The status now, partly paid instead of unpaid when something is paid */
export const invoiceCurrentStatus = (invoice: IInvoice): InvoiceChangeStatus =>
  isPartlyPaid(invoice) ? 'PARTLY_PAID' : invoice.status;

/**
 * The statuses the invoice can change to, the same as invoiceAllowedStatuses in php/invoices/invoices.php.
 * Not the same status again, except a new partial payment or refund. Cancelled only when nothing is paid,
 * otherwise it is refunded.
 */
export const allowedStatuses = (invoice: IInvoice): InvoiceChangeStatus[] => {
  switch (invoiceCurrentStatus(invoice)) {
    case 'UNPAID':
      return ['PAID', 'PARTLY_PAID', 'OVERPAID', 'CANCELLED'];
    case 'PARTLY_PAID':
      return ['PAID', 'PARTLY_PAID', 'OVERPAID', 'REFUNDED', 'UNPAID'];
    case 'PAID':
      return ['OVERPAID', 'REFUNDED', 'UNPAID'];
    case 'OVERPAID':
      return ['PAID', 'REFUNDED', 'UNPAID'];
    default:
      // Cancelled or refunded, something still paid can be refunded
      return invoice.paidAmount > 0 ? ['REFUNDED', 'UNPAID'] : ['UNPAID'];
  }
};

/** Rounded to öre */
export const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** The text of an error from PostJsonData */
export const errorText = (e: unknown) =>
  (e as { message?: string } | undefined)?.message ?? (e != null ? String(e) : 'Unknown error');
