import { Drawer, Form, Menu, Spin } from 'antd';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { DefaultMenuPath } from '../htmlEditor/HtmlEditor';
import { HtmlEditorLinkModal } from '../htmlEditor/HtmlEditorLinkModal';
import { getHtmlEditorMenus } from '../htmlEditor/HtmlEditorMenus';
import LoginMenuItem from '../login/LoginMenuItem';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';
import MenuItem from './MenuItem';
import ModuleSubMenu from './moduleSubMenus/ModuleSubMenu';
import { FileEditorModal } from 'components/htmlEditor/FileEditorModal';

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
  const [fileEditorForm] = Form.useForm();
  const navigate = useNavigate();

  return (
    <StyledDrawer
      title={t('common.Menu')}
      placement="right"
      closable={false}
      width={360}
      open={globalStateModel.rightMenuVisible}
      onClose={() => globalStateModel.setRightMenuVisible(false)}
    >
      <StyledMenu mode="inline" onClick={() => globalStateModel.setRightMenuVisible(false)}>
        <MenuItem
          key={'menuItem#home0'}
          icon={'HomeIcon'}
          name={t('modules.Home')}
          onClick={() => {
            globalStateModel.setDashboard(navigate, '/');
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
        {clubModel.map?.layers.length ? (
          <MenuItem
            key={'menuItem#maps'}
            icon={'map'}
            name={t('modules.Maps')}
            onClick={() => {
              globalStateModel.setDashboard(navigate, `/${t('modules.Maps').toLowerCase()}`);
            }}
          />
        ) : null}
        <Menu.Divider />
        {globalStateModel.htmlEditorMenu ? (
          getHtmlEditorMenus(
            globalStateModel.htmlEditorMenu,
            (path: string) => globalStateModel.setHtmlEditor(navigate, path),
            '',
            htmEditorLinkform,
            fileEditorForm,
            t,
            globalStateModel,
            sessionModel,
            clubModel
          )
        ) : (
          <Spin size="small" />
        )}
        {clubModel.modules.some((module) => module.name === 'HTMLEditor') ? (
          <>
            <MenuItem
              key={'menuItem#htmlEditor'}
              icon={'edit'}
              name={t('modules.HtmlEditor')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setHtmlEditor(navigate, '/page/new');
              }}
            />
            <MenuItem
              key={'menuItem#createLink'}
              icon={'edit'}
              name={t('htmlEditor.MenuLink')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setRightMenuVisible(false);
                htmEditorLinkform &&
                  htmEditorLinkform.setFieldsValue({
                    iLinkID: -1,
                    iMenuPath: DefaultMenuPath,
                    iUrl: 'https://',
                  });

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
        {clubModel.modules.some((module) => module.name === 'Files') ? (
          <>
            <MenuItem
              key={'menuItem#uploadFile'}
              icon={'cloud-upload'}
              name={t('files.UploadFile')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setRightMenuVisible(false);
                FileEditorModal(t, -1, fileEditorForm, globalStateModel, sessionModel, clubModel)
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
              globalStateModel.setDashboard(navigate, '/sponsors');
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
