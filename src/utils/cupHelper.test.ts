import { describe, expect, it } from 'vitest';
import { defaultSeasonSettings, ICupResultProps, ICupSeasonSettings } from '../models/cupModel';
import { IResultListType } from '../models/iof.xsd-3.0';
import {
  calculateCupPoints,
  calculateCupStandings,
  classMatchesCategory,
  cupAgeMatchesCategory,
  filterToCupClasses,
  formatCupTime,
  getCupRaceResultsByClass,
  getCurrentCupSeason,
  getNextCupRace,
  getScoredResults,
  iofResultListToCupResults,
  isDateInSeason,
  parseCupTime
} from './cupHelper';

let nextId = 1;
const result = (values: Partial<ICupResultProps>): ICupResultProps => ({
  cupResultId: nextId++,
  cupRaceId: 1,
  competitorId: null,
  eventorPersonId: null,
  personName: 'Okänd',
  birthYear: null,
  clubName: 'OK Orion',
  isClubMember: true,
  className: 'H12',
  status: 'OK',
  position: null,
  timeSeconds: null,
  timeBehindSeconds: null,
  nofStartsInClass: null,
  source: 'MANUAL',
  ...values
});

const settings = (values: Partial<ICupSeasonSettings> = {}): ICupSeasonSettings => ({
  ...defaultSeasonSettings(),
  ...values
});

describe('classMatchesCategory', () => {
  it('matches wildcards case insensitive', () => {
    expect(classMatchesCategory('H12', { classes: ['H1*'] })).toBe(true);
    expect(classMatchesCategory('h16k', { classes: ['H16*'] })).toBe(true);
    expect(classMatchesCategory('H21', { classes: ['H1*', 'D1*'] })).toBe(false);
    expect(classMatchesCategory('U2', { classes: ['U2'] })).toBe(true);
    expect(classMatchesCategory('U21', { classes: ['U2'] })).toBe(false);
    expect(classMatchesCategory('Anything', { classes: ['*'] })).toBe(true);
    expect(classMatchesCategory('Anything', { classes: [] })).toBe(true);
    expect(classMatchesCategory('H12 (Kort)', { classes: ['H12 (Kort)'] })).toBe(true);
  });
});

describe('filterToCupClasses', () => {
  it('keeps only the classes in the categories of the season', () => {
    const fetched = ['Kort', 'mellankort', 'Lång', 'H21', 'Inskolning', 'Öppen 5'].map(className =>
      result({ className })
    );
    const kept = filterToCupClasses(fetched, [{ classes: ['Kort', 'Mellankort', 'Lång'] }, { classes: ['Insk*'] }]);
    expect(kept.map(r => r.className)).toEqual(['Kort', 'mellankort', 'Lång', 'Inskolning']);
    // With age limits (the season starts 2026): too old is removed, an unknown year of birth is kept
    const youth = [{ classes: ['D1*', 'H1*', 'INSK'], maxAge: 14 }];
    const kids = [
      result({ className: 'D12', birthYear: 2014 }),
      result({ className: 'D16', birthYear: 2010 }),
      result({ className: 'H14', birthYear: 2012 }),
      result({ className: 'INSK', birthYear: 2020 }),
      result({ className: 'H10', birthYear: null })
    ];
    expect(filterToCupClasses(kids, youth, 2026).map(r => r.className)).toEqual(['D12', 'H14', 'INSK', 'H10']);
    // No categories, or a category for all classes, keeps everything
    expect(filterToCupClasses(fetched, [])).toHaveLength(6);
    expect(filterToCupClasses(fetched, [{ classes: ['*'] }])).toHaveLength(6);
  });
});

