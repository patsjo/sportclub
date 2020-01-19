import React from "react";
import { dashboardContents } from "../../models/globalStateModel";
import NewsItem from "./NewsItem";
import { Spin } from "antd";
import styled from "styled-components";
import { PostJsonData } from "../../utils/api";

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const useNews = (globalStateModel, clubModel) => {
  const [firstLoading, setFirstLoading] = React.useState(true);

  const loadNews = () => {
    const url = clubModel.modules.find(module => module.name === "News").queryUrl;
    const { limit, offset } = globalStateModel.news;
    const data = {
      iStartDate: globalStateModel.startDate ? globalStateModel.startDate : "",
      iEndDate: globalStateModel.endDate ? globalStateModel.endDate : "",
      iNewsTypeID: globalStateModel.type ? globalStateModel.type : "",
      offset: offset,
      limit: limit
    };

    PostJsonData(url, data, false).then(json => {
      // eslint-disable-next-line eqeqeq
      const newArray = json != undefined ? json : [];
      newArray.forEach(newsItem => {
        newsItem.link = decodeURIComponent(newsItem.link);
      });
      globalStateModel.news.addNewsItemsToBottom(newArray);
      setFirstLoading(false);
    });
  };

  React.useEffect(() => {
    if (
      globalStateModel.dashboardContentId !== dashboardContents.home &&
      globalStateModel.dashboardContentId !== dashboardContents.news
    ) {
      return;
    }
    loadNews();
    return () => {
      globalStateModel.news.reset();
    };
  }, [globalStateModel.dashboardContentId]);

  const { newsItems } = globalStateModel.news;

  return {
    loadMoreCallback: loadNews,
    newsItems: !firstLoading
      ? newsItems.map(newsObject => <NewsItem key={"newsObject#" + newsObject.id} newsObject={newsObject} />)
      : [
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        ]
  };
};

export default useNews;
