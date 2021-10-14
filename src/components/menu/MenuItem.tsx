import { Menu } from 'antd';
import React from 'react';
import styled from 'styled-components';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';

interface IMenuItemProps {
  isSubMenu: boolean;
  level: number;
}
const MenuItem = styled(Menu.Item)`
  &&& {
    line-height: 22px !important;
    height: 22px !important;
    padding: 0 !important;
    margin-left: ${({ isSubMenu, level }: IMenuItemProps) => (isSubMenu ? '24px' : (level - 1) * 24 + 'px')};
    width: ${({ isSubMenu, level }: IMenuItemProps) =>
      isSubMenu ? 'calc(100% - 24px)' : 'calc(100% - ' + (level - 1) * 24 + 'px)'};
  }
`;

const MenuText = styled.span`
  &&& {
    vertical-align: middle;
  }
`;

interface IStyledMenuItem {
  key: string;
  icon: MaterialIconsType | React.ReactElement;
  name: string;
  onClick: () => void;
  isSubMenu?: boolean;
  level?: number;
  disabled?: boolean;
}
const StyledMenuItem = ({
  key,
  icon,
  name,
  onClick,
  isSubMenu = false,
  level = 1,
  disabled = false,
}: IStyledMenuItem) => (
  <MenuItem
    className={`ant-menu-item${disabled ? ' ant-menu-item-disabled' : ''}`}
    onClick={onClick}
    key={key}
    isSubMenu={isSubMenu}
    level={level}
    disabled={disabled}
  >
    <MaterialIcon icon={icon} fontSize={18} marginRight={10} />
    <MenuText>{name}</MenuText>
  </MenuItem>
);

export default StyledMenuItem;
