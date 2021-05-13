import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Spin, Select, Tabs, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import { withTranslation } from 'react-i18next';
import moment from 'moment';
import { PostJsonData } from '../../utils/api';
import { genders } from '../../utils/resultConstants';
import styled from 'styled-components';

const { TabPane } = Tabs;
const { Option } = Select;
const StyledSelect = styled(Select)`
  &&& {
    width: 120px;
  }
`;
const GenderSelect = styled(Select)`
  &&& {
    width: 72px;
    margin-right: 8px;
  }
`;

const getColumns = (t, nofPoints, isTotal = false) => [
  {
    title: t('results.Position'),
    dataIndex: 'position',
    key: 'position',
    fixed: 'left',
    width: 80,
  },
  {
    title: t('results.Competitor'),
    dataIndex: 'name',
    key: 'name',
    fixed: 'left',
    width: 200,
  },
  ...[...Array(nofPoints).keys()].map((i) => ({
    title: isTotal
      ? t(
          `results.${
            i === 0
              ? 'RankingLeague'
              : i === 1
              ? 'RankingRelayLeague'
              : i === 2
              ? 'RankingSpeedLeague'
              : i === 3
              ? 'RankingTechnicalLeague'
              : i === 4
              ? 'Points1000League'
              : 'PointsLeague'
          }`
        )
      : (i + 1).toString(),
    dataIndex: `p${i}`,
    key: `p${i}`,
  })),
  {
    title: t('results.Total'),
    dataIndex: 'total',
    key: 'total',
    fixed: 'right',
    width: 80,
  },
];

