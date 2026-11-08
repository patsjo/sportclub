import { PostJsonData } from './api';
import { GetClassShortName } from './resultHelper';

/**
 * Course lengths from Livelox. Eventor and the IOF result list have one course length per class, and for a relay
 * not per leg, often none at all. Livelox has the courses of every leg, and the race in Eventor links to it
 * ("RedirectToLivelox?redirectUrl=/Events/Show/199348").
 *
 * The legs are numbered as in Eventor (1, 2, 3, ...), each with the name it has in Livelox. They differ when only
 * some legs are in Livelox, e.g. 25manna has the legs 1-10 in Eventor, where 8-10 are named 23-25.
 */
export interface ILiveloxLeg {
  /** The number of the leg in Eventor and Livelox */
  leg: number;
  /** The name of the leg in Livelox, e.g. "23" */
  name: string;
  /** The average length of the courses of the leg (the forkings), in meters */
  lengthInMeter: number | null;
  nofCourses: number;
}

export interface ILiveloxClass {
  classId: number;
  name: string;
  /** EventClassId in Eventor, when the class comes from Eventor */
  eventorClassId?: string;
  /** The course length of a class that is not a relay, in meters */
  lengthInMeter: number | null;
  legs: ILiveloxLeg[];
}

export interface ILiveloxEvent {
  eventId: number;
  name: string;
  url: string;
  /** The race in Eventor, "<EventId>-<race number>", e.g. "54099-1" */
  eventorId?: string;
  classes: ILiveloxClass[];
}

/** The answer of liveloxProxy.php */
export interface ILiveloxProxyPage {
  url: string;
  html: string;
}

/** The model of the event, as Livelox puts it in its page ("var model = {...}") */
interface ILiveloxModelExternalIdentifier {
  system?: number;
  id?: string;
}
interface ILiveloxModelClass {
  id: number;
  name: string;
  externalIdentifier?: ILiveloxModelExternalIdentifier | null;
  relayLegs?: { leg: number; name?: string | null }[] | null;
  relayLegGroups?: { relayLegs?: number[] | null; courses?: { length?: number | null }[] | null }[] | null;
}
interface ILiveloxModelEvent {
  id: number;
  name: string;
  externalIdentifier?: ILiveloxModelExternalIdentifier | null;
  classes?: ILiveloxModelClass[] | null;
}

// Eventor is system 0 in Livelox
const EVENTOR_SYSTEM = 0;

export const LiveloxSearchUrl = 'https://www.livelox.com/Home/SearchEvents';
export const LiveloxEventUrl = (eventId: number) => `https://www.livelox.com/Events/Show/${eventId}`;
export const EventorEventUrl = (eventorId: number) => `https://eventor.orientering.se/Events/Show/${eventorId}`;

/** liveloxProxy.php is next to eventorProxyWithCache.php */
export const LiveloxProxyUrl = (eventorCorsProxy?: string) =>
  eventorCorsProxy ? eventorCorsProxy.replace(/[^/]*$/, 'liveloxProxy.php') : undefined;

const decodeEntities = (text: string) =>
  text
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const safeDecodeURIComponent = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

const unique = (values: number[]) => values.filter((value, index) => values.indexOf(value) === index);

/** The ids of the events in Livelox that the page of a race in Eventor links to */
export const GetLiveloxEventIds = (html: string): number[] => {
  const text = decodeEntities(html);
  const ids: number[] = [];
  for (const match of text.matchAll(/RedirectToLivelox\?[^"'\s<>]*/gi)) {
    const redirectUrl = /[?&]redirectUrl=([^&]*)/i.exec(match[0]);
    const id = redirectUrl ? /\/Events\/Show\/(\d+)/i.exec(safeDecodeURIComponent(redirectUrl[1])) : null;
    if (id) ids.push(parseInt(id[1], 10));
  }
  for (const match of text.matchAll(/livelox\.com\/Events\/Show\/(\d+)/gi)) ids.push(parseInt(match[1], 10));
  return unique(ids);
};

/**
 * The id of the event in Livelox, from what the user pasted: the link to Livelox on the race in Eventor, a link to
 * the event in Livelox, or the id itself. A link to the race in Eventor is not a link to Livelox.
 */
export const LiveloxEventIdFromLink = (link?: string | null): number | undefined => {
  const text = decodeEntities(link?.trim() ?? '');
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  if (/RedirectToLivelox/i.test(text) || /livelox\.com/i.test(text)) {
    const id = /\/Events\/Show\/(\d+)/i.exec(safeDecodeURIComponent(text));
    return id ? parseInt(id[1], 10) : undefined;
  }
  return undefined;
};

/** The JSON object that starts at the first "{" after the marker, e.g. "var model = " */
const extractJsonObject = (text: string, marker: string): string | undefined => {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return undefined;
  const start = text.indexOf('{', markerIndex + marker.length);
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === '\\') i++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return undefined;
};

/** A length as Livelox shows it, "6,170 m" or a range "4,800–4,900 m", as the average in meters */
export const ParseLiveloxLength = (text?: string | null): number | null => {
  const value = decodeEntities(text ?? '').trim();
  if (!value) return null;
  const km = /\bkm\b/i.test(value);
  const lengths = value
    .split(/[–—]|\s-\s/)
    .map(part => part.replace(/[^\d.,]/g, ''))
    .map(part => (km ? parseFloat(part.replace(',', '.')) * 1000 : parseInt(part.replace(/[.,]/g, ''), 10)))
    .filter(length => Number.isFinite(length) && length > 0);
  return lengths.length ? Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length) : null;
};

