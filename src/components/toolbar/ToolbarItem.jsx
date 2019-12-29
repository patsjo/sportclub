import React, { Component } from "react";
import MaterialIcon from "../materialIcon/MaterialIcon";
import styled from "styled-components";
import PropTypes from "prop-types";

const ToolbarItemHolder = styled.div`
  & {
    display: ${props => (props.disabled ? "none" : "inline-block")};
    cursor: pointer;
    min-width: 46px;
    height: 46px;
    line-height: 20px;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    padding: 5px;
    margin-left: 10px;
    margin-top: 15px;
    margin-bottom: 10px;
  }
  &:hover {
    background-color: rgba(0, 0, 0, 0.4);
  }
`;

const MaterialIconText = styled.div`
  margin-top: 2px;
  line-height: 10px;
  font-size: 10px;
  white-space: nowrap;
`;

export default class ToolbarItem extends Component {
  static propTypes = {
    icon: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      rightMenu: false
    };
  }

  render() {
    return (
      <ToolbarItemHolder
        onClick={this.props.onClick}
        disabled={this.props.disabled}
      >
        <MaterialIcon icon={this.props.icon} fontSize={20} />
        <MaterialIconText>{this.props.name}</MaterialIconText>
      </ToolbarItemHolder>
    );
  }
}
