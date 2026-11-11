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
    expect(raceWizard.raceWinnerResultOptions[0].description).toBe('00:05:27.869, Jukolan Viesti - 7');
  });
});
