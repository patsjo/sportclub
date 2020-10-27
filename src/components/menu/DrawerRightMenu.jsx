import React from 'react';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { Drawer, Form, Menu, Spin } from 'antd';
import MenuItem from './MenuItem';
import LoginMenuItem from '../login/LoginMenuItem';
import ModuleSubMenu from './moduleSubMenus/ModuleSubMenu';
import MaterialIcon from '../materialIcon/MaterialIcon';
import { dashboardContents } from '../../models/globalStateModel';
import { getHtmlEditorMenus } from '../htmlEditor/HtmlEditorMenus';
import { HtmlEditorLinkModal } from '../htmlEditor/HtmlEditorLinkModal';
import { DefaultMenuPath } from '../htmlEditor/HtmlEditor';

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

// @inject("clubModel", "globalStateModel")
// @observer
const DrawerRightMenu = inject(
  'clubModel',
  'globalStateModel',
  'sessionModel'
)(
  observer((props) => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const [htmEditorLinkform] = Form.useForm();

    return (
      <StyledDrawer
        title={t('common.Menu')}
        placement="right"
        closable={false}
        width={360}
        visible={globalStateModel.rightMenuVisible}
        onClose={() => globalStateModel.setValue('rightMenuVisible', false)}
      >
        <StyledMenu mode="inline" onClick={() => globalStateModel.setValue('rightMenuVisible', false)}>
          <MenuItem
            key={'menuItem#home0'}
            icon={'HomeIcon'}
            name={t('modules.Home')}
            onClick={() => {
              globalStateModel.setDashboard(dashboardContents.home);
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
                      <MaterialIcon icon={module.name + 'Icon'} fontSize={18} marginRight={10} />
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
                  globalStateModel.setHtmlEditor,
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
                  globalStateModel.setHtmlEditor(-1);
                }}
              />
              <MenuItem
                key={'menuItem#createLink'}
                icon={'edit'}
                name={t('htmlEditor.MenuLink')}
                disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
                onClick={() => {
                  globalStateModel.setValue('rightMenuVisible', false);
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
                    .then(() => {})
                    .catch(() => {});
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
                globalStateModel.setDashboard(dashboardContents.ourSponsors);
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
                win.focus();
              }}
            />
          ) : null}
        </StyledMenu>
      </StyledDrawer>
    );
  })
);

export default DrawerRightMenu;
