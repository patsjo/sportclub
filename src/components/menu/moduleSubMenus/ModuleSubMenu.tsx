import { observer } from 'mobx-react';
import { IModule } from 'models/mobxClubModel';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useMobxStore } from 'utils/mobxStore';
import MenuItem from '../MenuItem';
import CalendarSubMenus from './CalendarSubMenus';
import NewsSubMenus from './NewsSubMenus';
import ResultsSubMenus from './ResultsSubMenus';

interface IModuleSubMenuProps {
  module: IModule;
}
const ModuleSubMenu = observer(({ module }: IModuleSubMenuProps) => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const history = useHistory();

  switch (module.name) {
    case 'Eventor':
      return (
        <MenuItem
          key={'menuItem#eventor'}
          icon={'EventorIcon'}
          name={t('modules.Eventor')}
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            if (clubModel.eventor) {
              const win = window.open(clubModel.eventor.url, '_blank');
              win?.focus();
            }
          }}
        />
      );
    case 'ScoringBoard':
      return (
        <MenuItem
          key={'menuItem#scoringBoard'}
          icon={'ScoringBoardIcon'}
          name={t('modules.ScoringBoard')}
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            globalStateModel.setDashboard(history, '/league');
          }}
        />
      );
    case 'Stars':
      return (
        <MenuItem
          key={'menuItem#stars'}
          icon={'StarsIcon'}
          name={t('modules.Stars')}
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            globalStateModel.setDashboard(history, '/competitor/presentation');
          }}
        />
      );
    case 'Users':
      return (
        <MenuItem
          key={'menuItem#users'}
          icon={'team'}
          name={t('modules.Users')}
          disabled={!sessionModel.loggedIn}
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            globalStateModel.setDashboard(history, '/users');
          }}
        />
      );
    case 'Calendar':
      return <CalendarSubMenus />;
    case 'News':
      return <NewsSubMenus />;
    case 'Results':
      return <ResultsSubMenus />;
    default:
      return null;
  }
});

export default ModuleSubMenu;
