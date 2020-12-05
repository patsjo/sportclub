import React, { useCallback } from 'react';
import { dashboardContents } from '../../models/globalStateModel';
import NewsItem from './NewsItem';
import { Spin } from 'antd';
import styled from 'styled-components';
import { PostJsonData } from '../../utils/api';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const useNews = (globalStateModel, clubModel) => {
  const [firstLoading, setFirstLoading] = React.useState(true);

  const loadNews = useCallback(() => {
    const url = clubModel.modules.find((module) => module.name === 'News').queryUrl;
    const { limit, offset } = globalStateModel.news;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let startDate = new Date(today.valueOf());
    startDate.setDate(startDate.getDate() - 180);
    const iStartDate = startDate.toISOString().substr(0, 10);
    const data = {
      iStartDate: globalStateModel.startDate ? globalStateModel.startDate : iStartDate,
      iEndDate: globalStateModel.endDate ? globalStateModel.endDate : '',
      iNewsTypeID: globalStateModel.type ? globalStateModel.type : '',
      offset: offset,
      limit: limit,
    };

    PostJsonData(url, data, false).then((json) => {
      // eslint-disable-next-line eqeqeq
      const newArray = json != undefined ? json : [];
      newArray.forEach((newsItem) => {
        newsItem.link = decodeURIComponent(newsItem.link);
      });
      globalStateModel.news.addNewsItemsToBottom(newArray);
      setFirstLoading(false);
    });
  }, [globalStateModel.dashboardContentId, globalStateModel.type]);

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
  }, [globalStateModel.dashboardContentId, globalStateModel.type]);

  const { newsItems } = globalStateModel.news;

  return {
    loadMoreCallback: loadNews,
    newsItems: !firstLoading
      ? newsItems.map((newsObject) => (
          <NewsItem
            key={'newsObject#' + newsObject.id}
            column={globalStateModel.dashboardContentId === dashboardContents.home ? 50 : undefined}
            newsObject={newsObject}
          />
        ))
      : [
          <SpinnerDiv
            key="newsObject#spinner"
            column={globalStateModel.dashboardContentId === dashboardContents.home ? 50 : undefined}
          >
            <Spin size="large" />
          </SpinnerDiv>,
        ],
  };
};

export default useNews;
