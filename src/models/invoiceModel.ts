/** Invoices paid with Swish, see php/invoices/invoices.php */

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'OVERPAID' | 'CANCELLED' | 'REFUNDED';
export type InvoiceBatchType = 'GENERAL' | 'EVENT_FEES';
export type SwishPaymentStatus = 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR' | 'CANCELLED';

export interface IInvoiceRow {
  description: string;
  numberOf: number;
  /** The total price, e.g. the entry fee */
  totalFee: number;
  /** What the recipient pays */
  amount: number;
}

export interface IInvoice {
  invoiceId: number;
  batchId: number;
  batchType: InvoiceBatchType;
  title: string;
  message: string;
  recipientName: string;
  userId: number | null;
  competitorId: number | null;
  familyId: number | null;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  invoiceFee: number;
  /** amount + invoiceFee */
  total: number;
  status: InvoiceStatus;
  paidAmount: number;
  paidDate: string | null;
  reminders: number;
  lastReminderDate: string | null;
  /** Unpaid after the due date */
  isOverdue: boolean;
  /** The number of email addresses a reminder is sent to, no reminder without any */
  reminderEmails: number;
  rows: IInvoiceRow[];
}

export interface IInvoiceBatch {
  batchId: number;
  batchType: InvoiceBatchType;
  title: string;
  messageTemplate: string;
  invoiceDate: string;
  dueDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  creDate: string;
  createdBy: string;
  invoices: IInvoice[];
}

export interface IMyInvoicesResponse {
  swishEnabled: boolean;
  invoices: IInvoice[];
  unpaidInvoices: number;
  overdueInvoices: number;
  /** The first due date of the unpaid invoices, missing from an older server */
  nextInvoiceDueDate?: string | null;
}

export interface IInvoiceOverviewResponse {
  /** Only the economy responsible verifies (paid, cancelled), reminds and deletes */
  canVerify: boolean;
  swishEnabled: boolean;
  batches: IInvoiceBatch[];
}

export interface IInvoiceHistory {
  oldStatus: InvoiceStatus | null;
  newStatus: InvoiceStatus;
  oldPaidAmount: number | null;
  newPaidAmount: number;
  comment: string | null;
  swishPaymentId: string | null;
  /** null = Swish */
  changedBy: string | null;
  /** The date of the payment, refund or cancellation (YYYY-MM-DD) */
  eventDate: string;
  /** When it was registered */
  creDate: string;
}

export interface ISwishPayment {
  paymentId: string;
  amount: number;
  status: SwishPaymentStatus;
  paymentReference: string | null;
  payerAlias: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  creDate: string;
  datePaid: string | null;
  startedBy: string;
}

export interface IInvoiceHistoryResponse {
  history: IInvoiceHistory[];
  payments: ISwishPayment[];
}

export interface IInvoiceRecipientUser {
  userId: number;
  name: string;
  email: string | null;
  competitorId: number | null;
  familyId: number | null;
}

export interface IInvoiceRecipientFamily {
  familyId: number;
  familyName: string;
  /** The competitors in the family */
  members: string;
}

/** A competitor in a family, the linked users (IInvoiceRecipientUser.competitorId) and the whole family see the invoice */
export interface IInvoiceRecipientCompetitor {
  competitorId: number;
  name: string;
  familyId: number;
}

export interface IInvoiceRecipientsResponse {
  users: IInvoiceRecipientUser[];
  families: IInvoiceRecipientFamily[];
  familyCompetitors: IInvoiceRecipientCompetitor[];
}

export interface IEventFeePeriod {
  batchId: number;
  title: string;
  periodFrom: string;
  periodTo: string;
}

/** One invoice to create, exactly one of userId, competitorId and familyId */
export interface ICreateInvoiceRecipient {
  key: string;
  userId?: number;
  competitorId?: number;
  familyId?: number;
  name: string;
  amount: number;
  rows?: IInvoiceRow[];
}

export interface ICreateInvoicesRequest {
  iType: 'CREATE';
  batchType: InvoiceBatchType;
  title: string;
  messageTemplate: string;
  dueDate: string;
  invoiceFee: number;
  periodFrom?: string;
  periodTo?: string;
  recipients: Omit<ICreateInvoiceRecipient, 'key' | 'name'>[];
}

export interface ISwishStartResponse {
  paymentId: string;
  amount: number;
  token: string | null;
  /** data url (svg) */
  qrCode: string | null;
}

export interface ISwishStatusResponse {
  paymentId: string;
  status: SwishPaymentStatus;
  amount: number;
  errorCode: string | null;
  errorMessage: string | null;
  invoiceStatus: InvoiceStatus;
}

export interface IReminderResponse {
  reminders: { invoiceId: number; recipientName: string; sentTo: string[] }[];
  invoices: IInvoice[];
}

/** Replaces {namn} or {name} with the name of the recipient, the same as the server */
export const invoiceMessage = (template: string, name: string) =>
  template.replace(/\{(namn|name|NAMN|NAME)\}/g, name).substring(0, 128);

/** The message is cut to 50 characters in Swish */
export const SWISH_MESSAGE_MAX_LENGTH = 50;
