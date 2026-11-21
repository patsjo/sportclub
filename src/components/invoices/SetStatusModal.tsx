import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Tooltip, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IInvoice } from '../../models/invoiceModel';
import { dateFormat } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import {
  allowedStatuses,
  formatMoney,
  InvoiceChangeStatus,
  invoiceChangeStatuses,
  InvoiceStatusTag,
  isClosed,
  roundMoney
} from './invoiceHelper';

export interface ISetStatusValues {
  status: InvoiceChangeStatus;
  /** Paid now, negative = paid back. null = the amount the status gives for each invoice (several invoices) */
  amount: number | null;
  /** YYYY-MM-DD, the date of the payment, refund, cancellation or the change of the status */
  date: string;
  comment?: string;
}

interface ISetStatusForm {
  status?: InvoiceChangeStatus;
  amount?: number | null;
  date?: Dayjs;
  comment?: string;
}

interface ISetStatusModalProps {
  invoices: IInvoice[];
  saving: boolean;
  onOk: (values: ISetStatusValues) => void;
  onCancel: () => void;
}

/** Entered for one invoice at a time */
const onlySingle: InvoiceChangeStatus[] = ['PARTLY_PAID', 'OVERPAID'];
/** The amount is given by the status */
const fixedAmount: InvoiceChangeStatus[] = ['PAID', 'UNPAID'];

/** What is left to pay, negative when overpaid */
const leftOf = (invoice: IInvoice) => roundMoney(invoice.total - invoice.paidAmount);

/** The amount the status gives (also the suggestion of a refund), undefined = entered */
const suggestedAmount = (status: InvoiceChangeStatus | undefined, invoice: IInvoice): number | undefined => {
  switch (status) {
    case 'PAID':
      return leftOf(invoice);
    case 'REFUNDED':
    case 'UNPAID':
      return roundMoney(0 - invoice.paidAmount);
    default:
      return undefined;
  }
};

const dateLabel = (status: InvoiceChangeStatus | undefined, t: TFunction) =>
  status === 'CANCELLED'
    ? t('invoices.CancelledDate')
    : status === 'REFUNDED'
      ? t('invoices.RefundedDate')
      : status === 'UNPAID'
        ? t('invoices.StatusChangedDate')
        : t('invoices.PaidDate');

/**
 * Paid, partly paid, overpaid, refunded, cancelled or back to unpaid, saved in the history with the date and who
 * changed it. The amount is what is paid now (negative = paid back), only the statuses the invoices can change to
 * can be selected (allowedStatuses).
 */
