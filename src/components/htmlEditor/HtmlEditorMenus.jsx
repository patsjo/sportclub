import React from 'react';
import styled from 'styled-components';
import { Menu } from 'antd';
import MenuItem from '../menu/MenuItem';
import { CaretRightOutlined, FileOutlined } from '@ant-design/icons';
import MaterialIcon from '../materialIcon/MaterialIcon';

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

const getMenuItems = (items, setHtmlEditor) =>
  items.map((item) => (
    <MenuItem
      key={`menuItem#htmlEditor#${item.pageId}`}
      level={item.level}
      icon={<FileOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />}
      name={item.description}
      onClick={() => {
        setHtmlEditor(item.pageId);
      }}
    />
  ));

export const getHtmlEditorMenus = (menu, setHtmlEditor, path) => (
  <>
    {getMenuItems(menu.menuItems, setHtmlEditor)}
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
        {getHtmlEditorMenus(subMenu.subMenus, setHtmlEditor, path + '#' + subMenu.description)}
      </StyledSubMenu>
    ))}
  </>
);
