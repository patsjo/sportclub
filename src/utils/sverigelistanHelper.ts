import { CreateBookmarkletDialog } from './bookmarkletDialog';
import { IRaceResultProps } from '../models/resultModel';
import { IWinnerResultProps } from '../models/resultWizardModel';
import { difficulties, LightConditionTypes, SportCodeTypes } from './resultConstants';
import {
  ConvertSecondsWithFractionsToTime,
  GetClassShortName,
  GetRanking,
  GetSecondsWithFractionsPerKiloMeter
} from './resultHelper';

/**
 * Ranking points from Sverigelistan in Eventor (https://eventor.orientering.se/Ranking/ol/Event/Index/19188).
 *
 * The pages of Sverigelistan have a browser check (Cloudflare) that neither the server nor the browser of the app
 * can read through (CORS, X-Frame-Options and Cross-Origin-Opener-Policy). A bookmarklet does it on the page in
 * Eventor, after the user passed the check: it reads the classes of the race, copies them as JSON, and the user
 * pastes them in the app. The points are normally published the day after the race.
 */

/** The best ranked runner of a class in Sverigelistan, without points when none has any yet */
export interface ISverigelistanClass {
  name: string;
  /** The place in the race, 1 unless the winner is not ranked (e.g. a foreign runner) */
  place: number | null;
  personName: string | null;
  clubName: string | null;
  /** The time of the race, "00:13:20" */
  time: string | null;
  points: number | null;
  /** The number of runners of the class with points */
  nofRanked: number;
}

export interface ISverigelistanData {
  url: string;
  eventName: string;
  classes: ISverigelistanClass[];
}

/** A page of Sverigelistan: a race with the links to its classes, or a class with its runners and points */
export interface ISverigelistanPage {
  kind: 'event' | 'class' | 'other';
  /** The race, without the organiser (event page) or the class (class page) */
  eventName: string;
  /** The classes of the race (event page) */
  classLinks: { name: string; url: string }[];
  /** The class (class page) */
  class?: ISverigelistanClass;
}

/**
 * Reads a page of Sverigelistan. It is also run by the bookmarklet in Eventor (as its source text), so it must not
 * use anything outside itself.
 */
