import { describe, expect, it, vi } from 'vitest';
import { PostJsonData } from './api';
import {
  ApplyLiveloxLengths,
  ChooseLiveloxEvent,
  FindLiveloxEvent,
  GetLiveloxClassesByName,
  GetLiveloxEventIds,
  GetLiveloxLeg,
  ILiveloxEvent,
  LiveloxEventIdFromLink,
  LiveloxProxyUrl,
  LiveloxSearchTexts,
  ParseLiveloxEvent,
  ParseLiveloxLength,
  RankLiveloxSearchEvents
} from './liveloxHelper';

vi.mock('./api', () => ({ PostJsonData: vi.fn() }));

const course = (length: number) => ({ id: length, name: `${length}`, controls: [], length, classes: [] });

// The same shape as the page of 25manna 2026 in Livelox (https://www.livelox.com/Events/Show/199348): Eventor has
// the legs 1-10, Livelox names the last three 23-25. Plus a class that is not a relay, with its length in the table.
const model = {
  event: {
    id: 199348,
    name: '25manna, Huddinge',
    externalIdentifier: { system: 0, id: '54099-1' },
    classes: [
      {
        id: 1252970,
        name: '25manna',
        externalIdentifier: { system: 0, id: '668296-1' },
        relayLegs: [
          { leg: 1, name: '1' },
          { leg: 2, name: '2' },
          { leg: 3, name: '3' },
          { leg: 8, name: '23' },
          { leg: 9, name: '24' },
          { leg: 10, name: '25' }
        ],
        relayLegGroups: [
          { id: 1, relayLegs: [1], courses: [course(4800), course(4900), course(4800), course(4900)] },
          { id: 2, relayLegs: [2], courses: [course(6760), course(6860)] },
          { id: 3, relayLegs: [3], courses: [course(4140), course(4190), course(4170), course(4190)] },
          { id: 8, relayLegs: [8], courses: [course(3930)] },
          { id: 9, relayLegs: [9], courses: [course(5460)] },
          { id: 10, relayLegs: [10], courses: [course(7690)] }
        ]
      },
      {
        id: 1252971,
        name: 'Öppen 5',
        externalIdentifier: { system: 0, id: '668297-1' },
        relayLegs: [],
        relayLegGroups: []
      }
    ]
  },
  sessionClassCandidatesForCurrentUser: []
};

const row = (name: string, length: string, link: string) => `
  <div class="">
    <div class="class">
      ${name}
    </div>
    <div class="course-length">
      ${length}
    </div>
    <div class="participant-count">10</div>
    <div class="links"><a href="${link}"><span>Replay</span></a></div>
  </div>`;

const liveloxPage = `<!DOCTYPE html><html><head><title>Livelox - Event: 25manna, Huddinge</title></head><body>
  <div class="table-like-body">
    ${row('25manna, leg 1', '4,800&ndash;4,900 m', '/Viewer/25manna-Huddinge/25manna/1?classId=1252970&amp;relayLeg=1')}
    ${row('25manna, leg 23', '3,930 m', '/Viewer/25manna-Huddinge/25manna/23?classId=1252970&amp;relayLeg=8')}
    ${row('Öppen 5', '6,170 m', '/Viewer/25manna-Huddinge/Oppen-5?classId=1252971')}
  </div>
  <script>
    var model = ${JSON.stringify(model)};
    var other = { text: "};" };
  </script>
</body></html>`;

describe('ParseLiveloxLength', () => {
  it('reads a length and the average of a range, as Livelox writes them in English', () => {
    expect(ParseLiveloxLength('6,170 m')).toBe(6170);
    expect(ParseLiveloxLength('4,800&ndash;4,900 m')).toBe(4850);
    expect(ParseLiveloxLength(' 4,800–4,900 m ')).toBe(4850);
    expect(ParseLiveloxLength('4.8 km')).toBe(4800);
    expect(ParseLiveloxLength('')).toBeNull();
    expect(ParseLiveloxLength(undefined)).toBeNull();
  });
});

