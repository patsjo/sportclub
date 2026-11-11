import { CreateBookmarkletDialog } from './bookmarkletDialog';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IWinnerResultProps } from '../models/resultWizardModel';
import {
  FormatRankingPoints,
  GetSverigelistanOptions,
  ISverigelistanBookmarkletTexts,
  ISverigelistanData,
  ParseSverigelistanClipboard,
  ParseSverigelistanPage,
  SverigelistanBookmarklet,
  SverigelistanBookmarkletMain,
  SverigelistanClassPriority,
  SverigelistanEventsUrl,
  SverigelistanOtherEvent,
  SverigelistanTooEarly
} from './sverigelistanHelper';

// As the app does when it starts, the times are read by it
dayjs.extend(customParseFormat);

// The same shape as the pages of Sverigelistan in Eventor, cut down: the menu has a heading of its own before the
// content, place 5 is not ranked, and the runners without a time come last without points.
const menu = `<div class="menu"><h2>Produkter och tj&#228;nster</h2><a href="/Ranking/ol/RankingEvent">T&#228;vlingar</a>
<a href="/Ranking/ol/List/Index/135">H21</a></div>`;

const row = (place: string, name: string, club: string, time: string, points: string, odd = false) => `
            <tr class="${odd ? ' odd' : ''}">
                <td></td>
                <td>${place}</td>
                <td>
                    <a href="/Ranking/ol/Runner/Index/73559">${name}</a>
                </td>
                <td><a href="/Ranking/ol/Club/Index/450">${club}</a></td>
                <td>${time}</td>
                <td class="scoreColumn">${points}</td>
            </tr>`;

const classPage = (className: string, rows: string) => `<!DOCTYPE html><html lang="sv"><head><title>
        Eventor -
    O-event, dag 1 - Sprint by Night - ${className}
    </title></head><body>${menu}
<h2>
    O-event, dag 1 - Sprint by Night - ${className}
</h2>
<div class="info"><ul style="margin: 0px;"><li>Rapportera fel i tävling eller klass</li></ul></div>
<table class="fullWidth manualStriped">
    <thead>
        <tr>
            <th></th>
            <th></th>
            <th>Namn</th>
            <th>Klubb</th>
            <th>Tid</th>
            <th class="scoreColumn">Po&#228;ng</th>
        </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
</table>
</body></html>`;

const h21Page = classPage(
  'H21',
  row('1', 'Linus Wernstr&#246;m', 'V&#228;xj&#246; OK', '00:13:20', '2,11') +
    row('2', 'August Moll&#233;n', 'OK Denseln', '00:13:35', '3,55', true) +
    row('6', 'Erik Classon', 'IKHP Huskvarna Idrottsklubb', '00:15:04', '12,13') +
    row('', 'Olliver Persson', 'OK B&#228;vern', '', '', true)
);

// The winner is not ranked (a foreign runner), the best ranked is second
const d21Page = classPage(
  'D21',
  row('2', 'Anna Andersson', 'OK Linn&#233;', '00:15:30', '24,80') +
    row('3', 'Bea Berg', 'IFK G&#246;teborg', '00:15:45', '26,10')
);

const notPublishedPage = classPage('H20', row('', 'Carl Carlsson', 'OK Ravinen', '', ''));

const eventPage = `<!DOCTYPE html><html lang="sv"><head><title>Eventor - O-event, dag 1 - Sprint by Night</title></head>
<body>${menu}
<h2>
    O-event, dag 1 - Sprint by Night - Bor&#229;s GIF
</h2>
<div class="info"><ul style="margin: 0px;"><li>Rapportera fel</li></ul></div>
<div>
    <div class="leftCol">
        <h3>Damer</h3>
        <ul><li><a href="/Ranking/ol/Event/Class/480170">D21</a></li>
</ul>
    </div>
    <div class="rightCol">
        <h3>Herrar</h3>
        <ul><li><a href="/Ranking/ol/Event/Class/480173">H20</a></li>
<li><a href="/Ranking/ol/Event/Class/480171">H21</a></li>
</ul>
    </div>
</div></body></html>`;

