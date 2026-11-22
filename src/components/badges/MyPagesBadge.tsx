import { observer } from 'mobx-react';
import { ReactNode } from 'react';
import { useInvoicesAlert } from '../invoices/InvoicesBadge';
import { useAccessRequestsAlert } from '../users/AccessRequestsBadge';
import AlertBadge, { combineAlerts } from './AlertBadge';

interface IMyPagesBadgeProps {
  /** The badge is put up to the right of the children, an icon or a text */
  children: ReactNode;
  offset?: [number, number];
}

/** Everything under "My pages" that waits for the user: the sum, in the strongest colour */
const MyPagesBadge = observer(({ children, offset }: IMyPagesBadgeProps) => {
  const invoices = useInvoicesAlert();
  const accessRequests = useAccessRequestsAlert();
  return (
    <AlertBadge alert={combineAlerts([invoices, accessRequests])} offset={offset}>
      {children}
    </AlertBadge>
  );
});

export default MyPagesBadge;
