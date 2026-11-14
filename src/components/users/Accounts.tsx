import { Avatar, Button, Card, Empty, List, message, Popconfirm, Space, Spin, Table, TableProps, Tag } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IAccessRequest, IAccountsList, ILinkAccountRequest, IOAuthAccount } from '../../models/accountModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { ProviderLogo } from '../login/ProviderLogos';
import LinkAccountModal from './LinkAccountModal';
import { useCompetitorOptions } from './useCompetitorOptions';

const providerIcon = (provider: string) => (
  <ProviderLogo provider={provider} size={14} style={{ marginInlineEnd: 4 }} />
);
const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm');

interface IAccountsProps {
  onPendingChange?: (count: number) => void;
}

/** Accounts from Google/Facebook and the access requests, for administrators */
const Accounts = observer(({ onPendingChange }: IAccountsProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [messageApi, contextHolder] = message.useMessage();
  const [data, setData] = useState<IAccountsList>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<{ account?: IOAuthAccount; request?: IAccessRequest }>();
  const url = clubModel.socialLogin?.accountsUrl;

  const load = useCallback(() => {
    if (!url || !sessionModel.isAdmin) return;
    setLoading(true);
    PostJsonData<IAccountsList>(url, { iType: 'LIST' }, true, sessionModel.authorizationHeader)
      .then(json => {
        if (json) {
          setData(json);
          onPendingChange?.(json.requests.length);
        }
      })
      .catch(e => messageApi.error(`${t('accounts.LoadFailed')} (${url}: ${e?.message})`))
      .finally(() => setLoading(false));
  }, [messageApi, onPendingChange, sessionModel.authorizationHeader, sessionModel.isAdmin, t, url]);

  useEffect(() => load(), [load]);

  const { competitorOptions, competitorName } = useCompetitorOptions(messageApi);
  const groupName = (groupId: number) =>
    groupId === 0 ? t('login.Member') : (data?.groups.find(g => g.groupId === groupId)?.description ?? groupId);
  const accountOf = (request: IAccessRequest) => data?.accounts.find(a => a.oauthId === request.oauthId);

  const save = useCallback(
    (body: object, onDone?: () => void) => {
      if (!url) return;
      setSaving(true);
      PostJsonData(url, body, true, sessionModel.authorizationHeader, 1)
        .then(() => {
          onDone?.();
          load();
        })
        .catch(e => messageApi.error(e?.message))
        .finally(() => setSaving(false));
    },
    [load, messageApi, sessionModel.authorizationHeader, url]
  );

  const onLink = (link: ILinkAccountRequest) =>
    save({ iType: link.requestId ? 'APPROVE' : 'LINK', ...link }, () => {
      setLinking(undefined);
      messageApi.success(link.requestId ? t('accounts.Approved') : t('accounts.Linked'));
    });

  const columns: TableProps<IOAuthAccount>['columns'] = [
    {
      title: t('accounts.Account'),
      key: 'name',
      render: (_, account) => (
        <Space>
          <Avatar
            size="small"
            src={account.pictureUrl ?? undefined}
            icon={<ProviderLogo provider={account.provider} size={16} />}
            style={{ backgroundColor: '#f0f0f0' }}
          />
          {account.name}
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: t('accounts.Provider'),
      key: 'provider',
      render: (_, account) => (
        <Tag icon={providerIcon(account.provider)}>{account.provider === 'GOOGLE' ? 'Google' : 'Facebook'}</Tag>
      )
    },
    { title: t('users.Email'), dataIndex: 'email', key: 'email' },
    {
      title: t('accounts.User'),
      key: 'user',
      render: (_, account) => (account.userId ? account.userName : <Tag color="orange">{t('login.Guest')}</Tag>)
    },
    {
      title: t('accounts.Competitor'),
      key: 'competitor',
      render: (_, account) => competitorName(account.competitorId)
    },
    {
      title: t('accounts.LastLogin'),
      dataIndex: 'lastLoginDate',
      key: 'lastLoginDate',
      render: (date: string) => formatDate(date),
      sorter: (a, b) => a.lastLoginDate.localeCompare(b.lastLoginDate)
    },
    {
      key: 'actions',
      render: (_, account) => (
        <Space>
          <Button size="small" onClick={() => setLinking({ account })}>
            {account.userId ? t('common.Edit') : t('accounts.Link')}
          </Button>
          {account.userId ? (
            <Popconfirm
              title={t('accounts.UnlinkConfirm')}
              okText={t('common.Yes')}
              cancelText={t('common.No')}
              onConfirm={() => save({ iType: 'UNLINK', oauthId: account.oauthId })}
            >
              <Button size="small">{t('accounts.Unlink')}</Button>
            </Popconfirm>
          ) : null}
          <Popconfirm
            title={t('accounts.DeleteConfirm')}
            okText={t('common.Yes')}
            cancelText={t('common.No')}
            onConfirm={() => save({ iType: 'DELETE_ACCOUNT', oauthId: account.oauthId })}
          >
            <Button danger size="small">
              {t('common.Delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (!url) return null;

  return (
    <Spin spinning={loading || saving}>
      {contextHolder}
      <Card size="small" title={t('accounts.PendingRequests')} style={{ marginBottom: 16 }}>
        {data?.requests.length ? (
          <List
            dataSource={data.requests}
            renderItem={request => {
              const account = accountOf(request);
              return (
                <List.Item
                  actions={[
                    <Button key="approve" type="primary" size="small" onClick={() => setLinking({ account, request })}>
                      {t('accounts.Approve')}…
                    </Button>,
                    <Popconfirm
                      key="reject"
                      title={t('accounts.RejectConfirm')}
                      okText={t('common.Yes')}
                      cancelText={t('common.No')}
                      onConfirm={() => save({ iType: 'REJECT', requestId: request.requestId })}
                    >
                      <Button danger size="small">
                        {t('accounts.Reject')}
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      account ? (
                        <Avatar
                          src={account.pictureUrl ?? undefined}
                          icon={<ProviderLogo provider={account.provider} size={16} />}
                          style={{ backgroundColor: '#f0f0f0' }}
                        />
                      ) : (
                        <Avatar>{request.userName?.charAt(0)}</Avatar>
                      )
                    }
                    title={
                      <>
                        {account ? account.name : request.userName}
                        {account?.email ? ` (${account.email})` : ''} →{' '}
                        <Tag color="blue">{groupName(request.groupId)}</Tag>
                      </>
                    }
                    description={
                      <>
                        {formatDate(request.creDate)}
                        {account && !account.userId ? ` · ${t('login.Guest')}` : ''}
                        {request.userName && account ? ` · ${request.userName}` : ''}
                        {request.message ? <div>”{request.message}”</div> : null}
                      </>
                    }
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('accounts.NoPendingRequests')} />
        )}
      </Card>
      <Table<IOAuthAccount>
        size="small"
        rowKey="oauthId"
        columns={columns}
        dataSource={data?.accounts ?? []}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        scroll={{ x: true }}
        locale={{ emptyText: t('accounts.NoAccounts') }}
      />
      {linking && data ? (
        <LinkAccountModal
          account={linking.account}
          request={linking.request}
          users={data.users}
          groups={data.groups}
          competitorOptions={competitorOptions}
          saving={saving}
          onOk={onLink}
          onCancel={() => setLinking(undefined)}
        />
      ) : null}
    </Spin>
  );
});

export default Accounts;
