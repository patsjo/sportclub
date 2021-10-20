import { Layout, message, Spin } from 'antd';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Link } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { MobxStoreProvider } from 'utils/mobxStore';
import AppContent from './AppContent';
import Toolbar from './components/toolbar/Toolbar';
import clubJson from './models/clubs/okorion';
import { GlobalStateModel } from './models/globalStateModel';
import { MobxClubModel } from './models/mobxClubModel';
import { getLocalStorage, SessionModel } from './models/sessionModel';
import { PostJsonData } from './utils/api';

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
const StickyHolder = styled.div`
  position: -webkit-sticky;
  position: sticky;
  top: ${({ top }: IStickyHolderProps) => top}px;
  transition: top 0.3s;
  z-index: 1000;
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
const ContentArea = styled.div`
  & {
    margin-top: 24px;
    margin-left: 12px;
    margin-right: 12px;
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
const StyledTitleLogo = styled.img`
  & {
    margin-top: 10px;
    margin-bottom: 10px;
    display: inline-flex;
    cursor: pointer;
  }
  @media screen and (max-width: ${({ maxWidth }: IStyledTitleLogoProps) => maxWidth}px) {
    display: none !important;
  }
`;

interface IStyledHeaderProps {
  maxWidth: number;
}
const StyledHeader = styled.div`
  & {
    cursor: pointer;
    margin-top: 20px;
    margin-bottom: 20px;
    font-size: 20px;
    font-weight: bolder;
    white-space: nowrap;
    display: inline-flex;
    overflow: hidden;
    width: calc(100% - 190px - ${({ maxWidth }: IStyledHeaderProps) => maxWidth}px);
  }
  @media screen and (max-width: 719px) {
    width: calc(100% - ${({ maxWidth }: IStyledHeaderProps) => maxWidth}px);
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
  const scrollTop = useRef(0);
  const [scrollStickyPos, setScrollStickyPos] = useState(0);
  const sessionModel = useRef(SessionModel.create(getLocalStorage()));
  const clubModel = useRef(MobxClubModel.create(clubJson));
  const logoHeight = 80;
  const logoWidth = clubModel.current.logo.width * (80 / clubModel.current.logo.height);
  const titleWidth = clubModel.current.titleLogo
    ? clubModel.current.titleLogo.width * (24 / clubModel.current.titleLogo.height)
    : 0;
  const globalStateModel = useRef(
    GlobalStateModel.create({
      news: {
        newsItems: [],
        limit: 10,
        offset: 0,
      },
      graphics:
        clubModel.current.map?.center && clubModel.current.logo
          ? [
              {
                geometry: {
                  type: 'point',
                  longitude: clubModel.current.map?.center[0],
                  latitude: clubModel.current.map?.center[1],
                },
                attributes: { name: clubModel.current.title, type: 'logo' },
                symbol: {
                  type: 'picture-marker', // autocasts as new PictureMarkerSymbol()
                  url: clubModel.current.logo.url,
                  width: `${
                    clubModel.current.logo.width > clubModel.current.logo.height
                      ? 20
                      : (20 * clubModel.current.logo.width) / clubModel.current.logo.height
                  }px`,
                  height: `${
                    clubModel.current.logo.height > clubModel.current.logo.width
                      ? 20
                      : (20 * clubModel.current.logo.height) / clubModel.current.logo.width
                  }px`,
                },
              },
            ]
          : [],
    })
  );

  const onScroll = useCallback(() => {
    const oldScrollTop = scrollTop.current;
    const newScrollTop = window.scrollY;
    let newStickyPos = 0;

    if (newScrollTop > oldScrollTop && newScrollTop > 56) {
      newStickyPos = -56;
    }
    scrollStickyPos !== newStickyPos && setScrollStickyPos(newStickyPos);
    scrollTop.current = newScrollTop;
  }, [scrollStickyPos]);

  useEffect(() => {
    const htmlEditorModule = clubModel.current.modules.find((module) => module.name === 'HTMLEditor');

    document.title = clubModel.current.title;
    htmlEditorModule && globalStateModel.current.fetchHtmlEditorMenu(htmlEditorModule, sessionModel.current, message);
    window.addEventListener('scroll', onScroll);

    if (sessionModel.current.username && sessionModel.current.username.length > 0) {
      PostJsonData(
        clubModel.current.loginUrl,
        {
          username: sessionModel.current.username,
          password: sessionModel.current.password,
        },
        true,
        { 'X-Requested-With': 'XMLHttpRequest' },
        1
      )
        .then((json) => {
          if (json) {
            sessionModel.current.setSuccessfullyLogin(json.id, json.name, json.isAdmin, json.eventorPersonId);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [onScroll]);

  const Header = clubModel.current.titleLogo ? (
    <Link to="/">
      <StyledTitleLogo
        src={clubModel.current.titleLogo.url}
        width={titleWidth}
        height={24}
        maxWidth={76 + logoWidth + titleWidth}
      />
    </Link>
  ) : (
    <Link to="/">
      <StyledHeader maxWidth={76 + logoWidth}>
        <StyledEllipsis>{clubModel.current.title}</StyledEllipsis>
      </StyledHeader>
    </Link>
  );

  return (
    <MobxStoreProvider
      store={{
        clubModel: clubModel.current,
        sessionModel: sessionModel.current,
        globalStateModel: globalStateModel.current,
      }}
    >
      <ThemeProvider theme={clubModel.current.theme}>
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
                    <StyledLogo src={clubModel.current.logo.url} width={logoWidth} height={logoHeight} />
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