describe('age limits', () => {
  it('counts the age as in the orienteering classes, by the year of birth', () => {
    // Born 2010 is 16 in 2026, both limits are included
    expect(cupAgeMatchesCategory(2010, 2026, { maxAge: 16 })).toBe(true);
    expect(cupAgeMatchesCategory(2009, 2026, { maxAge: 16 })).toBe(false);
    expect(cupAgeMatchesCategory(2010, 2026, { minAge: 16, maxAge: 25 })).toBe(true);
    expect(cupAgeMatchesCategory(2001, 2026, { minAge: 16, maxAge: 25 })).toBe(true);
    expect(cupAgeMatchesCategory(2000, 2026, { minAge: 16, maxAge: 25 })).toBe(false);
    expect(cupAgeMatchesCategory(1991, 2026, { minAge: 35 })).toBe(true);
    expect(cupAgeMatchesCategory(1992, 2026, { minAge: 35 })).toBe(false);
    // No limit: everyone, also with unknown year of birth. A limit: not with unknown year of birth
    expect(cupAgeMatchesCategory(null, 2026, {})).toBe(true);
    expect(cupAgeMatchesCategory(null, 2026, { maxAge: 16 })).toBe(false);
  });

  it('puts a person in the age category for the whole season, also races without the year of birth', () => {
    const races = [
      { cupRaceId: 1, raceDate: '2026-11-05' },
      { cupRaceId: 2, raceDate: '2027-01-14' }
    ];
    const youth = { id: 'u16', name: 'Under 16', classes: ['*'], groupByClass: false, maxAge: 16 };
    const standings = calculateCupStandings(
      races,
      [
        result({
          cupRaceId: 1,
          eventorPersonId: 1,
          personName: 'Ung',
          className: 'Kort',
          birthYear: 2010,
          position: 1
        }),
        // Entered on site in race 2, no year of birth, the same person by name and club
        result({ cupRaceId: 2, personName: 'Ung', className: 'Kort', position: 1 }),
        result({
          cupRaceId: 1,
          eventorPersonId: 2,
          personName: 'Vuxen',
          className: 'Kort',
          birthYear: 1980,
          position: 2
        }),
        result({ cupRaceId: 1, eventorPersonId: 3, personName: 'Okänd ålder', className: 'Kort', position: 3 })
      ],
      settings({ categories: [youth] }),
      2026
    );
    const rows = standings[0].groups[0].rows;
    expect(rows.map(r => r.personName)).toEqual(['Ung']);
    expect(rows[0].totalPoints).toBe(25 + 25);
  });

  it('reads the year of birth from Eventor', () => {
    const list = {
      '@attributes': { iofVersion: '3.0' },
      Event: { Name: 'Test' },
      ClassResult: [
        {
          Class: { Name: 'Kort' },
          PersonResult: [
            {
              Person: { Id: ['1'], Name: { Given: 'A', Family: 'B' }, BirthDate: '2010-05-04' },
              Result: [{ Status: 'OK', Position: 1, Time: 1000 }]
            },
            {
              Person: { Id: ['2'], Name: { Given: 'C', Family: 'D' } },
              Result: [{ Status: 'OK', Position: 2, Time: 1100 }]
            }
          ]
        }
      ]
    } as unknown as IResultListType;
    expect(iofResultListToCupResults(list, 1, null, false, 288).map(r => r.birthYear)).toEqual([2010, null]);
  });
});

