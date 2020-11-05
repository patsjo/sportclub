import React, { Component } from 'react';
import { Spin, Form, Input, InputNumber, DatePicker, TimePicker, Modal, message, Row, Col } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { observer, inject } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { PostJsonData } from '../../utils/api';
import FormItem from '../formItems/FormItem';
import { dateFormat, shortTimeFormat } from '../../utils/formHelper';
import { FormatTime } from '../../utils/resultHelper';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import moment from 'moment';

const { info } = Modal;
const MakeArray = (object) => (!object ? [] : Array.isArray(object) ? object : [object]);

// @inject("clubModel")
// @observer
const InvoiceWizardStep2EditRace = inject(
  'sessionModel',
  'clubModel',
  'raceWizardModel'
)(
  observer(
    class InvoiceWizardStep2EditRace extends Component {
      static propTypes = {
        visible: PropTypes.string.isRequired,
        onFailed: PropTypes.func.isRequired,
        onValidate: PropTypes.func.isRequired,
      };
      formRef = React.createRef();

      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          eventObject: undefined,
          showStart: false,
          showResult: false,
          isRelay: false,
          formId: 'addMapCompetitor' + Math.floor(Math.random() * 10000000000000000),
        };
      }

      componentDidMount() {
        const self = this;
        const { sessionModel, clubModel, raceWizardModel, onFailed, onValidate } = this.props;

        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;

        PostJsonData(
          url,
          { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
          true,
          sessionModel.authorizationHeader
        )
          .then(async (editResultJson) => {
            editResultJson.invoiceVerified = true;
            raceWizardModel.setValue('raceEvent', editResultJson);
            onValidate(true);
            self.setState({
              loaded: true,
              isRelay: editResultJson.isRelay,
            });
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            onFailed && onFailed();
          });
      }

      setValue(resultObject, fieldName, value) {
        const { raceWizardModel, onValidate } = this.props;
        if (this.state.isRelay) {
          const mobxResult = raceWizardModel.raceEvent.teamResults.find(
            (r) => r.teamResultId === resultObject.teamResultId
          );
          mobxResult.setValue(fieldName, value);
        } else {
          const mobxResult = raceWizardModel.raceEvent.results.find((r) => r.resultId === resultObject.resultId);
          mobxResult.setValue(fieldName, value);
        }
        onValidate(raceWizardModel.raceEvent.valid);
      }

      render() {
        const self = this;
        const { t, raceWizardModel, clubModel, onValidate, visible } = this.props;
        const { formId, isRelay, loaded } = this.state;
        let columns = [
          {
            title: t('results.Competitor'),
            dataIndex: 'competitorId',
            key: 'competitorId',
            render: (id) => clubModel.raceClubs.selectedClub.competitorById(id).fullName,
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

        const serviceFeeColumns = [
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
                onChange={(value) => {
                  record.serviceFeeToClub = value;
                  self.setValue(record, 'serviceFeeToClub', value);
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
                  self.setValue(record, 'serviceFeeDescription', e.currentTarget.value);
                }}
              />
            ),
          },
        ];

        if (isRelay) {
          columns = [...columns, ...serviceFeeColumns];
        } else {
          columns = [
            ...columns,
            ...[
              {
                title: t('results.OriginalFee'),
                dataIndex: 'originalFee',
                key: 'originalFee',
              },
              {
                title: t('results.LateFee'),
                dataIndex: 'lateFee',
                key: 'lateFee',
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
                    onChange={(value) => {
                      record.feeToClub = value;
                      self.setValue(record, 'feeToClub', value);
                    }}
                  />
                ),
              },
              ...serviceFeeColumns,
              {
                title: t('results.TotalFeeToClub'),
                dataIndex: 'totalFeeToClub',
                key: 'totalFeeToClub',
                render: (_text, record) => record.feeToClub + record.serviceFeeToClub,
              },
            ],
          ];
        }

        return loaded && visible ? (
          <Form
            id={formId}
            ref={self.formRef}
            layout="vertical"
            initialValues={{
              iName: raceWizardModel.raceEvent.name,
              iOrganiserName: raceWizardModel.raceEvent.organiserName,
              iRaceDate: !raceWizardModel.raceEvent.raceDate
                ? null
                : moment(raceWizardModel.raceEvent.raceDate, dateFormat),
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
                columns={columns}
                dataSource={raceWizardModel.raceEvent.teamResults.map((result) => ({
                  ...getSnapshot(result),
                  key: result.teamResultId.toString(),
                }))}
                pagination={{ pageSize: 6 }}
                size="middle"
              />
            ) : (
              <StyledTable
                columns={columns}
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
      }
    }
  )
);

const InvoiceWizardStep2EditRaceWithI18n = withTranslation()(InvoiceWizardStep2EditRace); // pass `t` function to App

export default InvoiceWizardStep2EditRaceWithI18n;