const texts: ISverigelistanBookmarkletTexts = {
  title: 'Copy ranking',
  wrongPage: 'wrong page',
  fetching: 'class {n} of {total}',
  failed: 'failed: {message}',
  noPoints: 'no points',
  ready: '{ranked} of {total}',
  copiedTitle: 'Copied!',
  copied: 'copied',
  copyManually: 'copy manually',
  close: 'Close'
};

const winner = (
  className: string,
  personName: string,
  lengthInMeter: number,
  difficulty: IWinnerResultProps['difficulty'] = 'Svart'
): IWinnerResultProps => ({ id: 0, className, personName, lengthInMeter, difficulty, winnerTime: '00:13:20' });

describe('ParseSverigelistanPage', () => {
  it('reads the best ranked runner of a class page', () => {
    expect(ParseSverigelistanPage(h21Page)).toEqual({
      kind: 'class',
      eventName: 'O-event, dag 1 - Sprint by Night',
      classLinks: [],
      class: {
        name: 'H21',
        place: 1,
        personName: 'Linus Wernström',
        clubName: 'Växjö OK',
        time: '00:13:20',
        points: 2.11,
        nofRanked: 3
      }
    });
  });

  it('takes the best ranked runner when the winner is not ranked', () => {
    expect(ParseSverigelistanPage(d21Page).class).toMatchObject({
      place: 2,
      personName: 'Anna Andersson',
      points: 24.8
    });
  });

  it('has no points when they are not published', () => {
    expect(ParseSverigelistanPage(notPublishedPage).class).toMatchObject({
      name: 'H20',
      place: null,
      points: null,
      nofRanked: 0
    });
  });

  it('reads the classes of the race page, without the organiser in the name', () => {
    expect(ParseSverigelistanPage(eventPage)).toEqual({
      kind: 'event',
      eventName: 'O-event, dag 1 - Sprint by Night',
      classLinks: [
        { name: 'D21', url: '/Ranking/ol/Event/Class/480170' },
        { name: 'H20', url: '/Ranking/ol/Event/Class/480173' },
        { name: 'H21', url: '/Ranking/ol/Event/Class/480171' }
      ]
    });
  });

  it('is neither on another page', () => {
    expect(ParseSverigelistanPage(`<html><body>${menu}</body></html>`).kind).toBe('other');
  });
});

describe('SverigelistanBookmarklet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is a javascript link that compiles', () => {
    const link = SverigelistanBookmarklet(texts);
    expect(link.startsWith('javascript:')).toBe(true);
    expect(() => new Function(decodeURIComponent(link.substring('javascript:'.length)))).not.toThrow();
  });

  const clipboard = () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    return writeText;
  };
  const loadPage = (html: string) => {
    document.documentElement.innerHTML = new DOMParser().parseFromString(html, 'text/html').documentElement.innerHTML;
  };
  const box = () => document.getElementById('sportclub-sverigelistan');

  it('copies the class of a class page', async () => {
    const writeText = clipboard();
    loadPage(h21Page);
    SverigelistanBookmarkletMain(ParseSverigelistanPage, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const data = ParseSverigelistanClipboard(writeText.mock.calls[0][0]);
    expect(data?.eventName).toBe('O-event, dag 1 - Sprint by Night');
    expect(data?.classes).toHaveLength(1);
    expect(data?.classes[0]).toMatchObject({ name: 'H21', personName: 'Linus Wernström', points: 2.11 });
    await vi.waitFor(() => expect(box()?.textContent).toContain('copied'));
  });

  it('fetches every class of a race page', async () => {
    const writeText = clipboard();
    const pages: Record<string, string> = {
      '/Ranking/ol/Event/Class/480170': d21Page,
      '/Ranking/ol/Event/Class/480173': notPublishedPage,
      '/Ranking/ol/Event/Class/480171': h21Page
    };
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => pages[url]
    }));
    vi.stubGlobal('fetch', fetchMock);
    loadPage(eventPage);
    SverigelistanBookmarkletMain(ParseSverigelistanPage, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const data = ParseSverigelistanClipboard(writeText.mock.calls[0][0]);
    expect(data?.classes.map(c => [c.name, c.points])).toEqual([
      ['D21', 24.8],
      ['H20', null],
      ['H21', 2.11]
    ]);
    expect(box()?.textContent).toContain('copied');
  });

  it('tells when no class has points yet', async () => {
    const writeText = clipboard();
    loadPage(notPublishedPage);
    SverigelistanBookmarkletMain(ParseSverigelistanPage, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(box()?.textContent).toContain('no points'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('tells when a class could not be fetched', async () => {
    clipboard();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403, statusText: 'Forbidden', text: async () => '' }))
    );
    loadPage(eventPage);
    SverigelistanBookmarkletMain(ParseSverigelistanPage, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(box()?.textContent).toContain('failed: 403 Forbidden'));
  });

  it('tells which page to open on another page', async () => {
    loadPage(`<html><body>${menu}</body></html>`);
    SverigelistanBookmarkletMain(ParseSverigelistanPage, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(box()?.textContent).toContain('wrong page'));
  });
});

