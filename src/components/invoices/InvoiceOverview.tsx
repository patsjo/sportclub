import { DeleteOutlined, EditOutlined, HistoryOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  TableProps,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import { observer } from 'mobx-react';
import { Key, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IInvoice,
  IInvoiceBatch,
  IInvoiceOverviewResponse,
  InvoiceBatchType,
  IReminderResponse
} from '../../models/invoiceModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { SpinnerDiv } from '../styled/styled';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceHistoryModal from './InvoiceHistoryModal';
import {
  errorText,
  formatMoney,
  InvoiceFilterStatus,
  invoiceLeft,
  invoiceMatchesStatus,
  InvoiceStatusTag,
  invoiceStatusOptions,
  isPartlyPaid
} from './invoiceHelper';
import SetStatusModal, { ISetStatusValues } from './SetStatusModal';

interface IBatchRow extends IInvoiceBatch {
  /** The invoices that match the filter */
  shownInvoices: IInvoice[];
}

/**
 * All invoices for the economy responsible and the administrators, grouped on the batches (the same invoice to
 * different recipients). Only the economy responsible verifies (paid, cancelled), reminds and deletes.
 */
const InvoiceOverview = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const invoicesUrl = clubModel.invoice.url;
  const [data, setData] = useState<IInvoiceOverviewResponse>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceFilterStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<InvoiceBatchType>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState<IInvoice>();
  const [statusInvoices, setStatusInvoices] = useState<IInvoice[]>();
  const [saving, setSaving] = useState(false);
  const [modal, modalContextHolder] = Modal.useModal();
  const canVerify = !!data?.canVerify;

  const load = useCallback(() => {
    if (!invoicesUrl) return;
    setLoading(true);
    PostJsonData<IInvoiceOverviewResponse>(invoicesUrl, { iType: 'OVERVIEW' }, true, sessionModel.authorizationHeader)
      .then(response => {
        setData(response);
        setLoadError(undefined);
        setLoading(false);
      })
      .catch(e => {
        setLoadError(errorText(e));
        setLoading(false);
      });
  }, [invoicesUrl, sessionModel.authorizationHeader]);

  useEffect(load, [load]);

  /** The changed invoices from the server */
  const replaceInvoices = useCallback((invoices: IInvoice[]) => {
    setData(old =>
      old
        ? {
            ...old,
            batches: old.batches.map(batch => ({
              ...batch,
              invoices: batch.invoices.map(i => invoices.find(changed => changed.invoiceId === i.invoiceId) ?? i)
            }))
          }
        : old
    );
  }, []);

  const batches = useMemo((): IBatchRow[] => {
    const text = search.trim().toLowerCase();
    const filtered = !!text || statusFilter.length > 0;
    return (data?.batches ?? [])
      .filter(batch => !typeFilter || batch.batchType === typeFilter)
      .map(batch => ({
        ...batch,
        shownInvoices: batch.invoices.filter(
          invoice =>
            invoiceMatchesStatus(invoice, statusFilter) &&
            (!text ||
              batch.title.toLowerCase().includes(text) ||
              invoice.recipientName.toLowerCase().includes(text) ||
              invoice.message.toLowerCase().includes(text) ||
              String(invoice.invoiceId) === text)
        )
      }))
      .filter(batch => !filtered || batch.shownInvoices.length > 0);
  }, [data, search, statusFilter, typeFilter]);

  const allInvoices = useMemo(() => data?.batches.flatMap(b => b.invoices) ?? [], [data]);
  const selectedInvoices = allInvoices.filter(i => selectedIds.includes(i.invoiceId));
  const selectedUnpaid = selectedInvoices.filter(i => i.status === 'UNPAID');
  const filterActive = !!search.trim() || statusFilter.length > 0;

  const post = useCallback(
    async <T,>(request: Record<string, unknown>) => {
      if (!invoicesUrl) return undefined;
      setSaving(true);
      try {
        return await PostJsonData<T>(invoicesUrl, request, true, sessionModel.authorizationHeader, 1);
      } catch (e) {
        message.error(errorText(e));
        return undefined;
      } finally {
        setSaving(false);
      }
    },
    [invoicesUrl, sessionModel.authorizationHeader]
  );

  const onSetStatus = useCallback(
    async (values: ISetStatusValues) => {
      if (!statusInvoices) return;
      const response = await post<{ invoices: IInvoice[] }>({
        iType: 'SET_STATUS',
        invoiceIds: statusInvoices.map(i => i.invoiceId),
        status: values.status,
        paidAmount: values.paidAmount ?? null,
        comment: values.comment ?? ''
      });
      if (response) {
        replaceInvoices(response.invoices);
        setStatusInvoices(undefined);
      }
    },
    [post, replaceInvoices, statusInvoices]
  );

  const onRemind = useCallback(
    async (invoices: IInvoice[]) => {
      const response = await post<IReminderResponse>({
        iType: 'REMIND',
        invoiceIds: invoices.map(i => i.invoiceId)
      });
      if (!response) return;
      replaceInvoices(response.invoices);
      modal.info({
        title: t('invoices.RemindersResult'),
        width: 600,
        content: (
          <ul style={{ paddingInlineStart: 20 }}>
            {response.reminders.map(r => (
              <li key={r.invoiceId}>
                {r.sentTo.length > 0 ? (
                  t('invoices.ReminderSent', {
                    name: r.recipientName,
                    emails: r.sentTo.join(', '),
                    interpolation: { escapeValue: false }
                  })
                ) : (
                  <Typography.Text type="warning">
                    {t('invoices.ReminderNoEmail', { name: r.recipientName, interpolation: { escapeValue: false } })}
                  </Typography.Text>
                )}
              </li>
            ))}
          </ul>
        )
      });
    },
    [modal, post, replaceInvoices, t]
  );

  const confirmRemind = useCallback(
    (invoices: IInvoice[]) =>
      modal.confirm({
        title: t('invoices.SendRemindersConfirm', { count: invoices.length }),
        onOk: () => onRemind(invoices)
      }),
    [modal, onRemind, t]
  );

  const onDeleteInvoices = useCallback(
    async (invoices: IInvoice[]) => {
      const invoiceIds = invoices.map(i => i.invoiceId);
      const response = await post<{ deleted: boolean }>({ iType: 'DELETE_INVOICE', invoiceIds });
      if (response?.deleted) {
        setSelectedIds(old => old.filter(id => !invoiceIds.includes(id)));
        setData(old =>
          old
            ? {
                ...old,
                batches: old.batches
                  .map(b => ({ ...b, invoices: b.invoices.filter(i => !invoiceIds.includes(i.invoiceId)) }))
                  .filter(b => b.invoices.length > 0)
              }
            : old
        );
      }
    },
    [post]
  );

  const hasPayments = (invoices: IInvoice[]) => invoices.some(i => i.paidAmount > 0);

  // A button wide spacer, so the buttons are in line when one is missing
  const buttonSpacer = <span style={{ display: 'inline-block', width: 24 }} />;

  /** The actions on the selected invoices of the batch, in the header above the same buttons on the rows */
  const selectedActions = (batch: IBatchRow) => {
    const selected = batch.shownInvoices.filter(i => selectedIds.includes(i.invoiceId));
    if (!canVerify || selected.length === 0) return null;
    const unpaid = selected.filter(i => i.status === 'UNPAID');
    const paid = hasPayments(selected);
    return (
      <Space size={4}>
        {buttonSpacer}
        <Tooltip title={t('invoices.ChangeStatusFor', { count: selected.length })}>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setStatusInvoices(selected)} />
        </Tooltip>
        {unpaid.length > 0 ? (
          <Tooltip title={t('invoices.SendReminders', { count: unpaid.length })}>
            <Button size="small" type="primary" icon={<MailOutlined />} onClick={() => confirmRemind(unpaid)} />
          </Tooltip>
        ) : (
          buttonSpacer
        )}
        <Popconfirm
          title={t('invoices.DeleteSelectedConfirm', { count: selected.length })}
          disabled={paid}
          onConfirm={() => onDeleteInvoices(selected)}
        >
          <Tooltip
            title={paid ? t('invoices.DeleteNotPossible') : t('invoices.DeleteSelected', { count: selected.length })}
          >
            <Button danger size="small" type="primary" icon={<DeleteOutlined />} disabled={paid} />
          </Tooltip>
        </Popconfirm>
      </Space>
    );
  };

  const invoiceColumns = (batch: IBatchRow): TableProps<IInvoice>['columns'] => [
    { title: t('invoices.InvoiceNumber'), dataIndex: 'invoiceId', key: 'invoiceId', width: 90 },
    {
      title: t('invoices.Recipient'),
      key: 'recipient',
      // Not a name on three lines on a phone, the table scrolls instead
      onCell: () => ({ style: { minWidth: 150 } }),
      render: (_, invoice) => (
        <>
          {invoice.recipientName}
          {invoice.familyId ? (
            <Tag color="purple" style={{ marginLeft: 6 }}>
              {t('invoices.Family')}
            </Tag>
          ) : null}
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {invoice.message}
          </Typography.Text>
        </>
      )
    },
    {
      title: t('invoices.Total'),
      key: 'total',
      align: 'right',
      className: 'table-cell-nowrap',
      render: (_, i) => formatMoney(i.total)
    },
    {
      title: t('invoices.PaidAmount'),
      key: 'paid',
      align: 'right',
      className: 'table-cell-nowrap',
      render: (_, i) =>
        i.paidAmount > 0 ? (
          <Tooltip title={i.paidDate}>
            <span>{formatMoney(i.paidAmount)}</span>
          </Tooltip>
        ) : null
    },
    {
      title: t('invoices.Left'),
      key: 'left',
      align: 'right',
      className: 'table-cell-nowrap',
      render: (_, i) =>
        invoiceLeft(i) > 0 ? (
          <Typography.Text strong type={isPartlyPaid(i) ? 'warning' : undefined}>
            {formatMoney(invoiceLeft(i))}
          </Typography.Text>
        ) : null
    },
    { title: t('invoices.Status'), key: 'status', render: (_, i) => <InvoiceStatusTag invoice={i} t={t} /> },
    {
      title: t('invoices.Reminders'),
      key: 'reminders',
      responsive: ['md'],
      render: (_, i) => (i.reminders > 0 ? `${i.reminders} (${i.lastReminderDate?.substring(0, 10)})` : null)
    },
    {
      key: 'actions',
      title: selectedActions(batch),
      render: (_, invoice) => (
        <Space size={4}>
          <Tooltip title={t('invoices.History')}>
            <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryInvoice(invoice)} />
          </Tooltip>
          {canVerify ? (
            <>
              <Tooltip title={t('invoices.ChangeStatus')}>
                <Button size="small" icon={<EditOutlined />} onClick={() => setStatusInvoices([invoice])} />
              </Tooltip>
              {invoice.status === 'UNPAID' ? (
                <Tooltip title={t('invoices.SendReminder')}>
                  <Button size="small" icon={<MailOutlined />} onClick={() => confirmRemind([invoice])} />
                </Tooltip>
              ) : (
                buttonSpacer
              )}
              <Popconfirm
                title={t('invoices.DeleteInvoiceConfirm', {
                  name: invoice.recipientName,
                  interpolation: { escapeValue: false }
                })}
                disabled={hasPayments([invoice])}
                onConfirm={() => onDeleteInvoices([invoice])}
              >
                <Tooltip title={hasPayments([invoice]) ? t('invoices.DeleteNotPossible') : t('invoices.DeleteInvoice')}>
                  <Button danger size="small" icon={<DeleteOutlined />} disabled={hasPayments([invoice])} />
                </Tooltip>
              </Popconfirm>
            </>
          ) : null}
        </Space>
      )
    }
  ];

  const batchColumns: TableProps<IBatchRow>['columns'] = [
    {
      title: t('invoices.Title'),
      key: 'title',
      // Not squeezed to a few letters on a phone, the table scrolls instead
      onCell: () => ({ style: { minWidth: 220 } }),
      render: (_, batch) => (
        <>
          <Typography.Text strong>{batch.title}</Typography.Text>{' '}
          <Tag color={batch.batchType === 'EVENT_FEES' ? 'cyan' : 'default'}>
            {t(`invoices.Type${batch.batchType}`)}
          </Tag>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {batch.periodFrom && batch.periodTo
              ? `${t('invoices.Period', { from: batch.periodFrom, to: batch.periodTo })} · `
              : ''}
            {t('invoices.CreatedBy', {
              date: batch.creDate.substring(0, 10),
              name: batch.createdBy,
              interpolation: { escapeValue: false }
            })}
          </Typography.Text>
        </>
      )
    },
    {
      title: t('invoices.InvoiceDate'),
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      className: 'table-cell-nowrap',
      responsive: ['md']
    },
    { title: t('invoices.DueDate'), dataIndex: 'dueDate', key: 'dueDate', className: 'table-cell-nowrap' },
    {
      title: t('invoices.Status'),
      key: 'summary',
      render: (_, batch) => {
        const paid = batch.invoices.filter(i => i.status === 'PAID' || i.status === 'OVERPAID').length;
        const overdue = batch.invoices.filter(i => i.isOverdue).length;
        const partlyPaid = batch.invoices.filter(isPartlyPaid).length;
        const active = batch.invoices.filter(i => i.status !== 'CANCELLED').length;
        return (
          <>
            <Tag color={paid === active ? 'green' : 'gold'}>{t('invoices.BatchSummary', { paid, count: active })}</Tag>
            {partlyPaid > 0 ? <Tag color="orange">{t('invoices.BatchPartlyPaid', { count: partlyPaid })}</Tag> : null}
            {overdue > 0 ? <Tag color="red">{t('invoices.BatchOverdue', { count: overdue })}</Tag> : null}
          </>
        );
      }
    },
    {
      title: t('invoices.PaidAmount'),
      key: 'sum',
      align: 'right',
      responsive: ['sm'],
      render: (_, batch) =>
        // What is left of the whole batch, also the rest of the partly paid invoices
        t('invoices.BatchSum', {
          paid: formatMoney(batch.invoices.reduce((sum, i) => sum + i.paidAmount, 0)),
          total: formatMoney(batch.invoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + i.total, 0)),
          left: formatMoney(batch.invoices.reduce((sum, i) => sum + invoiceLeft(i), 0))
        })
    }
  ];

  if (!invoicesUrl) return <Alert showIcon type="info" title={t('invoices.NotConfigured')} />;
  if (!sessionModel.isAdmin && !sessionModel.isEconomy)
    return <Alert showIcon type="info" title={t('invoices.OnlyAdminOrEconomy')} />;

  return (
    <>
      {modalContextHolder}
      <Typography.Title level={3}>{t('invoices.Overview')}</Typography.Title>
      {data && !canVerify ? (
        <Alert showIcon type="info" title={t('invoices.OnlyEconomy')} style={{ marginBottom: 12 }} />
      ) : null}
      {loadError ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 12 }}
          title={t('invoices.LoadFailed', { error: loadError, interpolation: { escapeValue: false } })}
        />
      ) : null}
      <Space wrap style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
          {t('invoices.NewInvoice')}
        </Button>
        <Input.Search
          allowClear
          placeholder={t('invoices.Search')}
          style={{ width: 300 }}
          onChange={e => setSearch(e.target.value)}
        />
        <Select<InvoiceFilterStatus[]>
          allowClear
          mode="multiple"
          placeholder={t('invoices.Status')}
          style={{ minWidth: 200 }}
          options={invoiceStatusOptions(t)}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <Select<InvoiceBatchType>
          allowClear
          placeholder={t('invoices.FilterType')}
          style={{ minWidth: 150 }}
          options={(['GENERAL', 'EVENT_FEES'] as InvoiceBatchType[]).map(value => ({
            value,
            label: t(`invoices.Type${value}`)
          }))}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        {canVerify && selectedIds.length > 0 ? (
          <>
            <Typography.Text>{t('invoices.Selected', { count: selectedIds.length })}</Typography.Text>
            <Button icon={<EditOutlined />} onClick={() => setStatusInvoices(selectedInvoices)}>
              {t('invoices.ChangeStatus')}
            </Button>
            <Button
              icon={<MailOutlined />}
              disabled={selectedUnpaid.length === 0}
              onClick={() => confirmRemind(selectedUnpaid)}
            >
              {t('invoices.SendReminders', { count: selectedUnpaid.length })}
            </Button>
            <Button onClick={() => setSelectedIds([])}>{t('invoices.SelectNone')}</Button>
          </>
        ) : null}
      </Space>
      {loading && !data ? (
        <SpinnerDiv>
          <Spin size="large" />
        </SpinnerDiv>
      ) : (
        <Table<IBatchRow>
          rowKey="batchId"
          size="middle"
          loading={loading || saving}
          columns={batchColumns}
          dataSource={batches}
          pagination={false}
          scroll={{ x: true }}
          expandable={{
            // With a search or a status filter the matching invoices are shown
            expandedRowKeys: filterActive ? batches.map(b => b.batchId) : expandedKeys,
            onExpandedRowsChange: keys => setExpandedKeys([...keys]),
            expandedRowRender: batch => (
              <Table<IInvoice>
                rowKey="invoiceId"
                size="small"
                columns={invoiceColumns(batch)}
                dataSource={batch.shownInvoices}
                pagination={false}
                scroll={{ x: true }}
                rowSelection={
                  canVerify
                    ? {
                        selectedRowKeys: selectedIds.filter(id => batch.shownInvoices.some(i => i.invoiceId === id)),
                        onChange: keys => {
                          const shownIds = batch.shownInvoices.map(i => i.invoiceId);
                          setSelectedIds(old => [
                            ...old.filter(id => !shownIds.includes(id)),
                            ...keys.map(key => Number(key))
                          ]);
                        }
                      }
                    : undefined
                }
              />
            )
          }}
        />
      )}
      {showCreate ? (
        <CreateInvoiceModal
          batchType="GENERAL"
          onClose={created => {
            setShowCreate(false);
            if (created) load();
          }}
        />
      ) : null}
      {historyInvoice ? (
        <InvoiceHistoryModal
          invoice={historyInvoice}
          invoicesUrl={invoicesUrl}
          onClose={() => setHistoryInvoice(undefined)}
        />
      ) : null}
      {statusInvoices ? (
        <SetStatusModal
          invoices={statusInvoices}
          saving={saving}
          onOk={onSetStatus}
          onCancel={() => setStatusInvoices(undefined)}
        />
      ) : null}
    </>
  );
});

export default InvoiceOverview;
