import { types } from "mobx-state-tree";

const NewsItem = types.model({
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
  modifiedBy: types.string
});

export const NewsModel = types
  .model({
    newsItems: types.array(NewsItem),
    limit: 12,
    offset: types.integer,
    hasMoreItems: types.boolean
  })
  .actions(self => {
    return {
      reset() {
        self.newsItems = [];
        self.offset = 0;
        self.hasMoreItems = false;
      },
      addNewsItemToTop(newsitem) {
        self.newsItems.unshift(newsitem);
      },
      addNewsItemsToBottom(newsitems) {
        self.newsItems = [...self.newsItems, ...newsitems];
        self.offset = self.offset + newsitems.length;
        self.hasMoreItems = newsitems.length === self.limit;
      },
      removeNewsItem(newsItem) {
        self.newsItems = self.newsItems.filter(item => item.id !== newsItem.id);
      }
    };
  });
