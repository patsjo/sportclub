import {
  IRaceEventProps,
  IRaceResultMultiDayProps,
  IRaceResultProps,
  IRaceTeamResultProps
} from '../models/resultModel';
import { ManuallyEditedMissingTimePostfix } from './resultConstants';

/** What the auto completion of a saved race did */
export interface IAutoCompleteSummary {
  /** Saved results that got at least one value */
  completedResults: number;
  /** Values filled in, the missing times not counted */
  filledValues: number;
  /** Results with a new missing time, calculated again from the split times */
  missingTimesUpdated: number;
  /** Runners of the club in the result list that the saved race does not have, they are not added */
  notInSavedCompetitorIds: number[];
}

const isMissing = (value: unknown) => value == null || value === '';
/** A course length of 0 is no length */
const isMissingLength = (value: unknown) => isMissing(value) || value === 0;

const eventKeys = [
  'organiserName',
  'raceTime',
  'raceLightCondition',
  'raceDistance',
  'longitude',
  'latitude'
] as const satisfies readonly (keyof IRaceEventProps)[];

const resultKeys = [
  'classClassificationId',
  'difficulty',
  'competitorTime',
  'winnerTime',
  'secondTime',
  'position',
  'nofStartsInClass'
] as const satisfies readonly (keyof IRaceResultProps)[];

const teamResultKeys = [
  'classClassificationId',
  'difficulty',
  'teamName',
  'competitorTime',
  'winnerTime',
  'secondTime',
  'position',
  'nofStartsInClass',
  'deltaPositions',
  'deltaTimeBehind',
  'totalStagePosition',
  'totalStageTimeBehind',
  'totalPosition',
  'totalNofStartsInClass',
  'totalTimeBehind'
] as const satisfies readonly (keyof IRaceTeamResultProps)[];

const multiDayKeys = [
  'totalLengthInMeter',
  'totalFailedReason',
  'totalTime',
  'totalWinnerTime',
  'totalSecondTime',
  'totalPosition',
  'totalNofStartsInClass'
] as const satisfies readonly (keyof IRaceResultMultiDayProps)[];

/** The missing values of target taken from source, returns how many */
const fillMissing = <T extends object>(target: T, source: T, keys: readonly (keyof T)[]): number => {
  let filled = 0;
  keys.forEach(key => {
    if (isMissing(target[key]) && !isMissing(source[key])) {
      target[key] = source[key];
      filled++;
    }
  });
  return filled;
};

const fillLength = (target: { lengthInMeter?: number | null }, source: { lengthInMeter?: number | null }) => {
  if (isMissingLength(target.lengthInMeter) && !isMissingLength(source.lengthInMeter)) {
    target.lengthInMeter = source.lengthInMeter;
    return 1;
  }
  return 0;
};

/** A time without the fraction of a second, the database saves 00:06:30 as 00:06:30.0000 */
const timeInSeconds = (time: string | null | undefined) => (time == null ? time : time.split('.')[0]);

/** The missing time calculated again, not when it was edited by hand or the split times are missing */
const updateMissingTime = (target: { missingTime?: string | null }, source: { missingTime?: string | null }) => {
  if (target.missingTime?.endsWith(ManuallyEditedMissingTimePostfix) || source.missingTime == null) return 0;
  if (timeInSeconds(target.missingTime) === timeInSeconds(source.missingTime)) return 0;
  target.missingTime = source.missingTime;
  return 1;
};

/** The total of an event of several days, an event of one day has no total */
const fillMultiDay = (target: IRaceResultProps, source: IRaceResultProps): number => {
  const sourceMultiDay = source.resultMultiDay;
  if (!sourceMultiDay || !(sourceMultiDay.totalStages > 1)) return 0;
  if (!target.resultMultiDay) {
    target.resultMultiDay = { ...sourceMultiDay };
    return multiDayKeys.filter(key => !isMissing(sourceMultiDay[key])).length;
  }
  const multiDay = { ...target.resultMultiDay };
  const filled = fillMissing(multiDay, sourceMultiDay, multiDayKeys);
  if (filled > 0) target.resultMultiDay = multiDay;
  return filled;
};

