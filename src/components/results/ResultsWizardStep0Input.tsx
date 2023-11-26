import { DatePicker, Form, Switch } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { observer } from 'mobx-react';
import moment from 'moment';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FormSelect, dateFormat, errorRequiredField } from 'utils/formHelper';
import { useMobxStore } from 'utils/mobxStore';
import { useResultWizardStore } from 'utils/resultWizardStore';
import FormItem from '../formItems/FormItem';

interface IResultWizardStep0InputProps {
  onMount?: (form: FormInstance) => void;
}
const ResultWizardStep0Input = observer(({ onMount }: IResultWizardStep0InputProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { raceWizardModel } = useResultWizardStore();
  const formRef = useRef<FormInstance>(null);
  const formId = useMemo(() => 'raceWizardFormStep0Input' + Math.floor(Math.random() * 1000000000000000), []);

  useEffect(() => {
    if (formRef.current) {
      formRef.current.validateFields();
      onMount && onMount(formRef.current);
    }
  }, [formRef.current]);

  return clubModel.raceClubs ? (
    <Form
      id={formId}
      ref={formRef}
      layout="vertical"
      initialValues={{
        Club: clubModel.raceClubs.selectedClub?.clubId.toString(),
        QueryStartDate: moment(raceWizardModel.queryStartDate, dateFormat),
        QueryEndDate: moment(raceWizardModel.queryEndDate, dateFormat),
        QueryIncludeExisting: raceWizardModel.queryIncludeExisting,
        QueryForEventWithNoEntry: raceWizardModel.queryForEventWithNoEntry,
        QueryForCompetitorWithNoClub: raceWizardModel.queryForCompetitorWithNoClub,
        ExistInEventor: raceWizardModel.existInEventor,
      }}
    >
      <FormItem name="Club" label={t('results.Club')}>
        <FormSelect
          style={{ minWidth: 174, maxWidth: 334 }}
          options={clubModel.raceClubs.clubOptions}
          onChange={(code) => clubModel.raceClubs?.setSelectedClub(code)}
        />
      </FormItem>
      <FormItem
        name="QueryStartDate"
        label={t('results.QueryStartDate')}
        rules={[
          {
            required: true,
            type: 'object',
            message: errorRequiredField(t, 'results.QueryStartDate'),
          },
        ]}
      >
        <DatePicker
          format={dateFormat}
          allowClear={false}
          onChange={(date) => raceWizardModel.setStringValue('queryStartDate', date!.format(dateFormat))}
        />
      </FormItem>
      <FormItem
        name="QueryEndDate"
        label={t('results.QueryEndDate')}
        rules={[
          {
            required: true,
            type: 'object',
            message: errorRequiredField(t, 'results.QueryEndDate'),
          },
        ]}
      >
        <DatePicker
          format={dateFormat}
          allowClear={false}
          onChange={(date) => raceWizardModel.setStringValue('queryEndDate', date!.format(dateFormat))}
        />
      </FormItem>
      <FormItem name="QueryIncludeExisting" label={t('results.QueryIncludeExisting')} valuePropName="checked">
        <Switch onChange={(checked) => raceWizardModel.setBooleanValue('queryIncludeExisting', checked)} />
      </FormItem>
      <FormItem name="QueryForEventWithNoEntry" label={t('results.QueryForEventWithNoEntry')} valuePropName="checked">
        <Switch onChange={(checked) => raceWizardModel.setBooleanValue('queryForEventWithNoEntry', checked)} />
      </FormItem>
      <FormItem
        name="QueryForCompetitorWithNoClub"
        label={t('results.QueryForCompetitorWithNoClub')}
        valuePropName="checked"
      >
        <Switch onChange={(checked) => raceWizardModel.setBooleanValue('queryForCompetitorWithNoClub', checked)} />
      </FormItem>
    </Form>
  ) : null;
});

export default ResultWizardStep0Input;
