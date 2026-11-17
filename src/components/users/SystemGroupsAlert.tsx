import { Alert } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ISystemGroupModel } from '../../models/userModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';

// The groups the code depends on (e.g. cADMIN_GROUP_ID in php/include/users.php) should exist in the database,
// with the Swedish or English translation as description
const SystemGroupsAlert = observer(() => {
  const { t, i18n } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [systemGroups, setSystemGroups] = useState<ISystemGroupModel[]>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Users')?.queryUrl;
    if (!sessionModel.loggedIn || !url) return;

    PostJsonData<{ systemGroups: ISystemGroupModel[] }>(
      url,
      { iType: 'SYSTEM_GROUPS' },
      true,
      sessionModel.authorizationHeader
    )
      .then(data => {
        setSystemGroups(data?.systemGroups ?? []);
        setLoadError(undefined);
      })
      .catch(e => setLoadError(e?.message ?? String(e)));
  }, [clubModel.modules, sessionModel.authorizationHeader, sessionModel.loggedIn]);

  const tSv = i18n.getFixedT('sv');
  const tEn = i18n.getFixedT('en');
  const interpolation = { escapeValue: false };
  const problems = (systemGroups ?? [])
    .map(group => {
      const sv = tSv(`users.SystemGroup${group.key}`);
      const en = tEn(`users.SystemGroup${group.key}`);
      const description = group.description?.trim();
      if (description == null) return t('users.SystemGroupMissing', { groupId: group.groupId, sv, en, interpolation });
      if (description !== sv && description !== en)
        return t('users.SystemGroupWrongDescription', {
          groupId: group.groupId,
          description: group.description,
          sv,
          en,
          interpolation
        });
      return undefined;
    })
    .filter((problem): problem is string => !!problem);

  if (loadError)
    return (
      <Alert
        showIcon
        type="warning"
        style={{ marginBottom: 12 }}
        title={t('users.SystemGroupsLoadError', { error: loadError, interpolation })}
      />
    );

  return problems.length > 0 ? (
    <Alert
      showIcon
      type="warning"
      style={{ marginBottom: 12 }}
      title={t('users.SystemGroupsWarning')}
      description={
        problems.length === 1 ? (
          problems[0]
        ) : (
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {problems.map(problem => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )
      }
    />
  ) : null;
});

export default SystemGroupsAlert;
