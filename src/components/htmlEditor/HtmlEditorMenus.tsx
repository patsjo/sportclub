import { CaretRightOutlined, FileOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { MessageInstance } from 'antd/lib/message/interface';
import { HookAPI } from 'antd/lib/modal/useModal';
import { TFunction } from 'i18next';
import { IGlobalStateModel } from '../../models/globalStateModel';
import { IMenu, IMenuItem } from '../../models/htmlEditorModel';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { ISessionModel } from '../../models/sessionModel';
import { DownloadData } from '../../utils/api';
import { IFileUploadRequest, ISaveLinkRequest } from '../../utils/requestInterfaces';
import { IFolderResponse } from '../../utils/responseInterfaces';
import MaterialIcon from '../materialIcon/MaterialIcon';
import { getMenuItem } from '../menu/MenuItem';
import { FileEditorModal } from './FileEditorModal';
import { FolderEditorModal } from './FolderEditorModal';
import { HtmlEditorLinkModal } from './HtmlEditorLinkModal';

const getMenuItems = (
  items: IMenuItem[],
  setHtmlEditor: (path: string) => void,
  htmEditorLinkform: FormInstance<ISaveLinkRequest>,
  fileEditorForm: FormInstance<IFileUploadRequest>,
  t: TFunction,
  modal: HookAPI,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel,
  messageApi: MessageInstance
): NonNullable<MenuProps['items']> =>
  items.map(item =>
    getMenuItem(
      `menuItem#htmlEditor#${
        item.pageId ? `pageId#${item.pageId}` : item.linkId ? `linkId#${item.linkId}` : `fileId#${item.fileId}`
      }`,
      item.pageId ? (
        <FileOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />
      ) : item.linkId && sessionModel.loggedIn && sessionModel.isAdmin ? (
        <SettingOutlined
          style={{ verticalAlign: 'middle', fontSize: 18 }}
          onClick={event => {
            event.stopPropagation();
            globalStateModel.setRightMenuVisible(false);
            htmEditorLinkform?.setFieldsValue({
              iLinkID: item.linkId,
              iMenuPath: item.menuPath,
              iUrl: item.url
            });

            HtmlEditorLinkModal(
              t,
              modal,
              item.linkId!,
              item.menuPath,
              item.url!,
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
      ) : item.fileId && sessionModel.loggedIn && (sessionModel.isAdmin || sessionModel.id == item.createdByUserId) ? (
        <SettingOutlined
          style={{ verticalAlign: 'middle', fontSize: 18 }}
          onClick={event => {
            event.stopPropagation();
            globalStateModel.setRightMenuVisible(false);
            FileEditorModal(
              t,
              modal,
              item.fileId!,
              fileEditorForm,
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
      ) : (
        <LinkOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />
      ),
      item.description,
      async () => {
        if (item.pageId) {
          setHtmlEditor(item.menuPath);
        } else if (item.linkId) {
          const win = window.open(item.url!, '_blank');
          win?.focus();
        } else {
          await DownloadData(
            item.description,
            clubModel.attachmentUrl + item.fileId,
            {
              username: sessionModel.username,
              password: sessionModel.password
            },
            sessionModel.authorizationHeader
          );
        }
      },
      false,
      item.level
    )
  );

export const getHtmlEditorMenus = (
  menu: IMenu,
  setHtmlEditor: (path: string) => void,
  path: string,
  htmEditorLinkform: FormInstance<ISaveLinkRequest>,
  fileEditorForm: FormInstance<IFileUploadRequest>,
  folderEditorForm: FormInstance<IFolderResponse>,
  t: TFunction,
  modal: HookAPI,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel,
  messageApi: MessageInstance
): NonNullable<MenuProps['items']> => [
  ...getMenuItems(
    menu.menuItems,
    setHtmlEditor,
    htmEditorLinkform,
    fileEditorForm,
    t,
    modal,
    globalStateModel,
    sessionModel,
    clubModel,
    messageApi
  ),
  ...menu.subMenus.map(subMenu => ({
    key: 'subMenu#htmlEditor' + path + '#' + subMenu.description,
    style: {
      marginLeft: (subMenu.level - 1) * 28,
      width: `calc(100% - ${(subMenu.level - 1) * 28}px)`,
      padding: '0 !important'
    },
    label: (
      <span>
        <MaterialIcon icon={<CaretRightOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />} fontSize={18} />
        {subMenu.folderId &&
        sessionModel.loggedIn &&
        (sessionModel.isAdmin || sessionModel.id == subMenu.createdByUserId) ? (
          <SettingOutlined
            style={{ verticalAlign: 'middle', fontSize: 18 }}
            onClick={event => {
              event.stopPropagation();
              globalStateModel.setRightMenuVisible(false);
              FolderEditorModal(
                t,
                modal,
                subMenu.folderId!,
                folderEditorForm,
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
        ) : null}
        <span>{subMenu.description}</span>
      </span>
    ),
    children: getHtmlEditorMenus(
      subMenu.subMenus,
      setHtmlEditor,
      path + '#' + subMenu.description,
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
  }))
];
