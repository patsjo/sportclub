import React from 'react';
import { dashboardContents } from '../../models/globalStateModel';
import BannerItem from './BannerItem';
import { Spin } from 'antd';
import styled from 'styled-components';
import { PostJsonData } from '../../utils/api';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const useBanners = (globalStateModel, clubModel) => {
  const [firstLoading, setFirstLoading] = React.useState(true);
  const [bannerItems, setBannerItems] = React.useState([]);

  const loadBanners = React.useCallback(() => {
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
    });
  }, []);

  React.useEffect(() => {
    if (globalStateModel.dashboardContentId !== dashboardContents.home) {
      return;
    }
    loadBanners();
  }, [globalStateModel.dashboardContentId]);

  return !firstLoading
    ? bannerItems.map((newsObject) => <BannerItem key={'bannerObject#' + newsObject.id} newsObject={newsObject} />)
    : [
        <SpinnerDiv>
          <Spin size="large" />
        </SpinnerDiv>,
      ];
};

export default useBanners;
