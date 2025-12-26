import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { INewsItemProps, NewsItem } from '../../../models/newsModel';
import { useMobxStore } from '../../../utils/mobxStore';
import NewsEdit from '../../news/NewsEdit';
import { getMenuItem } from '../MenuItem';

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

export const useNewsSubMenus = () => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const newsModule = React.useMemo(() => clubModel.modules.find(module => module.name === 'News'), [clubModel.modules]);
  const [addNewsModalIsOpen, setAddNewsModalIsOpen] = useState(false);
  const navigate = useNavigate();

  return {
    addNewsModal: addNewsModalIsOpen ? (
      <NewsEdit
        newsObject={new NewsItem({ ...defaultNewsObject })}
        open={addNewsModalIsOpen}
        onChange={(insertedNewsObject: INewsItemProps) => globalStateModel.news?.addNewsItemToTop(insertedNewsObject)}
        onClose={() => setAddNewsModalIsOpen(false)}
      />
    ) : null,
    newsMenuItems: [
      getMenuItem(
        'menuItem#newsAdd',
        'plus',
        t('news.Add'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddNewsModalIsOpen(true), 0);
        },
        true,
        1,
        !newsModule?.addUrl || !sessionModel.loggedIn
      ),
      getMenuItem(
        'menuItem#news',
        'NewsIcon',
        t('modules.News'),
        () => {
          globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31');
        },
        true
      ),
      getMenuItem(
        'menuItem#newsLongTime',
        'NewsIcon',
        t('news.LongTimeNews'),
        () => {
          globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31', 2);
        },
        true
      ),
      getMenuItem(
        'menuItem#educations',
        'book',
        t('news.Educations'),
        () => {
          globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31', 3);
        },
        true
      )
    ]
  };
};
