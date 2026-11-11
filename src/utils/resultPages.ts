import { IResultListType } from '../models/iof.xsd-3.0';
import { CreateBookmarkletDialog } from './bookmarkletDialog';
import { IofXmlToJson } from './iofXmlToJson';
import { ToExternalResultList } from './resultSources';

/**
 * Results from result pages that the app cannot read itself, by a bookmarklet in the browser of the user:
 * - an Eventor that the club has no API key for, e.g. IOF Eventor
 *   (https://eventor.orienteering.sport/Events/ResultList?eventId=8774&groupBy=EventClass), it has a browser check
 *   (Cloudflare) as Sverigelistan
 * - tulospalvelu.fi, e.g. WMOC and Jukola (https://online.tulospalvelu.fi/tulokset-new/sv/nj2026_nj/nj/stallning/7/0/)
 * - SPORTident Center (https://center.sportident.com/results/orienteering/swiss-o-days/2025/.../analysis/1000000)
 *
 * The last two show their results by a script, a class (or a leg of a relay) at a time. The bookmarklet reads the
 * page as it is shown, collects the classes and legs that it was clicked on, and copies them as JSON. The user pastes
 * it in the app, where it becomes an IOF XML result list of one race.
 */

export type ExternalResultStatus =
  'OK' | 'DidNotStart' | 'DidNotFinish' | 'MissingPunch' | 'Disqualified' | 'NotCompeting';

export interface IExternalSplitTime {
  /** The code of the control, or its number on the course when the page has no codes */
  code: string;
  /** Seconds from the start */
  time: number;
}

export interface IExternalPersonResult {
  given: string;
  family: string;
  club: string;
  place: number | null;
  /** Seconds */
  time: number | null;
  status: ExternalResultStatus;
  splits?: IExternalSplitTime[];
}

export interface IExternalTeamMemberResult {
  leg: number;
  given: string;
  family: string;
  legTime: number | null;
  legPlace: number | null;
  /** The time of the team after the leg */
  totalTime: number | null;
  totalPlace: number | null;
  status: ExternalResultStatus;
}

export interface IExternalTeamResult {
  /** "IFK Göteborg Orientering 1" */
  name: string;
  /** The clubs of the team, more than one for a team of several clubs */
  clubs: string[];
  place: number | null;
  time: number | null;
  status: ExternalResultStatus;
  members: IExternalTeamMemberResult[];
  /** The number of the team, the legs read one at a time are joined by it */
  bib?: string;
  /** The leg that the place, time and status of the team are after, when they were read a leg at a time */
  afterLeg?: number;
}

export interface IExternalClassResult {
  name: string;
  lengthInMeter: number | null;
  persons: IExternalPersonResult[];
  teams: IExternalTeamResult[];
  /** The course length of every leg of a relay, index 0 is leg 1 */
  legLengths?: (number | null)[];
}

export interface IExternalResults {
  url: string;
  eventName: string;
  /** As the page has it, "Sunday 8 September 2024" or "lördag 12 oktober 2024" */
  dateText: string;
  organiser: string;
  classes: IExternalClassResult[];
}

export interface IEventorResultPage {
  kind: 'individual' | 'relay' | 'other';
  eventName: string;
  dateText: string;
  organiser: string;
  classes: IExternalClassResult[];
  /** A relay list without the runners of the teams, they are shown with showRelayLineups=True */
  missingLineups: boolean;
}

/**
 * Reads a result list of Eventor, by class: individual, championship or relay. It is also run by the bookmarklet in
 * Eventor (as its source text), so it must not use anything outside itself.
 */
