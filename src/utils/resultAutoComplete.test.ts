import { describe, expect, it } from 'vitest';
import { IRaceEventProps, IRaceResultProps, IRaceTeamResultProps } from '../models/resultModel';
import { AutoCompleteRaceEvent, MissingTotalLengths } from './resultAutoComplete';

const raceEvent = (values: Partial<IRaceEventProps>): IRaceEventProps => ({
  eventId: 10,
  eventorId: 100,
  eventorRaceId: 1000,
  sportCode: 'OL',
  isRelay: false,
  eventClassificationId: 'I',
  paymentModel: 0,
  meetsAwardRequirements: true,
  invoiceVerified: false,
  results: [],
  teamResults: [],
  ...values
});

const result = (values: Partial<IRaceResultProps>): IRaceResultProps => ({
  resultId: 1,
  competitorId: 5,
  className: 'H50',
  ...values
});

const teamResult = (values: Partial<IRaceTeamResultProps>): IRaceTeamResultProps => ({
  teamResultId: 1,
  competitorId: 5,
  className: 'H135',
  stage: 2,
  totalStages: 3,
  ...values
});

describe('AutoCompleteRaceEvent', () => {
  it('fills in only what the saved race misses', () => {
    const saved = raceEvent({
      raceLightCondition: null,
      raceDistance: 'Long',
      results: [
        result({
          resultId: 1,
          competitorId: 5,
          lengthInMeter: null,
          competitorTime: '00:58:27',
          winnerTime: '00:45:14',
          position: 5,
          feeToClub: 0,
          award: 'UJ'
        })
      ]
    });
    const source = raceEvent({
      eventId: -1,
      raceLightCondition: 'Day',
      raceDistance: 'Middle',
      results: [
        result({
          resultId: -1,
          competitorId: 5,
          lengthInMeter: 6320,
          competitorTime: '00:58:28',
          winnerTime: '00:45:14',
          secondTime: '00:46:00',
          position: 6,
          feeToClub: 100,
          award: null
        })
      ]
    });
    const { raceEvent: completed, summary } = AutoCompleteRaceEvent(saved, source);
    expect(completed.eventId).toBe(10);
    expect(completed.raceLightCondition).toBe('Day');
    expect(completed.raceDistance).toBe('Long');
    const [completedResult] = completed.results;
    expect(completedResult.resultId).toBe(1);
    expect(completedResult.lengthInMeter).toBe(6320);
    expect(completedResult.secondTime).toBe('00:46:00');
    expect(completedResult.competitorTime).toBe('00:58:27');
    expect(completedResult.position).toBe(5);
    expect(completedResult.feeToClub).toBe(0);
    expect(completedResult.award).toBe('UJ');
    expect(summary).toMatchObject({ completedResults: 1, filledValues: 3 });
    // The saved race is not changed
    expect(saved.results[0].lengthInMeter).toBeNull();
  });

  it('calculates the missing time again, unless edited by hand or without split times', () => {
    const saved = raceEvent({
      results: [
        result({ resultId: 1, competitorId: 1, missingTime: '00:06:30' }),
        result({ resultId: 2, competitorId: 2, missingTime: '00:00:35.0001' }),
        result({ resultId: 3, competitorId: 3, missingTime: '00:02:00' }),
        result({ resultId: 4, competitorId: 4, missingTime: '00:03:15.0000' })
      ]
    });
    const source = raceEvent({
      results: [
        result({ competitorId: 1, missingTime: '00:05:10' }),
        result({ competitorId: 2, missingTime: '00:01:00' }),
        result({ competitorId: 3, missingTime: null }),
        result({ competitorId: 4, missingTime: '00:03:15' })
      ]
    });
    const { raceEvent: completed, summary } = AutoCompleteRaceEvent(saved, source);
    expect(completed.results.map(r => r.missingTime)).toEqual([
      '00:05:10',
      '00:00:35.0001',
      '00:02:00',
      '00:03:15.0000'
    ]);
    expect(summary.missingTimesUpdated).toBe(1);
  });

  it('adds the total of an event of several days, not of an event of one day', () => {
    const multiDay = {
      multiDayResultId: -1,
      stage: 2,
      totalStages: 2,
      totalTime: '01:58:46',
      totalPosition: 3,
      totalNofStartsInClass: 23
    };
    const saved = raceEvent({
      results: [
        result({ competitorId: 1, resultMultiDay: null }),
        result({ competitorId: 2, resultMultiDay: null }),
        result({ competitorId: 3, resultMultiDay: { ...multiDay, multiDayResultId: 7, totalTime: null } })
      ]
    });
    const source = raceEvent({
      results: [
        result({ competitorId: 1, resultMultiDay: multiDay }),
        result({ competitorId: 2, resultMultiDay: { ...multiDay, stage: 1, totalStages: 1 } }),
        result({ competitorId: 3, resultMultiDay: multiDay })
      ]
    });
    const { raceEvent: completed } = AutoCompleteRaceEvent(saved, source);
    expect(completed.results[0].resultMultiDay).toEqual(multiDay);
    expect(completed.results[1].resultMultiDay).toBeNull();
    expect(completed.results[2].resultMultiDay).toMatchObject({ multiDayResultId: 7, totalTime: '01:58:46' });
  });

  it('completes relay legs by runner and leg, and tells the runners not saved', () => {
    const saved = raceEvent({
      isRelay: true,
      teamResults: [teamResult({ competitorId: 5, stage: 2, lengthInMeter: null, totalPosition: null })]
    });
    const source = raceEvent({
      isRelay: true,
      teamResults: [
        teamResult({ competitorId: 5, stage: 1, lengthInMeter: 4000, totalPosition: 9 }),
        teamResult({ competitorId: 5, stage: 2, lengthInMeter: 5040, totalPosition: 2 }),
        teamResult({ competitorId: 6, stage: 3, lengthInMeter: 6000 })
      ]
    });
    const { raceEvent: completed, summary } = AutoCompleteRaceEvent(saved, source);
    expect(completed.teamResults).toHaveLength(1);
    expect(completed.teamResults[0]).toMatchObject({ lengthInMeter: 5040, totalPosition: 2 });
    expect(summary.notInSavedCompetitorIds).toEqual([5, 6]);
  });
});

describe('MissingTotalLengths', () => {
  const multiDay = { multiDayResultId: 1, stage: 3, totalStages: 3, totalLengthInMeter: null };
  it('sums the lengths of all the stages of the runner', () => {
    const results = [
      result({ resultId: 1, competitorId: 1, lengthInMeter: 6650, resultMultiDay: multiDay }),
      result({ resultId: 2, competitorId: 2, lengthInMeter: 5000, resultMultiDay: multiDay }),
      result({
        resultId: 3,
        competitorId: 3,
        lengthInMeter: 5000,
        resultMultiDay: { ...multiDay, totalLengthInMeter: 1 }
      })
    ];
    const earlier = [
      {
        results: [
          { competitorId: 1, lengthInMeter: 6675 },
          { competitorId: 2, lengthInMeter: 4000 }
        ]
      },
      { results: [{ competitorId: 1, lengthInMeter: 3000 }] }
    ];
    expect(MissingTotalLengths(results, earlier)).toEqual([{ resultId: 1, totalLengthInMeter: 16325 }]);
    // An earlier stage missing, the total is not known
    expect(MissingTotalLengths(results, earlier.slice(0, 1))).toEqual([]);
  });
});
