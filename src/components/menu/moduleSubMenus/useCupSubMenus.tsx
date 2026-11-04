import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMobxStore } from '../../../utils/mobxStore';
import { useCups } from '../../cup/useCup';
import { getMenuItem } from '../MenuItem';

/** One menu item per cup, all cups, and the administration of the cups */
export const useCupSubMenus = () => {
  const { t } = useTranslation();
  const { globalStateModel, sessionModel } = useMobxStore();
  const navigate = useNavigate();
  const isAdmin = sessionModel.loggedIn && sessionModel.isAdmin;
  const { cups } = useCups(isAdmin);

  const cupMenuItems = useMemo(
    () => [
      ...(cups ?? []).map(cup =>
        getMenuItem(
          `menuItem#cup${cup.cupId}`,
          'CupIcon',
          cup.isActive ? cup.name : `${cup.name} (${t('cup.Inactive')})`,
          () => {
            globalStateModel.setRightMenuVisible(false);
            globalStateModel.setDashboard(navigate, `/cup/${cup.slug}`);
          },
          true
        )
      ),
      getMenuItem(
        'menuItem#cups',
        'ScoringBoardIcon',
        t('cup.AllCups'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/cups');
        },
        true
      ),
      // Like the other administration items, shown but disabled when not logged in as administrator
      getMenuItem(
        'menuItem#cupsAdmin',
        'edit',
        t('cup.AdministerCups'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/cups');
        },
        true,
        1,
        !isAdmin
      ),
      getMenuItem(
        'menuItem#cupsNew',
        'plus',
        t('cup.NewCup'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/cups?new=1');
        },
        true,
        1,
        !isAdmin
      )
    ],
    [cups, globalStateModel, isAdmin, navigate, t]
  );

  return { cupMenuItems };
};
