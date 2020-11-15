import React, { lazy } from 'react';
import styled from 'styled-components';
import useBanners from '../news/useBanners';
import useNews from '../news/useNews';
import useEsriMap from '../map/useEsriMap';
import useEventorEntries from '../eventor/useEventorEntries';
import EsriOSMOrienteeringMap from '../map/EsriOSMOrienteeringMap';
import WeeklyCalendar from '../calendar/weekly/WeeklyCalendar';
import SponsorsSlideshow from '../sponsors/SponsorsSlideshow';
import { observer, inject } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { dashboardContents } from '../../models/globalStateModel';
import Columns from './Columns';
import InfiniteScroll from 'react-infinite-scroller';
import { Spin } from 'antd';
import HtmlEditor from '../htmlEditor/HtmlEditor';
import ShowFacebookTimeline from '../facebook/ShowFacebookTimeline';
const League = lazy(() => import('../results/League'));
const ViewResults = lazy(() => import('../results/ViewResults'));
const ResultsFees = lazy(() => import('../results/ResultsFees'));
const MonthlyCalendar = lazy(() => import('../calendar/monthly/MonthlyCalendar'));
const AllSponsors = lazy(() => import('../sponsors/AllSponsors'));

export const ContentArea = styled.div`
  & {
    margin-top: 24px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;
const NoMonthlyContainer = styled.div`
  & {
    display: block;
  }
  @media screen and (min-width: 1000px) {
    display: none !important;
  }
`;

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

// @inject("clubModel")
// @observer
const Dashboard = inject(
  'clubModel',
  'globalStateModel'
)(
  observer(({ clubModel, globalStateModel }) => {
    const eventorEntries = useEventorEntries(globalStateModel, clubModel, globalStateModel.dashboardContentId);
    const { loadMoreCallback, newsItems } = useNews(globalStateModel, clubModel);
    const bannerItems = useBanners(globalStateModel, clubModel);
    const isUsingEsriMap = useEsriMap(globalStateModel);

    const Content =
      globalStateModel.dashboardContentId === dashboardContents.home ? (
        <Columns>
          {newsItems.slice(0, 2)}
          {bannerItems}
          <div column={-2} key="weeklyCalendar" style={{ marginBottom: 12 }}>
            <WeeklyCalendar />
          </div>
          <div key="dashboard#homeMapContainer" column={-1} style={{ height: 400, marginBottom: 12 }}>
            {isUsingEsriMap && clubModel.mapCenter ? (
              <EsriOSMOrienteeringMap
                key="dashboard#homeMap"
                containerId="homeMap"
                mapCenter={clubModel.mapCenter}
                graphics={getSnapshot(globalStateModel.graphics)}
                nofGraphics={globalStateModel.graphics.length}
                onHighlightClick={(graphicLayer, graphic) => {
                  const longitude = graphic.geometry.longitude;
                  const latitude = graphic.geometry.latitude;
                  const win = window.open(
                    `http://maps.google.com/maps?saddr=&daddr=N${latitude},E${longitude}`,
                    '_blank'
                  );
                  if (win) {
                    win.focus();
                  }
                }}
              />
            ) : null}
          </div>
          {clubModel.facebookUrl ? (
            <div column={-2} key="facebookTimeline" style={{ marginBottom: 12 }}>
              <ShowFacebookTimeline />
            </div>
          ) : null}
          <div column={-1}>
            <SponsorsSlideshow />
          </div>
          {newsItems.slice(2)}
          {eventorEntries}
        </Columns>
      ) : globalStateModel.dashboardContentId === dashboardContents.news ? (
        <InfiniteScroll
          pageStart={0}
          loadMore={loadMoreCallback}
          hasMore={globalStateModel.news.hasMoreItems}
          loader={
            <SpinnerDiv>
              <Spin size="large" />
            </SpinnerDiv>
          }
        >
          <Columns>{newsItems}</Columns>
        </InfiniteScroll>
      ) : globalStateModel.dashboardContentId === dashboardContents.calendar ? (
        <>
          <NoMonthlyContainer>
            <WeeklyCalendar />
          </NoMonthlyContainer>
          <MonthlyCalendar />
        </>
      ) : globalStateModel.dashboardContentId === dashboardContents.scoringBoard ? (
        <League />
      ) : globalStateModel.dashboardContentId === dashboardContents.results ? (
        <ViewResults key="clubViewResult" isIndividual={false} />
      ) : globalStateModel.dashboardContentId === dashboardContents.individualResults ? (
        <ViewResults key="individualViewResult" isIndividual={true} />
      ) : globalStateModel.dashboardContentId === dashboardContents.resultsFees ? (
        <ResultsFees key="resultsFees" />
      ) : globalStateModel.dashboardContentId === dashboardContents.htmlEditor ? (
        <HtmlEditor key="htmlEditor" loadPageId={globalStateModel.pageId} />
      ) : globalStateModel.dashboardContentId === dashboardContents.ourSponsors ? (
        <AllSponsors key="individualViewResult" isIndividual />
      ) : null;

    return <ContentArea>{Content}</ContentArea>;
  })
);

export default Dashboard;
