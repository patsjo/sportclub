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

const StyledTable2 = styled.table`
  &&& {
    margin-top: 8px;
    margin-left: 8px;
  }
  &&& tr td {
    padding-right: 20px;
  }
`;

const StyledRow = styled(Row)`
  &&& {
    margin-left: 5px !important;
  }
`;

const columns = (t, clubModel, isIndividual) =>
  [
    isIndividual
      ? {
          title: t('results.Date'),
          dataIndex: 'raceDate',
          key: 'raceDate',
          fixed: 'left',
          width: 90,
        }
      : null,
    {
      title: isIndividual ? t('results.Name') : t('results.Competitor'),
      dataIndex: isIndividual ? 'name' : 'competitorId',
      key: isIndividual ? 'name' : 'competitorId',
      fixed: 'left',
      width: 180,
      render: (id) =>
        id == null ? null : isIndividual ? id : clubModel.raceClubs.selectedClub.competitorById(id).fullName,
    },
    {
      title: t('results.Class'),
      dataIndex: 'className',
      key: 'className',
      fixed: isIndividual ? undefined : 'left',
      width: isIndividual ? undefined : 75,
    },
    {
      title: t('results.LengthInMeter'),
      dataIndex: 'lengthInMeter',
      key: 'lengthInMeter',
    },
    {
      title: t('results.Time'),
      dataIndex: 'competitorTime',
      key: 'competitorTime',
      render: (value, record) =>
        record.failedReason != null
          ? record.failedReason.charAt(0).toUpperCase() + record.failedReason.substr(1).toLowerCase()
          : record.failedReason == null && value == null
          ? null
          : FormatTime(value),
    },
    {
      title: t('results.WinnerTime'),
      dataIndex: 'winnerTime',
      key: 'winnerTime',
      render: (value) => FormatTime(value),
    },
    {
      title: t('results.Position'),
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: t('results.NofStartsInClass'),
      dataIndex: 'nofStartsInClass',
      key: 'nofStartsInClass',
    },
    {
      title: t('results.RankingLeague'),
      dataIndex: 'ranking',
      key: 'ranking',
    },
    {
      title: t('results.Points1000League'),
      dataIndex: 'points1000',
      key: 'points1000',
    },
  ].filter((col) => col);

const resultsColumns = (t, clubModel, isIndividual) => [
  ...columns(t, clubModel, isIndividual),
  ...[
    {
      title: t('results.PointsLeague'),
      dataIndex: 'points',
      key: 'points',
    },
    {
      title: t('results.PointsOldLeague'),
      dataIndex: 'pointsOld',
      key: 'pointsOld',
    },
    {
      title: t('results.Award'),
      dataIndex: 'award',
      key: 'award',
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
      title: t('calendar.Description'),
      dataIndex: 'serviceFeeDescription',
      key: 'serviceFeeDescription',
    },
    {
      title: t('results.TotalFeeToClub'),
      dataIndex: 'totalFeeToClub',
      key: 'totalFeeToClub',
      render: (_text, record) => record.feeToClub + record.serviceFeeToClub,
    },
  ],
];

const teamResultsColumns = (t, clubModel, isIndividual) => [
  ...columns(t, clubModel, isIndividual),
  ...[
    {
      title: t('results.Stage'),
      dataIndex: 'stage',
      key: 'stage',
      render: (value, record) =>
        record.stage == null || record.totalStages == null
          ? null
          : `${record.stage} ${t('common.Of')} ${record.totalStages}`,
    },
    {
      title: t('results.DeltaPositions'),
      dataIndex: 'deltaPositions',
      key: 'deltaPositions',
    },
    {
      title: t('results.DeltaTimeBehind'),
      dataIndex: 'deltaTimeBehind',
      key: 'deltaTimeBehind',
      render: (value) => FormatTime(value),
    },
    {
      title: t('results.DeviantRaceLightCondition'),
      dataIndex: 'deviantRaceLightCondition',
      key: 'deviantRaceLightCondition',
    },
    {
      title: t('results.ServiceFeeToClub'),
      dataIndex: 'serviceFeeToClub',
      key: 'serviceFeeToClub',
    },
    {
      title: t('results.ServiceFeeDescription'),
      dataIndex: 'serviceFeeDescription',
      key: 'serviceFeeDescription',
    },
  ],
];

