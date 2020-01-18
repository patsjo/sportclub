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

const getColumns = (t, nofPoints) => [
  {
    title: t("results.Position"),
    dataIndex: "position",
    key: "position"
  },
  {
    title: t("results.Competitor"),
    dataIndex: "name",
    key: "name"
  },
  ...[...Array(nofPoints).keys()].map(i => ({
    title: (i + 1).toString(),
    dataIndex: `p${i}`,
    key: `p${i}`
  })),
  {
    title: t("results.Total"),
    dataIndex: "total",
    key: "total"
  }
];

const League = inject("clubModel")(
  observer(
    class League extends Component {
      constructor(props) {
        super(props);
        this.state = {
          grandSlam: [],
          rankingLeague: [],
          points1000League: [],
          pointsLeague: [],
          pointsOldLeague: [],
          loading: true
        };
      }

      componentDidMount() {
        this.update(new Date().getFullYear());
      }

      update(year) {
        const self = this;
        const { clubModel } = this.props;
        const currentYear = new Date().getFullYear();
        const fromDate = moment(year, "YYYY").format("YYYY-MM-DD");
        const toDate =
          year === currentYear
            ? moment().format("YYYY-MM-DD")
            : moment(fromDate, "YYYY-MM-DD")
                .add(1, "years")
                .subtract(1, "days")
                .format("YYYY-MM-DD");
        const rankingFromDate =
          year === currentYear
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
          year === currentYear
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
                const c2 = points1000League.find(cc => cc.competitorId === c.competitorId);
                const pos2 = c2 !== undefined ? c2.position : points1000League.length + 1;
                const c3 = pointsLeague.find(cc => cc.competitorId === c.competitorId);
                const pos3 = c3 !== undefined ? c3.position : pointsLeague.length + 1;
                const c4 = pointsOldLeague.find(cc => cc.competitorId === c.competitorId);
                const pos4 = c4 !== undefined ? c4.position : pointsOldLeague.length + 1;
                const positions = [pos1, pos2, pos3, pos4];

                return {
                  competitorId: c.competitorId,
                  name: c.name,
                  p0: pos1,
                  p1: pos2,
                  p2: pos3,
                  p3: pos4,
                  total: positions.reduce((a, b) => a + b, 0)
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
              grandSlam: grandSlam,
              rankingLeague: rankingLeague,
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
              rankingLeague: [],
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
        const { loading, grandSlam, rankingLeague, points1000League, pointsLeague, pointsOldLeague } = self.state;
        const Spinner = (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
        const fromYear = 1994;
        const currentYear = new Date().getFullYear();
        const YearOptions = (
          <StyledSelect defaultValue={currentYear} onChange={year => self.update(year)}>
            {[...Array(1 + currentYear - fromYear).keys()].map(i => (
              <Option value={currentYear - i}>{i === 0 ? t("results.CurrentSeason") : currentYear - i}</Option>
            ))}
          </StyledSelect>
        );

        return (
          <Tabs defaultActiveKey="grandSlam" tabBarExtraContent={YearOptions}>
            <TabPane tab={t("results.GrandSlam")} key="grandSlam">
              {!loading ? (
                <StyledTable columns={getColumns(t, 4)} dataSource={grandSlam} size="middle" pagination={false} />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t("results.RankingLeague")} key="rankingLeague">
              {!loading ? (
                <StyledTable columns={getColumns(t, 6)} dataSource={rankingLeague} size="middle" pagination={false} />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t("results.Points1000League")} key="points1000League">
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 10)}
                  dataSource={points1000League.map(p => ({ ...p, total: `${p.total} (${p.numberOf100})` }))}
                  size="middle"
                  pagination={false}
                />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t("results.PointsLeague")} key="pointsLeague">
              {!loading ? (
                <StyledTable columns={getColumns(t, 10)} dataSource={pointsLeague} size="middle" pagination={false} />
              ) : (
                Spinner
              )}
            </TabPane>
            <TabPane tab={t("results.PointsOldLeague")} key="pointsOldLeague">
              {!loading ? (
                <StyledTable
                  columns={getColumns(t, 10)}
                  dataSource={pointsOldLeague}
                  size="middle"
                  pagination={false}
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
