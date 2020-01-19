import React from "react";
import styled from "styled-components";
import useNews from "../news/useNews";
import League from "../results/League";
import useEventorEntries from "../eventor/useEventorEntries";
import { observer, inject } from "mobx-react";
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
    const eventorEntries = useEventorEntries(clubModel, globalStateModel.dashboardContentId);
    const { loadMoreCallback, newsItems } = useNews(globalStateModel, clubModel);

    const Content =
      globalStateModel.dashboardContentId === dashboardContents.home ? (
        <Columns>
          {newsItems}
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
