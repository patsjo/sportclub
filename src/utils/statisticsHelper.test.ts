import { describe, expect, it } from 'vitest';
import { IEventLocation, IMedalListItem } from '../components/charts/ChartInterface';
import { GetMedalListSelection, GetYears, HasCoordinates } from './statisticsHelper';

const medal = (key: string, year: number, position: number, raceDate = `${year}-06-01`): IMedalListItem => ({
  key,
  eventId: 1,
  year,
  raceDate,
  eventName: 'SM',
  sportCode: 'OL',
  raceDistance: 'Long',
  className: 'H21',
  position,
  teamName: null,
  names: ['Test Person'],
  legs: []
});

describe('GetMedalListSelection', () => {
  it('shows only medals when there are at least three', () => {
    const medals = [medal('a', 2020, 1), medal('b', 2021, 2), medal('c', 2022, 3), medal('d', 2022, 4)];
    const selection = GetMedalListSelection(medals);
    expect(selection.positionLimit).toBe(3);
    expect(selection.items.map(m => m.key)).toEqual(['a', 'b', 'c']);
  });

  it('widens to top 6, 10 ... until at least three rows for all years', () => {
    const medals = [medal('a', 2022, 2), medal('b', 2021, 5), medal('c', 2020, 9), medal('d', 2022, 14)];
    const selection = GetMedalListSelection(medals);
    expect(selection.positionLimit).toBe(10);
    expect(selection.items.map(m => m.key)).toEqual(['a', 'b', 'c']);
  });

  it('stops at top 30 even with fewer than three rows', () => {
    const selection = GetMedalListSelection([medal('a', 2022, 28), medal('b', 2021, 31)]);
    expect(selection.positionLimit).toBe(30);
    expect(selection.items.map(m => m.key)).toEqual(['a']);
  });

  it('shows all of top 30 for a selected year', () => {
    const medals = [medal('a', 2022, 1), medal('b', 2022, 2), medal('c', 2022, 3), medal('d', 2022, 30)];
    const selection = GetMedalListSelection([...medals, medal('e', 2022, 31), medal('f', 2021, 4)], 2022);
    expect(selection.positionLimit).toBe(30);
    expect(selection.items.map(m => m.key)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters by year and sorts by position, then latest race', () => {
    const medals = [
      medal('old', 2022, 1, '2022-03-01'),
      medal('new', 2022, 1, '2022-09-01'),
      medal('silver', 2022, 2),
      medal('other-year', 2021, 1)
    ];
    expect(GetMedalListSelection(medals, 2022).items.map(m => m.key)).toEqual(['new', 'old', 'silver']);
  });
});

describe('HasCoordinates', () => {
  const location = (longitude: number | null, latitude: number | null): IEventLocation => ({
    eventId: 1,
    year: 2022,
    name: 'Test',
    longitude,
    latitude,
    starts: 1
  });

  it('rejects missing, zero and out of range coordinates', () => {
    expect(HasCoordinates(location(14.8, 56.9))).toBe(true);
    expect(HasCoordinates(location(null, 56.9))).toBe(false);
    expect(HasCoordinates(location(0, 0))).toBe(false);
    expect(HasCoordinates(location(14.8, 156.9))).toBe(false);
  });
});

describe('GetYears', () => {
  it('returns distinct years latest first', () => {
    expect(GetYears([{ year: 2020 }, { year: 2022 }, { year: 2020 }])).toEqual([2022, 2020]);
  });
});
