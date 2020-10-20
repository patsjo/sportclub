import React from 'react';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { Menu, Spin } from 'antd';
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

const MenuItems = ({ items, setHtmlEditor }) =>
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

const SubMenus = ({ menu, setHtmlEditor, path, ...other }) => (
  <>
    <MenuItems items={menu.menuItems} setHtmlEditor={setHtmlEditor} />
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
        {...other}
      >
        <SubMenus
          menu={subMenu.subMenus}
          setHtmlEditor={setHtmlEditor}
          path={path + '#' + subMenu.description}
          {...other}
        />
      </StyledSubMenu>
    ))}
  </>
);

const HtmlEditorMenus = inject('globalStateModel')(
  observer(({ globalStateModel, ...other }) =>
    globalStateModel.htmlEditorMenu ? (
      <SubMenus menu={globalStateModel.htmlEditorMenu} setHtmlEditor={globalStateModel.setHtmlEditor} {...other} />
    ) : (
      <Spin size="small" />
    )
  )
);

export default HtmlEditorMenus;