describe('ParseLiveloxEvent', () => {
  const event = ParseLiveloxEvent(liveloxPage, 'https://www.livelox.com/Events/Show/199348/25manna-Huddinge');

  it('reads the event and its race in Eventor', () => {
    expect(event.eventId).toBe(199348);
    expect(event.name).toBe('25manna, Huddinge');
    expect(event.eventorId).toBe('54099-1');
    expect(event.classes.map(c => c.name)).toEqual(['25manna', 'Öppen 5']);
  });

  it('takes the average of all the courses of a leg, with the name of the leg in Livelox', () => {
    const relay = event.classes[0];
    expect(relay.eventorClassId).toBe('668296');
    expect(relay.legs.map(l => [l.leg, l.name, l.lengthInMeter, l.nofCourses])).toEqual([
      [1, '1', 4850, 4],
      [2, '2', 6810, 2],
      // The average of the courses, not the middle of the shortest and the longest (4,165)
      [3, '3', 4173, 4],
      [8, '23', 3930, 1],
      [9, '24', 5460, 1],
      [10, '25', 7690, 1]
    ]);
  });

  it('reads the length of a class that is not a relay from the table', () => {
    expect(event.classes[1].lengthInMeter).toBe(6170);
    expect(event.classes[1].legs).toEqual([]);
  });

  it('tells when the page has no event', () => {
    expect(() => ParseLiveloxEvent('<html>Just a moment...</html>', 'https://www.livelox.com/Events/Show/1')).toThrow(
      /no event/
    );
  });
});

describe('GetLiveloxEventIds', () => {
  it('finds the link to Livelox in the page of the race in Eventor, encoded or not', () => {
    expect(
      GetLiveloxEventIds(
        '<a href="/Home/RedirectToLivelox?redirectUrl=%2FEvents%2FShow%2F199348" target="_blank">Livelox</a>' +
          '<a href="/Home/RedirectToLivelox?redirectUrl=/Events/Show/199349&amp;x=1">Livelox</a>' +
          '<a href="/Home/RedirectToLivelox?redirectUrl=/Events/Show/199348">again</a>'
      )
    ).toEqual([199348, 199349]);
    expect(GetLiveloxEventIds('<a href="https://www.livelox.com/Events/Show/123">x</a>')).toEqual([123]);
    expect(GetLiveloxEventIds('<a href="/Events/Show/54099">Eventor</a>')).toEqual([]);
  });
});

describe('LiveloxEventIdFromLink', () => {
  it('reads the link on the race in Eventor, a link to Livelox, or the id', () => {
    expect(
      LiveloxEventIdFromLink('https://eventor.orientering.se/Home/RedirectToLivelox?redirectUrl=/Events/Show/199348')
    ).toBe(199348);
    expect(
      LiveloxEventIdFromLink(
        'https://eventor.orientering.se/Home/RedirectToLivelox?redirectUrl=%2FEvents%2FShow%2F199348'
      )
    ).toBe(199348);
    expect(LiveloxEventIdFromLink(' https://www.livelox.com/Events/Show/199348/25manna-Huddinge ')).toBe(199348);
    expect(LiveloxEventIdFromLink('199348')).toBe(199348);
  });

  it('is not fooled by the link to the race in Eventor', () => {
    expect(LiveloxEventIdFromLink('https://eventor.orientering.se/Events/Show/54099')).toBeUndefined();
    expect(LiveloxEventIdFromLink('')).toBeUndefined();
    expect(LiveloxEventIdFromLink(undefined)).toBeUndefined();
  });
});

describe('LiveloxProxyUrl', () => {
  it('is next to the proxy of Eventor', () => {
    expect(LiveloxProxyUrl('https://okorion.com/eventorProxyWithCache.php')).toBe(
      'https://okorion.com/liveloxProxy.php'
    );
    expect(LiveloxProxyUrl(undefined)).toBeUndefined();
  });
});

