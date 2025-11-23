import { CaretRightOutlined, FileOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { MessageInstance } from 'antd/lib/message/interface';
import { TFunction } from 'i18next';
import styled from 'styled-components';
import { IGlobalStateModel } from '../../models/globalStateModel';
import { IMenu, IMenuItem } from '../../models/htmlEditorModel';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { ISessionModel } from '../../models/sessionModel';
import { DownloadData } from '../../utils/api';
import MaterialIcon from '../materialIcon/MaterialIcon';
import MenuItem from '../menu/MenuItem';
import { FileEditorModal } from './FileEditorModal';
import { FolderEditorModal } from './FolderEditorModal';
import { HtmlEditorLinkModal } from './HtmlEditorLinkModal';

interface IStyledSubMenu {
  level: number;
}
const StyledSubMenu = styled(Menu.SubMenu)<IStyledSubMenu>`
  &&& {
    line-height: 22px !important;
    padding: 0;
  }
  &&& .ant-menu-submenu-title {
    margin-left: ${(props) => (props.level - 1) * 24}px;
    width: calc(100% - ${(props) => (props.level - 1) * 24}px);
    line-height: 22px !important;
    height: 22px !important;
    padding: 0 !important;
  }
`;

const getMenuItems = (
  items: IMenuItem[],
  setHtmlEditor: (path: string) => void,
  htmEditorLinkform: FormInstance,
  fileEditorForm: FormInstance,
  t: TFunction,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel,
  messageApi: MessageInstance,
) =>
  items.map((item) => (
    <MenuItem
      key={`menuItem#htmlEditor#${
        item.pageId ? `pageId#${item.pageId}` : item.linkId ? `linkId#${item.linkId}` : `fileId#${item.fileId}`
      }`}
      level={item.level}
      icon={
        item.pageId ? (
          <FileOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />
        ) : item.linkId && sessionModel.loggedIn && sessionModel.isAdmin ? (
          <SettingOutlined
            style={{ verticalAlign: 'middle', fontSize: 18 }}
            onClick={(event) => {
              event.stopPropagation();
              globalStateModel.setRightMenuVisible(false);
              htmEditorLinkform &&
                htmEditorLinkform.setFieldsValue({
                  iLinkID: item.linkId,
                  iMenuPath: item.menuPath,
                  iUrl: item.url,
                });

              HtmlEditorLinkModal(
                t,
                item.linkId!,
                item.menuPath,
                item.url!,
                htmEditorLinkform,
                globalStateModel,
                sessionModel,
                clubModel,
                messageApi,
              )
                .then()
                .catch((error) => {
                  console.error(error);
                });
            }}
          />
        ) : item.fileId &&
          sessionModel.loggedIn &&
          (sessionModel.isAdmin || sessionModel.id == item.createdByUserId) ? (
          <SettingOutlined
            style={{ verticalAlign: 'middle', fontSize: 18 }}
            onClick={(event) => {
              event.stopPropagation();
              globalStateModel.setRightMenuVisible(false);
              FileEditorModal(t, item.fileId!, fileEditorForm, globalStateModel, sessionModel, clubModel, messageApi)
                .then()
                .catch((error) => {
                  console.error(error);
                });
            }}
          />
        ) : (
          <LinkOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />
        )
      }
      name={item.description}
      onClick={async () => {
        if (item.pageId) {
          setHtmlEditor(item.menuPath);
        } else if (item.linkId) {
          const win = window.open(item.url!, '_blank');
          win && win.focus();
        } else {
          await DownloadData(
            item.description,
            clubModel.attachmentUrl + item.fileId,
            {
              username: sessionModel.username,
              password: sessionModel.password,
            },
            sessionModel.authorizationHeader,
          );
        }
      }}
    />
  ));

export const getHtmlEditorMenus = (
  menu: IMenu,
  setHtmlEditor: (path: string) => void,
  path: string,
  htmEditorLinkform: FormInstance,
  fileEditorForm: FormInstance,
  t: TFunction,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel,
  messageApi: MessageInstance,
) => (
  <>
    {getMenuItems(
      menu.menuItems,
      setHtmlEditor,
      htmEditorLinkform,
      fileEditorForm,
      t,
      globalStateModel,
      sessionModel,
      clubModel,
      messageApi,
    )}
    {menu.subMenus.map((subMenu) => (
      <StyledSubMenu
        key={'subMenu#htmlEditor' + path + '#' + subMenu.description}
        level={subMenu.level}
        title={
          <span>
            <MaterialIcon
              icon={<CaretRightOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />}
              fontSize={18}
            />
            {subMenu.folderId &&
            sessionModel.loggedIn &&
            (sessionModel.isAdmin || sessionModel.id == subMenu.createdByUserId) ? (
              <SettingOutlined
                style={{ verticalAlign: 'middle', fontSize: 18 }}
                onClick={(event) => {
                  event.stopPropagation();
                  globalStateModel.setRightMenuVisible(false);
                  FolderEditorModal(
                    t,
                    subMenu.folderId!,
                    fileEditorForm,
                    globalStateModel,
                    sessionModel,
                    clubModel,
                    messageApi,
                  )
                    .then()
                    .catch((error) => {
                      console.error(error);
                    });
                }}
              />
            ) : null}
            <span>{subMenu.description}</span>
          </span>
        }
      >
        {getHtmlEditorMenus(
          subMenu.subMenus,
          setHtmlEditor,
          path + '#' + subMenu.description,
          htmEditorLinkform,
          fileEditorForm,
          t,
          globalStateModel,
          sessionModel,
          clubModel,
          messageApi,
        )}
      </StyledSubMenu>
    ))}
  </>
);
