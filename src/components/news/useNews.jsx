import React, { useCallback } from 'react';
import NewsItem from './NewsItem';
import { Spin } from 'antd';
import styled from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useLocation } from 'react-router-dom';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const useNews = (globalStateModel, clubModel) => {
  const [firstLoading, setFirstLoading] = React.useState(true);
  const location = useLocation();

  const loadNews = useCallback(
    () =>
      new Promise((resolve, reject) => {
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

        PostJsonData(url, data, false)
          .then((json) => {
            // eslint-disable-next-line eqeqeq
            const newArray = json != undefined ? json : [];
            newArray.forEach((newsItem) => {
              newsItem.link = decodeURIComponent(newsItem.link);
            });
            globalStateModel.news.addNewsItemsToBottom(newArray);
            setFirstLoading(false);
            resolve();
          })
          .catch(() => {
            reject();
          });
      }),
    [location.pathname, globalStateModel.type]
  );

  React.useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/news') {
      return;
    }
    loadNews();
    return () => {
      globalStateModel.news.reset();
    };
  }, [location.pathname, globalStateModel.type]);

  const { newsItems } = globalStateModel.news;

  return {
    loadMoreCallback: loadNews,
    newsItems: !firstLoading
      ? newsItems.map((newsObject) => (
          <NewsItem
            key={'newsObject#' + newsObject.id}
            column={location.pathname === '/' ? 50 : undefined}
            newsObject={newsObject}
          />
        ))
      : [
          <SpinnerDiv key="newsObject#spinner" column={location.pathname === '/' ? 50 : undefined}>
            <Spin size="large" />
          </SpinnerDiv>,
        ],
  };
};

export default useNews;