export function ParseEventorResultPage(html: string): IEventorResultPage {
  const NBSP = '\u0001';
  const decode = (value: string) =>
    value
      .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  // A no-break space is kept apart, Eventor joins the parts of a given name by it ("Anett&nbsp;Liisa Parts")
  const rawText = (value: string) =>
    decode(value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, NBSP))
      .replace(/\s+/g, ' ')
      .trim();
  const text = (value: string) => rawText(value).split(NBSP).join(' ').replace(/\s+/g, ' ').trim();
  const splitName = (value: string) => {
    const parts = rawText(value).split(' ');
    const join = (words: string[]) => words.join(' ').split(NBSP).join(' ').trim();
    return { given: join(parts.slice(0, 1)), family: join(parts.slice(1)) };
  };
  const toSeconds = (value: string) => {
    if (!/^\d{1,3}(:\d{2}){1,2}$/.test(value)) return null;
    return value.split(':').reduce((seconds, part) => seconds * 60 + parseInt(part, 10), 0);
  };
  const toNumber = (value: string) => {
    const number = parseInt(value, 10);
    return Number.isFinite(number) ? number : null;
  };
  const toStatus = (value: string, time: number | null): ExternalResultStatus => {
    const lower = value.toLowerCase();
    if (/not start|ej start|^dns$|ej startat|nicht gestartet/.test(lower)) return 'DidNotStart';
    if (/not competing|ej tävlande|utom tävlan|^nc$/.test(lower)) return 'NotCompeting';
    if (/disq|diskv|^dsq$/.test(lower)) return 'Disqualified';
    if (/mispunch|missing punch|felst|^mp$/.test(lower)) return 'MissingPunch';
    if (time != null) return 'OK';
    return lower ? 'DidNotFinish' : 'DidNotStart';
  };
  // The cells of a row by their class ("p", "n", "o", "t", "lt", ...), the first cell of each class. A cell without
  // a class by the class of its header. The headers of a relay are not to be trusted ("Leg time" has "lp").
  const cellsOf = (row: string, headers: string[]) => {
    const cells: Record<string, string> = {};
    Array.from(row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)).forEach((cell, index) => {
      const key = /class="([^"]*)"/.exec(cell[1])?.[1].split(' ')[0] || headers[index] || String(index);
      if (cells[key] === undefined) cells[key] = cell[2];
    });
    return cells;
  };

  const listStart = html.search(
    /<div class="(individual|relay)[A-Za-z]*ResultList"|<div class="[A-Za-z]*[cC]hampionship[A-Za-z]*"/
  );
  const heading = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html.substring(Math.max(0, listStart)))?.[1] ?? '';
  const eventName = text(heading).replace(
    /^(official|preliminary|unofficial)?\s*(championship\s*)?results?( list)? for\s+|^(officiell|preliminär|inofficiell)?\s*(mästerskaps)?resultat(lista)? för\s+/i,
    ''
  );
  const info =
    /<\/h2>[\s\S]*?<p[^>]*>[\s\S]*?<\/p>\s*<p>([\s\S]*?)<\/p>/.exec(html.substring(Math.max(0, listStart)))?.[1] ?? '';
  const infoLines = info.split(/<br\s*\/?>/i).map(line => text(line));
  const lineAfter = (pattern: RegExp) => {
    const line = infoLines.find(l => pattern.test(l));
    return line ? line.substring(line.indexOf(':') + 1).trim() : '';
  };
  const dateText = lineAfter(/^(date|datum|dato|päivämäärä)\s*:/i);
  const organiser = lineAfter(/^(organiser|arrangör|organisers|arrangörsorganisationer|arrangörer)\s*:/i);

  const classes: IExternalClassResult[] = [];
  let relay = false;
  let missingLineups = false;
  const parts = html.split(/<div class="eventClassHeader"/).slice(1);
  for (const part of parts) {
    const name = text(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(part)?.[1] ?? '');
    const headerText = text(/<\/h3>([\s\S]*?)<\/div>/.exec(part)?.[1] ?? '');
    const kilometers = /^(\d+(?:[.,]\d+)?)\s*km\b/i.exec(headerText);
    const meters = /^(\d[\d\s]*)\s*m\b/i.exec(headerText);
    const lengthInMeter = kilometers
      ? Math.round(parseFloat(kilometers[1].replace(',', '.')) * 1000)
      : meters
        ? parseInt(meters[1].replace(/\s/g, ''), 10)
        : null;
    const tableStart = part.search(/<table[^>]*resultList/);
    if (!name || tableStart < 0) continue;
    const table = part.substring(tableStart, part.indexOf('</table>', tableStart));
    const headers = Array.from(table.matchAll(/<th([^>]*)>[\s\S]*?<\/th>/g)).map(
      match => /class="([^"]*)"/.exec(match[1])?.[1].split(' ')[0] ?? ''
    );
    // The page of a single leg ("tn" is the runner, "n" the team) is not read, the class has all the legs
    if (headers.includes('tn')) continue;
    const body = table.substring(Math.max(0, table.indexOf('<tbody')));
    const rows = body
      .split(/<tr(?=[\s>])/)
      .slice(1)
      .map(row => ({ className: /^[^>]*class="([^"]*)"/.exec(row)?.[1] ?? '', cells: cellsOf(row, headers) }));
    const isRelay = headers.includes('lp') || headers.includes('lt') || rows.some(r => /teamMember/.test(r.className));
    const persons: IExternalPersonResult[] = [];
    const teams: IExternalTeamResult[] = [];
    if (isRelay) {
      relay = true;
      for (const row of rows) {
        const timeText = text(row.cells.t ?? '');
        if (/teamMember/.test(row.className)) {
          const team = teams[teams.length - 1];
          if (!team) continue;
          const nameCell = (row.cells.n ?? '').replace(/^\s*(<[^>]*>\s*)*/, '');
          const legMatch = /^(\d+)\.\s*/.exec(text(nameCell));
          const leg = legMatch ? parseInt(legMatch[1], 10) : team.members.length + 1;
          const person = splitName(nameCell.replace(/^\s*\d+\.\s*/, ''));
          // A leg without a runner
          if (!person.given || /^(vacant|vakant)$/i.test(person.given)) continue;
          const legTimeText = text(row.cells.lt ?? '');
          const legTime = toSeconds(legTimeText);
          const totalTime = toSeconds(timeText);
          team.members.push({
            leg,
            given: person.given,
            family: person.family,
            legTime,
            legPlace: legTime != null ? toNumber(text(row.cells.lp ?? '')) : null,
            totalTime,
            totalPlace: totalTime != null ? toNumber(text(row.cells.op ?? '')) : null,
            status: toStatus(legTime == null ? legTimeText || timeText : '', legTime)
          });
        } else {
          const nameCell = row.cells.n ?? '';
          const clubs = Array.from(nameCell.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g))
            .map(match => text(match[1]))
            .filter(club => club);
          const teamName = text(nameCell);
          const time = toSeconds(timeText);
          teams.push({
            name: teamName,
            clubs: clubs.length
              ? clubs
              : teamName
                  .replace(/\s+\d+$/, '')
                  .split(' / ')
                  .map(club => club.trim()),
            place: time != null ? toNumber(text(row.cells.p ?? '')) : null,
            time,
            status: toStatus(timeText, time),
            members: []
          });
        }
      }
      if (teams.length && teams.every(team => !team.members.length)) missingLineups = true;
    } else {
      for (const row of rows) {
        const nameCell = row.cells.n;
        if (nameCell === undefined) continue;
        const person = splitName(nameCell);
        if (!person.given) continue;
        const timeText = text(row.cells.t ?? '');
        const time = toSeconds(timeText);
        const status = toStatus(time == null ? timeText : '', time);
        persons.push({
          given: person.given,
          family: person.family,
          club: text(row.cells.o ?? ''),
          place: status === 'OK' ? toNumber(text(row.cells.p ?? '')) : null,
          time: status === 'OK' ? time : null,
          status
        });
      }
    }
    classes.push({ name, lengthInMeter: isRelay ? null : lengthInMeter, persons, teams });
  }
  return {
    kind: classes.length ? (relay ? 'relay' : 'individual') : 'other',
    eventName,
    dateText,
    organiser,
    classes,
    missingLineups
  };
}

