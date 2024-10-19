import { DatePicker, Form, message, Spin } from 'antd';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react';
import { IMobxClubModel } from 'models/mobxClubModel';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import {
  IFeeResponse,
  IIndividualViewResultResponse,
  IPrintSettings,
  IPrintSettingsColumn,
} from 'utils/responseInterfaces';
import { PostJsonData } from '../../utils/api';
import { dateFormat, errorRequiredField, FormSelect, INumberOption, IOption } from '../../utils/formHelper';
import { getPdf, getZip, IPrintInput, IPrintObject, IPrintTable, IPrintTableColumn } from '../../utils/pdf';
import FormItem from '../formItems/FormItem';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import TablePrintSettingButtons from '../tableSettings/TablePrintSettingButtons';
import { PickRequired } from 'models/typescriptPartial';
import { CompetitorTable } from 'components/users/Competitors';
import { getTextColorBasedOnBackground, lightenColor } from 'utils/colorHelper';
import { getInvoicePdf, getInvoiceZip, IFeesRecord, IInvoicePrintObject } from 'utils/pdfInvoice';

let abortLoading = false;

const StyledRow = styled.div`
  display: block;
  white-space: nowrap;
  width: 100%;
`;
const Col = styled.div`
  display: inline-block;
  margin-left: 5px;
  vertical-align: bottom;
`;

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
  `${a.lastName} ${a.firstName}`.toLowerCase().localeCompare(`${b.lastName} ${b.firstName}`.toLowerCase());

const columns = (t: TFunction, clubModel: IMobxClubModel): IPrintTableColumn<IFeesTable>[] => [
  {
    title: `${t('results.Competitor')}/${t('users.FamilySelect')}`,
    selected: true,
    dataIndex: 'lastName',
    key: 'lastName',
    render: (_: string, record: IFeesTable): string => `${record.firstName} ${record.lastName}`,
  },
  {
    title: t('results.OriginalFee'),
    selected: true,
    dataIndex: 'originalFee',
    key: 'originalFee',
  },
  {
    title: t('results.LateFee'),
    selected: true,
    dataIndex: 'lateFee',
    key: 'lateFee',
  },
  {
    title: t('results.FeeToClub'),
    selected: true,
    dataIndex: 'feeToClub',
    key: 'feeToClub',
  },
  {
    title: t('results.ServiceFeeToClub'),
    selected: true,
    dataIndex: 'serviceFeeToClub',
    key: 'serviceFeeToClub',
  },
  {
    title: t('results.TotalFeeToClub'),
    selected: true,
    dataIndex: 'totalFeeToClub',
    key: 'totalFeeToClub',
    render: (_text: string, record: IFeesTable) => (record.feeToClub + record.serviceFeeToClub).toString(),
  },
];

