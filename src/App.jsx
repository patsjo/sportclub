import React, { Component, Suspense, lazy } from 'react';
import clubJson from './models/okorion';
import { MobxClubModel } from './models/mobxClubModel';
import { SessionModel, getLocalStorage } from './models/sessionModel';
import { GlobalStateModel } from './models/globalStateModel';
import { Layout, Spin, message } from 'antd';
import styled, { ThemeProvider } from 'styled-components';
import Toolbar from './components/toolbar/Toolbar';
import { Provider } from 'mobx-react';
import { PostJsonData } from './utils/api';
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));

const StyledLayout = styled(Layout)`
  background-color: #ffffff;
`;

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const LayoutHeader = styled(Layout.Header)`
  &&& {
    color: ${(props) => props.theme.palette.primary.contrastText};
    background-color: ${(props) => props.theme.palette.primary.main};
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
  @media screen and (max-width: ${(props) => props.maxWidth}px) {
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
    width: calc(100% - 190px - ${(props) => props.maxWidth}px);
  }
  @media screen and (max-width: 719px) {
    width: calc(100% - ${(props) => props.maxWidth}px);
  }
`;

const StyledEllipsis = styled.div`
  & {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

class App extends Component {
  constructor(props) {
    super(props);
    this.sessionModel = SessionModel.create(getLocalStorage());
    this.clubModel = MobxClubModel.create(clubJson);
    this.globalStateModel = GlobalStateModel.create({
      news: {
        newsItems: [],
        limit: 12,
        offset: 0,
        hasMoreItems: true,
      },
      graphics:
        this.clubModel.mapCenter && this.clubModel.logo
          ? [
              {
                geometry: {
                  type: 'point',
                  longitude: this.clubModel.mapCenter[0],
                  latitude: this.clubModel.mapCenter[1],
                },
                attributes: { name: this.clubModel.title, type: 'logo' },
                symbol: {
                  type: 'picture-marker', // autocasts as new PictureMarkerSymbol()
                  url: this.clubModel.logo.url,
                  width: `${
                    this.clubModel.logo.width > this.clubModel.logo.height
                      ? 20
                      : (20 * this.clubModel.logo.width) / this.clubModel.logo.height
                  }px`,
                  height: `${
                    this.clubModel.logo.height > this.clubModel.logo.width
                      ? 20
                      : (20 * this.clubModel.logo.height) / this.clubModel.logo.width
                  }px`,
                },
              },
            ]
          : [],
    });
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
          password: this.sessionModel.password,
        },
        true,
        { 'X-Requested-With': 'XMLHttpRequest' },
        1
      )
        .then((json) => {
          if (json) {
            this.sessionModel.setSuccessfullyLogin(json.id, json.name, json.isAdmin, json.eventorPersonId);
          }
        })
        .catch(() => {});
    }

    const htmlEditorModule = this.clubModel.modules.find((module) => module.name === 'HTMLEditor');
    this.globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, this.sessionModel, message);
  }

  render() {
    const logoHeight = 80;
    const logoWidth = this.clubModel.logo.width * (80 / this.clubModel.logo.height);
    const titleWidth = this.clubModel.titleLogo
      ? this.clubModel.titleLogo.width * (24 / this.clubModel.titleLogo.height)
      : 0;
    const Header = this.clubModel.titleLogo ? (
      <StyledTitleLogo
        src={this.clubModel.titleLogo.url}
        width={titleWidth}
        height={24}
        maxWidth={76 + logoWidth + titleWidth}
      />
    ) : (
      <StyledHeader maxWidth={76 + logoWidth}>
        <StyledEllipsis>{this.clubModel.title}</StyledEllipsis>
      </StyledHeader>
    );

    return (
      <Provider clubModel={this.clubModel} sessionModel={this.sessionModel} globalStateModel={this.globalStateModel}>
        <ThemeProvider theme={this.clubModel.theme}>
          <StyledLayout>
            <LayoutHeader>
              <StyledLogo src={this.clubModel.logo.url} width={logoWidth} height={logoHeight} />
              {Header}
              <Toolbar />
            </LayoutHeader>
            <LayoutContent>
              <Suspense
                fallback={
                  <SpinnerDiv>
                    <Spin size="large" />
                  </SpinnerDiv>
                }
              >
                <Dashboard />
              </Suspense>
            </LayoutContent>
          </StyledLayout>
        </ThemeProvider>
      </Provider>
    );
  }
}

export default App;
