import { Card, message } from 'antd';
import { observer } from 'mobx-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { ICompetitor } from '../../utils/responseCompetitorInterfaces';
import { IViewResult, IViewResultRaceInfo, IViewTeamResult } from '../../utils/responseInterfaces';
import { GenderType } from '../../utils/resultConstants';
import { PostJsonData } from '../../utils/api';
import CompetitorTitle from './CompetitorTitle';
import FiveStars, { ContainerDiv, InfoDiv, LabelDiv, Loader, StarsDiv } from './FiveStars';

type IViewResultCombined = (IViewResult & IViewResultRaceInfo) | (IViewTeamResult & IViewResultRaceInfo);
type IAllViewResult = IViewResultCombined & {
  levelRanking: number;
  deviantRaceLightCondition?: string | null;
};
type TypeStars = -1 | 0 | 1 | 2 | 3 | 4 | 5;

const StyledCard = styled(Card)`
  &&& {
    margin-bottom: 16px;
    max-width: 1160px;
    border-color: #808080;
  }
  &&& .ant-card-head {
    border-bottom-color: #808080;
    margin-bottom: -1px;
    padding: 0;
  }
  &&& .ant-card-head-wrapper {
    margin-bottom: -1px;
  }
  &&& .ant-card-head-title {
    padding: 0;
  }
`;

const getStarsRank = (gender: GenderType, ranking: number): TypeStars => {
  if (gender === 'MALE') {
    if (ranking < 5.0) return 5;
    if (ranking < 12.5) return 4;
    if (ranking < 20.0) return 3;
    if (ranking < 35.0) return 2;
    if (ranking < 50.0) return 1;
  } else {
    if (ranking < 12.5) return 5;
    if (ranking < 20.0) return 4;
    if (ranking < 35.0) return 3;
    if (ranking < 50.0) return 2;
    if (ranking < 65.0) return 1;
  }
  return 0;
};

const getStarsImportant = (allResults: IAllViewResult[]): TypeStars => {
  if (!Array.isArray(allResults) || allResults.length < 2) return -1;

  let level1Ranking = allResults.filter((r) => r.levelRanking === 0);
  let level2Ranking = allResults.filter((r) => r.levelRanking === 10);
  if (level1Ranking.length === 0 && level2Ranking.length > 0) {
    level1Ranking = allResults.filter((r) => r.eventClassificationId === 'E');
    level2Ranking = allResults.filter((r) => r.eventClassificationId === 'F');
  }
  const level3Ranking = allResults.filter((r) => r.levelRanking === 20);
  let highLevelRanking = level1Ranking.length > 0 ? level1Ranking : level2Ranking;
  let levelRanking = level1Ranking.length > 0 && level2Ranking.length > 0 ? level2Ranking : level3Ranking;

  if (highLevelRanking.length === 0 || levelRanking.length === 0) return -1;

  highLevelRanking = highLevelRanking.sort((a, b) => a.ranking! - b.ranking!);
  levelRanking = levelRanking.sort((a, b) => a.ranking! - b.ranking!);
  const avgHighLevelRanking =
    highLevelRanking
      .slice(highLevelRanking.length > 2 ? 1 : 0, Math.max(1, highLevelRanking.length - 2))
      .map((r) => r.ranking!)
      .reduce((a, b) => a + b, 0) / Math.max(1, highLevelRanking.length - 2);
  const avgRanking =
    levelRanking
      .slice(levelRanking.length > 2 ? 1 : 0, Math.max(1, levelRanking.length - 2))
      .map((r) => r.ranking!)
      .reduce((a, b) => a + b, 0) / Math.max(1, levelRanking.length - 2);

  if (avgHighLevelRanking - avgRanking < -5) return 5;
  if (avgHighLevelRanking - avgRanking < 0) return 4;
  if (avgHighLevelRanking - avgRanking < 5) return 3;
  if (avgHighLevelRanking - avgRanking < 10) return 2;
  if (avgHighLevelRanking - avgRanking < 20) return 1;
  return 0;
};

const getStarsStability = (allResults: IAllViewResult[]): TypeStars => {
  if (!Array.isArray(allResults) || allResults.length < 5) return -1;

  const level1Ranking = allResults.filter((r) => r.levelRanking === 0);
  const level2Ranking = allResults.filter((r) => r.levelRanking === 10);
  const level3Ranking = allResults.filter((r) => r.levelRanking === 20);
  let levelRanking = level1Ranking;

  if (levelRanking.length < 4) {
    levelRanking = [...levelRanking, ...level2Ranking];
  }
  if (levelRanking.length < 4) {
    levelRanking = [...levelRanking, ...level3Ranking];
  }

  levelRanking = levelRanking.sort((a, b) => a.ranking! - b.ranking!);
  const avgRanking =
    levelRanking
      .slice(1, levelRanking.length - 2)
      .map((r) => r.ranking!)
      .reduce((a, b) => a + b, 0) /
    (levelRanking.length - 2);
  const deviationRanking =
    levelRanking.map((r) => r.ranking!).reduce((a, b) => a + Math.abs(b - avgRanking), 0) / levelRanking.length;

  if (deviationRanking < 3) return 5;
  if (deviationRanking < 6) return 4;
  if (deviationRanking < 10) return 3;
  if (deviationRanking < 15) return 2;
  if (deviationRanking < 20) return 1;
  return 0;
};

