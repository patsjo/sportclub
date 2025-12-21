import { observer } from 'mobx-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { INewsItemProps, NewsItem } from '../../../models/newsModel';
import { useMobxStore } from '../../../utils/mobxStore';
import NewsEdit from '../../news/NewsEdit';
import MenuItem from '../MenuItem';

const defaultNewsObject: INewsItemProps = {
  expireDate: new Date(new Date().getTime() + 86400000 * 14).toISOString().substr(0, 10),
  fileId: 0,
  header: '',
  id: 0,
  introduction: '',
  link: '',
  newsTypeId: 1,
  text: '',
  modificationDate: new Date().toISOString().substr(0, 10),
  modifiedBy: ''
};

const NewsSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const newsModule = React.useMemo(() => clubModel.modules.find(module => module.name === 'News'), [clubModel.modules]);
  const [addNewsModalIsOpen, setAddNewsModalIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {addNewsModalIsOpen ? (
        <NewsEdit
          newsObject={new NewsItem({ ...defaultNewsObject })}
          open={addNewsModalIsOpen}
          onChange={(insertedNewsObject: INewsItemProps) => globalStateModel.news?.addNewsItemToTop(insertedNewsObject)}
          onClose={() => setAddNewsModalIsOpen(false)}
        />
      ) : null}
      <MenuItem
        key={'menuItem#newsAdd'}
        isSubMenu
        icon="plus"
        name={t('news.Add')}
        disabled={!newsModule?.addUrl || !sessionModel.loggedIn}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddNewsModalIsOpen(true), 0);
        }}
      />
      <MenuItem
        key={'menuItem#news'}
        isSubMenu
        icon={'NewsIcon'}
        name={t('modules.News')}
        onClick={() => {
          globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31');
        }}
      />
      <MenuItem
        key={'menuItem#newsLongTime'}
        isSubMenu
        icon={'NewsIcon'}
        name={t('news.LongTimeNews')}
        onClick={() => {
          globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31', 2);
        }}
      />
      <MenuItem
        key={'menuItem#educations'}
        isSubMenu
        icon="book"
        name={t('news.Educations')}
        onClick={() => {
          globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31', 3);
        }}
      />
    </>
  );
});

export default NewsSubMenus;
