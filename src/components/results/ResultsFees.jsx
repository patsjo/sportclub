import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Spin, Form, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { withTranslation } from 'react-i18next';
import moment from 'moment';
import { PostJsonData } from '../../utils/api';
import { FormSelect } from '../../utils/formHelper';
import { getPdf } from '../../utils/pdf';
import FormItem from '../formItems/FormItem';
import TablePrintSettingButtons from '../tableSettings/TablePrintSettingButtons';
import styled from 'styled-components';

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

const columns = (t, clubModel) => [
  {
    title: t('results.Competitor'),
    selected: true,
    dataIndex: 'competitorId',
    key: 'competitorId',
    fixed: 'left',
    width: 180,
    render: (id) => (id == null ? null : clubModel.raceClubs.selectedClub.competitorById(id).fullName),
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
    render: (_text, record) => record.feeToClub + record.serviceFeeToClub,
  },
];

const ResultsFees = inject(
  'clubModel',
  'sessionModel'
)(
  observer(
    class ResultsFees extends Component {
      constructor(props) {
        super(props);
        this.state = {
          fees: [],
          result: undefined,
          year: new Date().getFullYear(),
          competitorId: undefined,
          loading: true,
          formId: 'resultsFeesForm' + Math.floor(Math.random() * 10000000000000000),
          columnsSetting: [],
        };
      }

      componentDidMount() {
        const self = this;
        const { clubModel, sessionModel } = this.props;
        const { year } = this.state;
        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;

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
            self.updateEventYear(year);
          })
          .catch((e) => {
            message.error(e.message);
          });
      }

      updateEventYear(year) {
        const self = this;
        const { clubModel, sessionModel } = this.props;
        const fromDate = moment(year, 'YYYY').format('YYYY-MM-DD');
        const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');

        self.setState({
          loading: true,
        });

        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
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
          .then((feesJson) => {
            self.setState({
              fees: feesJson,
              result: undefined,
              loading: false,
            });
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            self.setState({
              fees: [],
              result: undefined,
              loading: false,
            });
          });
      }

      getPrintObject(settings, t, clubModel, year, fees) {
        const header = `${t('results.FeeToClub')} ${year}`;
        const inputs = [];
        const tables = [];

        if (fees && fees.length) {
          tables.push({
            columns: columns(t, clubModel).filter((col) =>
              settings.pdf.columns.some((s) => col.key === s.key && s.selected)
            ),
            dataSource: fees,
          });
        }

        return { header, inputs, tables };
      }

      onPrint(settings) {
        const self = this;
        const { t, clubModel } = self.props;
        const { year, fees } = self.state;

        return new Promise((resolve, reject) => {
          const printObject = self.getPrintObject(settings, t, clubModel, year, fees);
          getPdf(clubModel.corsProxy, clubModel.logo.url, printObject.header, [printObject], settings.pdf)
            .then(resolve)
            .catch((e) => {
              if (e && e.message) {
                message.error(e.message);
              }
              reject();
            });
        });
      }

      render() {
        const self = this;
        const { t, clubModel } = self.props;
        const { loading, year, fees, columnsSetting } = self.state;
        const Spinner = (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
        const fromYear = 1994;
        const currentYear = new Date().getFullYear();
        const yearOptions = [...Array(1 + currentYear - fromYear).keys()].map((i) => ({
          code: currentYear - i,
          description: currentYear - i,
        }));

        return (
          <Form
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
                    onChange={(value) => self.updateEventYear(value)}
                  />
                </FormItem>
              </Col>
              <Col>
                <TablePrintSettingButtons
                  localStorageName="resultFees"
                  columns={columns(t, clubModel)}
                  disablePrint={loading || !fees || fees.length === 0}
                  disablePrintAll={true}
                  onPrint={self.onPrint.bind(self)}
                  onTableColumns={(newColumnsSetting) =>
                    self.setState({
                      columnsSetting: newColumnsSetting,
                    })
                  }
                />
              </Col>
            </StyledRow>
            {!loading ? (
              <StyledTable
                columns={columns(t, clubModel).filter((col) =>
                  columnsSetting.some((s) => col.key === s.key && s.selected)
                )}
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
      }
    }
  )
);

const ResultsFeesWithI18n = withTranslation()(ResultsFees); // pass `t` function to App

export default ResultsFeesWithI18n;
