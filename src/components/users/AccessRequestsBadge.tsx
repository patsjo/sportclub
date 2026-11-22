import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from '../../utils/mobxStore';
import AlertBadge, { AlertLevel, IAlert } from '../badges/AlertBadge';

/** Waited less than this is blue */
export const INFO_HOURS = 24;
/** Waited less than this is yellow, otherwise red */
export const WARNING_HOURS = 72;

/** By how long the oldest pending request has waited, blue without a date */
export const accessRequestsLevel = (oldestDate: string | undefined, now = dayjs()): AlertLevel => {
  if (!oldestDate) return 'info';
  const hours = now.diff(dayjs(oldestDate), 'hour', true);
  if (hours < INFO_HOURS) return 'info';
  return hours < WARNING_HOURS ? 'warning' : 'error';
};

/** The pending access requests for an administrator, undefined when there are none (call it in an observer) */
export const useAccessRequestsAlert = (): IAlert | undefined => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const count = sessionModel.pendingAccessRequests;
  // Handled under Users → Accounts, only there with an accounts url
  if (!sessionModel.isAdmin || !clubModel.socialLogin?.accountsUrl || count <= 0) return undefined;
  return {
    count,
    level: accessRequestsLevel(sessionModel.oldestAccessRequestDate),
    title: t('accounts.PendingBadge', { count })
  };
};

interface IAccessRequestsBadgeProps {
  /** The badge is put up to the right of the children, an icon or a text */
  children: ReactNode;
  offset?: [number, number];
  size?: 'default' | 'small';
}

/** The number of pending access requests, only the children when there are none */
const AccessRequestsBadge = observer(({ children, offset, size }: IAccessRequestsBadgeProps) => (
  <AlertBadge alert={useAccessRequestsAlert()} offset={offset} size={size}>
    {children}
  </AlertBadge>
));

export default AccessRequestsBadge;