/**
 * Reads a page of tulospalvelu.fi as it is shown, a class at a time: the results ("standings/1/0", "stallning"),
 * the split times ("splits", "stracktided"), and for a relay the standings after a leg ("stallning/2/0", the team, the
 * runner of the leg, the leg time and the time and place of the team) or the leg times ("etapptider/7"). It is also
 * run by the bookmarklet (as its source text), so it must not use anything outside itself.
 */
export function ParseTulospalveluPage(html: string, url: string): IEventorResultPage {
  const NBSP = String.fromCharCode(160);
  const decode = (value: string) =>
    value
      .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  const text = (value: string) =>
    decode(value.replace(/<[^>]*>/g, ' '))
      .split(NBSP)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  const splitName = (value: string) => {
    const parts = value.split(' ').filter(part => part);
    return { given: parts.slice(0, 1).join(' '), family: parts.slice(1).join(' ') };
  };
  const toSeconds = (value: string) => {
    if (!/^\d{1,3}(:\d{2}){0,2}$/.test(value)) return null;
    return value.split(':').reduce((seconds, part) => seconds * 60 + parseInt(part, 10), 0);
  };
  const toNumber = (value: string) => {
    const number = parseInt(value, 10);
    return Number.isFinite(number) ? number : null;
  };
  const toStatus = (value: string, time: number | null): ExternalResultStatus => {
    const lower = value.toLowerCase();
    if (/not start|ei lähtenyt|ej start|^dns$|ej startat/.test(lower)) return 'DidNotStart';
    if (/disq|disk|hylätty|^dsq$/.test(lower)) return 'Disqualified';
    if (/mispunch|missing punch|felst|leimaus|^mp$/.test(lower)) return 'MissingPunch';
    if (/not competing|ej tävlande|^nc$/.test(lower)) return 'NotCompeting';
    if (time != null) return 'OK';
    return lower ? 'DidNotFinish' : 'DidNotStart';
  };
  const kilometers = (value: string) => {
    const match = /(\d+(?:[.,]\d+)?)\s*km\b/i.exec(value);
    return match ? Math.round(parseFloat(match[1].replace(',', '.')) * 1000) : null;
  };
  const other: IEventorResultPage = {
    kind: 'other',
    eventName: '',
    dateText: '',
    organiser: '',
    classes: [],
    missingLineups: false
  };

  // /tulokset-new/sv/nj2026_nj/nj/stallning/2/0/: the event, the class, the view, the leg and the point of the leg
  const path = url
    .replace(/^[a-z]+:\/\/[^/]+/i, '')
    .split(/[?#]/)[0]
    .split('/')
    .filter(part => part);
  const base = path.findIndex(part => /^tulokset/.test(part));
  const leg = toNumber(path[base + 5] ?? '');
  const point = path[base + 6];
  // A standing at a control of the course is not the result
  if (point !== undefined && point !== '0') return other;

  const tableStart = html.search(/<table[^>]*id="OnlineTable"/);
  if (tableStart < 0) return other;
  const heading = text(/<h1[^>]*OnlineHeaderUpper[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '');
  const headingDate = /^(.*?),?\s+(\d{1,2}\.\d{1,2}\.\d{4})$/.exec(heading);
  const className = text(/<h2[^>]*ClassNameTitle[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1] ?? '');
  // A page without the class (e.g. the start list) is not taken, nor is any other without a result
  if (!className) return other;
  const subHeading = text(/<div id="OnlineHeaderLower"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/.exec(html)?.[1] ?? '');
  // The length is in the heading of the results ("Finish 1,9 km", "2. Växling 4,9 km"), else in the link to them
  const resultLink = Array.from(html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)).find(
    link => /\/\d+\/0\/?$/.test(link[1]) && /km/.test(link[2])
  );
  const lengthInMeter = kilometers(subHeading) ?? (resultLink ? kilometers(text(resultLink[2])) : null);

  const table = html.substring(tableStart, html.indexOf('</table>', tableStart));
  const headers = Array.from(
    (/<thead[\s\S]*?<\/thead>/.exec(table)?.[0] ?? '').matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)
  ).map(match => text(match[1]).toLowerCase());
  const column = (pattern: RegExp) => headers.findIndex(header => pattern.test(header));
  const placeColumn = column(/^(pl|sija|plac|pos)/);
  const bibColumn = column(/^(nr|bib|no|nro|numero)\.?$/);
  const teamColumn = column(/^(lag|team|joukkue)$/);
  const nameColumn = column(/^(namn|name|nimi)/);
  const clubColumn = column(/^(klubb|club|seura)$/);
  const resultColumn = column(/^(resultat|result|tulos)$/);
  if (resultColumn < 0) return other;
  const legTimeColumn = column(/(etapp|leg|osuus|sträcka)/);
  // "S-1", "1-2", ..., the last one to the finish ("10-F") is not a control
  const splitColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => /^(s|l|\d+)\s*-\s*\d+$/.test(header));
  const rows = table
    .substring(Math.max(0, table.indexOf('<tbody')))
    .split(/<tr(?=[\s>])/)
    .slice(1)
    .map(row => Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(cell => cell[1]));
  const cell = (cells: string[], index: number) => (index >= 0 ? (cells[index] ?? '') : '');

  const persons: IExternalPersonResult[] = [];
  const teams: IExternalTeamResult[] = [];
  const isRelay = teamColumn >= 0;
  if (isRelay) {
    const legNumber = leg ?? toNumber(/(\d+)\./.exec(subHeading)?.[1] ?? '') ?? 1;
    // The standings after a leg ("stallning/2/0") have the leg time in a column of its own, the leg times have it as
    // the result. After the first leg the standings have no such column, the leg time is the time of the team.
    const isStanding = legTimeColumn >= 0 || point === '0';
    for (const cells of rows) {
      const teamName = text(cell(cells, teamColumn));
      const person = splitName(text(cell(cells, nameColumn)));
      if (!teamName || !person.given) continue;
      const resultText = text(cell(cells, resultColumn));
      const resultTime = toSeconds(resultText);
      const place = toNumber(text(cell(cells, placeColumn)));
      const legTimeText = legTimeColumn >= 0 ? text(cell(cells, legTimeColumn)) : resultText;
      const legTime = toSeconds(legTimeText);
      const club = teamName.replace(/\s+\d+$/, '');
      teams.push({
        name: teamName,
        bib: text(cell(cells, bibColumn)) || teamName,
        clubs: [club, ...club.split(/\s+[-/]\s+/)].filter((name, index, all) => all.indexOf(name) === index),
        place: isStanding && resultTime != null ? place : null,
        time: isStanding ? resultTime : null,
        status: isStanding ? toStatus(resultTime == null ? resultText : '', resultTime) : 'OK',
        afterLeg: isStanding ? legNumber : undefined,
        members: [
          {
            leg: legNumber,
            given: person.given,
            family: person.family,
            legTime,
            legPlace: !isStanding && legTime != null ? place : null,
            totalTime: isStanding ? resultTime : null,
            totalPlace: isStanding && resultTime != null ? place : null,
            status: toStatus(legTime == null ? legTimeText || resultText : '', legTime)
          }
        ]
      });
    }
    const legLengths: (number | null)[] = [];
    legLengths[legNumber - 1] = lengthInMeter;
    return {
      kind: 'relay',
      eventName: headingDate ? headingDate[1] : heading,
      dateText: headingDate ? headingDate[2] : '',
      organiser: '',
      classes: [{ name: className, lengthInMeter: null, persons, teams, legLengths }],
      missingLineups: false
    };
  }

  for (const cells of rows) {
    // The split times have the name and the club in one cell, the number of the runner in it as well
    const nameCell = cell(cells, nameColumn).replace(/<span[^>]*class="Bib"[^>]*>[\s\S]*?<\/span>/g, '');
    const nameLink = /<a[^>]*Popup=Competitor[^>]*>([\s\S]*?)<\/a>/.exec(nameCell);
    const person = splitName(text(nameLink ? nameLink[1] : nameCell));
    if (!person.given) continue;
    const clubLink = cells.map(c => /<a[^>]*Popup=ClubResults[^>]*>([\s\S]*?)<\/a>/.exec(c)).find(m => m);
    const club = clubColumn >= 0 ? text(cell(cells, clubColumn)) : clubLink ? text(clubLink[1]) : '';
    const resultText = text(cell(cells, resultColumn));
    const time = toSeconds(resultText);
    const status = toStatus(time == null ? resultText : '', time);
    const splits = splitColumns
      .map(({ index }, number) => {
        // The time from the start comes first, then the time from the control before
        const first = cell(cells, index).split(/<br\s*\/?>/i)[0];
        const seconds = toSeconds(text(first.replace(/<span[^>]*class="rank"[^>]*>[\s\S]*?<\/span>/g, '')));
        return seconds != null ? { code: String(number + 1), time: seconds } : undefined;
      })
      .filter((split): split is IExternalSplitTime => !!split);
    persons.push({
      given: person.given,
      family: person.family,
      club,
      place: status === 'OK' ? toNumber(text(cell(cells, placeColumn))) : null,
      time: status === 'OK' ? time : null,
      status,
      ...(splits.length ? { splits } : {})
    });
  }
  return {
    kind: persons.length ? 'individual' : 'other',
    eventName: headingDate ? headingDate[1] : heading,
    dateText: headingDate ? headingDate[2] : '',
    organiser: '',
    classes: persons.length ? [{ name: className, lengthInMeter, persons, teams: [] }] : [],
    missingLineups: false
  };
}

