import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  message,
  Space,
  Spin,
  Table,
  TableProps,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IInvoice, IMyInvoicesResponse } from '../../models/invoiceModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { IPdfSettings } from '../../utils/pdf';
import { generatePdfStatus, getInvoicePdf, IFeesRecord } from '../../utils/pdfInvoice';
import { useIsMobile } from '../../utils/useIsMobile';
import { SpinnerDiv } from '../styled/styled';
import InvoiceRowsTable from './InvoiceRowsTable';
import PaymentQrCode from './PaymentQrCode';
import { paymentMessage, paymentQrs } from './paymentQr';
import { errorText, formatMoney, invoiceLeft, InvoiceStatusTag, isClosed, isPartlyPaid } from './invoiceHelper';
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

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const QrRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
`;

// The same as the default of the event fees PDF in ResultsFees
const invoicePdfSettings: IPdfSettings = { pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [25, 20, 20, 20] };

/** The invoices of the logged in user, to the user, the linked competitor and the family */
const MyInvoices = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const invoicesUrl = clubModel.invoice.url;
  const [data, setData] = useState<IMyInvoicesResponse>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [payInvoice, setPayInvoice] = useState<IInvoice>();
  const [pdfInvoiceId, setPdfInvoiceId] = useState<number>();
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
          sessionModel.setInvoiceCounts(response.unpaidInvoices, response.overdueInvoices, response.nextInvoiceDueDate);
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

  // The event fees PDF of the period (in the title) and the person/family, from the saved rows of the invoice
  const onPdf = useCallback(
    async (invoice: IInvoice) => {
      setPdfInvoiceId(invoice.invoiceId);
      generatePdfStatus.abortLoading = false;
      const competitorId = invoice.competitorId ?? 0;
      const details: IFeesRecord[] =
        invoice.rows.length > 0
          ? invoice.rows.map(row => ({
              competitorId,
              description: row.description,
              numberOf: row.numberOf,
              totalFee: row.totalFee,
              feeToClub: row.amount
            }))
          : [
              {
                competitorId,
                description: invoice.title,
                numberOf: 1,
                totalFee: invoice.amount,
                feeToClub: invoice.amount
              }
            ];
      if (invoice.invoiceFee > 0) {
        details.push({
          competitorId,
          description: t('invoices.InvoiceFee'),
          numberOf: 1,
          totalFee: invoice.invoiceFee,
          feeToClub: invoice.invoiceFee
        });
      }
      const invoiceDate = dayjs(invoice.invoiceDate);
      try {
        await getInvoicePdf(
          clubModel.corsProxy ?? '',
          clubModel.logo.url,
          clubModel.clubInfo,
          {
            ...clubModel.invoice,
            title: invoice.title,
            startDate: invoiceDate,
            endDate: invoiceDate,
            dueDate: dayjs(invoice.dueDate)
          },
          [
            {
              invoiceMessage: invoice.message,
              details,
              invoiceNumber: String(invoice.invoiceId),
              invoiceDate,
              qrAmount: invoiceLeft(invoice),
              // Paid fully or partly, a cancelled invoice isn't shown as paid
              payment:
                !isClosed(invoice) && invoice.paidAmount > 0
                  ? {
                      paidAmount: invoice.paidAmount,
                      paidDate: invoice.paidDate ? dayjs(invoice.paidDate) : null,
                      leftToPay: invoiceLeft(invoice)
                    }
                  : undefined
            }
          ],
          invoicePdfSettings,
          () => {},
          () => {}
        );
      } catch (e) {
        message.error(t('invoices.PdfFailed', { error: errorText(e), interpolation: { escapeValue: false } }));
      }
      setPdfInvoiceId(undefined);
    },
    [clubModel, t]
  );

  const invoiceQrs = (invoice: IInvoice) =>
    paymentQrs(
      clubModel.invoice,
      clubModel.clubInfo,
      {
        invoiceId: invoice.invoiceId,
        message: paymentMessage(invoice, t('invoice.invoiceMessage')),
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        amount: invoiceLeft(invoice)
      },
      !!data?.swishEnabled
    );
  const hasQrs = !!data?.invoices.some(invoice => invoiceQrs(invoice).length > 0);
  // With the Swish payment on the web page the QR code is an alternative, only a button that shows it
  const qrCollapsed = !!data?.swishEnabled;
  const collapsedQrButton = (invoice: IInvoice) =>
    qrCollapsed && invoiceQrs(invoice).length > 0 ? <PaymentQrCode collapsed qrs={invoiceQrs(invoice)} /> : null;

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
      key: 'actions',
      render: (_, invoice) => (
        <Space size="small" wrap={false}>
          {payButton(invoice)}
          {collapsedQrButton(invoice)}
          {pdfButton(invoice)}
        </Space>
      )
    },
    // Rightmost, to pay in the bank app or with Swish when the Swish payment on the web page is off
    ...(hasQrs && !qrCollapsed
      ? [
          {
            title: t('invoices.QrPay'),
            key: 'qr',
            align: 'center' as const,
            render: (_: unknown, invoice: IInvoice) => <PaymentQrCode qrs={invoiceQrs(invoice)} />
          }
        ]
      : [])
  ];

  // Disabled with the reason when Swish isn't turned on
  const payButton = (invoice: IInvoice, block = false) =>
    invoiceLeft(invoice) >= 1 ? (
      <Tooltip title={data?.swishEnabled ? undefined : t('invoices.SwishOff')}>
        <Button type="primary" block={block} disabled={!data?.swishEnabled} onClick={() => setPayInvoice(invoice)}>
          {t('invoices.Pay')}
        </Button>
      </Tooltip>
    ) : null;

  // The invoice of the event fees as PDF
  const pdfButton = (invoice: IInvoice) =>
    invoice.batchType === 'EVENT_FEES' ? (
      <Tooltip title={t('invoices.PdfTooltip')}>
        <Button
          loading={pdfInvoiceId === invoice.invoiceId}
          disabled={pdfInvoiceId != null && pdfInvoiceId !== invoice.invoiceId}
          onClick={() => onPdf(invoice)}
        >
          {t('invoices.Pdf')}
        </Button>
      </Tooltip>
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
          {invoiceLeft(invoice) >= 1 || invoice.batchType === 'EVENT_FEES' ? (
            <ButtonRow>
              {invoiceLeft(invoice) >= 1 ? <div style={{ flex: 1 }}>{payButton(invoice, true)}</div> : null}
              {collapsedQrButton(invoice)}
              {pdfButton(invoice)}
            </ButtonRow>
          ) : null}
          {!qrCollapsed && invoiceQrs(invoice).length > 0 ? (
            <QrRow>
              <PaymentQrCode qrs={invoiceQrs(invoice)} size={104} />
            </QrRow>
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
        <Alert
          showIcon
          type="info"
          title={hasQrs ? t('invoices.SwishOffUseQr') : t('invoices.SwishOff')}
          style={{ marginBottom: 12 }}
        />
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
