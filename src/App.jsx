import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import "./App.css";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import clubJson from "./models/okorion";
import { MobxClubModel } from "./models/mobxClubModel";
import AppBar from "@material-ui/core/AppBar";
import Drawer from "@material-ui/core/Drawer";
import Toolbar from "@material-ui/core/Toolbar";
import styled from "styled-components";
import ToolbarItem from "./components/toolbarItem/ToolbarItem";
import Dashboard from "./components/dashboard/Dashboard";
import MenuList from "@material-ui/core/MenuList";
import MenuItem from "./components/menuItem/MenuItem";
import { withNamespaces } from "react-i18next";
import { Provider } from "mobx-react";

const StyledToolbar = styled(Toolbar)`
  &&& {
    align-items: center;
    justify-content: space-between;
  }
`;
const StyledLogo = styled.img`
  margin-top: 10px;
  margin-bottom: -20px;
  margin-right: 10px;
`;

const StyledTitleLogo = styled.img`
  margin-top: 10px;
  margin-bottom: 10px;
`;

const StyledHeader = styled.div`
  font-size: 20px;
  font-weight: bolder;
  white-space: nowrap;
`;

const WideToolbarHolder = styled.div`
  & {
    display: inline-block;
  }
  @media screen and (max-width: 719px) {
    display: none !important;
  }
`;

const WideMenuHolder = styled.div`
  @media screen and (max-width: 719px) {
    display: none !important;
  }
`;

const CompactMenuHolder = styled.div`
  @media screen and (min-width: 720px) {
    display: none !important;
  }
`;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rightMenu: false
    };
    this.clubModel = MobxClubModel.create(clubJson);
    this.theme = createMuiTheme({
      ...this.clubModel.theme,
      overrides: {
        MuiDrawer: {
          paperAnchorRight: {
            top: 70,
            height: "calc(100% - 70px)"
          }
        }
      }
    });
    // this.toggleDrawer = this.toggleDrawer.bind(this);
  }

  toggleDrawer = (side, open) => {
    if (open !== undefined) {
      this.setState({
        [side]: open
      });
    } else {
      this.setState({
        [side]: !this.state[side]
      });
    }
  };

  render() {
    const { t } = this.props;
    const LogoHeight = 80;
    const LogoWidth =
      this.clubModel.logo.width * (80 / this.clubModel.logo.height);
    const Header = this.clubModel.titleLogo ? (
      <StyledTitleLogo
        src={this.clubModel.titleLogo.url}
        width={
          this.clubModel.titleLogo.width *
          (24 / this.clubModel.titleLogo.height)
        }
        height={24}
      />
    ) : (
      <StyledHeader>{this.clubModel.title}</StyledHeader>
    );
    return (
      <Router>
        <Provider clubModel={this.clubModel}>
          <MuiThemeProvider theme={this.theme}>
            <AppBar position="static">
              <StyledToolbar>
                <StyledLogo
                  src={this.clubModel.logo.url}
                  width={LogoWidth}
                  height={LogoHeight}
                />
                {Header}
                <div>
                  <WideToolbarHolder>
                    {this.clubModel.modules.map((module, index) => (
                      <ToolbarItem
                        key={"toolbarItem#" + module.name + index}
                        icon={module.name + "Icon"}
                        name={t("modules." + module.name)}
                        onClick={() => this.toggleDrawer("rightMenu")}
                      />
                    ))}
                  </WideToolbarHolder>
                  <ToolbarItem
                    icon="MenuIcon"
                    name={t("common.Menu")}
                    onClick={() => this.toggleDrawer("rightMenu")}
                  />
                  <Drawer
                    anchor="right"
                    open={this.state.rightMenu}
                    onClose={() => this.toggleDrawer("rightMenu", false)}
                  >
                    <CompactMenuHolder>
                      <MenuList>
                        <MenuItem
                          key={"menuItem#home0"}
                          icon={"HomeIcon"}
                          name={t("modules.Home")}
                          onClick={() => this.toggleDrawer("rightMenu")}
                        />
                        {this.clubModel.modules.map((module, index) => (
                          <MenuItem
                            key={"menuItem#" + module.name + index}
                            icon={module.name + "Icon"}
                            name={t("modules." + module.name)}
                            onClick={() => this.toggleDrawer("rightMenu")}
                          />
                        ))}
                      </MenuList>
                    </CompactMenuHolder>
                    <WideMenuHolder>
                      <MenuList>
                        <MenuItem
                          key={"menuItem#home0"}
                          icon={"HomeIcon"}
                          name={t("modules.Home")}
                          onClick={() => this.toggleDrawer("rightMenu")}
                        />
                        {this.clubModel.modules.map((module, index) => (
                          <MenuItem
                            key={"menuItem#" + module.name + index}
                            icon={module.name + "Icon"}
                            name={t("modules." + module.name)}
                            onClick={() => this.toggleDrawer("rightMenu")}
                          />
                        ))}
                      </MenuList>
                    </WideMenuHolder>
                  </Drawer>
                </div>
              </StyledToolbar>
            </AppBar>
            <Route exact path="/" component={Dashboard} />
            <Route path="/2019" component={Dashboard} />
          </MuiThemeProvider>
        </Provider>
      </Router>
    );
  }
}

const AppWithI18n = withNamespaces()(App); // pass `t` function to App

export default AppWithI18n;
