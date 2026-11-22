import { Col, Form, Input, Modal, Radio, Row, Select } from 'antd';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IAccessRequest,
  IAccountUser,
  ILinkAccountRequest,
  IOAuthAccount,
  IRequestableGroup
} from '../../models/accountModel';
import { INumberOption } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import { providerName } from '../login/ProviderLogos';

/** userId 0 = create a new user */
const newUserId = 0;

interface ILinkAccountForm {
  /** Link to an existing user, or create a new user */
  userMode: 'existing' | 'new';
  userId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  competitorId?: number | null;
  /** 0 = only to become a user */
  groupIds?: number[];
}

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

/** The user with the same email, or else the same name */
const suggestUser = (account: IOAuthAccount, users: IAccountUser[]) =>
  users.find(user => account.email && normalize(user.email) === normalize(account.email)) ??
  users.find(user => normalize(user.name) === normalize(account.name));

interface ILinkAccountModalProps {
  /** The Google/Facebook account, undefined for a request from a user */
  account?: IOAuthAccount;
  /** Approve this request, or else only link the account */
  request?: IAccessRequest;
  users: IAccountUser[];
  groups: IRequestableGroup[];
  competitorOptions: INumberOption[];
  saving: boolean;
  onOk: (values: ILinkAccountRequest) => void;
  onCancel: () => void;
}
const LinkAccountModal = ({
  account,
  request,
  users,
  groups,
  competitorOptions,
  saving,
  onOk,
  onCancel
}: ILinkAccountModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ILinkAccountForm>();
  const userMode = Form.useWatch('userMode', form);
  const userId = Form.useWatch('userId', form);
  const chooseUser = !!account;

  const initialValues = useMemo((): ILinkAccountForm => {
    const user = account
      ? (users.find(u => u.userId === account.userId) ?? suggestUser(account, users))
      : users.find(u => u.userId === request?.userId);
    const competitorByName = account
      ? competitorOptions.find(c => normalize(c.description).startsWith(normalize(account.name) + ' ('))
      : undefined;
    return {
      userMode: account && !user && users.length === 0 ? 'new' : 'existing',
      userId: user?.userId,
      firstName: account?.firstName ?? account?.name.split(' ')[0] ?? '',
      lastName: account?.lastName ?? account?.name.split(' ').slice(1).join(' ') ?? '',
      email: account?.email ?? '',
      competitorId: user ? user.competitorId : (competitorByName?.code ?? null),
      groupIds: request ? [request.groupId] : []
    };
  }, [account, competitorOptions, request, users]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  const userOptions = users.map(user => ({
    value: user.userId,
    label: user.email ? `${user.name} (${user.email})` : user.name
  }));
  // An existing user is already a user and keeps its groups, they are shown but can't be chosen
  const existingUser = chooseUser
    ? userMode === 'new'
      ? undefined
      : users.find(u => u.userId === userId)
    : users.find(u => u.userId === request?.userId);
  const excludedGroupIds = useMemo(() => (existingUser ? [0, ...(existingUser.groupIds ?? [])] : []), [existingUser]);
  const groupOptions = [
    { value: 0, label: t('login.Member') },
    ...groups.map(group => ({ value: group.groupId, label: group.description }))
  ].map(option => ({ ...option, disabled: excludedGroupIds.includes(option.value) }));

  // Another user is chosen, the groups it already has are taken away from the choice
  useEffect(() => {
    const selected = (form.getFieldValue('groupIds') as number[] | undefined) ?? [];
    if (selected.some(groupId => excludedGroupIds.includes(groupId)))
      form.setFieldValue(
        'groupIds',
        selected.filter(groupId => !excludedGroupIds.includes(groupId))
      );
  }, [excludedGroupIds, form]);

  return (
    <Modal
      open={true}
      width={640}
      style={{ top: 40 }}
      title={request ? t('accounts.ApproveRequest') : t('accounts.LinkAccount')}
      okText={request ? t('accounts.Approve') : t('accounts.Link')}
      okButtonProps={{ loading: saving }}
      cancelText={t('common.Cancel')}
      onCancel={onCancel}
      onOk={() =>
        form.validateFields().then(values => {
          const groupIds = (values.groupIds ?? []).filter(groupId => groupId > 0);
          const link: ILinkAccountRequest = {
            oauthId: account?.oauthId,
            requestId: request?.requestId,
            competitorId: values.competitorId ?? null,
            ...(request ? { groupIds, groupId: groupIds[0] ?? 0 } : {})
          };
          if (chooseUser) {
            link.userId = values.userMode === 'new' ? newUserId : values.userId;
            if (values.userMode === 'new') {
              link.firstName = values.firstName;
              link.lastName = values.lastName;
              link.email = values.email;
            }
          }
          onOk(link);
        })
      }
    >
      <p>
        {account
          ? `${account.name}${account.email ? ` (${account.email})` : ''}, ${providerName(account.provider)}`
          : request?.userName}
      </p>
      {request?.message ? <p style={{ fontStyle: 'italic' }}>”{request.message}”</p> : null}
      <Form form={form} layout="vertical" initialValues={initialValues}>
        {chooseUser ? (
          <FormItem name="userMode" label={t('accounts.User')}>
            <Radio.Group
              onChange={e =>
                form.setFieldValue(
                  'competitorId',
                  e.target.value === 'new'
                    ? initialValues.competitorId
                    : (users.find(u => u.userId === form.getFieldValue('userId'))?.competitorId ?? null)
                )
              }
            >
              <Radio value="existing">{t('accounts.ExistingUser')}</Radio>
              <Radio value="new">{t('accounts.CreateNewUser')}</Radio>
            </Radio.Group>
          </FormItem>
        ) : null}
        {chooseUser && userMode !== 'new' ? (
          <FormItem name="userId" rules={[{ required: true, message: t('accounts.SelectUser') }]}>
            <Select
              showSearch
              placeholder={t('accounts.SelectUser')}
              optionFilterProp="label"
              options={userOptions}
              onChange={(value: number) =>
                form.setFieldValue('competitorId', users.find(u => u.userId === value)?.competitorId ?? null)
              }
            />
          </FormItem>
        ) : null}
        {chooseUser && userMode === 'new' ? (
          <Row gutter={8}>
            <Col span={8}>
              <FormItem name="firstName" label={t('users.FirstName')} rules={[{ required: true, max: 16 }]}>
                <Input />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="lastName" label={t('users.LastName')} rules={[{ required: true, max: 32 }]}>
                <Input />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="email" label={t('users.Email')} rules={[{ max: 64 }]}>
                <Input />
              </FormItem>
            </Col>
          </Row>
        ) : null}
        <FormItem name="competitorId" label={t('accounts.Competitor')} extra={t('accounts.CompetitorInfo')}>
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            options={competitorOptions.map(option => ({ value: option.code, label: option.description }))}
          />
        </FormItem>
        {request ? (
          <FormItem
            name="groupIds"
            label={t('login.RequestGroup')}
            // A guest is approved by the link to a user, a user's request needs a group
            rules={chooseUser ? [] : [{ required: true, message: t('login.RequestGroup') }]}
          >
            <Select mode="multiple" options={groupOptions} />
          </FormItem>
        ) : null}
      </Form>
    </Modal>
  );
};

export default LinkAccountModal;
