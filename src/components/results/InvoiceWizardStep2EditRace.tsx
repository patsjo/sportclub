import { Col, DatePicker, Form, Input, InputNumber, message, Row, Spin, TimePicker } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { ColumnType } from 'antd/lib/table';
import { observer } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { IRaceEventSnapshotIn, IRaceResult, IRaceTeamResult } from 'models/resultModel';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import { useResultWizardStore } from 'utils/resultWizardStore';
import { PostJsonData } from '../../utils/api';
import { dateFormat, shortTimeFormat } from '../../utils/formHelper';
import { FormatTime } from '../../utils/resultHelper';
import FormItem from '../formItems/FormItem';
import { SpinnerDiv, StyledTable } from '../styled/styled';

interface IInvoiceRaceResult {
  key: string;
  resultId?: number;
  teamResultId?: number;
  competitorId: number;
  className: string;
  failedReason?: string | null;
  competitorTime?: string | null;
  serviceFeeToClub: number;
  serviceFeeDescription?: string | null;
  originalFee?: number | null;
  lateFee?: number | null;
  feeToClub?: number | null;
  totalFeeToClub?: number | null;
}

interface IInvoiceWizardStep2EditRaceProps {
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed?: (e: any) => void;
}
const InvoiceWizardStep2EditRace = observer(({ visible, onValidate, onFailed }: IInvoiceWizardStep2EditRaceProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const { raceWizardModel } = useResultWizardStore();
  const formRef = useRef<FormInstance>(null);
  const formId = useMemo(() => 'invoiceWizardFormStep2EditRace' + Math.floor(Math.random() * 1000000000000000), []);
  const [loaded, setLoaded] = useState(false);
  const [isRelay, setIsRelay] = useState(false);

  const getMobxResult = useCallback(
    (resultObject: IInvoiceRaceResult): IRaceResult | IRaceTeamResult | undefined => {
      if (isRelay) {
        return raceWizardModel.raceEvent?.teamResults.find((r) => r.teamResultId === resultObject.teamResultId);
      } else {
        return raceWizardModel.raceEvent?.results.find((r) => r.resultId === resultObject.resultId);
      }
    },
    [raceWizardModel, isRelay]
  );

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
      true,
      sessionModel.authorizationHeader
    )
      .then(async (editResultJson: IRaceEventSnapshotIn) => {
        editResultJson.invoiceVerified = true;
        raceWizardModel.setRaceEvent(editResultJson);
        onValidate(true);
        setIsRelay(editResultJson.isRelay);
        setLoaded(true);
      })
      .catch((e) => {
        if (e && e.message) {
          message.error(e.message);
        }
        onFailed && onFailed(e);
      });
  }, []);

  let columns: ColumnType<IInvoiceRaceResult>[] = [
    {
      title: t('results.Competitor'),
      dataIndex: 'competitorId',
      key: 'competitorId',
      render: (id) => clubModel.raceClubs?.selectedClub.competitorById(id)?.fullName,
    },
    {
      title: t('results.Class'),
      dataIndex: 'className',
      key: 'className',
    },
    {
      title: t('results.FailedReason'),
      dataIndex: 'failedReason',
      key: 'failedReason',
      render: (reason) => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null),
    },
    {
      title: t('results.Time'),
      dataIndex: 'competitorTime',
      key: 'competitorTime',
      render: (value) => FormatTime(value),
    },
  ];

  const serviceFeeColumns: ColumnType<IInvoiceRaceResult>[] = [
    {
      title: t('results.ServiceFeeToClub'),
      dataIndex: 'serviceFeeToClub',
      key: 'serviceFeeToClub',
      render: (data, record) => (
        <InputNumber
          key={`serviceFeeToClub#${record.key}`}
          min={0}
          max={100000}
          step={5}
          defaultValue={data}
          precision={2}
          decimalSeparator=","
          style={{ width: '100%' }}
          onChange={(value?: string | number) => {
            record.serviceFeeToClub = value as number;
            const mobxResult = getMobxResult(record);
            mobxResult?.setNumberValue('serviceFeeToClub', value as number);
            onValidate(raceWizardModel.raceEvent?.valid ?? false);
          }}
        />
      ),
    },
    {
      title: t('results.ServiceFeeDescription'),
      dataIndex: 'serviceFeeDescription',
      key: 'serviceFeeDescription',
      render: (data, record) => (
        <Input
          key={`serviceFeeDescription#${record.key}`}
          defaultValue={data}
          style={{ width: '100%' }}
          onChange={(e) => {
            record.serviceFeeDescription = e.currentTarget.value;
            const mobxResult = getMobxResult(record);
            mobxResult?.setStringValueOrNull('serviceFeeDescription', e.currentTarget.value);
            onValidate(raceWizardModel.raceEvent?.valid ?? false);
          }}
        />
      ),
    },
  ];

  if (isRelay) {
    columns = [...columns, ...serviceFeeColumns];
  } else {
    const preServiceFeeColumns: ColumnType<IInvoiceRaceResult>[] = [
      {
        title: t('results.OriginalFee'),
        dataIndex: 'originalFee',
        key: 'originalFee',
        render: (data, record) => (
          <InputNumber
            key={`originalFee#${record.key}`}
            min={0}
            max={100000}
            step={5}
            defaultValue={data}
            precision={2}
            decimalSeparator=","
            style={{ width: '100%' }}
            onChange={(value?: string | number) => {
              record.originalFee = value as number | undefined;
              const mobxResult = getMobxResult(record) as IRaceResult | undefined;
              mobxResult?.setNumberValueOrNull('originalFee', value as number | undefined);
              onValidate(raceWizardModel.raceEvent?.valid ?? false);
            }}
          />
        ),
      },
      {
        title: t('results.LateFee'),
        dataIndex: 'lateFee',
        key: 'lateFee',
        render: (data, record) => (
          <InputNumber
            key={`lateFee#${record.key}`}
            min={0}
            max={100000}
            step={5}
            defaultValue={data}
            precision={2}
            decimalSeparator=","
            style={{ width: '100%' }}
            onChange={(value?: string | number) => {
              record.lateFee = value as number | undefined;
              const mobxResult = getMobxResult(record) as IRaceResult | undefined;
              mobxResult?.setNumberValueOrNull('lateFee', value as number | undefined);
              onValidate(raceWizardModel.raceEvent?.valid ?? false);
            }}
          />
        ),
      },
      {
        title: t('results.FeeToClub'),
        dataIndex: 'feeToClub',
        key: 'feeToClub',
        render: (data, record) => (
          <InputNumber
            key={`feeToClub#${record.key}`}
            min={0}
            max={100000}
            step={5}
            defaultValue={data}
            precision={2}
            decimalSeparator=","
            style={{ width: '100%' }}
            onChange={(value?: string | number) => {
              record.feeToClub = value as number | undefined;
              const mobxResult = getMobxResult(record) as IRaceResult | undefined;
              mobxResult?.setNumberValueOrNull('feeToClub', value as number | undefined);
              onValidate(raceWizardModel.raceEvent?.valid ?? false);
            }}
          />
        ),
      },
    ];
    const postServiceFeeColumns: ColumnType<IInvoiceRaceResult>[] = [
      {
        title: t('results.TotalFeeToClub'),
        dataIndex: 'totalFeeToClub',
        key: 'totalFeeToClub',
        render: (_text, record) => (record.feeToClub ?? 0) + record.serviceFeeToClub,
      },
    ];
    columns = [...columns, ...preServiceFeeColumns, ...serviceFeeColumns, ...postServiceFeeColumns];
  }

  return loaded && raceWizardModel.raceEvent && visible ? (
    <Form
      id={formId}
      ref={formRef}
      layout="vertical"
      initialValues={{
        iName: raceWizardModel.raceEvent.name,
        iOrganiserName: raceWizardModel.raceEvent.organiserName,
        iRaceDate: !raceWizardModel.raceEvent.raceDate ? null : moment(raceWizardModel.raceEvent.raceDate, dateFormat),
        iRaceTime: !raceWizardModel.raceEvent.raceTime
          ? null
          : moment(raceWizardModel.raceEvent.raceTime, shortTimeFormat),
      }}
    >
      <Row gutter={8}>
        <Col span={8}>
          <FormItem name="iName" label={t('results.Name')}>
            <Input disabled={true} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="iOrganiserName" label={t('results.Club')}>
            <Input disabled={true} />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem name="iRaceDate" label={t('results.Date')}>
            <DatePicker format={dateFormat} disabled={true} />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem name="iRaceTime" label={t('results.Time')}>
            <TimePicker format={shortTimeFormat} disabled={true} />
          </FormItem>
        </Col>
      </Row>
      {isRelay ? (
        <StyledTable
          columns={columns as ColumnType<any>[]}
          dataSource={raceWizardModel.raceEvent.teamResults.map((result) => ({
            ...getSnapshot(result),
            key: result.teamResultId.toString(),
          }))}
          pagination={{ pageSize: 6 }}
          size="middle"
        />
      ) : (
        <StyledTable
          columns={columns as ColumnType<any>[]}
          dataSource={raceWizardModel.raceEvent.results.map((result) => ({
            ...getSnapshot(result),
            key: result.resultId.toString(),
          }))}
          pagination={{ pageSize: 6 }}
          size="middle"
        />
      )}
    </Form>
  ) : visible ? (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  ) : null;
});

export default InvoiceWizardStep2EditRace;