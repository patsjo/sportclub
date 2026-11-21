import { Badge, theme } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from '../../utils/mobxStore';

/** More days than this left to the first due date is blue, otherwise yellow */
export const DUE_SOON_DAYS = 5;

export type InvoicesBadgeStatus = 'overdue' | 'dueSoon' | 'unpaid';

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

interface IInvoicesBadgeProps {
  /** The badge is put up to the right of the children, an icon or a text */
  children: ReactNode;
  offset?: [number, number];
}

/** The number of unpaid invoices of the logged in user, only the children when there are none */
const InvoicesBadge = observer(({ children, offset }: IInvoicesBadgeProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const { token } = theme.useToken();
  const count = sessionModel.unpaidInvoices;
  // The standard colours of the theme
  const badgeColors: Record<InvoicesBadgeStatus, string> = {
    overdue: token.colorError,
    dueSoon: token.colorWarning,
    unpaid: token.colorInfo
  };

  if (!clubModel.invoice.url || !sessionModel.loggedIn || count <= 0) return <>{children}</>;

  const status = invoicesBadgeStatus(sessionModel.overdueInvoices, sessionModel.nextInvoiceDueDate);
  return (
    <Badge
      count={count}
      offset={offset}
      title={t('invoices.UnpaidBadge', { count })}
      // The children keep their own colour and font (antd sets the text colour on the badge)
      styles={{
        root: { color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' },
        indicator: { backgroundColor: badgeColors[status], color: token.colorTextLightSolid, boxShadow: 'none' }
      }}
    >
      {children}
    </Badge>
  );
});

export default InvoicesBadge;
