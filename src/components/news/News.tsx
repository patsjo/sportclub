import { observer } from 'mobx-react';
import InfiniteScroll from '../../utils/infinityScroll';
import { useMobxStore } from '../../utils/mobxStore';
import Columns from '../dashboard/columns/Columns';
import useNews from './useNews';

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
