import { MenuProps } from 'antd';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IModule } from '../../../models/mobxClubModel';
import { useMobxStore } from '../../../utils/mobxStore';
import MaterialIcon, { MaterialIconsType } from '../../materialIcon/MaterialIcon';
import { getMenuItem } from '../MenuItem';
import { useCalendarSubMenus } from './useCalendarSubMenus';
import { useCupSubMenus } from './useCupSubMenus';
import { useNewsSubMenus } from './useNewsSubMenus';
import { useResultsSubMenus } from './useResultsSubMenus';

export const useModuleSubMenu = () => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const navigate = useNavigate();
  const { addCalendarModal, subscribeCalendarModal, calendarMenuItems, calendarMyPagesMenuItems } =
    useCalendarSubMenus();
  const { addNewsModal, newsMenuItems } = useNewsSubMenus();
  const { renounceModal, resultsMenuItems, resultsEconomyMenuItems, resultsMyPagesMenuItems } = useResultsSubMenus();
  const { cupMenuItems, cupAdminMenuItems } = useCupSubMenus();

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
        case 'Calendar':
          return calendarMenuItems;
        case 'News':
          return newsMenuItems;
        case 'Results':
          return resultsMenuItems;
        case 'Cup':
          return cupMenuItems;
        default:
          return [];
      }
    },
    [calendarMenuItems, clubModel.eventor, cupMenuItems, globalStateModel, navigate, newsMenuItems, resultsMenuItems, t]
  );

  const allModuleMenuItems = useMemo(
    () =>
      clubModel.modules
        .filter(module => module.name !== 'HTMLEditor')
        .map((module): NonNullable<MenuProps['items']> =>
          module.hasSubMenus
            ? [
                {
                  // Without the index, the key is saved in the menu order
                  key: 'subMenu#' + module.name,
                  label: (
                    <span>
                      <MaterialIcon icon={(module.name + 'Icon') as MaterialIconsType} fontSize={18} marginRight={10} />
                      <span>{t(`modules.${module.name}`)}</span>
                    </span>
                  ),
                  disabled:
                    module.name !== 'Calendar' &&
                    module.name !== 'News' &&
                    module.name !== 'Eventor' &&
                    module.name !== 'Results' &&
                    module.name !== 'Cup',
                  children: getModuleMenuItems(module)
                }
              ]
            : getModuleMenuItems(module)
        )
        .flat(),
    [clubModel.modules, getModuleMenuItems, t]
  );

  const hasModule = useCallback(
    (name: string) => clubModel.modules.some(module => module.name === name),
    [clubModel.modules]
  );

  // The module items under "My pages", only the ones the user has the authority to use
  const myPagesModuleMenuItems = useMemo(
    () => ({
      economy: hasModule('Results') ? resultsEconomyMenuItems : [],
      calendar: hasModule('Calendar') ? calendarMyPagesMenuItems : [],
      results: hasModule('Results') ? resultsMyPagesMenuItems : [],
      cups: hasModule('Cup') ? cupAdminMenuItems : [],
      administration:
        hasModule('Users') && sessionModel.loggedIn
          ? [
              getMenuItem(
                'menuItem#users',
                'team',
                t('modules.Users'),
                () => {
                  globalStateModel.setRightMenuVisible(false);
                  globalStateModel.setDashboard(navigate, '/users');
                },
                true
              )
            ]
          : []
    }),
    [
      calendarMyPagesMenuItems,
      cupAdminMenuItems,
      globalStateModel,
      hasModule,
      navigate,
      resultsEconomyMenuItems,
      resultsMyPagesMenuItems,
      sessionModel.loggedIn,
      t
    ]
  );

  return {
    myPagesModuleMenuItems,
    allModuleModals: [addCalendarModal, subscribeCalendarModal, addNewsModal, renounceModal],
    allModuleMenuItems
  };
};
