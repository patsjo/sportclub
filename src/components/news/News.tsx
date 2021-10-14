import { observer } from 'mobx-react';
import React from 'react';
import { useMobxStore } from 'utils/mobxStore';
import InfiniteScroll from '../../utils/infinityScroll';
import Columns from '../dashboard/columns/Columns';
import useNews from './useNews';

const News = observer(() => {
  const { clubModel, globalStateModel } = useMobxStore();
  const { loadMoreCallback, newsItems } = useNews();

  return (
    <InfiniteScroll key="InfiniteScroll#news" loadMore={loadMoreCallback} hasMore={globalStateModel.news?.hasMoreItems}>
      <Columns key="columns#news">{newsItems}</Columns>
    </InfiniteScroll>
  );
});

export default News;
