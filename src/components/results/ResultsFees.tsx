import { DatePicker, Form, message, Space, Spin } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IRaceClubsProps } from '../../models/resultModel';
import { PickRequired } from '../../models/typescriptPartial';
import { PostJsonData } from '../../utils/api';
import { getTextColorBasedOnBackground } from '../../utils/colorHelper';
import { dateFormat, errorRequiredField } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { IPrintTableColumn } from '../../utils/pdf';
import {
  generatePdfStatus,
  getInvoicePdf,
  getInvoiceZip,
  IFeesRecord,
  IInvoicePrintObject
} from '../../utils/pdfInvoice';
import {
  IFeeResponse,
  IIndividualViewResultResponse,
  IPrintSettings,
  IPrintSettingsColumn
} from '../../utils/responseInterfaces';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';
import { SpinnerDiv } from '../styled/styled';
import TablePrintSettingButtons from '../tableSettings/TablePrintSettingButtons';
import { CompetitorTable } from '../users/Competitors';

interface IFeesTable extends PickRequired<IFeeResponse, 'originalFee' | 'lateFee' | 'feeToClub' | 'serviceFeeToClub'> {
  key: React.Key;
  familyId?: number | null;
  edit?: undefined;
  children?: IFeesTable[];
  isFamily?: boolean;
  firstName: string;
  lastName: string;
}

const feesSort = (a: IFeesTable, b: IFeesTable) =>
  `${a.isFamily ? a.lastName.substring(a.lastName.indexOf(' ') + 1) : a.lastName} ${a.firstName}`
    .toLowerCase()
    .localeCompare(
      `${b.isFamily ? b.lastName.substring(b.lastName.indexOf(' ') + 1) : b.lastName} ${b.firstName}`.toLowerCase()
    );

