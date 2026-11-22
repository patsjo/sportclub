import { ClockCircleOutlined } from '@ant-design/icons';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostJsonData } from '../../utils/api';
import { stopGoogleAutoLogin } from '../../utils/googleAutoLogin';
import { useMobxStore } from '../../utils/mobxStore';
import { getMenuItem } from '../menu/MenuItem';

const AccessRequestModal = lazy(() => import('./AccessRequestModal'));

export const useLoginMenuItem = () => {
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const loggedInOrGuest = sessionModel.loggedIn || sessionModel.isGuest;

  const onLogout = useCallback(() => {
    setLoggingOut(true);
    // Not logged in automatically with Google again, until the user logs in with Google
    stopGoogleAutoLogin();

    // The server deletes the token
    PostJsonData(clubModel.logoutUrl, {}, true, sessionModel.authorizationHeader, 1)
      .catch(() => undefined)
      .finally(() => {
        sessionModel.setLogout();
        setLoggingOut(false);
      });
  }, [clubModel, sessionModel]);

  const onLoginOrLogout = useCallback(() => {
    if (sessionModel.loggedIn || sessionModel.isGuest) {
      onLogout();
      return;
    }
    globalStateModel.setLoginModalVisible(true);
  }, [globalStateModel, onLogout, sessionModel]);

  const loginText = !loggedInOrGuest
    ? t('common.Login')
    : `${t('common.Logout')} ${sessionModel.name ?? ''}${sessionModel.isGuest ? ` (${t('login.Guest')})` : ''}`;

  return {
    loginMenuItem: getMenuItem(
      'menuItem#login',
      loggedInOrGuest ? 'LogoutIcon' : 'LoginIcon',
      loginText,
      onLoginOrLogout,
      // Logout is under "My pages"
      loggedInOrGuest,
      1,
      loggingOut
    ),
    // Guests can ask to become users, and users to get into groups. While a request waits for an answer the
    // menu only tells about it (disabled, leads nowhere).
    accessRequestMenuItem: !(clubModel.socialLogin?.accountsUrl && loggedInOrGuest)
      ? null
      : sessionModel.myPendingAccessRequests > 0
        ? getMenuItem(
            'menuItem#accessRequest',
            <ClockCircleOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />,
            <span title={t('login.PendingRequestInfo')}>
              {sessionModel.isGuest
                ? t('login.PendingMembership')
                : t('login.PendingAccess', { count: sessionModel.myPendingAccessRequests })}
            </span>,
            () => undefined,
            true,
            1,
            true
          )
        : getMenuItem(
            'menuItem#accessRequest',
            'user',
            sessionModel.isGuest ? t('login.RequestMembership') : t('login.RequestAccess'),
            () => setShowAccessRequest(true),
            true
          ),
    loginForm: showAccessRequest ? (
      <Suspense fallback={null}>
        <AccessRequestModal open={showAccessRequest} onClose={() => setShowAccessRequest(false)} />
      </Suspense>
    ) : null
  };
};