describe('ParseSverigelistanClipboard', () => {
  it('reads the JSON of the bookmarklet', () => {
    const json = JSON.stringify({
      sverigelistan: 1,
      url: 'https://eventor.orientering.se/Ranking/ol/Event/Index/19188',
      eventName: 'O-event',
      classes: [
        { name: 'H21', place: 1, personName: 'A B', clubName: 'OK', time: '00:13:20', points: 2.11, nofRanked: 3 },
        { bad: 1 }
      ]
    });
    expect(ParseSverigelistanClipboard(json)?.classes).toEqual([
      { name: 'H21', place: 1, personName: 'A B', clubName: 'OK', time: '00:13:20', points: 2.11, nofRanked: 3 }
    ]);
  });

  it('reads the source of a class page', () => {
    expect(ParseSverigelistanClipboard(h21Page)?.classes[0].points).toBe(2.11);
  });

  it('is nothing for other text', () => {
    expect(ParseSverigelistanClipboard('hello')).toBeUndefined();
    expect(ParseSverigelistanClipboard('{"a": 1}')).toBeUndefined();
    expect(ParseSverigelistanClipboard('{broken')).toBeUndefined();
    expect(ParseSverigelistanClipboard(undefined)).toBeUndefined();
  });
});

describe('GetSverigelistanOptions', () => {
  const data: ISverigelistanData = {
    url: '',
    eventName: 'O-event, dag 1 - Sprint by Night',
    classes: [
      {
        name: 'D21',
        place: 2,
        personName: 'Anna Andersson',
        clubName: null,
        time: '00:15:30',
        points: 24.8,
        nofRanked: 2
      },
      {
        name: 'H21',
        place: 1,
        personName: 'Linus Wernström',
        clubName: null,
        time: '00:13:20',
        points: 2.11,
        nofRanked: 3
      },
      { name: 'H20', place: null, personName: null, clubName: null, time: null, points: null, nofRanked: 0 },
      { name: 'H16', place: 1, personName: 'Dan Dahl', clubName: null, time: '00:20:00', points: 40, nofRanked: 5 }
    ]
  };

  it('bases the ranking on H21 Elit, and the others on it', () => {
    const { options, base, unmatched } = GetSverigelistanOptions(
      data,
      [
        winner('H21L', 'Erik Ek', 4000),
        winner('H21E', 'Linus Wernström', 3200),
        winner('D21', 'Somebody Foreign', 2900),
        winner('H16', 'Dan Dahl', 2500, 'Orange')
      ],
      'OL',
      'Night'
    );
    expect(base?.className).toBe('H21E');
    expect(base?.timePerKilometer).toBe('00:04:10.000');
    expect(options.map(o => [o.className, o.rankingClassName, o.points])).toEqual([
      ['H21E', 'H21', 2.11],
      ['D21', 'D21', 24.8]
    ]);
    // An orange class is no base, H20 has no points
    expect(unmatched).toEqual(['H16']);
    expect(base?.basedOn).toBeUndefined();
    expect(options[1].basedOn?.className).toBe('H21E');
    expect(options[1].basedOn?.points).toBeCloseTo(23.91, 2);
  });

  it('has the fastest class first, the base is still H21', () => {
    const { options, base } = GetSverigelistanOptions(
      data,
      [winner('H21E', 'Linus Wernström', 3200), winner('D21', 'Somebody Foreign', 4000)],
      'OL',
      'Day'
    );
    // D21 232.5 s/km, H21E 250 s/km
    expect(options.map(o => [o.className, o.timePerKilometer])).toEqual([
      ['D21', '00:03:52.500'],
      ['H21E', '00:04:10.000']
    ]);
    expect(base?.className).toBe('H21E');
    expect(options[0].basedOn?.className).toBe('H21E');
  });

  it('finds the base by the name when the winner is not the same runner', () => {
    const { base } = GetSverigelistanOptions(
      { ...data, classes: [{ ...data.classes[1], place: 2, personName: 'Other Runner' }] },
      [winner('H21L', 'Erik Ek', 4000), winner('H21', 'Linus Wernström', 3200)],
      'OL',
      'Day'
    );
    expect(base?.className).toBe('H21');
  });

  it('takes H21 Lång when H21 Elit is missing', () => {
    const { base } = GetSverigelistanOptions(
      { ...data, classes: [{ ...data.classes[1], personName: 'Other Runner' }] },
      [winner('H21L', 'Erik Ek', 4000), winner('H21K', 'Kalle Kort', 2000)],
      'OL',
      'Day'
    );
    expect(base?.className).toBe('H21L');
  });

  it('has no base without an H21 class', () => {
    const { options, base } = GetSverigelistanOptions(data, [winner('D21', 'Anna Andersson', 2900)], 'OL', 'Day');
    expect(base).toBeUndefined();
    expect(options.map(o => o.className)).toEqual(['D21']);
    expect(options[0].basedOn).toBeUndefined();
  });
});

