import { observer } from 'mobx-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import { GetJsonData } from '../../utils/api';
import MenuItem from '../menu/MenuItem';
import LoginForm from './LoginForm';

const LoginMenuItem = observer(() => {
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const openModal = useCallback(() => {
    if (sessionModel.loggedIn) {
      onLogout();
      return;
    }
    globalStateModel.setRightMenuVisible(false);
    setShowLoginModal(true);
  }, [sessionModel]);

  const closeModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

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

  return (
    <>
      <MenuItem
        key={'menuItem#login'}
        icon={sessionModel.loggedIn ? 'LogoutIcon' : 'LoginIcon'}
        name={sessionModel.loggedIn ? t('common.Logout') + ' ' + sessionModel.name : t('common.Login')}
        onClick={openModal}
      />
      <LoginForm open={showLoginModal && !loggingOut} onClose={closeModal} />
    </>
  );
});

export default LoginMenuItem;
