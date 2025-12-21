import { DatePicker, Form, Input, Tabs } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dateFormat, errorRequiredField, INumberOption } from '../../utils/formHelper';
import { genderOptions, GenderType } from '../../utils/resultConstants';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';

const { TabPane } = Tabs;

export interface INewCompetitorForm {
  iType: 'COMPETITOR';
  iEventorCompetitorId: string | null;
  iFirstName: string | null;
  iLastName: string | null;
  iBirthDay?: string | null;
  iGender: GenderType | null;
  iClubId: number;
  iStartDate?: string | null;
  iEndDate?: string | null;
}
export interface IAddLinkCompetitor {
  competitorId: number;
  newCompetitor: INewCompetitorForm;
}
interface IAddMapCompetitor {
  addLinkCompetitor: IAddLinkCompetitor;
  competitorsOptions: INumberOption[];
  defaultActiveKey: string;
  onTabChange: (key: string) => void;
  onValidate: (valid: boolean) => void;
  onChange: (
    changes: Partial<Omit<IAddLinkCompetitor, 'newCompetitor'> & { newCompetitor: Partial<INewCompetitorForm> }>
  ) => void;
}
const AddMapCompetitor = ({
  addLinkCompetitor,
  competitorsOptions,
  defaultActiveKey,
  onTabChange,
  onValidate,
  onChange
}: IAddMapCompetitor) => {
  const { t } = useTranslation();
  // eslint-disable-next-line react-hooks/purity
  const formId = useMemo(() => 'addMapCompetitor' + Math.floor(Math.random() * 1000000000000000), []);

  const validate = useCallback(
    (key: string) => {
      const { iFirstName, iLastName, iBirthDay, iGender, iStartDate } = addLinkCompetitor.newCompetitor;

      if (key === '1') {
        onValidate(addLinkCompetitor.competitorId != null && addLinkCompetitor.competitorId !== -1);
      } else {
        onValidate(
          !!iFirstName &&
            !!iLastName &&
            !!iBirthDay &&
            !!iGender &&
            !!iStartDate &&
            iFirstName.length > 0 &&
            iLastName.length > 0
        );
      }
    },
    [addLinkCompetitor, onValidate]
  );

  const onThisTabChange = useCallback(
    (key: string) => {
      onTabChange(key);
      validate(key);
    },
    [onTabChange, validate]
  );

  useEffect(() => {
    validate(defaultActiveKey);
  }, [defaultActiveKey, validate]);

  return (
    <Form
      id={formId}
      layout="vertical"
      initialValues={{
        ...addLinkCompetitor,
        competitorId:
          !addLinkCompetitor.competitorId || addLinkCompetitor.competitorId === -1
            ? undefined
            : addLinkCompetitor.competitorId,
        firstName: addLinkCompetitor.newCompetitor.iFirstName,
        lastName: addLinkCompetitor.newCompetitor.iLastName,
        birthDay: addLinkCompetitor.newCompetitor.iBirthDay,
        gender: addLinkCompetitor.newCompetitor.iGender,
        startDate: addLinkCompetitor.newCompetitor.iStartDate
      }}
    >
      <Tabs defaultActiveKey={defaultActiveKey} onChange={onThisTabChange}>
        <TabPane key="1" tab={t('results.MapCompetitor')}>
          <FormItem
            name="competitorId"
            label={t('results.Competitor')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Competitor')
              }
            ]}
          >
            <FormSelect
              showSearch
              style={{ minWidth: 174, maxWidth: 334 }}
              allowClear={true}
              optionFilterProp="children"
              filterOption={(input, option) =>
                option!.label!.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              options={competitorsOptions}
              onChange={(code: number) => {
                onChange({ competitorId: code == null ? -1 : code });
                onValidate(code != null && code !== -1);
              }}
            />
          </FormItem>
        </TabPane>
        <TabPane key="2" tab={t('results.AddCompetitor')}>
          <FormItem
            name="firstName"
            label={t('results.FirstName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.FirstName')
              }
            ]}
          >
            <Input
              onChange={e => {
                onChange({ newCompetitor: { iFirstName: e.currentTarget.value } });
                onValidate(
                  !!e.currentTarget.value &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    e.currentTarget.value.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="lastName"
            label={t('results.LastName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.LastName')
              }
            ]}
          >
            <Input
              onChange={e => {
                onChange({ newCompetitor: { iLastName: e.currentTarget.value } });
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!e.currentTarget.value &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    e.currentTarget.value.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="gender"
            label={t('results.Gender')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Gender')
              }
            ]}
          >
            <FormSelect
              style={{ minWidth: 60, maxWidth: 100 }}
              options={genderOptions(t)}
              onChange={(value: GenderType) => {
                onChange({ newCompetitor: { iGender: value } });
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!value &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="birthDay"
            label={t('results.BirthDay')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.BirthDay')
              }
            ]}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
          >
            <DatePicker
              format={dateFormat}
              allowClear={false}
              onChange={date => {
                onChange({ newCompetitor: { iBirthDay: date?.format(dateFormat) } });
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!date &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="startDate"
            label={t('results.StartDate')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.StartDate')
              }
            ]}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
          >
            <DatePicker
              format={dateFormat}
              allowClear={false}
              onChange={date => {
                onChange({ newCompetitor: { iStartDate: date?.format(dateFormat) } });
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!date &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
        </TabPane>
      </Tabs>
    </Form>
  );
};

export default AddMapCompetitor;
