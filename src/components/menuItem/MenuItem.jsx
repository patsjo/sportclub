import React, { Component } from "react";
import MaterialIcon from "../materialIcon/MaterialIcon";
// import styled from "styled-components";
import PropTypes from "prop-types";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

export default class StyledMenuItem extends Component {
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
      <MenuItem onClick={this.props.onClick}>
        <ListItemIcon>
          <MaterialIcon
            icon={this.props.icon}
            color="inherit"
            style={{ fontSize: 30 }}
          />
        </ListItemIcon>
        <ListItemText inset primary={this.props.name} />
      </MenuItem>
    );
  }
}
