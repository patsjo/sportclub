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

/** The group 0 is to become a member */
const memberGroupId = 0;

interface IAccessRequestModalProps {
  open: boolean;
  onClose: () => void;
}
const AccessRequestModal = observer(({ open, onClose }: IAccessRequestModalProps) => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<{ groupId: number; message?: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<IRequestableGroup[]>([]);
  const [memberGroupIds, setMemberGroupIds] = useState<number[]>([]);
  const [requests, setRequests] = useState<IAccessRequest[]>([]);
  const url = clubModel.socialLogin?.accountsUrl;

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
        }
      })
      .catch(e => messageApi.error(`${t('login.LoadRequestsFailed')} (${url}: ${e?.message})`))
      .finally(() => setLoading(false));
  }, [messageApi, sessionModel.authorizationHeader, t, url]);

  useEffect(() => {
    if (open) load();
  }, [load, open]);

  const groupName = (groupId: number) =>
    groupId === memberGroupId ? t('login.Member') : (groups.find(g => g.groupId === groupId)?.description ?? '');

  const options = [
    ...(sessionModel.isGuest ? [{ value: memberGroupId, label: t('login.Member') }] : []),
    ...groups.filter(g => !memberGroupIds.includes(g.groupId)).map(g => ({ value: g.groupId, label: g.description }))
  ];

  const onSend = () =>
    form.validateFields().then(values => {
      if (!url) return;
      setSaving(true);
      PostJsonData(
        url,
        { iType: 'REQUEST', groupId: values.groupId, message: values.message ?? '' },
        true,
        sessionModel.authorizationHeader,
        1
      )
        .then(() => {
          messageApi.success(t('login.RequestSent'));
          form.resetFields();
          load();
        })
        .catch(e => messageApi.error(e?.message))
        .finally(() => setSaving(false));
    });

  const onCancelRequest = (requestId: number) => {
    if (!url) return;
    PostJsonData(url, { iType: 'CANCEL', requestId }, true, sessionModel.authorizationHeader, 1)
      .then(load)
      .catch(e => messageApi.error(e?.message));
  };

  return (
    <Modal
      open={open}
      title={sessionModel.isGuest ? t('login.RequestMembership') : t('login.RequestAccess')}
      okText={t('login.SendRequest')}
      okButtonProps={{ loading: saving, disabled: loading || options.length === 0 }}
      cancelText={t('common.Close')}
      style={{ top: 40 }}
      onOk={onSend}
      onCancel={onClose}
    >
      {contextHolder}
      <Info>{sessionModel.isGuest ? t('login.RequestMembershipInfo') : t('login.RequestAccessInfo')}</Info>
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ groupId: sessionModel.isGuest ? memberGroupId : undefined }}
        >
          <FormItem
            name="groupId"
            label={t('login.RequestGroup')}
            rules={[{ required: true, message: t('login.RequestGroup') }]}
          >
            <Select options={options} />
          </FormItem>
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
            dataSource={requests}
            renderItem={request => (
              <List.Item
                actions={
                  request.status === 'PENDING'
                    ? [
                        <Button key="cancel" size="small" onClick={() => onCancelRequest(request.requestId)}>
                          {t('common.Cancel')}
                        </Button>
                      ]
                    : []
                }
              >
                {groupName(request.groupId)} · {dayjs(request.creDate).format('YYYY-MM-DD')}{' '}
                <Tag color={request.status === 'APPROVED' ? 'green' : request.status === 'REJECTED' ? 'red' : 'blue'}>
                  {t(`login.Status.${request.status}`)}
                </Tag>
              </List.Item>
            )}
          />
        ) : !loading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('login.NoRequests')} />
        ) : null}
      </Spin>
    </Modal>
  );
});

export default AccessRequestModal;
