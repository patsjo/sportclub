import { Col, DatePicker, Divider, Form, Input, Row } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IRaceCompetitor } from '../../models/resultModel';
import { PickRequired } from '../../models/typescriptPartial';
import { IOption, dateFormat, errorRequiredField, hasErrors, parseIntegerFromString } from '../../utils/formHelper';
import { GenderType, genderOptions } from '../../utils/resultConstants';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';

interface ICompetitorForm extends PickRequired<IRaceCompetitor, 'firstName' | 'lastName'> {
  familyName?: string;
}

interface IEditUserProps {
  competitor: ICompetitorForm;
  familyOptions: IOption[];
  onChange: (changes: Partial<ICompetitorForm>) => void;
  onValidate: (valid: boolean) => void;
}
const EditCompetitor = ({ competitor, familyOptions, onChange, onValidate }: IEditUserProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ICompetitorForm>();
  // eslint-disable-next-line react-hooks/purity
  const formId = useMemo(() => 'editCompetitor' + Math.floor(Math.random() * 1000000000000000), []);
  const [newFamily, setNewFamily] = useState('');

  useEffect(() => {
    setTimeout(() => {
      if (form) hasErrors(form).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [onValidate, form]);

  return (
    <Form
      id={formId}
      form={form}
      layout="vertical"
      initialValues={competitor}
      onValuesChange={() => hasErrors(form).then(notValid => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={12}>
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
        <Col span={12}>
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
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem
            name="birthDay"
            label={t('users.BirthDay')}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
          >
            <DatePicker
              format={dateFormat}
              onChange={date => onChange({ birthDay: date ? date.format(dateFormat) : '1930-01-01' })}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="gender" label={t('users.Gender')}>
            <FormSelect
              style={{ minWidth: 60, maxWidth: 100 }}
              options={genderOptions(t)}
              onChange={(value: GenderType) => onChange({ gender: value })}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem
            name="startDate"
            label={t('results.StartDate')}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
          >
            <DatePicker
              allowClear
              format={dateFormat}
              onChange={date => onChange({ startDate: date ? date.format(dateFormat) : '1930-01-01' })}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem
            name="endDate"
            label={t('results.EndDate')}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
          >
            <DatePicker
              allowClear
              format={dateFormat}
              onChange={date => onChange({ endDate: date ? date.format(dateFormat) : undefined })}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem name="familyId" label={t('users.FamilySelect')}>
            <FormSelect
              allowClear
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Input
                    placeholder={t('users.FamilySelect') ?? undefined}
                    value={newFamily}
                    onChange={e => {
                      setNewFamily(e.currentTarget.value);
                      competitor.familyName = e.currentTarget.value;
                      if (!e.currentTarget.value || e.currentTarget.value === '') {
                        competitor.familyId = null;
                        form.setFieldsValue({
                          familyId: null
                        });
                      } else {
                        competitor.familyId = -1;
                        form.setFieldsValue({
                          familyId: -1
                        });
                      }
                    }}
                  />
                </>
              )}
              options={[{ code: -1, description: newFamily }, ...familyOptions].filter(
                opt => opt.description && opt.description.length
              )}
              onChange={(value: number) => onChange({ familyId: value })}
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
                  if (values.some(value => parseIntegerFromString(value) == null))
                    throw new Error(t('common.NotANumber') ?? undefined);
                }
              }
            ]}
          >
            <FormSelect
              allowClear
              mode="tags"
              options={[]}
              onChange={(values: string[]) =>
                onChange({ eventorCompetitorIds: values.map(parseIntegerFromString) as number[] })
              }
            />
          </FormItem>
        </Col>
      </Row>
    </Form>
  );
};

export default EditCompetitor;
