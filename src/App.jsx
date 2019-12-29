import React, { Component } from "react";
import clubJson from "./models/varendgn";
import { MobxClubModel } from "./models/mobxClubModel";
import { SessionModel, getLocalStorage } from "./models/sessionModel";
import { GlobalStateModel } from "./models/globalStateModel";
import { Layout } from "antd";
import styled, { ThemeProvider } from "styled-components";
import Dashboard from "./components/dashboard/Dashboard";
import Toolbar from "./components/toolbar/Toolbar";
import { Provider } from "mobx-react";
import { PostJsonData } from "./utils/api";

const StyledLayout = styled(Layout)`
  background-color: #ffffff;
`;

const LayoutHeader = styled(Layout.Header)`
  &&& {
    color: ${props => props.theme.palette.primary.contrastText};
    background-color: ${props => props.theme.palette.primary.main};
    padding-left: 10px;
    padding-right: 10px;
    display: flex;
    box-sizing: border-box;
    flex-shrink: 0;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: justify;
    justify-content: space-between;
    box-shadow: 0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14),
      0px 1px 10px 0px rgba(0, 0, 0, 0.12);
  }
`;
const { Content: LayoutContent } = Layout;
const StyledLogo = styled.img`
  &&& {
    margin-top: 10px;
    margin-bottom: -20px;
    margin-right: 10px;
    display: inline-flex;
  }
`;

const StyledTitleLogo = styled.img`
  & {
    margin-top: 10px;
    margin-bottom: 10px;
    display: inline-flex;
  }
  @media screen and (max-width: ${props => props.maxWidth}px) {
    display: none !important;
  }
`;

const StyledHeader = styled.div`
  & {
    margin-top: 20px;
    margin-bottom: 20px;
    font-size: 20px;
    font-weight: bolder;
    white-space: nowrap;
    display: inline-flex;
    overflow: hidden;
    max-width: 300px;
    text-overflow: ellipsis;
  }
`;

class App extends Component {
  constructor(props) {
    super(props);
    this.sessionModel = SessionModel.create(getLocalStorage());
    this.globalStateModel = GlobalStateModel.create({
      news: {
        newsItems: [],
        limit: 12,
        offset: 0,
        hasMoreItems: true
      }
    });
    this.clubModel = MobxClubModel.create(clubJson);
    document.title = this.clubModel.title;
    // this.theme = createMuiTheme({
    //   ...this.clubModel.theme,
    //   overrides: {
    //     MuiDrawer: {
    //       paperAnchorRight: {
    //         top: 70,
    //         height: "calc(100% - 70px)"
    //       }
    //     }
    //   }
    // });
    if (this.sessionModel.username && this.sessionModel.username.length > 0) {
      PostJsonData(
        this.clubModel.loginUrl,
        {
          username: this.sessionModel.username,
          password: this.sessionModel.password
        },
        true,
        { "X-Requested-With": "XMLHttpRequest" },
        1
      )
        .then(json => {
          if (json) {
            this.sessionModel.setSuccessfullyLogin(json.id, json.name, json.isAdmin);
          }
        })
        .catch(() => {});
    }
  }

  render() {
    const LogoHeight = 80;
    const LogoWidth = this.clubModel.logo.width * (80 / this.clubModel.logo.height);
    const Header = this.clubModel.titleLogo ? (
      <StyledTitleLogo
        src={this.clubModel.titleLogo.url}
        width={this.clubModel.titleLogo.width * (24 / this.clubModel.titleLogo.height)}
        height={24}
        maxWidth={260 + this.clubModel.titleLogo.width * (24 / this.clubModel.titleLogo.height)}
      />
    ) : (
      <StyledHeader>{this.clubModel.title}</StyledHeader>
    );

    return (
      <Provider clubModel={this.clubModel} sessionModel={this.sessionModel} globalStateModel={this.globalStateModel}>
        <ThemeProvider theme={this.clubModel.theme}>
          <StyledLayout>
            <LayoutHeader>
              <StyledLogo src={this.clubModel.logo.url} width={LogoWidth} height={LogoHeight} />
              {Header}
              <Toolbar />
            </LayoutHeader>
            <LayoutContent>
              <Dashboard />
            </LayoutContent>
          </StyledLayout>
        </ThemeProvider>
      </Provider>
    );
  }
}

export default App;
