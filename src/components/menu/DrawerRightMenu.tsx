import { Button, Col, Drawer, Form, Menu, MenuProps, message, Modal, Row, Spin, Typography } from 'antd';
import i18next from 'i18next';
import { observer } from 'mobx-react';
import { useMemo } from 'react';
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
import { useLoginMenuItem } from '../login/useLoginMenuItem';
import MaterialIcon from '../materialIcon/MaterialIcon';
import { getMenuItem } from './MenuItem';
import { useModuleSubMenu } from './moduleSubMenus/useModuleSubMenu';

const { Title } = Typography;
const StyledMenu = styled(Menu)`
  &&&.ant-menu-inline {
    border-right: 0px;
  }
  &&& .ant-menu-item,
  .ant-menu-submenu-title {
    padding: 0 !important;
    margin: 0;
    line-height: 28px !important;
    height: 28px !important;
    width: 100%;
  }
  &&& .ant-menu-sub {
    background-color: #ffffff;
  }
`;

const DrawerRightMenu = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const loggedIn = sessionModel.loggedIn;
  const isAdmin = sessionModel.isAdmin;
  const [htmEditorLinkform] = Form.useForm<ISaveLinkRequest>();
  const [fileEditorForm] = Form.useForm<IFileUploadRequest>();
  const [folderEditorForm] = Form.useForm<IFolderResponse>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, contextHolder2] = Modal.useModal();
  const { loginMenuItem, loginForm } = useLoginMenuItem();
  const { allModuleMenuItems, allModuleModals } = useModuleSubMenu();
  const htmlEditorMenu = globalStateModel.htmlEditorMenu;
  const htmlEditorMenuItems = useMemo(
    (): NonNullable<MenuProps['items']> =>
      htmlEditorMenu
        ? getHtmlEditorMenus(
            htmlEditorMenu,
            (path: string) => globalStateModel.setHtmlEditor(navigate, path),
            '',
            htmEditorLinkform,
            fileEditorForm,
            folderEditorForm,
            t,
            modal,
            globalStateModel,
            { ...sessionModel, loggedIn, isAdmin },
            clubModel,
            messageApi
          )
        : [{ key: 'htmlEditorLoading', label: <Spin size="small" /> }],
    [
      clubModel,
      fileEditorForm,
      folderEditorForm,
      globalStateModel,
      htmEditorLinkform,
      htmlEditorMenu,
      isAdmin,
      loggedIn,
      messageApi,
      modal,
      navigate,
      sessionModel,
      t
    ]
  );
  const editHtmlEditorMenuItems = useMemo(
    (): NonNullable<MenuProps['items']> =>
      clubModel.modules.some(module => module.name === 'HTMLEditor')
        ? [
            getMenuItem('menuItem#htmlEditor', 'edit', t('modules.HTMLEditor'), () => {
              globalStateModel.setHtmlEditor(navigate, '/page/new');
            }),
            getMenuItem('menuItem#createLink', 'edit', t('htmlEditor.MenuLink'), () => {
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
            })
          ]
        : [],
    [clubModel, globalStateModel, htmEditorLinkform, messageApi, modal, navigate, sessionModel, t]
  );

  const filesMenuItems = useMemo(
    (): NonNullable<MenuProps['items']> =>
      clubModel.modules.some(module => module.name === 'Files')
        ? [
            getMenuItem(
              'menuItem#uploadFile',
              'cloud-upload',
              t('files.UploadFile'),
              () => {
                globalStateModel.setRightMenuVisible(false);
                FileEditorModal(t, modal, -1, fileEditorForm, globalStateModel, sessionModel, clubModel, messageApi)
                  .then()
                  .catch(error => {
                    console.error(error);
                  });
              },
              false,
              1,
              !loggedIn || !isAdmin
            ),
            getMenuItem(
              'menuItem#newFolder',
              'cloud-upload',
              t('files.AddFolder'),
              () => {
                globalStateModel.setRightMenuVisible(false);
                FolderEditorModal(t, modal, -1, folderEditorForm, globalStateModel, sessionModel, clubModel, messageApi)
                  .then()
                  .catch(error => {
                    console.error(error);
                  });
              },
              false,
              1,
              !loggedIn || !isAdmin
            )
          ]
        : [],
    [
      clubModel,
      fileEditorForm,
      folderEditorForm,
      globalStateModel,
      messageApi,
      modal,
      sessionModel,
      loggedIn,
      isAdmin,
      t
    ]
  );

  const menuItemDivider: NonNullable<MenuProps['items']>[number] = useMemo(
    () => ({
      type: 'divider'
    }),
    []
  );

  const menuItems: NonNullable<MenuProps['items']> = useMemo(
    () =>
      [
        getMenuItem('menuItem#home0', 'HomeIcon', t('modules.Home'), () => {
          globalStateModel.setDashboard(navigate, '/');
        }),
        loginMenuItem,
        menuItemDivider,
        ...allModuleMenuItems,
        clubModel.map
          ? getMenuItem('menuItem#maps', 'map', t('modules.Maps'), () => {
              globalStateModel.setDashboard(navigate, `/${t('modules.Maps').toLowerCase()}`);
            })
          : null,
        clubModel.map
          ? getMenuItem('menuItem#mapTracks', 'map-tracks', t('map.Tracks'), () => {
              globalStateModel.setDashboard(navigate, i18next.language === 'sv-SE' ? '/spårkartor' : '/maps/tracks');
            })
          : null,
        menuItemDivider,
        ...htmlEditorMenuItems,
        ...editHtmlEditorMenuItems,
        ...filesMenuItems,
        menuItemDivider,
        clubModel.sponsors && clubModel.sponsors.length > 0
          ? getMenuItem('menuItem#ourSponsors', 'bank', t('common.OurSponsors'), () => {
              globalStateModel.setDashboard(navigate, '/sponsors');
            })
          : null,
        clubModel.oldUrl
          ? getMenuItem('menuItem#oldHomePage', 'rollback', t('common.OldHomePage'), () => {
              const win = window.open(clubModel.oldUrl, '_blank');
              win?.focus();
            })
          : null
      ].filter(item => item !== null),
    [
      allModuleMenuItems,
      clubModel.map,
      clubModel.oldUrl,
      clubModel.sponsors,
      editHtmlEditorMenuItems,
      filesMenuItems,
      globalStateModel,
      htmlEditorMenuItems,
      loginMenuItem,
      menuItemDivider,
      navigate,
      t
    ]
  );

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
      size={360}
      open={globalStateModel.rightMenuVisible}
      styles={{
        header: { paddingLeft: 12, paddingRight: 18, paddingTop: 8, paddingBottom: 8 },
        body: {
          paddingLeft: 12,
          paddingRight: 0,
          paddingTop: 8,
          paddingBottom: 8,
          scrollbarGutter: 'stable'
        }
      }}
      onClose={() => globalStateModel.setRightMenuVisible(false)}
    >
      {contextHolder}
      {contextHolder2}
      {loginForm}
      {allModuleModals}
      <StyledMenu mode="inline" items={menuItems} onClick={() => globalStateModel.setRightMenuVisible(false)} />
    </Drawer>
  );
});

export default DrawerRightMenu;