describe('ChooseLiveloxEvent', () => {
  const event = (eventId: number, eventorId?: string): ILiveloxEvent => ({
    eventId,
    name: `${eventId}`,
    url: '',
    eventorId,
    classes: []
  });

  it('takes the race of an event with several races, else the event, else the first', () => {
    const events = [event(1, '500-1'), event(2, '500-2'), event(3, '600-1')];
    expect(ChooseLiveloxEvent(events, 500, 2)?.eventId).toBe(2);
    expect(ChooseLiveloxEvent(events, 600, 3)?.eventId).toBe(3);
    expect(ChooseLiveloxEvent(events, 700, 1)?.eventId).toBe(1);
    expect(ChooseLiveloxEvent([], 700, 1)).toBeUndefined();
  });
});

describe('GetLiveloxClassesByName', () => {
  const event = ParseLiveloxEvent(liveloxPage, 'https://www.livelox.com/Events/Show/199348');

  it('finds the class by its id in Eventor, under the short name the results have', () => {
    const classes = GetLiveloxClassesByName(event, [
      { EventClassId: '668296', Name: '25-manna', ClassShortName: '25-manna' },
      { EventClassId: '668297', Name: 'Öppen 5', ClassShortName: 'Öppen 5' }
    ]);
    expect(classes.get('25-manna')?.classId).toBe(1252970);
    expect(classes.get('Ö5')?.classId).toBe(1252971);
  });

  it('finds the class by its name without the classes of Eventor', () => {
    const classes = GetLiveloxClassesByName(event);
    expect(classes.get('25manna')?.classId).toBe(1252970);
    expect(classes.get('Ö5')?.classId).toBe(1252971);
  });
});

describe('GetLiveloxLeg', () => {
  const relay = ParseLiveloxEvent(liveloxPage, '').classes[0];

  it('finds the leg by its number in Eventor as the results are imported', () => {
    expect(GetLiveloxLeg(relay, 8, 'leg')?.lengthInMeter).toBe(3930);
    expect(GetLiveloxLeg(relay, 23, 'leg')).toBeUndefined();
  });

  it('finds the leg by its name in Livelox as the user changes it, e.g. from 8 to 23', () => {
    expect(GetLiveloxLeg(relay, 23, 'name')?.lengthInMeter).toBe(3930);
    expect(GetLiveloxLeg(relay, 2, 'name')?.lengthInMeter).toBe(6810);
    // Leg 9 in Eventor is leg 24, the real leg 9 is not in Livelox
    expect(GetLiveloxLeg(relay, 9, 'name')).toBeUndefined();
    expect(GetLiveloxLeg(undefined, 1, 'name')).toBeUndefined();
  });
});

describe('ApplyLiveloxLengths', () => {
  const classes = GetLiveloxClassesByName(ParseLiveloxEvent(liveloxPage, ''));
  const target = <T extends object>(values: T) => {
    const result = { ...values, setValues: vi.fn((v: object) => Object.assign(result, v)) };
    return result;
  };
  const winner = (className: string, lengthInMeter?: number) => {
    const result = {
      className,
      lengthInMeter,
      setLengthInMeter: vi.fn((value: number) => {
        result.lengthInMeter = value;
      })
    };
    return result;
  };

  it('gives every leg of a relay its own length, also where Eventor had one for the class', () => {
    const teamResults = [
      target({ className: '25manna', stage: 8, lengthInMeter: 4850 as number | null }),
      target({ className: '25manna', stage: 2, lengthInMeter: null as number | null }),
      target({ className: '25manna', stage: 5, lengthInMeter: null as number | null }),
      target({ className: 'H21', stage: 1, lengthInMeter: null as number | null })
    ];
    const winners = [winner('25manna - 8', 4850), winner('25manna - 2'), winner('H21 - 1')];
    expect(ApplyLiveloxLengths(classes, true, [], teamResults, winners)).toBe(2);
    expect(teamResults.map(r => r.lengthInMeter)).toEqual([3930, 6810, null, null]);
    expect(winners.map(w => w.lengthInMeter)).toEqual([3930, 6810, undefined]);
  });

  it('only fills the missing lengths of the other races', () => {
    const results = [
      target({ className: 'Ö5', lengthInMeter: null as number | null }),
      target({ className: 'Ö5', lengthInMeter: 6000 as number | null })
    ];
    const winners = [winner('Ö5')];
    expect(ApplyLiveloxLengths(classes, false, results, [], winners)).toBe(1);
    expect(results.map(r => r.lengthInMeter)).toEqual([6170, 6000]);
    expect(winners[0].lengthInMeter).toBe(6170);
  });
});

