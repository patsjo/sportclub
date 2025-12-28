import { MenuProps } from 'antd';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IModule } from '../../../models/mobxClubModel';
import { useMobxStore } from '../../../utils/mobxStore';
import MaterialIcon, { MaterialIconsType } from '../../materialIcon/MaterialIcon';
import { getMenuItem } from '../MenuItem';
import { useCalendarSubMenus } from './useCalendarSubMenus';
import { useNewsSubMenus } from './useNewsSubMenus';
import { useResultsSubMenus } from './useResultsSubMenus';

export const useModuleSubMenu = () => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const navigate = useNavigate();
  const { addCalendarModal, calendarMenuItems } = useCalendarSubMenus();
  const { addNewsModal, newsMenuItems } = useNewsSubMenus();
  const { renounceModal, resultsMenuItems } = useResultsSubMenus();

  const getModuleMenuItems = useCallback(
    (module: IModule): NonNullable<MenuProps['items']> => {
      switch (module.name) {
        case 'Eventor':
          return [
            getMenuItem('menuItem#eventor', 'EventorIcon', t('modules.Eventor'), () => {
              globalStateModel.setRightMenuVisible(false);
              if (clubModel.eventor) {
                const win = window.open(clubModel.eventor.url, '_blank');
                win?.focus();
              }
            })
          ];
        case 'ScoringBoard':
          return [
            getMenuItem('menuItem#scoringBoard', 'ScoringBoardIcon', t('modules.ScoringBoard'), () => {
              globalStateModel.setRightMenuVisible(false);
              globalStateModel.setDashboard(navigate, '/league');
            })
          ];
        case 'Stars':
          return [
            getMenuItem('menuItem#stars', 'StarsIcon', t('modules.Stars'), () => {
              globalStateModel.setRightMenuVisible(false);
              globalStateModel.setDashboard(navigate, '/competitor/presentation');
            })
          ];
        case 'Users':
          return [
            getMenuItem(
              'menuItem#users',
              'team',
              t('modules.Users'),
              () => {
                globalStateModel.setRightMenuVisible(false);
                globalStateModel.setDashboard(navigate, '/users');
              },
              false,
              1,
              !sessionModel.loggedIn
            )
          ];
        case 'Calendar':
          return calendarMenuItems;
        case 'News':
          return newsMenuItems;
        case 'Results':
          return resultsMenuItems;
        default:
          return [];
      }
    },
    [
      calendarMenuItems,
      clubModel.eventor,
      globalStateModel,
      navigate,
      newsMenuItems,
      resultsMenuItems,
      sessionModel.loggedIn,
      t
    ]
  );

  const allModuleMenuItems = useMemo(
    () =>
      clubModel.modules
        .filter(module => module.name !== 'HTMLEditor')
        .map(
          (module, index): NonNullable<MenuProps['items']> =>
            module.hasSubMenus
              ? [
                  {
                    key: 'subMenu#' + module.name + index,
                    label: (
                      <span>
                        <MaterialIcon
                          icon={(module.name + 'Icon') as MaterialIconsType}
                          fontSize={18}
                          marginRight={10}
                        />
                        <span>{t(`modules.${module.name}`)}</span>
                      </span>
                    ),
                    disabled:
                      module.name !== 'Calendar' &&
                      module.name !== 'News' &&
                      module.name !== 'Eventor' &&
                      module.name !== 'Results',
                    children: getModuleMenuItems(module)
                  }
                ]
              : getModuleMenuItems(module)
        )
        .flat(),
    [clubModel.modules, getModuleMenuItems, t]
  );

  return {
    allModuleModals: [addCalendarModal, addNewsModal, renounceModal],
    allModuleMenuItems
  };
};