const ViewResults = inject(
  'clubModel',
  'sessionModel'
)(
  observer(
    class ViewResults extends Component {
      constructor(props) {
        super(props);
        this.state = {
          events: [],
          result: undefined,
          year: new Date().getFullYear(),
          competitorId: undefined,
          loading: true,
          formId: 'viewResultsForm' + Math.floor(Math.random() * 10000000000000000),
        };
      }

      componentDidMount() {
        const self = this;
        const { clubModel, sessionModel, isIndividual } = this.props;
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
            if (isIndividual) {
              self.setState({
                loading: false,
              });
            } else {
              self.updateEventYear(year);
            }
          })
          .catch((e) => {
            message.error(e.message);
          });
      }

      updateEventYear(year) {
        const self = this;
        const { clubModel } = this.props;
        const fromDate = moment(year, 'YYYY').format('YYYY-MM-DD');
        const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');

        self.setState({
          loading: true,
        });

        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
        PostJsonData(
          url,
          {
            iType: 'EVENTS',
            iFromDate: fromDate,
            iToDate: toDate,
          },
          true
        )
          .then((eventsJson) => {
            self.setState({
              events: eventsJson.reverse(),
              result: undefined,
              loading: false,
            });
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            self.setState({
              events: [],
              result: undefined,
              loading: false,
            });
          });
      }

      updateEvent(eventId) {
        const self = this;
        const { clubModel, sessionModel } = this.props;
        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
        self.setState({
          loading: true,
        });

        PostJsonData(url, { iType: 'EVENT', iEventId: eventId }, true, sessionModel.authorizationHeader)
          .then((eventJson) => {
            self.setState({
              result: eventJson,
              loading: false,
            });
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            self.setState({
              result: undefined,
              loading: false,
            });
          });
      }

      updateCompetitor(year, competitorId) {
        const self = this;
        self.setState({
          year: year,
          competitorId: competitorId,
        });
        if (year && competitorId) {
          const { clubModel, sessionModel } = this.props;
          const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
          const fromDate = moment(year, 'YYYY').format('YYYY-MM-DD');
          const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');
          self.setState({
            loading: true,
          });

          PostJsonData(
            url,
            { iType: 'COMPETITOR', iFromDate: fromDate, iToDate: toDate, iCompetitorId: competitorId },
            true,
            sessionModel.authorizationHeader
          )
            .then((competitorJson) => {
              self.setState({
                result: competitorJson,
                loading: false,
              });
            })
            .catch((e) => {
              if (e && e.message) {
                message.error(e.message);
              }
              self.setState({
                result: undefined,
                loading: false,
              });
            });
        }
      }

      render() {
        const self = this;
        const { t, clubModel, isIndividual } = self.props;
        const { loading, year, competitorId, result, events } = self.state;
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
        const eventOptions = events.map((result) => ({
          code: result.eventId,
          description: `${result.date}, ${result.name}`,
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
              <Col span={20}>
                {isIndividual ? (
                  <FormItem name="Competitor" label={t('results.Competitor')}>
                    <FormSelect
                      disabled={loading}
                      style={{ minWidth: 300, maxWidth: 600, width: '100%' }}
                      dropdownMatchSelectWidth={false}
                      options={loading ? [] : clubModel.raceClubs.selectedClub.competitorsOptions}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      onChange={(competitorId) => self.updateCompetitor(year, competitorId)}
                    />
                  </FormItem>
                ) : (
                  <FormItem name="Club" label={t('results.Step1ChooseRace')}>
                    <FormSelect
                      disabled={loading}
                      style={{ minWidth: 300, maxWidth: 600, width: '100%' }}
                      dropdownMatchSelectWidth={false}
                      options={eventOptions}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      onChange={(eventId) => self.updateEvent(eventId)}
                    />
                  </FormItem>
                )}
              </Col>
            </StyledRow>
            {!loading && competitorId && result && isIndividual ? (
              <StyledTable2>
                <tr>
                  <td>
                    <b>{t('results.Competitor')}:</b>
                  </td>
                  <td>
                    {
                      clubModel.raceClubs.selectedClub.competitorsOptions.find((opt) => opt.code === competitorId)
                        .description
                    }
                  </td>
                  <td>
                    <b>{t('calendar.Year')}:</b>
                  </td>
                  <td>{year}</td>
                </tr>
                <tr>
                  <td>
                    <b>{t('results.TotalFeeToClub')}:</b>
                  </td>
                  <td>{result.results.reduce((sum, obj) => (sum += obj.feeToClub + obj.serviceFeeToClub), 0)}</td>
                </tr>
              </StyledTable2>
            ) : null}
            {!loading && result && !isIndividual ? (
              <StyledTable2>
                <tr>
                  <td>
                    <b>{t('results.Club')}:</b>
                  </td>
                  <td>{result.organiserName}</td>
                  <td>
                    <b>{t('results.Name')}:</b>
                  </td>
                  <td>{result.name}</td>
                </tr>
                <tr>
                  <td>
                    <b>{t('results.Date')}:</b>
                  </td>
                  <td>{result.raceDate}</td>
                  <td>
                    <b>{t('results.RaceLightCondition')}:</b>
                  </td>
                  <td>
                    {raceLightConditionOptions(t).find((opt) => opt.code === result.raceLightCondition).description}
                  </td>
                </tr>
                <tr>
                  <td>
                    <b>{t('results.RaceDistance')}:</b>
                  </td>
                  <td>{raceDistanceOptions(t).find((opt) => opt.code === result.raceDistance).description}</td>
                  <td>
                    <b>{t('results.EventClassification')}:</b>
                  </td>
                  <td>
                    {
                      clubModel.raceClubs.eventClassificationOptions.find(
                        (opt) => opt.code === result.eventClassificationId
                      ).description
                    }
                  </td>
                </tr>
                <tr>
                  <td>
                    <b>{t('results.Sport')}:</b>
                  </td>
                  <td>{clubModel.raceClubs.sportOptions.find((opt) => opt.code === result.sportCode).description}</td>
                </tr>
              </StyledTable2>
            ) : null}
            {!loading && result && result.results.length ? (
              <StyledTable
                columns={resultsColumns(t, clubModel, isIndividual)}
                dataSource={result.results}
                size="middle"
                pagination={false}
                scroll={{ x: true }}
              />
            ) : loading ? (
              Spinner
            ) : null}
            {!loading && result && result.teamResults.length ? (
              <StyledTable
                columns={teamResultsColumns(t, clubModel, isIndividual)}
                dataSource={result.teamResults}
                size="middle"
                pagination={false}
                scroll={{ x: true }}
              />
            ) : null}
          </Form>
        );
      }
    }
  )
);

const ViewResultsWithI18n = withTranslation()(ViewResults); // pass `t` function to App

export default ViewResultsWithI18n;
