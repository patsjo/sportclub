import { Form, Input, InputNumber, Modal, Radio, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { IInvoice, InvoiceStatus } from '../../models/invoiceModel';
import FormItem from '../formItems/FormItem';
import { formatMoney } from './invoiceHelper';

export interface ISetStatusValues {
  status: InvoiceStatus;
  /** Empty = the whole amount (paid), what is paid (cancelled) or 0 (unpaid) */
  paidAmount?: number | null;
  comment?: string;
}

/** Partly paid is unpaid with a paid amount less than the total */
type FormStatus = InvoiceStatus | 'PARTLY_PAID';

interface ISetStatusForm {
  status: FormStatus;
  paidAmount?: number | null;
  comment?: string;
}

interface ISetStatusModalProps {
  invoices: IInvoice[];
  saving: boolean;
  onOk: (values: ISetStatusValues) => void;
  onCancel: () => void;
}

/**
 * Paid, partly paid, overpaid (and how much), cancelled or back to unpaid, saved in the history with who changed it
 */
const SetStatusModal = ({ invoices, saving, onOk, onCancel }: ISetStatusModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ISetStatusForm>();
  const status = Form.useWatch('status', form);
  const paidAmount = Form.useWatch('paidAmount', form);
  const single = invoices.length === 1 ? invoices[0] : undefined;
  const minTotal = Math.min(...invoices.map(i => i.total));
  const maxTotal = Math.max(...invoices.map(i => i.total));
  const amountRequired = status === 'OVERPAID' || status === 'PARTLY_PAID';

  const onFinish = (values: ISetStatusForm) =>
    onOk({
      status: values.status === 'PARTLY_PAID' ? 'UNPAID' : values.status,
      // Back to unpaid is nothing paid
      paidAmount: values.status === 'UNPAID' ? 0 : values.paidAmount,
      comment: values.comment
    });

  return (
    <Modal
      open
      destroyOnHidden
      title={t('invoices.ChangeStatusFor', { count: invoices.length })}
      okButtonProps={{ loading: saving }}
      onOk={() => form.validateFields().then(onFinish)}
      onCancel={onCancel}
    >
      {single ? (
        <p>
          {single.invoiceId} · {single.recipientName} · {single.message} · {t('invoices.Total')}{' '}
          {formatMoney(single.total)} · {t('invoices.PaidAmount')} {formatMoney(single.paidAmount)}
        </p>
      ) : null}
      <Form<ISetStatusForm> form={form} layout="vertical" initialValues={{ status: 'PAID' }}>
        <FormItem name="status" label={t('invoices.NewStatus')} rules={[{ required: true }]}>
          <Radio.Group
            options={(['PAID', 'PARTLY_PAID', 'OVERPAID', 'CANCELLED', 'UNPAID'] as FormStatus[]).map(value => ({
              value,
              label: t(`invoices.Status${value}`)
            }))}
          />
        </FormItem>
        {status !== 'UNPAID' ? (
          <FormItem
            name="paidAmount"
            label={t('invoices.PaidAmount')}
            extra={
              status === 'PAID'
                ? t('invoices.PaidAmountHintPaid')
                : status === 'CANCELLED'
                  ? t('invoices.PaidAmountHintCancelled')
                  : undefined
            }
            rules={[
              { required: amountRequired },
              {
                validator: (_, value?: number | null) => {
                  if (value == null) return Promise.resolve();
                  if (status === 'OVERPAID' && value <= maxTotal)
                    return Promise.reject(new Error(`> ${formatMoney(maxTotal)}`));
                  if (status === 'PARTLY_PAID' && (value <= 0 || value >= minTotal))
                    return Promise.reject(new Error(`0 – ${formatMoney(minTotal)}`));
                  if (status === 'PAID' && value < maxTotal)
                    return Promise.reject(new Error(`≥ ${formatMoney(maxTotal)}`));
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber min={0} precision={2} decimalSeparator="," suffix="kr" style={{ width: 200 }} />
          </FormItem>
        ) : null}
        {single && status === 'PARTLY_PAID' && paidAmount != null && paidAmount > 0 && paidAmount < single.total ? (
          <Typography.Paragraph strong type="warning">
            {t('invoices.Left')}: {formatMoney(Math.round((single.total - paidAmount) * 100) / 100)}
          </Typography.Paragraph>
        ) : null}
        <FormItem name="comment" label={t('invoices.Comment')}>
          <Input maxLength={255} />
        </FormItem>
      </Form>
    </Modal>
  );
};

export default SetStatusModal;
