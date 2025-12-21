import { Col, DatePicker, Form, Input, Row } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ISessionModel } from '../../models/sessionModel';
import { ICouncilModel, IGroupModel, IUserModel } from '../../models/userModel';
import { dateFormat, errorRequiredField, hasErrors } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';

interface IEditUserProps {
  groups: IGroupModel[];
  councils: ICouncilModel[];
  user: IUserModel;
  sessionModel: ISessionModel;
  onChange: (changes: Partial<IUserModel>) => void;
  onValidate: (valid: boolean) => void;
}
const EditUser = ({ groups, councils, user, sessionModel, onChange, onValidate }: IEditUserProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<IUserModel>();
  // eslint-disable-next-line react-hooks/purity
  const formId = useMemo(() => 'editUser' + Math.floor(Math.random() * 1000000000000000), []);

  useEffect(() => {
    setTimeout(() => {
      hasErrors(form).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [form, onValidate]);

  return (
    <Form
      form={form}
      id={formId}
      layout="vertical"
      initialValues={user}
      onValuesChange={() => hasErrors(form).then(notValid => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={8}>
          <FormItem
            name="firstName"
            label={t('users.FirstName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'users.FirstName')
              }
            ]}
          >
            <Input onChange={e => onChange({ firstName: e.currentTarget.value })} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem
            name="lastName"
            label={t('users.LastName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'users.LastName')
              }
            ]}
          >
            <Input onChange={e => onChange({ lastName: e.currentTarget.value })} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem
            name="birthDay"
            label={t('users.BirthDay')}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
          >
            <DatePicker
              allowClear
              format={dateFormat}
              onChange={date => onChange({ birthDay: date ? date.format(dateFormat) : null })}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="address" label={t('users.Address')}>
            <Input onChange={e => onChange({ address: e.currentTarget.value })} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="zip" label={t('users.Zip')}>
            <Input onChange={e => onChange({ zip: e.currentTarget.value })} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="city" label={t('users.City')}>
            <Input onChange={e => onChange({ city: e.currentTarget.value })} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={24}>
          <FormItem name="email" label={t('users.Email')}>
            <Input onChange={e => onChange({ email: e.currentTarget.value })} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="phoneNo" label={t('users.PhoneNo')}>
            <Input onChange={e => onChange({ phoneNo: e.currentTarget.value })} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="mobilePhoneNo" label={t('users.MobilePhoneNo')}>
            <Input onChange={e => onChange({ mobilePhoneNo: e.currentTarget.value })} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="workPhoneNo" label={t('users.WorkPhoneNo')}>
            <Input onChange={e => onChange({ workPhoneNo: e.currentTarget.value })} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="councilId" label={t('users.Council')}>
            <FormSelect
              options={councils.map(c => ({ code: c.councilId, description: c.name }))}
              onChange={(code: number) => onChange({ councilId: code })}
            />
          </FormItem>
        </Col>
        <Col span={16}>
          <FormItem name="responsibility" label={t('users.Responsibility')}>
            <Input onChange={e => onChange({ responsibility: e.currentTarget.value })} />
          </FormItem>
        </Col>
      </Row>
      {sessionModel.isAdmin ? (
        <Row gutter={8}>
          <Col span={24}>
            <FormItem name="groupIds" label={t('users.Groups')}>
              <FormSelect
                allowClear
                mode="multiple"
                options={groups.map(g => ({ code: g.groupId, description: g.description }))}
                onChange={(codes: number[]) => onChange({ groupIds: codes })}
              />
            </FormItem>
          </Col>
        </Row>
      ) : null}
    </Form>
  );
};

export default EditUser;