describe('calculateCupPoints', () => {
  const base = { status: 'OK' as const, scoredNofStarts: 10, scoredTimeBehindSeconds: null, timeSeconds: null };

  it('uses the position table, and the minimum outside it', () => {
    const ps = { ...defaultSeasonSettings().pointSystem, positionPoints: [20, 17, 15, 14], minPoints: 2 };
    expect(calculateCupPoints({ ...base, scoredPosition: 1 }, ps)).toBe(20);
    expect(calculateCupPoints({ ...base, scoredPosition: 3 }, ps)).toBe(15);
    expect(calculateCupPoints({ ...base, scoredPosition: 9 }, ps)).toBe(2);
  });

  it('gives null for not started and not finished points for DNF/MP', () => {
    const ps = { ...defaultSeasonSettings().pointSystem, notFinishedPoints: 3 };
    expect(calculateCupPoints({ ...base, status: 'DNS', scoredPosition: null }, ps)).toBeNull();
    expect(calculateCupPoints({ ...base, status: 'MP', scoredPosition: null }, ps)).toBe(3);
    expect(calculateCupPoints({ ...base, status: 'DNF', scoredPosition: null }, ps)).toBe(3);
  });

  it('gives the minimum for finished without position', () => {
    const ps = { ...defaultSeasonSettings().pointSystem, minPoints: 5 };
    expect(calculateCupPoints({ ...base, scoredPosition: null }, ps)).toBe(5);
  });

  it('handles fixed winner points', () => {
    const ps = {
      ...defaultSeasonSettings().pointSystem,
      type: 'WINNER_FIXED' as const,
      winnerPoints: 50,
      decreasePerPosition: 5,
      minPoints: 10
    };
    expect(calculateCupPoints({ ...base, scoredPosition: 1 }, ps)).toBe(50);
    expect(calculateCupPoints({ ...base, scoredPosition: 4 }, ps)).toBe(35);
    expect(calculateCupPoints({ ...base, scoredPosition: 20 }, ps)).toBe(10);
  });

  it('handles points from the number of starters', () => {
    const ps = { ...defaultSeasonSettings().pointSystem, type: 'NOF_STARTS' as const, minPoints: 1 };
    expect(calculateCupPoints({ ...base, scoredPosition: 1 }, ps)).toBe(10);
    expect(calculateCupPoints({ ...base, scoredPosition: 10 }, ps)).toBe(1);
  });

  it('handles run to 1000', () => {
    const ps = {
      ...defaultSeasonSettings().pointSystem,
      type: 'RUN_TO_1000' as const,
      winnerPoints: 1000,
      minPoints: 30
    };
    expect(calculateCupPoints({ ...base, scoredPosition: 1, scoredNofStarts: 11 }, ps)).toBe(1000);
    expect(calculateCupPoints({ ...base, scoredPosition: 6, scoredNofStarts: 11 }, ps)).toBe(500);
    expect(calculateCupPoints({ ...base, scoredPosition: 11, scoredNofStarts: 11 }, ps)).toBe(30);
    expect(calculateCupPoints({ ...base, scoredPosition: 1, scoredNofStarts: 1 }, ps)).toBe(1000);
  });

  it('handles time behind and percent of winner', () => {
    const behind = {
      ...defaultSeasonSettings().pointSystem,
      type: 'TIME_BEHIND' as const,
      winnerPoints: 100,
      decreasePerMinute: 2,
      minPoints: 10
    };
    expect(calculateCupPoints({ ...base, scoredPosition: 2, scoredTimeBehindSeconds: 300 }, behind)).toBe(90);
    expect(calculateCupPoints({ ...base, scoredPosition: 9, scoredTimeBehindSeconds: 6000 }, behind)).toBe(10);

    const percent = { ...behind, type: 'PERCENT_OF_WINNER' as const, decimals: 1 };
    expect(
      calculateCupPoints({ ...base, scoredPosition: 2, scoredTimeBehindSeconds: 600, timeSeconds: 3000 }, percent)
    ).toBe(80);
    expect(
      calculateCupPoints({ ...base, scoredPosition: 2, scoredTimeBehindSeconds: 100, timeSeconds: 1300 }, percent)
    ).toBe(92.3);
  });
});

