import React, { lazy } from 'react';
import styled from 'styled-components';
import useBanners from '../news/useBanners';
import useNews from '../news/useNews';
import useEventorEntries from '../eventor/useEventorEntries';
import EsriOSMOrienteeringMap from '../map/EsriOSMOrienteeringMap';
import WeeklyCalendar from '../calendar/weekly/WeeklyCalendar';
import SponsorsSlideshow from '../sponsors/SponsorsSlideshow';
import { observer, inject } from 'mobx-react';
import Columns from './columns/Columns';
import InfiniteScroll from '../../utils/infinityScroll';
import { Spin } from 'antd';
import ShowFacebookTimeline from '../facebook/ShowFacebookTimeline';

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
    const eventorEntries = useEventorEntries(clubModel);
    const { loadMoreCallback, newsItems } = useNews(globalStateModel, clubModel);
    const bannerItems = useBanners(clubModel);
    const showSponsors = clubModel.sponsors ? clubModel.sponsors.some((s) => s.active) : false;

    const Content = (
      <InfiniteScroll
        key="InfiniteScroll#home"
        pageStart={0}
        loadMore={loadMoreCallback}
        hasMore={globalStateModel.news.hasMoreItems}
        loader={
          <SpinnerDiv key="InfiniteScrollSpinner#home">
            <Spin size="large" />
          </SpinnerDiv>
        }
      >
        <Columns key="columns#home">
          {newsItems.slice(0, 2)}
          {bannerItems}
          <div column={-2} key="weeklyCalendar" style={{ marginBottom: 12 }}>
            <WeeklyCalendar />
          </div>
          {clubModel.map?.center ? (
            <EsriOSMOrienteeringMap
              key="dashboard#homeMap"
              column={-1}
              height="400px"
              width="100%"
              useAllWidgets
              globalStateModel={globalStateModel}
              clubModel={clubModel}
              containerId="homeMap"
              onHighlightClick={(graphic) => {
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
          {newsItems.slice(2, 5)}
          {clubModel.facebookUrl ? (
            <div column={-2} key="facebookTimeline" style={{ marginBottom: 12 }}>
              <ShowFacebookTimeline />
            </div>
          ) : null}
          {showSponsors ? (
            <div key="sponsorsSlideshow" column={-1}>
              <SponsorsSlideshow />
            </div>
          ) : null}
          {eventorEntries}
          {newsItems.slice(5)}
        </Columns>
      </InfiniteScroll>
    );

    return Content;
  })
);

export default Dashboard;
