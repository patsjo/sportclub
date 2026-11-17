import { WarningOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Space,
  Table,
  TableProps,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { Key, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ICreateInvoiceRecipient,
  ICreateInvoicesRequest,
  IInvoiceRecipientsResponse,
  IInvoiceRow,
  InvoiceBatchType,
  invoiceMessage,
  SWISH_MESSAGE_MAX_LENGTH
} from '../../models/invoiceModel';
import { PostJsonData } from '../../utils/api';
import { dateFormat } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import FormItem from '../formItems/FormItem';
import { errorText, formatMoney } from './invoiceHelper';

interface ICreateInvoiceForm {
  title: string;
  messageTemplate: string;
  dueDate: dayjs.Dayjs;
  invoiceFee: number;
  amountUser?: number;
  amountFamily?: number;
}

interface IRecipientRow {
  key: string;
  type: 'USER' | 'COMPETITOR' | 'FAMILY';
  name: string;
  /** Family members, or the email of the user */
  info?: string;
  /** A family without users, nobody sees the invoice */
  noLinkedUser?: boolean;
  /** Fixed amount (event fees) */
  amount?: number;
  children?: IRecipientRow[];
  userId?: number;
  competitorId?: number;
  familyId?: number;
}

export interface IEventFeesPreset {
  title: string;
  messageTemplate: string;
  dueDate: dayjs.Dayjs;
  periodFrom: string;
  periodTo: string;
  /** Competitors without family, and families, with the fees */
  recipients: ICreateInvoiceRecipient[];
  /** The specification of the selected recipients (loaded from the results when the invoices are created) */
  loadRows: (
    recipients: ICreateInvoiceRecipient[],
    onProgress: (processed: number, total: number, text?: string) => void
  ) => Promise<Map<string, IInvoiceRow[]>>;
}

interface ICreateInvoiceModalProps {
  batchType: InvoiceBatchType;
  /** Only for event fees */
  eventFees?: IEventFeesPreset;
  onClose: (created: boolean) => void;
}

const CreateInvoiceModal = observer(({ batchType, eventFees, onClose }: ICreateInvoiceModalProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const invoicesUrl = clubModel.invoice.url;
  const [form] = Form.useForm<ICreateInvoiceForm>();
  const messageTemplate = Form.useWatch('messageTemplate', form) ?? '';
  const amountUser = Form.useWatch('amountUser', form) ?? 0;
  const amountFamily = Form.useWatch('amountFamily', form) ?? 0;
  const invoiceFee = Form.useWatch('invoiceFee', form) ?? 0;
  const [recipientsData, setRecipientsData] = useState<IInvoiceRecipientsResponse>();
  const [loadError, setLoadError] = useState<string>();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>(
    eventFees?.recipients.filter(r => r.amount > 0).map(r => r.key) ?? []
  );
  const [search, setSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number; text?: string }>();
  const isEventFees = batchType === 'EVENT_FEES';

  useEffect(() => {
    if (isEventFees || !invoicesUrl) return;
    PostJsonData<IInvoiceRecipientsResponse>(
      invoicesUrl,
      { iType: 'RECIPIENTS' },
      true,
      sessionModel.authorizationHeader
    )
      .then(response => setRecipientsData(response))
      .catch(e => setLoadError(errorText(e)));
  }, [invoicesUrl, isEventFees, sessionModel.authorizationHeader]);

  // Families with their competitors (also when no user is linked), then the users without family
  const allRows = useMemo((): IRecipientRow[] => {
    if (isEventFees)
      return (
        eventFees?.recipients.map(r => ({
          key: r.key,
          type: r.familyId ? 'FAMILY' : r.competitorId ? 'COMPETITOR' : 'USER',
          name: r.name,
          amount: r.amount,
          userId: r.userId,
          competitorId: r.competitorId,
          familyId: r.familyId
        })) ?? []
      );
    if (!recipientsData) return [];
    const userRow = (u: IInvoiceRecipientsResponse['users'][number]): IRecipientRow => ({
      key: `U${u.userId}`,
      type: 'USER',
      name: u.name,
      info: u.email ?? undefined,
      userId: u.userId
    });
    return [
      ...recipientsData.families.map((f): IRecipientRow => {
        const competitors = (recipientsData.familyCompetitors ?? []).filter(c => c.familyId === f.familyId);
        // The users linked to the competitor, from the users (they have the competitor id)
        const linkedUsers = (competitorId: number) => recipientsData.users.filter(u => u.competitorId === competitorId);
        return {
          key: `F${f.familyId}`,
          type: 'FAMILY',
          name: f.familyName,
          info: f.members,
          noLinkedUser: !recipientsData.users.some(u => u.familyId === f.familyId),
          familyId: f.familyId,
          // An invoice to a competitor is seen by the whole family, also the users linked to the other competitors
          children:
            competitors.length > 0
              ? competitors.map((c): IRecipientRow => ({
                  key: `C${c.competitorId}`,
                  type: 'COMPETITOR',
                  name: c.name,
                  // The email of the linked user, the name only when it isn't the same as the competitor
                  info:
                    linkedUsers(c.competitorId)
                      .map(u =>
                        [u.name.trim().toLowerCase() !== c.name.trim().toLowerCase() ? u.name : '', u.email ?? '']
                          .filter(text => !!text)
                          .join(' ')
                      )
                      .filter(text => !!text)
                      .join(', ') || undefined,
                  competitorId: c.competitorId
                }))
              : undefined
        };
      }),
      ...recipientsData.users.filter(u => !u.familyId).map(userRow)
    ];
  }, [eventFees, isEventFees, recipientsData]);

  const flatRows = useMemo(() => allRows.flatMap(row => [row, ...(row.children ?? [])]), [allRows]);

  const shownRows = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return allRows;
    const matches = (row: IRecipientRow) =>
      row.name.toLowerCase().includes(text) || (row.info ?? '').toLowerCase().includes(text);
    return allRows.flatMap((row): IRecipientRow[] => {
      const children = row.children?.filter(matches);
      return matches(row) || (children && children.length > 0)
        ? [{ ...row, children: matches(row) ? row.children : children }]
        : [];
    });
  }, [allRows, search]);

  const amountOf = useCallback(
    (row: IRecipientRow) => row.amount ?? (row.type === 'FAMILY' ? amountFamily : amountUser),
    [amountFamily, amountUser]
  );

  const selectedRows = useMemo(() => flatRows.filter(row => selectedKeys.includes(row.key)), [flatRows, selectedKeys]);
  const totalSum = selectedRows.reduce((sum, row) => sum + amountOf(row) + invoiceFee, 0);
  const longestMessage = useMemo(
    () =>
      selectedRows
        .map(row => ({ name: row.name, length: invoiceMessage(messageTemplate, row.name).length }))
        .sort((a, b) => b.length - a.length)[0],
    [messageTemplate, selectedRows]
  );

  const selectKeys = (keys: Key[], add: boolean) =>
    setSelectedKeys(old => (add ? [...new Set([...old, ...keys])] : old.filter(key => !keys.includes(key))));
  const familyKeys = flatRows.filter(r => r.type === 'FAMILY').map(r => r.key);
  const userKeys = flatRows.filter(r => r.type !== 'FAMILY').map(r => r.key);
  const usersWithoutFamilyKeys = allRows.filter(r => r.type !== 'FAMILY').map(r => r.key);

  const onOk = useCallback(async () => {
    if (!invoicesUrl) return;
    const values = await form.validateFields();
    if (selectedRows.length === 0) {
      message.error(t('invoices.NoRecipients'));
      return;
    }
    setSaving(true);
    try {
      const recipients: ICreateInvoiceRecipient[] = selectedRows.map(row => ({
        key: row.key,
        userId: row.userId,
        competitorId: row.competitorId,
        familyId: row.familyId,
        name: row.name,
        amount: amountOf(row)
      }));
      if (eventFees) {
        setProgress({ processed: 0, total: recipients.length });
        const rows = await eventFees.loadRows(
          eventFees.recipients.filter(r => selectedKeys.includes(r.key)),
          (processed, total, text) => setProgress({ processed, total, text })
        );
        recipients.forEach(recipient => (recipient.rows = rows.get(recipient.key)));
      }
      const request: ICreateInvoicesRequest = {
        iType: 'CREATE',
        batchType,
        title: values.title,
        messageTemplate: values.messageTemplate,
        dueDate: values.dueDate.format(dateFormat),
        invoiceFee: values.invoiceFee ?? 0,
        periodFrom: eventFees?.periodFrom,
        periodTo: eventFees?.periodTo,
        recipients: recipients.map(r => ({
          userId: r.userId,
          competitorId: r.competitorId,
          familyId: r.familyId,
          amount: r.amount,
          rows: r.rows
        }))
      };
      const response = await PostJsonData<{ numberOfInvoices: number }>(
        invoicesUrl,
        request,
        true,
        sessionModel.authorizationHeader,
        1
      );
      message.success(t('invoices.CreatedInvoices', { count: response?.numberOfInvoices ?? recipients.length }));
      onClose(true);
    } catch (e) {
      message.error(errorText(e));
    }
    setSaving(false);
    setProgress(undefined);
  }, [
    amountOf,
    batchType,
    eventFees,
    form,
    invoicesUrl,
    onClose,
    selectedKeys,
    selectedRows,
    sessionModel.authorizationHeader,
    t
  ]);

  const columns: TableProps<IRecipientRow>['columns'] = [
    {
      title: t('invoices.Recipient'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row) => (
        <>
          {row.type === 'FAMILY' ? <Tag color="purple">{t('invoices.Family')}</Tag> : null}
          {name}
          {row.noLinkedUser ? (
            <Tooltip title={t('invoices.NoLinkedUser')}>
              <WarningOutlined style={{ color: '#faad14', marginLeft: 6 }} />
            </Tooltip>
          ) : null}
          {row.info ? (
            row.type === 'FAMILY' ? (
              <>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {row.info}
                </Typography.Text>
              </>
            ) : (
              // A person on one line, the email after the name
              <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                {row.info}
              </Typography.Text>
            )
          ) : null}
        </>
      )
    },
    {
      title: t('invoices.Amount'),
      key: 'amount',
      align: 'right',
      render: (_, row) => {
        // A collapsed family shows the total of the family and its selected members, expanded each one by itself
        if (!row.children || expandedKeys.includes(row.key)) return formatMoney(amountOf(row));
        const selectedChildren = row.children.filter(child => selectedKeys.includes(child.key));
        const familySelected = selectedKeys.includes(row.key);
        if (!familySelected && selectedChildren.length === 0)
          return <Typography.Text type="secondary">{formatMoney(amountOf(row))}</Typography.Text>;
        const total =
          (familySelected ? amountOf(row) : 0) + selectedChildren.reduce((sum, child) => sum + amountOf(child), 0);
        return selectedChildren.length > 0 ? (
          <Tooltip
            title={[
              ...(familySelected ? [`${t('invoices.Family')} ${formatMoney(amountOf(row))}`] : []),
              ...selectedChildren.map(child => `${child.name} ${formatMoney(amountOf(child))}`)
            ].join(' + ')}
          >
            <Typography.Text strong>{formatMoney(total)}</Typography.Text>
          </Tooltip>
        ) : (
          formatMoney(total)
        );
      }
    }
  ];

  return (
    <Modal
      open
      destroyOnHidden
      width={900}
      title={isEventFees ? t('invoices.CreateEventFeeInvoices') : t('invoices.NewInvoice')}
      okText={t('invoices.CreateInvoices')}
      okButtonProps={{ disabled: selectedRows.length === 0, loading: saving }}
      cancelButtonProps={{ disabled: saving }}
      maskClosable={false}
      onOk={onOk}
      onCancel={() => !saving && onClose(false)}
    >
      <Form<ICreateInvoiceForm>
        form={form}
        layout="vertical"
        initialValues={{
          title: eventFees?.title ?? '',
          messageTemplate: eventFees?.messageTemplate ?? '',
          dueDate: eventFees?.dueDate ?? dayjs().add(clubModel.invoice.daysToDueDate, 'days'),
          invoiceFee: clubModel.invoice.invoiceFee ?? 3
        }}
      >
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <FormItem name="title" label={t('invoices.Title')} rules={[{ required: true, whitespace: true }]}>
              <Input maxLength={128} placeholder="Medlemsavgift 2026" />
            </FormItem>
          </Col>
          <Col xs={24} md={12}>
            <FormItem
              name="messageTemplate"
              label={t('invoices.Message')}
              extra={t('invoices.MessageHint')}
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={128} placeholder="Medlemsavgift 2026, {namn}" />
            </FormItem>
          </Col>
          <Col xs={12} md={6}>
            <FormItem label={t('invoices.InvoiceDate')}>
              <Input disabled value={dayjs().format(dateFormat)} />
            </FormItem>
          </Col>
          <Col xs={12} md={6}>
            <FormItem name="dueDate" label={t('invoices.DueDate')} rules={[{ required: true }]}>
              <DatePicker
                format={dateFormat}
                allowClear={false}
                disabledDate={date => date.isBefore(dayjs(), 'day')}
                style={{ width: '100%' }}
              />
            </FormItem>
          </Col>
          <Col xs={12} md={4}>
            <FormItem name="invoiceFee" label={t('invoices.InvoiceFee')} rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} step={1} decimalSeparator="," suffix="kr" style={{ width: '100%' }} />
            </FormItem>
          </Col>
          {!isEventFees ? (
            <>
              <Col xs={12} md={4}>
                <FormItem
                  name="amountUser"
                  label={t('invoices.AmountUser')}
                  rules={[{ required: selectedRows.some(row => row.type !== 'FAMILY') }]}
                >
                  <InputNumber min={0} precision={2} decimalSeparator="," suffix="kr" style={{ width: '100%' }} />
                </FormItem>
              </Col>
              <Col xs={12} md={4}>
                <FormItem
                  name="amountFamily"
                  label={t('invoices.AmountFamily')}
                  rules={[{ required: selectedRows.some(row => row.type === 'FAMILY') }]}
                >
                  <InputNumber min={0} precision={2} decimalSeparator="," suffix="kr" style={{ width: '100%' }} />
                </FormItem>
              </Col>
            </>
          ) : (
            <Col xs={24} md={8}>
              <FormItem label={t('results.QueryStartDate') + ' – ' + t('results.QueryEndDate')}>
                <Input disabled value={`${eventFees?.periodFrom} – ${eventFees?.periodTo}`} />
              </FormItem>
            </Col>
          )}
        </Row>
      </Form>
      {longestMessage && longestMessage.length > SWISH_MESSAGE_MAX_LENGTH ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 8 }}
          title={t('invoices.MessageTooLong', { ...longestMessage, interpolation: { escapeValue: false } })}
        />
      ) : null}
      {loadError ? (
        <Alert
          showIcon
          type="error"
          title={t('invoices.LoadFailed', { error: loadError, interpolation: { escapeValue: false } })}
        />
      ) : null}
      <Typography.Title level={5}>{t('invoices.Recipients')}</Typography.Title>
      <Space wrap style={{ marginBottom: 8 }}>
        {familyKeys.length > 0 ? (
          <>
            <Button size="small" onClick={() => selectKeys(familyKeys, true)}>
              {t('invoices.SelectAllFamilies')}
            </Button>
            <Button size="small" onClick={() => selectKeys(familyKeys, false)}>
              {t('invoices.SelectNoFamilies')}
            </Button>
          </>
        ) : null}
        {userKeys.length > 0 ? (
          <>
            <Button size="small" onClick={() => selectKeys(userKeys, true)}>
              {isEventFees ? t('invoices.SelectAllCompetitors') : t('invoices.SelectAllUsers')}
            </Button>
            <Button size="small" onClick={() => selectKeys(userKeys, false)}>
              {isEventFees ? t('invoices.SelectNoCompetitors') : t('invoices.SelectNoUsers')}
            </Button>
          </>
        ) : null}
        {!isEventFees && usersWithoutFamilyKeys.length > 0 ? (
          <Button size="small" onClick={() => selectKeys(usersWithoutFamilyKeys, true)}>
            {t('invoices.SelectUsersWithoutFamily')}
          </Button>
        ) : null}
        <Button size="small" onClick={() => setSelectedKeys([])}>
          {t('invoices.SelectNone')}
        </Button>
        <Input.Search allowClear size="small" style={{ width: 200 }} onChange={e => setSearch(e.target.value)} />
      </Space>
      {isEventFees ? (
        <Typography.Paragraph type="secondary">{t('invoices.ZeroNotSelected')}</Typography.Paragraph>
      ) : null}
      <Table<IRecipientRow>
        size="small"
        rowKey="key"
        columns={columns}
        dataSource={shownRows}
        loading={!isEventFees && !recipientsData && !loadError}
        pagination={false}
        scroll={{ y: 360 }}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: keys => setExpandedKeys([...keys])
        }}
        rowSelection={{
          checkStrictly: true,
          selectedRowKeys: selectedKeys,
          onChange: (_, __, info) => {
            // Only the rows shown (search) are changed by "select all"
            if (info.type === 'all') {
              const shownKeys = shownRows.flatMap(row => [row.key, ...(row.children ?? []).map(c => c.key)]);
              const allSelected = shownKeys.every(key => selectedKeys.includes(key));
              selectKeys(shownKeys, !allSelected);
            }
          },
          onSelect: (row, selected) => selectKeys([row.key], selected)
        }}
      />
      <Typography.Paragraph strong style={{ marginTop: 8 }}>
        {t('invoices.NumberOfRecipients', { count: selectedRows.length, sum: formatMoney(totalSum) })}
      </Typography.Paragraph>
      {progress ? (
        <>
          <Typography.Text>
            {t('invoices.LoadingFees')}
            {progress.text ? ` – ${progress.text}` : ''}
          </Typography.Text>
          <Progress percent={progress.total ? Math.round((progress.processed * 100) / progress.total) : 0} />
        </>
      ) : null}
    </Modal>
  );
});

export default CreateInvoiceModal;
