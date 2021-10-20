import { observer } from 'mobx-react';
import React from 'react';
import InfiniteScroll from '../../utils/infinityScroll';
import Columns from '../dashboard/columns/Columns';
import useNews from './useNews';

const News = observer(() => {
  const { loadMoreCallback, newsItems } = useNews(false);

  return (
    <InfiniteScroll key="InfiniteScroll#news" loadMore={loadMoreCallback}>
      <Columns key="columns#news">{newsItems}</Columns>
    </InfiniteScroll>
  );
});

export default News;
