import { Drawer, Form, Menu, Spin } from 'antd';
import { observer } from 'mobx-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { DefaultMenuPath } from '../htmlEditor/HtmlEditor';
import { HtmlEditorLinkModal } from '../htmlEditor/HtmlEditorLinkModal';
import { getHtmlEditorMenus } from '../htmlEditor/HtmlEditorMenus';
import LoginMenuItem from '../login/LoginMenuItem';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';
import MenuItem from './MenuItem';
import ModuleSubMenu from './moduleSubMenus/ModuleSubMenu';

const StyledDrawer = styled(Drawer)`
  &&& {
    top: 64px;
    height: calc(100% - 64px);
  }
`;

const StyledMenu = styled(Menu)`
  &&&.ant-menu-inline {
    border-right: 0px;
  }
`;

const StyledSubMenu = styled(Menu.SubMenu)`
  &&& {
    line-height: 22px;
    padding: 0;
  }
  &&& .ant-menu-submenu-title {
    line-height: 22px;
    height: 22px;
    padding: 0 !important;
  }
`;

const DrawerRightMenu = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const [htmEditorLinkform] = Form.useForm();
  const history = useHistory();

  return (
    <StyledDrawer
      title={t('common.Menu')}
      placement="right"
      closable={false}
      width={360}
      visible={globalStateModel.rightMenuVisible}
      onClose={() => globalStateModel.setRightMenuVisible(false)}
    >
      <StyledMenu mode="inline" onClick={() => globalStateModel.setRightMenuVisible(false)}>
        <MenuItem
          key={'menuItem#home0'}
          icon={'HomeIcon'}
          name={t('modules.Home')}
          onClick={() => {
            globalStateModel.setDashboard(history, '/');
          }}
        />
        <LoginMenuItem />
        <Menu.Divider />
        {clubModel.modules
          .filter((module) => module.name !== 'HTMLEditor')
          .map((module, index) =>
            module.hasSubMenus ? (
              <StyledSubMenu
                key={'subMenu#' + module.name + index}
                title={
                  <span>
                    <MaterialIcon icon={(module.name + 'Icon') as MaterialIconsType} fontSize={18} marginRight={10} />
                    <span>{t('modules.' + module.name)}</span>
                  </span>
                }
                disabled={
                  module.name !== 'Calendar' &&
                  module.name !== 'News' &&
                  module.name !== 'Eventor' &&
                  module.name !== 'Results'
                }
              >
                <ModuleSubMenu module={module} />
              </StyledSubMenu>
            ) : (
              <ModuleSubMenu module={module} />
            )
          )}
        <Menu.Divider />
        {clubModel.modules.some((module) => module.name === 'HTMLEditor') ? (
          <>
            {globalStateModel.htmlEditorMenu ? (
              getHtmlEditorMenus(
                globalStateModel.htmlEditorMenu,
                (path: string) => globalStateModel.setHtmlEditor(history, path),
                '',
                htmEditorLinkform,
                t,
                globalStateModel,
                sessionModel,
                clubModel
              )
            ) : (
              <Spin size="small" />
            )}{' '}
            <MenuItem
              key={'menuItem#htmlEditor'}
              icon={'edit'}
              name={t('modules.HtmlEditor')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setHtmlEditor(history, '/page/new');
              }}
            />
            <MenuItem
              key={'menuItem#createLink'}
              icon={'edit'}
              name={t('htmlEditor.MenuLink')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setRightMenuVisible(false);
                HtmlEditorLinkModal(
                  t,
                  -1,
                  DefaultMenuPath,
                  'https://',
                  htmEditorLinkform,
                  globalStateModel,
                  sessionModel,
                  clubModel
                )
                  .then()
                  .catch((error) => {
                    console.error(error);
                  });
              }}
            />
          </>
        ) : null}
        <Menu.Divider />
        {clubModel.sponsors && clubModel.sponsors.length > 0 ? (
          <MenuItem
            key={'menuItem#ourSponsors'}
            icon={'bank'}
            name={t('common.OurSponsors')}
            onClick={() => {
              globalStateModel.setDashboard(history, '/sponsors');
            }}
          />
        ) : null}
        {clubModel.oldUrl ? (
          <MenuItem
            key={'menuItem#oldHomePage'}
            icon="rollback"
            name={t('common.OldHomePage')}
            onClick={() => {
              const win = window.open(clubModel.oldUrl, '_blank');
              win?.focus();
            }}
          />
        ) : null}
      </StyledMenu>
    </StyledDrawer>
  );
});

export default DrawerRightMenu;
