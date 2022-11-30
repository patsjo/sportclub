import { Spin } from 'antd';
import { IChildContainerProps } from 'components/dashboard/columns/mapNodesToColumns';
import { INewsItem, INewsItemProps, NewsItem } from 'models/newsModel';
import React from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { PostJsonData } from '../../utils/api';
import BannerItem from './BannerItem';

const SpinnerDiv = styled.div<IChildContainerProps>`
  text-align: center;
  width: 100%;
`;

const useBanners = () => {
  const { clubModel } = useMobxStore();
  const [firstLoading, setFirstLoading] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [bannerItems, setBannerItems] = React.useState<INewsItem[]>([]);
  const location = useLocation();

  const loadBanners = React.useCallback(() => {
    if (loading) {
      return;
    }
    setLoading(true);
    const url = clubModel.modules.find((module) => module.name === 'News')?.queryUrl;
    if (!url) return;

    const data = {
      iNewsTypeID: 10,
    };

    PostJsonData(url, data, false).then((json: INewsItemProps[]) => {
      const newArray = json != null ? json : [];
      newArray.forEach((newsItem) => {
        newsItem.link = newsItem.link && decodeURIComponent(newsItem.link);
      });
      setBannerItems(newArray.map((item) => new NewsItem(item)));
      setFirstLoading(false);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }
    loadBanners();
  }, [location.pathname]);

  return !firstLoading
    ? bannerItems.map((newsObject) => (
        <BannerItem key={'bannerObject#' + newsObject.id} column={-50} newsObject={newsObject} preferredHeight={100} />
      ))
    : [
        <SpinnerDiv key="bannerObject#spinner" column={-50} preferredHeight={100}>
          <Spin size="large" />
        </SpinnerDiv>,
      ];
};

export default useBanners;
