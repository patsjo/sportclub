import { message, Select, Spin, Tabs } from 'antd';
import { ColumnType } from 'antd/lib/table';
import dayjs from 'dayjs';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { ILeagueCompetitor } from '../../utils/responseInterfaces';
import { genders, GenderType } from '../../utils/resultConstants';
import { SpinnerDiv, StyledTable } from '../styled/styled';

const fromYear = 1994;
const currentYear = new Date().getFullYear();
const { TabPane } = Tabs;
const StyledSelect = styled(Select)`
  &&& {
    width: 120px;
  }
`;

const Spinner = () => (
  <SpinnerDiv>
    <Spin size="large" />
  </SpinnerDiv>
);

interface ILeagueSelect {
  year?: number;
  gender?: GenderType;
  t: TFunction;
  onUpdate: (year: number, gender?: GenderType) => void;
}
const YearSelect = ({ gender, t, onUpdate }: ILeagueSelect) => (
  <StyledSelect
    defaultValue={-1}
    options={[
      { value: -1, label: t('results.CurrentSeason') },
      ...[...Array(1 + currentYear - fromYear)].map((_, i) => ({ value: currentYear - i, label: currentYear - i }))
    ]}
    onChange={value => onUpdate(value as number, gender)}
  />
);

const StyledGenderSelect = styled(Select)`
  &&& {
    width: 72px;
    margin-right: 8px;
  }
`;

const GenderSelect = ({ year, t, onUpdate }: ILeagueSelect) => (
  <StyledGenderSelect
    allowClear={true}
    options={[
      { value: genders.FeMale, label: t('results.FeMale') },
      { value: genders.Male, label: t('results.Male') }
    ]}
    onChange={value => onUpdate(year!, value as GenderType)}
  />
);

interface IColumnProps {
  position: number;
  name: string;
  total: number | string;
}

interface IBaseCompetitor {
  position: number;
  competitorId: number;
  name: string;
  total: number;
}

type NumberArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never;
}[keyof T];

type HasNumberArray<T> = [NumberArrayKeys<T>] extends [never] ? never : Pick<T, NumberArrayKeys<T>>;

const getColumns = <T extends Record<keyof HasNumberArray<T>, number[]>>(
  t: TFunction,
  columnName: NumberArrayKeys<T>,
  nofColumns: number,
  isTotal = false
): ColumnType<IColumnProps & T>[] => {
  const cols: ColumnType<IColumnProps & T>[] = [];
  cols.push({
    title: t('results.Position'),
    dataIndex: 'position',
    key: 'position',
    fixed: 'left',
    width: 80
  });
  cols.push({
    title: t('results.Competitor'),
    dataIndex: 'name',
    key: 'name',
    fixed: 'left',
    width: 200
  });
  for (let idx = 0; idx < nofColumns; idx++) {
    cols.push({
      title: isTotal
        ? t(
            `results.${
              idx === 0
                ? 'RankingLeague'
                : idx === 1
                  ? 'RankingRelayLeague'
                  : idx === 2
                    ? 'RankingSpeedLeague'
                    : idx === 3
                      ? 'RankingTechnicalLeague'
                      : idx === 4
                        ? 'Points1000League'
                        : 'PointsLeague'
            }`
          )
        : (idx + 1).toString(),
      dataIndex: `${columnName as string}_${idx}`,
      render: (_, record) => (record as T)[columnName]?.[idx],
      key: `p${idx}`
    });
  }
  cols.push({
    title: t('results.Total'),
    dataIndex: 'total',
    key: 'total',
    fixed: 'right',
    width: 80
  });
  return cols;
};

