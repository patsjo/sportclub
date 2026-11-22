import { Badge, theme } from 'antd';
import { ReactNode } from 'react';

/** The standard colours of the theme, error is the strongest */
export type AlertLevel = 'info' | 'warning' | 'error';

const levelOrder: Record<AlertLevel, number> = { info: 0, warning: 1, error: 2 };

/** Something waiting for the user, shown as a badge */
export interface IAlert {
  count: number;
  level: AlertLevel;
  /** The tooltip */
  title: string;
}

/** The sum of the counts in the strongest colour, undefined when there is nothing */
export const combineAlerts = (alerts: (IAlert | undefined)[]): IAlert | undefined => {
  const active = alerts.filter((alert): alert is IAlert => !!alert && alert.count > 0);
  if (active.length === 0) return undefined;
  return {
    count: active.reduce((sum, alert) => sum + alert.count, 0),
    level: active.reduce<AlertLevel>(
      (level, alert) => (levelOrder[alert.level] > levelOrder[level] ? alert.level : level),
      'info'
    ),
    title: active.map(alert => alert.title).join(', ')
  };
};

interface IAlertBadgeProps {
  alert?: IAlert;
  /** The badge is put up to the right of the children, an icon or a text */
  children: ReactNode;
  offset?: [number, number];
  size?: 'default' | 'small';
}

/** Only the children when there is no alert */
const AlertBadge = ({ alert, children, offset, size }: IAlertBadgeProps) => {
  const { token } = theme.useToken();
  const colors: Record<AlertLevel, string> = {
    error: token.colorError,
    warning: token.colorWarning,
    info: token.colorInfo
  };

  if (!alert || alert.count <= 0) return <>{children}</>;

  return (
    <Badge
      count={alert.count}
      offset={offset}
      size={size}
      title={alert.title}
      // The children keep their own colour and font (antd sets the text colour on the badge)
      styles={{
        root: { color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' },
        indicator: { backgroundColor: colors[alert.level], color: token.colorTextLightSolid, boxShadow: 'none' }
      }}
    >
      {children}
    </Badge>
  );
};

export default AlertBadge;