const ResultsFees = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [fees, setFees] = useState<IFeesTable[]>([]);
  const [fee, setFee] = useState<IFeesTable>();
  const [toDate, setToDate] = useState<moment.Moment | null>(
    moment(`${moment().add(-6, 'months').format('YYYY')}${clubModel.invoice.breakMonthDay}`, 'YYYYMMDD')
  );
  const [fromDate, setFromDate] = useState<moment.Moment | null>(
    moment(toDate?.format('YYYY-MM-DD'))?.add(-1, 'years').add(1, 'days') ?? null
  );
  const [loading, setLoading] = useState(true);
  const [formId] = useState('resultsFeesForm' + Math.floor(Math.random() * 10000000000000000));
  const [columnsSetting, setColumnsSetting] = useState<IPrintSettingsColumn[]>([]);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [spinnerTitle, setSpinnerTitle] = useState<string | null>(null);
  const [spinnerText, setSpinnerText] = useState<string | null>(null);
  const familyTableKeys = useMemo(() => fees.filter((f) => f.isFamily).map((f) => f.key), [fees]);

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      {
        iType: 'CLUBS',
      },
      true,
      sessionModel.authorizationHeader
    )
      .then((clubsJson) => {
        clubModel.setRaceClubs(clubsJson);
        loadFeeData(fromDate, toDate);
      })
      .catch((e) => {
        message.error(e.message);
      });
  }, []);

  const onAbortLoading = () => {
    abortLoading = true;
  };

  const loadFeeData = useCallback(
    (fromDate: moment.Moment | null, toDate: moment.Moment | null) => {
      setLoading(true);

      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url) return;

      PostJsonData(
        url,
        {
          iType: 'FEES',
          iFromDate: fromDate?.format('YYYY-MM-DD'),
          iToDate: toDate?.format('YYYY-MM-DD'),
        },
        true,
        sessionModel.authorizationHeader
      )
        .then((feesJson: IFeeResponse[]) => {
          const competitors =
            feesJson?.map((c): IFeesTable => {
              const competitor = clubModel.raceClubs?.selectedClub?.competitorById(c.competitorId);
              return {
                ...c,
                key: `competitor${c.competitorId}`,
                isFamily: false,
                firstName: competitor?.firstName ?? '',
                lastName: competitor?.lastName ?? '',
                familyId: competitor?.familyId,
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
                  ?.filter((c) => c.familyId === f.familyId)
                  ?.reduce((prev, curr) => prev + curr.originalFee, 0),
                lateFee: competitors
                  ?.filter((c) => c.familyId === f.familyId)
                  ?.reduce((prev, curr) => prev + curr.lateFee, 0),
                feeToClub: competitors
                  ?.filter((c) => c.familyId === f.familyId)
                  ?.reduce((prev, curr) => prev + curr.feeToClub, 0),
                serviceFeeToClub: competitors
                  ?.filter((c) => c.familyId === f.familyId)
                  ?.reduce((prev, curr) => prev + curr.serviceFeeToClub, 0),
                children: competitors?.filter((c) => c.familyId === f.familyId),
              })
            ) ?? [];

          const familesAndCompetitors = [...families, ...competitors.filter((c) => !c.familyId)]?.sort(feesSort);
          setFees(familesAndCompetitors);
          setLoading(false);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          setFees([]);
          setLoading(false);
        });
    },
    [clubModel, sessionModel]
  );

  const getPrintObject = useCallback(
    async (fee: IFeesTable): Promise<IInvoicePrintObject> => {
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url || !clubModel.raceClubs || !clubModel.corsProxy || !fromDate || !toDate) throw new Error();

      const invoiceMessage = t('invoice.invoiceMessage')
        ?.replaceAll('{0}', toDate?.format('YYYY') ?? '')
        ?.replaceAll('{1}', `${fee.firstName} ${fee.lastName}`);
      const competitorsDetails: IFeesRecord[] = [];
      const servicesDetails: IFeesRecord[] = [];
      const competitors = fee.isFamily && fee.children ? fee.children : [fee];

      for (let index = 0; index < competitors?.length; index++) {
        const competitor = competitors[index];

        const result = (await PostJsonData(
          url,
          {
            iType: 'COMPETITOR',
            iFromDate: fromDate.format('YYYY-MM-DD'),
            iToDate: toDate.format('YYYY-MM-DD'),
            iCompetitorId: competitor.competitorId,
          },
          true,
          sessionModel.authorizationHeader
        )) as IIndividualViewResultResponse;
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 200)));

        const resultFees = [
          ...result.results.map((r) => ({
            name: r.name,
            raceDate: r.raceDate,
            feeToClub: r.feeToClub ?? 0,
            totalFee: (r.originalFee ?? 0) + (r.lateFee ?? 0),
            serviceFeeToClub: r.serviceFeeToClub,
            serviceFeeDescription: r.serviceFeeDescription,
          })),
          ...result.teamResults.map((r) => ({
            name: r.name,
            raceDate: r.raceDate,
            feeToClub: 0,
            totalFee: 0,
            serviceFeeToClub: r.serviceFeeToClub,
            serviceFeeDescription: r.serviceFeeDescription,
          })),
        ];

        competitorsDetails.push({
          competitorId: competitor.competitorId!,
          description: t('invoice.invoiceCompetitorMessage')?.replaceAll(
            '{0}',
            `${competitor.firstName} ${competitor.lastName}`
          ),
          numberOf: resultFees.filter((f) => f.totalFee !== 0 || f.feeToClub !== 0).reduce((prev) => prev + 1, 0),
          feeToClub: resultFees
            .filter((f) => f.totalFee !== 0 || f.feeToClub !== 0)
            .reduce((prev, next) => prev + next.feeToClub, 0),
          totalFee: resultFees
            .filter((f) => f.totalFee !== 0 || f.feeToClub !== 0)
            .reduce((prev, next) => prev + next.totalFee, 0),
        });

        resultFees
          .filter((f) => f.serviceFeeToClub !== 0)
          .forEach((f) =>
            servicesDetails.push({
              competitorId: competitor.competitorId!,
              description: `${f.raceDate}, ${f.name}, ${f.serviceFeeDescription}`,
              numberOf: 1,
              feeToClub: f.serviceFeeToClub,
              totalFee: f.serviceFeeToClub,
            })
          );
      }

      if (abortLoading) throw new Error();

      return { invoiceMessage, details: [...competitorsDetails, ...servicesDetails] };
    },
    [t, clubModel, fromDate, toDate]
  );

  const onPrint = useCallback(
    async (settings: IPrintSettings): Promise<void> => {
      abortLoading = false;
      setSpinnerTitle(t('results.loadSavedResults'));
      setSpinnerText(null);
      setTotal(1);
      setProcessed(0);
      try {
        if (!clubModel.corsProxy || !fromDate || !toDate || !fee) return;
        const printObject = await getPrintObject(fee);

        setSpinnerTitle(t('results.calculateResults'));

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
          },
          [printObject],
          settings.pdf
        );
      } catch (e: any) {
        if (e && e.message) {
          message.error(e.message);
        }
      }
      setTotal(0);
      setSpinnerTitle(null);
      setSpinnerText(null);
    },
    [clubModel, getPrintObject, fee, fromDate, toDate]
  );

  const onPrintAll = useCallback(
    async (settings: IPrintSettings, allInOnePdf: boolean): Promise<void> => {
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;

      if (!url || !clubModel.raceClubs || !clubModel.corsProxy || !fromDate || !toDate) return;

      setSpinnerTitle(t('results.loadSavedResults'));
      setSpinnerText(null);
      setProcessed(0);
      abortLoading = false;

      try {
        const printObjects: IInvoicePrintObject[] = [];
        setTotal(fees?.length ?? 1);

        for (const f of fees) {
          setSpinnerText(`${f.firstName} ${f.lastName}`);
          const printObject = await getPrintObject(f);
          printObjects.push(printObject);
          if (abortLoading) throw new Error();
          setProcessed((oldValue) => oldValue + 1);
        }

        setSpinnerTitle(t('results.calculateResults'));
        setSpinnerText(null);
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
            },
            printObjects,
            settings.pdf
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
            },
            printObjects,
            settings.pdf
          );
        }
      } catch (e: any) {
        if (e && e.message) {
          message.error(e.message);
        }
      }
      setTotal(0);
      setSpinnerTitle(null);
      setSpinnerText(null);
    },
    [t, clubModel, sessionModel, fromDate, toDate, getPrintObject]
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
        FromDate: fromDate,
        ToDate: toDate,
      }}
    >
      <StyledRow>
        <Col>
          <FormItem
            name="FromDate"
            label={t('results.QueryStartDate')}
            rules={[
              {
                required: true,
                type: 'object',
                message: errorRequiredField(t, 'results.QueryStartDate'),
              },
            ]}
          >
            <DatePicker
              format={dateFormat}
              allowClear={false}
              onChange={(value) => {
                setFromDate(value);
                loadFeeData(value, toDate);
              }}
            />
          </FormItem>
        </Col>
        <Col>
          <FormItem
            name="ToDate"
            label={t('results.QueryEndDate')}
            rules={[
              {
                required: true,
                type: 'object',
                message: errorRequiredField(t, 'results.QueryEndDate'),
              },
            ]}
          >
            <DatePicker
              format={dateFormat}
              allowClear={false}
              onChange={(value) => {
                setToDate(value);
                loadFeeData(fromDate, value);
              }}
            />
          </FormItem>
        </Col>
        <Col style={{ width: 'calc(100% - 480px)' }}>
          <FormItem name="Competitor" label={`${t('results.Competitor')}/${t('users.FamilySelect')}`}>
            <FormSelect
              disabled={loading}
              style={{ maxWidth: 600, width: '100%' }}
              dropdownMatchSelectWidth={false}
              options={
                loading || !fees
                  ? []
                  : fees.map((fee) => ({
                      code: JSON.stringify(fee),
                      description: `${fee.firstName} ${fee.lastName}`,
                    })) ?? []
              }
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => option?.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
              onChange={(key) => setFee(JSON.parse(key))}
            />
          </FormItem>
        </Col>
        <Col>
          <TablePrintSettingButtons
            localStorageName="resultFees"
            columns={columns(t, clubModel)}
            disablePrint={loading || !fee}
            disablePrintAll={loading}
            processed={processed}
            total={total}
            spinnerTitle={spinnerTitle}
            spinnerText={spinnerText}
            onAbortLoading={onAbortLoading}
            onPrint={onPrint}
            onPrintAll={onPrintAll}
            onTableColumns={setColumnsSetting}
          />
        </Col>
      </StyledRow>
      {!loading ? (
        <CompetitorTable
          familyBackgroundColor={clubBgColor}
          familyTextColor={clubTextColor}
          columns={
            columns(t, clubModel).filter((col) =>
              columnsSetting.some((s) => col.key === s.key && s.selected)
            ) as IPrintTableColumn<any>[]
          }
          dataSource={fees}
          size="middle"
          pagination={false}
          scroll={{ x: true }}
          expandable={{
            defaultExpandAllRows: true,
            expandedRowKeys: familyTableKeys,
            expandedRowClassName: () => 'table-row-familymember',
            rowExpandable: () => false,
            showExpandColumn: false,
          }}
          rowClassName={(record: any) => (record.isFamily ? 'table-row-club' : '')}
        />
      ) : (
        Spinner
      )}
    </Form>
  );
});

export default ResultsFees;
