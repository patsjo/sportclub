import { Space, Tabs } from 'antd';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { AppleLogo, FacebookLogo, GoogleLogo } from '../login/ProviderLogos';
import AccessRequestsBadge from './AccessRequestsBadge';
import Accounts from './Accounts';
import Competitors from './Competitors';
import SystemGroupsAlert from './SystemGroupsAlert';
import Users from './Users';

/* The tab row clips what is outside it (it scrolls the tabs on a phone), room above the tabs for the badge on
   Accounts without moving the tabs */
const StyledTabs = styled(Tabs)`
  &&& > .ant-tabs-nav > .ant-tabs-nav-wrap {
    padding-top: 12px;
    margin-top: -12px;
  }
`;

const UsersAndCompetitors = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const showAccounts = sessionModel.isAdmin && !!clubModel.socialLogin?.accountsUrl;
  const showGoogle = !!clubModel.socialLogin?.googleUrl;
  const showFacebook = !!clubModel.socialLogin?.facebookUrl;
  const showApple = !!clubModel.socialLogin?.appleUrl;

  // destroyOnHidden: loaded again when shown, e.g. the linked accounts after a link under Accounts
  return (
    <>
      <SystemGroupsAlert />
      <StyledTabs
        destroyOnHidden
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: t('users.Users'),
            children: <Users />
          },
          {
            key: 'competitors',
            label: t('users.Competitors'),
            children: <Competitors />
          },
          ...(showAccounts
            ? [
                {
                  key: 'accounts',
                  label: (
                    <AccessRequestsBadge offset={[8, -2]}>
                      <Space size={4}>
                        {showGoogle ? <GoogleLogo size={16} /> : null}
                        {showFacebook ? <FacebookLogo size={16} /> : null}
                        {showApple ? <AppleLogo size={16} /> : null}
                        {t('accounts.Accounts')}
                      </Space>
                    </AccessRequestsBadge>
                  ),
                  children: <Accounts />
                }
              ]
            : [])
        ]}
        type="card"
      />
    </>
  );
});

export default UsersAndCompetitors;
