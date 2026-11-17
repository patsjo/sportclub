import { Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { IInvoice, IInvoiceRow } from '../../models/invoiceModel';
import { formatMoney } from './invoiceHelper';

/** The specification of the invoice, e.g. the races, and the invoice fee */
const InvoiceRowsTable = ({ invoice }: { invoice: IInvoice }) => {
  const { t } = useTranslation();
  const rows: (IInvoiceRow & { key: string })[] = [
    ...invoice.rows.map((row, index) => ({ ...row, key: `row${index}` })),
    ...(invoice.invoiceFee > 0
      ? [
          {
            key: 'invoiceFee',
            description: t('invoices.InvoiceFee'),
            numberOf: 1,
            totalFee: invoice.invoiceFee,
            amount: invoice.invoiceFee
          }
        ]
      : [])
  ];

  return (
    <Table
      size="small"
      pagination={false}
      dataSource={rows}
      columns={[
        { title: t('invoices.Rows'), dataIndex: 'description', key: 'description' },
        { title: t('invoices.NumberOf'), dataIndex: 'numberOf', key: 'numberOf', align: 'right' },
        {
          title: t('invoices.TotalFee'),
          dataIndex: 'totalFee',
          key: 'totalFee',
          align: 'right',
          responsive: ['sm'],
          render: (value: number) => formatMoney(value)
        },
        {
          title: t('invoices.Amount'),
          dataIndex: 'amount',
          key: 'amount',
          align: 'right',
          render: (value: number) => formatMoney(value)
        }
      ]}
    />
  );
};

export default InvoiceRowsTable;
