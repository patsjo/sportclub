import React from 'react';
import styled from 'styled-components';
import useNews from './useNews';
import { observer, inject } from 'mobx-react';
import Columns from '../dashboard/columns/Columns';
import InfiniteScroll from '../../utils/infinityScroll';
import { Spin } from 'antd';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const News = inject(
  'clubModel',
  'globalStateModel'
)(
  observer(({ clubModel, globalStateModel }) => {
    const { loadMoreCallback, newsItems } = useNews(globalStateModel, clubModel);

    const Content = (
      <InfiniteScroll
        key="InfiniteScroll#news"
        pageStart={0}
        loadMore={loadMoreCallback}
        hasMore={globalStateModel.news.hasMoreItems}
        loader={
          <SpinnerDiv key="InfiniteScrollSpinner#news">
            <Spin size="large" />
          </SpinnerDiv>
        }
      >
        <Columns key="columns#news">{newsItems}</Columns>
      </InfiniteScroll>
    );

    return Content;
  })
);

export default News;
