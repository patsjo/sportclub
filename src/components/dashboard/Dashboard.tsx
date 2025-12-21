import { observer } from 'mobx-react';
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import InfiniteScroll from '../../utils/infinityScroll';
import { useMobxStore } from '../../utils/mobxStore';
import WeeklyCalendar from '../calendar/weekly/WeeklyCalendar';
import useEventorEntries from '../eventor/useEventorEntries';
import ShowFacebookTimeline from '../facebook/ShowFacebookTimeline';
import OSMOrienteeringMap from '../map/OSMOrienteeringMap';
import { mapProjection } from '../map/useOpenLayersMap';
import useBanners from '../news/useBanners';
import useNews from '../news/useNews';
import SponsorsSlideshow from '../sponsors/SponsorsSlideshow';
import Columns from './columns/Columns';
import { ChildContainer } from './columns/mapNodesToColumns';

const Dashboard = observer(() => {
  const { clubModel } = useMobxStore();
  const eventorEntries = useEventorEntries(clubModel);
  const { loadMoreCallback, newsItems } = useNews(true);
  const bannerItems = useBanners();
  const showSponsors = clubModel.sponsors ? clubModel.sponsors.some(s => s.active) : false;

  return (
    <InfiniteScroll key="dashboard#InfiniteScroll#home" loadMore={loadMoreCallback}>
      <Columns key="dashboard#columns#home">
        {newsItems.slice(0, 2)}
        {bannerItems}
        <ChildContainer
          key="dashboard#weeklyCalendarContainer"
          preferredColumn="secondRightFixed"
          paddingBottom={24}
          preferredHeight={360}
        >
          <WeeklyCalendar key="dashboard#weeklyCalendar" />
        </ChildContainer>
        {clubModel.map?.center ? (
          <ChildContainer
            key="dashboard#homeMapContainer"
            preferredColumn="rightFixed"
            paddingBottom={24}
            preferredHeight={400}
          >
            <OSMOrienteeringMap
              key="dashboard#homeMap"
              useAllWidgets
              height="400px"
              width="100%"
              containerId="homeMap"
              onHighlightClick={(graphic: Feature<Point>) => {
                const coordinates = toLonLat(graphic.getGeometry()!.getCoordinates(), mapProjection);
                const longitude = coordinates[0];
                const latitude = coordinates[1];
                const win = window.open(
                  `https://maps.google.com/maps?saddr=&daddr=N${latitude},E${longitude}`,
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
          <ChildContainer
            key="dashboard#facebookTimelineContainer"
            preferredColumn="secondRightFixed"
            paddingBottom={24}
            preferredHeight={400}
          >
            <ShowFacebookTimeline key="dashboard#facebookTimeline" />
          </ChildContainer>
        ) : null}
        {showSponsors ? (
          <ChildContainer key="dashboard#sponsorsSlideshowContainer" preferredColumn="rightFixed" preferredHeight={130}>
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
