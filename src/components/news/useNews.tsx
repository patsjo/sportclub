import { Spin } from 'antd';
import { IChildContainerProps } from '../dashboard/columns/mapNodesToColumns';
import { INewsItemProps } from '../../models/newsModel';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { PostJsonData } from '../../utils/api';
import NewsItem from './NewsItem';

const SpinnerDiv = styled.div<IChildContainerProps>`
  text-align: center;
  width: 100%;
`;

const useNews = (withinDashboard: boolean) => {
  const { globalStateModel, clubModel } = useMobxStore();
  const [firstLoading, setFirstLoading] = React.useState(true);
  const loadingRef = useRef(false);
  const location = useLocation();
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), [now]);
  const todayIsoString = useMemo(() => today.toISOString().substring(0, 10), [today]);

  const loadNews = useCallback(async () => {
    if (loadingRef.current) {
      return true;
    }
    const url = clubModel.modules.find((module) => module.name === 'News')?.queryUrl;
    if (!url) return false;

    loadingRef.current = true;
    const limit = globalStateModel.news?.limit;
    const offset = globalStateModel.news?.offset;
    const startDate = new Date(today.valueOf());
    startDate.setDate(startDate.getDate() - 180);
    const iStartDate = startDate.toISOString().substring(0, 10);
    const data = {
      iStartDate: withinDashboard ? iStartDate : globalStateModel.startDate ? globalStateModel.startDate : '1900-01-01',
      iEndDate: withinDashboard ? '' : globalStateModel.endDate ? globalStateModel.endDate : '2099-12-31',
      iNewsTypeID: globalStateModel.type ? globalStateModel.type : '',
      offset: offset,
      limit: limit,
    };

    try {
      const json: INewsItemProps[] = await PostJsonData(url, data, false);
      const newArray = json != null ? json : [];
      newArray.forEach((newsItem) => {
        newsItem.link = newsItem.link && decodeURIComponent(newsItem.link);
      });
      globalStateModel.news?.addNewsItemsToBottom(newArray);
      setFirstLoading(false);
      loadingRef.current = false;
      return newArray.length === limit;
    } catch (e) {
      setFirstLoading(false);
      loadingRef.current = false;
      return false;
    }
  }, [
    today,
    location.pathname,
    globalStateModel.type,
    globalStateModel.startDate,
    globalStateModel.endDate,
    clubModel.modules,
    globalStateModel.news?.limit,
    globalStateModel.news?.offset,
  ]);

  const newsItems = useMemo(
    () =>
      withinDashboard
        ? globalStateModel.news?.newsItems?.filter(
            (newsItem) => !newsItem.expireDate || newsItem.expireDate >= todayIsoString,
          )
        : globalStateModel.news?.newsItems,
    [todayIsoString, globalStateModel.news?.newsItems, withinDashboard],
  );

  return {
    loadMoreCallback: loadNews,
    newsItems:
      !firstLoading && newsItems
        ? newsItems.map((newsObject) => (
            <NewsItem
              key={'newsObject#' + newsObject.id}
              preferredColumn={location.pathname === '/' ? '50%leftPreferred' : undefined}
              newsObject={newsObject}
              preferredHeight={200}
            />
          ))
        : [
            <SpinnerDiv
              key="newsObject#spinner"
              preferredColumn={location.pathname === '/' ? '50%leftPreferred' : undefined}
              preferredHeight={100}
            >
              <Spin size="large" />
            </SpinnerDiv>,
          ],
  };
};

export default useNews;
