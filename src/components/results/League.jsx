import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import { Spin, Select, Tabs, message } from "antd";
import { SpinnerDiv, StyledTable } from "../styled/styled";
import { withTranslation } from "react-i18next";
import moment from "moment";
import { PostJsonData } from "../../utils/api";
import styled from "styled-components";

const { TabPane } = Tabs;
const { Option } = Select;
const StyledSelect = styled(Select)`
  &&& {
    width: 120px;
  }
`;

const getColumns = (t, nofPoints, isTotal = false) => [
  {
    title: t("results.Position"),
    dataIndex: "position",
    key: "position",
    fixed: "left",
    width: 80
  },
  {
    title: t("results.Competitor"),
    dataIndex: "name",
    key: "name",
    fixed: "left",
    width: 200
  },
  ...[...Array(nofPoints).keys()].map(i => ({
    title: isTotal
      ? t(
          `results.${
            i === 0 ? "RankingLeague" : i === 1 ? "RankingRelayLeague" : i === 2 ? "Points1000League" : "PointsLeague"
          }`
        )
      : (i + 1).toString(),
    dataIndex: `p${i}`,
    key: `p${i}`
  })),
  {
    title: t("results.Total"),
    dataIndex: "total",
    key: "total",
    fixed: "right",
    width: 80
  }
];

