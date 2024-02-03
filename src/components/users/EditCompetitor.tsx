import { Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { IRaceCompetitor } from 'models/resultModel';
import { PickRequired } from 'models/typescriptPartial';
import moment from 'moment';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GenderType, genderOptions } from 'utils/resultConstants';
import {
  FormSelect,
  IOption,
  dateFormat,
  errorRequiredField,
  hasErrors,
  parseIntegerFromString,
} from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';

const { Option } = Select;

interface IEditUserProps {
  competitor: PickRequired<IRaceCompetitor, 'firstName' | 'lastName'> & { familyName?: string };
  familyOptions: IOption[];
  onValidate: (valid: boolean) => void;
}
const EditCompetitor = ({ competitor, familyOptions, onValidate }: IEditUserProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const formRef = useRef<any>(null);
  const formId = useMemo(() => 'editCompetitor' + Math.floor(Math.random() * 1000000000000000), []);
  const [newFamily, setNewFamily] = useState('');

  useEffect(() => {
    setTimeout(() => {
      formRef.current && hasErrors(formRef.current).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [formRef.current]);

  return (
    <Form
      id={formId}
      ref={formRef}
      form={form}
      layout="vertical"
      initialValues={{
        ...competitor,
        birthDay: competitor.birthDay ? moment(competitor.birthDay, dateFormat) : null,
        startDate: competitor.startDate ? moment(competitor.startDate, dateFormat) : null,
        endDate: competitor.endDate ? moment(competitor.endDate, dateFormat) : null,
      }}
      onValuesChange={() => hasErrors(formRef.current).then((notValid) => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={12}>
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
                competitor.firstName = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={12}>
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
                competitor.lastName = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem name="birthDay" label={t('users.BirthDay')}>
            <DatePicker
              format={dateFormat}
              onChange={(date) => (competitor.birthDay = date ? date.format(dateFormat) : '1930-01-01')}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="gender" label={t('users.Gender')}>
            <FormSelect
              style={{ minWidth: 60, maxWidth: 100 }}
              options={genderOptions(t)}
              onChange={(value: GenderType) => {
                competitor.gender = value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem name="startDate" label={t('results.StartDate')}>
            <DatePicker
              allowClear
              format={dateFormat}
              onChange={(date) => (competitor.startDate = date ? date.format(dateFormat) : '1930-01-01')}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="endDate" label={t('results.EndDate')}>
            <DatePicker
              allowClear
              format={dateFormat}
              onChange={(date) => (competitor.endDate = date ? date.format(dateFormat) : undefined)}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem name="familyId" label={t('users.FamilySelect')}>
            <FormSelect
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Input
                    placeholder={t('users.FamilySelect') ?? undefined}
                    value={newFamily}
                    onChange={(e) => {
                      setNewFamily(e.currentTarget.value);
                      competitor.familyName = e.currentTarget.value;
                      if (!e.currentTarget.value || e.currentTarget.value === '') {
                        competitor.familyId = null;
                        form.setFieldsValue({
                          familyId: null,
                        });
                      } else {
                        competitor.familyId = -1;
                        form.setFieldsValue({
                          familyId: -1,
                        });
                      }
                    }}
                  />
                </>
              )}
              options={[{ code: -1, description: newFamily }, ...familyOptions].filter(
                (opt) => opt.description && opt.description.length
              )}
              onChange={(value: number) => {
                competitor.familyId = value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem
            name="eventorCompetitorIds"
            label="Eventor Id"
            rules={[
              {
                validator: async (_, values: string[]) => {
                  if (values.some((value) => parseIntegerFromString(value) == null))
                    throw new Error(t('common.NotANumber') ?? undefined);
                },
              },
            ]}
          >
            <FormSelect
              allowClear
              mode="tags"
              options={[]}
              onChange={(values: string[]) =>
                (competitor.eventorCompetitorIds = values.map(parseIntegerFromString) as number[])
              }
            />
          </FormItem>
        </Col>
      </Row>
    </Form>
  );
};

export default EditCompetitor;
