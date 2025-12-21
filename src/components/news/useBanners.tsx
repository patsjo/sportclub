import { Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import { INewsItem, INewsItemProps, NewsItem } from '../../models/newsModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { IChildContainerProps } from '../dashboard/columns/mapNodesToColumns';
import BannerItem from './BannerItem';

const SpinnerDiv = styled.div<IChildContainerProps>`
  text-align: center;
  width: 100%;
`;

const useBanners = () => {
  const { clubModel } = useMobxStore();
  const [firstLoading, setFirstLoading] = useState(true);
  const loadingRef = useRef(false);
  const [bannerItems, setBannerItems] = useState<INewsItem[]>([]);
  const location = useLocation();

  const loadBanners = useCallback(() => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    const url = clubModel.modules.find(module => module.name === 'News')?.queryUrl;
    if (!url) return;

    const data = {
      iNewsTypeID: 10
    };

    PostJsonData<INewsItemProps[]>(url, data, false).then(json => {
      const newArray = json != null ? json : [];
      newArray.forEach(newsItem => {
        newsItem.link = newsItem.link && decodeURIComponent(newsItem.link);
      });
      setBannerItems(newArray.map(item => new NewsItem(item)));
      setFirstLoading(false);
      loadingRef.current = false;
    });
  }, [clubModel.modules]);

  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }
    loadBanners();
  }, [loadBanners, location.pathname]);

  return !firstLoading
    ? bannerItems.map(newsObject => (
        <BannerItem
          key={'bannerObject#' + newsObject.id}
          preferredColumn="50%rightFixed"
          newsObject={newsObject}
          preferredHeight={100}
        />
      ))
    : [
        <SpinnerDiv key="bannerObject#spinner" preferredColumn="50%rightFixed" preferredHeight={100}>
          <Spin size="large" />
        </SpinnerDiv>
      ];
};

export default useBanners;