const ResultsFees = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const resultsQueryUrl = useMemo(
    () => clubModel.modules.find(module => module.name === 'Results')?.queryUrl,
    [clubModel.modules]
  );
  const [feesResponse, setFeesResponse] = useState<IFeeResponse[]>();
  const [fee, setFee] = useState<IFeesTable>();
  const [toDate, setToDate] = useState<dayjs.Dayjs | null>(
    dayjs(`${dayjs().add(-6, 'months').format('YYYY')}${clubModel.invoice.breakMonthDay}`, 'YYYYMMDD')
  );
  const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(
    dayjs(toDate?.format('YYYY-MM-DD'))?.add(-1, 'years').add(1, 'days') ?? null
  );
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(
    dayjs(toDate?.format('YYYY-MM-DD'))?.add(clubModel.invoice.daysToDueDate, 'days') ?? null
  );
  const [loading, setLoading] = useState(true);
  const [formId] = useState('resultsFeesForm' + Math.floor(Math.random() * 10000000000000000));
  const [columnsSetting, setColumnsSetting] = useState<IPrintSettingsColumn[]>([]);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [spinnerTitle, setSpinnerTitle] = useState<string | null>(null);
  const [spinnerText, setSpinnerText] = useState<string | null>(null);
  const columns: IPrintTableColumn<IFeesTable>[] = useMemo(
    () => [
      {
        title: `${t('results.Competitor')}/${t('users.FamilySelect')}`,
        selected: true,
        dataIndex: 'lastName',
        key: 'lastName',
        render: (_: string, record: IFeesTable): string => `${record.firstName} ${record.lastName}`
      },
      {
        title: t('results.OriginalFee'),
        selected: true,
        dataIndex: 'originalFee',
        key: 'originalFee'
      },
      {
        title: t('results.LateFee'),
        selected: true,
        dataIndex: 'lateFee',
        key: 'lateFee'
      },
      {
        title: t('results.FeeToClub'),
        selected: true,
        dataIndex: 'feeToClub',
        key: 'feeToClub'
      },
      {
        title: t('results.ServiceFeeToClub'),
        selected: true,
        dataIndex: 'serviceFeeToClub',
        key: 'serviceFeeToClub'
      },
      {
        title: t('results.TotalFeeToClub'),
        selected: true,
        dataIndex: 'totalFeeToClub',
        key: 'totalFeeToClub',
        render: (_text: string, record: IFeesTable) => (record.feeToClub + record.serviceFeeToClub).toString()
      }
    ],
    [t]
  );
  const fees = useMemo(() => {
    const competitors =
      feesResponse?.map((c): IFeesTable => {
        const competitor = clubModel.raceClubs?.selectedClub?.competitorById(c.competitorId);
        return {
          ...c,
          key: `competitor${c.competitorId}`,
          isFamily: false,
          firstName: competitor?.firstName ?? '',
          lastName: competitor?.lastName ?? '',
          familyId: competitor?.familyId
        };
      }) ?? [];

    const families =
      clubModel.raceClubs?.selectedClub?.families.map(
        (f): IFeesTable => ({
          key: `family${f.familyId}`,
          familyId: f.familyId,
          isFamily: true,
          firstName: t('users.Family'),
          lastName: f.familyName,
          originalFee: competitors
            ?.filter(c => c.familyId === f.familyId)
            ?.reduce((prev, curr) => prev + curr.originalFee, 0),
          lateFee: competitors?.filter(c => c.familyId === f.familyId)?.reduce((prev, curr) => prev + curr.lateFee, 0),
          feeToClub: competitors
            ?.filter(c => c.familyId === f.familyId)
            ?.reduce((prev, curr) => prev + curr.feeToClub, 0),
          serviceFeeToClub: competitors
            ?.filter(c => c.familyId === f.familyId)
            ?.reduce((prev, curr) => prev + curr.serviceFeeToClub, 0),
          children: competitors?.filter(c => c.familyId === f.familyId).sort(feesSort)
        })
      ) ?? [];

    return [...families, ...competitors.filter(c => !c.familyId)]?.sort(feesSort);
  }, [feesResponse, clubModel.raceClubs, t]);
  const familyTableKeys = useMemo(() => fees.filter(f => f.isFamily).map(f => f.key), [fees]);

  const loadFeeData = useCallback(
    (fromDate: dayjs.Dayjs | null, toDate: dayjs.Dayjs | null) => {
      setLoading(true);

      if (!resultsQueryUrl) return;

      PostJsonData<IFeeResponse[]>(
        resultsQueryUrl,
        {
          iType: 'FEES',
          iFromDate: fromDate?.format('YYYY-MM-DD'),
          iToDate: toDate?.format('YYYY-MM-DD')
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(feesJson => {
          setFeesResponse(feesJson);
          setLoading(false);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setFeesResponse(undefined);
          setLoading(false);
        });
    },
    [resultsQueryUrl, sessionModel.authorizationHeader]
  );

  useEffect(() => {
    if (!resultsQueryUrl) return;

    PostJsonData<IRaceClubsProps>(
      resultsQueryUrl,
      {
        iType: 'CLUBS'
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(clubsJson => {
        if (clubsJson) {
          clubModel.setRaceClubs(clubsJson);
          loadFeeData(fromDate, toDate);
        }
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
      });
  }, [resultsQueryUrl, fromDate, toDate, loadFeeData, sessionModel.authorizationHeader, clubModel]);

  const onAbortLoading = useCallback(() => {
    generatePdfStatus.abortLoading = true;
  }, []);

  const getPrintObject = useCallback(
    async (fee: IFeesTable): Promise<IInvoicePrintObject> => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
      if (!url || !clubModel.raceClubs || !clubModel.corsProxy || !fromDate || !toDate) throw new Error();

      const invoiceMessage = t('invoice.invoiceMessage')
        ?.replaceAll('{0}', toDate?.format('YYYY') ?? '')
        ?.replaceAll('{1}', `${fee.firstName} ${fee.lastName}`);
      const competitorsDetails: IFeesRecord[] = [];
      const servicesDetails: IFeesRecord[] = [];
      const competitors = fee.isFamily && fee.children ? fee.children : [fee];

      for (let index = 0; index < competitors?.length; index++) {
        const competitor = competitors[index];
        setSpinnerText(`${competitor.firstName} ${competitor.lastName}`);

        const result = await PostJsonData<IIndividualViewResultResponse>(
          url,
          {
            iType: 'COMPETITOR',
            iFromDate: fromDate.format('YYYY-MM-DD'),
            iToDate: toDate.format('YYYY-MM-DD'),
            iCompetitorId: competitor.competitorId
          },
          true,
          sessionModel.authorizationHeader
        );
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200)));

        const resultFees = [
          ...(result?.results.map(r => ({
            name: r.name,
            raceDate: r.raceDate,
            feeToClub: r.feeToClub ?? 0,
            totalFee: (r.originalFee ?? 0) + (r.lateFee ?? 0),
            serviceFeeToClub: r.serviceFeeToClub,
            serviceFeeDescription: r.serviceFeeDescription
          })) ?? []),
          ...(result?.teamResults.map(r => ({
            name: r.name,
            raceDate: r.raceDate,
            feeToClub: 0,
            totalFee: 0,
            serviceFeeToClub: r.serviceFeeToClub,
            serviceFeeDescription: r.serviceFeeDescription
          })) ?? [])
        ];

        competitorsDetails.push({
          competitorId: competitor.competitorId!,
          description: t('invoice.invoiceCompetitorMessage')?.replaceAll(
            '{0}',
            `${competitor.firstName} ${competitor.lastName}`
          ),
          numberOf: resultFees.filter(f => f.totalFee !== 0 || f.feeToClub !== 0).reduce(prev => prev + 1, 0),
          feeToClub: resultFees
            .filter(f => f.totalFee !== 0 || f.feeToClub !== 0)
            .reduce((prev, next) => prev + next.feeToClub, 0),
          totalFee: resultFees
            .filter(f => f.totalFee !== 0 || f.feeToClub !== 0)
            .reduce((prev, next) => prev + next.totalFee, 0)
        });

        resultFees
          .filter(f => f.serviceFeeToClub !== 0)
          .forEach(f =>
            servicesDetails.push({
              competitorId: competitor.competitorId!,
              description: `${f.raceDate}, ${f.name}, ${f.serviceFeeDescription} (${competitor.firstName} ${competitor.lastName})`,
              numberOf: 1,
              feeToClub: f.serviceFeeToClub,
              totalFee: f.serviceFeeToClub
            })
          );
        setProcessed(oldValue => oldValue + 1);
        if (generatePdfStatus.abortLoading) throw new Error();
      }

      return { invoiceMessage, details: [...competitorsDetails, ...servicesDetails] };
    },
    [clubModel.modules, clubModel.raceClubs, clubModel.corsProxy, fromDate, toDate, t, sessionModel.authorizationHeader]
  );

  const onExcel = useCallback(async (): Promise<void> => {
    if (!fromDate || !toDate || !fees) return;
    const header = `${t('invoice.invoiceNumber')};${t('invoice.message')};${t('results.FullName')};${t(
      'results.OriginalFee'
    )};${t('results.LateFee')};${t('results.FeeToClub')};${t('results.ServiceFeeToClub')};${t(
      'results.TotalFeeToClub'
    )}`;
    const rows: string[] = [];
    fees.forEach(f => {
      rows.push(
        `${toDate.format('YYYY')}-TÄVL-AVG-${f.competitorId ?? f.children?.find(() => true)?.competitorId ?? 99999};${t(
          'invoice.invoiceMessage'
        )
          ?.replaceAll('{0}', toDate?.format('YYYY') ?? '')
          ?.replaceAll('{1}', `${f.firstName} ${f.lastName}`)};${
          f.isFamily ? f.lastName : f.firstName + ' ' + f.lastName
        };${f.originalFee};${f.lateFee};${f.feeToClub};${f.serviceFeeToClub};${f.feeToClub + f.serviceFeeToClub}`
      );
      f.children?.forEach(child => {
        rows.push(
          `;;- ${child.firstName + ' ' + child.lastName};${child.originalFee};${child.lateFee};${child.feeToClub};${
            child.serviceFeeToClub
          };${child.feeToClub + child.serviceFeeToClub}`
        );
      });
    });
    const csvBlob = new Blob([`${header}\r\n${rows.join('\r\n')}`], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `${t('invoice.eventFeesSubtitle')
      ?.replaceAll('{0}', fromDate?.format(dateFormat) ?? '')
      ?.replaceAll('{1}', toDate?.format(dateFormat) ?? '')}.txt`;
    link.href = URL.createObjectURL(csvBlob);
    link.click();
  }, [t, fromDate, toDate, fees]);

  const onPrint = useCallback(
    async (settings: IPrintSettings): Promise<void> => {
      generatePdfStatus.abortLoading = false;
      if (!clubModel.corsProxy || !fromDate || !toDate || !dueDate || !fee) return;
      setSpinnerTitle(t('results.loadSavedResults'));
      setSpinnerText(null);
      setTotal(fee.isFamily ? (fee.children?.length ?? 1) : 1);
      setProcessed(0);
      try {
        const printObject = await getPrintObject(fee);

        setSpinnerTitle(t('invoice.generatePdf'));

        await getInvoicePdf(
          clubModel.corsProxy,
          clubModel.logo.url,
          clubModel.clubInfo,
          {
            ...clubModel.invoice,
            title: t('invoice.eventFeesSubtitle')
              ?.replaceAll('{0}', fromDate?.format(dateFormat) ?? '')
              ?.replaceAll('{1}', toDate?.format(dateFormat) ?? ''),
            startDate: fromDate,
            endDate: toDate,
            dueDate: dueDate
          },
          [printObject],
          settings.pdf,
          setProcessed,
          setSpinnerText
        );
      } catch (e) {
        if (e && (e as { message: string }).message) message.error((e as { message: string }).message);
      }
      setTotal(0);
      setSpinnerTitle(null);
      setSpinnerText(null);
    },
    [
      clubModel.corsProxy,
      clubModel.logo.url,
      clubModel.clubInfo,
      clubModel.invoice,
      fromDate,
      toDate,
      dueDate,
      fee,
      t,
      getPrintObject
    ]
  );

  const onPrintAll = useCallback(
    async (settings: IPrintSettings, allInOnePdf: boolean): Promise<void> => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;

      if (!url || !clubModel.raceClubs || !clubModel.corsProxy || !fromDate || !toDate || !dueDate || !fees) return;

      setSpinnerTitle(t('results.loadSavedResults'));
      setSpinnerText(null);
      setProcessed(0);
      generatePdfStatus.abortLoading = false;

      try {
        const printObjects: IInvoicePrintObject[] = [];
        setTotal(
          fees.map(f => (f.isFamily ? (f.children?.length ?? 1) : 1)).reduce((prev, next) => prev + next, 0) ?? 1
        );

        for (const f of fees) {
          const printObject = await getPrintObject(f);
          printObjects.push(printObject);
          if (generatePdfStatus.abortLoading) throw new Error();
        }

        setSpinnerTitle(t('invoice.generatePdf'));
        setSpinnerText(null);
        setTotal(printObjects.length);
        setProcessed(0);

        if (allInOnePdf) {
          await getInvoicePdf(
            clubModel.corsProxy,
            clubModel.logo.url,
            clubModel.clubInfo,
            {
              ...clubModel.invoice,
              title: t('invoice.eventFeesSubtitle')
                ?.replaceAll('{0}', fromDate?.format(dateFormat) ?? '')
                ?.replaceAll('{1}', toDate?.format(dateFormat) ?? ''),
              startDate: fromDate,
              endDate: toDate,
              dueDate: dueDate
            },
            printObjects,
            settings.pdf,
            setProcessed,
            setSpinnerText
          );
        } else {
          await getInvoiceZip(
            clubModel.corsProxy,
            clubModel.logo.url,
            clubModel.clubInfo,
            {
              ...clubModel.invoice,
              title: t('invoice.eventFeesSubtitle')
                ?.replaceAll('{0}', fromDate?.format(dateFormat) ?? '')
                ?.replaceAll('{1}', toDate?.format(dateFormat) ?? ''),
              startDate: fromDate,
              endDate: toDate,
              dueDate: dueDate
            },
            printObjects,
            settings.pdf,
            setProcessed,
            setSpinnerText
          );
        }
      } catch (e) {
        if (e && (e as { message: string }).message) message.error((e as { message: string }).message);
      }
      setTotal(0);
      setSpinnerTitle(null);
      setSpinnerText(null);
    },
    [t, clubModel, fees, fromDate, toDate, dueDate, getPrintObject]
  );

  const Spinner = (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  );

  const clubBgColor = '#F0F0F0';
  const clubTextColor = getTextColorBasedOnBackground(clubBgColor);
  return (
    <Form
      id={formId}
      layout="vertical"
      initialValues={{
        FromDate: fromDate?.format(dateFormat),
        ToDate: toDate?.format(dateFormat),
        DueDate: dueDate?.format(dateFormat)
      }}
    >
      <Space wrap>
        <FormItem
          name="FromDate"
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
          <DatePicker format={dateFormat} allowClear={false} onChange={setFromDate} />
        </FormItem>
        <FormItem
          name="ToDate"
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
          <DatePicker format={dateFormat} allowClear={false} onChange={setToDate} />
        </FormItem>
        <FormItem
          name="DueDate"
          label={t('invoice.dueDate')}
          rules={[
            {
              required: true,
              message: errorRequiredField(t, 'invoice.dueDate')
            }
          ]}
          normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
          getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
        >
          <DatePicker format={dateFormat} allowClear={false} onChange={setDueDate} />
        </FormItem>
        <FormItem name="Competitor" label={`${t('results.Competitor')}/${t('users.FamilySelect')}`}>
          <FormSelect
            allowClear
            showSearch
            disabled={loading}
            style={{ maxWidth: 600, minWidth: 200 }}
            popupMatchSelectWidth={false}
            options={
              loading || !fees
                ? []
                : (fees.map(fee => ({
                    code: JSON.stringify(fee),
                    description: `${fee.firstName} ${fee.lastName}`
                  })) ?? [])
            }
            optionFilterProp="children"
            filterOption={(input, option) => option!.label!.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0}
            onChange={key => setFee(JSON.parse(key))}
          />
        </FormItem>
        <TablePrintSettingButtons
          localStorageName="resultFees"
          columns={columns}
          disablePrint={loading || !fee}
          disablePrintAll={loading}
          processed={processed}
          total={total}
          spinnerTitle={spinnerTitle}
          spinnerText={spinnerText}
          onAbortLoading={onAbortLoading}
          onExcel={onExcel}
          onPrint={onPrint}
          onPrintAll={onPrintAll}
          onTableColumns={setColumnsSetting}
        />
      </Space>
      {!loading ? (
        <CompetitorTable
          familyBackgroundColor={clubBgColor}
          familyTextColor={clubTextColor}
          columns={columns.filter(col => columnsSetting.some(s => col.key === s.key && s.selected))}
          dataSource={fees}
          size="middle"
          pagination={false}
          scroll={{ x: true }}
          expandable={{
            defaultExpandAllRows: true,
            expandedRowKeys: familyTableKeys,
            expandedRowClassName: () => 'table-row-familymember',
            rowExpandable: () => false,
            showExpandColumn: false
          }}
          rowClassName={record => (record.isFamily ? 'table-row-club' : '')}
        />
      ) : (
        Spinner
      )}
    </Form>
  );
});

export default ResultsFees;