describe('Sverigelistan', () => {
  it('orders the H21 classes', () => {
    expect(
      ['H21', 'H21 Lång', 'D21', 'H21 Elit', 'H21K'].sort(
        (a, b) => SverigelistanClassPriority(a) - SverigelistanClassPriority(b)
      )
    ).toEqual(['H21 Elit', 'H21 Lång', 'H21', 'D21', 'H21K']);
  });

  it('links to the races of the day', () => {
    expect(SverigelistanEventsUrl('OL', '2026-10-10')).toBe(
      'https://eventor.orientering.se/Ranking/ol/RankingEvent?From.Date=2026-10-10&To.Date=2026-10-10'
    );
    expect(SverigelistanEventsUrl('SKIO')).toBe('https://eventor.orientering.se/Ranking/skio/RankingEvent');
  });

  it('is too early on the day of the race', () => {
    expect(SverigelistanTooEarly('2026-11-09', '2026-11-09')).toBe(true);
    expect(SverigelistanTooEarly('2026-11-08', '2026-11-09')).toBe(false);
    expect(SverigelistanTooEarly(undefined, '2026-11-09')).toBe(false);
  });

  it('notices another race', () => {
    const data = { url: '', eventName: 'O-event, dag 1 - Sprint by Night', classes: [] };
    expect(SverigelistanOtherEvent(data, 'O-event, dag 1')).toBe(false);
    expect(SverigelistanOtherEvent(data, 'Smålandskavlen')).toBe(true);
    expect(SverigelistanOtherEvent(data, undefined)).toBe(false);
  });

  it('formats the points', () => {
    expect(FormatRankingPoints(11.4234)).toBe('11,42');
    expect(FormatRankingPoints(null)).toBe('-');
  });
});
