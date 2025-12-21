import { action, makeObservable, observable } from 'mobx';

export interface INewsItemProps {
  id: number;
  newsTypeId: number;
  header: string;
  introduction?: string | null;
  text?: string | null;
  link?: string | null;
  expireDate: string;
  fileId?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  imageHeight?: number | null;
  imageWidth?: number | null;
  modificationDate: string;
  modifiedBy: string;
}

export interface INewsItem extends INewsItemProps {
  setValues: (values: Partial<INewsItemProps>) => void;
}

export class NewsItem implements INewsItem {
  id = -1;
  newsTypeId = -1;
  header = '';
  introduction?: string | null;
  text?: string | null;
  link?: string | null;
  expireDate = '';
  fileId?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  imageHeight?: number | null;
  imageWidth?: number | null;
  modificationDate = '';
  modifiedBy = '';

  constructor(options: INewsItemProps) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      id: observable,
      newsTypeId: observable,
      header: observable,
      introduction: observable,
      text: observable,
      link: observable,
      expireDate: observable,
      fileId: observable,
      fileName: observable,
      fileSize: observable,
      fileType: observable,
      imageHeight: observable,
      imageWidth: observable,
      modificationDate: observable,
      modifiedBy: observable,
      setValues: action.bound
    });
  }

  setValues(values: Partial<INewsItemProps>) {
    Object.assign(this, values);
  }
}

export interface INewsModelProps {
  newsItems: INewsItemProps[];
  limit: number;
  offset: number;
}

export interface INewsModel extends Omit<INewsModelProps, 'newsItems'> {
  newsItems: INewsItem[];
  reset: () => void;
  addNewsItemToTop: (newsitem: INewsItemProps) => void;
  addNewsItemsToBottom: (newsitems: INewsItemProps[]) => void;
  removeNewsItem: (newsItem: INewsItemProps) => void;
}

export class NewsModel implements INewsModel {
  newsItems: INewsItem[] = [];
  limit = 12;
  offset = 0;

  constructor(options?: Partial<INewsModelProps>) {
    if (options) {
      const { newsItems, ...rest } = options;
      Object.assign(this, rest);
      if (newsItems) this.newsItems = newsItems.map(n => new NewsItem(n));
    }

    makeObservable(this, {
      newsItems: observable,
      limit: observable,
      offset: observable,
      reset: action.bound,
      addNewsItemToTop: action.bound,
      addNewsItemsToBottom: action.bound,
      removeNewsItem: action.bound
    });
  }

  reset() {
    this.newsItems = [];
    this.offset = 0;
  }

  addNewsItemToTop(newsitem: INewsItemProps) {
    this.newsItems.unshift(new NewsItem(newsitem));
  }

  addNewsItemsToBottom(newsitems: INewsItemProps[]) {
    const addItems = newsitems
      .filter(newsItem => !this.newsItems.some(item => item.id === newsItem.id))
      .map(item => new NewsItem(item));
    this.newsItems = [...this.newsItems, ...addItems];
    this.offset = this.offset + newsitems.length;
  }

  removeNewsItem(newsItem: INewsItemProps) {
    this.newsItems = this.newsItems.filter(item => item.id !== newsItem.id);
  }
}