/**
 * The saved race with the values it misses taken from the race just read from the result list (e.g. course lengths,
 * the total of an event of several days), and the missing times calculated again. Nothing saved is changed except
 * the missing times that were not edited by hand, and no results are added or removed.
 */
export const AutoCompleteRaceEvent = (
  saved: IRaceEventProps,
  source: IRaceEventProps
): { raceEvent: IRaceEventProps; summary: IAutoCompleteSummary } => {
  const summary: IAutoCompleteSummary = {
    completedResults: 0,
    filledValues: 0,
    missingTimesUpdated: 0,
    notInSavedCompetitorIds: []
  };
  const raceEvent: IRaceEventProps = {
    ...saved,
    results: saved.results.map(result => ({
      ...result,
      resultMultiDay: result.resultMultiDay ? { ...result.resultMultiDay } : result.resultMultiDay
    })),
    teamResults: saved.teamResults.map(result => ({ ...result }))
  };
  summary.filledValues += fillMissing(raceEvent, source, eventKeys);
  if (isMissing(raceEvent.eventorRaceId) && !isMissing(source.eventorRaceId))
    raceEvent.eventorRaceId = source.eventorRaceId;

  raceEvent.results.forEach(result => {
    const sourceResult = source.results.find(r => r.competitorId === result.competitorId);
    if (!sourceResult) return;
    const filled =
      fillLength(result, sourceResult) +
      fillMissing(result, sourceResult, resultKeys) +
      fillMultiDay(result, sourceResult);
    const missingTimeUpdated = updateMissingTime(result, sourceResult);
    summary.filledValues += filled;
    summary.missingTimesUpdated += missingTimeUpdated;
    if (filled > 0) summary.completedResults++;
  });
  summary.notInSavedCompetitorIds.push(
    ...source.results
      .filter(r => r.competitorId > 0 && !raceEvent.results.some(saved => saved.competitorId === r.competitorId))
      .map(r => r.competitorId)
  );

  raceEvent.teamResults.forEach(result => {
    const sourceResult =
      source.teamResults.find(
        r => r.competitorId === result.competitorId && r.stage === result.stage && r.className === result.className
      ) ?? source.teamResults.find(r => r.competitorId === result.competitorId && r.stage === result.stage);
    if (!sourceResult) return;
    const filled = fillLength(result, sourceResult) + fillMissing(result, sourceResult, teamResultKeys);
    const missingTimeUpdated = updateMissingTime(result, sourceResult);
    summary.filledValues += filled;
    summary.missingTimesUpdated += missingTimeUpdated;
    if (filled > 0) summary.completedResults++;
  });
  summary.notInSavedCompetitorIds.push(
    ...source.teamResults
      .filter(
        r =>
          r.competitorId > 0 &&
          !raceEvent.teamResults.some(saved => saved.competitorId === r.competitorId && saved.stage === r.stage)
      )
      .map(r => r.competitorId)
  );

  return { raceEvent, summary };
};

/**
 * The total course lengths missing in an event of several days: the length of this stage and of the earlier stages
 * of the runner. Only when all the earlier stages are there and have a length.
 */
export const MissingTotalLengths = (
  results: Pick<IRaceResultProps, 'resultId' | 'competitorId' | 'lengthInMeter' | 'resultMultiDay'>[],
  earlierStages: { results: { competitorId: number; lengthInMeter?: number | null }[] }[]
): { resultId: number; totalLengthInMeter: number }[] => {
  const lengths: { resultId: number; totalLengthInMeter: number }[] = [];
  results.forEach(result => {
    const multiDay = result.resultMultiDay;
    if (!multiDay || !isMissingLength(multiDay.totalLengthInMeter) || !result.lengthInMeter) return;
    if (earlierStages.length !== multiDay.stage - 1) return;
    let total = result.lengthInMeter;
    for (const stage of earlierStages) {
      const length = stage.results.find(r => r.competitorId === result.competitorId)?.lengthInMeter;
      if (!length) return;
      total += length;
    }
    lengths.push({ resultId: result.resultId, totalLengthInMeter: total });
  });
  return lengths;
};
