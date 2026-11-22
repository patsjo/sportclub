import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from '../../utils/mobxStore';
import AlertBadge, { AlertLevel, IAlert } from '../badges/AlertBadge';

/** More days than this left to the first due date is blue, otherwise yellow */
export const DUE_SOON_DAYS = 5;

export type InvoicesBadgeStatus = 'overdue' | 'dueSoon' | 'unpaid';

const statusLevel: Record<InvoicesBadgeStatus, AlertLevel> = { overdue: 'error', dueSoon: 'warning', unpaid: 'info' };

/** Overdue (red), at most five days to the first due date (yellow), or more (blue) */
export const invoicesBadgeStatus = (
  overdue: number,
  nextDueDate: string | undefined,
  today = dayjs()
): InvoicesBadgeStatus => {
  if (overdue > 0) return 'overdue';
  if (!nextDueDate) return 'unpaid';
  const daysLeft = dayjs(nextDueDate).startOf('day').diff(today.startOf('day'), 'day');
  if (daysLeft < 0) return 'overdue';
  return daysLeft <= DUE_SOON_DAYS ? 'dueSoon' : 'unpaid';
};

/** The unpaid invoices of the logged in user, undefined when there are none (call it in an observer) */
export const useInvoicesAlert = (): IAlert | undefined => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const count = sessionModel.unpaidInvoices;
  if (!clubModel.invoice.url || !sessionModel.loggedIn || count <= 0) return undefined;
  return {
    count,
    level: statusLevel[invoicesBadgeStatus(sessionModel.overdueInvoices, sessionModel.nextInvoiceDueDate)],
    title: t('invoices.UnpaidBadge', { count })
  };
};

interface IInvoicesBadgeProps {
  /** The badge is put up to the right of the children, an icon or a text */
  children: ReactNode;
  offset?: [number, number];
}

/** The number of unpaid invoices of the logged in user, only the children when there are none */
const InvoicesBadge = observer(({ children, offset }: IInvoicesBadgeProps) => (
  <AlertBadge alert={useInvoicesAlert()} offset={offset}>
    {children}
  </AlertBadge>
));

export default InvoicesBadge;