describe('LiveloxSearchTexts', () => {
  it('searches for the event without the race, without the year, and for its first word', () => {
    expect(LiveloxSearchTexts('25manna')).toEqual(['25manna']);
    expect(LiveloxSearchTexts('O-Ringen Uppsala 2026, Etapp 2')).toEqual([
      'O-Ringen Uppsala 2026',
      'O-Ringen Uppsala',
      'O-Ringen'
    ]);
    expect(LiveloxSearchTexts(undefined)).toEqual([]);
  });
});

// What the search of Livelox answered for "25manna" around 2026-10-10
const searchEvents = [
  {
    id: 182025,
    name: '25manna träningspaket Kvarnsjön',
    timeInterval: { start: '2026-03-14T23:00:00Z', end: '2026-10-31T22:00:00Z' }
  },
  {
    id: 200610,
    name: '25manna motionsorientering',
    timeInterval: { start: '2026-10-10T07:00:00Z', end: '2026-10-10T14:00:00Z' }
  },
  {
    id: 199348,
    name: '25manna, Huddinge',
    timeInterval: { start: '2026-10-10T07:00:00Z', end: '2026-10-10T18:00:00Z' }
  },
  { id: 190000, name: '25manna 2025', timeInterval: { start: '2025-10-11T07:00:00Z', end: '2025-10-11T18:00:00Z' } }
];

describe('RankLiveloxSearchEvents', () => {
  it('keeps the events on the day of the race, the most alike in name first', () => {
    const ranked = RankLiveloxSearchEvents(searchEvents, '2026-10-10', '25manna').map(e => e.id);
    // The race of another year is left out, the training package of seven months is least alike
    expect(ranked).toHaveLength(3);
    expect(ranked.slice(0, 2).sort()).toEqual([199348, 200610]);
    expect(ranked[2]).toBe(182025);
  });
});

describe('FindLiveloxEvent', () => {
  const pageOf = (id: number, eventorId: string | null) =>
    `<script>var model = ${JSON.stringify({
      event: { id, name: `${id}`, externalIdentifier: eventorId ? { system: 0, id: eventorId } : null, classes: [] }
    })};</script>`;

  it('only takes the event that Livelox imported from the race in Eventor', async () => {
    const asked: unknown[] = [];
    vi.mocked(PostJsonData).mockImplementation(async (_url, data) => {
      asked.push(data);
      const body = data as { search?: unknown; url?: string };
      if (body.search) return { events: searchEvents };
      const id = parseInt(/Show\/(\d+)/.exec(body.url ?? '')![1], 10);
      return { url: `https://www.livelox.com/Events/Show/${id}`, html: pageOf(id, id === 199348 ? '54099-1' : null) };
    });
    const event = await FindLiveloxEvent('proxy', {
      eventorEventId: 54099,
      raceNumber: 1,
      raceDate: '2026-10-10',
      eventName: '25manna'
    });
    expect(event?.eventId).toBe(199348);
    expect(asked[0]).toEqual({ search: { from: '2026-10-09', to: '2026-10-12', text: '25manna' } });
  });

  it('finds nothing rather than an event with the same name from another race', async () => {
    vi.mocked(PostJsonData).mockImplementation(async (_url, data) => {
      const body = data as { search?: unknown; url?: string };
      if (body.search) return { events: searchEvents };
      const id = parseInt(/Show\/(\d+)/.exec(body.url ?? '')![1], 10);
      return { url: '', html: pageOf(id, '11111-1') };
    });
    expect(
      await FindLiveloxEvent('proxy', { eventorEventId: 54099, raceDate: '2026-10-10', eventName: '25manna' })
    ).toBeUndefined();
  });
});