const SetStatusModal = ({ invoices, saving, onOk, onCancel }: ISetStatusModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ISetStatusForm>();
  const status = Form.useWatch('status', form);
  const amount = Form.useWatch('amount', form);
  const single = invoices.length === 1 ? invoices[0] : undefined;

  // The statuses all the selected invoices can change to
  const allowed = useMemo(
    () =>
      invoiceChangeStatuses.filter(
        s => invoices.every(i => allowedStatuses(i).includes(s)) && (!!single || !onlySingle.includes(s))
      ),
    [invoices, single]
  );
  const initialStatus = allowed.length > 0 ? allowed[0] : undefined;
  const left = single ? leftOf(single) : 0;
  const paid = single?.paidAmount ?? 0;

  const disabledReason = (value: InvoiceChangeStatus) =>
    allowed.includes(value)
      ? undefined
      : !single && onlySingle.includes(value) && invoices.every(i => allowedStatuses(i).includes(value))
        ? t('invoices.StatusOnlyOne')
        : t('invoices.StatusNotAllowed');

  const amountHint = () => {
    switch (status) {
      case 'PAID':
        return left < 0 ? t('invoices.AmountHintPaidOverpaid') : t('invoices.AmountHintPaid');
      case 'PARTLY_PAID':
        return t('invoices.AmountHintPartlyPaid', { left: formatMoney(left) });
      case 'OVERPAID':
        return t('invoices.AmountHintOverpaid', { left: formatMoney(left) });
      case 'REFUNDED':
        return t('invoices.AmountHintRefunded', { paid: formatMoney(paid) });
      case 'UNPAID':
        return t('invoices.AmountHintUnpaid');
      default:
        return undefined;
    }
  };

  const amountValid = (value: number) => {
    const rounded = roundMoney(value);
    switch (status) {
      case 'PARTLY_PAID':
        return rounded > 0 && rounded < left;
      case 'OVERPAID':
        return rounded > left;
      case 'REFUNDED':
        return rounded < 0 && rounded >= roundMoney(0 - paid);
      default:
        return true;
    }
  };

  // Several invoices: the amount of each is given by the status
  const severalAmountText = () => {
    if (single) return null;
    switch (status) {
      case 'PAID':
        return t('invoices.AmountSeveralPaid', {
          amount: formatMoney(roundMoney(invoices.reduce((sum, i) => sum + leftOf(i), 0)))
        });
      case 'REFUNDED':
      case 'UNPAID':
        return t(status === 'REFUNDED' ? 'invoices.AmountSeveralRefunded' : 'invoices.AmountSeveralUnpaid', {
          amount: formatMoney(roundMoney(0 - invoices.reduce((sum, i) => sum + i.paidAmount, 0)))
        });
      default:
        return null;
    }
  };

  const onFinish = (values: ISetStatusForm) => {
    if (!values.status || !values.date) return;
    onOk({
      status: values.status,
      amount: single && values.status !== 'CANCELLED' ? (values.amount ?? null) : null,
      date: values.date.format(dateFormat),
      comment: values.comment
    });
  };

  const newPaid = single && amount != null ? roundMoney(paid + amount) : undefined;
  // Nothing to enter when cancelled or back to unpaid without anything paid
  const showAmount = !!single && !!status && status !== 'CANCELLED' && !(status === 'UNPAID' && paid === 0);
  const severalText = severalAmountText();

  return (
    <Modal
      open
      destroyOnHidden
      title={t('invoices.ChangeStatusFor', { count: invoices.length })}
      okButtonProps={{ loading: saving, disabled: allowed.length === 0 }}
      onOk={() => form.validateFields().then(onFinish)}
      onCancel={onCancel}
    >
      {single ? (
        <Typography.Paragraph>
          {single.invoiceId} · {single.recipientName} · {single.message}
          <br />
          {t('invoices.Total')} {formatMoney(single.total)} · {t('invoices.PaidAmount')} {formatMoney(paid)}
          {single.paidDate ? ` (${single.paidDate.substring(0, 10)})` : ''} · {t('invoices.Left')}{' '}
          {formatMoney(isClosed(single) ? 0 : Math.max(0, left))}
          <br />
          {t('invoices.CurrentStatus')}: <InvoiceStatusTag invoice={single} t={t} />
        </Typography.Paragraph>
      ) : null}
      {allowed.length === 0 ? (
        <Alert showIcon type="warning" title={t('invoices.NoCommonStatus')} style={{ marginBottom: 12 }} />
      ) : null}
      <Form<ISetStatusForm>
        form={form}
        layout="vertical"
        initialValues={{
          status: initialStatus,
          amount: single ? (suggestedAmount(initialStatus, single) ?? null) : null,
          date: dayjs()
        }}
        onValuesChange={(changed: ISetStatusForm) => {
          // The amount the new status gives, or empty to enter it
          if ('status' in changed && single) {
            form.setFieldValue('amount', suggestedAmount(changed.status, single) ?? null);
          }
        }}
      >
        <FormItem name="status" label={t('invoices.NewStatus')} rules={[{ required: true }]}>
          <Radio.Group
            options={invoiceChangeStatuses.map(value => {
              const reason = disabledReason(value);
              return {
                value,
                disabled: !!reason,
                label: reason ? (
                  <Tooltip title={reason}>{t(`invoices.Status${value}`)}</Tooltip>
                ) : (
                  t(`invoices.Status${value}`)
                )
              };
            })}
          />
        </FormItem>
        {showAmount && status ? (
          <FormItem
            name="amount"
            label={t('invoices.PaidAmount')}
            extra={amountHint()}
            rules={[
              { required: true },
              {
                validator: (_, value?: number | null) =>
                  value == null || amountValid(value) ? Promise.resolve() : Promise.reject(new Error(amountHint()))
              }
            ]}
          >
            <InputNumber
              precision={2}
              decimalSeparator=","
              suffix="kr"
              disabled={fixedAmount.includes(status)}
              style={{ width: 200 }}
            />
          </FormItem>
        ) : null}
        {showAmount && single && newPaid != null && amountValid(amount ?? 0) ? (
          <Typography.Paragraph type="secondary">
            {t('invoices.PaidAfterChange', {
              paid: formatMoney(newPaid),
              left: formatMoney(status === 'REFUNDED' ? 0 : Math.max(0, roundMoney(single.total - newPaid)))
            })}
          </Typography.Paragraph>
        ) : null}
        {severalText ? <Typography.Paragraph>{severalText}</Typography.Paragraph> : null}
        {allowed.length > 0 ? (
          <FormItem name="date" label={dateLabel(status, t)} rules={[{ required: true }]}>
            <DatePicker
              format={dateFormat}
              allowClear={false}
              disabledDate={date => date.isAfter(dayjs(), 'day')}
              style={{ width: 200 }}
            />
          </FormItem>
        ) : null}
        <FormItem name="comment" label={t('invoices.Comment')}>
          <Input maxLength={255} />
        </FormItem>
      </Form>
    </Modal>
  );
};

export default SetStatusModal;