describe('getScoredResults', () => {
  const results = [
    result({ personName: 'Utan klubb', isClubMember: false, position: 1, timeSeconds: 1000, timeBehindSeconds: 0 }),
    result({ personName: 'Anna', position: 2, timeSeconds: 1100, timeBehindSeconds: 100, nofStartsInClass: 4 }),
    result({ personName: 'Bertil', position: 4, timeSeconds: 1300, timeBehindSeconds: 300, nofStartsInClass: 4 }),
    result({ personName: 'Cecilia', status: 'MP' }),
    result({ personName: 'David', status: 'DNS' })
  ];

  it('only includes club members and keeps the class positions', () => {
    const scored = getScoredResults(results, settings({ participants: 'CLUB', pointsBasis: 'ALL' }));
    expect(scored.map(r => r.personName)).not.toContain('Utan klubb');
    expect(scored.find(r => r.personName === 'Anna')?.scoredPosition).toBe(2);
    expect(scored.find(r => r.personName === 'Anna')?.points).toBe(20);
  });

  it('recalculates positions among club members', () => {
    const scored = getScoredResults(results, settings({ participants: 'CLUB', pointsBasis: 'CLUB' }));
    const anna = scored.find(r => r.personName === 'Anna')!;
    const bertil = scored.find(r => r.personName === 'Bertil')!;
    expect(anna.scoredPosition).toBe(1);
    expect(anna.scoredTimeBehindSeconds).toBe(0);
    expect(bertil.scoredPosition).toBe(2);
    expect(bertil.scoredTimeBehindSeconds).toBe(200);
    // Anna, Bertil and Cecilia started, David did not
    expect(anna.scoredNofStarts).toBe(3);
    expect(scored.find(r => r.personName === 'David')?.points).toBeNull();
  });

  it('includes everyone', () => {
    const scored = getScoredResults(results, settings({ participants: 'ALL' }));
    expect(scored.find(r => r.personName === 'Utan klubb')?.points).toBe(25);
  });

  it('gives equal positions for equal times among club members', () => {
    const scored = getScoredResults(
      [
        result({ personName: 'A', timeSeconds: 900 }),
        result({ personName: 'B', timeSeconds: 900 }),
        result({ personName: 'C', timeSeconds: 950 })
      ],
      settings({ participants: 'CLUB', pointsBasis: 'CLUB' })
    );
    expect(scored.map(r => r.scoredPosition)).toEqual([1, 1, 3]);
  });
});

