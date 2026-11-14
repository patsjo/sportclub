import { Layout, message, Spin } from 'antd';
import { observer } from 'mobx-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, BrowserRouter as Router } from 'react-router-dom';
import { styled, ThemeProvider } from 'styled-components';
import AppContent from './AppContent';
import Toolbar from './components/toolbar/Toolbar';
import clubJson from './models/clubs/okorion';
import { GlobalStateModel } from './models/globalStateModel';
import { IThemeProps, MobxClubModel } from './models/mobxClubModel';
import { getLocalStorage, SessionModel } from './models/sessionModel';
import { SocialModel } from './models/socialModel';
import { onLoginProvider, startGoogleAutoLogin } from './utils/googleAutoLogin';
import { restoreLogin } from './utils/loginHelper';
import { MobxStoreProvider } from './utils/mobxStore';

const LoginForm = lazy(() => import('./components/login/LoginForm'));

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

const LayoutHeader = styled(Layout.Header)<{ theme: IThemeProps; $dark?: boolean }>`
  &&& {
    line-height: unset;
    color: ${props => (props.$dark ? '#ffffff' : props.theme.palette.primary.contrastText)};
    background-color: ${props => (props.$dark ? '#000000' : props.theme.palette.primary.main)};
    transition:
      background-color 0.3s,
      color 0.3s;
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
const LayoutContent = styled(Layout.Content)<{ $fullWidth?: boolean }>`
  &&& {
    max-width: ${({ $fullWidth }) => ($fullWidth ? 'none' : '2000px')};
  }
`;
const StyledLogo = styled.img<{ $grayscale?: boolean }>`
  &&& {
    filter: ${({ $grayscale }) => ($grayscale ? 'grayscale(1)' : 'none')};
    transition: filter 0.3s;
    margin-top: 10px;
    margin-bottom: -20px;
    margin-right: 10px;
    display: inline-flex;
    cursor: pointer;
  }
`;

interface IStyledTitleLogoProps {
  maxwidth: number;
}
const StyledTitleLogo = styled.img<IStyledTitleLogoProps & { $grayscale?: boolean }>`
  & {
    filter: ${({ $grayscale }) => ($grayscale ? 'grayscale(1)' : 'none')};
    margin-top: 10px;
    margin-bottom: 10px;
    display: inline-flex;
    cursor: pointer;
  }
  @media screen and (max-width: ${({ maxwidth }) => maxwidth}px) {
    display: none !important;
  }
`;

interface IStyledHeaderProps {
  maxwidth: number;
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
    width: calc(100% - 190px - ${({ maxwidth }) => maxwidth}px);
  }
  @media screen and (max-width: 719px) {
    width: calc(100% - ${({ maxwidth }) => maxwidth}px);
  }
`;

const StyledEllipsis = styled.div`
  & {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

// observer, so the toolbar follows globalStateModel.darkHeader
const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const scrollTop = useRef(0);
  const [scrollStickyPos, setScrollStickyPos] = useState(0);
  const sessionModel = useMemo(() => new SessionModel(getLocalStorage()), []);
  const clubModel = useMemo(() => new MobxClubModel(clubJson), []);
  const socialModel = useMemo(() => new SocialModel(clubModel, sessionModel), [clubModel, sessionModel]);
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
    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [onScroll]);

  useEffect(() => {
    // A Google/Facebook login that returns, the saved token, or a password saved by an old version
    const onLoggedIn = () => {
      onLoginProvider(sessionModel.provider);
      if (sessionModel.isAdmin && sessionModel.pendingAccessRequests > 0)
        messageApi.info(t('login.PendingAccessRequests', { count: sessionModel.pendingAccessRequests }), 8);
    };
    restoreLogin(clubModel, sessionModel, messageApi, t).then(() => {
      onLoggedIn();
      // Not logged in, Google logs in the account chosen before automatically (or asks the first time)
      startGoogleAutoLogin(clubModel, sessionModel, onLoggedIn, error =>
        console.warn(`The automatic Google login failed (${clubModel.loginUrl}): ${error}`)
      );
    });
    // Only when the page starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubModel, sessionModel]);

  useEffect(() => {
    const htmlEditorModule = clubModel.modules.find(module => module.name === 'HTMLEditor');
    const filesModule = clubModel.modules.find(module => module.name === 'Files');

    document.title = clubModel.title;
    globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, messageApi);
  }, [clubModel.modules, clubModel.title, globalStateModel, messageApi, sessionModel]);

  const Header = clubModel.titleLogo ? (
    <Link to="/">
      <StyledTitleLogo
        $grayscale={globalStateModel.darkHeader}
        src={clubModel.titleLogo.url}
        width={titleWidth}
        height={24}
        maxwidth={76 + logoWidth + titleWidth}
      />
    </Link>
  ) : (
    <Link to="/">
      <StyledHeader maxwidth={76 + logoWidth}>
        <StyledEllipsis>{clubModel.title}</StyledEllipsis>
      </StyledHeader>
    </Link>
  );

  return (
    <MobxStoreProvider
      store={{
        clubModel: clubModel,
        sessionModel: sessionModel,
        globalStateModel: globalStateModel,
        socialModel: socialModel
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
                <LayoutHeader $dark={globalStateModel.darkHeader}>
                  <Link to="/">
                    <StyledLogo
                      $grayscale={globalStateModel.darkHeader}
                      src={clubModel.logo.url}
                      width={logoWidth}
                      height={logoHeight}
                    />
                  </Link>
                  {Header}
                  <Toolbar />
                </LayoutHeader>
              </StickyHolder>
              <LayoutContent $fullWidth={globalStateModel.fullWidthPage}>
                <AppContent />
              </LayoutContent>
            </StyledLayout>
            {globalStateModel.loginModalVisible ? (
              <LoginForm open={true} onClose={() => globalStateModel.setLoginModalVisible(false)} />
            ) : null}
          </Router>
        </Suspense>
      </ThemeProvider>
    </MobxStoreProvider>
  );
});

export default App;
