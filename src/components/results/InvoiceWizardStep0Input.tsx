import { DatePicker, Form, FormInstance, Switch } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IRaceWizardProps } from '../../models/resultWizardModel';
import { dateFormat, errorRequiredField } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';

interface IInvoiceWizardStep0InputProps {
  onMount?: (form: FormInstance) => void;
}
const InvoiceWizardStep0Input = observer(({ onMount }: IInvoiceWizardStep0InputProps) => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { raceWizardModel } = useResultWizardStore();
  const [form] = Form.useForm<IRaceWizardProps>();
  const formId = useMemo(() => 'invoiceWizardFormStep0Input' + Math.floor(Math.random() * 1000000000000000), []);

  useEffect(() => {
    if (form) {
      const run = async () => {
        try {
          await form.validateFields();
          onMount?.(form);
        } catch {
          // validation failed — safe to ignore or handle
        }
      };

      run();
    }
  }, [onMount, form]);

  return clubModel.raceClubs ? (
    <Form
      form={form}
      id={formId}
      layout="vertical"
      initialValues={{
        club: clubModel.raceClubs.selectedClub?.clubId,
        queryStartDate: raceWizardModel.queryStartDate,
        queryEndDate: raceWizardModel.queryEndDate,
        queryIncludeExisting: raceWizardModel.queryIncludeExisting
      }}
    >
      <FormItem name="club" label={t('results.Club')}>
        <FormSelect
          style={{ minWidth: 174, maxWidth: 334 }}
          options={clubModel.raceClubs.clubOptions}
          onChange={code => clubModel.raceClubs?.setSelectedClub(code)}
        />
      </FormItem>
      <FormItem
        name="queryStartDate"
        label={t('results.QueryStartDate')}
        rules={[
          {
            required: true,
            message: errorRequiredField(t, 'results.QueryStartDate')
          }
        ]}
        normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
        getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
      >
        <DatePicker
          format={dateFormat}
          allowClear={false}
          onChange={date => raceWizardModel.setStringValue('queryStartDate', date?.format(dateFormat) ?? '')}
        />
      </FormItem>
      <FormItem
        name="queryEndDate"
        label={t('results.QueryEndDate')}
        rules={[
          {
            required: true,
            message: errorRequiredField(t, 'results.QueryEndDate')
          }
        ]}
        normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
        getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
      >
        <DatePicker
          format={dateFormat}
          allowClear={false}
          onChange={date => raceWizardModel.setStringValue('queryEndDate', date?.format(dateFormat) ?? '')}
        />
      </FormItem>
      <FormItem name="queryIncludeExisting" label={t('results.QueryIncludeExisting')} valuePropName="checked">
        <Switch onChange={checked => raceWizardModel.setBooleanValue('queryIncludeExisting', checked)} />
      </FormItem>
    </Form>
  ) : null;
});

export default InvoiceWizardStep0Input;
