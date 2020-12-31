import React from 'react';
import BannerItem from './BannerItem';
import { Spin } from 'antd';
import styled from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useLocation } from 'react-router-dom';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const useBanners = (clubModel) => {
  const [firstLoading, setFirstLoading] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [bannerItems, setBannerItems] = React.useState([]);
  const location = useLocation();

  const loadBanners = React.useCallback(() => {
    if (loading) {
      return;
    }
    setLoading(true);
    const url = clubModel.modules.find((module) => module.name === 'News').queryUrl;
    const data = {
      iNewsTypeID: 10,
    };

    PostJsonData(url, data, false).then((json) => {
      // eslint-disable-next-line eqeqeq
      const newArray = json != undefined ? json : [];
      newArray.forEach((newsItem) => {
        newsItem.link = decodeURIComponent(newsItem.link);
      });
      setBannerItems(newArray);
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
        <BannerItem key={'bannerObject#' + newsObject.id} column={-50} newsObject={newsObject} />
      ))
    : [
        <SpinnerDiv key="bannerObject#spinner">
          <Spin size="large" />
        </SpinnerDiv>,
      ];
};

export default useBanners;
