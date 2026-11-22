import { Button, Empty, Form, Input, List, Modal, Select, Spin, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IAccessRequest, IRequestableGroup } from '../../models/accountModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import FormItem from '../formItems/FormItem';

const Info = styled.p`
  margin-bottom: 12px;
`;

/** The request and its cancel button on one row, the button wraps below on a narrow phone */
const RequestRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
  width: 100%;
`;

const Muted = styled.div`
  color: rgba(0, 0, 0, 0.45);
  font-style: italic;
`;

/** The group 0 is to become a member */
const memberGroupId = 0;

/** Sent within this time with the same message, it is the same request (one row per group in the database) */
const SAME_REQUEST_SECONDS = 60;

/** The requests sent together, newest first (as the server answers) */
export const groupRequests = (requests: IAccessRequest[]): IAccessRequest[][] =>
  requests.reduce<IAccessRequest[][]>((sent, request) => {
    const last = sent[sent.length - 1]?.[0];
    if (
      last &&
      (last.message ?? '') === (request.message ?? '') &&
      Math.abs(dayjs(last.creDate).diff(dayjs(request.creDate), 'second')) <= SAME_REQUEST_SECONDS
    )
      sent[sent.length - 1].push(request);
    else sent.push([request]);
    return sent;
  }, []);

const statusColor = (status: IAccessRequest['status']) =>
  status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'blue';

interface IAccessRequestModalProps {
  open: boolean;
  onClose: () => void;
}
const AccessRequestModal = observer(({ open, onClose }: IAccessRequestModalProps) => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<{ groupIds: number[]; message?: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<IRequestableGroup[]>([]);
  const [memberGroupIds, setMemberGroupIds] = useState<number[]>([]);
  const [requests, setRequests] = useState<IAccessRequest[]>([]);
  const url = clubModel.socialLogin?.accountsUrl;
  // A guest only asks for a user account, a user only for access groups
  const accountMode = sessionModel.isGuest;
  const { setMyPendingAccessRequests } = sessionModel;

  const load = useCallback(() => {
    if (!url) return;
    setLoading(true);
    PostJsonData<{ groups: IRequestableGroup[]; memberGroupIds: number[]; requests: IAccessRequest[] }>(
      url,
      { iType: 'MY' },
      true,
      sessionModel.authorizationHeader
    )
      .then(json => {
        if (json) {
          setGroups(json.groups);
          setMemberGroupIds(json.memberGroupIds);
          setRequests(json.requests);
          const pending = json.requests.filter(r => r.status === 'PENDING').map(r => r.groupId);
          // The menu shows "Pending ..." instead of the request
          setMyPendingAccessRequests(pending.length);
          // The ones already sent are no longer choices (e.g. when only some were sent), otherwise the form is
          // kept, also when the dialog is closed
          const selected = (form.getFieldValue('groupIds') as number[] | undefined) ?? [];
          if (selected.some(groupId => pending.includes(groupId)))
            form.setFieldValue(
              'groupIds',
              selected.filter(groupId => !pending.includes(groupId))
            );
        }
      })
      .catch(e => messageApi.error(`${t('login.LoadRequestsFailed')} (${url}: ${e?.message})`))
      .finally(() => setLoading(false));
  }, [form, messageApi, sessionModel.authorizationHeader, setMyPendingAccessRequests, t, url]);

  useEffect(() => {
    if (open) load();
  }, [load, open]);

  const groupName = (groupId: number) =>
    groupId === memberGroupId ? t('login.Member') : (groups.find(g => g.groupId === groupId)?.description ?? '');

  // Not the groups the user is in, or that already wait for an answer
  const pendingGroupIds = requests.filter(r => r.status === 'PENDING').map(r => r.groupId);
  const options = groups
    .filter(g => !memberGroupIds.includes(g.groupId) && !pendingGroupIds.includes(g.groupId))
    .map(g => ({ value: g.groupId, label: g.description }));
  const canSend = accountMode ? !pendingGroupIds.includes(memberGroupId) : options.length > 0;

  // The account, or one request per group one at a time
  const onSend = () =>
    form.validateFields().then(async values => {
      if (!url) return;
      const groupIds = accountMode ? [memberGroupId] : values.groupIds;
      setSaving(true);
      try {
        for (const groupId of groupIds) {
          await PostJsonData(
            url,
            { iType: 'REQUEST', groupId, message: values.message ?? '' },
            true,
            sessionModel.authorizationHeader,
            1
          );
        }
        messageApi.success(t('login.RequestSent', { count: groupIds.length }));
        setMyPendingAccessRequests(pendingGroupIds.length + groupIds.length);
        form.resetFields();
        load();
        onClose();
      } catch (e) {
        // The ones sent before the error are listed under My requests
        messageApi.error((e as Error)?.message);
        load();
      } finally {
        setSaving(false);
      }
    });

  // All the pending groups of a request
  const onCancelRequest = async (requestIds: number[]) => {
    if (!url) return;
    try {
      for (const requestId of requestIds)
        await PostJsonData(url, { iType: 'CANCEL', requestId }, true, sessionModel.authorizationHeader, 1);
    } catch (e) {
      messageApi.error((e as Error)?.message);
    }
    load();
  };

  // The message is outside the dialog, it is shown also after the dialog is closed
  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={accountMode ? t('login.RequestMembership') : t('login.RequestAccess')}
        okText={t('login.SendRequest')}
        okButtonProps={{ loading: saving, disabled: loading || !canSend }}
        cancelText={t('common.Close')}
        style={{ top: 40 }}
        onOk={onSend}
        onCancel={onClose}
      >
        <Info>{accountMode ? t('login.RequestMembershipInfo') : t('login.RequestAccessInfo')}</Info>
        <Spin spinning={loading}>
          <Form form={form} layout="vertical">
            {accountMode ? null : (
              <FormItem
                name="groupIds"
                label={t('login.RequestGroup')}
                rules={[{ required: true, message: t('login.RequestGroup') }]}
              >
                <Select mode="multiple" options={options} />
              </FormItem>
            )}
            <FormItem name="message" label={t('login.RequestMessage')}>
              <Input.TextArea
                maxLength={500}
                autoSize={{ minRows: 2, maxRows: 5 }}
                placeholder={t('login.RequestMessagePlaceholder')}
              />
            </FormItem>
          </Form>
          {requests.length > 0 ? (
            <List
              size="small"
              header={t('login.MyRequests')}
              dataSource={groupRequests(requests)}
              rowKey={sent => sent[0].requestId}
              renderItem={sent => {
                const pendingIds = sent.filter(r => r.status === 'PENDING').map(r => r.requestId);
                // One status for all the groups, or else the status of each group
                const sameStatus = sent.every(r => r.status === sent[0].status);
                return (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <RequestRow>
                        <span>
                          {dayjs(sent[0].creDate).format('YYYY-MM-DD')}
                          {sameStatus ? (
                            <Tag color={statusColor(sent[0].status)} style={{ marginInlineStart: 8 }}>
                              {t(`login.Status.${sent[0].status}`)}
                            </Tag>
                          ) : null}
                        </span>
                        {pendingIds.length > 0 ? (
                          <Button size="small" onClick={() => onCancelRequest(pendingIds)}>
                            {t('common.Cancel')}
                          </Button>
                        ) : null}
                      </RequestRow>
                      <div>
                        {t('login.RequestGroup')}:{' '}
                        {sameStatus
                          ? sent.map(r => groupName(r.groupId)).join(', ')
                          : sent.map((r, index) => (
                              // The name and its status stay together on a narrow phone
                              <span key={r.requestId} style={{ whiteSpace: 'nowrap' }}>
                                {index > 0 ? ' ' : ''}
                                {groupName(r.groupId)}{' '}
                                <Tag color={statusColor(r.status)}>{t(`login.Status.${r.status}`)}</Tag>
                              </span>
                            ))}
                      </div>
                      {sent[0].message ? <Muted>”{sent[0].message}”</Muted> : null}
                    </div>
                  </List.Item>
                );
              }}
            />
          ) : !loading ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('login.NoRequests')} />
          ) : null}
        </Spin>
      </Modal>
    </>
  );
});

export default AccessRequestModal;
