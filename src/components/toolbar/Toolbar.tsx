import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { useCups } from '../cup/useCup';
import InvoicesBadge from '../invoices/InvoicesBadge';
import { MaterialIconsType } from '../materialIcon/MaterialIcon';
import DrawerRightMenu from '../menu/DrawerRightMenu';
import ToolbarItem from './ToolbarItem';

const ToolbarHolder = styled.div`
  &&& {
    display: inline-flex;
  }
`;

const WideToolbarHolder = styled.div<{ $hideBelow: number }>`
  & {
    display: inline-flex;
  }
  @media screen and (max-width: ${({ $hideBelow }) => $hideBelow}px) {
    display: none !important;
  }
`;

const toolbarModules = ['News', 'Eventor', 'ScoringBoard', 'Stars'];
/** About the width of a toolbar button, the text is 10px (about 6px per character), padding and margin */
const toolbarItemWidth = (name: string) => Math.max(46, name.length * 6) + 10 + 10;

const Toolbar = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel } = useMobxStore();
  const navigate = useNavigate();
  const { cups } = useCups(false);
  const toolbarCups = (cups ?? []).filter(cup => cup.showInToolbar);
  // The buttons are only shown when the header has room for them, beside the logo and the title
  // (on a tablet there may not be room for all of them)
  const logoWidth = clubModel.logo.width * (80 / clubModel.logo.height);
  const titleWidth = clubModel.titleLogo ? clubModel.titleLogo.width * (24 / clubModel.titleLogo.height) : 160;
  const itemsWidth = [
    ...clubModel.modules.filter(module => toolbarModules.includes(module.name)).map(m => t(`modules.${m.name}`)),
    ...toolbarCups.map(cup => cup.name),
    t('common.Menu')
  ].reduce((sum, name) => sum + toolbarItemWidth(name), 0);
  const hideBelow = Math.max(719, Math.ceil(20 + logoWidth + 10 + titleWidth + 10 + itemsWidth));

  return (
    <ToolbarHolder>
      <WideToolbarHolder $hideBelow={hideBelow}>
        {clubModel.modules.map((module, index) => (
          <ToolbarItem
            key={'toolbarItem#' + module.name + index}
            icon={(module.name + 'Icon') as MaterialIconsType}
            name={t(`modules.${module.name}`)}
            disabled={!toolbarModules.includes(module.name)}
            onClick={() => {
              switch (module.name) {
                case 'Eventor':
                  if (clubModel.eventor) {
                    const win = window.open(clubModel.eventor.url, '_blank');
                    win?.focus();
                  }
                  break;
                case 'News':
                  globalStateModel.setDashboard(navigate, '/news', '1900-01-01', '2099-12-31');
                  break;
                case 'ScoringBoard':
                  globalStateModel.setDashboard(navigate, '/league');
                  break;
                case 'Stars':
                  globalStateModel.setDashboard(navigate, '/competitor/presentation');
                  break;
                default:
                  return null;
              }
            }}
          />
        ))}
        {toolbarCups.map(cup => (
          <ToolbarItem
            key={'toolbarItem#cup' + cup.cupId}
            icon="CupIcon"
            name={cup.name}
            onClick={() => globalStateModel.setDashboard(navigate, '/cup/' + cup.slug)}
          />
        ))}
      </WideToolbarHolder>
      <ToolbarItem
        icon={globalStateModel.rightMenuVisible ? 'menu-unfold' : 'menu-fold'}
        name={t('common.Menu')}
        // The unpaid invoices, while the menu is closed (in the open menu they are on My pages)
        wrapIcon={
          globalStateModel.rightMenuVisible ? undefined : icon => <InvoicesBadge offset={[6, 0]}>{icon}</InvoicesBadge>
        }
        onClick={() => globalStateModel.setRightMenuVisible(!globalStateModel.rightMenuVisible)}
      />
      <DrawerRightMenu />
    </ToolbarHolder>
  );
});

export default Toolbar;
