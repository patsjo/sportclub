import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Spin, Form, Row, Col, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { withTranslation } from 'react-i18next';
import moment from 'moment';
import { PostJsonData } from '../../utils/api';
import { FormSelect } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import { FormatTime } from '../../utils/resultHelper';
import { raceDistanceOptions, raceLightConditionOptions } from '../../utils/resultConstants';
import styled from 'styled-components';

const StyledRow = styled(Row)`
  &&& {
    margin-left: 5px !important;
  }
`;

const columns = (t, clubModel) => [
  {
    title: t('results.Competitor'),
    dataIndex: 'competitorId',
    key: 'competitorId',
    fixed: 'left',
    width: 180,
    render: (id) => (id == null ? null : clubModel.raceClubs.selectedClub.competitorById(id).fullName),
  },
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
  },
  {
    title: t('results.ServiceFeeToClub'),
    dataIndex: 'serviceFeeToClub',
    key: 'serviceFeeToClub',
  },
  {
    title: t('results.TotalFeeToClub'),
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

      render() {
        const self = this;
        const { t, clubModel, isIndividual } = self.props;
        const { loading, year, competitorId, result, fees } = self.state;
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
            <StyledRow gutter={8}>
              <Col span={4}>
                <FormItem name="Year" label={t('calendar.SelectYear')}>
                  <FormSelect
                    disabled={loading}
                    style={{ minWidth: 70, maxWidth: 300, width: '100%' }}
                    options={yearOptions}
                    onChange={(value) =>
                      isIndividual ? self.updateCompetitor(value, competitorId) : self.updateEventYear(value)
                    }
                  />
                </FormItem>
              </Col>
            </StyledRow>
            {!loading ? (
              <StyledTable
                columns={columns(t, clubModel)}
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
