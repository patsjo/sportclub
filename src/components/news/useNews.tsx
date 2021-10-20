import { Spin } from 'antd';
import { IChildContainerProps } from 'components/dashboard/columns/mapNodesToColumns';
import { INewsItemSnapshotIn } from 'models/newsModel';
import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { PostJsonData } from '../../utils/api';
import NewsItem from './NewsItem';

const SpinnerDiv = styled.div<IChildContainerProps>`
  text-align: center;
  width: 100%;
`;

const useNews = (withinDashboard: boolean) => {
  const { globalStateModel, clubModel } = useMobxStore();
  const [firstLoading, setFirstLoading] = React.useState(true);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const loadNews = useCallback(
    (): Promise<boolean> =>
      new Promise((resolve, reject) => {
        if (loading) {
          resolve(true);
          return;
        }
        const url = clubModel.modules.find((module) => module.name === 'News')?.queryUrl;
        if (!url) return;

        setLoading(true);
        const limit = globalStateModel.news?.limit;
        const offset = globalStateModel.news?.offset;
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const startDate = new Date(today.valueOf());
        startDate.setDate(startDate.getDate() - 180);
        const iStartDate = startDate.toISOString().substr(0, 10);
        const data = {
          iStartDate: withinDashboard
            ? iStartDate
            : globalStateModel.startDate
            ? globalStateModel.startDate
            : '1900-01-01',
          iEndDate: withinDashboard ? '' : globalStateModel.endDate ? globalStateModel.endDate : '2099-12-31',
          iNewsTypeID: globalStateModel.type ? globalStateModel.type : '',
          offset: offset,
          limit: limit,
        };

        PostJsonData(url, data, false)
          .then((json: INewsItemSnapshotIn[]) => {
            const newArray = json != null ? json : [];
            newArray.forEach((newsItem) => {
              newsItem.link = newsItem.link && decodeURIComponent(newsItem.link);
            });
            globalStateModel.news?.addNewsItemsToBottom(newArray);
            setFirstLoading(false);
            setLoading(false);
            resolve(newArray.length === limit);
          })
          .catch(() => {
            setFirstLoading(false);
            setLoading(false);
            reject();
          });
      }),
    [loading, location.pathname, globalStateModel.type]
  );

  const newsItems = globalStateModel.news?.newsItems;

  return {
    loadMoreCallback: loadNews,
    newsItems:
      !firstLoading && newsItems
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