/**
 * Reads a page of SPORTident Center as it is shown, the chosen class: the analysis (the names, the club and the split
 * times with the codes of the controls) or the overview (the result list). It is also run by the bookmarklet (as its
 * source text), so it must not use anything outside itself.
 */
export function ParseSportIdentPage(html: string): IEventorResultPage {
  const NBSP = String.fromCharCode(160);
  const decode = (value: string) =>
    value
      .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  const text = (value: string) =>
    decode(value.replace(/<[^>]*>/g, ' '))
      .split(NBSP)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  const byClass = (source: string, name: string, tag = '[a-z-]+') =>
    new RegExp(`<(${tag})[^>]*class="${name}(?:\\s[^"]*)?"[^>]*>([\\s\\S]*?)</\\1>`).exec(source)?.[2] ?? '';
  const toSeconds = (value: string) => {
    if (!/^\d{1,3}(:\d{2}){1,2}$/.test(value)) return null;
    return value.split(':').reduce((seconds, part) => seconds * 60 + parseInt(part, 10), 0);
  };
  const toNumber = (value: string) => {
    const number = parseInt(value, 10);
    return Number.isFinite(number) ? number : null;
  };
  const toStatus = (value: string, time: number | null): ExternalResultStatus => {
    const lower = value.toLowerCase();
    if (/^dns$|not start/.test(lower)) return 'DidNotStart';
    if (/^(dsq|disq)/.test(lower)) return 'Disqualified';
    if (/^mp$|mispunch/.test(lower)) return 'MissingPunch';
    if (/^nc$|not competing/.test(lower)) return 'NotCompeting';
    if (time != null) return 'OK';
    return lower ? 'DidNotFinish' : 'DidNotStart';
  };
  // "Simon Hector (1997)"
  const withoutYear = (value: string) => value.replace(/\(\d{4}\)\s*$/, '').trim();
  const splitName = (value: string) => {
    const parts = value.split(' ').filter(part => part);
    return { given: parts.slice(0, 1).join(' '), family: parts.slice(1).join(' ') };
  };

  const eventName = text(byClass(html, 'title-title') || byClass(html, 'event-name'));
  const dateText = text(byClass(html, 'event-date'));
  const className = (
    text(byClass(html, 'class-name', 'span')) ||
    text(byClass(byClass(html, 'card-class-information', 'li'), 'row1', 'span'))
  ).replace(/\s*\(\d+\/\d+\)$/, '');
  const persons: IExternalPersonResult[] = [];

  const tableStart = html.indexOf('split-times-table-row');
  if (tableStart >= 0) {
    const table = html.substring(html.lastIndexOf('<table', tableStart), html.indexOf('</table>', tableStart));
    const headers = Array.from(table.matchAll(/<th([^>]*)>([\s\S]*?)<\/th>/g)).map(match => ({
      split: /split-times-column/.test(match[1]),
      code: /\((\w+)\)/.exec(text(match[2]))?.[1]
    }));
    const rows = table
      .split(/<tr(?=[^>]*split-times-table-row)/)
      .slice(1)
      .map(row => Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(c => c[1]));
    for (const cells of rows) {
      const participant = cells[1] ?? '';
      const given = text(byClass(participant, 'firstname', 'div'));
      const family = text(byClass(participant, 'lastname', 'div'));
      const name = given ? { given, family } : splitName(withoutYear(text(byClass(participant, 'name', 'div'))));
      if (!name.given) continue;
      const club = text(byClass(participant, 'club', 'div')) || text(byClass(participant, 'club-yob', 'div'));
      const timeText = text(/<span[^>]*>([\s\S]*?)<\/span>/.exec(cells[2] ?? '')?.[1] ?? '');
      const time = toSeconds(timeText);
      const status = toStatus(time == null ? timeText : '', time);
      // A split cell has the time of the leg, its time behind, the time from the start and its time behind
      const splits = headers
        .map((header, index) => {
          if (!header.split || !header.code) return undefined;
          const times = Array.from(
            (cells[index] ?? '').matchAll(/<span[^>]*class="time[^"]*"[^>]*>([\s\S]*?)<\/span>/g)
          );
          const seconds = toSeconds(text(times[2]?.[1] ?? ''));
          return seconds != null ? { code: header.code, time: seconds } : undefined;
        })
        .filter((split): split is IExternalSplitTime => !!split);
      persons.push({
        given: name.given,
        family: name.family,
        club,
        place: status === 'OK' ? toNumber(text(byClass(cells[0] ?? '', 'check-box', 'div'))) : null,
        time: status === 'OK' ? time : null,
        status,
        ...(splits.length ? { splits } : {})
      });
    }
  } else {
    const items = html.split(/<li(?=[^>]*class="card-resultlist(?![^"]*card-resultlist-header))/).slice(1);
    for (const item of items) {
      const name = splitName(withoutYear(text(byClass(item, 'participant-name', 'span'))));
      if (!name.given) continue;
      const timeText = text(byClass(item, 'participant-time', 'span'));
      const time = toSeconds(timeText);
      const status = toStatus(time == null ? timeText : '', time);
      persons.push({
        given: name.given,
        family: name.family,
        club: text(byClass(item, 'participant-club', 'span')),
        place: status === 'OK' ? toNumber(text(byClass(item, 'participant-position', 'span'))) : null,
        time: status === 'OK' ? time : null,
        status
      });
    }
  }
  return {
    kind: persons.length && className ? 'individual' : 'other',
    eventName,
    dateText,
    organiser: '',
    classes: persons.length && className ? [{ name: className, lengthInMeter: null, persons, teams: [] }] : [],
    missingLineups: false
  };
}