interface IGrandslamCompetitor extends IBaseCompetitor {
  positions: number[];
}
interface IRankingCompetitor extends IBaseCompetitor {
  ranking: number[];
}
interface IPointsCompetitor extends IBaseCompetitor {
  points: number[];
}
interface IPointsOldCompetitor extends IBaseCompetitor {
  pointsOld: number[];
}
interface IPoints1000Competitor extends IBaseCompetitor {
  points1000: number[];
  numberOf100: number;
}
const League = observer(() => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const league = useMemo(
    () => clubModel.modules.find(module => module.name === 'Results')?.league,
    [clubModel.modules]
  );
  const [year, setYear] = useState(-1);
  const [gender, setGender] = useState<GenderType>();
  const [grandSlam, setGrandSlam] = useState<IGrandslamCompetitor[]>([]);
  const [rankingLeague, setRankingLeague] = useState<IRankingCompetitor[]>([]);
  const [rankingRelayLeague, setRankingRelayLeague] = useState<IRankingCompetitor[]>([]);
  const [rankingSpeedLeague, setRankingSpeedLeague] = useState<IRankingCompetitor[]>([]);
  const [rankingTechnicalLeague, setRankingTechnicalLeague] = useState<IRankingCompetitor[]>([]);
  const [points1000League, setPoints1000League] = useState<IPoints1000Competitor[]>([]);
  const [pointsLeague, setPointsLeague] = useState<IPointsCompetitor[]>([]);
  const [pointsOldLeague, setPointsOldLeague] = useState<IPointsOldCompetitor[]>([]);
  const [loading, setLoading] = useState(true);

  const onUpdate = useCallback(
    (year: number, gender?: GenderType) => {
      const searchYear = year === -1 ? parseInt(dayjs().format('YYYY')) : year;
      const fromDate = dayjs(`${searchYear}`, 'YYYY').format('YYYY-MM-DD');
      const toDate =
        year === -1
          ? dayjs().format('YYYY-MM-DD')
          : dayjs(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');
      const rankingFromDate =
        year === -1 ? dayjs(toDate, 'YYYY-MM-DD').add(1, 'days').subtract(1, 'years').format('YYYY-MM-DD') : fromDate;

      setLoading(true);

      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;

      if (!url || !league) return;

      const rankingPromise =
        year === -1
          ? PostJsonData<ILeagueCompetitor[]>(
              url,
              {
                iType: 'POINTS',
                iFromDate: rankingFromDate,
                iToDate: toDate
              },
              true
            )
          : (new Promise(resolve => resolve(undefined)) as Promise<ILeagueCompetitor[] | undefined>);
      const pointsPromise = PostJsonData<ILeagueCompetitor[]>(
        url,
        {
          iType: 'POINTS',
          iFromDate: fromDate,
          iToDate: toDate
        },
        true
      );

      Promise.all([rankingPromise, pointsPromise])
        .then(async ([rankingJson, pointsJson]) => {
          if (pointsJson === undefined) {
            pointsJson = [];
          }
          if (rankingJson === undefined) {
            rankingJson = pointsJson;
          }

          let prevRanking: number[] = [];
          let prevPos = 1;
          const rankingLeague = rankingJson
            .filter(
              c =>
                c.ranking.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.rankingLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.rankingLeagueAgeLimit)
            )
            .map(c => {
              const ranking = c.ranking.slice(0, 6);
              return {
                competitorId: c.competitorId,
                name: c.name,
                ranking: ranking,
                total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100
              };
            })
            .sort((a, b) =>
              a.total === b.total
                ? JSON.stringify(a.ranking.map(v => v.toFixed(2).padStart(6, '0'))) >
                  JSON.stringify(b.ranking.map(v => v.toFixed(2).padStart(6, '0')))
                  ? 1
                  : -1
                : a.total > b.total
                  ? 1
                  : -1
            )
            .map((c, i) => {
              const minLength = Math.min(prevRanking.length, c.ranking.length);
              if (JSON.stringify(prevRanking.slice(0, minLength)) !== JSON.stringify(c.ranking.slice(0, minLength))) {
                prevPos = i + 1;
              }
              prevRanking = c.ranking;
              return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
            });

          prevRanking = [];
          prevPos = 1;
          const rankingRelayLeague = rankingJson
            .filter(
              c =>
                c.rankingRelay.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.rankingRelayLeagueAgeLimit === 0 ||
                  searchYear - c.birthYear >= league.rankingRelayLeagueAgeLimit)
            )
            .map(c => {
              const ranking = c.rankingRelay.slice(0, 3);
              return {
                competitorId: c.competitorId,
                name: c.name,
                ranking: ranking,
                total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100
              };
            })
            .sort((a, b) =>
              a.total === b.total
                ? JSON.stringify(a.ranking.map(v => v.toFixed(2).padStart(6, '0'))) >
                  JSON.stringify(b.ranking.map(v => v.toFixed(2).padStart(6, '0')))
                  ? 1
                  : -1
                : a.total > b.total
                  ? 1
                  : -1
            )
            .map((c, i) => {
              const minLength = Math.min(prevRanking.length, c.ranking.length);
              if (JSON.stringify(prevRanking.slice(0, minLength)) !== JSON.stringify(c.ranking.slice(0, minLength))) {
                prevPos = i + 1;
              }
              prevRanking = c.ranking;
              return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
            });

          prevRanking = [];
          prevPos = 1;
          const rankingSpeedLeague = rankingJson
            .filter(
              c =>
                c.speedRanking.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.rankingLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.rankingLeagueAgeLimit)
            )
            .map(c => {
              const ranking = c.speedRanking.slice(0, 6);
              return {
                competitorId: c.competitorId,
                name: c.name,
                ranking: ranking,
                total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100
              };
            })
            .sort((a, b) =>
              a.total === b.total
                ? JSON.stringify(a.ranking.map(v => v.toFixed(2).padStart(6, '0'))) >
                  JSON.stringify(b.ranking.map(v => v.toFixed(2).padStart(6, '0')))
                  ? 1
                  : -1
                : a.total > b.total
                  ? 1
                  : -1
            )
            .map((c, i) => {
              const minLength = Math.min(prevRanking.length, c.ranking.length);
              if (JSON.stringify(prevRanking.slice(0, minLength)) !== JSON.stringify(c.ranking.slice(0, minLength))) {
                prevPos = i + 1;
              }
              prevRanking = c.ranking;
              return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
            });

          prevRanking = [];
          prevPos = 1;
          const rankingTechnicalLeague = rankingJson
            .filter(
              c =>
                c.technicalRanking.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.rankingLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.rankingLeagueAgeLimit)
            )
            .map(c => {
              const ranking = c.technicalRanking.slice(0, 6);
              return {
                competitorId: c.competitorId,
                name: c.name,
                ranking: ranking,
                total: Math.round((100 * ranking.reduce((a, b) => a + b, 0)) / ranking.length) / 100
              };
            })
            .sort((a, b) =>
              a.total === b.total
                ? JSON.stringify(a.ranking.map(v => v.toFixed(2).padStart(6, '0'))) >
                  JSON.stringify(b.ranking.map(v => v.toFixed(2).padStart(6, '0')))
                  ? 1
                  : -1
                : a.total > b.total
                  ? 1
                  : -1
            )
            .map((c, i) => {
              const minLength = Math.min(prevRanking.length, c.ranking.length);
              if (JSON.stringify(prevRanking.slice(0, minLength)) !== JSON.stringify(c.ranking.slice(0, minLength))) {
                prevPos = i + 1;
              }
              prevRanking = c.ranking;
              return { ...c, position: prevPos, ...c.ranking.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
            });

          let prevPoints: number[] = [];
          prevPos = 1;
          let prevNumberOf100 = -1;
          const points1000League = pointsJson
            .filter(
              c =>
                c.points1000.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.points1000LeagueAgeLimit === 0 || searchYear - c.birthYear >= league.points1000LeagueAgeLimit)
            )
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
              a.total === b.total && a.numberOf100 === b.numberOf100
                ? JSON.stringify(a.points1000.map(v => v.toString().padStart(3, '0'))) >
                  JSON.stringify(b.points1000.map(v => v.toString().padStart(3, '0')))
                  ? -1
                  : 1
                : a.total === b.total
                  ? a.numberOf100 > b.numberOf100
                    ? -1
                    : 1
                  : a.total > b.total
                    ? -1
                    : 1
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
              c =>
                c.points.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.pointsLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.pointsLeagueAgeLimit)
            )
            .map(c => {
              const points = c.points.slice(0, 10);
              return {
                competitorId: c.competitorId,
                name: c.name,
                points: points,
                total: points.reduce((a, b) => a + b, 0)
              };
            })
            .sort((a, b) =>
              a.total === b.total
                ? JSON.stringify(a.points.map(v => v.toString().padStart(3, '0'))) >
                  JSON.stringify(b.points.map(v => v.toString().padStart(3, '0')))
                  ? -1
                  : 1
                : a.total > b.total
                  ? -1
                  : 1
            )
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
              c =>
                c.pointsOld.length > 0 &&
                (!gender || gender === c.gender) &&
                (league.pointsLeagueAgeLimit === 0 || searchYear - c.birthYear >= league.pointsLeagueAgeLimit)
            )
            .map(c => {
              const pointsOld = c.pointsOld.slice(0, 10);
              return {
                competitorId: c.competitorId,
                name: c.name,
                pointsOld: pointsOld,
                total: pointsOld.reduce((a, b) => a + b, 0)
              };
            })
            .sort((a, b) =>
              a.total === b.total
                ? JSON.stringify(a.pointsOld.map(v => v.toString().padStart(3, '0'))) >
                  JSON.stringify(b.pointsOld.map(v => v.toString().padStart(3, '0')))
                  ? -1
                  : 1
                : a.total > b.total
                  ? -1
                  : 1
            )
            .map((c, i) => {
              if (JSON.stringify(prevPoints) !== JSON.stringify(c.pointsOld)) {
                prevPos = i + 1;
              }
              prevPoints = c.pointsOld;
              return { ...c, position: prevPos, ...c.pointsOld.reduce((ac, a, i) => ({ ...ac, [`p${i}`]: a }), {}) };
            });

          rankingJson
            .filter(
              c =>
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
            .forEach(c => {
              const c1 = pointsJson.find(cc => cc.competitorId === c.competitorId);
              if (c1 === undefined) {
                pointsJson.push({ ...c, points1000: [], points: [], pointsOld: [] });
              }
            });

          prevPoints = [];
          prevPos = 1;
          const grandSlam = pointsJson
            .filter(
              c =>
                (!gender || gender === c.gender) &&
                (league.grandSlamAgeLimit === 0 || searchYear - c.birthYear >= league.grandSlamAgeLimit)
            )
            .map(c => {
              const c1 = rankingLeague.find(cc => cc.competitorId === c.competitorId);
              const pos1 = c1 !== undefined ? c1.position : rankingLeague.length + 1;
              const c2 = rankingRelayLeague.find(cc => cc.competitorId === c.competitorId);
              const pos2 = c2 !== undefined ? c2.position : rankingRelayLeague.length + 1;
              const c3 = rankingSpeedLeague.find(cc => cc.competitorId === c.competitorId);
              const pos3 = c3 !== undefined ? c3.position : rankingSpeedLeague.length + 1;
              const c4 = rankingTechnicalLeague.find(cc => cc.competitorId === c.competitorId);
              const pos4 = c4 !== undefined ? c4.position : rankingTechnicalLeague.length + 1;
              const c5 = points1000League.find(cc => cc.competitorId === c.competitorId);
              const pos5 = c5 !== undefined ? c5.position : points1000League.length + 1;
              let pos6;
              if (year > 1900 && year < 2003) {
                const c6 = pointsOldLeague.find(cc => cc.competitorId === c.competitorId);
                pos6 = c6 !== undefined ? c6.position : pointsOldLeague.length + 1;
              } else {
                const c6 = pointsLeague.find(cc => cc.competitorId === c.competitorId);
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
                positions: positions
              };
            })
            .sort((a, b) => (a.total > b.total ? 1 : -1))
            .map((c, i) => {
              if (JSON.stringify(prevPoints) !== JSON.stringify(c.positions)) {
                prevPos = i + 1;
              }
              prevPoints = [c.p0, c.p1, c.p2, c.p3, c.p4, c.p5];
              return { ...c, position: prevPos };
            });

          setYear(year);
          setGender(gender);
          setGrandSlam(grandSlam);
          setRankingLeague(rankingLeague);
          setRankingRelayLeague(rankingRelayLeague);
          setRankingSpeedLeague(rankingSpeedLeague);
          setRankingTechnicalLeague(rankingTechnicalLeague);
          setPoints1000League(points1000League);
          setPointsLeague(pointsLeague);
          setPointsOldLeague(pointsOldLeague);
          setLoading(false);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setYear(-1);
          setGender(undefined);
          setGrandSlam([]);
          setRankingLeague([]);
          setRankingRelayLeague([]);
          setRankingSpeedLeague([]);
          setRankingTechnicalLeague([]);
          setPoints1000League([]);
          setPointsLeague([]);
          setPointsOldLeague([]);
          setLoading(false);
        });
    },
    [clubModel.modules, league]
  );

  useEffect(() => {
    onUpdate(-1, undefined);
  }, [onUpdate]);

  return league ? (
    <Tabs
      defaultActiveKey="grandSlam"
      tabBarExtraContent={
        <>
          <GenderSelect year={year} t={t} onUpdate={onUpdate} />
          <YearSelect gender={gender} t={t} onUpdate={onUpdate} />
        </>
      }
    >
      <TabPane key="grandSlam" tab={t('results.GrandSlam')}>
        Sammanlagd placering i de fyra ligorna.
        {league.grandSlamAgeLimit > 0 ? ` Åldersgräns ${league.grandSlamAgeLimit} år.` : ''}
        {!loading ? (
          <StyledTable
            columns={getColumns<IGrandslamCompetitor>(t, 'positions', 6, true)}
            dataSource={grandSlam}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
      <TabPane key="rankingLeague" tab={t('results.RankingLeague')}>
        Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana. Samma grundprincip som ranking och
        sverigelistan, fast utan konstiga överankingar i gubbaklasser. Även samma rankinglista för damer och herrar. Man
        får ranking på alla tävlingar, både individuellt, jaktstart och stafetter.
        {league.rankingLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingLeagueAgeLimit} år.` : ''}
        {!loading ? (
          <StyledTable
            columns={getColumns<IRankingCompetitor>(t, 'ranking', 6)}
            dataSource={rankingLeague}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
      <TabPane key="rankingRelayLeague" tab={t('results.RankingRelayLeague')}>
        Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana. Samma grundprincip som ranking och
        sverigelistan, fast utan konstiga överankingar i gubbaklasser. Även samma rankinglista för damer och herrar. En
        ren stafett ranking.
        {league.rankingRelayLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingRelayLeagueAgeLimit} år.` : ''}
        {!loading ? (
          <StyledTable
            columns={getColumns<IRankingCompetitor>(t, 'ranking', 3)}
            dataSource={rankingRelayLeague}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
      <TabPane key="rankingSpeedLeague" tab={t('results.RankingSpeedLeague')}>
        Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana i ren löphastighet. Bomtiden räknas bort
        och sen beräknas rankingen på den nya tiden. Även samma rankinglista för damer och herrar. En ren
        löphastighetsranking.
        {league.rankingLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingLeagueAgeLimit} år.` : ''}
        {!loading ? (
          <StyledTable
            columns={getColumns<IRankingCompetitor>(t, 'ranking', 6)}
            dataSource={rankingSpeedLeague}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
      <TabPane key="rankingTechnicalLeague" tab={t('results.RankingTechnicalLeague')}>
        Antal minuter efter sveriges bästa herrsenior på en 75 minuters bana i ren orienteringsteknik. Antal bomminuter
        + ett teknikpåslag på 10% av löphastighetsrankingen. Även samma rankinglista för damer och herrar. En ren teknik
        ranking.
        {league.rankingLeagueAgeLimit > 0 ? ` Åldersgräns ${league.rankingLeagueAgeLimit} år.` : ''}
        {!loading ? (
          <StyledTable
            columns={getColumns<IRankingCompetitor>(t, 'ranking', 6)}
            dataSource={rankingTechnicalLeague}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
      <TabPane key="points1000League" tab={t('results.Points1000League')}>
        Placering i förhållande till antal startande. 100 poäng för seger i en nationell tävling vid minst två
        startande. 30 är lägsta poäng vid fullföljt.
        {league.points1000LeagueAgeLimit > 0 ? ` Åldersgräns ${league.points1000LeagueAgeLimit} år.` : ''}
        {!loading ? (
          <StyledTable
            columns={getColumns<Omit<IPoints1000Competitor, 'total'> & { total: string }>(t, 'points1000', 10)}
            dataSource={points1000League.map(p => ({ ...p, total: `${p.total} (${p.numberOf100})` }))}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
      <TabPane
        key="pointsLeague"
        tab={t(year > 1900 && year < 2003 ? 'results.PointsOldLeague' : 'results.PointsLeague')}
      >
        {year > 1900 && year < 2003
          ? 'Grundpoäng baserat på typ av tävling och klass + Placeringspoäng + Poäng för antal startande - Poäng för minuter efter täten per 100m.'
          : 'Grundpoäng baserat på typ av tävling och klass + Logaritmen av antal startande i förhållande till placering. Allt sedan i förhållande till hur många procent efter täten man är.'}
        {league.pointsLeagueAgeLimit > 0 ? ` Åldersgräns ${league.pointsLeagueAgeLimit} år.` : ''}
        {!loading && year > 1900 && year < 2003 ? (
          <StyledTable
            columns={getColumns<IPointsOldCompetitor>(t, 'pointsOld', 10)}
            dataSource={pointsOldLeague}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : !loading ? (
          <StyledTable
            columns={getColumns<IPointsCompetitor>(t, 'points', 10)}
            dataSource={pointsLeague}
            size="middle"
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Spinner />
        )}
      </TabPane>
    </Tabs>
  ) : null;
});

export default League;
