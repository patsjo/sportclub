import { Tabs } from 'antd';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import Competitors from './Competitors';
import Users from './Users';

const UsersAndCompetitors = observer(() => {
  const { t } = useTranslation();

  return (
    <Tabs
      defaultActiveKey="users"
      type="card"
      items={[
        {
          key: 'users',
          label: t('users.Users'),
          children: <Users />,
        },
        {
          key: 'competitors',
          label: t('users.Competitors'),
          children: <Competitors />,
        },
      ]}
    />
  );
});

export default UsersAndCompetitors;
