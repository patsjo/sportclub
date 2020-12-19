import React from 'react';
import PropTypes from 'prop-types';
import NewsSubMenus from './NewsSubMenus';
import ResultsSubMenus from './ResultsSubMenus';
import CalendarSubMenus from './CalendarSubMenus';
import MenuItem from '../MenuItem';
import { useTranslation } from 'react-i18next';
import { inject, observer } from 'mobx-react';
import { useHistory } from 'react-router-dom';

const ModuleSubMenu = inject(
  'clubModel',
  'globalStateModel'
)(
  observer((props) => {
    const { module, clubModel, globalStateModel, ...other } = props;
    const { t } = useTranslation();
    const history = useHistory();

    switch (module.name) {
      case 'Eventor':
        return (
          <MenuItem
            key={'menuItem#eventor'}
            icon={module.name + 'Icon'}
            name={t('modules.Eventor')}
            onClick={() => {
              globalStateModel.setValue('rightMenuVisible', false);
              const win = window.open(clubModel.eventor.url, '_blank');
              win.focus();
            }}
          />
        );
      case 'ScoringBoard':
        return (
          <MenuItem
            key={'menuItem#scoringBoard'}
            icon={module.name + 'Icon'}
            name={t('modules.ScoringBoard')}
            onClick={() => {
              globalStateModel.setValue('rightMenuVisible', false);
              globalStateModel.setDashboard(history, '/league');
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
  })
);

ModuleSubMenu.propTypes = {
  module: PropTypes.object.isRequired,
};

export default ModuleSubMenu;
