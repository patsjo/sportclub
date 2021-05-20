import React from 'react';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import DrawerRightMenu from '../menu/DrawerRightMenu';
import ToolbarItem from './ToolbarItem';
import { useHistory } from 'react-router-dom';

const ToolbarHolder = styled.div`
  &&& {
    display: inline-flex;
  }
`;

const WideToolbarHolder = styled.div`
  & {
    display: inline-flex;
  }
  @media screen and (max-width: 719px) {
    display: none !important;
  }
`;

// @inject("clubModel", "globalStateModel")
// @observer
const Toolbar = inject(
  'clubModel',
  'globalStateModel'
)(
  observer(({ clubModel, globalStateModel }) => {
    const { t } = useTranslation();
    const history = useHistory();

    return (
      <ToolbarHolder>
        <WideToolbarHolder>
          {clubModel.modules.map((module, index) => (
            <ToolbarItem
              key={'toolbarItem#' + module.name + index}
              icon={module.name + 'Icon'}
              name={t('modules.' + module.name)}
              disabled={
                module.name !== 'News' &&
                module.name !== 'Eventor' &&
                module.name !== 'ScoringBoard' &&
                module.name !== 'Stars'
              }
              onClick={() => {
                switch (module.name) {
                  case 'Eventor':
                    const win = window.open(clubModel.eventor.url, '_blank');
                    win.focus();
                    break;
                  case 'News':
                    globalStateModel.setDashboard(history, '/news', '1990-01-01', '2099-12-31');
                    break;
                  case 'ScoringBoard':
                    globalStateModel.setDashboard(history, '/league');
                    break;
                  case 'Stars':
                    globalStateModel.setDashboard(history, '/competitor/presentation');
                    break;
                  default:
                    return null;
                }
              }}
            />
          ))}
        </WideToolbarHolder>
        <ToolbarItem
          icon={globalStateModel.rightMenuVisible ? 'menu-unfold' : 'menu-fold'}
          name={t('common.Menu')}
          onClick={() => globalStateModel.setValue('rightMenuVisible', !globalStateModel.rightMenuVisible)}
        />
        <DrawerRightMenu />
      </ToolbarHolder>
    );
  })
);

export default Toolbar;
