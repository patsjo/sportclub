import { Form, message, Spin } from 'antd';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react';
import { IMobxClubModel } from 'models/mobxClubModel';
import moment from 'moment';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { IFeeResponse, IPrintSettings, IPrintSettingsColumn } from 'utils/responseInterfaces';
import { PostJsonData } from '../../utils/api';
import { FormSelect, IOption } from '../../utils/formHelper';
import { getPdf, IPrintInput, IPrintObject, IPrintTable, IPrintTableColumn } from '../../utils/pdf';
import FormItem from '../formItems/FormItem';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import TablePrintSettingButtons from '../tableSettings/TablePrintSettingButtons';

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

const columns = (t: TFunction, clubModel: IMobxClubModel): IPrintTableColumn<IFeeResponse>[] => [
  {
    title: t('results.Competitor'),
    selected: true,
    dataIndex: 'competitorId',
    key: 'competitorId',
    fixed: 'left',
    width: 180,
    render: (id: string): string => {
      const value = id == null ? null : clubModel.raceClubs?.selectedClub?.competitorById(parseInt(id))?.fullName;
      return value ? value : '';
    },
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
    render: (_text: string, record?: IFeeResponse) =>
      record ? (record.feeToClub + record.serviceFeeToClub).toString() : '',
  },
];

const ResultsFees = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [fees, setFees] = useState<IFeeResponse[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [formId] = useState('resultsFeesForm' + Math.floor(Math.random() * 10000000000000000));
  const [columnsSetting, setColumnsSetting] = useState<IPrintSettingsColumn[]>([]);

  React.useEffect(() => {
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
        updateEventYear(year);
      })
      .catch((e) => {
        message.error(e.message);
      });
  }, []);

  const updateEventYear = React.useCallback(
    (year: number) => {
      const fromDate = moment(year, 'YYYY').format('YYYY-MM-DD');
      const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');

      setLoading(true);

      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url) return;

      PostJsonData(
        url,
        {
          iType: 'FEES',
          iFromDate: fromDate,
          iToDate: toDate,
        },
        true,
        sessionModel.authorizationHeader
      )
        .then((feesJson: IFeeResponse[]) => {
          setFees(feesJson);
          setLoading(false);
          setYear(year);
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

  const getPrintObject = React.useCallback(
    (settings: IPrintSettings): IPrintObject<IFeeResponse> => {
      const header = `${t('results.FeeToClub')} ${year}`;
      const inputs: IPrintInput[] = [];
      const tables: IPrintTable<IFeeResponse>[] = [];

      if (fees && fees.length) {
        tables.push({
          columns: columns(t, clubModel).filter((col) =>
            settings.pdf.columns.some((s) => col.key === s.key && s.selected)
          ),
          dataSource: fees,
        });
      }

      return { header, inputs, tables };
    },
    [t, clubModel, year, fees]
  );

  const onPrint = React.useCallback(
    (settings): Promise<void> => {
      return new Promise((resolve, reject) => {
        const printObject = getPrintObject(settings);
        if (!clubModel.corsProxy) {
          reject();
          return;
        }
        getPdf(clubModel.corsProxy, clubModel.logo.url, printObject.header, [printObject], settings.pdf)
          .then(resolve)
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            reject();
          });
      });
    },
    [clubModel, getPrintObject]
  );

  const Spinner = (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  );
  const fromYear = 1994;
  const currentYear = new Date().getFullYear();
  const yearOptions: IOption[] = [...Array(1 + currentYear - fromYear)].map((_, i) => ({
    code: (currentYear - i).toString(),
    description: (currentYear - i).toString(),
  }));

  return (
    <Form
      id={formId}
      layout="vertical"
      initialValues={{
        Year: year,
      }}
    >
      <StyledRow>
        <Col>
          <FormItem name="Year" label={t('calendar.SelectYear')}>
            <FormSelect
              disabled={loading}
              style={{ minWidth: 70, maxWidth: 300, width: '100%' }}
              options={yearOptions}
              onChange={(value) => updateEventYear(value)}
            />
          </FormItem>
        </Col>
        <Col>
          <TablePrintSettingButtons
            localStorageName="resultFees"
            columns={columns(t, clubModel)}
            disablePrint={loading || !fees || fees.length === 0}
            disablePrintAll={true}
            onPrint={onPrint}
            onTableColumns={setColumnsSetting}
          />
        </Col>
      </StyledRow>
      {!loading ? (
        <StyledTable
          columns={
            columns(t, clubModel).filter((col) =>
              columnsSetting.some((s) => col.key === s.key && s.selected)
            ) as IPrintTableColumn<any>[]
          }
          dataSource={fees}
          size="middle"
          pagination={false}
          scroll={{ x: true }}
        />
      ) : (
        Spinner
      )}
    </Form>
  );
});

export default ResultsFees;
