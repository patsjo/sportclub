import { Button, Col, Drawer, Form, Menu, message, Modal, Row, Spin, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { IFileUploadRequest, ISaveLinkRequest } from '../../utils/requestInterfaces';
import { IFolderResponse } from '../../utils/responseInterfaces';
import { FileEditorModal } from '../htmlEditor/FileEditorModal';
import { FolderEditorModal } from '../htmlEditor/FolderEditorModal';
import { DefaultMenuPath } from '../htmlEditor/HtmlEditor';
import { HtmlEditorLinkModal } from '../htmlEditor/HtmlEditorLinkModal';
import { getHtmlEditorMenus } from '../htmlEditor/HtmlEditorMenus';
import LoginMenuItem from '../login/LoginMenuItem';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';
import MenuItem from './MenuItem';
import ModuleSubMenu from './moduleSubMenus/ModuleSubMenu';

const { Title } = Typography;
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
  const [htmEditorLinkform] = Form.useForm<ISaveLinkRequest>();
  const [fileEditorForm] = Form.useForm<IFileUploadRequest>();
  const [folderEditorForm] = Form.useForm<IFolderResponse>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, contextHolder2] = Modal.useModal();

  return (
    <Drawer
      title={
        <Row>
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>
              {t('common.Menu')}
            </Title>
          </Col>
          <Col flex="40px">
            <Button
              type="text"
              icon={<MaterialIcon icon="menu-unfold" fontSize={20} />}
              onClick={() => globalStateModel.setRightMenuVisible(!globalStateModel.rightMenuVisible)}
            />
          </Col>
        </Row>
      }
      placement="right"
      closable={false}
      width={360}
      open={globalStateModel.rightMenuVisible}
      onClose={() => globalStateModel.setRightMenuVisible(false)}
    >
      {contextHolder}
      {contextHolder2}
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
          .filter(module => module.name !== 'HTMLEditor')
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
              <ModuleSubMenu key={'subMenu#' + module.name + index} module={module} />
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
            folderEditorForm,
            t,
            modal,
            globalStateModel,
            sessionModel,
            clubModel,
            messageApi
          )
        ) : (
          <Spin size="small" />
        )}
        {clubModel.modules.some(module => module.name === 'HTMLEditor') ? (
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
                htmEditorLinkform?.setFieldsValue({
                  iLinkID: -1,
                  iMenuPath: DefaultMenuPath,
                  iUrl: 'https://'
                });

                HtmlEditorLinkModal(
                  t,
                  modal,
                  -1,
                  DefaultMenuPath,
                  'https://',
                  htmEditorLinkform,
                  globalStateModel,
                  sessionModel,
                  clubModel,
                  messageApi
                )
                  .then()
                  .catch(error => {
                    console.error(error);
                  });
              }}
            />
          </>
        ) : null}
        {clubModel.modules.some(module => module.name === 'Files') ? (
          <>
            <MenuItem
              key={'menuItem#uploadFile'}
              icon={'cloud-upload'}
              name={t('files.UploadFile')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setRightMenuVisible(false);
                FileEditorModal(t, modal, -1, fileEditorForm, globalStateModel, sessionModel, clubModel, messageApi)
                  .then()
                  .catch(error => {
                    console.error(error);
                  });
              }}
            />
            <MenuItem
              key={'menuItem#newFolder'}
              icon={'cloud-upload'}
              name={t('files.AddFolder')}
              disabled={!sessionModel.loggedIn || !sessionModel.isAdmin}
              onClick={() => {
                globalStateModel.setRightMenuVisible(false);
                FolderEditorModal(t, modal, -1, folderEditorForm, globalStateModel, sessionModel, clubModel, messageApi)
                  .then()
                  .catch(error => {
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
    </Drawer>
  );
});

export default DrawerRightMenu;