export function ParseSverigelistanPage(html: string): ISverigelistanPage {
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
      .replace(/\s+/g, ' ')
      .trim();
  // The heading of the content, the last one before the marker ("Produkter och tjänster" in the menu is before it)
  const headingBefore = (index: number) => {
    const start = html.lastIndexOf('<h2', index);
    const end = start >= 0 ? html.indexOf('</h2>', start) : -1;
    return start >= 0 && end > start ? text(html.substring(html.indexOf('>', start) + 1, end)) : '';
  };
  const withoutLastPart = (heading: string) => {
    const index = heading.lastIndexOf(' - ');
    return index > 0 ? heading.substring(0, index) : heading;
  };

  const tableStart = html.search(/<table[^>]*>(?:(?!<\/table>)[\s\S])*?scoreColumn/);
  if (tableStart >= 0) {
    const heading = headingBefore(tableStart);
    const tableEnd = html.indexOf('</table>', tableStart);
    const table = html.substring(tableStart, tableEnd >= 0 ? tableEnd : html.length);
    const headers = Array.from(table.matchAll(/<th([^>]*)>([\s\S]*?)<\/th>/g)).map(match => ({
      attributes: match[1],
      text: text(match[2]).toLowerCase()
    }));
    const nameIndex = headers.findIndex(header => header.text === 'namn' || header.text === 'name');
    const clubIndex = headers.findIndex(header => header.text === 'klubb' || header.text === 'club');
    const timeIndex = headers.findIndex(header => header.text === 'tid' || header.text === 'time');
    const pointsIndex = headers.findIndex(header => /scoreColumn/.test(header.attributes));
    const placeIndex = nameIndex - 1;
    const body = table.substring(Math.max(0, table.indexOf('<tbody')));
    const rows = body
      .split(/<tr[\s>]/)
      .slice(1)
      .map(row => Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(cell => text(cell[1])))
      .map(cells => {
        const points = parseFloat((cells[pointsIndex] ?? '').replace(/\s/g, '').replace(',', '.'));
        const place = parseInt(cells[placeIndex] ?? '', 10);
        return {
          place: Number.isFinite(place) ? place : null,
          personName: cells[nameIndex] || null,
          clubName: cells[clubIndex] || null,
          time: cells[timeIndex] || null,
          points: Number.isFinite(points) ? points : null
        };
      });
    const ranked = rows.filter(row => row.points != null && row.time);
    const best = ranked.reduce<(typeof ranked)[number] | undefined>(
      (found, row) => (!found || (row.place ?? 1e9) < (found.place ?? 1e9) ? row : found),
      undefined
    );
    const classIndex = heading.lastIndexOf(' - ');
    return {
      kind: 'class',
      eventName: withoutLastPart(heading),
      classLinks: [],
      class: {
        name: classIndex > 0 ? heading.substring(classIndex + 3) : heading,
        place: best?.place ?? null,
        personName: best?.personName ?? null,
        clubName: best?.clubName ?? null,
        time: best?.time ?? null,
        points: best?.points ?? null,
        nofRanked: ranked.length
      }
    };
  }

  const classLinks = Array.from(
    html.matchAll(/<a[^>]*href="([^"]*\/Ranking\/[^"/]+\/Event\/Class\/\d+)"[^>]*>([\s\S]*?)<\/a>/g)
  )
    .map(match => ({ name: text(match[2]), url: decode(match[1]) }))
    .filter((link, index, links) => link.name && links.findIndex(other => other.url === link.url) === index);
  if (classLinks.length) {
    const firstLink = html.search(/\/Ranking\/[^"/]+\/Event\/Class\/\d+/);
    return { kind: 'event', eventName: withoutLastPart(headingBefore(firstLink)), classLinks };
  }
  return { kind: 'other', eventName: '', classLinks: [] };
}

/** The texts of the bookmarklet, "{n}" etc. are replaced by it */
export interface ISverigelistanBookmarkletTexts {
  /** The heading of the dialog, the name of the bookmark */
  title: string;
  wrongPage: string;
  fetching: string;
  failed: string;
  noPoints: string;
  ready: string;
  /** In bold with a green check when the ranking is copied */
  copiedTitle: string;
  /** What to do then, after how many classes have points */
  copied: string;
  copyManually: string;
  close: string;
}

/**
 * What the bookmarklet does on the page in Eventor, in a dialog over the page. On the page of a race it fetches the
 * page of every class (the same site, after the browser check), on the page of a class it reads that class. It is run
 * as its source text, so it must not use anything outside itself.
 */
export function SverigelistanBookmarkletMain(
  parsePage: (html: string) => ISverigelistanPage,
  texts: ISverigelistanBookmarkletTexts,
  createDialog: typeof CreateBookmarkletDialog
) {
  const dialog = createDialog('sportclub-sverigelistan', texts.title, texts.close);
  const show = dialog.show;

  // Copied at once, it tells clearly that it is done. When the browser does not allow it (the click on the bookmark
  // may be too long ago, e.g. after fetching the classes), the text is shown selected to copy by hand.
  const copy = (json: string, message: string) => {
    const copied = () => dialog.success(texts.copiedTitle, `${message}\n${texts.copied}`);
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
    const page = parsePage(document.documentElement.outerHTML);
    let classes: ISverigelistanClass[] = [];
    if (page.kind === 'class' && page.class) classes = [page.class];
    else if (page.kind === 'event') {
      for (let i = 0; i < page.classLinks.length; i++) {
        const link = page.classLinks[i];
        show(texts.fetching.replace('{n}', String(i + 1)).replace('{total}', String(page.classLinks.length)));
        const response = await fetch(link.url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}, ${link.url}`);
        const classPage = parsePage(await response.text());
        if (classPage.class) classes.push({ ...classPage.class, name: link.name });
      }
    } else {
      show(texts.wrongPage, true);
      return;
    }
    const ranked = classes.filter(c => c.points != null).length;
    if (!ranked) {
      show(texts.noPoints, true);
      return;
    }
    const json = JSON.stringify({ sverigelistan: 1, url: location.href, eventName: page.eventName, classes });
    const message = texts.ready.replace('{ranked}', String(ranked)).replace('{total}', String(classes.length));
    show(message);
    copy(json, message);
  };
  run().catch(error =>
    show(texts.failed.replace('{message}', error instanceof Error ? error.message : String(error)), true)
  );
}

/** The bookmarklet, "javascript:..." with the reader of the pages, the dialog and the texts in it */
export const SverigelistanBookmarklet = (texts: ISverigelistanBookmarkletTexts) =>
  `javascript:${encodeURIComponent(
    `(${SverigelistanBookmarkletMain.toString()})(${ParseSverigelistanPage.toString()},${JSON.stringify(texts)},${CreateBookmarkletDialog.toString()});void 0`
  )}`;

const SPORTS: Partial<Record<SportCodeTypes, string>> = { OL: 'ol', SKIO: 'skio', MTBO: 'mtbo' };

/** The races of Sverigelistan on the day of the race, or the start page of Sverigelistan without a date */
export const SverigelistanEventsUrl = (sportCode: SportCodeTypes, raceDate?: string | null) => {
  const sport = SPORTS[sportCode] ?? 'ol';
  return raceDate && /^\d{4}-\d{2}-\d{2}$/.test(raceDate)
    ? `https://eventor.orientering.se/Ranking/${sport}/RankingEvent?From.Date=${raceDate}&To.Date=${raceDate}`
    : `https://eventor.orientering.se/Ranking/${sport}/RankingEvent`;
};

/** The points are published the day after the race, earlier they are seldom there */
export const SverigelistanTooEarly = (raceDate: string | null | undefined, today: string) =>
  !!raceDate && raceDate >= today;

const asString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * What the user pasted: the JSON of the bookmarklet, or the source of a page of Sverigelistan (a class).
 * Undefined when it is neither.
 */
export const ParseSverigelistanClipboard = (text: string | null | undefined): ISverigelistanData | undefined => {
  const value = (text ?? '').trim();
  if (value.startsWith('{')) {
    let json: unknown;
    try {
      json = JSON.parse(value);
    } catch {
      return undefined;
    }
    const data = json as { sverigelistan?: unknown; url?: unknown; eventName?: unknown; classes?: unknown };
    if (data?.sverigelistan !== 1 || !Array.isArray(data.classes)) return undefined;
    const classes = data.classes
      .map((c: Record<string, unknown>): ISverigelistanClass | undefined => {
        const name = asString(c?.name);
        return name
          ? {
              name,
              place: asNumber(c.place),
              personName: asString(c.personName),
              clubName: asString(c.clubName),
              time: asString(c.time),
              points: asNumber(c.points),
              nofRanked: asNumber(c.nofRanked) ?? 0
            }
          : undefined;
      })
      .filter((c): c is ISverigelistanClass => !!c);
    return { url: asString(data.url) ?? '', eventName: asString(data.eventName) ?? '', classes };
  }
  if (/<table/i.test(value)) {
    const page = ParseSverigelistanPage(value);
    if (page.kind === 'class' && page.class) return { url: '', eventName: page.eventName, classes: [page.class] };
  }
  return undefined;
};

const normalizedName = (name?: string | null) =>
  (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The best class to base the ranking on: H21 Elit, then H21 Lång, then H21 */
export const SverigelistanClassPriority = (className: string) => {
  const name = (GetClassShortName(className) ?? className).toUpperCase().replace(/\s+/g, '');
  if (name === 'H21E') return 0;
  if (name === 'H21L') return 1;
  if (name === 'H21') return 2;
  return 10;
};

/** A class of the race with the best ranked runner in Sverigelistan, a choice for the base of the ranking */
export interface ISverigelistanOption {
  /** The class of the race (the short name, as the winner results) */
  className: string;
  rankingClassName: string;
  personName: string;
  place: number | null;
  points: number;
  time: string;
  lengthInMeter: number;
  difficulty?: IWinnerResultProps['difficulty'];
  /** The time of the ranked runner per kilometer, "00:03:45.123" */
  timePerKilometer: string;
  secondsPerKilometer: number;
  priority: number;
  /** The ranking of the runner with the base class as base, for the other classes */
  basedOn?: { className: string; points: number | null };
}

const baseDifficulties: string[] = [difficulties.black, difficulties.blue, difficulties.purple];

/**
 * The classes of the race with points in Sverigelistan, the fastest (time per kilometer) first. The base is the best
 * H21 class, the ranking of the others is based on it. A class of Sverigelistan is the class of the race where the same runner won, else the class
 * with the same name, else "H21" is "H21E" or "H21L".
 */
export const GetSverigelistanOptions = (
  data: ISverigelistanData,
  winnerResults: IWinnerResultProps[],
  sportCode: SportCodeTypes,
  raceLightCondition: LightConditionTypes
): { options: ISverigelistanOption[]; base?: ISverigelistanOption; unmatched: string[] } => {
  const winners = winnerResults.filter(
    winner => winner.lengthInMeter && winner.difficulty && baseDifficulties.includes(winner.difficulty)
  );
  const used = new Set<IWinnerResultProps>();
  const options: ISverigelistanOption[] = [];
  const unmatched: string[] = [];
  const findWinner = (rankingClass: ISverigelistanClass) => {
    const free = winners.filter(winner => !used.has(winner));
    const shortName = GetClassShortName(rankingClass.name) ?? rankingClass.name;
    return (
      (rankingClass.place === 1
        ? free.find(winner => normalizedName(winner.personName) === normalizedName(rankingClass.personName))
        : undefined) ??
      free.find(winner => winner.className === rankingClass.name || winner.className === shortName) ??
      free
        .filter(winner => /^[ELKM]$/.test(winner.className.substring(shortName.length)))
        .filter(winner => winner.className.startsWith(shortName))
        .sort((a, b) => SverigelistanClassPriority(a.className) - SverigelistanClassPriority(b.className))[0]
    );
  };
  // The classes with the same runner as winner first, so a class with the same name does not take their winner
  const ranked = data.classes
    .filter(c => c.points != null && c.time && c.personName)
    .sort((a, b) => (a.place === 1 ? 0 : 1) - (b.place === 1 ? 0 : 1));
  for (const rankingClass of ranked) {
    const winner = findWinner(rankingClass);
    const secondsPerKilometer = winner?.lengthInMeter
      ? GetSecondsWithFractionsPerKiloMeter(rankingClass.time!, winner.lengthInMeter)
      : undefined;
    const timePerKilometer = ConvertSecondsWithFractionsToTime(secondsPerKilometer);
    if (!winner || !secondsPerKilometer || !timePerKilometer) {
      unmatched.push(rankingClass.name);
      continue;
    }
    used.add(winner);
    options.push({
      className: winner.className,
      rankingClassName: rankingClass.name,
      personName: rankingClass.personName!,
      place: rankingClass.place,
      points: rankingClass.points!,
      time: rankingClass.time!,
      lengthInMeter: winner.lengthInMeter!,
      difficulty: winner.difficulty,
      timePerKilometer,
      secondsPerKilometer,
      priority: SverigelistanClassPriority(winner.className)
    });
  }
  const best = options.reduce<ISverigelistanOption | undefined>(
    (found, option) =>
      !found || option.priority < found.priority || (option.priority === found.priority && option.points < found.points)
        ? option
        : found,
    undefined
  );
  const base = best && best.priority < 10 ? best : undefined;
  options.sort((a, b) => a.secondsPerKilometer - b.secondsPerKilometer);
  if (base) {
    options.forEach(option => {
      if (option === base) return;
      const result = {
        competitorTime: option.time,
        lengthInMeter: option.lengthInMeter,
        difficulty: option.difficulty,
        failedReason: null
      } as unknown as IRaceResultProps;
      option.basedOn = {
        className: base.className,
        points: GetRanking(base.timePerKilometer, base.points, result, sportCode, raceLightCondition)
      };
    });
  }
  return { options, base, unmatched };
};

/** The race in Sverigelistan has no word of the name of the race, it may be another race */
export const SverigelistanOtherEvent = (data: ISverigelistanData, eventName?: string | null) => {
  const words = (value?: string | null) =>
    normalizedName(value)
      .split(' ')
      .filter(word => word.length >= 3 && !/^\d+$/.test(word));
  const eventWords = words(eventName);
  const rankingWords = words(data.eventName);
  return eventWords.length > 0 && rankingWords.length > 0 && !rankingWords.some(word => eventWords.includes(word));
};

export const FormatRankingPoints = (points: number | null | undefined) =>
  points == null ? '-' : points.toFixed(2).replace('.', ',');
