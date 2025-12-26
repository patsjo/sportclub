import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GetJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { getMenuItem } from '../menu/MenuItem';
import LoginForm from './LoginForm';

export const useLoginMenuItem = () => {
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = useCallback(() => {
    setLoggingOut(true);

    GetJsonData(clubModel.logoutUrl)
      .then(() => {
        sessionModel.setLogout();
        setLoggingOut(false);
      })
      .catch(() => {
        sessionModel.setLogout();
        setLoggingOut(false);
      });
  }, [clubModel, sessionModel]);

  const openModal = useCallback(() => {
    if (sessionModel.loggedIn) {
      onLogout();
      return;
    }
    globalStateModel.setRightMenuVisible(false);
    setShowLoginModal(true);
  }, [globalStateModel, onLogout, sessionModel.loggedIn]);

  const closeModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  return {
    loginMenuItem: getMenuItem(
      'menuItem#login',
      sessionModel.loggedIn ? 'LogoutIcon' : 'LoginIcon',
      sessionModel.loggedIn ? t('common.Logout') + ' ' + sessionModel.name : t('common.Login'),
      openModal
    ),
    loginForm: <LoginForm open={showLoginModal && !loggingOut} onClose={closeModal} />
  };
};
