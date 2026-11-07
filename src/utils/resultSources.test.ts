import { describe, expect, it } from 'vitest';
import { IResultListType } from '../models/iof.xsd-3.0';
import {
  CalculateTotalAfterStage,
  FindCompetitorByName,
  FindTotalClass,
  FindTotalPerson,
  IsClubOrganisation,
  NormalizeName,
  ParseOETotalResults,
  ParseTimeToSeconds,
  SplitClubNames,
  StageFromName,
  TotalLengthInMeter,
  ToSingleRaceResultList,
  WinSplitsClassResultUrl,
  WinSplitsDatabaseId
} from './resultSources';

describe('names', () => {
  it('compares club names without case, accents and punctuation', () => {
    expect(NormalizeName('Skåneslättens OL')).toBe(NormalizeName('skaneslattens  ol'));
    expect(IsClubOrganisation('OK Orion', ['Ok orion'])).toBe(true);
    expect(IsClubOrganisation('OK Orion Ungdom', ['OK Orion'])).toBe(false);
    expect(IsClubOrganisation(undefined, ['OK Orion'])).toBe(false);
    expect(SplitClubNames(' OK Orion, Orion ; ')).toEqual(['OK Orion', 'Orion']);
  });

  it('finds the runner of the club by name, only when one has it', () => {
    const competitors = [
      { id: 1, firstName: 'Patrik', lastName: 'Sjökvist' },
      { id: 2, firstName: 'Anna', lastName: 'Berg' },
      { id: 3, firstName: 'Anna', lastName: 'Berg' }
    ];
    expect(FindCompetitorByName(competitors, 'patrik', 'Sjokvist')?.id).toBe(1);
    expect(FindCompetitorByName(competitors, 'Anna', 'Berg')).toBeUndefined();
    expect(FindCompetitorByName(competitors, 'Patrik', undefined)).toBeUndefined();
  });
});

describe('WinSplitsDatabaseId', () => {
  it('reads the id of the event from the link to WinSplits Online, or the id', () => {
    expect(
      WinSplitsDatabaseId(
        'https://obasen.orientering.se/winsplits/online/dk/default.asp?page=classes&databaseId=116342&ct=true'
      )
    ).toBe(116342);
    expect(WinSplitsDatabaseId(' 116342 ')).toBe(116342);
    expect(WinSplitsDatabaseId('https://obasen.orientering.se/winsplits/api/events/116342/classes')).toBe(116342);
    expect(WinSplitsDatabaseId('https://eventor.orientering.se/Events/Show/54099')).toBeUndefined();
    expect(WinSplitsClassResultUrl(116342, 17)).toBe(
      'https://obasen.orientering.se/winsplits/api/events/116342/classes/17/resultlist/xml'
    );
  });
});