/** The rows of the table of classes in the page: the class, and the leg of a relay, with its course length */
const parseClassRows = (html: string) =>
  html
    .split(/<div class="class">/)
    .slice(1)
    .map(row => {
      const classId = /[?&;]classId=(\d+)/.exec(row);
      const relayLeg = /[?&;]relayLeg=(\d+)/.exec(row);
      const length = /<div class="course-length">([\s\S]*?)<\/div>/.exec(row);
      return {
        classId: classId ? parseInt(classId[1], 10) : undefined,
        relayLeg: relayLeg ? parseInt(relayLeg[1], 10) : undefined,
        lengthInMeter: ParseLiveloxLength(length?.[1])
      };
    });

const eventorId = (identifier?: ILiveloxModelExternalIdentifier | null) =>
  identifier?.system === EVENTOR_SYSTEM && identifier.id ? identifier.id : undefined;

/** The event in the page of Livelox, with the course length of every class and relay leg */
export const ParseLiveloxEvent = (html: string, url: string): ILiveloxEvent => {
  const json = extractJsonObject(html, 'var model = ');
  if (!json) throw new Error(`The page in Livelox has no event (var model is missing), ${url}`);
  const event = (JSON.parse(json) as { event?: ILiveloxModelEvent }).event;
  if (!event) throw new Error(`The page in Livelox has no event, ${url}`);
  const rows = parseClassRows(html);

  const classes = (event.classes ?? []).map((modelClass): ILiveloxClass => {
    const groups = modelClass.relayLegGroups ?? [];
    const legNumbers = unique([
      ...(modelClass.relayLegs ?? []).map(relayLeg => relayLeg.leg),
      ...groups.flatMap(group => group.relayLegs ?? [])
    ]).sort((a, b) => a - b);
    const legs = legNumbers.map((leg): ILiveloxLeg => {
      const lengths = groups
        .filter(group => group.relayLegs?.includes(leg))
        .flatMap(group => group.courses ?? [])
        .map(course => course.length)
        .filter((length): length is number => length != null && length > 0);
      const row = rows.find(r => r.classId === modelClass.id && r.relayLeg === leg);
      return {
        leg,
        name: modelClass.relayLegs?.find(relayLeg => relayLeg.leg === leg)?.name || leg.toString(),
        // The average of all the courses of the leg, the table only shows the shortest and the longest
        lengthInMeter: lengths.length
          ? Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length)
          : (row?.lengthInMeter ?? null),
        nofCourses: lengths.length || (row?.lengthInMeter ? 1 : 0)
      };
    });
    const classRow = rows.find(r => r.classId === modelClass.id && r.relayLeg == null);
    return {
      classId: modelClass.id,
      name: modelClass.name,
      eventorClassId: eventorId(modelClass.externalIdentifier)?.split('-')[0],
      lengthInMeter: classRow?.lengthInMeter ?? null,
      legs
    };
  });

  return { eventId: event.id, name: event.name, url, eventorId: eventorId(event.externalIdentifier), classes };
};

/**
 * The event of the race among those the race in Eventor links to. A race of an event with several races has the
 * race number after the id of the event ("54099-2"), else the first one.
 */
export const ChooseLiveloxEvent = (
  events: ILiveloxEvent[],
  eventorEventId?: number | null,
  raceNumber?: number | null
): ILiveloxEvent | undefined =>
  events.find(event => raceNumber != null && event.eventorId === `${eventorEventId}-${raceNumber}`) ??
  events.find(event => event.eventorId?.split('-')[0] === eventorEventId?.toString()) ??
  events[0];

/**
 * The classes of Livelox, by the class name of the results (the short name of the class in Eventor). The class in
 * Eventor is found by its id, else by the name.
 */
