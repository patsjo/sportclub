import { observer } from 'mobx-react';
import { INewsItemSnapshotIn, NewsItem } from 'models/newsModel';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useMobxStore } from 'utils/mobxStore';
import NewsEdit from '../../news/NewsEdit';
import MenuItem from '../MenuItem';

const defaultNewsObject: INewsItemSnapshotIn = {
  expireDate: new Date(new Date().getTime() + 86400000 * 14).toISOString().substr(0, 10),
  fileId: 0,
  header: '',
  id: 0,
  introduction: '',
  link: '',
  newsTypeId: 1,
  text: '',
  modificationDate: new Date().toISOString().substr(0, 10),
  modifiedBy: '',
};

const NewsSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const newsModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'News'), []);
  const [addNewsModalIsOpen, setAddNewsModalIsOpen] = useState(false);
  const history = useHistory();

  return (
    <>
      {addNewsModalIsOpen ? (
        <NewsEdit
          newsObject={NewsItem.create({ ...defaultNewsObject })}
          open={addNewsModalIsOpen}
          onChange={(insertedNewsObject: INewsItemSnapshotIn) =>
            globalStateModel.news?.addNewsItemToTop(insertedNewsObject)
          }
          onClose={() => setAddNewsModalIsOpen(false)}
        />
      ) : null}
      <MenuItem
        key={'menuItem#newsAdd'}
        icon="plus"
        name={t('news.Add')}
        disabled={!newsModule?.addUrl || !sessionModel.loggedIn}
        isSubMenu
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddNewsModalIsOpen(true), 0);
        }}
      />
      <MenuItem
        key={'menuItem#news'}
        icon={'NewsIcon'}
        name={t('modules.News')}
        isSubMenu
        onClick={() => {
          globalStateModel.setDashboard(history, '/news', '1990-01-01', '2099-12-31');
        }}
      />
      <MenuItem
        key={'menuItem#newsLongTime'}
        icon={'NewsIcon'}
        name={t('news.LongTimeNews')}
        isSubMenu
        onClick={() => {
          globalStateModel.setDashboard(history, '/news', '1990-01-01', '2099-12-31', 2);
        }}
      />
      <MenuItem
        key={'menuItem#educations'}
        icon="book"
        name={t('news.Educations')}
        isSubMenu
        onClick={() => {
          globalStateModel.setDashboard(history, '/news', '1990-01-01', '2099-12-31', 3);
        }}
      />
    </>
  );
});

export default NewsSubMenus;
