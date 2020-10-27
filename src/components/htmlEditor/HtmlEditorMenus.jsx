import React from 'react';
import styled from 'styled-components';
import { Menu } from 'antd';
import MenuItem from '../menu/MenuItem';
import { CaretRightOutlined, FileOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';
import MaterialIcon from '../materialIcon/MaterialIcon';
import { HtmlEditorLinkModal } from '../htmlEditor/HtmlEditorLinkModal';
import { DefaultMenuPath } from '../htmlEditor/HtmlEditor';

const StyledSubMenu = styled(Menu.SubMenu)`
  &&& {
    line-height: 22px;
    padding: 0;
  }
  &&& .ant-menu-submenu-title {
    margin-left: ${(props) => (props.level - 1) * 24}px;
    width: calc(100% - ${(props) => (props.level - 1) * 24}px);
    line-height: 22px;
    height: 22px;
    padding: 0 !important;
  }
`;

const getMenuItems = (items, setHtmlEditor, htmEditorLinkform, t, globalStateModel, sessionModel, clubModel) =>
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
              globalStateModel.setValue('rightMenuVisible', false);
              HtmlEditorLinkModal(
                t,
                item.linkId,
                item.menuPath,
                item.url,
                htmEditorLinkform,
                globalStateModel,
                sessionModel,
                clubModel
              )
                .then(() => {})
                .catch(() => {});
            }}
          />
        ) : (
          <LinkOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />
        )
      }
      name={item.description}
      onClick={() => {
        if (item.pageId) {
          setHtmlEditor(item.pageId);
        } else {
          const win = window.open(item.url, '_blank');
          win.focus();
        }
      }}
    />
  ));

export const getHtmlEditorMenus = (
  menu,
  setHtmlEditor,
  path,
  htmEditorLinkform,
  t,
  globalStateModel,
  sessionModel,
  clubModel
) => (
  <>
    {getMenuItems(menu.menuItems, setHtmlEditor, htmEditorLinkform, t, globalStateModel, sessionModel, clubModel)}
    {menu.subMenus.map((subMenu) => (
      <StyledSubMenu
        key={'subMenu#htmlEditor' + path + '#' + subMenu.description}
        level={subMenu.level}
        title={
          <span>
            <MaterialIcon icon={<CaretRightOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />} />
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
