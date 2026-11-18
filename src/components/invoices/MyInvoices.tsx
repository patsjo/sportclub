import { Alert, Button, Card, Collapse, Empty, Spin, Table, TableProps, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IInvoice, IMyInvoicesResponse } from '../../models/invoiceModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { useIsMobile } from '../../utils/useIsMobile';
import { SpinnerDiv } from '../styled/styled';
import InvoiceRowsTable from './InvoiceRowsTable';
import { errorText, formatMoney, invoiceLeft, InvoiceStatusTag, isPartlyPaid } from './invoiceHelper';
import SwishPaymentModal from './SwishPaymentModal';

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
`;

/** The invoices of the logged in user, to the user, the linked competitor and the family */
const MyInvoices = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const invoicesUrl = clubModel.invoice.url;
  const [data, setData] = useState<IMyInvoicesResponse>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [payInvoice, setPayInvoice] = useState<IInvoice>();
  const isMobile = useIsMobile();

  const load = useCallback(() => {
    if (!invoicesUrl || !sessionModel.loggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    PostJsonData<IMyInvoicesResponse>(invoicesUrl, { iType: 'MY' }, true, sessionModel.authorizationHeader)
      .then(response => {
        if (response) {
          setData(response);
          sessionModel.setInvoiceCounts(response.unpaidInvoices, response.overdueInvoices);
        }
        setLoadError(undefined);
        setLoading(false);
      })
      .catch(e => {
        setLoadError(errorText(e));
        setLoading(false);
      });
  }, [invoicesUrl, sessionModel]);

  useEffect(load, [load]);

  if (!invoicesUrl) return <Alert showIcon type="info" title={t('invoices.NotConfigured')} />;
  if (!sessionModel.loggedIn) return <Alert showIcon type="info" title={t('invoices.RequireLogin')} />;

  const columns: TableProps<IInvoice>['columns'] = [
    { title: t('invoices.InvoiceNumber'), dataIndex: 'invoiceId', key: 'invoiceId' },
    {
      title: t('invoices.Title'),
      key: 'title',
      render: (_, invoice) => (
        <>
          <Typography.Text strong>{invoice.title}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{invoice.message}</Typography.Text>
        </>
      )
    },
    // The whole family sees and pays each other's invoices
    {
      title: t('invoices.Recipient'),
      key: 'recipient',
      render: (_, invoice) => (
        <>
          {invoice.recipientName}
          {invoice.familyId ? (
            <Tag color="purple" style={{ marginLeft: 6 }}>
              {t('invoices.Family')}
            </Tag>
          ) : null}
        </>
      )
    },
    { title: t('invoices.InvoiceDate'), dataIndex: 'invoiceDate', key: 'invoiceDate', responsive: ['md'] },
    {
      title: t('invoices.DueDate'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate: string, invoice) =>
        invoice.isOverdue ? <Typography.Text type="danger">{dueDate}</Typography.Text> : dueDate
    },
    {
      title: t('invoices.Total'),
      key: 'total',
      align: 'right',
      render: (_, invoice) => formatMoney(invoice.total)
    },
    {
      title: t('invoices.PaidAmount'),
      key: 'paidAmount',
      align: 'right',
      responsive: ['sm'],
      render: (_, invoice) =>
        invoice.paidAmount > 0 ? (
          <>
            {formatMoney(invoice.paidAmount)}
            {invoice.paidDate ? (
              <>
                <br />
                <Typography.Text type="secondary">{invoice.paidDate.substring(0, 10)}</Typography.Text>
              </>
            ) : null}
          </>
        ) : null
    },
    {
      title: t('invoices.Left'),
      key: 'left',
      align: 'right',
      render: (_, invoice) =>
        invoiceLeft(invoice) > 0 ? (
          <Typography.Text strong type={isPartlyPaid(invoice) || invoice.isOverdue ? 'danger' : undefined}>
            {formatMoney(invoiceLeft(invoice))}
          </Typography.Text>
        ) : null
    },
    {
      title: t('invoices.Status'),
      key: 'status',
      render: (_, invoice) => <InvoiceStatusTag invoice={invoice} t={t} />
    },
    {
      key: 'pay',
      render: (_, invoice) => payButton(invoice)
    }
  ];

  const payButton = (invoice: IInvoice, block = false) =>
    invoiceLeft(invoice) >= 1 && data?.swishEnabled ? (
      <Button type="primary" block={block} onClick={() => setPayInvoice(invoice)}>
        {isPartlyPaid(invoice) ? t('invoices.PayRestWithSwish') : t('invoices.PayWithSwish')}
      </Button>
    ) : null;

  // On a phone one card per invoice, with what is left to pay and the Swish button in view
  const invoiceCards = (invoices: IInvoice[]) => (
    <CardList>
      {invoices.map(invoice => (
        <Card key={invoice.invoiceId} size="small">
          <CardRow>
            <Typography.Text strong>{invoice.title}</Typography.Text>
            <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              #{invoice.invoiceId}
            </Typography.Text>
          </CardRow>
          {invoice.message ? <Typography.Text type="secondary">{invoice.message}</Typography.Text> : null}
          <CardRow>
            <span>
              {invoice.recipientName}
              {invoice.familyId ? (
                <Tag color="purple" style={{ marginLeft: 6 }}>
                  {t('invoices.Family')}
                </Tag>
              ) : null}
            </span>
            <InvoiceStatusTag invoice={invoice} t={t} />
          </CardRow>
          <CardRow>
            <Typography.Text type={invoice.isOverdue ? 'danger' : 'secondary'}>
              {t('invoices.DueDate')} {invoice.dueDate}
            </Typography.Text>
            {invoiceLeft(invoice) > 0 ? (
              <Typography.Text strong type={isPartlyPaid(invoice) || invoice.isOverdue ? 'danger' : undefined}>
                {formatMoney(invoiceLeft(invoice))}
              </Typography.Text>
            ) : (
              <Typography.Text>{formatMoney(invoice.total)}</Typography.Text>
            )}
          </CardRow>
          {invoiceLeft(invoice) >= 1 && data?.swishEnabled ? (
            <div style={{ marginTop: 8 }}>{payButton(invoice, true)}</div>
          ) : null}
          {invoice.rows.length > 0 ? (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 4 }}
              items={[{ key: 'rows', label: t('invoices.Rows'), children: <InvoiceRowsTable invoice={invoice} /> }]}
            />
          ) : null}
        </Card>
      ))}
    </CardList>
  );

  return (
    <>
      <Typography.Title level={3}>{t('invoices.MyInvoices')}</Typography.Title>
      {loadError ? (
        <Alert
          showIcon
          type="error"
          title={t('invoices.LoadFailed', { error: loadError, interpolation: { escapeValue: false } })}
        />
      ) : null}
      {data && !data.swishEnabled && data.invoices.some(i => invoiceLeft(i) > 0) ? (
        <Alert showIcon type="info" title={t('invoices.SwishOff')} style={{ marginBottom: 12 }} />
      ) : null}
      {loading && !data ? (
        <SpinnerDiv>
          <Spin size="large" />
        </SpinnerDiv>
      ) : data && data.invoices.length > 0 && isMobile ? (
        invoiceCards(data.invoices)
      ) : data && data.invoices.length > 0 ? (
        <Table<IInvoice>
          rowKey="invoiceId"
          columns={columns}
          dataSource={data.invoices}
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: true }}
          expandable={{
            rowExpandable: invoice => invoice.rows.length > 0,
            expandedRowRender: invoice => <InvoiceRowsTable invoice={invoice} />
          }}
        />
      ) : !loadError ? (
        <Empty description={t('invoices.NoInvoices')} />
      ) : null}
      {payInvoice && invoicesUrl ? (
        <SwishPaymentModal
          invoice={payInvoice}
          invoicesUrl={invoicesUrl}
          onClose={() => {
            setPayInvoice(undefined);
            load();
          }}
        />
      ) : null}
    </>
  );
});

export default MyInvoices;