describe('ToSingleRaceResultList', () => {
  // Two classes from WinSplits, as the proxy converts them: no race, no race numbers and no ids of persons
  const classList = (classId: number, className: string, persons: { given: string; family: string }[]) =>
    ({
      '@attributes': { iofVersion: '3.0' },
      Event: {
        Id: 116342,
        Name: 'Bornholm Höst-Open 2026 Etape 1',
        StartTime: { Date: '2026-10-24' },
        Form: ['Individual']
      },
      ClassResult: [
        {
          Class: { Id: classId, Name: className },
          Course: [{ Length: 7475 }],
          PersonResult: persons.map((person, index) => ({
            Person: { Name: { Given: person.given, Family: person.family } },
            Organisation: { Id: '45', Name: 'Skåneslättens OL' },
            Result: [{ Time: 3747 + index, Position: index + 1, Status: 'OK' }]
          }))
        }
      ]
    }) as unknown as IResultListType;

  const result = ToSingleRaceResultList([
    classList(17, 'H35', [
      { given: 'Niclas', family: 'Tjernlund' },
      { given: 'Per', family: 'Hansen' }
    ]),
    classList(18, 'D35', [{ given: 'Eva', family: 'Holm' }])
  ]);
  const json = result as unknown as {
    Event: { Name: string; Race: { RaceNumber: number; Name: string; StartTime: { Date: string } }[] };
    ClassResult: {
      Course: { '@attributes': { raceNumber: number } }[];
      PersonResult: { Person: { Id: string[] }; Result: { '@attributes': { raceNumber: number } }[] }[];
    }[];
  };

  it('is one race, numbered 1 as Eventor does, with the classes of all the lists', () => {
    expect(json.Event.Race).toEqual([
      { RaceNumber: 1, Name: 'Bornholm Höst-Open 2026 Etape 1', StartTime: { Date: '2026-10-24' }, Extensions: {} }
    ]);
    expect(json.ClassResult).toHaveLength(2);
    expect(json.ClassResult[0].Course[0]['@attributes'].raceNumber).toBe(1);
    expect(json.ClassResult[0].PersonResult[1].Result[0]['@attributes'].raceNumber).toBe(1);
  });

  it('gives every person an id of its own for the split times, that is not taken for an id of Eventor', () => {
    const ids = json.ClassResult.flatMap(c => c.PersonResult.map(p => p.Person.Id[0]));
    expect(ids).toEqual(['ext:1', 'ext:2', 'ext:3']);
  });

  it('gives the approved results the time behind that WinSplits lacks, else they would be without position', () => {
    const results = json.ClassResult[0].PersonResult.map(
      p => p.Result[0] as unknown as { Time: number; TimeBehind: number; Position: number }
    );
    expect(results.map(r => [r.Time, r.TimeBehind, r.Position])).toEqual([
      [3747, 0, 1],
      [3748, 1, 2]
    ]);
  });

  it('counts the time behind and the position among the approved only, equal times share the position', () => {
    const list = ToSingleRaceResultList([
      {
        '@attributes': { iofVersion: '3.0' },
        Event: { Name: 'Test', StartTime: { Date: '2026-10-25' } },
        ClassResult: [
          {
            Class: { Id: 1, Name: 'D12' },
            PersonResult: [
              { Person: { Name: { Given: 'A', Family: 'A' } }, Result: [{ Time: 1500, Status: 'OK' }] },
              { Person: { Name: { Given: 'B', Family: 'B' } }, Result: [{ Time: 1200, Status: 'MissingPunch' }] },
              { Person: { Name: { Given: 'C', Family: 'C' } }, Result: [{ Time: 1400, Status: 'OK' }] },
              { Person: { Name: { Given: 'D', Family: 'D' } }, Result: [{ Time: 1400, Status: 'OK' }] }
            ]
          }
        ]
      } as unknown as IResultListType
    ]);
    const results = (
      list.ClassResult![0] as unknown as { PersonResult: { Result: { TimeBehind?: number; Position?: number }[] }[] }
    ).PersonResult.map(p => [p.Result[0].TimeBehind, p.Result[0].Position]);
    expect(results).toEqual([
      [100, 3],
      [undefined, undefined],
      [0, 1],
      [0, 1]
    ]);
  });
});

// The markup of OE12 ("Samlet resultat" of Bornholm Höst-Open 2026, https://host-open.dk/media/v2paaar0/samlet-klasseresultat.html)
const oePage = `<body><div id=reporttop><table width=709px style="table-layout:auto;">
<tr><td><nobr>Bornholm Höst-Open 2026</nobr><td id=rb><nobr>sø 25-10-2026 15:30</nobr></tr>
<tr><td><nobr>Samlet resultat</nobr><td id=rb><nobr>Oprettet af OE12</nobr></tr></table></div>
<a id="D10"></a><table width=709px><tbody>
<tr><td id=c00 width=185px><nobr>D10  (5)</nobr><td id="header" ></td></tr></tbody></table>
<table width=709px><thead>
<tr><th id=rb>Pl</th><th></th><th>Navn</th><th>Klub</th><th id=rb>Tid etape 1</th><th id=rb></th><th id=rb>Tid etape 2</th><th id=rb></th><th id=rb>Tid ialt</th><th></th></tr>
</thead><tbody></tbody></table>
<table width=709px><tbody>
<tr><td id=rb>1<td><td><nobr>Elin Wallin</nobr><td><nobr>IK Trenne Ullared</nobr><td id=rb>20:50<td id=rb>2<td id=rb>26:07<td id=rb>1<td id=c18>46:57</tr>
<tr id=ev><td id=rb>2<td><td><nobr>Ingrid Wagner Nielsen</nobr><td><nobr>Søllerød OK</nobr><td id=rb>22:01<td id=rb>3<td id=rb>30:18<td id=rb>2<td id=c18>52:19</tr>
<tr><td id=rb><nobr>&nbsp</nobr></tr>
<tr><td id=rb><td><td><nobr>Klara Andersson</nobr><td><nobr>Hylte OK</nobr><td id=rb>22:30<td id=rb>4<td id=rb>Udgået<td id=rb><td id=c18></tr>
<tr id=ev><td id=rb><td><td><nobr>Sara Semak Jensen</nobr><td><nobr>Farum OK</nobr><td id=rb>19:32<td id=rb>1<td id=rb>Udgået<td id=rb><td id=c18></tr>
<tr id=ev><td id=rb><td><td><nobr>Freja Zethner Grønberg</nobr><td><nobr>Farum OK</nobr><td id=rb>Ikke startet<td id=rb><td id=rb>Ikke startet<td id=rb><td id=c18></tr>
</tbody></table>
<a id="H35"></a><table width=709px><tbody>
<tr><td id=c00 width=185px><nobr>H35  (1)</nobr><td id="header" ></td></tr></tbody></table>
<table width=709px><thead>
<tr><th id=rb>Pl</th><th></th><th>Navn</th><th>Klub</th><th id=rb>Tid etape 1</th><th id=rb></th><th id=rb>Tid etape 2</th><th id=rb></th><th id=rb>Tid ialt</th><th></th></tr>
</thead></table>
<table width=709px><tbody>
<tr><td id=rb>1<td><td><nobr>Niclas Tjernlund</nobr><td><nobr>Skåneslättens OL</nobr><td id=rb>1:02:27<td id=rb>1<td id=rb>58:10<td id=rb>1<td id=c18>2:00:37</tr>
</tbody></table></body>`;

