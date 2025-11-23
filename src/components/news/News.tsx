import { observer } from 'mobx-react';
import React from 'react';
import InfiniteScroll from '../../utils/infinityScroll';
import Columns from '../dashboard/columns/Columns';
import useNews from './useNews';
import { useMobxStore } from '../../utils/mobxStore';

const News = observer(() => {
  const { globalStateModel } = useMobxStore();
  const { loadMoreCallback, newsItems } = useNews(false);

  return (
    <InfiniteScroll key={`InfiniteScroll#news${globalStateModel.type}`} loadMore={loadMoreCallback}>
      <Columns key="columns#news">{newsItems}</Columns>
    </InfiniteScroll>
  );
});

export default News;