const getStarsSpeed = (allResults: IAllViewResult[], gender: GenderType): TypeStars => {
  if (!Array.isArray(allResults) || allResults.length === 0) return -1;
  const topSpeedRanking = allResults
    .filter((r) => r.speedRanking != null)
    .sort((a, b) => a.levelRanking + a.speedRanking! - (b.levelRanking + b.speedRanking!))
    .slice(0, 3);
  if (topSpeedRanking.length === 0) return -1;
  const avgSpeedRanking =
    topSpeedRanking.map((r) => r.speedRanking!).reduce((a, b) => a + b, 0) / topSpeedRanking.length;

  if (gender === 'MALE') {
    if (avgSpeedRanking < 3.0) return 5;
    if (avgSpeedRanking < 10.0) return 4;
    if (avgSpeedRanking < 17.0) return 3;
    if (avgSpeedRanking < 30.0) return 2;
    if (avgSpeedRanking < 45.0) return 1;
  } else {
    if (avgSpeedRanking < 10.0) return 5;
    if (avgSpeedRanking < 17.0) return 4;
    if (avgSpeedRanking < 30.0) return 3;
    if (avgSpeedRanking < 45.0) return 2;
    if (avgSpeedRanking < 60.0) return 1;
  }
  return 0;
};

const getStarsTechnical = (allResults: IAllViewResult[], gender: GenderType): TypeStars => {
  if (!Array.isArray(allResults) || allResults.length === 0) return -1;
  const topTechnicalRanking = allResults
    .filter((r) => r.technicalRanking != null)
    .sort((a, b) => a.levelRanking + a.technicalRanking! - (b.levelRanking + b.technicalRanking!))
    .slice(0, 3);
  if (topTechnicalRanking.length === 0) return -1;
  const avgTechnicalRanking =
    topTechnicalRanking.map((r) => r.technicalRanking!).reduce((a, b) => a + b, 0) / topTechnicalRanking.length;

  if (gender === 'MALE') {
    if (avgTechnicalRanking < 3.0) return 5;
    if (avgTechnicalRanking < 6.5) return 4;
    if (avgTechnicalRanking < 10.0) return 3;
    if (avgTechnicalRanking < 17.5) return 2;
    if (avgTechnicalRanking < 25.0) return 1;
  } else {
    if (avgTechnicalRanking < 3.75) return 5;
    if (avgTechnicalRanking < 7.5) return 4;
    if (avgTechnicalRanking < 11.5) return 3;
    if (avgTechnicalRanking < 19.0) return 2;
    if (avgTechnicalRanking < 26.5) return 1;
  }
  return 0;
};

const getStarsRelay = (results: IViewResult[], teamResults: IViewTeamResult[]): TypeStars => {
  if (!Array.isArray(results) || results.length === 0) return -1;
  if (!Array.isArray(teamResults) || teamResults.length === 0) return -1;

  const topIndRanking = results
    .filter((r) => r.ranking != null)
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 3);
  if (topIndRanking.length === 0) return -1;
  const avgIndRanking = topIndRanking.map((r) => r.ranking!).reduce((a, b) => a + b, 0) / topIndRanking.length;

  const topRelayRanking = teamResults
    .filter((r) => r.ranking != null)
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 3);
  if (topRelayRanking.length === 0) return -1;
  const avgRelayRanking = topRelayRanking.map((r) => r.ranking!).reduce((a, b) => a + b, 0) / topRelayRanking.length;

  if (avgRelayRanking - avgIndRanking < -5) return 5;
  if (avgRelayRanking - avgIndRanking < -2) return 4;
  if (avgRelayRanking - avgIndRanking > 25) return 0;
  if (avgRelayRanking - avgIndRanking > 15) return 1;
  if (avgRelayRanking - avgIndRanking > 5) return 2;
  return 3;
};

