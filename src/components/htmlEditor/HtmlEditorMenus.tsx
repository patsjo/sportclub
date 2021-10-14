import { CaretRightOutlined, FileOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { IGlobalStateModel } from 'models/globalStateModel';
import { IMenu, IMenuItem } from 'models/htmlEditorModel';
import { IMobxClubModel } from 'models/mobxClubModel';
import { ISessionModel } from 'models/sessionModel';
import React from 'react';
import { TFunction } from 'react-i18next';
import styled from 'styled-components';
import MaterialIcon from '../materialIcon/MaterialIcon';
import MenuItem from '../menu/MenuItem';
import { HtmlEditorLinkModal } from './HtmlEditorLinkModal';

interface IStyledSubMenu {
  level: number;
}
const StyledSubMenu = styled(Menu.SubMenu)`
  &&& {
    line-height: 22px;
    padding: 0;
  }
  &&& .ant-menu-submenu-title {
    margin-left: ${(props: IStyledSubMenu) => (props.level - 1) * 24}px;
    width: calc(100% - ${(props: IStyledSubMenu) => (props.level - 1) * 24}px);
    line-height: 22px;
    height: 22px;
    padding: 0 !important;
  }
`;

const getMenuItems = (
  items: IMenuItem[],
  setHtmlEditor: (path: string) => void,
  htmEditorLinkform: FormInstance,
  t: TFunction,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel
) =>
  items.map((item) => (
    <MenuItem
      key={`menuItem#htmlEditor#${item.pageId ? `pageId#${item.pageId}` : `linkId#${item.linkId}`}`}
      level={item.level}
      icon={
        item.pageId ? (
          <FileOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />
        ) : sessionModel.loggedIn && sessionModel.isAdmin ? (
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
                clubModel
              )
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
      onClick={() => {
        if (item.pageId) {
          setHtmlEditor(item.menuPath);
        } else {
          const win = window.open(item.url!, '_blank');
          win && win.focus();
        }
      }}
    />
  ));

export const getHtmlEditorMenus = (
  menu: IMenu,
  setHtmlEditor: (path: string) => void,
  path: string,
  htmEditorLinkform: FormInstance,
  t: TFunction,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel
) => (
  <>
    {getMenuItems(menu.menuItems, setHtmlEditor, htmEditorLinkform, t, globalStateModel, sessionModel, clubModel)}
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
            <span>{subMenu.description}</span>
          </span>
        }
      >
        {getHtmlEditorMenus(
          subMenu.subMenus,
          setHtmlEditor,
          path + '#' + subMenu.description,
          htmEditorLinkform,
          t,
          globalStateModel,
          sessionModel,
          clubModel
        )}
      </StyledSubMenu>
    ))}
  </>
);
