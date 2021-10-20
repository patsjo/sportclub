import { observer } from 'mobx-react';
import React from 'react';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import InfiniteScroll from '../../utils/infinityScroll';
import WeeklyCalendar from '../calendar/weekly/WeeklyCalendar';
import useEventorEntries from '../eventor/useEventorEntries';
import ShowFacebookTimeline from '../facebook/ShowFacebookTimeline';
import EsriOSMOrienteeringMap from '../map/EsriOSMOrienteeringMap';
import useBanners from '../news/useBanners';
import useNews from '../news/useNews';
import SponsorsSlideshow from '../sponsors/SponsorsSlideshow';
import Columns from './columns/Columns';
import { ChildContainer } from './columns/mapNodesToColumns';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const Dashboard = observer(() => {
  const { clubModel, globalStateModel } = useMobxStore();
  const eventorEntries = useEventorEntries(clubModel);
  const { loadMoreCallback, newsItems } = useNews(true);
  const bannerItems = useBanners();
  const showSponsors = clubModel.sponsors ? clubModel.sponsors.some((s) => s.active) : false;

  return (
    <InfiniteScroll key="dashboard#InfiniteScroll#home" loadMore={loadMoreCallback}>
      <Columns key="dashboard#columns#home">
        {newsItems.slice(0, 2)}
        {bannerItems}
        <ChildContainer column={-2} key="dashboard#weeklyCalendarContainer" marginBottom={12}>
          <WeeklyCalendar key="dashboard#weeklyCalendar" />
        </ChildContainer>
        {clubModel.map?.center ? (
          <ChildContainer column={-1} key="dashboard#homeMapContainer" marginBottom={12}>
            <EsriOSMOrienteeringMap
              key="dashboard#homeMap"
              height="400px"
              width="100%"
              useAllWidgets
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
          </ChildContainer>
        ) : null}
        {newsItems.slice(2, 5)}
        {clubModel.facebookUrl ? (
          <ChildContainer column={-2} key="dashboard#facebookTimelineContainer" marginBottom={12}>
            <ShowFacebookTimeline key="dashboard#facebookTimeline" />
          </ChildContainer>
        ) : null}
        {showSponsors ? (
          <ChildContainer key="dashboard#sponsorsSlideshowContainer" column={-1}>
            <SponsorsSlideshow key="dashboard#sponsorsSlideshow" />
          </ChildContainer>
        ) : null}
        {eventorEntries}
        {newsItems.slice(5)}
      </Columns>
    </InfiniteScroll>
  );
});

export default Dashboard;