const getStarsNight = (allResults: IAllViewResult[]): TypeStars => {
  if (!Array.isArray(allResults) || allResults.length === 0) return -1;

  const topDayRanking = allResults
    .filter((r) => (r.deviantRaceLightCondition ? r.deviantRaceLightCondition : r.raceLightCondition) === 'Day')
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 10);
  if (topDayRanking.length === 0) return -1;
  const avgDayRanking = topDayRanking.map((r) => r.ranking!).reduce((a, b) => a + b, 0) / topDayRanking.length;

  const topNightRanking = allResults
    .filter((r) =>
      ['Night', 'Dusk', 'Dawn'].includes(
        r.deviantRaceLightCondition ? r.deviantRaceLightCondition : r.raceLightCondition,
      ),
    )
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 2);
  if (topNightRanking.length === 0) return -1;
  const avgNightRanking = topNightRanking.map((r) => r.ranking!).reduce((a, b) => a + b, 0) / topNightRanking.length;

  if (avgNightRanking - avgDayRanking < -5) return 5;
  if (avgNightRanking - avgDayRanking < -2) return 4;
  if (avgNightRanking - avgDayRanking > 25) return 0;
  if (avgNightRanking - avgDayRanking > 15) return 1;
  if (avgNightRanking - avgDayRanking > 5) return 2;
  return 3;
};

const getStarsShape = (allResults: IAllViewResult[]): TypeStars => {
  if (!Array.isArray(allResults) || allResults.length < 5) return -1;

  const breakDate1 = dayjs().subtract(1, 'months').format('YYYY-MM-DD');
  const breakDate2 = dayjs().subtract(2, 'months').format('YYYY-MM-DD');
  const breakDate3 = dayjs().subtract(3, 'months').format('YYYY-MM-DD');
  const recent1Ranking = allResults
    .filter((r) => r.raceDate >= breakDate1)
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 4);
  const recent2Ranking = allResults
    .filter((r) => r.raceDate >= breakDate2 && r.raceDate < breakDate1)
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 4);
  const recent3Ranking = allResults
    .filter((r) => r.raceDate >= breakDate3 && r.raceDate < breakDate2)
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 4);
  const old3Ranking = allResults
    .filter((r) => r.raceDate < breakDate3)
    .sort((a, b) => a.ranking! - b.ranking!)
    .slice(0, 12);
  if (recent1Ranking.length + recent2Ranking.length + recent3Ranking.length < 2 || old3Ranking.length < 2) return -1;

  let recentRanking = recent1Ranking;
  let oldRanking = old3Ranking;

  if (recent1Ranking.length >= 3) {
    oldRanking = [...recent2Ranking, ...recent3Ranking, ...old3Ranking];
  } else if (recent1Ranking.length + recent2Ranking.length >= 3) {
    recentRanking = [...recent1Ranking, ...recent2Ranking];
    oldRanking = [...recent3Ranking, ...old3Ranking];
  } else {
    recentRanking = [...recent1Ranking, ...recent2Ranking, ...recent3Ranking];
  }

  recentRanking = recentRanking.sort((a, b) => a.ranking! - b.ranking!).slice(0, 4);
  recentRanking = recentRanking.slice(0, recentRanking.length <= 2 ? 1 : 2);
  oldRanking = oldRanking.sort((a, b) => a.ranking! - b.ranking!).slice(0, old3Ranking.length >= 6 ? 12 : 4);
  const avgRecentRanking = recentRanking.map((r) => r.ranking!).reduce((a, b) => a + b, 0) / recentRanking.length;
  const avgOldRanking = oldRanking.map((r) => r.ranking!).reduce((a, b) => a + b, 0) / oldRanking.length;

  if (avgRecentRanking - avgOldRanking < -8) return 5;
  if (avgRecentRanking - avgOldRanking < -3) return 4;
  if (avgRecentRanking - avgOldRanking > 15) return 0;
  if (avgRecentRanking - avgOldRanking > 8) return 1;
  if (avgRecentRanking - avgOldRanking > 3) return 2;
  return 3;
};

const getFavoriteDistance = (allResults: IAllViewResult[]): number | undefined => {
  const countTop25Percentage = Math.min(4, Math.max(1, Math.round(allResults.length / 4)));

  if (allResults.length === 0) return undefined;

  const top25Percentage = [...allResults].sort((a, b) => a.ranking! - b.ranking!).slice(0, countTop25Percentage);
  const distances = top25Percentage
    .map((r) => r.raceDistance)
    .filter((value, index, self) => self.indexOf(value) === index)
    .map((raceDistance) => ({
      raceDistance: raceDistance,
      nof: top25Percentage.filter((r) => r.raceDistance === raceDistance).length,
      lengthInMeter: top25Percentage
        .filter((r) => r.raceDistance === raceDistance)
        .map((r) => r.lengthInMeter!)
        .reduce((a, b) => a + b, 0),
      ranking: top25Percentage
        .filter((r) => r.raceDistance === raceDistance)
        .map((r) => r.ranking!)
        .reduce((a, b) => a + b, 0),
    }));
  const favorite = distances.sort((a, b) => b.ranking / b.nof - a.ranking / a.nof)[0];

  return Math.round(favorite.lengthInMeter / (100 * favorite.nof)) * 100;
};

