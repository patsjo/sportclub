import { MaterialIconsType } from 'components/materialIcon/MaterialIcon';
import { observer } from 'mobx-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import DrawerRightMenu from '../menu/DrawerRightMenu';
import ToolbarItem from './ToolbarItem';

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

const Toolbar = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel } = useMobxStore();
  const history = useHistory();

  return (
    <ToolbarHolder>
      <WideToolbarHolder>
        {clubModel.modules.map((module, index) => (
          <ToolbarItem
            key={'toolbarItem#' + module.name + index}
            icon={(module.name + 'Icon') as MaterialIconsType}
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
                  if (clubModel.eventor) {
                    const win = window.open(clubModel.eventor.url, '_blank');
                    win?.focus();
                  }
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
        onClick={() => globalStateModel.setRightMenuVisible(!globalStateModel.rightMenuVisible)}
      />
      <DrawerRightMenu />
    </ToolbarHolder>
  );
});

export default Toolbar;