const League = inject('clubModel')(
  observer(
    class League extends Component {
      constructor(props) {
        super(props);
        this.state = {
          year: -1,
          gender: undefined,
          grandSlam: [],
          rankingLeague: [],
          rankingRelayLeague: [],
          rankingSpeedLeague: [],
          rankingTechnicalLeague: [],
          points1000League: [],
          pointsLeague: [],
          pointsOldLeague: [],
          loading: true,
        };
      }

      componentDidMount() {
        this.update(-1, undefined);
      }

      update(year, gender) {
        const self = this;
        const { clubModel } = this.props;
        const league = clubModel.modules.find((module) => module.name === 'Results').league;
        const searchYear = year === -1 ? parseInt(moment().format('YYYY')) : year;
        const fromDate = moment(searchYear, 'YYYY').format('YYYY-MM-DD');
        const toDate =
          year === -1
            ? moment().format('YYYY-MM-DD')
            : moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');
        const rankingFromDate =
          year === -1
            ? moment(toDate, 'YYYY-MM-DD').add(1, 'days').subtract(1, 'years').format('YYYY-MM-DD')
            : fromDate;

        self.setState({
          loading: true,
        });

        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
        const rankingPromise =
          year === -1
            ? PostJsonData(
                url,
                {
                  iType: 'POINTS',
                  iFromDate: rankingFromDate,
                  iToDate: toDate,
                },
                true
              )
            : new Promise((resolve) => resolve(undefined));
        const pointsPromise = PostJsonData(
          url,
          {
            iType: 'POINTS',
            iFromDate: fromDate,
            iToDate: toDate,
          },
          true
        );

        Promise.all([rankingPromise, pointsPromise])
          .then(async ([rankingJson, pointsJson]) => {
            if (rankingJson === undefined) {
              rankingJson = pointsJson;
            }

            let prevRanking = [];
            let prevPos = 1;
            const rankingLeague = rankingJson
              .filter(
                (c) =>
                  c.ranking.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.rankingLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.rankingLeagueAgeLimit)
              )
              .map((c) => {
                const ranking = c.ranking.slice(0, 6);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  ranking: ranking,
                  total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100,
                };
              })
              .sort((a, b) => (a.total > b.total ? 1 : -1))
              .map((c, i) => {
                if (JSON.stringify(prevRanking) !== JSON.stringify(c.ranking)) {
                  prevPos = i + 1;
                }
                prevRanking = c.ranking;
                return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            prevRanking = [];
            prevPos = 1;
            const rankingRelayLeague = rankingJson
              .filter(
                (c) =>
                  c.rankingRelay.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.rankingRelayLeagueAgeLimit === 0 ||
                    searchYear - c.birthYear >= league.rankingRelayLeagueAgeLimit)
              )
              .map((c) => {
                const ranking = c.rankingRelay.slice(0, 3);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  ranking: ranking,
                  total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100,
                };
              })
              .sort((a, b) => (a.total > b.total ? 1 : -1))
              .map((c, i) => {
                if (JSON.stringify(prevRanking) !== JSON.stringify(c.ranking)) {
                  prevPos = i + 1;
                }
                prevRanking = c.ranking;
                return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            prevRanking = [];
            prevPos = 1;
            const rankingSpeedLeague = rankingJson
              .filter(
                (c) =>
                  c.speedRanking.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.rankingLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.rankingLeagueAgeLimit)
              )
              .map((c) => {
                const ranking = c.speedRanking.slice(0, 6);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  ranking: ranking,
                  total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100,
                };
              })
              .sort((a, b) => (a.total > b.total ? 1 : -1))
              .map((c, i) => {
                if (JSON.stringify(prevRanking) !== JSON.stringify(c.ranking)) {
                  prevPos = i + 1;
                }
                prevRanking = c.ranking;
                return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            prevRanking = [];
            prevPos = 1;
            const rankingTechnicalLeague = rankingJson
              .filter(
                (c) =>
                  c.technicalRanking.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.rankingLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.rankingLeagueAgeLimit)
              )
              .map((c) => {
                const ranking = c.technicalRanking.slice(0, 6);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  ranking: ranking,
                  total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100,
                };
              })
              .sort((a, b) => (a.total > b.total ? 1 : -1))
              .map((c, i) => {
                if (JSON.stringify(prevRanking) !== JSON.stringify(c.ranking)) {
                  prevPos = i + 1;
                }
                prevRanking = c.ranking;
                return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            let prevPoints = [];
            prevPos = 1;
            let prevNumberOf100 = -1;
            const points1000League = pointsJson
              .filter(
                (c) =>
                  c.points1000.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.points1000LeagueAgeLimit === 0 || searchYear - c.birthYear >= league.points1000LeagueAgeLimit)
              )
              .map((c) => {
                const numberOf100 = c.points1000.filter((p) => p === 100).length;
                const points1000 = c.points1000.slice(0, 10);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  numberOf100: numberOf100,
                  points1000: points1000,
                  total: points1000.reduce((a, b) => a + b, 0),
                };
              })
              .sort((a, b) =>
                a.total === b.total ? (a.numberOf100 > b.numberOf100 ? -1 : 1) : a.total > b.total ? -1 : 1
              )
              .map((c, i) => {
                if (prevNumberOf100 !== c.numberOf100 || JSON.stringify(prevPoints) !== JSON.stringify(c.points1000)) {
                  prevPos = i + 1;
                }
                prevNumberOf100 = c.numberOf100;
                prevPoints = c.points1000;
                return { ...c, position: prevPos, ...c.points1000.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            prevPoints = [];
            prevPos = 1;
            const pointsLeague = pointsJson
              .filter(
                (c) =>
                  c.points.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.pointsLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.pointsLeagueAgeLimit)
              )
              .map((c) => {
                const points = c.points.slice(0, 10);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  points: points,
                  total: points.reduce((a, b) => a + b, 0),
                };
              })
              .sort((a, b) => (a.total > b.total ? -1 : 1))
              .map((c, i) => {
                if (JSON.stringify(prevPoints) !== JSON.stringify(c.points)) {
                  prevPos = i + 1;
                }
                prevPoints = c.points;
                return { ...c, position: prevPos, ...c.points.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            prevPoints = [];
            prevPos = 1;
            const pointsOldLeague = pointsJson
              .filter(
                (c) =>
                  c.pointsOld.length > 0 &&
                  (!gender || gender === c.gender) &&
                  (league.pointsLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.pointsLeagueAgeLimit)
              )
              .map((c) => {
                const pointsOld = c.pointsOld.slice(0, 10);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  pointsOld: pointsOld,
                  total: pointsOld.reduce((a, b) => a + b, 0),
                };
              })
              .sort((a, b) => (a.total > b.total ? -1 : 1))
              .map((c, i) => {
                if (JSON.stringify(prevPoints) !== JSON.stringify(c.pointsOld)) {
                  prevPos = i + 1;
                }
                prevPoints = c.pointsOld;
                return { ...c, position: prevPos, ...c.pointsOld.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
              });

            rankingJson
              .filter(
                (c) =>
                  (c.ranking.length > 0 ||
                    c.rankingRelay.length > 0 ||
                    c.speedRanking.length > 0 ||
                    c.technicalRanking.length > 0) &&
                  (!gender || gender === c.gender) &&
                  (league.rankingLeagueAgeLimit === 0 ||
                    searchYear - c.birthYear >= league.rankingLeagueAgeLimit ||
                    league.rankingRelayLeagueAgeLimit === 0 ||
                    searchYear - c.birthYear >= league.rankingRelayLeagueAgeLimit)
              )
              .forEach((c) => {
                const c1 = pointsJson.find((cc) => cc.competitorId === c.competitorId);
                if (c1 === undefined) {
                  pointsJson.push({ ...c, points1000: [], points: [], pointsOld: [] });
                }
              });

            prevPoints = [];
            prevPos = 1;
            const grandSlam = pointsJson
              .filter(
                (c) =>
                  (!gender || gender === c.gender) &&
                  (league.grandSlamAgeLimit === 0 || searchYear - c.birthYear >= league.grandSlamAgeLimit)
              )
              .map((c) => {
                const c1 = rankingLeague.find((cc) => cc.competitorId === c.competitorId);
                const pos1 = c1 !== undefined ? c1.position : rankingLeague.length + 1;
                const c2 = rankingRelayLeague.find((cc) => cc.competitorId === c.competitorId);
                const pos2 = c2 !== undefined ? c2.position : rankingRelayLeague.length + 1;
                const c3 = rankingSpeedLeague.find((cc) => cc.competitorId === c.competitorId);
                const pos3 = c3 !== undefined ? c3.position : rankingSpeedLeague.length + 1;
                const c4 = rankingTechnicalLeague.find((cc) => cc.competitorId === c.competitorId);
                const pos4 = c4 !== undefined ? c4.position : rankingTechnicalLeague.length + 1;
                const c5 = points1000League.find((cc) => cc.competitorId === c.competitorId);
                const pos5 = c5 !== undefined ? c5.position : points1000League.length + 1;
                let pos6;
                if (year > 1900 && year < 2003) {
                  const c6 = pointsOldLeague.find((cc) => cc.competitorId === c.competitorId);
                  pos6 = c6 !== undefined ? c6.position : pointsOldLeague.length + 1;
                } else {
                  const c6 = pointsLeague.find((cc) => cc.competitorId === c.competitorId);
                  pos6 = c6 !== undefined ? c6.position : pointsLeague.length + 1;
                }
                const positions = [pos1, pos2, pos3, pos4, pos5, pos6];

                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  p0: pos1,
                  p1: pos2,
                  p2: pos3,
                  p3: pos4,
                  p4: pos5,
                  p5: pos6,
                  total: positions.reduce((a, b) => a + b, 0),
                  positions: positions,
                };
              })
              .sort((a, b) => (a.total > b.total ? 1 : -1))
              .map((c, i) => {
                if (JSON.stringify(prevPoints) !== JSON.stringify(c.positions)) {
                  prevPos = i + 1;
                }
                prevPoints = c.pointsOld;
                return { ...c, position: prevPos };
              });

            self.setState({
              year: year,
              gender: gender,
              grandSlam: grandSlam,
              rankingLeague: rankingLeague,
              rankingRelayLeague: rankingRelayLeague,
              rankingSpeedLeague: rankingSpeedLeague,
              rankingTechnicalLeague: rankingTechnicalLeague,
              points1000League: points1000League,
              pointsLeague: pointsLeague,
              pointsOldLeague: pointsOldLeague,
              loading: false,
            });
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            self.setState({
              year: -1,
              gender: undefined,
              rankingLeague: [],
              rankingRelayLeague: [],
              rankingSpeedLeague: [],
              rankingTechnicalLeague: [],
              points1000League: [],
              pointsLeague: [],
              pointsOldLeague: [],
              loading: false,
            });
          });
      }
      render() {
        const self = this;
        const { t, clubModel } = self.props;
        const {
          loading,
          year,
          gender,
          grandSlam,
          rankingLeague,
          rankingRelayLeague,
          rankingSpeedLeague,
          rankingTechnicalLeague,
          points1000League,
          pointsLeague,
          pointsOldLeague,
        } = self.state;
        const Spinner = (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
        const fromYear = 1994;
        const currentYear = new Date().getFullYear();
        const YearOptions = (
          <StyledSelect defaultValue={-1} onChange={(value) => self.update(value, gender)}>
            <Option value={-1}>{t('results.CurrentSeason')}</Option>
            {[...Array(1 + currentYear - fromYear).keys()].map((i) => (
              <Option value={currentYear - i}>{currentYear - i}</Option>
            ))}
          </StyledSelect>
        );
        const GenderOptions = (
          <GenderSelect allowClear={true} onChange={(value) => self.update(year, value)}>
            <Option value={genders.FeMale}>{t('results.FeMale')}</Option>
            <Option value={genders.Male}>{t('results.Male')}</Option>
          </GenderSelect>
        );
        const league = clubModel.modules.find((module) => module.name === 'Results').league;

        return (
          <Tabs defaultActiveKey="grandSlam" tabBarExtraContent={[GenderOptions, YearOptions]}>
            <TabPane tab={t('results.GrandSlam')} key="grandSlam">
              Sammanlagd placering i de fyra ligorna.
              {league.grandSlamAgeLimit > 0 ? ` Åldersgräns ${league.grandSlamAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 4, true)}
                  dataSource={grandSlam}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t('results.RankingLeague')} key="rankingLeague">
              Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana. Samma grundprincip som ranking och
              sverigelistan, fast utan konstiga överankingar i gubbaklasser. Även samma rankinglista för damer och
              herrar. Man får ranking på alla tävlingar, både individuellt, jaktstart och stafetter.
              {league.rankingLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingLeagueAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 6)}
                  dataSource={rankingLeague}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t('results.RankingRelayLeague')} key="rankingRelayLeague">
              Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana. Samma grundprincip som ranking och
              sverigelistan, fast utan konstiga överankingar i gubbaklasser. Även samma rankinglista för damer och
              herrar. En ren stafett ranking.
              {league.rankingRelayLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingRelayLeagueAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 3)}
                  dataSource={rankingRelayLeague}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t('results.RankingSpeedLeague')} key="rankingSpeedLeague">
              Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana i ren löphastighet. Bomtiden räknas
              bort och sen beräknas rankingen på den nya tiden. Även samma rankinglista för damer och herrar. En ren
              löphastighetsranking.
              {league.rankingLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingLeagueAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 6)}
                  dataSource={rankingSpeedLeague}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t('results.RankingTechnicalLeague')} key="rankingTechnicalLeague">
              Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana i ren orienteringsteknik. Antal
              bomminuter + ett teknikpåslag på 10% av löphastighetsrankingen. Även samma rankinglista för damer och
              herrar. En ren teknik ranking.
              {league.rankingLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingLeagueAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 6)}
                  dataSource={rankingTechnicalLeague}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t('results.Points1000League')} key="points1000League">
              OK Orions spring till 1000. Placering i förhållande till antal startande. 100 poäng för seger i en
              nationell tävling vid minst två startande. 30 är lägsta poäng vid fullföljt.
              {league.points1000LeagueAgeLimit > 0 ? ` Åldersgräns ${league.points1000LeagueAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 10)}
                  dataSource={points1000League.map((p) => ({ ...p, total: `${p.total} (${p.numberOf100})` }))}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane
              tab={t(year > 1900 && year < 2003 ? 'results.PointsOldLeague' : 'results.PointsLeague')}
              key="pointsLeague"
            >
              {year > 1900 && year < 2003
                ? 'Gårdsby IK poängliga fram till 2002. Grundpoäng baserat på typ av tävling och klass + Placeringspoäng + Poäng för antal startande - Poäng för minuter efter täten per 100m.'
                : 'Värend GN poängliga från 2003. Grundpoäng baserat på typ av tävling och klass + Logaritmen av antal startande i förhållande till placering. Allt sedan i förhållande till hur många procent efter täten man är.'}
              {league.pointsLeagueAgeLimit > 0 ? ` Åldersgräns ${league.pointsLeagueAgeLimit} år.` : ''}
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 10)}
                  dataSource={year > 1900 && year < 2003 ? pointsOldLeague : pointsLeague}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
          </Tabs>
        );
      }
    }
  )
);

const LeagueWithI18n = withTranslation()(League); // pass `t` function to App

export default LeagueWithI18n;