const League = inject("clubModel")(
  observer(
    class League extends Component {
      constructor(props) {
        super(props);
        this.state = {
          year: -1,
          grandSlam: [],
          rankingLeague: [],
          rankingRelayLeague: [],
          points1000League: [],
          pointsLeague: [],
          pointsOldLeague: [],
          loading: true
        };
      }

      componentDidMount() {
        this.update(-1);
      }

      update(year) {
        const self = this;
        const { clubModel } = this.props;
        const fromDate =
          year === -1
            ? moment()
                .startOf("year")
                .format("YYYY-MM-DD")
            : moment(year, "YYYY").format("YYYY-MM-DD");
        const toDate =
          year === -1
            ? moment().format("YYYY-MM-DD")
            : moment(fromDate, "YYYY-MM-DD")
                .add(1, "years")
                .subtract(1, "days")
                .format("YYYY-MM-DD");
        const rankingFromDate =
          year === -1
            ? moment(toDate, "YYYY-MM-DD")
                .add(1, "days")
                .subtract(1, "years")
                .format("YYYY-MM-DD")
            : fromDate;

        self.setState({
          loading: true
        });

        const url = clubModel.modules.find(module => module.name === "Results").queryUrl;
        const rankingPromise =
          year === -1
            ? PostJsonData(
                url,
                {
                  iType: "POINTS",
                  iFromDate: rankingFromDate,
                  iToDate: toDate
                },
                true
              )
            : new Promise(resolve => resolve(undefined));
        const pointsPromise = PostJsonData(
          url,
          {
            iType: "POINTS",
            iFromDate: fromDate,
            iToDate: toDate
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
              .filter(c => c.ranking.length > 0)
              .map(c => {
                const ranking = c.ranking.slice(0, 6);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  ranking: ranking,
                  total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100
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
              .filter(c => c.rankingRelay.length > 0)
              .map(c => {
                const ranking = c.rankingRelay.slice(0, 3);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  ranking: ranking,
                  total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100
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
              .filter(c => c.points1000.length > 0)
              .map(c => {
                const numberOf100 = c.points1000.filter(p => p === 100).length;
                const points1000 = c.points1000.slice(0, 10);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  numberOf100: numberOf100,
                  points1000: points1000,
                  total: points1000.reduce((a, b) => a + b, 0)
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
              .filter(c => c.points.length > 0)
              .map(c => {
                const points = c.points.slice(0, 10);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  points: points,
                  total: points.reduce((a, b) => a + b, 0)
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
              .filter(c => c.pointsOld.length > 0)
              .map(c => {
                const pointsOld = c.pointsOld.slice(0, 10);
                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  pointsOld: pointsOld,
                  total: pointsOld.reduce((a, b) => a + b, 0)
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

            rankingLeague.forEach(c => {
              const c1 = pointsJson.find(cc => cc.competitorId === c.competitorId);
              if (c1 === undefined) {
                pointsJson.push({ ...c, points1000: [], points: [], pointsOld: [] });
              }
            });

            prevPoints = [];
            prevPos = 1;
            const grandSlam = pointsJson
              .map(c => {
                const c1 = rankingLeague.find(cc => cc.competitorId === c.competitorId);
                const pos1 = c1 !== undefined ? c1.position : rankingLeague.length + 1;
                const c2 = rankingRelayLeague.find(cc => cc.competitorId === c.competitorId);
                const pos2 = c2 !== undefined ? c2.position : rankingRelayLeague.length + 1;
                const c3 = points1000League.find(cc => cc.competitorId === c.competitorId);
                const pos3 = c3 !== undefined ? c3.position : points1000League.length + 1;
                let pos4;
                if (year < 2003) {
                  const c4 = pointsOldLeague.find(cc => cc.competitorId === c.competitorId);
                  pos4 = c4 !== undefined ? c4.position : pointsOldLeague.length + 1;
                } else {
                  const c4 = pointsLeague.find(cc => cc.competitorId === c.competitorId);
                  pos4 = c4 !== undefined ? c4.position : pointsLeague.length + 1;
                }
                const positions = [pos1, pos2, pos3, pos4];

                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  p0: pos1,
                  p1: pos2,
                  p2: pos3,
                  p3: pos4,
                  total: positions.reduce((a, b) => a + b, 0),
                  positions: positions
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
              grandSlam: grandSlam,
              rankingLeague: rankingLeague,
              rankingRelayLeague: rankingRelayLeague,
              points1000League: points1000League,
              pointsLeague: pointsLeague,
              pointsOldLeague: pointsOldLeague,
              loading: false
            });
          })
          .catch(e => {
            if (e && e.message) {
              message.error(e.message);
            }
            self.setState({
              year: -1,
              rankingLeague: [],
              rankingRelayLeague: [],
              points1000League: [],
              pointsLeague: [],
              pointsOldLeague: [],
              loading: false
            });
          });
      }
      render() {
        const self = this;
        const { t } = self.props;
        const {
          loading,
          year,
          grandSlam,
          rankingLeague,
          rankingRelayLeague,
          points1000League,
          pointsLeague,
          pointsOldLeague
        } = self.state;
        const Spinner = (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
        const fromYear = 1994;
        const currentYear = new Date().getFullYear();
        const YearOptions = (
          <StyledSelect defaultValue={-1} onChange={year => self.update(year)}>
            <Option value={-1}>{t("results.CurrentSeason")}</Option>
            {[...Array(1 + currentYear - fromYear).keys()].map(i => (
              <Option value={currentYear - i}>{currentYear - i}</Option>
            ))}
          </StyledSelect>
        );

        return (
          <Tabs defaultActiveKey="grandSlam" tabBarExtraContent={YearOptions}>
            <TabPane tab={t("results.GrandSlam")} key="grandSlam">
              Sammanlagd placering i de fyra ligorna.
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
            <TabPane tab={t("results.RankingLeague")} key="rankingLeague">
              Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana. Samma grundprincip som ranking och
              sverigelistan, fast utan konstiga överankingar i gubbaklasser. Även samma rankinglista för damer och
              herrar. Man får ranking på alla tävlingar, både individuellt, jaktstart och stafetter.
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
            <TabPane tab={t("results.RankingRelayLeague")} key="rankingRelayLeague">
              Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana. Samma grundprincip som ranking och
              sverigelistan, fast utan konstiga överankingar i gubbaklasser. Även samma rankinglista för damer och
              herrar. En ren stafett ranking.
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
            <TabPane tab={t("results.Points1000League")} key="points1000League">
              OK Orions spring till 1000. Placering i förhållande till antal startande. 100 poäng för seger i en
              nationell tävling vid minst två startande. 30 är lägsta poäng vid fullföljt.
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 10)}
                  dataSource={points1000League.map(p => ({ ...p, total: `${p.total} (${p.numberOf100})` }))}
                  size="middle"
                  pagination={false}
                  scroll={{ x: true }}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane
              tab={t(year > 1900 && year < 2003 ? "results.PointsOldLeague" : "results.PointsLeague")}
              key="pointsLeague"
            >
              {year > 1900 && year < 2003
                ? "Gårdsby IK poängliga fram till 2002. Grundpoäng baserat på typ av tävling och klass + Placeringspoäng + Poäng för antal startande - Poäng för minuter efter täten per 100m."
                : "Värend GN poängliga från 2003. Grundpoäng baserat på typ av tävling och klass + Logaritmen av antal startande i förhållande till placering. Allt sedan i förhållande till hur många procent efter täten man är."}
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