interface ICompetitorPresentationProps {
  competitor: ICompetitor;
  ranking: number;
}
const CompetitorPresentation = observer(({ competitor, ranking }: ICompetitorPresentationProps) => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [starsRank] = useState<TypeStars>(getStarsRank(competitor.gender, ranking));
  const [starsImportant, setStarsImportant] = useState<TypeStars>(-1);
  const [starsStability, setStarsStability] = useState<TypeStars>(-1);
  const [starsTechnical, setStarsTechnical] = useState<TypeStars>(-1);
  const [starsSpeed, setStarsSpeed] = useState<TypeStars>(-1);
  const [starsRelay, setStarsRelay] = useState<TypeStars>(-1);
  const [starsNight, setStarsNight] = useState<TypeStars>(-1);
  const [starsShape, setStarsShape] = useState<TypeStars>(-1);
  const [favoriteDistance, setFavoriteDistance] = useState<number | undefined>();

  useEffect(() => {
    const fromDate = dayjs().add(1, 'days').subtract(2, 'years').format('YYYY-MM-DD');
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      {
        iType: 'COMPETITOR',
        iFromDate: fromDate,
        iCompetitorId: competitor.competitorId,
      },
      true,
      sessionModel.authorizationHeader,
    )
      .then(
        (c: {
          results: (IViewResult & IViewResultRaceInfo)[];
          teamResults: (IViewTeamResult & IViewResultRaceInfo)[];
        }) => {
          const results = c.results;
          const teamResults = c.teamResults;
          const allResults = [...results, ...teamResults]
            .map(
              (r): IAllViewResult => ({
                ...r,
                levelRanking: ['A', 'B', 'C', 'D'].includes(r.eventClassificationId)
                  ? 0
                  : ['E', 'F'].includes(r.eventClassificationId)
                    ? 10
                    : 20,
              }),
            )
            .filter((r) => r.ranking != null);
          setStarsImportant(getStarsImportant(allResults));
          setStarsStability(getStarsStability(allResults));
          setStarsSpeed(getStarsSpeed(allResults, competitor.gender));
          setStarsTechnical(getStarsTechnical(allResults, competitor.gender));
          setStarsRelay(getStarsRelay(results, teamResults));
          setStarsNight(getStarsNight(allResults));
          setStarsShape(getStarsShape(allResults));
          setFavoriteDistance(getFavoriteDistance(allResults));
        },
      )
      .catch((e) => {
        if (e && e.message) {
          message.error(e.message);
        }
      });
  }, []);

  const totalStars =
    Math.max(0, starsRank ? starsRank : 0) +
    Math.max(0, starsImportant ? starsImportant : 0) +
    Math.max(0, starsStability ? starsStability : 0) +
    Math.max(0, starsTechnical ? starsTechnical : 0) +
    Math.max(0, starsSpeed ? starsSpeed : 0) +
    Math.max(0, starsRelay ? starsRelay : 0) +
    Math.max(0, starsNight ? starsNight : 0) +
    Math.max(0, starsShape ? starsShape : 0);

  return totalStars > 0 ? (
    <StyledCard title={<CompetitorTitle competitor={competitor} />} bordered={true} loading={false}>
      <FiveStars key="starsRank" label={t('competitor.StarsRank')} stars={starsRank} />
      <FiveStars key="starsImportant" label={t('competitor.StarsImportant')} stars={starsImportant} />
      <FiveStars key="starsStability" label={t('competitor.StarsStability')} stars={starsStability} />
      <FiveStars key="starsTechnical" label={t('competitor.StarsTechnical')} stars={starsTechnical} />
      <FiveStars key="starsSpeed" label={t('competitor.StarsSpeed')} stars={starsSpeed} />
      <FiveStars key="starsRelay" label={t('competitor.StarsRelay')} stars={starsRelay} />
      <FiveStars key="starsNight" label={t('competitor.StarsNight')} stars={starsNight} />
      <FiveStars key="starsShape" label={t('competitor.StarsShape')} stars={starsShape} />
      <ContainerDiv>
        <LabelDiv>{t('competitor.FavoriteDistance')}</LabelDiv>
        <StarsDiv>
          {favoriteDistance === undefined ? (
            <Loader />
          ) : (
            <InfoDiv>{favoriteDistance > 0 ? `${favoriteDistance} m` : '-'}</InfoDiv>
          )}
        </StarsDiv>
      </ContainerDiv>
    </StyledCard>
  ) : null;
});

export default CompetitorPresentation;
