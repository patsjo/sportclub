import React, { Component } from "react";
import MaterialIcon from "../materialIcon/MaterialIcon";
import styled from "styled-components";
import PropTypes from "prop-types";
import { Menu } from "antd";

const MenuItem = styled(Menu.Item)`
  &&& {
    line-height: 22px !important;
    height: 22px !important;
    padding: 0 !important;
    margin-left: ${(props) => (props.isSubMenu ? "24px" : "0")};
    width: ${(props) => (props.isSubMenu ? "calc(100% - 24px)" : "100%")};
  }
`;

MenuItem.defaultProps = {
  isSubMenu: false,
  disabled: false
};

const MenuText = styled.span`
  &&& {
    vertical-align: middle;
  }
`;

export default class StyledMenuItem extends Component {
  static propTypes = {
    key: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    isSubMenu: PropTypes.bool,
    disabled: PropTypes.bool
  };

  render() {
    return (
      <MenuItem
        className={`ant-menu-item${this.props.disabled ? " ant-menu-item-disabled" : ""}`}
        onClick={this.props.onClick}
        key={this.props.key}
        isSubMenu={this.props.isSubMenu}
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
