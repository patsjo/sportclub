import React, { Component } from "react";
import MaterialIcon from "../materialIcon/MaterialIcon";
import styled from "styled-components";
import PropTypes from "prop-types";

const ToolbarItemHolder = styled.div`
  & {
    display: inline-block;
    cursor: pointer;
    min-width: 40px;
    height: 40px;
    text-align: center;
    font-size: 10px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    padding: 5px;
    margin-left: 10px;
  }
  &:hover {
    background-color: rgba(0, 0, 0, 0.4);
  }
`;

const MaterialIconText = styled.div`
  margin-top: -4px;
`;

export default class ToolbarItem extends Component {
  static propTypes = {
    icon: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      rightMenu: false
    };
  }

  render() {
    return (
      <ToolbarItemHolder onClick={this.props.onClick}>
        <MaterialIcon
          icon={this.props.icon}
          color="inherit"
          style={{ fontSize: 30 }}
        />
        <MaterialIconText>{this.props.name}</MaterialIconText>
      </ToolbarItemHolder>
    );
  }
}
