import {
  CupResultStatusType,
  ICupCategory,
  ICupPointSystem,
  ICupRaceProps,
  ICupResultProps,
  ICupSeasonSettings
} from '../models/cupModel';
import { IPersonRaceResult, IResultListType, ResultStatus } from '../models/iof.xsd-3.0';

/** A result as it is used for the points, after the participants and points basis of the season are applied */
export interface ICupScoredResult extends ICupResultProps {
  /** The position used for the points (in the whole class or among club members only) */
  scoredPosition: number | null;
  scoredNofStarts: number | null;
  scoredTimeBehindSeconds: number | null;
  /** null = the competitor did not start, and the race is not counted at all */
  points: number | null;
}

export interface ICupStandingRace {
  cupRaceId: number;
  points: number;
  counted: boolean;
  status: CupResultStatusType;
  position: number | null;
  className: string;
}

export interface ICupStandingRow {
  key: string;
  rank: number;
  personName: string;
  clubName: string | null;
  isClubMember: boolean;
  classNames: string[];
  races: Record<number, ICupStandingRace>;
  nofFinished: number;
  bonusPoints: number;
  totalPoints: number;
}

export interface ICupStandingGroup {
  key: string;
  title: string;
  rows: ICupStandingRow[];
}

export interface ICupCategoryStanding {
  category: ICupCategory;
  groups: ICupStandingGroup[];
}

const wildcardToRegExp = (pattern: string) =>
  new RegExp(
    '^' +
      pattern
        .trim()
        .split('*')
        .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') +
      '$',
    'i'
  );

/** Matches a class name against the class patterns of a category, * matches any characters */
export const classMatchesCategory = (className: string, category: Pick<ICupCategory, 'classes'>): boolean => {
  const patterns = category.classes.map(p => p.trim()).filter(p => p.length > 0);
  if (patterns.length === 0) return true;
  return patterns.some(pattern => wildcardToRegExp(pattern).test(className.trim()));
};

/**
 * Only the results in the categories of the season, both class and age, e.g. when results are fetched.
 * An unknown year of birth is kept, it can be filled in afterwards, the standings leave it out until then.
 */
export const filterToCupClasses = <T extends Pick<ICupResultProps, 'className' | 'birthYear'>>(
  results: T[],
  categories: Pick<ICupCategory, 'classes' | 'minAge' | 'maxAge'>[] | undefined,
  /** The year the season starts, the ages are counted from it */
  seasonYear?: number
): T[] =>
  !categories || categories.length === 0
    ? results
    : results.filter(r =>
        categories.some(
          category =>
            classMatchesCategory(r.className, category) &&
            (!r.birthYear || seasonYear == null || cupAgeMatchesCategory(r.birthYear, seasonYear, category))
        )
      );

/** Does a category have an age limit */
export const cupCategoryHasAgeLimit = (category: Pick<ICupCategory, 'minAge' | 'maxAge'>) =>
  category.minAge != null || category.maxAge != null;

/**
 * Is a person of the age of the category. The age is counted as in the orienteering classes, the
 * year minus the year of birth. A person with an unknown year of birth is not in a category with age limit.
 */
export const cupAgeMatchesCategory = (
  birthYear: number | null | undefined,
  year: number,
  category: Pick<ICupCategory, 'minAge' | 'maxAge'>
) => {
  if (!cupCategoryHasAgeLimit(category)) return true;
  if (!birthYear) return false;
  const age = year - birthYear;
  return (category.minAge == null || age >= category.minAge) && (category.maxAge == null || age <= category.maxAge);
};

/** The same class, regardless of case and extra spaces ("Mellankort" and "MellanKort ") */
export const cupClassKey = (className: string) => className.trim().replace(/\s+/g, ' ').toLowerCase();

