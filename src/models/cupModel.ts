import { INewsFileProps } from './newsModel';

export type CupThemeType = 'NIGHT' | 'YOUTH' | 'WINTER' | 'SUMMER' | 'SPRING' | 'AUTUMN' | 'HALLOWEEN';
export const cupThemes: CupThemeType[] = ['NIGHT', 'HALLOWEEN', 'YOUTH', 'WINTER', 'SUMMER', 'SPRING', 'AUTUMN'];

/** Who is included in the cup standings */
export type CupParticipantsType = 'CLUB' | 'ALL';
/** When only club members are included: positions among everyone in the class, or among the club members only */
export type CupPointsBasisType = 'ALL' | 'CLUB';

export type CupPointSystemType =
  /** A table of points per position, e.g. 20, 17, 15, 14, ... */
  | 'POSITION_TABLE'
  /** Fixed points for the winner, then minus x points per position */
  | 'WINNER_FIXED'
  /** Points equal to the number of starters minus the position plus one */
  | 'NOF_STARTS'
  /** The winner gets 1000 (or chosen base) and the last gets the minimum, linear in between */
  | 'RUN_TO_1000'
  /** The winner gets the base points, then minus x points per minute behind the winner */
  | 'TIME_BEHIND'
  /** Base points times the winner time divided by the own time */
  | 'PERCENT_OF_WINNER';

export const cupPointSystemTypes: CupPointSystemType[] = [
  'POSITION_TABLE',
  'WINNER_FIXED',
  'NOF_STARTS',
  'RUN_TO_1000',
  'TIME_BEHIND',
  'PERCENT_OF_WINNER'
];

export interface ICupPointSystem {
  type: CupPointSystemType;
  /** POSITION_TABLE: points for position 1, 2, 3, ... */
  positionPoints: number[];
  /** WINNER_FIXED, RUN_TO_1000, TIME_BEHIND, PERCENT_OF_WINNER: points to the winner */
  winnerPoints: number;
  /** WINNER_FIXED: points less per position */
  decreasePerPosition: number;
  /** TIME_BEHIND: points less per minute behind the winner */
  decreasePerMinute: number;
  /** The lowest points to a finished competitor, also used for finished without position/time (e.g. beginner classes) */
  minPoints: number;
  /** Points for started but not approved (DNF, MP, DSQ) */
  notFinishedPoints: number;
  /** Number of decimals in the points, 0 = whole points */
  decimals: number;
}

export interface ICupCategory {
  id: string;
  name: string;
  /** Class names, * matches any characters, e.g. "H1*", "D1*", "U*". Empty or ["*"] = all classes */
  classes: string[];
  /** One standing per class, otherwise one standing for the whole category */
  groupByClass: boolean;
  /**
   * Age limits, inclusive, by the year of birth as in the orienteering classes: the age is the
   * year the season starts minus the year of birth (born 2010 is 16 in 2026). null = no limit.
   */
  minAge?: number | null;
  maxAge?: number | null;
}

export interface ICupSeasonSettings {
  participants: CupParticipantsType;
  pointsBasis: CupPointsBasisType;
  pointSystem: ICupPointSystem;
  /** Max number of races that are counted in the season, null = all */
  maxRacesCounted: number | null;
  /** Extra points for every finished race beyond the counted races */
  bonusPointsPerExtraRace: number;
  categories: ICupCategory[];
  /** The order the classes are shown in, classes not in the list come last in the default order */
  classOrder: string[];
}

export interface ICupReportProps {
  reportId: number;
  seasonId: number;
  cupRaceId: number | null;
  header: string;
  introduction: string;
  text: string;
  modificationDate?: string;
  modifiedBy?: string;
  files: INewsFileProps[];
}

export interface ICupRaceProps {
  cupRaceId: number;
  seasonId: number;
  name: string;
  raceDate: string;
  eventorId: number | null;
  eventorRaceId: number | null;
  /** Use the total result after this stage instead of the result of the stage */
  useTotalResult: boolean;
  /** Override the theme of the cup for this race */
  theme: CupThemeType | null;
  /** Linked from the result import to a race the club has saved, the club members results are then saved automatically */
  eventId: number | null;
  nofResults: number;
}

