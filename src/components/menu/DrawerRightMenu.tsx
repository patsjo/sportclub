import { AccountBookOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Col, Drawer, Form, Menu, MenuProps, message, Modal, Row, Spin, Typography } from 'antd';
import i18next from 'i18next';
import { observer } from 'mobx-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { applyMenuOrder } from '../../utils/menuOrder';
import { useMobxStore } from '../../utils/mobxStore';
import { mobileMediaQuery } from '../../utils/useIsMobile';
import { IFileUploadRequest, ISaveLinkRequest } from '../../utils/requestInterfaces';
import { IFolderResponse } from '../../utils/responseInterfaces';
import { FileEditorModal } from '../htmlEditor/FileEditorModal';
import { FolderEditorModal } from '../htmlEditor/FolderEditorModal';
import { DefaultMenuPath } from '../htmlEditor/HtmlEditor';
import { HtmlEditorLinkModal } from '../htmlEditor/HtmlEditorLinkModal';
import { getHtmlEditorMenus } from '../htmlEditor/HtmlEditorMenus';
import { useLoginMenuItem } from '../login/useLoginMenuItem';
import MaterialIcon from '../materialIcon/MaterialIcon';
import MyPagesBadge from '../badges/MyPagesBadge';
import InvoicesBadge from '../invoices/InvoicesBadge';
import { getMenuItem } from './MenuItem';
import { useModuleSubMenu } from './moduleSubMenus/useModuleSubMenu';