export const GetLiveloxClassesByName = (
  event: ILiveloxEvent,
  eventorClasses: { EventClassId: string; Name: string; ClassShortName: string }[] = []
): Map<string, ILiveloxClass> => {
  const classes = new Map<string, ILiveloxClass>();
  for (const liveloxClass of event.classes) {
    const eventorClass = liveloxClass.eventorClassId
      ? eventorClasses.find(c => c.EventClassId === liveloxClass.eventorClassId)
      : undefined;
    const names = [
      GetClassShortName(eventorClass?.ClassShortName),
      eventorClass?.Name,
      GetClassShortName(liveloxClass.name),
      liveloxClass.name
    ];
    names.forEach(name => {
      if (name && !classes.has(name)) classes.set(name, liveloxClass);
    });
  }
  return classes;
};

/**
 * The leg of a relay in Livelox.
 * 'leg': by the number of the leg in Eventor, as the results are imported.
 * 'name': by the name of the leg in Livelox, as the user changes the leg, e.g. from 8 to 23. The number of the leg
 * is only used when Livelox has no other name for it, leg 9 of 25manna is named 24 and is not the 9th leg.
 */
export const GetLiveloxLeg = (
  liveloxClass: ILiveloxClass | undefined,
  leg: number | null | undefined,
  by: 'leg' | 'name'
): ILiveloxLeg | undefined => {
  if (!liveloxClass || leg == null) return undefined;
  const byLeg = liveloxClass.legs.find(l => l.leg === leg);
  if (by === 'leg') return byLeg;
  return liveloxClass.legs.find(l => l.name === leg.toString()) ?? (byLeg?.name === leg.toString() ? byLeg : undefined);
};

interface ILengthResult {
  className: string;
  lengthInMeter?: number | null;
  setValues: (values: { lengthInMeter: number }) => void;
}
interface ILengthTeamResult extends ILengthResult {
  stage: number;
}
interface ILengthWinnerResult {
  className: string;
  lengthInMeter?: number | null;
  setLengthInMeter: (value: number) => void;
}

/**
 * The course lengths of Livelox in the results. A relay gets the length of each leg, also where Eventor had one
 * length for the whole class. The other races only get the lengths that are missing.
 * The winner results (the base of the ranking) are named "<class>" and "<class> - <leg>" for a relay.
 * Returns the number of results that got a length.
 */
export const ApplyLiveloxLengths = (
  liveloxClasses: Map<string, ILiveloxClass>,
  isRelay: boolean,
  results: ILengthResult[],
  teamResults: ILengthTeamResult[],
  winnerResults: ILengthWinnerResult[],
  /** Only the results without a length get one, a relay leg otherwise gets the length of Livelox */
  onlyMissing = false
): number => {
  let updated = 0;
  if (isRelay) {
    teamResults.forEach(teamResult => {
      const length = GetLiveloxLeg(liveloxClasses.get(teamResult.className), teamResult.stage, 'leg')?.lengthInMeter;
      if (length && teamResult.lengthInMeter !== length && !(onlyMissing && teamResult.lengthInMeter)) {
        teamResult.setValues({ lengthInMeter: length });
        updated++;
      }
    });
    winnerResults.forEach(winnerResult => {
      const classAndLeg = /^(.*) - (\d+)$/.exec(winnerResult.className);
      const length = classAndLeg
        ? GetLiveloxLeg(liveloxClasses.get(classAndLeg[1]), parseInt(classAndLeg[2], 10), 'leg')?.lengthInMeter
        : undefined;
      if (length && winnerResult.lengthInMeter !== length) winnerResult.setLengthInMeter(length);
    });
  } else {
    results.forEach(result => {
      const length = liveloxClasses.get(result.className)?.lengthInMeter;
      if (length && !result.lengthInMeter) {
        result.setValues({ lengthInMeter: length });
        updated++;
      }
    });
    winnerResults.forEach(winnerResult => {
      const length = liveloxClasses.get(winnerResult.className)?.lengthInMeter;
      if (length && !winnerResult.lengthInMeter) winnerResult.setLengthInMeter(length);
    });
  }
  return updated;
};

/** An event found by the search in Livelox, the same search as the start page of Livelox */
export interface ILiveloxSearchEvent {
  id: number;
  name: string;
  timeInterval?: { start: string; end: string } | null;
}

/**
 * What to search Livelox for: the name of the event in Eventor without the race ("O-Ringen Uppsala 2026, Etapp 2"
 * → "O-Ringen Uppsala 2026"), without the year, and its first word. Livelox often names the event by more than
 * Eventor does, "25manna" in Eventor is "25manna, Huddinge" in Livelox.
 */
