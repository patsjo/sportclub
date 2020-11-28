import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Spin, Form, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { withTranslation } from 'react-i18next';
import moment from 'moment';
import { PostJsonData } from '../../utils/api';
import { FormSelect } from '../../utils/formHelper';
import { getPdf, getZip } from '../../utils/pdf';
import FormItem from '../formItems/FormItem';
import { FormatTime } from '../../utils/resultHelper';
import { failedReasons, raceDistanceOptions, raceLightConditionOptions } from '../../utils/resultConstants';
import TablePrintSettingButtons from '../tableSettings/TablePrintSettingButtons';
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

const columns = (t, clubModel, isIndividual) =>
  [
    isIndividual !== false
      ? {
          title: t('results.Date'),
          selected: true,
          dataIndex: 'raceDate',
          key: 'raceDate',
          fixed: 'left',
          width: 90,
        }
      : null,
    isIndividual !== false
      ? {
          title: t('results.Name'),
          selected: true,
          dataIndex: 'name',
          key: 'name',
          fixed: 'left',
          width: 180,
          render: (id) => (id == null ? null : id),
        }
      : null,
    isIndividual !== false
      ? {
          title: t('results.Club'),
          selected: false,
          dataIndex: 'organiserName',
          key: 'organiserName',
          fixed: 'left',
          width: 180,
          render: (id) => (id == null ? null : id),
        }
      : null,
    isIndividual !== true
      ? {
          title: t('results.Competitor'),
          selected: true,
          dataIndex: 'competitorId',
          key: 'competitorId',
          fixed: 'left',
          width: 180,
          render: (id) => (id == null ? null : clubModel.raceClubs.selectedClub.competitorById(id).fullName),
        }
      : null,
    {
      title: t('results.Sport'),
      selected: false,
      dataIndex: 'sportCode',
      key: 'sportCode',
    },
    {
      title: t('results.EventClassification'),
      selected: false,
      dataIndex: 'eventClassificationId',
      key: 'eventClassificationId',
      render: (value, record) =>
        clubModel.raceClubs.eventClassifications.find(
          (ec) =>
            ec.eventClassificationId ===
            (record.deviantEventClassificationId ? record.deviantEventClassificationId : value)
        ).description,
    },
    {
      title: t('results.Class'),
      selected: true,
      dataIndex: 'className',
      key: 'className',
    },
    {
      title: t('results.Difficulty'),
      selected: false,
      dataIndex: 'difficulty',
      key: 'difficulty',
    },
    {
      title: t('results.LengthInMeter'),
      selected: true,
      dataIndex: 'lengthInMeter',
      key: 'lengthInMeter',
    },
    {
      title: t('results.Time'),
      selected: true,
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
      selected: true,
      dataIndex: 'winnerTime',
      key: 'winnerTime',
      render: (value) => FormatTime(value),
    },
    {
      title: t('results.SecondTime'),
      selected: false,
      dataIndex: 'secondTime',
      key: 'secondTime',
      render: (value) => (value ? FormatTime(value) : ''),
    },
    {
      title: t('results.Position'),
      selected: true,
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: t('results.NofStartsInClass'),
      selected: true,
      dataIndex: 'nofStartsInClass',
      key: 'nofStartsInClass',
    },
    {
      title: t('results.RankingLeague'),
      selected: true,
      dataIndex: 'ranking',
      key: 'ranking',
    },
    {
      title: t('results.Points1000League'),
      selected: true,
      dataIndex: 'points1000',
      key: 'points1000',
    },
  ].filter((col) => col);

const resultsColumns = (t, clubModel) => [
  {
    title: t('results.PointsLeague'),
    selected: true,
    dataIndex: 'points',
    key: 'points',
  },
  {
    title: t('results.PointsOldLeague'),
    selected: false,
    dataIndex: 'pointsOld',
    key: 'pointsOld',
  },
  {
    title: t('results.Award'),
    selected: true,
    dataIndex: 'award',
    key: 'award',
  },
  {
    title: t('results.RaceLightCondition'),
    selected: false,
    dataIndex: 'raceLightCondition',
    key: 'raceLightCondition',
    render: (value, record) =>
      raceLightConditionOptions(t).find(
        (opt) => opt.code === (record.deviantRaceLightCondition ? record.deviantRaceLightCondition : value)
      ).description,
  },
  {
    title: t('results.OriginalFee'),
    selected: false,
    dataIndex: 'originalFee',
    key: 'originalFee',
  },
  {
    title: t('results.LateFee'),
    selected: false,
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
    title: t('calendar.Description'),
    selected: true,
    dataIndex: 'serviceFeeDescription',
    key: 'serviceFeeDescription',
  },
  {
    title: t('results.TotalFeeToClub'),
    selected: true,
    dataIndex: 'totalFeeToClub',
    key: 'totalFeeToClub',
    render: (_text, record) => record.feeToClub + record.serviceFeeToClub,
  },
];