/** The most used spelling of a class, used as the heading when the spelling differs between results */
const mostUsedSpelling = (spellings: string[]) => {
  const counts = new Map<string, number>();
  spellings.forEach(s => counts.set(s.trim(), (counts.get(s.trim()) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sv'))[0]?.[0] ?? '';
};

/** The same person over all races, our own competitor id first, then Eventor id and last name + club */
export const cupPersonKey = (
  result: Pick<ICupResultProps, 'competitorId' | 'eventorPersonId' | 'personName' | 'clubName'>
) =>
  result.competitorId
    ? `C${result.competitorId}`
    : result.eventorPersonId
      ? `E${result.eventorPersonId}`
      : `N${result.personName.trim().toLowerCase()}|${(result.clubName ?? '').trim().toLowerCase()}`;

const roundPoints = (points: number, decimals: number) => {
  const factor = Math.pow(10, Math.max(0, decimals));
  return Math.round(points * factor) / factor;
};

const hasTime = (result: Pick<ICupResultProps, 'status' | 'timeSeconds'>) =>
  result.status === 'OK' && result.timeSeconds != null && result.timeSeconds > 0;

/**
 * Applies who is included (participants) and how the positions are calculated (pointsBasis).
 * With pointsBasis CLUB the positions, number of starters and time behind are recalculated among the club members.
 */
export const getScoredResults = (
  results: ICupResultProps[],
  settings: Pick<ICupSeasonSettings, 'participants' | 'pointsBasis' | 'pointSystem'>
): ICupScoredResult[] => {
  const included = settings.participants === 'CLUB' ? results.filter(r => r.isClubMember) : results;
  const clubBasis = settings.participants === 'CLUB' && settings.pointsBasis === 'CLUB';

  const byRaceAndClass = new Map<string, ICupResultProps[]>();
  included.forEach(r => {
    const key = `${r.cupRaceId}|${cupClassKey(r.className)}`;
    const list = byRaceAndClass.get(key) ?? [];
    list.push(r);
    byRaceAndClass.set(key, list);
  });

  const scored: ICupScoredResult[] = [];
  byRaceAndClass.forEach(classResults => {
    const starters = classResults.filter(r => r.status !== 'DNS');
    const timed = classResults.filter(hasTime).sort((a, b) => a.timeSeconds! - b.timeSeconds!);
    const winnerTime = timed.length ? timed[0].timeSeconds! : null;
    // The winner time of the whole class, if the winner is part of the list
    const winnerRow = classResults.find(r => r.position === 1 && hasTime(r));
    const behindRow = classResults.find(r => hasTime(r) && r.timeBehindSeconds != null);
    const classWinnerTime = winnerRow
      ? winnerRow.timeSeconds!
      : behindRow
        ? behindRow.timeSeconds! - behindRow.timeBehindSeconds!
        : null;

    classResults.forEach(r => {
      let scoredPosition: number | null;
      let scoredNofStarts: number | null;
      let scoredTimeBehindSeconds: number | null;

      if (clubBasis) {
        scoredPosition = hasTime(r) ? timed.filter(t => t.timeSeconds! < r.timeSeconds!).length + 1 : null;
        scoredNofStarts = starters.length;
        scoredTimeBehindSeconds = hasTime(r) && winnerTime != null ? r.timeSeconds! - winnerTime : null;
      } else {
        scoredPosition = r.status === 'OK' ? r.position : null;
        scoredNofStarts = r.nofStartsInClass ?? starters.length;
        scoredTimeBehindSeconds =
          r.status !== 'OK'
            ? null
            : r.timeBehindSeconds != null
              ? r.timeBehindSeconds
              : hasTime(r) && classWinnerTime != null
                ? r.timeSeconds! - classWinnerTime
                : r.position === 1
                  ? 0
                  : null;
      }

      const partial = { ...r, scoredPosition, scoredNofStarts, scoredTimeBehindSeconds };
      scored.push({ ...partial, points: calculateCupPoints(partial, settings.pointSystem) });
    });
  });

  return scored;
};

/** The points for one result, null when the competitor did not start */
export const calculateCupPoints = (
  result: Pick<
    ICupScoredResult,
    'status' | 'scoredPosition' | 'scoredNofStarts' | 'scoredTimeBehindSeconds' | 'timeSeconds'
  >,
  pointSystem: ICupPointSystem
): number | null => {
  if (result.status === 'DNS') return null;
  if (result.status !== 'OK') return roundPoints(Math.max(0, pointSystem.notFinishedPoints), pointSystem.decimals);

  const minPoints = Math.max(0, pointSystem.minPoints);
  const position = result.scoredPosition;
  const finalize = (points: number) => roundPoints(Math.max(minPoints, points), pointSystem.decimals);

  // Finished, but without a position (e.g. beginner classes without times)
  if (position == null || position < 1) return finalize(minPoints);

  switch (pointSystem.type) {
    case 'POSITION_TABLE':
      return finalize(pointSystem.positionPoints[position - 1] ?? minPoints);
    case 'WINNER_FIXED':
      return finalize(pointSystem.winnerPoints - (position - 1) * pointSystem.decreasePerPosition);
    case 'NOF_STARTS': {
      const nofStarts = Math.max(result.scoredNofStarts ?? position, position);
      return finalize(nofStarts - position + 1);
    }
    case 'RUN_TO_1000': {
      const nofStarts = Math.max(result.scoredNofStarts ?? position, position);
      if (nofStarts < 2) return finalize(pointSystem.winnerPoints);
      return finalize((pointSystem.winnerPoints / (nofStarts - 1)) * (nofStarts - position));
    }
    case 'TIME_BEHIND': {
      if (result.scoredTimeBehindSeconds == null) return finalize(minPoints);
      return finalize(pointSystem.winnerPoints - (result.scoredTimeBehindSeconds / 60) * pointSystem.decreasePerMinute);
    }
    case 'PERCENT_OF_WINNER': {
      if (result.scoredTimeBehindSeconds == null || !result.timeSeconds) return finalize(minPoints);
      const winnerTime = result.timeSeconds - result.scoredTimeBehindSeconds;
      return finalize((pointSystem.winnerPoints * winnerTime) / result.timeSeconds);
    }
    default:
      return finalize(minPoints);
  }
};

const comparePointLists = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] ?? -1) - (a[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
};

type IRowBuilder = Omit<ICupStandingRow, 'rank' | 'bonusPoints' | 'totalPoints'> & { _nameFromId?: boolean };

const normalizeName = (value: string | null | undefined) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Finds out which results belong to the same person over a whole season. Our own competitor id and
 * the Eventor id are linked when they appear in the same result. A result without any id (e.g. entered
 * on site) belongs to the person with the same name and club, or only the same name when it has no club,
 * but only when that person is unambiguous. Two persons with the same name are never merged.
 */
export const createCupPersonResolver = (
  results: Pick<ICupResultProps, 'competitorId' | 'eventorPersonId' | 'personName' | 'clubName'>[]
) => {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    let root = key;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(key, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  const idKeys = (r: Pick<ICupResultProps, 'competitorId' | 'eventorPersonId'>) =>
    [r.competitorId ? `C${r.competitorId}` : null, r.eventorPersonId ? `E${r.eventorPersonId}` : null].filter(
      (k): k is string => k != null
    );

  // 1. The ids that appear together are the same person
  results.forEach(r => {
    const keys = idKeys(r);
    keys.forEach(k => find(k));
    for (let i = 1; i < keys.length; i++) union(keys[0], keys[i]);
  });

  // 2. The persons (with id) behind every name + club and every name
  const byNameAndClub = new Map<string, Set<string>>();
  const byName = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, person: string) =>
    map.set(key, (map.get(key) ?? new Set<string>()).add(person));
  results.forEach(r => {
    const keys = idKeys(r);
    if (!keys.length) return;
    const person = find(keys[0]);
    const name = normalizeName(r.personName);
    add(byNameAndClub, `${name}|${normalizeName(r.clubName)}`, person);
    add(byName, name, person);
  });

  return (r: Pick<ICupResultProps, 'competitorId' | 'eventorPersonId' | 'personName' | 'clubName'>): string => {
    const keys = idKeys(r);
    if (keys.length) return find(keys[0]);
    const name = normalizeName(r.personName);
    const club = normalizeName(r.clubName);
    const sameNameAndClub = byNameAndClub.get(`${name}|${club}`);
    if (sameNameAndClub?.size === 1) return [...sameNameAndClub][0];
    const sameName = byName.get(name);
    if (!club && sameName?.size === 1) return [...sameName][0];
    return `N${name}|${club}`;
  };
};

/**
 * Compares two class names by the chosen order of the season. Classes that are not in the order
 * come after the ordered ones, sorted by name with numbers in numeric order (H10 before H12).
 */
export const compareCupClasses = (classOrder: string[] | undefined) => {
  const index = new Map((classOrder ?? []).map((c, i) => [cupClassKey(c), i]));
  return (a: string, b: string) => {
    const ia = index.get(cupClassKey(a)) ?? Number.MAX_SAFE_INTEGER;
    const ib = index.get(cupClassKey(b)) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib || a.localeCompare(b, 'sv', { numeric: true });
  };
};

/** Calculates the standings for every category in a season */
export const calculateCupStandings = (
  races: Pick<ICupRaceProps, 'cupRaceId' | 'raceDate'>[],
  results: ICupResultProps[],
  settings: ICupSeasonSettings,
  /** The year the ages are counted from, the year the season starts */
  seasonYear?: number
): ICupCategoryStanding[] => {
  const raceIds = new Set(races.map(r => r.cupRaceId));
  const scored = getScoredResults(
    results.filter(r => raceIds.has(r.cupRaceId)),
    settings
  ).filter(r => r.points != null);
  const personOf = createCupPersonResolver(scored);
  const year =
    seasonYear ??
    (races.length ? Math.min(...races.map(r => parseInt(r.raceDate.substring(0, 4), 10))) : new Date().getFullYear());
  // The year of birth of a person, known from any of the races (e.g. not when entered on site)
  const birthYearOf = new Map<string, number>();
  scored.forEach(r => {
    if (r.birthYear) birthYearOf.set(personOf(r), r.birthYear);
  });

  return settings.categories.map(category => {
    const inCategory = scored.filter(
      r =>
        classMatchesCategory(r.className, category) &&
        cupAgeMatchesCategory(r.birthYear ?? birthYearOf.get(personOf(r)), year, category)
    );
    const groupsMap = new Map<string, { title: string; spellings: string[]; rows: Map<string, IRowBuilder> }>();

    inCategory.forEach(r => {
      const groupKey = category.groupByClass ? cupClassKey(r.className) : category.id;
      const group = groupsMap.get(groupKey) ?? {
        title: category.groupByClass ? r.className.trim() : category.name,
        spellings: [] as string[],
        rows: new Map<string, IRowBuilder>()
      };
      if (category.groupByClass) {
        group.spellings.push(r.className);
        group.title = mostUsedSpelling(group.spellings);
      }
      groupsMap.set(groupKey, group);

      const personKey = personOf(r);
      const hasId = !!(r.competitorId || r.eventorPersonId);
      const row: IRowBuilder = group.rows.get(personKey) ?? {
        key: personKey,
        personName: r.personName,
        clubName: r.clubName,
        isClubMember: r.isClubMember,
        classNames: [],
        races: {},
        nofFinished: 0,
        _nameFromId: hasId
      };
      // The name and club as spelled in a result with id, rather than as typed in on site
      if (hasId && !row._nameFromId) {
        row.personName = r.personName;
        row.clubName = r.clubName ?? row.clubName;
        row._nameFromId = true;
      }
      if (!row.clubName && r.clubName) row.clubName = r.clubName;
      group.rows.set(personKey, row);
      if (!row.classNames.includes(r.className)) row.classNames.push(r.className);
      if (r.isClubMember) row.isClubMember = true;

      // If a person has more than one result in the same race and group, use the best
      const existing = row.races[r.cupRaceId];
      if (!existing || existing.points < r.points!) {
        row.races[r.cupRaceId] = {
          cupRaceId: r.cupRaceId,
          points: r.points!,
          counted: false,
          status: r.status,
          position: r.scoredPosition,
          className: r.className
        };
      }
    });

    const groups: ICupStandingGroup[] = Array.from(groupsMap.entries()).map(([groupKey, group]) => {
      // The counted points, best first, used to break ties
      const countedPoints = new Map<string, number[]>();
      const rows = Array.from(group.rows.values()).map((row): ICupStandingRow => {
        const raceResults = Object.values(row.races);
        const nofFinished = raceResults.filter(rr => rr.status === 'OK').length;
        const sorted = [...raceResults].sort((a, b) => b.points - a.points);
        const counted =
          settings.maxRacesCounted != null && settings.maxRacesCounted > 0
            ? sorted.slice(0, settings.maxRacesCounted)
            : sorted;
        counted.forEach(rr => (rr.counted = true));
        const extraFinished =
          settings.maxRacesCounted != null && settings.maxRacesCounted > 0
            ? sorted.slice(settings.maxRacesCounted).filter(rr => rr.status === 'OK').length
            : 0;
        const bonusPoints = roundPoints(
          extraFinished * Math.max(0, settings.bonusPointsPerExtraRace),
          settings.pointSystem.decimals
        );
        const totalPoints = roundPoints(
          counted.reduce((sum, rr) => sum + rr.points, 0) + bonusPoints,
          settings.pointSystem.decimals
        );
        countedPoints.set(
          row.key,
          counted.map(rr => rr.points)
        );
        const { _nameFromId, ...standingRow } = row;
        void _nameFromId;
        return { ...standingRow, nofFinished, bonusPoints, totalPoints, rank: 0 };
      });

      rows.sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          comparePointLists(countedPoints.get(a.key)!, countedPoints.get(b.key)!) ||
          a.personName.localeCompare(b.personName, 'sv')
      );
      rows.forEach((row, index) => {
        const previous = rows[index - 1];
        row.rank =
          previous &&
          previous.totalPoints === row.totalPoints &&
          comparePointLists(countedPoints.get(previous.key)!, countedPoints.get(row.key)!) === 0
            ? previous.rank
            : index + 1;
      });

      return {
        key: groupKey,
        title: group.title,
        rows
      };
    });

    const compare = compareCupClasses(settings.classOrder);
    groups.sort((a, b) => compare(a.title, b.title));
    return { category, groups };
  });
};

/** The scored results of one race, grouped per class, sorted on position */
export const getCupRaceResultsByClass = (
  cupRaceId: number,
  results: ICupResultProps[],
  settings: ICupSeasonSettings
): { className: string; results: ICupScoredResult[] }[] => {
  const scored = getScoredResults(
    results.filter(r => r.cupRaceId === cupRaceId),
    settings
  ).filter(r => settings.categories.some(category => classMatchesCategory(r.className, category)));
  const byClass = new Map<string, ICupScoredResult[]>();
  scored.forEach(r => {
    const key = cupClassKey(r.className);
    const list = byClass.get(key) ?? [];
    list.push(r);
    byClass.set(key, list);
  });
  const statusOrder: Record<CupResultStatusType, number> = { OK: 0, DNF: 1, MP: 2, DSQ: 3, DNS: 4 };
  return Array.from(byClass.entries())
    .map(([, list]) => ({
      className: mostUsedSpelling(list.map(r => r.className)),
      results: list.sort(
        (a, b) =>
          statusOrder[a.status] - statusOrder[b.status] ||
          (a.scoredPosition ?? 99999) - (b.scoredPosition ?? 99999) ||
          a.personName.localeCompare(b.personName, 'sv')
      )
    }))
    .sort((a, b) => compareCupClasses(settings.classOrder)(a.className, b.className));
};

export const formatCupTime = (seconds: number | null | undefined): string => {
  if (seconds == null || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
};

export const parseCupTime = (value: string | null | undefined): number | null => {
  if (!value || !value.trim()) return null;
  const parts = value
    .trim()
    .split(':')
    .map(p => parseInt(p, 10));
  if (parts.some(p => isNaN(p) || p < 0)) return null;
  return parts.reduce((sum, p) => sum * 60 + p, 0);
};

/** The season covering today, otherwise the latest season that has started, otherwise the first upcoming */
export const getCurrentCupSeason = <T extends { startDate: string; endDate: string }>(
  seasons: T[],
  today: string
): T | undefined => {
  const byStart = [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const ongoing = byStart.find(s => s.startDate <= today && s.endDate >= today);
  if (ongoing) return ongoing;
  // Between seasons: the one closest in time, the ended season or the next one. Equal: the next.
  const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  const distance = (s: T) => (s.startDate > today ? days(today, s.startDate) : days(s.endDate, today));
  return byStart.reduce<T | undefined>((best, s) => {
    if (!best) return s;
    const d = distance(s);
    const bestD = distance(best);
    return d < bestD || (d === bestD && s.startDate > today && best.startDate <= today) ? s : best;
  }, undefined);
};

export const isDateInSeason = (date: string, season: { startDate: string; endDate: string }) =>
  date >= season.startDate && date <= season.endDate;

/** The race (or the first race) that has not been run yet */
export const getNextCupRace = <T extends Pick<ICupRaceProps, 'raceDate'>>(races: T[], today: string): T | undefined =>
  [...races].sort((a, b) => a.raceDate.localeCompare(b.raceDate)).find(race => race.raceDate >= today);

const iofStatusToCupStatus = (status: ResultStatus | undefined): CupResultStatusType | null => {
  switch (status) {
    case 'OK':
    case 'Finished':
      return 'OK';
    case 'MissingPunch':
      return 'MP';
    case 'Disqualified':
    case 'SportingWithdrawal':
      return 'DSQ';
    case 'DidNotFinish':
    case 'OverTime':
      return 'DNF';
    case 'NotCompeting':
    case 'Moved':
    case 'MovedUp':
    case 'DidNotEnter':
    case 'Cancelled':
      return null;
    default:
      return 'DNS';
  }
};

/**
 * The text of a value from the Eventor proxy, or null. Empty XML elements become {} and elements
 * with only attributes become objects, they are not text.
 */
export const iofText = (value: unknown): string | null => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length ? text : null;
};

/**
 * Converts an IOF XML 3.0 result list (as json from the Eventor proxy, corrected with
 * correctPhpEventorProxyXmlResponseForResult) to cup results.
 * With useTotalResult the overall result after the race is used instead of the stage result.
 */
export const iofResultListToCupResults = (
  resultList: IResultListType,
  cupRaceId: number,
  eventorRaceId: number | null,
  useTotalResult: boolean,
  clubOrganisationId: number | undefined
): ICupResultProps[] => {
  const races = resultList.Event?.Race ?? [];
  const raceNumber =
    eventorRaceId != null
      ? races.find(race => Number(race.Extensions?.EventRaceId) === Number(eventorRaceId))?.RaceNumber
      : undefined;

  const cupResults: ICupResultProps[] = [];
  let id = -1;
  (resultList.ClassResult ?? []).forEach(classResult => {
    const className = iofText(classResult.Class?.Name) ?? iofText(classResult.Class?.ShortName) ?? '';
    const classRows: ICupResultProps[] = [];

    (classResult.PersonResult ?? []).forEach(personResult => {
      const raceResults = personResult.Result ?? [];
      const raceResult: IPersonRaceResult | undefined =
        raceNumber != null && raceResults.length > 1
          ? raceResults.find(r => Number(r['@attributes']?.raceNumber) === Number(raceNumber))
          : raceResults[0];
      if (!raceResult) return;

      const overall = useTotalResult ? raceResult.OverallResult : undefined;
      const status = iofStatusToCupStatus(overall?.Status ?? raceResult.Status);
      if (!status) return;
      const iofOk = (overall?.Status ?? raceResult.Status) === 'OK';
      const time = overall ? overall.Time : raceResult.Time;
      const timeBehind = overall ? overall.TimeBehind : raceResult.TimeBehind;
      const position = overall ? overall.Position : raceResult.Position;
      const personIds = (Array.isArray(personResult.Person?.Id) ? personResult.Person.Id : [personResult.Person?.Id])
        .map(pid => parseInt(iofText(pid) ?? '', 10))
        .filter(pid => !isNaN(pid));
      const organisation = personResult.Organisation;
      const organisationId = parseInt(iofText(organisation?.Id) ?? '', 10);
      const given = iofText(personResult.Person?.Name?.Given) ?? '';
      // BirthDate is a dayjs object after correctPhpEventorProxyXmlResponseForResult, or a text
      const birthDate = personResult.Person?.BirthDate as unknown;
      const birthYearValue =
        birthDate && typeof (birthDate as { year?: unknown }).year === 'function'
          ? (birthDate as { year: () => number }).year()
          : parseInt((iofText(birthDate) ?? '').substring(0, 4), 10);
      const family = iofText(personResult.Person?.Name?.Family) ?? '';

      classRows.push({
        cupResultId: id--,
        cupRaceId,
        competitorId: null,
        eventorPersonId: personIds.length ? personIds[0] : null,
        personName: `${given} ${family}`.trim(),
        birthYear: birthYearValue > 1900 ? birthYearValue : null,
        // A competitor without club has an empty Organisation element, which the proxy makes {}
        clubName: iofText(organisation?.ShortName) ?? iofText(organisation?.Name),
        isClubMember: clubOrganisationId != null && organisationId === clubOrganisationId,
        className,
        status,
        position: status === 'OK' && iofOk && position != null ? Math.round(position) : null,
        timeSeconds: status === 'OK' && iofOk && time != null ? Math.round(time) : null,
        timeBehindSeconds: status === 'OK' && iofOk && timeBehind != null ? Math.round(timeBehind) : null,
        nofStartsInClass: null,
        source: 'EVENTOR'
      });
    });

    const nofStarts = classRows.filter(r => r.status !== 'DNS').length;
    classRows.forEach(r => cupResults.push({ ...r, nofStartsInClass: nofStarts }));
  });

  return cupResults;
};
