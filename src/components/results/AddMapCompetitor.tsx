import { DatePicker, Form, Input, Tabs } from 'antd';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dateFormat, errorRequiredField, FormSelect, IOption } from '../../utils/formHelper';
import { genderOptions, GenderType } from '../../utils/resultConstants';
import FormItem from '../formItems/FormItem';

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
  competitorsOptions: IOption[];
  defaultActiveKey: string;
  onTabChange: (key: string) => void;
  onValidate: (valid: boolean) => void;
}
const AddMapCompetitor = ({
  addLinkCompetitor,
  competitorsOptions,
  defaultActiveKey,
  onTabChange,
  onValidate,
}: IAddMapCompetitor) => {
  const { t } = useTranslation();
  const formId = useMemo(() => 'addMapCompetitor' + Math.floor(Math.random() * 1000000000000000), []);

  const onThisTabChange = useCallback(
    (key: string) => {
      const { iFirstName, iLastName, iBirthDay, iGender, iStartDate } = addLinkCompetitor.newCompetitor;

      onTabChange(key);
      if (key === '1') {
        onValidate(addLinkCompetitor.competitorId != null);
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
    [addLinkCompetitor, onValidate, onTabChange]
  );

  return (
    <Form
      id={formId}
      layout="vertical"
      initialValues={{
        iCompetitorId: !addLinkCompetitor.competitorId ? undefined : addLinkCompetitor.competitorId,
        iFirstName: addLinkCompetitor.newCompetitor.iFirstName,
        iLastName: addLinkCompetitor.newCompetitor.iLastName,
        iBirthDay: !addLinkCompetitor.newCompetitor.iBirthDay
          ? null
          : moment(addLinkCompetitor.newCompetitor.iBirthDay, dateFormat),
        iGender: addLinkCompetitor.newCompetitor.iGender,
        iStartDate: !addLinkCompetitor.newCompetitor.iStartDate
          ? null
          : moment(addLinkCompetitor.newCompetitor.iStartDate, dateFormat),
      }}
    >
      <Tabs defaultActiveKey={defaultActiveKey} onChange={onThisTabChange}>
        <TabPane tab={t('results.MapCompetitor')} key="1">
          <FormItem
            name="iCompetitorId"
            label={t('results.Competitor')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Competitor'),
              },
            ]}
          >
            <FormSelect
              style={{ minWidth: 174, maxWidth: 334 }}
              allowClear={true}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => option?.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
              options={competitorsOptions}
              onChange={(code: string) => {
                addLinkCompetitor.competitorId = code == null ? -1 : parseInt(code);
                onValidate(addLinkCompetitor.competitorId !== -1);
              }}
            />
          </FormItem>
        </TabPane>
        <TabPane tab={t('results.AddCompetitor')} key="2">
          <FormItem
            name="iFirstName"
            label={t('results.FirstName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.FirstName'),
              },
            ]}
          >
            <Input
              onChange={(e) => {
                addLinkCompetitor.newCompetitor.iFirstName = e.currentTarget.value;
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="iLastName"
            label={t('results.LastName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.LastName'),
              },
            ]}
          >
            <Input
              onChange={(e) => {
                addLinkCompetitor.newCompetitor.iLastName = e.currentTarget.value;
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="iGender"
            label={t('results.Gender')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Gender'),
              },
            ]}
          >
            <FormSelect
              style={{ minWidth: 60, maxWidth: 100 }}
              options={genderOptions(t)}
              onChange={(value: GenderType) => {
                addLinkCompetitor.newCompetitor.iGender = value;
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="iBirthDay"
            label={t('results.BirthDay')}
            rules={[
              {
                required: true,
                type: 'object',
                message: errorRequiredField(t, 'results.BirthDay'),
              },
            ]}
          >
            <DatePicker
              format={dateFormat}
              allowClear={false}
              onChange={(date) => {
                addLinkCompetitor.newCompetitor.iBirthDay = date?.format(dateFormat);
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
                    addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                    addLinkCompetitor.newCompetitor.iLastName.length > 0
                );
              }}
            />
          </FormItem>
          <FormItem
            name="iStartDate"
            label={t('results.StartDate')}
            rules={[
              {
                required: true,
                type: 'object',
                message: errorRequiredField(t, 'results.StartDate'),
              },
            ]}
          >
            <DatePicker
              format={dateFormat}
              allowClear={false}
              onChange={(date) => {
                addLinkCompetitor.newCompetitor.iStartDate = date?.format(dateFormat);
                onValidate(
                  !!addLinkCompetitor.newCompetitor.iFirstName &&
                    !!addLinkCompetitor.newCompetitor.iLastName &&
                    !!addLinkCompetitor.newCompetitor.iBirthDay &&
                    !!addLinkCompetitor.newCompetitor.iGender &&
                    !!addLinkCompetitor.newCompetitor.iStartDate &&
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
