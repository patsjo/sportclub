import { Col, DatePicker, Form, Input, InputNumber, message, Row, Spin, Table, TableProps } from 'antd';
import dayjs from 'dayjs';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IRaceEventBasicProps, IRaceEventProps, IRaceResult, IRaceTeamResult } from '../../models/resultModel';
import { PostJsonData } from '../../utils/api';
import { dateFormat, shortTimeFormat } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { FormatTime } from '../../utils/resultHelper';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import FormItem from '../formItems/FormItem';
import InputTime from '../formItems/InputTime';
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
  height: number;
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed?: (e: unknown) => void;
}
const InvoiceWizardStep2EditRace = observer(
  ({ height, visible, onValidate, onFailed }: IInvoiceWizardStep2EditRaceProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [form] = Form.useForm<IRaceEventBasicProps>();
    const formId = useMemo(() => 'invoiceWizardFormStep2EditRace' + Math.floor(Math.random() * 1000000000000000), []);
    const [loaded, setLoaded] = useState(false);
    const [isRelay, setIsRelay] = useState(false);
    const [totalOriginalFee, setTotalOriginalFee] = useState(0);
    const [totalLateFee, setTotalLateFee] = useState(0);
    const [totalFeeToClub, setTotalFeeToClub] = useState(0);
    const [totalServiceFeeToClub, setTotalServiceFeeToClub] = useState(0);

    const getMobxResult = useCallback(
      (resultObject: IInvoiceRaceResult): IRaceResult | IRaceTeamResult | undefined => {
        if (isRelay) {
          return raceWizardModel.raceEvent?.teamResults.find(r => r.teamResultId === resultObject.teamResultId);
        } else {
          return raceWizardModel.raceEvent?.results.find(r => r.resultId === resultObject.resultId);
        }
      },
      [raceWizardModel, isRelay]
    );

    useEffect(() => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
      if (!url) return;

      PostJsonData<IRaceEventProps>(
        url,
        { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
        true,
        sessionModel.authorizationHeader
      )
        .then(async editResultJson => {
          if (!editResultJson) return;
          editResultJson.invoiceVerified = true;
          raceWizardModel.setRaceEvent(editResultJson);
          onValidate(true);
          setIsRelay(editResultJson.isRelay);
          if (raceWizardModel.raceEvent?.isRelay) {
            setTotalServiceFeeToClub(
              raceWizardModel.raceEvent?.teamResults.reduce((a, b) => {
                return a + (b.serviceFeeToClub ?? 0);
              }, 0)
            );
          } else {
            setTotalOriginalFee(
              raceWizardModel.raceEvent?.results.reduce((a, b) => {
                return a + (b.originalFee ?? 0);
              }, 0) ?? 0
            );
            setTotalLateFee(
              raceWizardModel.raceEvent?.results.reduce((a, b) => {
                return a + (b.lateFee ?? 0);
              }, 0) ?? 0
            );
            setTotalFeeToClub(
              raceWizardModel.raceEvent?.results.reduce((a, b) => {
                return a + (b.feeToClub ?? 0);
              }, 0) ?? 0
            );
            setTotalServiceFeeToClub(
              raceWizardModel.raceEvent?.results.reduce((a, b) => {
                return a + (b.serviceFeeToClub ?? 0);
              }, 0) ?? 0
            );
          }
          setLoaded(true);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          onFailed?.(e);
        });
    }, [clubModel.modules, onFailed, onValidate, raceWizardModel, sessionModel.authorizationHeader]);

    const baseColumns: TableProps<IInvoiceRaceResult>['columns'] = useMemo(
      () => [
        {
          title: t('results.Competitor'),
          dataIndex: 'competitorId',
          key: 'competitorId',
          render: id => clubModel.raceClubs?.selectedClub?.competitorById(id)?.fullName,
          ellipsis: true,
          width: 200,
          fixed: 'left'
        },
        {
          title: t('results.Class'),
          dataIndex: 'className',
          key: 'className',
          ellipsis: true,
          width: 70,
          fixed: 'left'
        },
        {
          title: t('results.FailedReason'),
          dataIndex: 'failedReason',
          key: 'failedReason',
          render: reason => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null),
          ellipsis: true,
          width: 120
        },
        {
          title: t('results.Time'),
          dataIndex: 'competitorTime',
          key: 'competitorTime',
          render: value => FormatTime(value),
          ellipsis: true,
          width: 70
        }
      ],
      [clubModel.raceClubs?.selectedClub, t]
    );

    const serviceFeeColumns: TableProps<IInvoiceRaceResult>['columns'] = useMemo(
      () => [
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
              onChange={(value: number | null) => {
                record.serviceFeeToClub = value as number;
                const mobxResult = getMobxResult(record);
                mobxResult?.setNumberValue('serviceFeeToClub', value as number);
                if (raceWizardModel.raceEvent?.isRelay) {
                  setTotalServiceFeeToClub(
                    raceWizardModel.raceEvent?.teamResults.reduce((a, b) => {
                      return a + (b.serviceFeeToClub ?? 0);
                    }, 0)
                  );
                } else {
                  setTotalServiceFeeToClub(
                    raceWizardModel.raceEvent?.results.reduce((a, b) => {
                      return a + (b.serviceFeeToClub ?? 0);
                    }, 0) ?? 0
                  );
                }
                onValidate(raceWizardModel.raceEvent?.valid ?? false);
              }}
            />
          ),
          ellipsis: true,
          width: 120
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
              onChange={e => {
                record.serviceFeeDescription = e.currentTarget.value;
                const mobxResult = getMobxResult(record);
                mobxResult?.setStringValueOrNull('serviceFeeDescription', e.currentTarget.value);
                onValidate(raceWizardModel.raceEvent?.valid ?? false);
              }}
            />
          ),
          ellipsis: true,
          width: 120
        }
      ],
      [
        getMobxResult,
        onValidate,
        raceWizardModel.raceEvent?.isRelay,
        raceWizardModel.raceEvent?.results,
        raceWizardModel.raceEvent?.teamResults,
        raceWizardModel.raceEvent?.valid,
        t
      ]
    );

    const columns: TableProps<IInvoiceRaceResult>['columns'] = useMemo(
      () =>
        isRelay
          ? [...baseColumns, ...serviceFeeColumns]
          : [
              ...baseColumns,
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
                    onChange={(value: number | null) => {
                      record.originalFee = value;
                      const mobxResult = getMobxResult(record) as IRaceResult | undefined;
                      mobxResult?.setNumberValueOrNull('originalFee', value);
                      setTotalOriginalFee(
                        raceWizardModel.raceEvent?.results.reduce((a, b) => {
                          return a + (b.originalFee ?? 0);
                        }, 0) ?? 0
                      );
                      onValidate(raceWizardModel.raceEvent?.valid ?? false);
                    }}
                  />
                ),
                ellipsis: true,
                width: 120
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
                    onChange={(value: number | null) => {
                      record.lateFee = value;
                      const mobxResult = getMobxResult(record) as IRaceResult | undefined;
                      mobxResult?.setNumberValueOrNull('lateFee', value);
                      setTotalLateFee(
                        raceWizardModel.raceEvent?.results.reduce((a, b) => {
                          return a + (b.lateFee ?? 0);
                        }, 0) ?? 0
                      );
                      onValidate(raceWizardModel.raceEvent?.valid ?? false);
                    }}
                  />
                ),
                ellipsis: true,
                width: 120
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
                    onChange={(value: number | null) => {
                      record.feeToClub = value;
                      const mobxResult = getMobxResult(record) as IRaceResult | undefined;
                      mobxResult?.setNumberValueOrNull('feeToClub', value);
                      setTotalFeeToClub(
                        raceWizardModel.raceEvent?.results.reduce((a, b) => {
                          return a + (b.feeToClub ?? 0);
                        }, 0) ?? 0
                      );
                      onValidate(raceWizardModel.raceEvent?.valid ?? false);
                    }}
                  />
                ),
                ellipsis: true,
                width: 120
              },
              ...serviceFeeColumns,
              {
                title: t('results.TotalFeeToClub'),
                dataIndex: 'totalFeeToClub',
                key: 'totalFeeToClub',
                render: (_text, record) => (record.feeToClub ?? 0) + record.serviceFeeToClub,
                ellipsis: true,
                width: 120
              }
            ],
      [
        baseColumns,
        getMobxResult,
        isRelay,
        onValidate,
        raceWizardModel.raceEvent?.results,
        raceWizardModel.raceEvent?.valid,
        serviceFeeColumns,
        t
      ]
    );

    return loaded && raceWizardModel.raceEvent && visible ? (
      <Form form={form} id={formId} layout="vertical" initialValues={raceWizardModel.raceEvent}>
        <Row gutter={8}>
          <Col span={8}>
            <FormItem name="name" label={t('results.Name')}>
              <Input disabled={true} />
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem name="organiserName" label={t('results.Club')}>
              <Input disabled={true} />
            </FormItem>
          </Col>
          <Col span={4}>
            <FormItem
              name="raceDate"
              label={t('results.Date')}
              normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
              getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
            >
              <DatePicker format={dateFormat} disabled={true} />
            </FormItem>
          </Col>
          <Col span={4}>
            <FormItem name="raceTime" label={t('results.Time')}>
              <InputTime format={shortTimeFormat} disabled={true} />
            </FormItem>
          </Col>
        </Row>
        {isRelay ? (
          <StyledTable
            columns={columns}
            dataSource={raceWizardModel.raceEvent.teamResults.map(
              (result): IInvoiceRaceResult => ({
                ...toJS(result),
                key: result.teamResultId.toString(),
                serviceFeeToClub: result.serviceFeeToClub ?? 0
              })
            )}
            pagination={{ pageSize: Math.trunc((height - 186) / 42), hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: true }}
            size="middle"
            tableLayout="fixed"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4}>{totalServiceFeeToClub}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        ) : (
          <StyledTable
            columns={columns}
            dataSource={raceWizardModel.raceEvent.results.map(
              (result): IInvoiceRaceResult => ({
                ...toJS(result),
                key: result.resultId.toString(),
                serviceFeeToClub: result.serviceFeeToClub ?? 0
              })
            )}
            pagination={{ pageSize: Math.trunc((height - 186) / 42), hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: true }}
            size="middle"
            tableLayout="fixed"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4}>{totalOriginalFee}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>{totalLateFee}</Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>{totalFeeToClub}</Table.Summary.Cell>
                  <Table.Summary.Cell index={7}>{totalServiceFeeToClub}</Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9}>{totalFeeToClub + totalServiceFeeToClub}</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Form>
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  }
);

export default InvoiceWizardStep2EditRace;