export const LiveloxSearchTexts = (eventName?: string | null): string[] => {
  const name = (eventName ?? '').split(',')[0].replace(/\s+/g, ' ').trim();
  const withoutYear = name
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const firstWord = withoutYear.split(' ')[0];
  return [name, withoutYear, firstWord].filter(
    (text, index, texts) => text.length >= 3 && texts.indexOf(text) === index
  );
};

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length > 0);

const DAY = 24 * 60 * 60 * 1000;
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().substring(0, 10);

/**
 * The events of the search held on the day of the race (with half a day to spare for the time zone), the ones
 * most alike the name of the event in Eventor first.
 */
export const RankLiveloxSearchEvents = (
  events: ILiveloxSearchEvent[],
  raceDate: string,
  eventName?: string | null
): ILiveloxSearchEvent[] => {
  const dayStart = Date.parse(`${raceDate}T00:00:00Z`) - DAY / 2;
  const dayEnd = dayStart + 2 * DAY;
  const nameWords = words((eventName ?? '').split(',')[0]);
  const score = (event: ILiveloxSearchEvent) => {
    const eventWords = words(event.name);
    return nameWords.filter(word => eventWords.includes(word)).length / Math.max(1, eventWords.length);
  };
  return events
    .filter(event => {
      const start = Date.parse(event.timeInterval?.start ?? '');
      const end = Date.parse(event.timeInterval?.end ?? '');
      return Number.isFinite(start) && Number.isFinite(end) && start < dayEnd && end > dayStart;
    })
    .map(event => ({ event, score: score(event) }))
    .sort((a, b) => b.score - a.score)
    .map(({ event }) => event);
};

/** The event in Livelox was imported from the event in Eventor */
export const IsLiveloxEventOfEventor = (event: ILiveloxEvent, eventorEventId: number) =>
  event.eventorId?.split('-')[0] === eventorEventId.toString();

// The pages of events opened to find the right one, each is a request to Livelox
const MAX_CANDIDATES = 6;

/**
 * The event in Livelox of the race in Eventor, without the page in Eventor (which has a browser check that the
 * server seldom passes). Livelox is searched for the name on the day of the race, and an event only counts when
 * Livelox says it was imported from the event in Eventor, an event with a name alike is not enough.
 */
export const FindLiveloxEvent = async (
  liveloxProxy: string,
  race: { eventorEventId: number; raceNumber?: number | null; raceDate: string; eventName?: string | null }
): Promise<ILiveloxEvent | undefined> => {
  const opened = new Set<number>();
  // A page that could not be read does not stop the search, but tells why nothing was found
  let lastError: unknown;
  for (const text of LiveloxSearchTexts(race.eventName)) {
    const answer = await PostJsonData<{ events?: ILiveloxSearchEvent[] }>(
      liveloxProxy,
      { search: { from: addDays(race.raceDate, -1), to: addDays(race.raceDate, 2), text } },
      true,
      {},
      2
    );
    const found: ILiveloxEvent[] = [];
    for (const candidate of RankLiveloxSearchEvents(answer?.events ?? [], race.raceDate, race.eventName)) {
      if (opened.has(candidate.id)) continue;
      if (opened.size >= MAX_CANDIDATES) break;
      opened.add(candidate.id);
      try {
        const event = await FetchLiveloxEvent(liveloxProxy, candidate.id);
        if (IsLiveloxEventOfEventor(event, race.eventorEventId)) found.push(event);
      } catch (error) {
        lastError = error;
      }
    }
    if (found.length) return ChooseLiveloxEvent(found, race.eventorEventId, race.raceNumber);
    if (opened.size >= MAX_CANDIDATES) break;
  }
  if (lastError) throw lastError;
  return undefined;
};

/** The ids of the events in Livelox that the race in Eventor links to */
export const FetchLiveloxEventIds = async (liveloxProxy: string, eventorEventId: number) => {
  const page = await PostJsonData<ILiveloxProxyPage>(
    liveloxProxy,
    { url: EventorEventUrl(eventorEventId) },
    true,
    {},
    1
  );
  return GetLiveloxEventIds(page?.html ?? '');
};

/** The event in Livelox, with its course lengths */
export const FetchLiveloxEvent = async (liveloxProxy: string, liveloxEventId: number) => {
  // The lengths are read as Livelox writes them in English, "4,800–4,900 m"
  const url = `${LiveloxEventUrl(liveloxEventId)}?culture=en-US`;
  const page = await PostJsonData<ILiveloxProxyPage>(liveloxProxy, { url }, true, {}, 2);
  if (!page?.html) throw new Error(`No answer from Livelox, ${url}`);
  return ParseLiveloxEvent(page.html, (page.url || url).replace(/\?culture=[^&]*$/, ''));
};