/**
 * The results collected so far with those of one more page: a class is replaced, the legs of a relay are added to
 * their teams (by the number of the team). It is also run by the bookmarklet (as its source text), so it must not use
 * anything outside itself.
 */
export function MergeResultPages(collected: IExternalResults | undefined, page: IExternalResults): IExternalResults {
  const result: IExternalResults = collected
    ? JSON.parse(JSON.stringify(collected))
    : { url: page.url, eventName: '', dateText: '', organiser: '', classes: [] };
  result.url = page.url || result.url;
  result.eventName = page.eventName || result.eventName;
  result.dateText = page.dateText || result.dateText;
  result.organiser = page.organiser || result.organiser;
  // A class without a name (read by an earlier version) is not kept
  result.classes = result.classes.filter(c => c.name);
  for (const pageClass of page.classes.filter(c => c.name)) {
    const existing = result.classes.find(c => c.name === pageClass.name);
    if (!existing) {
      result.classes.push(JSON.parse(JSON.stringify(pageClass)));
      continue;
    }
    if (pageClass.persons.length) existing.persons = pageClass.persons;
    if (pageClass.lengthInMeter) existing.lengthInMeter = pageClass.lengthInMeter;
    (pageClass.legLengths ?? []).forEach((length, index) => {
      if (length == null) return;
      existing.legLengths = existing.legLengths ?? [];
      existing.legLengths[index] = length;
    });
    for (const pageTeam of pageClass.teams) {
      const team = existing.teams.find(t => (t.bib ?? t.name) === (pageTeam.bib ?? pageTeam.name));
      if (!team) {
        existing.teams.push(pageTeam);
        continue;
      }
      if (pageTeam.afterLeg != null && pageTeam.afterLeg >= (team.afterLeg ?? 0)) {
        team.place = pageTeam.place;
        team.time = pageTeam.time;
        team.status = pageTeam.status;
        team.afterLeg = pageTeam.afterLeg;
      }
      for (const pageMember of pageTeam.members) {
        const member = team.members.find(m => m.leg === pageMember.leg);
        if (!member) {
          team.members.push(pageMember);
          continue;
        }
        // The standings after the leg and the leg times have different parts of it. The status is of the page with
        // the leg time, when only one has it.
        if (pageMember.legTime != null || member.legTime == null) member.status = pageMember.status;
        member.given = pageMember.given || member.given;
        member.family = pageMember.family || member.family;
        member.legTime = pageMember.legTime ?? member.legTime;
        member.legPlace = pageMember.legPlace ?? member.legPlace;
        member.totalTime = pageMember.totalTime ?? member.totalTime;
        member.totalPlace = pageMember.totalPlace ?? member.totalPlace;
      }
      team.members.sort((a, b) => a.leg - b.leg);
    }
  }
  return result;
}

