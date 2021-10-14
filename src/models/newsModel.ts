import { cast, Instance, SnapshotIn, types } from 'mobx-state-tree';

export const NewsItem = types.model({
  id: types.identifierNumber,
  newsTypeId: types.integer,
  header: types.string,
  introduction: types.maybeNull(types.string),
  text: types.maybeNull(types.string),
  link: types.maybeNull(types.string),
  expireDate: types.string,
  fileId: types.maybeNull(types.integer),
  fileName: types.maybeNull(types.string),
  fileSize: types.maybeNull(types.integer),
  fileType: types.maybeNull(types.string),
  imageHeight: types.maybeNull(types.integer),
  imageWidth: types.maybeNull(types.integer),
  modificationDate: types.string,
  modifiedBy: types.string,
});
export type INewsItem = Instance<typeof NewsItem>;
export type INewsItemSnapshotIn = SnapshotIn<typeof NewsItem>;

export const NewsModel = types
  .model({
    newsItems: types.array(NewsItem),
    limit: 12,
    offset: types.integer,
    hasMoreItems: types.boolean,
  })
  .actions((self) => {
    return {
      reset() {
        self.newsItems = cast([]);
        self.offset = 0;
        self.hasMoreItems = false;
      },
      addNewsItemToTop(newsitem: INewsItemSnapshotIn) {
        self.newsItems.unshift(newsitem);
      },
      addNewsItemsToBottom(newsitems: INewsItemSnapshotIn[]) {
        const addItems = newsitems.filter((newsItem) => !self.newsItems.some((item) => item.id === newsItem.id));
        self.newsItems = cast([...self.newsItems, ...addItems]);
        self.offset = self.offset + newsitems.length;
        self.hasMoreItems = newsitems.length === self.limit;
      },
      removeNewsItem(newsItem: INewsItemSnapshotIn) {
        self.newsItems = cast(self.newsItems.filter((item) => item.id !== newsItem.id));
      },
    };
  });
