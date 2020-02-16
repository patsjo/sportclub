import React from "react";
import styled from "styled-components";
import useNews from "../news/useNews";
import League from "../results/League";
import useEventorEntries from "../eventor/useEventorEntries";
import EsriOSMOrienteeringMap from "../map/EsriOSMOrienteeringMap";
import WeeklyCalendar from "../calendar/weekly/WeeklyCalendar";
import { observer, inject } from "mobx-react";
import { getSnapshot } from "mobx-state-tree";
import { dashboardContents } from "../../models/globalStateModel";
import Columns from "./Columns";
import InfiniteScroll from "react-infinite-scroller";
import { Spin } from "antd";

export const ContentArea = styled.div`
  & {
    margin-top: 20px;
    margin-left: 8px;
    margin-right: 8px;
  }
`;

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

// @inject("clubModel")
// @observer
const Dashboard = inject(
  "clubModel",
  "globalStateModel"
)(
  observer(({ clubModel, globalStateModel }) => {
    const eventorEntries = useEventorEntries(globalStateModel, clubModel, globalStateModel.dashboardContentId);
    const { loadMoreCallback, newsItems } = useNews(globalStateModel, clubModel);

    const Content =
      globalStateModel.dashboardContentId === dashboardContents.home ? (
        <Columns>
          {newsItems.slice(0, 2)}
          <div column={-1} style={{ height: 400 }}>
            {clubModel.mapCenter ? (
              <EsriOSMOrienteeringMap
                key="dashboard#homeMap"
                containerId="homeMap"
                mapCenter={clubModel.mapCenter}
                graphics={getSnapshot(globalStateModel.graphics)}
                nofGraphics={globalStateModel.graphics.length}
              />
            ) : null}
          </div>
          <div column={-2} key="weeklyCalendar">
            <WeeklyCalendar />
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
      ) : globalStateModel.dashboardContentId === dashboardContents.scoringBoard ? (
        <League />
      ) : null;

    return <ContentArea>{Content}</ContentArea>;
  })
);

export default Dashboard;