describe('ParseTimeToSeconds', () => {
  it('reads minutes and hours, and nothing else', () => {
    expect(ParseTimeToSeconds('20:50')).toBe(1250);
    expect(ParseTimeToSeconds('1:07:33')).toBe(4053);
    expect(ParseTimeToSeconds('Udgået')).toBeUndefined();
    expect(ParseTimeToSeconds('')).toBeUndefined();
  });
});

describe('ParseOETotalResults', () => {
  const totalResults = ParseOETotalResults(oePage);

  it('reads the classes, the stages and every runner', () => {
    expect(totalResults.title).toBe('Bornholm Höst-Open 2026');
    expect(totalResults.nofStages).toBe(2);
    expect(totalResults.classes.map(c => [c.className, c.persons.length])).toEqual([
      ['D10', 5],
      ['H35', 1]
    ]);
    expect(totalResults.classes[0].persons[0]).toEqual({
      name: 'Elin Wallin',
      club: 'IK Trenne Ullared',
      stages: [{ time: 1250 }, { time: 1567 }],
      totalTime: 2817
    });
    expect(totalResults.classes[0].persons[2].stages).toEqual([{ time: 1350 }, { status: 'Udgået' }]);
  });

  it('gives the total after stage 2, from the page', () => {
    const d10 = CalculateTotalAfterStage(FindTotalClass(totalResults, 'D10')!, 2, 2);
    expect(d10.totals.map(t => [t.person.name, t.totalPosition, t.totalTime, t.failed])).toEqual([
      ['Elin Wallin', 1, 2817, undefined],
      ['Ingrid Wagner Nielsen', 2, 3139, undefined],
      ['Klara Andersson', undefined, undefined, 'NotFinished'],
      ['Sara Semak Jensen', undefined, undefined, 'NotFinished'],
      ['Freja Zethner Grønberg', undefined, undefined, 'NotStarted']
    ]);
    expect([d10.winnerTime, d10.secondTime, d10.nofStarts]).toEqual([2817, 3139, 4]);
  });

  it('gives the total after stage 1, as it was then', () => {
    const d10 = CalculateTotalAfterStage(FindTotalClass(totalResults, 'd10')!, 1, 2);
    expect(d10.totals.map(t => t.totalPosition)).toEqual([2, 3, 4, 1, undefined]);
    expect(d10.winnerTime).toBe(1172);
  });

  it('finds the runner by name, and the stage in the name of the race', () => {
    const d10 = CalculateTotalAfterStage(totalResults.classes[0], 2, 2);
    expect(FindTotalPerson(d10.totals, 'elin', 'WALLIN')?.totalPosition).toBe(1);
    expect(FindTotalPerson(d10.totals, 'Elin', 'Andersson')).toBeUndefined();
    expect(StageFromName('Bornholm Höst-Open 2026 Etape 2')).toBe(2);
    expect(StageFromName('O-Ringen, etapp 3')).toBe(3);
    expect(StageFromName('25manna')).toBeUndefined();
  });
});

describe('TotalLengthInMeter', () => {
  const stage1 = {
    results: [
      { competitorId: 1, lengthInMeter: 4200 },
      { competitorId: 2, lengthInMeter: null }
    ]
  };
  const stage2 = { results: [{ competitorId: 1, lengthInMeter: 5100 }] };

  it('adds the lengths of the earlier stages to this one', () => {
    expect(TotalLengthInMeter(3900, 1, [stage1, stage2])).toBe(13200);
    expect(TotalLengthInMeter(3900, 1, [])).toBe(3900);
  });

  it('is unknown when a stage has no result or no length for the runner', () => {
    expect(TotalLengthInMeter(3900, 2, [stage1])).toBeNull();
    expect(TotalLengthInMeter(3900, 3, [stage1])).toBeNull();
    expect(TotalLengthInMeter(null, 1, [stage1])).toBeNull();
  });
});
