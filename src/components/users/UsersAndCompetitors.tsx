import { Badge, Space, Tabs } from 'antd';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from '../../utils/mobxStore';
import { FacebookLogo, GoogleLogo } from '../login/ProviderLogos';
import Accounts from './Accounts';
import Competitors from './Competitors';
import Users from './Users';

const UsersAndCompetitors = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [pending, setPending] = useState<number>();
  const showAccounts = sessionModel.isAdmin && !!clubModel.socialLogin?.accountsUrl;
  const showGoogle = !!clubModel.socialLogin?.googleUrl;
  const showFacebook = !!clubModel.socialLogin?.facebookUrl;
  const pendingCount = pending ?? sessionModel.pendingAccessRequests;

  // destroyOnHidden: loaded again when shown, e.g. the linked accounts after a link under Accounts
  return (
    <Tabs
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
                  <Badge count={pendingCount} size="small" offset={[8, -2]}>
                    <Space size={4}>
                      {showGoogle ? <GoogleLogo size={16} /> : null}
                      {showFacebook ? <FacebookLogo size={16} /> : null}
                      {t('accounts.Accounts')}
                    </Space>
                  </Badge>
                ),
                children: <Accounts onPendingChange={setPending} />
              }
            ]
          : [])
      ]}
      type="card"
    />
  );
});

export default UsersAndCompetitors;