/** A cup race that a race in the result import can be linked to */
export interface ICupRaceForEventProps {
  cupRaceId: number;
  cupName: string;
  seasonName: string;
  name: string;
  raceDate: string;
  linked: boolean;
  suggested: boolean;
  linkedToOtherEvent: boolean;
  /** From the settings of the season */
  participants: CupParticipantsType;
  useTotalResult: boolean;
  categories: ICupCategory[];
  /** The year the season starts, the ages of the categories are counted from it */
  seasonYear: number;
}

export interface ICupSeasonProps {
  seasonId: number;
  cupId: number;
  name: string;
  /** A season is limited in time, all races must be within the dates */
  startDate: string;
  endDate: string;
  settings: ICupSeasonSettings;
  races: ICupRaceProps[];
  reports: ICupReportProps[];
}

export interface ICupProps {
  cupId: number;
  name: string;
  slug: string;
  description: string;
  theme: CupThemeType;
  primaryColor: string | null;
  secondaryColor: string | null;
  isActive: boolean;
  /** Show the cup as a button in the toolbar at the top of the homepage */
  showInToolbar: boolean;
  seasons: ICupSeasonProps[];
}

export type CupResultStatusType = 'OK' | 'DNS' | 'DNF' | 'MP' | 'DSQ';
export const cupResultStatuses: CupResultStatusType[] = ['OK', 'DNF', 'MP', 'DSQ', 'DNS'];
export type CupResultSourceType = 'DB' | 'EVENTOR' | 'MANUAL';

export interface ICupResultProps {
  cupResultId: number;
  cupRaceId: number;
  competitorId: number | null;
  eventorPersonId: number | null;
  personName: string;
  /** For the categories with an age limit, null = unknown */
  birthYear: number | null;
  clubName: string | null;
  isClubMember: boolean;
  className: string;
  status: CupResultStatusType;
  /** The position in the whole class */
  position: number | null;
  timeSeconds: number | null;
  timeBehindSeconds: number | null;
  /** The number of starters in the whole class */
  nofStartsInClass: number | null;
  source: CupResultSourceType;
}

export const defaultPositionPoints = [25, 20, 17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export const defaultPointSystem = (): ICupPointSystem => ({
  type: 'POSITION_TABLE',
  positionPoints: [...defaultPositionPoints],
  winnerPoints: 100,
  decreasePerPosition: 3,
  decreasePerMinute: 1,
  minPoints: 1,
  notFinishedPoints: 0,
  decimals: 0
});

export const presetCategories = {
  all: (): ICupCategory => ({ id: 'all', name: 'Alla', classes: ['*'], groupByClass: true }),
  youth: (): ICupCategory => ({
    id: 'youth',
    name: 'Ungdomsklasser',
    classes: ['H10*', 'D10*', 'H12*', 'D12*', 'H14*', 'D14*', 'H16*', 'D16*', 'U1', 'U2', 'U3', 'U4'],
    groupByClass: true
  }),
  beginners: (): ICupCategory => ({
    id: 'beginners',
    name: 'Inskolning',
    classes: ['Insk*', 'INSK*', 'Inskolning*'],
    groupByClass: false
  })
};

export const defaultSeasonSettings = (): ICupSeasonSettings => ({
  participants: 'CLUB',
  pointsBasis: 'ALL',
  pointSystem: defaultPointSystem(),
  maxRacesCounted: null,
  bonusPointsPerExtraRace: 0,
  categories: [presetCategories.all()],
  classOrder: []
});

/** Settings from the database may be older or partial, fill in what is missing */
export const normalizeSeasonSettings = (settings?: Partial<ICupSeasonSettings> | null): ICupSeasonSettings => {
  const defaults = defaultSeasonSettings();
  if (!settings) return defaults;
  return {
    ...defaults,
    ...settings,
    pointSystem: { ...defaults.pointSystem, ...(settings.pointSystem ?? {}) },
    categories:
      Array.isArray(settings.categories) && settings.categories.length > 0 ? settings.categories : defaults.categories,
    classOrder: Array.isArray(settings.classOrder) ? settings.classOrder.filter(c => typeof c === 'string') : []
  };
};
