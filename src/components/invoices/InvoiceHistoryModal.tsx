import { Alert, Modal, Spin, Table, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IInvoice, IInvoiceHistoryResponse, InvoiceStatus } from '../../models/invoiceModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import InvoiceRowsTable from './InvoiceRowsTable';
import { errorText, formatMoney } from './invoiceHelper';

interface IInvoiceHistoryModalProps {
  invoice: IInvoice;
  invoicesUrl: string;
  onClose: () => void;
}

/** Every change of the status (by whom, null = Swish) and the Swish payments */
const InvoiceHistoryModal = observer(({ invoice, invoicesUrl, onClose }: IInvoiceHistoryModalProps) => {
  const { t } = useTranslation();
  const { sessionModel } = useMobxStore();
  const [data, setData] = useState<IInvoiceHistoryResponse>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    PostJsonData<IInvoiceHistoryResponse>(
      invoicesUrl,
      { iType: 'HISTORY', invoiceId: invoice.invoiceId },
      true,
      sessionModel.authorizationHeader
    )
      .then(setData)
      .catch(e => setLoadError(errorText(e)));
  }, [invoice.invoiceId, invoicesUrl, sessionModel.authorizationHeader]);

  const statusText = (status: InvoiceStatus) => t(`invoices.Status${status}`);

  return (
    <Modal
      open
      destroyOnHidden
      width={800}
      title={`${t('invoices.History')} – ${invoice.invoiceId} ${invoice.recipientName}`}
      footer={null}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {invoice.title} · {invoice.message}
        <br />
        {t('invoices.InvoiceDate')} {invoice.invoiceDate} · {t('invoices.DueDate')} {invoice.dueDate} ·{' '}
        {t('invoices.Total')} {formatMoney(invoice.total)}
        {invoice.reminders > 0
          ? ` · ${t('invoices.Reminders')} ${invoice.reminders} (${invoice.lastReminderDate?.substring(0, 10)})`
          : ''}
      </Typography.Paragraph>
      {invoice.rows.length > 0 ? <InvoiceRowsTable invoice={invoice} /> : null}
      {loadError ? (
        <Alert
          showIcon
          type="error"
          title={t('invoices.LoadFailed', { error: loadError, interpolation: { escapeValue: false } })}
        />
      ) : !data ? (
        <Spin />
      ) : (
        <>
          <Typography.Title level={5}>{t('invoices.History')}</Typography.Title>
          <Table
            size="small"
            pagination={false}
            rowKey={h => `${h.creDate}${h.newStatus}${h.newPaidAmount}${h.swishPaymentId ?? ''}`}
            dataSource={data.history}
            scroll={{ x: true }}
            columns={[
              { title: t('results.Date'), dataIndex: 'eventDate', key: 'eventDate', className: 'table-cell-nowrap' },
              {
                title: t('invoices.Status'),
                key: 'status',
                render: (_, h) =>
                  h.oldStatus ? `${statusText(h.oldStatus)} → ${statusText(h.newStatus)}` : t('invoices.Created')
              },
              {
                title: t('invoices.PaidAmount'),
                key: 'paid',
                align: 'right',
                render: (_, h) =>
                  h.oldPaidAmount != null && h.oldPaidAmount !== h.newPaidAmount
                    ? `${formatMoney(h.oldPaidAmount)} → ${formatMoney(h.newPaidAmount)}`
                    : formatMoney(h.newPaidAmount)
              },
              {
                title: t('invoices.ChangedBy'),
                key: 'changedBy',
                render: (_, h) => h.changedBy ?? <Tag color="green">{t('invoices.BySwish')}</Tag>
              },
              { title: t('invoices.Comment'), dataIndex: 'comment', key: 'comment' },
              { title: t('invoices.Registered'), dataIndex: 'creDate', key: 'creDate', className: 'table-cell-nowrap' }
            ]}
          />
          {data.payments.length > 0 ? (
            <>
              <Typography.Title level={5}>{t('invoices.SwishPayments')}</Typography.Title>
              <Table
                size="small"
                pagination={false}
                rowKey="paymentId"
                dataSource={data.payments}
                scroll={{ x: true }}
                columns={[
                  { title: t('results.Date'), dataIndex: 'creDate', key: 'creDate' },
                  { title: t('invoices.Status'), dataIndex: 'status', key: 'status' },
                  {
                    title: t('invoices.Amount'),
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right',
                    render: (amount: number) => formatMoney(amount)
                  },
                  { title: t('invoices.Payer'), dataIndex: 'payerAlias', key: 'payerAlias' },
                  { title: t('invoices.PaymentReference'), dataIndex: 'paymentReference', key: 'paymentReference' },
                  { title: t('invoices.StartedBy'), dataIndex: 'startedBy', key: 'startedBy' },
                  {
                    key: 'error',
                    render: (_, p) => [p.errorCode, p.errorMessage].filter(e => !!e).join(' ')
                  }
                ]}
              />
            </>
          ) : null}
        </>
      )}
    </Modal>
  );
});

export default InvoiceHistoryModal;