const { Title } = Typography;
type TopMenuItem = Exclude<NonNullable<MenuProps['items']>[number], null>;
// The dividers at the top level have keys, they are ordered as the menu items (see the menu order page)
const topMenuDivider = (key: string): TopMenuItem => ({ type: 'divider', key });
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
  /* The sections under "My pages" */
  &&& .ant-menu-item-group-title {
    padding: 6px 0 2px 28px;
    font-size: 12px;
    line-height: 20px;
  }
  /* A badge (invoices, access requests) goes up above the row and isn't clipped, these short titles need no ellipsis */
  &&& .ant-menu-item:has(.ant-badge),
  &&& .ant-menu-item:has(.ant-badge) > .ant-menu-title-content,
  &&& .ant-menu-submenu-title:has(.ant-badge),
  &&& .ant-menu-submenu-title:has(.ant-badge) > .ant-menu-title-content {
    overflow: visible;
  }
  /* Bigger touch targets on a phone */
  ${mobileMediaQuery} {
    &&& .ant-menu-item,
    &&& .ant-menu-submenu-title {
      line-height: 32px !important;
      height: 32px !important;
    }
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
  const { loginMenuItem, accessRequestMenuItem, loginForm } = useLoginMenuItem();
  const { allModuleMenuItems, allModuleModals, myPagesModuleMenuItems } = useModuleSubMenu();
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
      clubModel.modules.some(module => module.name === 'HTMLEditor') && loggedIn && isAdmin
        ? [
            getMenuItem(
              'menuItem#htmlEditor',
              'edit',
              t('modules.HTMLEditor'),
              () => {
                globalStateModel.setHtmlEditor(navigate, '/page/new');
              },
              true
            ),
            getMenuItem(
              'menuItem#createLink',
              'edit',
              t('htmlEditor.MenuLink'),
              () => {
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
              },
              true
            )
          ]
        : [],
    [clubModel, globalStateModel, htmEditorLinkform, isAdmin, loggedIn, messageApi, modal, navigate, sessionModel, t]
  );

  const filesMenuItems = useMemo(
    (): NonNullable<MenuProps['items']> =>
      clubModel.modules.some(module => module.name === 'Files') && loggedIn && isAdmin
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
              true
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
              true
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

  // Everything personal and everything the user has the authority to administer, hidden when not allowed
  const myPagesMenuItem = useMemo((): NonNullable<MenuProps['items']>[number] | null => {
    if (!loggedIn && !sessionModel.isGuest) return null;
    const group = (
      key: string,
      label: string,
      children: NonNullable<MenuProps['items']>
    ): NonNullable<MenuProps['items']> => (children.length > 0 ? [{ type: 'group', key, label, children }] : []);
    const economyMenuItems: NonNullable<MenuProps['items']> = [
      clubModel.invoice.url && loggedIn
        ? getMenuItem(
            'menuItem#myInvoices',
            <FileTextOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />,
            <InvoicesBadge offset={[13, 0]}>{t('invoices.MyInvoices')}</InvoicesBadge>,
            () => globalStateModel.setDashboard(navigate, '/invoices'),
            true
          )
        : null,
      clubModel.invoice.url && loggedIn && (isAdmin || sessionModel.isEconomy)
        ? getMenuItem(
            'menuItem#invoiceOverview',
            <AccountBookOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />,
            t('invoices.Overview'),
            () => globalStateModel.setDashboard(navigate, '/invoices/overview'),
            true
          )
        : null,
      ...myPagesModuleMenuItems.economy
    ].filter(item => item !== null);

    return {
      key: 'subMenu#myPages',
      label: (
        <span>
          {/* An antd icon in the label, not the icon prop, so it needs its own gap to the text */}
          <UserOutlined style={{ verticalAlign: 'middle', fontSize: 18, marginRight: 10 }} />
          <MyPagesBadge offset={[13, 0]}>{t('common.MyPages')}</MyPagesBadge>
        </span>
      ),
      children: [
        ...group('group#economy', t('common.Economy'), economyMenuItems),
        ...group('group#calendar', t('modules.Calendar'), myPagesModuleMenuItems.calendar),
        ...group('group#results', t('modules.Results'), myPagesModuleMenuItems.results),
        ...group('group#cups', t('modules.Cup'), myPagesModuleMenuItems.cups),
        ...group('group#administration', t('common.Administration'), [
          ...myPagesModuleMenuItems.administration,
          ...editHtmlEditorMenuItems,
          ...filesMenuItems,
          ...(clubModel.settings?.saveUrl && loggedIn && isAdmin
            ? [
                getMenuItem(
                  'menuItem#menuOrder',
                  'menu-fold',
                  t('menu.MenuOrder'),
                  () => globalStateModel.setDashboard(navigate, '/admin/menu'),
                  true
                )
              ]
            : [])
        ]),
        menuItemDivider,
        ...(accessRequestMenuItem ? [accessRequestMenuItem] : []),
        loginMenuItem
      ]
    };
  }, [
    accessRequestMenuItem,
    clubModel.invoice.url,
    clubModel.settings?.saveUrl,
    editHtmlEditorMenuItems,
    filesMenuItems,
    globalStateModel,
    isAdmin,
    loggedIn,
    loginMenuItem,
    menuItemDivider,
    myPagesModuleMenuItems,
    navigate,
    sessionModel.isEconomy,
    sessionModel.isGuest,
    t
  ]);

  // The top level in the default order, the saved order is applied below
  const defaultMenuItems = useMemo(
    (): TopMenuItem[] =>
      [
        getMenuItem('menuItem#home0', 'HomeIcon', t('modules.Home'), () => {
          globalStateModel.setDashboard(navigate, '/');
        }),
        myPagesMenuItem ?? loginMenuItem,
        topMenuDivider('divider#1'),
        ...allModuleMenuItems,
        clubModel.map && (!clubModel.map.requireLogin || loggedIn)
          ? getMenuItem('menuItem#maps', 'map', t('modules.Maps'), () => {
              globalStateModel.setDashboard(navigate, `/${t('modules.Maps').toLowerCase()}`);
            })
          : null,
        clubModel.map && (!clubModel.map.requireLogin || loggedIn)
          ? getMenuItem('menuItem#mapTracks', 'map-tracks', t('map.Tracks'), () => {
              globalStateModel.setDashboard(navigate, i18next.language === 'sv-SE' ? '/spårkartor' : '/maps/tracks');
            })
          : null,
        topMenuDivider('divider#2'),
        ...htmlEditorMenuItems,
        topMenuDivider('divider#3'),
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
      ].filter(item => item !== null && item !== undefined),
    [
      allModuleMenuItems,
      clubModel.map,
      clubModel.oldUrl,
      clubModel.sponsors,
      globalStateModel,
      htmlEditorMenuItems,
      loggedIn,
      loginMenuItem,
      myPagesMenuItem,
      navigate,
      t
    ]
  );

  // The menu order page lists the menu items as the administrator sees them
  useEffect(() => {
    globalStateModel.setDefaultTopMenuItems(defaultMenuItems);
  }, [defaultMenuItems, globalStateModel]);

  const menuOrder = globalStateModel.menuOrder;
  const menuItems = useMemo(
    () => applyMenuOrder(defaultMenuItems, menuOrder, topMenuDivider),
    [defaultMenuItems, menuOrder]
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
              aria-label={t('common.Close')}
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