describe('calculateCupStandings', () => {
  const races = [
    { cupRaceId: 1, raceDate: '2026-05-01' },
    { cupRaceId: 2, raceDate: '2026-05-08' },
    { cupRaceId: 3, raceDate: '2026-05-15' }
  ];
  const results = [
    result({ cupRaceId: 1, competitorId: 1, personName: 'Anna', position: 1, timeSeconds: 900 }),
    result({ cupRaceId: 1, competitorId: 2, personName: 'Bertil', position: 2, timeSeconds: 950 }),
    result({ cupRaceId: 2, competitorId: 1, personName: 'Anna', position: 3, timeSeconds: 900 }),
    result({ cupRaceId: 2, competitorId: 2, personName: 'Bertil', position: 1, timeSeconds: 850 }),
    result({ cupRaceId: 3, competitorId: 1, personName: 'Anna', position: 2, timeSeconds: 900 }),
    result({ cupRaceId: 3, competitorId: 3, personName: 'Cecilia', className: 'D12', position: 1, timeSeconds: 900 }),
    result({ cupRaceId: 99, competitorId: 3, personName: 'Cecilia', className: 'D12', position: 1, timeSeconds: 1 })
  ];

  it('sums all races per class', () => {
    const standings = calculateCupStandings(races, results, settings());
    const groups = standings[0].groups;
    expect(groups.map(g => g.title)).toEqual(['D12', 'H12']);
    const h12 = groups.find(g => g.title === 'H12')!;
    expect(h12.rows.map(r => [r.personName, r.totalPoints, r.rank])).toEqual([
      ['Anna', 25 + 17 + 20, 1],
      ['Bertil', 20 + 25, 2]
    ]);
    // Race 99 is not part of the season
    expect(groups.find(g => g.title === 'D12')!.rows[0].totalPoints).toBe(25);
  });

  it('counts only the best races and gives bonus for the extra finished races', () => {
    const standings = calculateCupStandings(
      races,
      results,
      settings({ maxRacesCounted: 2, bonusPointsPerExtraRace: 3 })
    );
    const anna = standings[0].groups.find(g => g.title === 'H12')!.rows.find(r => r.personName === 'Anna')!;
    expect(anna.races[2].counted).toBe(false);
    expect(anna.bonusPoints).toBe(3);
    expect(anna.totalPoints).toBe(25 + 20 + 3);
  });

  it('uses categories, with or without grouping by class', () => {
    const standings = calculateCupStandings(
      races,
      results,
      settings({ categories: [{ id: 'd', name: 'Damer', classes: ['D*'], groupByClass: false }] })
    );
    expect(standings[0].groups).toHaveLength(1);
    expect(standings[0].groups[0].title).toBe('Damer');
    expect(standings[0].groups[0].rows.map(r => r.personName)).toEqual(['Cecilia']);
  });

  it('is the same person in all races, also when a race has no Eventor id or another id', () => {
    const standings = calculateCupStandings(
      races,
      [
        // Eventor id in race 1, entered on site without id in race 2, club member id + Eventor id in race 3
        result({
          cupRaceId: 1,
          eventorPersonId: 555,
          personName: 'Elisabet Janner',
          clubName: 'Ronneby OK',
          position: 1
        }),
        result({ cupRaceId: 2, personName: 'elisabet  janner', clubName: 'Ronneby OK', position: 1 }),
        result({
          cupRaceId: 3,
          competitorId: 7,
          eventorPersonId: 555,
          personName: 'Elisabet Janner',
          clubName: 'Ronneby OK',
          position: 2
        }),
        // Without club, the name is unique in the season
        result({ cupRaceId: 1, eventorPersonId: 777, personName: 'Bo Berg', clubName: 'OK Orion', position: 2 }),
        result({ cupRaceId: 2, personName: 'Bo Berg', clubName: null, position: 2 }),
        // Same name in another club is another person
        result({ cupRaceId: 3, personName: 'Bo Berg', clubName: 'Annan OK', position: 3 })
      ],
      settings()
    );
    const rows = standings[0].groups[0].rows;
    const elisabet = rows.filter(r => r.personName.toLowerCase().includes('elisabet'));
    expect(elisabet).toHaveLength(1);
    expect(elisabet[0].totalPoints).toBe(25 + 25 + 20);
    const bo = rows.filter(r => r.personName === 'Bo Berg');
    expect(bo.map(r => r.totalPoints).sort((a, b) => b - a)).toEqual([40, 17]);
  });

  it('shows the classes in the chosen order, the others last in name order', () => {
    const classResults = ['H10', 'D12', 'H12', 'Kort', 'Lång'].map((className, i) =>
      result({ cupRaceId: 1, competitorId: 100 + i, personName: `P${i}`, className, position: 1 })
    );
    const titles = (classOrder: string[]) =>
      calculateCupStandings(races, classResults, settings({ classOrder }))[0].groups.map(g => g.title);
    expect(titles([])).toEqual(['D12', 'H10', 'H12', 'Kort', 'Lång']);
    expect(titles(['lång', 'Kort'])).toEqual(['Lång', 'Kort', 'D12', 'H10', 'H12']);
    // A class in the order without results is just skipped
    expect(titles(['H12', 'Finns inte', 'H10'])).toEqual(['H12', 'H10', 'D12', 'Kort', 'Lång']);
  });

  it('is the same class regardless of case and spaces, shown with the most used spelling', () => {
    const spelled = ['Mellankort', 'MellanKort', 'Mellankort ', 'mellankort'].map((className, i) =>
      result({
        cupRaceId: 1,
        competitorId: 200 + i,
        personName: `M${i}`,
        className,
        position: i + 1,
        timeSeconds: 900 + i
      })
    );
    const standings = calculateCupStandings(races, spelled, settings());
    expect(standings[0].groups).toHaveLength(1);
    expect(standings[0].groups[0].title).toBe('Mellankort');
    expect(standings[0].groups[0].rows).toHaveLength(4);
    const byClass = getCupRaceResultsByClass(1, spelled, settings());
    expect(byClass).toHaveLength(1);
    expect(byClass[0].className).toBe('Mellankort');
    // The positions among club members are calculated over the whole class
    const clubBasis = getScoredResults(spelled, settings({ participants: 'CLUB', pointsBasis: 'CLUB' }));
    expect(clubBasis.map(r => r.scoredPosition).sort()).toEqual([1, 2, 3, 4]);
  });

  it('shares the rank on equal points and equal results', () => {
    const standings = calculateCupStandings(
      races,
      [
        result({ cupRaceId: 1, competitorId: 1, personName: 'A', position: 1 }),
        result({ cupRaceId: 2, competitorId: 2, personName: 'B', position: 1 }),
        result({ cupRaceId: 3, competitorId: 3, personName: 'C', position: 2 })
      ],
      settings()
    );
    expect(standings[0].groups[0].rows.map(r => r.rank)).toEqual([1, 1, 3]);
  });
});

