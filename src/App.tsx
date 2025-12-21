import { Layout, message, Spin } from 'antd';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, BrowserRouter as Router } from 'react-router-dom';
import { styled, ThemeProvider } from 'styled-components';
import AppContent from './AppContent';
import Toolbar from './components/toolbar/Toolbar';
import clubJson from './models/clubs/okorion';
import { GlobalStateModel } from './models/globalStateModel';
import { IThemeProps, MobxClubModel } from './models/mobxClubModel';
import { getLocalStorage, SessionModel } from './models/sessionModel';
import { PostJsonData } from './utils/api';
import { MobxStoreProvider } from './utils/mobxStore';

const StyledLayout = styled(Layout)`
  background-color: #ffffff;
`;

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

interface IStickyHolderProps {
  top: number;
}
const StickyHolder = styled.div<IStickyHolderProps>`
  position: -webkit-sticky;
  position: sticky;
  top: ${({ top }) => top}px;
  transition: top 0.3s;
  z-index: 1000;
`;

const LayoutHeader = styled(Layout.Header)<{ theme: IThemeProps }>`
  &&& {
    line-height: unset;
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
    box-shadow:
      0px 2px 4px -1px rgba(0, 0, 0, 0.2),
      0px 4px 5px 0px rgba(0, 0, 0, 0.14),
      0px 1px 10px 0px rgba(0, 0, 0, 0.12);
  }
`;
const LayoutContent = styled(Layout.Content)`
  &&& {
    max-width: 2000px;
  }
`;
const StyledLogo = styled.img`
  &&& {
    margin-top: 10px;
    margin-bottom: -20px;
    margin-right: 10px;
    display: inline-flex;
    cursor: pointer;
  }
`;

interface IStyledTitleLogoProps {
  maxWidth: number;
}
const StyledTitleLogo = styled.img<IStyledTitleLogoProps>`
  & {
    margin-top: 10px;
    margin-bottom: 10px;
    display: inline-flex;
    cursor: pointer;
  }
  @media screen and (max-width: ${({ maxWidth }) => maxWidth}px) {
    display: none !important;
  }
`;

interface IStyledHeaderProps {
  maxWidth: number;
}
const StyledHeader = styled.div<IStyledHeaderProps>`
  & {
    cursor: pointer;
    margin-top: 20px;
    margin-bottom: 20px;
    font-size: 20px;
    font-weight: bolder;
    white-space: nowrap;
    display: inline-flex;
    overflow: hidden;
    width: calc(100% - 190px - ${({ maxWidth }) => maxWidth}px);
  }
  @media screen and (max-width: 719px) {
    width: calc(100% - ${({ maxWidth }) => maxWidth}px);
  }
`;

const StyledEllipsis = styled.div`
  & {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const App = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const scrollTop = useRef(0);
  const [scrollStickyPos, setScrollStickyPos] = useState(0);
  const sessionModel = useMemo(() => new SessionModel(getLocalStorage()), []);
  const clubModel = useMemo(() => new MobxClubModel(clubJson), []);
  const logoHeight = 80;
  const logoWidth = clubModel.logo.width * (80 / clubModel.logo.height);
  const titleWidth = clubModel.titleLogo ? clubModel.titleLogo.width * (24 / clubModel.titleLogo.height) : 0;
  const globalStateModel = useMemo(
    () =>
      new GlobalStateModel({
        news: {
          newsItems: [],
          limit: 10,
          offset: 0
        },
        graphics:
          clubModel.map?.center && clubModel.logo
            ? [
                {
                  geometry: {
                    type: 'point',
                    longitude: clubModel.map?.center[0],
                    latitude: clubModel.map?.center[1]
                  },
                  attributes: { name: clubModel.title, type: 'logo' },
                  symbol: {
                    type: 'picture-marker',
                    url: clubModel.logo.url,
                    width: clubModel.logo.width,
                    height: clubModel.logo.height
                  }
                }
              ]
            : []
      }),
    [clubModel.logo, clubModel.map?.center, clubModel.title]
  );

  const onScroll = useCallback(() => {
    const oldScrollTop = scrollTop.current;
    const newScrollTop = window.scrollY;
    let newStickyPos = 0;

    if (newScrollTop > oldScrollTop && newScrollTop > 56) {
      newStickyPos = -56;
    }
    if (scrollStickyPos !== newStickyPos) setScrollStickyPos(newStickyPos);
    scrollTop.current = newScrollTop;
  }, [scrollStickyPos]);

  useEffect(() => {
    const htmlEditorModule = clubModel.modules.find(module => module.name === 'HTMLEditor');
    const filesModule = clubModel.modules.find(module => module.name === 'Files');

    document.title = clubModel.title;
    globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, messageApi);
    window.addEventListener('scroll', onScroll);

    if (sessionModel.username && sessionModel.username.length > 0) {
      PostJsonData<{ id: string; name: string; isAdmin: boolean; eventorPersonId: number }>(
        clubModel.loginUrl,
        {
          username: sessionModel.username,
          password: sessionModel.password
        },
        true,
        { 'X-Requested-With': 'XMLHttpRequest' },
        1
      )
        .then(json => {
          if (json) {
            sessionModel.setSuccessfullyLogin(json.id, json.name, json.isAdmin, json.eventorPersonId);
          }
        })
        .catch(error => {
          console.error(error);
        });
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [clubModel.loginUrl, clubModel.modules, clubModel.title, globalStateModel, messageApi, onScroll, sessionModel]);

  const Header = clubModel.titleLogo ? (
    <Link to="/">
      <StyledTitleLogo
        src={clubModel.titleLogo.url}
        width={titleWidth}
        height={24}
        maxWidth={76 + logoWidth + titleWidth}
      />
    </Link>
  ) : (
    <Link to="/">
      <StyledHeader maxWidth={76 + logoWidth}>
        <StyledEllipsis>{clubModel.title}</StyledEllipsis>
      </StyledHeader>
    </Link>
  );

  return (
    <MobxStoreProvider
      store={{
        clubModel: clubModel,
        sessionModel: sessionModel,
        globalStateModel: globalStateModel
      }}
    >
      {contextHolder}
      <ThemeProvider theme={clubModel.theme}>
        <Suspense
          fallback={
            <SpinnerDiv>
              <Spin size="large" />
            </SpinnerDiv>
          }
        >
          <Router>
            <StyledLayout>
              <StickyHolder top={scrollStickyPos}>
                <LayoutHeader>
                  <Link to="/">
                    <StyledLogo src={clubModel.logo.url} width={logoWidth} height={logoHeight} />
                  </Link>
                  {Header}
                  <Toolbar />
                </LayoutHeader>
              </StickyHolder>
              <LayoutContent>
                <AppContent />
              </LayoutContent>
            </StyledLayout>
          </Router>
        </Suspense>
      </ThemeProvider>
    </MobxStoreProvider>
  );
};

export default App;
