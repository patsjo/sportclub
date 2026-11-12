import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { describe, expect, it } from 'vitest';
import { difficulties } from '../utils/resultConstants';
import { RaceWizard } from './resultWizardModel';

dayjs.extend(customParseFormat);

describe('the winner of a leg, for the ranking', () => {
  const wizard = () => {
    const raceWizard = new RaceWizard({});
    raceWizard.setRaceWinnerResults([
      {
        id: 0,
        personName: 'Aatu Marttinen',
        className: 'Jukolan Viesti - 7',
        difficulty: difficulties.black,
        winnerTime: '00:34:05'
      }
    ]);
    return raceWizard;
  };

  it('has a speed when the length is set by hand, and keeps the winner', () => {
    const winner = wizard().raceWinnerResults[0];
    winner.setLengthInMeter(6100);
    expect(winner.timePerKilometer).toBe('00:05:35.246');
    expect(winner.personName).toBe('Aatu Marttinen');
    // The same time again is still the winner
    winner.setWinnerTime('00:34:05');
    expect(winner.personName).toBe('Aatu Marttinen');
  });

  it('has no winner when the time is changed, the speed is of the new time', () => {
    const raceWizard = wizard();
    const winner = raceWizard.raceWinnerResults[0];
    winner.setLengthInMeter(6100);
    winner.setWinnerTime('00:33:20');
    expect(winner.personName).toBe('');
    expect(winner.timePerKilometer).toBe('00:05:27.869');
    expect(raceWizard.raceWinnerResultOptions[0].description).toBe('00:05:27.869, Jukolan Viesti - 7, 6,1 km');
  });
});

describe('the winners of all classes, for the ranking', () => {
  const winners = () => {
    const raceWizard = new RaceWizard({});
    raceWizard.setRaceWinnerResults([
      {
        id: 0,
        personName: 'Anna Andersson',
        className: 'W21E',
        difficulty: null,
        lengthInMeter: 6000,
        winnerTime: '00:36:00',
        secondsPerKilometer: 360,
        timePerKilometer: '00:06:00.000'
      },
      {
        id: 1,
        personName: 'Erik Ek',
        className: 'H21',
        difficulty: difficulties.black,
        lengthInMeter: 8000,
        winnerTime: '00:40:00',
        secondsPerKilometer: 300,
        timePerKilometer: '00:05:00.000'
      },
      { id: 2, personName: 'Kalle Kort', className: 'M10', difficulty: difficulties.green, winnerTime: '00:15:00' },
      {
        id: 3,
        personName: 'Bo Berg',
        className: 'Men Elite',
        difficulty: null,
        lengthInMeter: 10400,
        winnerTime: '00:52:00',
        secondsPerKilometer: 300,
        timePerKilometer: '00:05:00.000'
      }
    ]);
    return raceWizard;
  };

  it('has the ranking classes by themselves', () => {
    expect(winners().raceWinnerResultOptions.map(option => option.description)).toEqual([
      '00:05:00.000, H21, Erik Ek, 8,0 km'
    ]);
  });

  it('has the other classes by name, also those the club has no level for', () => {
    expect(winners().otherRaceWinnerResultOptions.map(option => [option.description, option.disabled])).toEqual([
      ['M10, Kalle Kort, 00:15:00', true],
      ['00:05:00.000, Men Elite, Bo Berg, 10,4 km', false],
      ['00:06:00.000, W21E, Anna Andersson, 6,0 km', false]
    ]);
  });
});