const teamResultsColumns = (t, clubModel) => [
  {
    title: t('results.Stage'),
    selected: true,
    dataIndex: 'stage',
    key: 'stage',
    render: (value, record) =>
      record.stage == null || record.totalStages == null
        ? null
        : `${record.stage} ${t('common.Of')} ${record.totalStages}`,
  },
  {
    title: t('results.DeltaPositions'),
    selected: true,
    dataIndex: 'deltaPositions',
    key: 'deltaPositions',
  },
  {
    title: t('results.DeltaTimeBehind'),
    selected: true,
    dataIndex: 'deltaTimeBehind',
    key: 'deltaTimeBehind',
    render: (value) => FormatTime(value),
  },
  {
    title: t('results.RaceLightCondition'),
    selected: false,
    dataIndex: 'raceLightCondition',
    key: 'raceLightCondition',
    render: (value, record) =>
      raceLightConditionOptions(t).find(
        (opt) => opt.code === (record.deviantRaceLightCondition ? record.deviantRaceLightCondition : value)
      ).description,
  },
  {
    title: t('results.ServiceFeeToClub'),
    selected: true,
    dataIndex: 'serviceFeeToClub',
    key: 'serviceFeeToClub',
  },
  {
    title: t('results.ServiceFeeDescription'),
    selected: true,
    dataIndex: 'serviceFeeDescription',
    key: 'serviceFeeDescription',
  },
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
          columnsSetting: [],
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
          year: year,
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

      getPrintObject(settings, t, clubModel, isIndividual, year, competitorId, result) {
        const header = isIndividual
          ? `${t('modules.Results')} - ${
              clubModel.raceClubs.selectedClub.competitorById(competitorId).fullName
            } ${year}`
          : `${t('modules.Results')} - ${result.raceDate} ${result.name}`;
        const inputs = [];
        const tables = [];

        if (isIndividual) {
          inputs.push({
            label: t('results.TotalFeeToClub'),
            value:
              (result.results
                ? result.results.reduce((sum, obj) => (sum += obj.feeToClub + obj.serviceFeeToClub), 0)
                : 0) +
              (result.teamResults ? result.teamResults.reduce((sum, obj) => (sum += obj.serviceFeeToClub), 0) : 0),
          });
        } else {
          inputs.push({ label: t('results.Club'), value: result.organiserName });
          inputs.push({
            label: t('results.RaceLightCondition'),
            value: raceLightConditionOptions(t).find((opt) => opt.code === result.raceLightCondition).description,
          });
          inputs.push({
            label: t('results.RaceDistance'),
            value: raceDistanceOptions(t).find((opt) => opt.code === result.raceDistance).description,
          });
          inputs.push({
            label: t('results.EventClassification'),
            value: clubModel.raceClubs.eventClassificationOptions.find(
              (opt) => opt.code === result.eventClassificationId
            ).description,
          });
          inputs.push({
            label: t('results.Sport'),
            value: clubModel.raceClubs.sportOptions.find((opt) => opt.code === result.sportCode).description,
          });
        }
        const nofStarts =
          (result.results
            ? result.results.reduce((sum, obj) => (sum += obj.failedReason !== failedReasons.NotStarted ? 1 : 0), 0)
            : 0) +
          (result.teamResults
            ? result.teamResults.reduce((sum, obj) => (sum += obj.failedReason !== failedReasons.NotStarted ? 1 : 0), 0)
            : 0);
        inputs.push({
          label: t('results.TotalNofStarts'),
          value: nofStarts,
        });

        if (result && result.results.length) {
          tables.push({
            columns: [...columns(t, clubModel, isIndividual), ...resultsColumns(t, clubModel)].filter((col) =>
              settings.pdf.columns.some((s) => col.key === s.key && s.selected)
            ),
            dataSource: result.results,
          });
        }
        if (result && result.teamResults.length) {
          tables.push({
            columns: [...columns(t, clubModel, isIndividual), ...teamResultsColumns(t, clubModel)].filter((col) =>
              settings.pdf.columns.some((s) => col.key === s.key && s.selected)
            ),
            dataSource: result.teamResults,
          });
        }

        return { header, inputs, tables };
      }

      onPrint(settings) {
        const self = this;
        const { t, clubModel, isIndividual } = self.props;
        const { year, competitorId, result } = self.state;

        return new Promise((resolve, reject) => {
          const printObject = self.getPrintObject(settings, t, clubModel, isIndividual, year, competitorId, result);
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

      onPrintAll(settings, allInOnePdf) {
        const self = this;
        const { t, clubModel, sessionModel, isIndividual } = self.props;
        const { year, events } = self.state;
        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
        let resultPromisies = [];
        let competitorsOptions = [];

        if (isIndividual) {
          const fromDate = moment(year, 'YYYY').format('YYYY-MM-DD');
          const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');
          competitorsOptions = clubModel.raceClubs.selectedClub.competitorsOptions;

          resultPromisies = competitorsOptions.map((option) =>
            PostJsonData(
              url,
              { iType: 'COMPETITOR', iFromDate: fromDate, iToDate: toDate, iCompetitorId: option.code },
              true,
              sessionModel.authorizationHeader
            )
          );
        } else {
          resultPromisies = events
            .slice()
            .reverse()
            .map((event) =>
              PostJsonData(url, { iType: 'EVENT', iEventId: event.eventId }, true, sessionModel.authorizationHeader)
            );
        }

        return new Promise((resolve, reject) => {
          Promise.all(resultPromisies)
            .then((resultJsons) => {
              const printObjects = resultJsons
                .map((result, index) => {
                  const competitorId = isIndividual ? competitorsOptions[index].code : undefined;
                  return result && (result.results.length || result.teamResults.length)
                    ? self.getPrintObject(settings, t, clubModel, isIndividual, year, competitorId, result)
                    : undefined;
                })
                .filter((promise) => promise !== undefined);

              if (allInOnePdf) {
                getPdf(
                  clubModel.corsProxy,
                  clubModel.logo.url,
                  `${t(isIndividual ? 'results.Individual' : 'results.Latest')} ${year}`,
                  printObjects,
                  settings.pdf
                )
                  .then(resolve)
                  .catch((e) => {
                    if (e && e.message) {
                      message.error(e.message);
                    }
                    reject();
                  });
              } else {
                getZip(
                  clubModel.corsProxy,
                  clubModel.logo.url,
                  `${t(isIndividual ? 'results.Individual' : 'results.Latest')} ${year}`,
                  printObjects,
                  settings.pdf
                )
                  .then(resolve)
                  .catch((e) => {
                    if (e && e.message) {
                      message.error(e.message);
                    }
                    reject();
                  });
              }
            })
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
        const { t, clubModel, isIndividual } = self.props;
        const { loading, year, competitorId, result, events, columnsSetting } = self.state;
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
        const eventOptions = events.map((option) => ({
          code: option.eventId,
          description: `${option.date}, ${option.name}`,
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
                    style={{ width: 80 }}
                    options={yearOptions}
                    onChange={(value) =>
                      isIndividual ? self.updateCompetitor(value, competitorId) : self.updateEventYear(value)
                    }
                  />
                </FormItem>
              </Col>
              <Col style={{ width: 'calc(100% - 252px)' }}>
                {isIndividual ? (
                  <FormItem name="Competitor" label={t('results.Competitor')}>
                    <FormSelect
                      disabled={loading}
                      style={{ maxWidth: 600, width: '100%' }}
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
                      style={{ maxWidth: 600, width: '100%' }}
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
              <Col>
                <TablePrintSettingButtons
                  localStorageName="results"
                  columns={[
                    ...columns(t, clubModel),
                    ...resultsColumns(t, clubModel),
                    ...teamResultsColumns(t, clubModel),
                  ].filter((col, idx, arr) => arr.findIndex((c) => c.key === col.key) === idx)}
                  disablePrint={loading || !result}
                  disablePrintAll={loading}
                  onPrint={self.onPrint.bind(self)}
                  onPrintAll={self.onPrintAll.bind(self)}
                  onTableColumns={(newColumnsSetting) =>
                    self.setState({
                      columnsSetting: newColumnsSetting,
                    })
                  }
                />
              </Col>
            </StyledRow>
            {!loading && competitorId && result && isIndividual ? (
              <StyledTable2>
                <tr>
                  <td>
                    <b>{t('results.Competitor')}:</b>
                  </td>
                  <td>{clubModel.raceClubs.selectedClub.competitorById(competitorId).fullName}</td>
                  <td>
                    <b>{t('calendar.Year')}:</b>
                  </td>
                  <td>{year}</td>
                </tr>
                <tr>
                  <td>
                    <b>{t('results.TotalFeeToClub')}:</b>
                  </td>
                  <td>
                    {(result.results
                      ? result.results.reduce((sum, obj) => (sum += obj.feeToClub + obj.serviceFeeToClub), 0)
                      : 0) +
                      (result.teamResults
                        ? result.teamResults.reduce((sum, obj) => (sum += obj.serviceFeeToClub), 0)
                        : 0)}
                  </td>
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
                columns={[...columns(t, clubModel, isIndividual), ...resultsColumns(t, clubModel)].filter((col) =>
                  columnsSetting.some((s) => col.key === s.key && s.selected)
                )}
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
                columns={[...columns(t, clubModel, isIndividual), ...teamResultsColumns(t, clubModel)].filter((col) =>
                  columnsSetting.some((s) => col.key === s.key && s.selected)
                )}
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
