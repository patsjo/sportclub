import { Col, DatePicker, Form, Input, Row, Select } from 'antd';
import { ISessionModel } from 'models/sessionModel';
import { ICouncilModel, IGroupModel, IUserModel } from 'models/userModel';
import moment from 'moment';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { dateFormat, errorRequiredField, FormSelect, hasErrors } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';

const { Option } = Select;

interface IEditUserProps {
  groups: IGroupModel[];
  councils: ICouncilModel[];
  user: IUserModel;
  sessionModel: ISessionModel;
  onValidate: (valid: boolean) => void;
}
const EditUser = ({ groups, councils, user, sessionModel, onValidate }: IEditUserProps) => {
  const { t } = useTranslation();
  const formRef = useRef<any>(null);
  const formId = useMemo(() => 'editUser' + Math.floor(Math.random() * 1000000000000000), []);

  useEffect(() => {
    setTimeout(() => {
      formRef.current && hasErrors(formRef.current).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [formRef.current]);

  return (
    <Form
      id={formId}
      ref={formRef}
      layout="vertical"
      initialValues={{ ...user, birthDay: user.birthDay ? moment(user.birthDay, dateFormat) : null }}
      onValuesChange={() => hasErrors(formRef.current).then((notValid) => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={8}>
          <FormItem
            name="firstName"
            label={t('users.FirstName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'users.FirstName'),
              },
            ]}
          >
            <Input
              onChange={(e) => {
                user.firstName = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem
            name="lastName"
            label={t('users.LastName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'users.LastName'),
              },
            ]}
          >
            <Input
              onChange={(e) => {
                user.lastName = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="birthDay" label={t('users.BirthDay')}>
            <DatePicker
              format={dateFormat}
              allowClear
              onChange={(date) => (user.birthDay = date ? date.format(dateFormat) : null)}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="address" label={t('users.Address')}>
            <Input
              onChange={(e) => {
                user.address = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="zip" label={t('users.Zip')}>
            <Input
              onChange={(e) => {
                user.zip = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="city" label={t('users.City')}>
            <Input
              onChange={(e) => {
                user.city = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={24}>
          <FormItem name="email" label={t('users.Email')}>
            <Input
              onChange={(e) => {
                user.email = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="phoneNo" label={t('users.PhoneNo')}>
            <Input
              onChange={(e) => {
                user.phoneNo = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="mobilePhoneNo" label={t('users.MobilePhoneNo')}>
            <Input
              onChange={(e) => {
                user.mobilePhoneNo = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="workPhoneNo" label={t('users.WorkPhoneNo')}>
            <Input
              onChange={(e) => {
                user.workPhoneNo = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="councilId" label={t('users.Council')}>
            <FormSelect
              options={councils.map((c) => ({ code: c.councilId, description: c.name }))}
              onChange={(code: number) => {
                user.councilId = code;
              }}
            />
          </FormItem>
        </Col>
        <Col span={16}>
          <FormItem name="responsibility" label={t('users.Responsibility')}>
            <Input
              onChange={(e) => {
                user.responsibility = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      {sessionModel.isAdmin ? (
        <Row gutter={8}>
          <Col span={24}>
            <FormItem name="groupIds" label={t('users.Groups')}>
              <FormSelect
                mode="multiple"
                allowClear
                options={groups.map((g) => ({ code: g.groupId, description: g.description }))}
                onChange={(codes: number[]) => {
                  user.groupIds = codes;
                }}
              />
            </FormItem>
          </Col>
        </Row>
      ) : null}
    </Form>
  );
};

export default EditUser;
