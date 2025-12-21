import { Menu } from 'antd';
import React from 'react';
import { styled } from 'styled-components';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';

interface IMenuItemProps {
  isSubMenu: boolean;
  level: number;
}
const MenuItem = styled(Menu.Item)<IMenuItemProps>`
  &&& {
    background-color: #ffffff;
    color: #231f20;
    line-height: 22px !important;
    height: 22px !important;
    padding: 0 !important;
    margin-left: ${({ isSubMenu, level }) => (isSubMenu ? '24px' : (level - 1) * 24 + 'px')};
    width: ${({ isSubMenu, level }) => (isSubMenu ? 'calc(100% - 24px)' : 'calc(100% - ' + (level - 1) * 24 + 'px)')};
  }
  &&&::after {
    border-right: none;
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
  disabled = false
}: IStyledMenuItem) => (
  <MenuItem
    key={key}
    className={`ant-menu-item${disabled ? ' ant-menu-item-disabled' : ''}`}
    isSubMenu={isSubMenu}
    level={level}
    disabled={disabled}
    onClick={onClick}
  >
    <MaterialIcon icon={icon} fontSize={18} marginRight={10} />
    <MenuText>{name}</MenuText>
  </MenuItem>
);

export default StyledMenuItem;