describe('time helpers', () => {
  it('formats and parses times', () => {
    expect(formatCupTime(65)).toBe('1:05');
    expect(formatCupTime(3725)).toBe('1:02:05');
    expect(formatCupTime(null)).toBe('');
    expect(parseCupTime('1:05')).toBe(65);
    expect(parseCupTime('1:02:05')).toBe(3725);
    expect(parseCupTime('x')).toBeNull();
    expect(parseCupTime('')).toBeNull();
  });

  it('finds the current season', () => {
    const seasons = [
      { name: '2025', startDate: '2025-04-01', endDate: '2025-10-31' },
      { name: '2026', startDate: '2026-04-01', endDate: '2026-10-31' },
      { name: '2027', startDate: '2027-04-01', endDate: '2027-10-31' }
    ];
    expect(getCurrentCupSeason(seasons, '2026-06-01')?.name).toBe('2026');
    expect(getCurrentCupSeason(seasons, '2026-12-01')?.name).toBe('2026');
    expect(getCurrentCupSeason(seasons, '2020-01-01')?.name).toBe('2025');
    expect(getCurrentCupSeason([], '2020-01-01')).toBeUndefined();
    expect(isDateInSeason('2026-04-01', seasons[1])).toBe(true);
    expect(isDateInSeason('2026-11-01', seasons[1])).toBe(false);
  });

  it('chooses the season closest in time between two seasons', () => {
    const seasons = [
      { name: '2025-26', startDate: '2025-11-13', endDate: '2026-03-19' },
      { name: '2026-27', startDate: '2026-11-05', endDate: '2027-03-18' }
    ];
    // The next season starts tomorrow, the last one ended in March
    expect(getCurrentCupSeason(seasons, '2026-11-04')?.name).toBe('2026-27');
    // Shortly after the end of a season, it is still the closest
    expect(getCurrentCupSeason(seasons, '2026-04-10')?.name).toBe('2025-26');
    // Around the middle between the seasons: 115 days after the end and 116 before the start, and the reverse
    expect(getCurrentCupSeason(seasons, '2026-07-12')?.name).toBe('2025-26');
    expect(getCurrentCupSeason(seasons, '2026-07-13')?.name).toBe('2026-27');
    // Exactly as far from both: the next season
    expect(
      getCurrentCupSeason(
        [
          { name: 'A', startDate: '2026-01-01', endDate: '2026-01-10' },
          { name: 'B', startDate: '2026-01-20', endDate: '2026-01-30' }
        ],
        '2026-01-15'
      )?.name
    ).toBe('B');
    // After the last season
    expect(getCurrentCupSeason(seasons, '2028-01-01')?.name).toBe('2026-27');
  });

  it('finds the next race', () => {
    const races = [{ raceDate: '2026-05-15' }, { raceDate: '2026-05-01' }, { raceDate: '2026-05-08' }];
    expect(getNextCupRace(races, '2026-05-02')?.raceDate).toBe('2026-05-08');
    expect(getNextCupRace(races, '2026-05-08')?.raceDate).toBe('2026-05-08');
    expect(getNextCupRace(races, '2026-06-01')).toBeUndefined();
  });
});

