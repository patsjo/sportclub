import { IResultListType } from '../models/iof.xsd-3.0';
import { PostJsonData } from './api';
import { correctPhpEventorProxyXmlResponseForResult } from './iofXsd30ResponseHelper';

/**
 * Results of races that are not in Eventor (e.g. abroad), from other sources than Eventor. They are turned into
 * an IOF XML 3.0 result list of one race, as Eventor gives it, so that the import of Eventor can be used.
 * The club and its runners are found by name, these sources do not have the ids of Eventor.
 */

/**
 * "Skåneslättens OL" and "Skaneslattens OL" are the same club. Anything but text is no name: the proxy turns an
 * element holding only a space (WinSplits has <Family> </Family>) into an empty object.
 */
export const NormalizeName = (name?: unknown) =>
  (typeof name === 'string' ? name : '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The club names to find the runners of the club by, separated by comma or semicolon */
export const SplitClubNames = (text?: string | null) =>
  (text ?? '')
    .split(/[;,]/)
    .map(name => name.trim())
    .filter(name => name.length > 0);

export const IsClubOrganisation = (organisationName: string | null | undefined, clubNames: string[]) => {
  const name = NormalizeName(organisationName);
  return name.length > 0 && clubNames.some(clubName => NormalizeName(clubName) === name);
};

/**
 * The runner of the club by name, only when exactly one has it. When the given and the family name are not split as
 * the club has them ("Malin Agervig" "Kristiansson", or the family name first), all the words of the name are compared.
 */
export const FindCompetitorByName = <T extends { firstName: string; lastName: string }>(
  competitors: T[] | undefined,
  given: unknown,
  family: unknown
): T | undefined => {
  const first = NormalizeName(given);
  const last = NormalizeName(family);
  if (!competitors || !first || !last) return undefined;
  const found = competitors.filter(c => NormalizeName(c.firstName) === first && NormalizeName(c.lastName) === last);
  if (found.length) return found.length === 1 ? found[0] : undefined;
  const words = (value: string) => value.split(' ').sort().join(' ');
  const name = words(`${first} ${last}`);
  const byWords = competitors.filter(c => words(NormalizeName(`${c.firstName} ${c.lastName}`)) === name);
  return byWords.length === 1 ? byWords[0] : undefined;
};

/** A name in results of other sources, the words in any order: "Johansson Tim" is "Tim Johansson" */
export const ResultNameKey = (given: unknown, family: unknown) =>
  `${NormalizeName(given)} ${NormalizeName(family)}`.trim().split(' ').sort().join(' ');

/**
 * The names in results of other sources that the user linked to a runner of the club, kept by the browser. Results
 * of Eventor have the id of the person for it, these do not, and the runner would be asked for at every import.
 */
const linkedNamesKey = (clubId: number) => `sportclub-result-names-${clubId}`;
const linkedNames = (clubId: number): Record<string, number> => {
  try {
    const value = JSON.parse(localStorage.getItem(linkedNamesKey(clubId)) ?? '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};
export const FindLinkedCompetitorId = (clubId: number, given: unknown, family: unknown): number | undefined => {
  const key = ResultNameKey(given, family);
  const competitorId = key ? linkedNames(clubId)[key] : undefined;
  return typeof competitorId === 'number' ? competitorId : undefined;
};
export const LinkResultName = (clubId: number, given: unknown, family: unknown, competitorId: number) => {
  const key = ResultNameKey(given, family);
  if (!key) return;
  try {
    localStorage.setItem(linkedNamesKey(clubId), JSON.stringify({ ...linkedNames(clubId), [key]: competitorId }));
  } catch {
    // Not kept, the runner is asked for again the next time
  }
};

export const ExternalPersonIdPrefix = 'ext:';

type Json = Record<string, unknown>;
const asArray = (value: unknown): Json[] =>
  Array.isArray(value) ? (value as Json[]) : value != null ? [value as Json] : [];
const setRaceNumber = (item: Json) => {
  item['@attributes'] = { ...((item['@attributes'] as Json | undefined) ?? {}), raceNumber: 1 };
};

/**
 * The time behind the winner, and the position, of the approved results of a class that lack them. WinSplits has no
 * TimeBehind, and the import takes an approved result with a position other than 1 and without a time behind for
 * one without a position ("Fullföljt"), it then has no time in the cup and the ranking. Equal times share the
 * position.
 */
const setTimeBehindAndPosition = (results: Json[]) => {
  const approved = results.filter(result => result.Status === 'OK' && typeof result.Time === 'number');
  if (approved.length === 0) return;
  const times = approved.map(result => result.Time as number).sort((a, b) => a - b);
  approved.forEach(result => {
    if (result.TimeBehind == null) result.TimeBehind = (result.Time as number) - times[0];
    if (result.Position == null) result.Position = times.indexOf(result.Time as number) + 1;
  });
};

const HasPersonName = (owner: Json) => {
  const name = (owner.Person as Json | undefined)?.Name as Json | undefined;
  return NormalizeName(name?.Given).length > 0 && NormalizeName(name?.Family).length > 0;
};

/**
 * Result lists (e.g. one for each class) as one result list of a single race, numbered 1 as Eventor does: the
 * race of the event, and the race number on every result and course.
 */
export const ToSingleRaceResultList = (resultLists: IResultListType[]): IResultListType => {
  if (resultLists.length === 0) throw new Error('No result list');
  const first = resultLists[0];
  const classResults = resultLists.flatMap(resultList => resultList.ClassResult ?? []);
  // The split times are kept by the id of the person, a source without ids gets one of its own. It starts with
  // "ext:" and is never taken for an id of Eventor.
  let nextId = 1;
  const setPersonId = (owner: Json) => {
    const person = owner.Person as Json | undefined;
    // An empty <Id></Id> (the files of Oribos) is an object, not an id
    const ids: unknown[] = Array.isArray(person?.Id) ? person.Id : person?.Id != null ? [person.Id] : [];
    if (person && !ids.some(id => typeof id === 'string' && id.trim()))
      person.Id = [`${ExternalPersonIdPrefix}${nextId++}`];
  };
  classResults.forEach(classResult => {
    const json = classResult as unknown as Json;
    // The classes of whole teams in a relay of WinSplits ("Men, whole legs") have the initials of the team for a
    // person ("GB-AJ-VS") and no family name, they are not runners
    if (json.PersonResult != null) json.PersonResult = asArray(json.PersonResult).filter(HasPersonName);
    asArray(json.Course).forEach(setRaceNumber);
    asArray(json.PersonResult).forEach(personResult => {
      setPersonId(personResult);
      asArray(personResult.Result).forEach(setRaceNumber);
    });
    setTimeBehindAndPosition(asArray(json.PersonResult).flatMap(personResult => asArray(personResult.Result)));
    asArray(json.TeamResult).forEach(teamResult =>
      asArray(teamResult.TeamMemberResult).forEach(teamMemberResult => {
        setPersonId(teamMemberResult);
        asArray(teamMemberResult.Result).forEach(setRaceNumber);
      })
    );
  });
  const event = first.Event as unknown as Json;
  // The name of the stage is in the name of the event in WinSplits ("Bornholm Höst-Open 2026 Etape 1")
  const race = { RaceNumber: 1, Name: event.Name, StartTime: event.StartTime, Extensions: {} };
  return {
    ...first,
    Event: { ...first.Event, Race: [race] } as unknown as IResultListType['Event'],
    ClassResult: classResults
  };
};

/** The id of the event in WinSplits Online, from a link to it (databaseId=116342) or the id itself */
export const WinSplitsDatabaseId = (link?: string | null): number | undefined => {
  const text = link?.trim() ?? '';
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  const match = /[?&]databaseId=(\d+)/i.exec(text) ?? /winsplits\/api\/events\/(\d+)/i.exec(text);
  return match ? parseInt(match[1], 10) : undefined;
};

const WINSPLITS_API = 'https://obasen.orientering.se/winsplits/api/events';
export const WinSplitsClassesUrl = (databaseId: number) => `${WINSPLITS_API}/${databaseId}/classes`;
export const WinSplitsClassResultUrl = (databaseId: number, classId: number | string) =>
  `${WINSPLITS_API}/${databaseId}/classes/${classId}/resultlist/xml`;

interface IClassList {
  Class?: { Id?: number | string; Name?: string } | { Id?: number | string; Name?: string }[];
}

/**
 * The results of an event in WinSplits Online, all classes with split times, as an IOF XML result list of one race.
 * WinSplits has one event for each stage of an event of several days.
 */
export const FetchWinSplitsResults = async (
  eventorCorsProxy: string,
  databaseId: number,
  onClass?: (index: number, total: number, name?: string) => void
): Promise<IResultListType> => {
  const classList = await PostJsonData<IClassList>(
    eventorCorsProxy,
    { csurl: encodeURIComponent(WinSplitsClassesUrl(databaseId)) },
    true
  );
  const classes = asArray(classList?.Class).filter(c => c.Id != null);
  if (classes.length === 0) throw new Error(`No classes in WinSplits, ${WinSplitsClassesUrl(databaseId)}`);
  const resultLists: IResultListType[] = [];
  for (let i = 0; i < classes.length; i++) {
    onClass?.(i, classes.length, classes[i].Name as string | undefined);
    const url = WinSplitsClassResultUrl(databaseId, classes[i].Id as number);
    const resultList = await PostJsonData<IResultListType>(eventorCorsProxy, { csurl: encodeURIComponent(url) }, true);
    resultLists.push(correctPhpEventorProxyXmlResponseForResult(resultList));
  }
  return ToSingleRaceResultList(resultLists);
};

/**
 * An IOF XML result list, as the proxy gives it (or a file, or the results copied by the bookmarklet, in the same
 * shape), as a result list of one race
 */
export const ToExternalResultList = (json: unknown): IResultListType =>
  ToSingleRaceResultList([correctPhpEventorProxyXmlResponseForResult(json as IResultListType)]);

/** "20:50", "1:07:33" as seconds, anything else (e.g. "Udgået") is no time */
export const ParseTimeToSeconds = (text?: string | null): number | undefined => {
  const value = (text ?? '').trim();
  if (!/^\d{1,3}(:\d{2}){1,2}$/.test(value)) return undefined;
  return value.split(':').reduce((seconds, part) => seconds * 60 + parseInt(part, 10), 0);
};

export interface ITotalStageResult {
  /** Seconds, undefined when there is no time */
  time?: number;
  /** What is written instead of a time, e.g. "Udgået" or "Ikke startet" */
  status?: string;
}
export interface ITotalPersonResult {
  name: string;
  club: string;
  /** By stage, index 0 is stage 1 */
  stages: ITotalStageResult[];
  /** The total of the page, after the last stage */
  totalTime?: number;
}
export interface ITotalClassResult {
  className: string;
  persons: ITotalPersonResult[];
}
export interface ITotalResultList {
  title?: string;
  nofStages: number;
  classes: ITotalClassResult[];
}

const decodeHtml = (text: string) =>
  text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;?/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim();

const cellsOf = (row: string, tag: 'td' | 'th') =>
  row
    .split(new RegExp(`<${tag}\\b[^>]*>`, 'i'))
    .slice(1)
    .map(decodeHtml);

/**
 * The total results of an event of several days, as OE (SportSoftware) exports them ("Samlet resultat"): a table for
 * each class with the time of every stage and the total. The headers may be in any language: "Navn"/"Namn"/"Name",
 * "Klub"/"Klubb"/"Club", "Tid etape 1"/"Etapp 1"/"Stage 1" and "Tid ialt"/"Totalt"/"Total".
 */
export const ParseOETotalResults = (html: string): ITotalResultList => {
  const classes: ITotalClassResult[] = [];
  let current: ITotalClassResult | undefined;
  let columns: { name: number; club: number; stages: { stage: number; index: number }[]; total: number } | undefined;
  let nofStages = 0;

  for (const row of html.split(/<tr\b[^>]*>/i).slice(1)) {
    if (/<td\b[^>]*\bid\s*=\s*"?c00\b/i.test(row)) {
      // The class, "D10  (14)"
      const className = cellsOf(row, 'td')[0]
        ?.replace(/\(\s*\d+\s*\)\s*$/, '')
        .trim();
      if (className) {
        current = { className, persons: [] };
        classes.push(current);
      }
      continue;
    }
    if (/<th\b/i.test(row)) {
      const headers = cellsOf(row, 'th');
      const stages = headers
        .map((header, index) => ({ header, index }))
        .filter(({ header }) => /(etap|etapp|stage|lauf|race|dag|day)\w*\s*\d+\s*$/i.test(header))
        .map(({ header, index }) => ({ stage: parseInt(/(\d+)\s*$/.exec(header)![1], 10), index }));
      columns = {
        name: headers.findIndex(header => /^(navn|namn|name|nimi|nom)$/i.test(header)),
        club: headers.findIndex(header => /^(klub|klubb|club|seura|verein|organisation)$/i.test(header)),
        stages,
        total: headers.findIndex(header => /(ialt|i alt|totalt|total|gesamt|yhteens)/i.test(header))
      };
      nofStages = Math.max(nofStages, ...stages.map(s => s.stage));
      continue;
    }
    if (!current || !columns || columns.name < 0) continue;
    const cells = cellsOf(row, 'td');
    const name = cells[columns.name];
    if (!name) continue;
    const stages: ITotalStageResult[] = [];
    columns.stages.forEach(({ stage, index }) => {
      const text = cells[index] ?? '';
      const time = ParseTimeToSeconds(text);
      stages[stage - 1] = time != null ? { time } : { status: text || undefined };
    });
    current.persons.push({
      name,
      club: columns.club >= 0 ? (cells[columns.club] ?? '') : '',
      stages,
      totalTime: columns.total >= 0 ? ParseTimeToSeconds(cells[columns.total]) : undefined
    });
  }
  const title = /<td\b[^>]*>\s*<nobr>([^<]+)<\/nobr>/i.exec(html)?.[1]?.trim();
  return { title, nofStages, classes: classes.filter(c => c.persons.length > 0) };
};

// "Ikke startet", "Ej start", "Not started", "DNS", "Nicht gestartet"
const NOT_STARTED = /ikke start|ej start|inte start|not start|did not start|^dns$|nicht gestartet/i;

export interface ITotalAfterStage {
  person: ITotalPersonResult;
  /** Seconds, when every stage up to it has a time */
  totalTime?: number;
  totalPosition?: number;
  failed?: 'NotStarted' | 'NotFinished';
}

/**
 * The total of every runner of the class after a stage, as the result of that stage is saved: the sum of the times
 * of the stages up to it, the position among them, the time of the winner and of the second. After the last stage
 * the total of the page is used, it may differ from the sum (e.g. a chasing start).
 */
export const CalculateTotalAfterStage = (classResult: ITotalClassResult, stage: number, nofStages: number) => {
  const totals: ITotalAfterStage[] = classResult.persons.map((person): ITotalAfterStage => {
    const stages = Array.from({ length: stage }, (_, index) => person.stages[index] ?? {});
    const started = stages.some(s => s.time != null || (!!s.status && !NOT_STARTED.test(s.status)));
    if (!started) return { person, failed: 'NotStarted' };
    if (stages.some(s => s.time == null)) return { person, failed: 'NotFinished' };
    const sum = stages.reduce((total, s) => total + (s.time ?? 0), 0);
    return { person, totalTime: stage === nofStages && person.totalTime != null ? person.totalTime : sum };
  });
  const times = totals
    .map(total => total.totalTime)
    .filter((time): time is number => time != null)
    .sort((a, b) => a - b);
  totals.forEach(total => {
    // Equal times share the position
    if (total.totalTime != null) total.totalPosition = times.indexOf(total.totalTime) + 1;
  });
  return {
    totals,
    winnerTime: times[0] as number | undefined,
    secondTime: times.length > 1 ? times[1] : undefined,
    nofStarts: totals.filter(total => total.failed !== 'NotStarted').length
  };
};

/**
 * The total results of an event of several days from the result list of every stage (in the order of the stages),
 * when there is no page of the total: a runner is found by class and name in each.
 */
export const TotalResultsFromStages = (stageLists: IResultListType[]): ITotalResultList => {
  const classes: ITotalClassResult[] = [];
  const persons = new Map<string, ITotalPersonResult>();
  stageLists.forEach((resultList, stageIndex) =>
    (resultList.ClassResult ?? []).forEach(classResult => {
      const className = classResult.Class?.Name ?? '';
      let totalClass = classes.find(c => NormalizeName(c.className) === NormalizeName(className));
      if (!totalClass) {
        totalClass = { className, persons: [] };
        classes.push(totalClass);
      }
      (classResult.PersonResult ?? []).forEach(personResult => {
        const name = `${NormalizeName(personResult.Person?.Name?.Given) && personResult.Person.Name.Given} ${
          NormalizeName(personResult.Person?.Name?.Family) && personResult.Person.Name.Family
        }`.trim();
        if (!NormalizeName(name)) return;
        const key = `${NormalizeName(className)}|${NormalizeName(name)}`;
        let person = persons.get(key);
        if (!person) {
          person = { name, club: (personResult.Organisation?.Name as string | undefined) ?? '', stages: [] };
          persons.set(key, person);
          totalClass!.persons.push(person);
        }
        const result = Array.isArray(personResult.Result) ? personResult.Result[0] : personResult.Result;
        person.stages[stageIndex] =
          result?.Status === 'OK' && result.Time != null
            ? { time: result.Time }
            : { status: result?.Status === 'DidNotStart' ? 'DNS' : (result?.Status ?? undefined) };
      });
    })
  );
  return {
    title: stageLists[stageLists.length - 1]?.Event?.Name,
    nofStages: stageLists.length,
    classes: classes.filter(c => c.persons.length > 0)
  };
};

/** The stage in the name of the race, "Bornholm Höst-Open 2026 Etape 2" and "5 Days of Italy - Gara 2" are stage 2 */
export const StageFromName = (name?: string | null): number | undefined => {
  const match = /(etape|etapp|etappe|stage|lauf|day|dag|gara|tappa)\s*(\d+)/i.exec(name ?? '');
  return match ? parseInt(match[2], 10) : undefined;
};

/** The total results of the class, by the class name of the results */
export const FindTotalClass = (totalResults: ITotalResultList, className?: string | null) =>
  totalResults.classes.find(c => NormalizeName(c.className) === NormalizeName(className));

/** A runner in the total results, by the name "Given Family" (or "Family Given"), only when one has it */
export const FindTotalPerson = <T extends { person: ITotalPersonResult }>(
  totals: T[],
  firstName?: string | null,
  lastName?: string | null
): T | undefined => {
  const names = [`${firstName ?? ''} ${lastName ?? ''}`, `${lastName ?? ''} ${firstName ?? ''}`].map(NormalizeName);
  const found = totals.filter(total => names.includes(NormalizeName(total.person.name)));
  return found.length === 1 ? found[0] : undefined;
};

/** The total results from the page, fetched by the proxy of the club (only when logged in) */
export const FetchTotalResultsPage = async (
  liveloxProxy: string,
  url: string,
  authorizationHeader: Record<string, string>
): Promise<ITotalResultList> => {
  const page = await PostJsonData<{ url: string; html: string }>(
    liveloxProxy,
    { page: url },
    true,
    authorizationHeader,
    1
  );
  if (!page?.html) throw new Error(`No answer, ${url}`);
  const totalResults = ParseOETotalResults(page.html);
  if (totalResults.classes.length === 0 || totalResults.nofStages === 0)
    throw new Error(`No total results of classes and stages were found in the page, ${url}`);
  return totalResults;
};

/**
 * The total course length of a runner after this stage: the length of this race and of every earlier stage that
 * was chosen. Null when a stage has no result or no length for the runner, half a sum would be wrong.
 */
export const TotalLengthInMeter = (
  lengthInMeter: number | null | undefined,
  competitorId: number,
  earlierStages: { results: { competitorId: number; lengthInMeter?: number | null }[] }[]
): number | null => {
  if (!lengthInMeter) return null;
  let total = lengthInMeter;
  for (const stage of earlierStages) {
    const length = stage.results.find(result => result.competitorId === competitorId)?.lengthInMeter;
    if (!length) return null;
    total += length;
  }
  return total;
};