/** The texts of the bookmarklet, "{n}" etc. are replaced by it */
export interface IResultsBookmarkletTexts {
  /** The heading of the dialog, the name of the bookmark */
  title: string;
  wrongPage: string;
  fetching: string;
  failed: string;
  ready: string;
  /** "{names}" are the classes (and legs) collected so far */
  collected: string;
  /** The browser could not keep what is collected for the next page */
  notKept: string;
  /** The button left of "Close", that keeps what is collected for the next click on the bookmark */
  closeAndContinue: string;
  /** In bold with a green check when the results are copied */
  copiedTitle: string;
  /** What to do then, after what was copied */
  copied: string;
  copyManually: string;
  close: string;
}

/** The readers of the pages, given to the bookmarklet as their source text */
export interface IResultsBookmarkletReaders {
  eventor: (html: string) => IEventorResultPage;
  tulospalvelu: (html: string, url: string) => IEventorResultPage;
  sportident: (html: string) => IEventorResultPage;
  merge: (collected: IExternalResults | undefined, page: IExternalResults) => IExternalResults;
}

/**
 * What the bookmarklet does on a page of results, in a dialog over the page:
 * - an IOF XML file shown by the browser (e.g. of FISO): it is copied as it is
 * - a result list of Eventor, all the classes: a relay list without the runners of the teams is fetched again with
 *   them (the same site, after the browser check)
 * - a page of tulospalvelu.fi or SPORTident Center, a class or a leg at a time: it is added to those collected before
 *   on the same site for the same event (kept by the browser), and all of them are copied
 * It is run as its source text, so it must not use anything outside itself.
 */