describe('iofResultListToCupResults', () => {
  const resultList = {
    '@attributes': { iofVersion: '3.0' },
    Event: {
      Name: 'Nattcup 1',
      Race: [
        { RaceNumber: 1, Name: 'E1', Extensions: { EventRaceId: 100 } },
        { RaceNumber: 2, Name: 'E2', Extensions: { EventRaceId: 101 } }
      ]
    },
    ClassResult: [
      {
        Class: { Name: 'H21' },
        PersonResult: [
          {
            Person: { Id: ['555'], Name: { Given: 'Anna', Family: 'Andersson' } },
            Organisation: { Id: '288', Name: 'OK Orion', ShortName: 'Orion' },
            Result: [
              {
                '@attributes': { raceNumber: 1 },
                Status: 'OK',
                Position: 2,
                Time: 1200,
                TimeBehind: 30,
                OverallResult: { Status: 'OK', Position: 3, Time: 1200, TimeBehind: 30 }
              },
              {
                '@attributes': { raceNumber: 2 },
                Status: 'OK',
                Position: 1,
                Time: 1100,
                TimeBehind: 0,
                OverallResult: { Status: 'OK', Position: 1, Time: 2300, TimeBehind: 0 }
              }
            ]
          },
          {
            Person: { Id: ['777'], Name: { Given: 'Bo', Family: 'Berg' } },
            Organisation: { Id: '1', Name: 'Annan OK' },
            Result: [
              { '@attributes': { raceNumber: 1 }, Status: 'OK', Position: 1, Time: 1170, TimeBehind: 0 },
              { '@attributes': { raceNumber: 2 }, Status: 'MissingPunch' }
            ]
          },
          {
            Person: { Id: ['888'], Name: { Given: 'Ce', Family: 'Ce' } },
            Result: [{ '@attributes': { raceNumber: 2 }, Status: 'NotCompeting' }]
          }
        ]
      }
    ]
  } as unknown as IResultListType;

  it('uses the stage result', () => {
    const cupResults = iofResultListToCupResults(resultList, 7, 101, false, 288);
    expect(cupResults).toHaveLength(2);
    const anna = cupResults.find(r => r.eventorPersonId === 555)!;
    expect(anna).toMatchObject({
      cupRaceId: 7,
      personName: 'Anna Andersson',
      clubName: 'Orion',
      isClubMember: true,
      className: 'H21',
      status: 'OK',
      position: 1,
      timeSeconds: 1100,
      nofStartsInClass: 2,
      source: 'EVENTOR'
    });
    const bo = cupResults.find(r => r.eventorPersonId === 777)!;
    expect(bo).toMatchObject({ isClubMember: false, status: 'MP', position: null, timeSeconds: null });
  });

  it('gives no club to a competitor without club, the proxy makes an empty element {}', () => {
    const list = {
      '@attributes': { iofVersion: '3.0' },
      Event: { Name: 'Test' },
      ClassResult: [
        {
          Class: { Name: 'Mellankort' },
          PersonResult: [
            {
              Person: { Id: ['999'], Name: { Given: 'Felix', Family: 'Johansson' } },
              Organisation: {},
              Result: [{ Status: 'OK', Position: 21, Time: 1500, TimeBehind: 300 }]
            },
            {
              Person: { Id: '1000', Name: { Given: 'Ida', Family: {} } },
              Organisation: { '@attributes': { type: 'Club' } },
              Result: [{ Status: 'OK', Position: 22, Time: 1510, TimeBehind: 310 }]
            }
          ]
        }
      ]
    } as unknown as IResultListType;
    const [felix, ida] = iofResultListToCupResults(list, 1, null, false, 288);
    expect(felix).toMatchObject({
      personName: 'Felix Johansson',
      clubName: null,
      isClubMember: false,
      eventorPersonId: 999
    });
    expect(ida).toMatchObject({ personName: 'Ida', clubName: null, eventorPersonId: 1000 });
  });

  it('uses the total result after a stage', () => {
    const cupResults = iofResultListToCupResults(resultList, 7, 100, true, 288);
    expect(cupResults.find(r => r.eventorPersonId === 555)).toMatchObject({ position: 3, timeSeconds: 1200 });
  });
});
