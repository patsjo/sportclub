import { MenuProps } from 'antd';
import React from 'react';
import { styled } from 'styled-components';
import MaterialIcon, { MaterialIconsType } from '../materialIcon/MaterialIcon';

const MenuText = styled.span`
  &&& {
    vertical-align: middle;
  }
`;

export const getMenuItem = (
  key: string,
  icon: MaterialIconsType | React.ReactElement,
  label: string,
  onClick: () => void,
  isSubMenu: boolean = false,
  level: number = 1,
  disabled: boolean = false
): NonNullable<MenuProps['items']>[number] => ({
  key,
  className: `ant-menu-item${disabled ? ' ant-menu-item-disabled' : ''}`,
  disabled,
  onClick,
  icon: <MaterialIcon icon={icon} fontSize={18} marginRight={10} />,
  label: <MenuText>{label}</MenuText>,
  style: {
    marginLeft: isSubMenu || level > 1 ? 28 : 0,
    width: isSubMenu || level > 1 ? 'calc(100% - 28px)' : '100%'
  }
});
