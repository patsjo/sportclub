import React, { Component } from 'react';
import MaterialIcon from '../materialIcon/MaterialIcon';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Menu } from 'antd';

const MenuItem = styled(Menu.Item)`
  &&& {
    line-height: 22px !important;
    height: 22px !important;
    padding: 0 !important;
    margin-left: ${(props) => (props.isSubMenu ? '24px' : (props.level - 1) * 24 + 'px')};
    width: ${(props) => (props.isSubMenu ? 'calc(100% - 24px)' : 'calc(100% - ' + (props.level - 1) * 24 + 'px)')};
  }
`;

MenuItem.defaultProps = {
  isSubMenu: false,
  level: 1,
  disabled: false,
};

const MenuText = styled.span`
  &&& {
    vertical-align: middle;
  }
`;

export default class StyledMenuItem extends Component {
  static propTypes = {
    key: PropTypes.string.isRequired,
    icon: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    isSubMenu: PropTypes.bool,
    level: PropTypes.number,
    disabled: PropTypes.bool,
  };

  render() {
    return (
      <MenuItem
        className={`ant-menu-item${this.props.disabled ? ' ant-menu-item-disabled' : ''}`}
        onClick={this.props.onClick}
        key={this.props.key}
        isSubMenu={this.props.isSubMenu}
        level={this.props.level}
        disabled={this.props.disabled}
        onItemHover={() => {}}
        onMouseEnter={() => {}}
      >
        <MaterialIcon icon={this.props.icon} fontSize={18} marginRight={10} />
        <MenuText>{this.props.name}</MenuText>
      </MenuItem>
    );
  }
}