export function ResultsBookmarkletMain(
  readers: IResultsBookmarkletReaders,
  texts: IResultsBookmarkletTexts,
  createDialog: typeof CreateBookmarkletDialog
) {
  // An XML file has no body for a dialog, the browser tells instead. It is copied at once, while the click on the
  // bookmark still allows it.
  if (!document.body) {
    const xml = new XMLSerializer().serializeToString(document);
    if (!/<ResultList[\s>]/.test(xml)) {
      alert(texts.wrongPage);
      return;
    }
    if (!navigator.clipboard) {
      alert(texts.failed.replace('{message}', 'navigator.clipboard'));
      return;
    }
    navigator.clipboard.writeText(xml).then(
      () => alert(texts.copied),
      error => alert(texts.failed.replace('{message}', error instanceof Error ? error.message : String(error)))
    );
    return;
  }

  const dialog = createDialog('sportclub-results', texts.title, texts.close);
  const show = dialog.show;

  // Copied at once, it tells clearly that it is done. When the browser does not allow it (the click on the bookmark
  // may be too long ago), the text is shown selected to copy by hand, and it is done when the user has copied it.
  let isCopied = false;
  const copy = (json: string, message: string) => {
    const copied = () => {
      isCopied = true;
      dialog.success(texts.copiedTitle, `${message}\n${texts.copied}`);
    };
    const manually = () => {
      const area = dialog.area(json);
      area.addEventListener('copy', copied);
      let done = false;
      try {
        done = document.execCommand('copy');
      } catch {
        done = false;
      }
      if (done) copied();
      else show(`${message}\n${texts.copyManually}`, true);
    };
    if (!navigator.clipboard) return manually();
    navigator.clipboard.writeText(json).then(copied, manually);
  };

  const run = async () => {
    const host = location.hostname;
    const isTulospalvelu = /tulospalvelu|jukola/.test(host);
    const isSportIdent = /sportident/.test(host);
    const html = document.documentElement.outerHTML;
    let page = isTulospalvelu
      ? readers.tulospalvelu(html, location.href)
      : isSportIdent
        ? readers.sportident(html)
        : readers.eventor(html);
    if (page.kind === 'other') {
      show(texts.wrongPage, true);
      return;
    }
    if (page.missingLineups) {
      show(texts.fetching);
      const url = new URL(location.href);
      url.searchParams.set('showRelayLineups', 'True');
      const response = await fetch(url.toString(), { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}, ${url.toString()}`);
      page = readers.eventor(await response.text());
    }
    let results: IExternalResults = {
      url: location.href,
      eventName: page.eventName,
      dateText: page.dateText,
      organiser: page.organiser,
      classes: page.classes
    };
    let message: string;
    if (isTulospalvelu || isSportIdent) {
      // Everything collected is kept, whatever page or event it is from (e.g. Venla after Jukola), until the user
      // starts over
      const key = 'sportclub-results';
      let collected: { results?: IExternalResults } | undefined;
      try {
        collected = JSON.parse(localStorage.getItem(key) ?? 'null') ?? undefined;
      } catch {
        collected = undefined;
      }
      results = readers.merge(collected?.results, results);
      let kept = true;
      try {
        localStorage.setItem(key, JSON.stringify({ results }));
      } catch {
        // E.g. too much for the browser, what is collected is copied but the next page starts over
        kept = false;
      }
      const names = results.classes
        .filter(c => c.name)
        .map(c => {
          const legs = c.teams
            .flatMap(team => team.members.map(member => member.leg))
            .filter((leg, index, all) => all.indexOf(leg) === index)
            .sort((a, b) => a - b);
          return legs.length ? `${c.name} (${legs.join(', ')})` : c.name;
        });
      message = texts.collected.replace('{names}', names.join(', ')) + (kept ? '' : ` ${texts.notKept}`);
      // "Close" leaves the copy to be pasted, and the next click on the bookmark starts from nothing. Not before the
      // results are copied, they would be lost.
      dialog.onClose(() => {
        if (!isCopied) return;
        try {
          localStorage.removeItem(key);
        } catch {
          // Nothing kept
        }
      });
      dialog.button(texts.closeAndContinue, dialog.close);
    } else {
      const count = page.classes.reduce(
        (sum, c) => sum + c.persons.length + c.teams.reduce((members, team) => members + team.members.length, 0),
        0
      );
      message = texts.ready.replace('{classes}', String(page.classes.length)).replace('{results}', String(count));
    }
    show(message);
    copy(JSON.stringify({ sportclubResults: 1, ...results }), message);
  };
  run().catch(error =>
    show(texts.failed.replace('{message}', error instanceof Error ? error.message : String(error)), true)
  );
}

/** The bookmarklet, "javascript:..." with the readers of the pages, the dialog and the texts in it */
export const ResultsBookmarklet = (texts: IResultsBookmarkletTexts) =>
  `javascript:${encodeURIComponent(
    `(${ResultsBookmarkletMain.toString()})({eventor:${ParseEventorResultPage.toString()},tulospalvelu:${ParseTulospalveluPage.toString()},sportident:${ParseSportIdentPage.toString()},merge:${MergeResultPages.toString()}},${JSON.stringify(texts)},${CreateBookmarkletDialog.toString()});void 0`
  )}`;

/**
 * What the user pasted, as a result list of one race: the results copied by the bookmarklet, or an IOF XML result
 * list (copied by it from a file shown by the browser, e.g. of FISO). Undefined when it is neither.
 */
export const ParsePastedResults = (text: string | null | undefined): IResultListType | undefined => {
  const value = (text ?? '').trim();
  if (/^(<\?xml[^>]*>\s*)?<ResultList[\s>]/.test(value.replace(/^\uFEFF/, ''))) {
    return ToExternalResultList(IofXmlToJson(value));
  }
  const results = ParseEventorResultsClipboard(value);
  return results ? ToExternalResultList(ExternalResultsToResultList(results)) : undefined;
};

const STATUSES: ExternalResultStatus[] = [
  'OK',
  'DidNotStart',
  'DidNotFinish',
  'MissingPunch',
  'Disqualified',
  'NotCompeting'
];
const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const asStatus = (value: unknown): ExternalResultStatus =>
  STATUSES.includes(value as ExternalResultStatus) ? (value as ExternalResultStatus) : 'DidNotFinish';
const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];

/** What the user pasted: the JSON of the bookmarklet. Undefined when it is not. */
export const ParseEventorResultsClipboard = (text: string | null | undefined): IExternalResults | undefined => {
  const value = (text ?? '').trim();
  if (!value.startsWith('{')) return undefined;
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (json?.sportclubResults !== 1 || !Array.isArray(json.classes)) return undefined;
  return {
    url: asString(json.url),
    eventName: asString(json.eventName),
    dateText: asString(json.dateText),
    organiser: asString(json.organiser),
    classes: asArray(json.classes)
      .map(c => ({
        name: asString(c.name),
        lengthInMeter: asNumber(c.lengthInMeter),
        persons: asArray(c.persons).map(p => {
          const splits = asArray(p.splits)
            .map(split => ({ code: asString(split.code), time: asNumber(split.time) }))
            .filter((split): split is IExternalSplitTime => !!split.code && split.time != null);
          return {
            given: asString(p.given),
            family: asString(p.family),
            club: asString(p.club),
            place: asNumber(p.place),
            time: asNumber(p.time),
            status: asStatus(p.status),
            ...(splits.length ? { splits } : {})
          };
        }),
        ...(Array.isArray(c.legLengths) ? { legLengths: c.legLengths.map(asNumber) } : {}),
        teams: asArray(c.teams).map(team => ({
          name: asString(team.name),
          ...(asString(team.bib) ? { bib: asString(team.bib) } : {}),
          clubs: (Array.isArray(team.clubs) ? team.clubs : []).map(asString).filter(club => club),
          place: asNumber(team.place),
          time: asNumber(team.time),
          status: asStatus(team.status),
          members: asArray(team.members).map(m => ({
            leg: asNumber(m.leg) ?? 1,
            given: asString(m.given),
            family: asString(m.family),
            legTime: asNumber(m.legTime),
            legPlace: asNumber(m.legPlace),
            totalTime: asNumber(m.totalTime),
            totalPlace: asNumber(m.totalPlace),
            status: asStatus(m.status)
          }))
        }))
      }))
      .filter(c => c.name)
  };
};

const MONTHS: Record<string, number> = {
  january: 1,
  januari: 1,
  jan: 1,
  february: 2,
  februari: 2,
  feb: 2,
  march: 3,
  mars: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  maj: 5,
  june: 6,
  juni: 6,
  jun: 6,
  july: 7,
  juli: 7,
  jul: 7,
  august: 8,
  augusti: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oktober: 10,
  oct: 10,
  okt: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12
};

/**
 * "Sunday 8 September 2024", "lördag 12 oktober 2024", "July 12, 2025", "4.8.2024" or "2024-10-12" as "2024-10-12"
 */
export const ParseResultDate = (text?: string | null): string | undefined => {
  const value = (text ?? '').trim();
  const date = (year: string, month: number, day: string) =>
    `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return iso[0];
  const numeric = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(value);
  if (numeric) return date(numeric[3], parseInt(numeric[2], 10), numeric[1]);
  const dayFirst = /(\d{1,2})\.?\s+([a-zåäö]+)\.?\s+(\d{4})/i.exec(value);
  if (dayFirst && MONTHS[dayFirst[2].toLowerCase()])
    return date(dayFirst[3], MONTHS[dayFirst[2].toLowerCase()], dayFirst[1]);
  const monthFirst = /([a-zåäö]+)\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(value);
  if (monthFirst && MONTHS[monthFirst[1].toLowerCase()])
    return date(monthFirst[3], MONTHS[monthFirst[1].toLowerCase()], monthFirst[2]);
  return undefined;
};

/** The place on the leg by the leg times, when the page has none (the standings of tulospalvelu after a leg) */
const setLegPlaces = (teams: IExternalTeamResult[]) => {
  const legs = teams.flatMap(team => team.members);
  legs.forEach(member => {
    if (member.legPlace != null || member.status !== 'OK' || member.legTime == null) return;
    const faster = legs.filter(
      other =>
        other.leg === member.leg && other.status === 'OK' && other.legTime != null && other.legTime < member.legTime!
    ).length;
    member.legPlace = faster + 1;
  });
};

/** The results of the bookmarklet as an IOF XML result list of one race, as the proxy gives Eventor's */
export const ExternalResultsToResultList = (results: IExternalResults): IResultListType => {
  const isRelay = results.classes.some(c => c.teams.length > 0);
  const date = ParseResultDate(results.dateText);
  const result = (status: ExternalResultStatus, time: number | null, position: number | null) => ({
    ...(time != null && status === 'OK' ? { Time: time } : {}),
    ...(position != null && status === 'OK' ? { Position: position } : {}),
    Status: status
  });
  const json = {
    '@attributes': { iofVersion: '3.0' },
    Event: {
      Name: results.eventName,
      ...(date ? { StartTime: { Date: date } } : {}),
      ...(/orienteering\.sport/i.test(results.url) ? { Classification: 'International' } : {}),
      ...(results.organiser ? { Organiser: results.organiser.split(' / ').map(name => ({ Name: name })) } : {}),
      Form: [isRelay ? 'Relay' : 'Individual']
    },
    ClassResult: results.classes.map((classResult, classIndex) => {
      setLegPlaces(classResult.teams);
      return {
        Class: { Id: String(classIndex + 1), Name: classResult.name },
        // A relay has a course for each leg, in the order of the legs
        Course: classResult.legLengths?.length
          ? Array.from(classResult.legLengths, length => (length ? { Length: length } : {}))
          : classResult.lengthInMeter
            ? [{ Length: classResult.lengthInMeter }]
            : [],
        PersonResult: classResult.persons.map(person => ({
          Person: { Name: { Given: person.given, Family: person.family } },
          ...(person.club ? { Organisation: { Name: person.club } } : {}),
          Result: [
            {
              ...result(person.status, person.time, person.place),
              ...(person.splits?.length
                ? { SplitTime: person.splits.map(split => ({ ControlCode: split.code, Time: split.time })) }
                : {})
            }
          ]
        })),
        TeamResult: classResult.teams.map((team, teamIndex) => {
          const bibNumber = team.bib ? `${classIndex + 1}-${team.bib}` : `${classIndex + 1}-${teamIndex + 1}`;
          const lastLeg = Math.max(0, ...team.members.map(member => member.leg));
          return {
            Name: team.name,
            BibNumber: bibNumber,
            Organisation: team.clubs.map(club => ({ Name: club })),
            TeamMemberResult: team.members.map(member => {
              // The team result is on the last leg, as Eventor has it
              const overall =
                member.leg === lastLeg
                  ? result(
                      team.status === 'OK' && member.totalTime != null ? 'OK' : team.status,
                      team.time ?? member.totalTime,
                      team.place ?? member.totalPlace
                    )
                  : result(member.totalTime != null ? 'OK' : 'DidNotFinish', member.totalTime, member.totalPlace);
              return {
                Person: { Name: { Given: member.given, Family: member.family } },
                ...(team.clubs.length === 1 ? { Organisation: { Name: team.clubs[0] } } : {}),
                Result: [
                  {
                    Leg: member.leg,
                    BibNumber: bibNumber,
                    ...result(member.status, member.legTime, member.legPlace),
                    OverallResult: overall
                  }
                ]
              };
            })
          };
        })
      };
    })
  };
  return json as unknown as IResultListType;
};
