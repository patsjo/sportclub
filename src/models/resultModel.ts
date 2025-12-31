import dayjs from 'dayjs';
import { action, computed, makeObservable, observable } from 'mobx';
import { INewCompetitorForm } from '../components/results/AddMapCompetitor';
import { PostJsonData } from '../utils/api';
import { INumberOption, IOption, datetimeFormat } from '../utils/formHelper';
import {
  AwardTypes,
  ClassTypeShortName,
  DifficultyTypes,
  DistanceTypes,
  EventClassificationIdTypes,
  FailedReasonTypes,
  LightConditionTypes,
  PaymentTypes,
  SportCodeTypes,
  distances
} from '../utils/resultConstants';
import { GetAge, GetAward } from '../utils/resultHelper';
import { PickRequired } from './typescriptPartial';

interface IRaceFamilyProps {
  familyId: number;
  familyName: string;
}

interface ISaveRaceFamilyProps extends IRaceFamilyProps {
  competitorIds: number[];
}

export interface IRaceFamily extends IRaceFamilyProps {
  setValues: (values: Partial<IRaceFamilyProps>) => void;
}

class RaceFamily implements IRaceFamily {
  familyId = 0;
  familyName = '';

  constructor(options: IRaceFamilyProps) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      familyId: observable,
      familyName: observable,
      setValues: action.bound
    });
  }

  setValues(values: Partial<IRaceFamilyProps>) {
    Object.assign(this, values);
  }
}

export interface IRaceCompetitorProps {
  competitorId: number;
  firstName: string;
  lastName: string;
  familyId?: number | null;
  birthDay: string;
  gender: string;
  excludeResults: boolean;
  excludeTime?: string;
  startDate: string;
  endDate?: string;
  eventorCompetitorIds: number[];
}

export interface IRaceCompetitor extends IRaceCompetitorProps {
  addEventorId: (url: string, id: string, authorizationHeader: Record<string, string>) => Promise<void>;
  renounce: () => void;
  regretRenounce: () => void;
  setValues: (values: Partial<IRaceCompetitorProps>) => void;
  fullName: string;
}

class RaceCompetitor implements IRaceCompetitor {
  competitorId = -1;
  firstName = '';
  lastName = '';
  familyId?: number | null = null;
  birthDay = '';
  gender = '';
  excludeResults = false;
  excludeTime?: string;
  startDate = '';
  endDate? = '';
  eventorCompetitorIds: number[] = [];

  constructor(options: PickRequired<IRaceCompetitorProps, 'competitorId'>) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      competitorId: observable,
      firstName: observable,
      lastName: observable,
      familyId: observable,
      birthDay: observable,
      gender: observable,
      excludeResults: observable,
      excludeTime: observable,
      startDate: observable,
      endDate: observable,
      eventorCompetitorIds: observable,
      addEventorId: action.bound,
      renounce: action.bound,
      regretRenounce: action.bound,
      setValues: action.bound,
      fullName: computed
    });
  }

  async addEventorId(url: string, id: string, authorizationHeader: Record<string, string>) {
    try {
      await PostJsonData(
        url,
        { iType: 'EVENTOR_COMPETITOR_ID', iCompetitorId: this.competitorId, iEventorCompetitorId: id },
        false,
        authorizationHeader
      );
      this.eventorCompetitorIds.push(parseInt(id));
    } catch (error) {
      console.error(error);
    }
  }

  renounce() {
    this.excludeResults = true;
    this.excludeTime = dayjs().format(datetimeFormat);
  }

  regretRenounce() {
    this.excludeResults = false;
    this.excludeTime = dayjs().format(datetimeFormat);
  }

  setValues(values: Partial<IRaceCompetitorProps>) {
    Object.assign(this, values);
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

export interface IRaceClassLevelProps {
  classShortName: string;
  classTypeShortName: ClassTypeShortName;
  age: number;
  difficulty: DifficultyTypes;
}

export interface IRaceClassClassificationProps {
  classClassificationId: number;
  description: string;
  classTypeShortName?: ClassTypeShortName | null;
  ageUpperLimit?: number | null;
  ageLowerLimit?: number | null;
  decreaseBasePoint: number;
  decreaseBase1000Point: number;
  decreaseOldBasePoint: number;
}

export interface IRaceEventClassificationProps {
  eventClassificationId: EventClassificationIdTypes;
  description: string;
  basePoint: number;
  base1000Point: number;
  oldBasePoint: number;
  oldPositionBasePoint: number;
  classClassifications: IRaceClassClassificationProps[];
}

interface IRaceSportProps {
  sportCode: string;
  description: string;
}

interface IRaceClubProps {
  clubId: number;
  name: string;
  eventorOrganisationId: number;
  competitors: IRaceCompetitorProps[];
  families: IRaceFamilyProps[];
}

export interface IRaceClub extends Omit<IRaceClubProps, 'competitors' | 'families'> {
  competitors: IRaceCompetitor[];
  families: IRaceFamily[];
  addCompetitor: (
    url: string,
    competitor: INewCompetitorForm,
    authorizationHeader: Record<string, string>
  ) => Promise<number | undefined>;
  updateCompetitors: () => void;
  addFamily: (familyId: number, familyName: string) => void;
  deleteFamily: (url: string, familyId: number, authorizationHeader: Record<string, string>) => Promise<void>;
  competitorById: (id: number) => IRaceCompetitor | undefined;
  competitorByEventorId: (id: number) => IRaceCompetitor | undefined;
  competitorsOptions: INumberOption[];
}

class RaceClub implements IRaceClubProps {
  clubId = -1;
  name = '';
  eventorOrganisationId = -1;
  competitors: IRaceCompetitor[] = [];
  families: IRaceFamily[] = [];

  constructor(options: PickRequired<IRaceClubProps, 'clubId' | 'name' | 'eventorOrganisationId'>) {
    if (options) {
      const { competitors, families, ...rest } = options;
      Object.assign(this, rest);
      if (competitors) this.competitors = competitors.map(c => new RaceCompetitor(c));
      if (families) this.families = families.map(f => new RaceFamily(f));
    }

    makeObservable(this, {
      clubId: observable,
      name: observable,
      eventorOrganisationId: observable,
      competitors: observable,
      families: observable,
      addCompetitor: action.bound,
      updateCompetitors: action.bound,
      addFamily: action.bound,
      deleteFamily: action.bound,
      competitorsOptions: computed
    });
  }

  async addCompetitor(url: string, competitor: INewCompetitorForm, authorizationHeader: Record<string, string>) {
    try {
      const responseJson = await PostJsonData<IRaceCompetitorProps>(url, competitor, false, authorizationHeader);
      if (responseJson) {
        this.competitors = [...this.competitors, new RaceCompetitor(responseJson)];
        return responseJson.competitorId;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  updateCompetitors() {
    this.competitors = [...this.competitors];
  }

  addFamily(familyId: number, familyName: string) {
    this.families = [...this.families, new RaceFamily({ familyId, familyName })];
  }

  async deleteFamily(url: string, familyId: number, authorizationHeader: Record<string, string>) {
    try {
      await PostJsonData(url, { familyId }, false, authorizationHeader);
      this.competitors.filter(c => c.familyId === familyId).forEach(c => c.setValues({ familyId: null }));
      this.families = this.families.filter(f => f.familyId !== familyId);
      return;
    } catch {
      return;
    }
  }

  competitorById(id: number): IRaceCompetitor | undefined {
    return this.competitors.find(competitor => competitor.competitorId === id);
  }

  competitorByEventorId(id: number): IRaceCompetitor | undefined {
    return this.competitors.find(competitor => competitor.eventorCompetitorIds.includes(id));
  }

  get competitorsOptions() {
    return this.competitors
      .slice()
      .sort((a, b) =>
        a.lastName.toLowerCase() === b.lastName.toLowerCase()
          ? a.firstName.toLowerCase() > b.firstName.toLowerCase()
            ? 1
            : -1
          : a.lastName.toLowerCase() > b.lastName.toLowerCase()
            ? 1
            : -1
      )
      .map(
        (competitor): INumberOption => ({
          code: competitor.competitorId,
          description: `${competitor.fullName} (${competitor.birthDay})`
        })
      );
  }
}

export interface IRaceClubsProps {
  clubs: IRaceClubProps[];
  eventClassifications: IRaceEventClassificationProps[];
  classLevels: IRaceClassLevelProps[];
  sports: IRaceSportProps[];
}

export interface IRaceClubs extends Omit<IRaceClubsProps, 'clubs'> {
  clubs: IRaceClub[];
  selectedClub?: IRaceClub;
  setSelectedClub: (code: number) => void;
  setSelectedClubByEventorId: (code: number) => void;
  classClassification: (
    eventClassificationId: EventClassificationIdTypes,
    classClassificationId: number
  ) => string | null;
  classClassificationOptions: (eventClassificationId: EventClassificationIdTypes) => IOption[];
  eventClassificationOptions: IOption[];
  clubOptions: IOption[];
  sportOptions: IOption[];
}

export class RaceClubs implements IRaceClubs {
  clubs: IRaceClub[] = [];
  eventClassifications: IRaceEventClassificationProps[] = [];
  classLevels: IRaceClassLevelProps[] = [];
  sports: IRaceSportProps[] = [];
  selectedClub?: IRaceClub;

  constructor(options?: Partial<IRaceClubsProps>) {
    if (options) {
      const { clubs, ...rest } = options;
      Object.assign(this, rest);
      if (clubs) this.clubs = clubs.map(c => new RaceClub(c));
    }

    makeObservable(this, {
      clubs: observable,
      eventClassifications: observable,
      classLevels: observable,
      sports: observable,
      selectedClub: observable,
      setSelectedClub: action.bound,
      setSelectedClubByEventorId: action.bound,
      eventClassificationOptions: computed,
      clubOptions: computed,
      sportOptions: computed
    });
  }

  setSelectedClub(code: number) {
    this.selectedClub = this.clubs.find(c => c.clubId === code);
  }

  setSelectedClubByEventorId(code: number) {
    this.selectedClub = this.clubs.find(c => c.eventorOrganisationId === code);
  }

  classClassification(eventClassificationId: EventClassificationIdTypes, classClassificationId: number) {
    const eventClassification = this.eventClassifications.find(
      ec => ec.eventClassificationId === eventClassificationId
    );
    const classClassification = eventClassification?.classClassifications.find(
      cc => cc.classClassificationId === classClassificationId
    );
    return classClassification ? classClassification.description : null;
  }

  classClassificationOptions(eventClassificationId: EventClassificationIdTypes) {
    const eventClassification = this.eventClassifications.find(
      ec => ec.eventClassificationId === eventClassificationId
    );
    return (
      eventClassification?.classClassifications.map(
        (cc): IOption => ({
          code: cc.classClassificationId,
          description: cc.description
        })
      ) ?? []
    );
  }

  get eventClassificationOptions() {
    return this.eventClassifications.map(ec => ({
      code: ec.eventClassificationId,
      description: ec.description
    }));
  }

  get clubOptions() {
    return this.clubs.map(club => ({
      code: club.clubId,
      description: club.name
    }));
  }

  get sportOptions() {
    return this.sports.map(sport => ({
      code: sport.sportCode,
      description: sport.description
    }));
  }
}

export interface IRaceTeamResultProps {
  teamResultId: number;
  className: string;
  deviantEventClassificationId?: EventClassificationIdTypes | null;
  classClassificationId?: number | null;
  difficulty?: DifficultyTypes | null;
  teamName?: string | null;
  competitorId: number;
  lengthInMeter?: number | null;
  failedReason?: string | null;
  teamFailedReason?: string | null;
  competitorTime?: string | null;
  winnerTime?: string | null;
  secondTime?: string | null;
  position?: number | null;
  nofStartsInClass?: number | null;
  stage: number;
  totalStages: number;
  deviantRaceLightCondition?: LightConditionTypes | null;
  deltaPositions?: number | null;
  deltaTimeBehind?: string | null;
  totalStagePosition?: number | null;
  totalStageTimeBehind?: string | null;
  totalPosition?: number | null;
  totalNofStartsInClass?: number | null;
  totalTimeBehind?: string | null;
  points1000?: number | null;
  ranking?: number | null;
  missingTime?: string | null;
  speedRanking?: number | null;
  technicalRanking?: number | null;
  serviceFeeToClub?: number | null;
  serviceFeeDescription?: string | null;
}

export interface IRaceTeamResult extends IRaceTeamResultProps {
  setValues: (values: Partial<IRaceTeamResultProps>) => void;
  setDeviantEventClassificationId: (value: EventClassificationIdTypes) => void;
  setDifficulty: (value: DifficultyTypes) => void;
  setFailedReason: (value: FailedReasonTypes) => void;
  setTeamFailedReason: (value: FailedReasonTypes) => void;
  setDeviantRaceLightCondition: (value: LightConditionTypes) => void;
  setStringValue: (key: 'className', value: string) => void;
  setStringValueOrNull: (
    key:
      | 'teamName'
      | 'competitorTime'
      | 'winnerTime'
      | 'secondTime'
      | 'deltaTimeBehind'
      | 'totalStageTimeBehind'
      | 'totalTimeBehind'
      | 'missingTime'
      | 'serviceFeeDescription',
    value?: string | null
  ) => void;
  setNumberValue: (key: 'competitorId' | 'stage' | 'totalStages' | 'serviceFeeToClub', value: number) => void;
  setNumberValueOrNull: (
    key:
      | 'classClassificationId'
      | 'lengthInMeter'
      | 'position'
      | 'nofStartsInClass'
      | 'deltaPositions'
      | 'totalStagePosition'
      | 'totalPosition'
      | 'totalNofStartsInClass'
      | 'points1000'
      | 'ranking'
      | 'speedRanking'
      | 'technicalRanking',
    value?: number | null
  ) => void;
  valid: boolean;
}

class RaceTeamResult implements IRaceTeamResult {
  teamResultId = -1;
  className = '';
  deviantEventClassificationId?: EventClassificationIdTypes | null;
  classClassificationId?: number | null;
  difficulty?: DifficultyTypes | null;
  teamName?: string | null;
  competitorId = -1;
  lengthInMeter?: number | null;
  failedReason?: string | null;
  teamFailedReason?: string | null;
  competitorTime?: string | null;
  winnerTime?: string | null;
  secondTime?: string | null;
  position?: number | null;
  nofStartsInClass?: number | null;
  stage = 1;
  totalStages = 3;
  deviantRaceLightCondition?: LightConditionTypes | null;
  deltaPositions?: number | null;
  deltaTimeBehind?: string | null;
  totalStagePosition?: number | null;
  totalStageTimeBehind?: string | null;
  totalPosition?: number | null;
  totalNofStartsInClass?: number | null;
  totalTimeBehind?: string | null;
  points1000?: number | null;
  ranking?: number | null;
  missingTime?: string | null;
  speedRanking?: number | null;
  technicalRanking?: number | null;
  serviceFeeToClub = 0;
  serviceFeeDescription?: string | null;

  constructor(options: PickRequired<IRaceTeamResultProps, 'teamResultId' | 'className'>) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      teamResultId: observable,
      className: observable,
      deviantEventClassificationId: observable,
      classClassificationId: observable,
      difficulty: observable,
      teamName: observable,
      competitorId: observable,
      lengthInMeter: observable,
      failedReason: observable,
      teamFailedReason: observable,
      competitorTime: observable,
      winnerTime: observable,
      secondTime: observable,
      position: observable,
      nofStartsInClass: observable,
      stage: observable,
      totalStages: observable,
      deviantRaceLightCondition: observable,
      deltaPositions: observable,
      deltaTimeBehind: observable,
      totalStagePosition: observable,
      totalStageTimeBehind: observable,
      totalPosition: observable,
      totalNofStartsInClass: observable,
      totalTimeBehind: observable,
      points1000: observable,
      ranking: observable,
      missingTime: observable,
      speedRanking: observable,
      technicalRanking: observable,
      serviceFeeToClub: observable,
      serviceFeeDescription: observable,
      setDeviantEventClassificationId: action.bound,
      setDifficulty: action.bound,
      setFailedReason: action.bound,
      setTeamFailedReason: action.bound,
      setDeviantRaceLightCondition: action.bound,
      setStringValue: action.bound,
      setStringValueOrNull: action.bound,
      setNumberValue: action.bound,
      setNumberValueOrNull: action.bound,
      valid: computed
    });
  }

  setValues(values: Partial<IRaceTeamResultProps>) {
    Object.assign(this, values);
  }

  setDeviantEventClassificationId(value: EventClassificationIdTypes) {
    this.deviantEventClassificationId = value;
  }

  setDifficulty(value: DifficultyTypes) {
    this.difficulty = value;
  }

  setFailedReason(value: FailedReasonTypes) {
    this.failedReason = value;
  }

  setTeamFailedReason(value: FailedReasonTypes) {
    this.teamFailedReason = value;
  }

  setDeviantRaceLightCondition(value: LightConditionTypes) {
    this.deviantRaceLightCondition = value;
  }

  setStringValue(key: 'className', value: string) {
    this[key] = value;
  }

  setStringValueOrNull(
    key:
      | 'teamName'
      | 'competitorTime'
      | 'winnerTime'
      | 'secondTime'
      | 'deltaTimeBehind'
      | 'totalStageTimeBehind'
      | 'totalTimeBehind'
      | 'missingTime'
      | 'serviceFeeDescription',
    value?: string | null
  ) {
    this[key] = value != null ? value : null;
  }

  setNumberValue(key: 'competitorId' | 'stage' | 'totalStages' | 'serviceFeeToClub', value: number) {
    this[key] = value;
  }

  setNumberValueOrNull(
    key:
      | 'classClassificationId'
      | 'lengthInMeter'
      | 'position'
      | 'nofStartsInClass'
      | 'deltaPositions'
      | 'totalStagePosition'
      | 'totalPosition'
      | 'totalNofStartsInClass'
      | 'points1000'
      | 'ranking'
      | 'speedRanking'
      | 'technicalRanking',
    value?: number | null
  ) {
    this[key] = value != null ? value : null;
  }

  get valid() {
    return (
      this.competitorId != null &&
      this.teamName != null &&
      this.className != null &&
      this.classClassificationId != null &&
      this.difficulty != null &&
      this.stage != null &&
      this.totalStages != null &&
      (this.failedReason != null ||
        (this.lengthInMeter != null &&
          this.competitorTime != null &&
          this.winnerTime != null &&
          this.position != null &&
          this.nofStartsInClass != null)) &&
      (this.teamFailedReason != null ||
        (this.totalTimeBehind != null && this.totalPosition != null && this.totalNofStartsInClass != null))
    );
  }
}

export interface IRaceResultMultiDayProps {
  multiDayResultId: number;
  stage: number;
  totalStages: number;
  totalLengthInMeter?: number | null;
  totalFailedReason?: string | null;
  totalTime?: string | null;
  totalWinnerTime?: string | null;
  totalSecondTime?: string | null;
  totalPosition?: number | null;
  totalNofStartsInClass?: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IRaceResultMultiDay extends IRaceResultMultiDayProps {}

class RaceResultMultiDay implements IRaceResultMultiDay {
  multiDayResultId = -1;
  stage = 1;
  totalStages = 2;
  totalLengthInMeter?: number | null;
  totalFailedReason?: string | null;
  totalTime?: string | null;
  totalWinnerTime?: string | null;
  totalSecondTime?: string | null;
  totalPosition?: number | null;
  totalNofStartsInClass?: number | null;

  constructor(options: PickRequired<IRaceResultMultiDayProps, 'multiDayResultId'>) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      multiDayResultId: observable,
      stage: observable,
      totalStages: observable,
      totalLengthInMeter: observable,
      totalFailedReason: observable,
      totalTime: observable,
      totalWinnerTime: observable,
      totalSecondTime: observable,
      totalPosition: observable,
      totalNofStartsInClass: observable
    });
  }
}

export interface IRaceEventBasic {
  eventClassificationId: EventClassificationIdTypes;
  raceDate: string;
  meetsAwardRequirements: boolean;
  raceDistance: DistanceTypes;
}

export interface IRaceResultProps {
  resultId: number;
  competitorId: number;
  resultMultiDay?: IRaceResultMultiDayProps | null;
  className: string;
  deviantEventClassificationId?: EventClassificationIdTypes | null;
  classClassificationId?: number | null;
  difficulty?: DifficultyTypes | null;
  lengthInMeter?: number | null;
  failedReason?: string | null;
  competitorTime?: string | null;
  winnerTime?: string | null;
  secondTime?: string | null;
  position?: number | null;
  nofStartsInClass?: number | null;
  originalFee?: number | null;
  lateFee?: number | null;
  feeToClub?: number | null;
  serviceFeeToClub?: number | null;
  serviceFeeDescription?: string | null;
  award?: AwardTypes | null;
  points?: number | null;
  pointsOld?: number | null;
  points1000?: number | null;
  ranking?: number | null;
  missingTime?: string | null;
  speedRanking?: number | null;
  technicalRanking?: number | null;
}

export interface IRaceResult extends Omit<IRaceResultProps, 'resultMultiDay'> {
  resultMultiDay?: IRaceResultMultiDay | null;
  isAwardTouched: boolean;
  setValues: (values: Partial<IRaceResultProps>) => void;
  setAward: (value: AwardTypes) => void;
  setDeviantEventClassificationId: (value?: EventClassificationIdTypes | null) => void;
  setDifficulty: (value: DifficultyTypes) => void;
  setFailedReason: (value: FailedReasonTypes) => void;
  setStringValue: (key: 'className', value: string) => void;
  setStringValueOrNull: (
    key: 'competitorTime' | 'winnerTime' | 'secondTime' | 'missingTime' | 'serviceFeeDescription',
    value?: string | null
  ) => void;
  setNumberValue: (key: 'competitorId' | 'serviceFeeToClub', value: number) => void;
  setNumberValueOrNull: (
    key:
      | 'classClassificationId'
      | 'lengthInMeter'
      | 'position'
      | 'nofStartsInClass'
      | 'originalFee'
      | 'lateFee'
      | 'feeToClub'
      | 'points'
      | 'pointsOld'
      | 'points1000'
      | 'ranking'
      | 'speedRanking'
      | 'technicalRanking',
    value?: number | null
  ) => void;
  setIsAwardTouched: (raceClubs: IRaceClubs, raceEvent: IRaceEventBasic) => void;
  setCalculatedAward: (value: AwardTypes | null) => void;
  valid: boolean;
}

class RaceResult implements IRaceResult {
  resultId = -1;
  competitorId = -1;
  resultMultiDay?: IRaceResultMultiDay | null;
  className = '';
  deviantEventClassificationId?: EventClassificationIdTypes | null;
  classClassificationId?: number | null;
  difficulty?: DifficultyTypes | null;
  lengthInMeter?: number | null;
  failedReason?: string | null;
  competitorTime?: string | null;
  winnerTime?: string | null;
  secondTime?: string | null;
  position?: number | null;
  nofStartsInClass?: number | null;
  originalFee?: number | null;
  lateFee?: number | null;
  feeToClub?: number | null;
  serviceFeeToClub = 0;
  serviceFeeDescription?: string | null;
  award?: AwardTypes | null;
  points?: number | null;
  pointsOld?: number | null;
  points1000?: number | null;
  ranking?: number | null;
  missingTime?: string | null;
  speedRanking?: number | null;
  technicalRanking?: number | null;
  isAwardTouched = false;

  constructor(options: PickRequired<IRaceResultProps, 'resultId' | 'className'>) {
    if (options) {
      const { resultMultiDay, ...rest } = options;
      Object.assign(this, rest);
      if (resultMultiDay) this.resultMultiDay = new RaceResultMultiDay(resultMultiDay);
    }

    makeObservable(this, {
      resultId: observable,
      competitorId: observable,
      resultMultiDay: observable,
      className: observable,
      deviantEventClassificationId: observable,
      classClassificationId: observable,
      difficulty: observable,
      lengthInMeter: observable,
      failedReason: observable,
      competitorTime: observable,
      winnerTime: observable,
      secondTime: observable,
      position: observable,
      nofStartsInClass: observable,
      originalFee: observable,
      lateFee: observable,
      feeToClub: observable,
      serviceFeeToClub: observable,
      serviceFeeDescription: observable,
      award: observable,
      points: observable,
      pointsOld: observable,
      points1000: observable,
      ranking: observable,
      missingTime: observable,
      speedRanking: observable,
      technicalRanking: observable,
      isAwardTouched: observable,
      setAward: action.bound,
      setDeviantEventClassificationId: action.bound,
      setDifficulty: action.bound,
      setFailedReason: action.bound,
      setStringValue: action.bound,
      setStringValueOrNull: action.bound,
      setNumberValue: action.bound,
      setNumberValueOrNull: action.bound,
      setIsAwardTouched: action.bound,
      setCalculatedAward: action.bound,
      valid: computed
    });
  }

  setValues(values: Partial<IRaceResultProps>) {
    Object.assign(this, values);
  }

  setAward(value: AwardTypes) {
    this.award = value;
    this.isAwardTouched = true;
  }

  setDeviantEventClassificationId(value?: EventClassificationIdTypes | null) {
    this.deviantEventClassificationId = value != null ? value : null;
  }

  setDifficulty(value: DifficultyTypes) {
    this.difficulty = value;
  }

  setFailedReason(value: FailedReasonTypes) {
    this.failedReason = value;
  }

  setStringValue(key: 'className', value: string) {
    this[key] = value;
  }

  setStringValueOrNull(
    key: 'competitorTime' | 'winnerTime' | 'secondTime' | 'missingTime' | 'serviceFeeDescription',
    value?: string | null
  ) {
    this[key] = value != null ? value : null;
  }

  setNumberValue(key: 'competitorId' | 'serviceFeeToClub', value: number) {
    this[key] = value;
  }

  setNumberValueOrNull(
    key:
      | 'classClassificationId'
      | 'lengthInMeter'
      | 'position'
      | 'nofStartsInClass'
      | 'originalFee'
      | 'lateFee'
      | 'feeToClub'
      | 'points'
      | 'pointsOld'
      | 'points1000'
      | 'ranking'
      | 'speedRanking'
      | 'technicalRanking',
    value?: number | null
  ) {
    this[key] = value != null ? value : null;
  }

  setIsAwardTouched(raceClubs: IRaceClubs, raceEvent: IRaceEventBasic) {
    const raceEventClassification = raceClubs.eventClassifications?.find(
      ec => ec.eventClassificationId === raceEvent.eventClassificationId
    );
    const competitor = raceClubs.selectedClub?.competitorById(this.competitorId);
    const age = competitor && GetAge(competitor.birthDay, raceEvent.raceDate);
    const calculatedAward =
      raceEvent.meetsAwardRequirements && raceEventClassification
        ? GetAward(
            raceEventClassification,
            raceClubs.classLevels,
            this,
            age !== undefined ? age : null,
            raceEvent.raceDistance === distances.sprint
          )
        : null;
    this.isAwardTouched = this.isAwardTouched || !((!calculatedAward && !this.award) || calculatedAward === this.award);
  }

  setCalculatedAward(value: AwardTypes | null) {
    if (!this.isAwardTouched) {
      this.award = value;
    }
  }

  get valid() {
    return (
      this.competitorId != null &&
      this.className != null &&
      this.classClassificationId != null &&
      this.difficulty != null &&
      this.originalFee != null &&
      this.lateFee != null &&
      this.feeToClub != null &&
      (this.failedReason != null ||
        (this.lengthInMeter != null &&
          this.competitorTime != null &&
          this.winnerTime != null &&
          this.position != null &&
          this.nofStartsInClass != null))
    );
  }
}

export interface IRaceEventBasicProps {
  name?: string | null;
  organiserName?: string | null;
  raceDate?: string | null;
  raceTime?: string | null;
}

export interface IRaceEventProps extends IRaceEventBasicProps {
  eventId: number;
  eventorId?: number | null;
  eventorRaceId?: number | null;
  sportCode: SportCodeTypes;
  isRelay: boolean;
  eventClassificationId: EventClassificationIdTypes;
  raceLightCondition?: LightConditionTypes | null;
  raceDistance?: DistanceTypes | null;
  paymentModel: PaymentTypes;
  meetsAwardRequirements: boolean;
  results: IRaceResultProps[];
  teamResults: IRaceTeamResultProps[];
  rankingBasetimePerKilometer?: string | null;
  rankingBasepoint?: number | null;
  rankingBaseDescription?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  invoiceVerified: boolean;
}

export interface IRaceEvent extends Omit<IRaceEventProps, 'results' | 'teamResults'> {
  results: IRaceResult[];
  teamResults: IRaceTeamResult[];
  setEventClassificationId: (value: EventClassificationIdTypes) => void;
  setPaymentModel: (value: PaymentTypes) => void;
  setRaceDistance: (value: DistanceTypes) => void;
  setRaceLightCondition: (value: LightConditionTypes) => void;
  setSportCode: (value: SportCodeTypes) => void;
  setStringValueOrNull: (
    key: 'name' | 'organiserName' | 'raceDate' | 'raceTime' | 'rankingBasetimePerKilometer' | 'rankingBaseDescription',
    value?: string | null
  ) => void;
  setBooleanValue: (key: 'isRelay' | 'meetsAwardRequirements' | 'invoiceVerified', value: boolean) => void;
  setNumberValueOrNull: (
    key: 'eventorId' | 'eventorRaceId' | 'rankingBasepoint' | 'longitude' | 'latitude',
    value?: number | null
  ) => void;
  addResult: (result: IRaceResultProps) => void;
  removeResult: (result: IRaceResultProps) => void;
  addTeamResult: (result: IRaceTeamResultProps) => void;
  removeTeamResult: (result: IRaceTeamResultProps) => void;
  valid: boolean;
  validRanking: boolean;
}

export class RaceEvent implements IRaceEvent {
  eventId = -1;
  eventorId?: number | null;
  eventorRaceId?: number | null;
  name?: string | null;
  organiserName?: string | null;
  raceDate?: string | null;
  raceTime?: string | null;
  sportCode: SportCodeTypes = 'OL';
  isRelay = false;
  eventClassificationId: EventClassificationIdTypes = 'F';
  raceLightCondition?: LightConditionTypes | null;
  raceDistance?: DistanceTypes | null;
  paymentModel: PaymentTypes = 0;
  meetsAwardRequirements = false;
  results: IRaceResult[] = [];
  teamResults: IRaceTeamResult[] = [];
  rankingBasetimePerKilometer?: string | null;
  rankingBasepoint?: number | null;
  rankingBaseDescription?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  invoiceVerified = false;

  constructor(options: PickRequired<IRaceEventProps, 'eventId' | 'sportCode'>) {
    if (options) {
      const { results, teamResults, ...rest } = options;
      Object.assign(this, rest);
      if (results) this.results = results.map(r => new RaceResult(r));
      if (teamResults) this.teamResults = teamResults.map(r => new RaceTeamResult(r));
    }

    makeObservable(this, {
      eventId: observable,
      eventorId: observable,
      eventorRaceId: observable,
      name: observable,
      organiserName: observable,
      raceDate: observable,
      raceTime: observable,
      sportCode: observable,
      isRelay: observable,
      eventClassificationId: observable,
      raceLightCondition: observable,
      raceDistance: observable,
      paymentModel: observable,
      meetsAwardRequirements: observable,
      results: observable,
      teamResults: observable,
      rankingBasetimePerKilometer: observable,
      rankingBasepoint: observable,
      rankingBaseDescription: observable,
      longitude: observable,
      latitude: observable,
      invoiceVerified: observable,
      setEventClassificationId: action.bound,
      setPaymentModel: action.bound,
      setRaceDistance: action.bound,
      setRaceLightCondition: action.bound,
      setSportCode: action.bound,
      setStringValueOrNull: action.bound,
      setBooleanValue: action.bound,
      setNumberValueOrNull: action.bound,
      addResult: action.bound,
      removeResult: action.bound,
      addTeamResult: action.bound,
      removeTeamResult: action.bound,
      valid: computed,
      validRanking: computed
    });
  }

  setEventClassificationId(value: EventClassificationIdTypes) {
    this.eventClassificationId = value;
  }

  setPaymentModel(value: PaymentTypes) {
    this.paymentModel = value;
  }

  setRaceDistance(value: DistanceTypes) {
    this.raceDistance = value;
  }

  setRaceLightCondition(value: LightConditionTypes) {
    this.raceLightCondition = value;
  }

  setSportCode(value: SportCodeTypes) {
    this.sportCode = value;
  }

  setStringValueOrNull(
    key: 'name' | 'organiserName' | 'raceDate' | 'raceTime' | 'rankingBasetimePerKilometer' | 'rankingBaseDescription',
    value?: string | null
  ) {
    this[key] = value != null ? value : null;
  }

  setBooleanValue(key: 'isRelay' | 'meetsAwardRequirements' | 'invoiceVerified', value: boolean) {
    this[key] = value;
  }

  setNumberValueOrNull(
    key: 'eventorId' | 'eventorRaceId' | 'rankingBasepoint' | 'longitude' | 'latitude',
    value?: number | null
  ) {
    this[key] = value != null ? value : null;
  }

  addResult(result: IRaceResultProps) {
    this.results = [...this.results, new RaceResult(result)];
  }

  removeResult(result: IRaceResultProps) {
    this.results = [...this.results.filter(item => item.resultId !== result.resultId)];
  }

  addTeamResult(result: IRaceTeamResultProps) {
    this.teamResults = [...this.teamResults, new RaceTeamResult(result)];
  }

  removeTeamResult(result: IRaceTeamResultProps) {
    this.teamResults = [...this.teamResults.filter(item => item.teamResultId !== result.teamResultId)];
  }

  get valid() {
    return (
      this.name != null &&
      this.organiserName != null &&
      this.raceDate != null &&
      this.sportCode != null &&
      this.eventClassificationId != null &&
      this.paymentModel != null &&
      this.raceLightCondition != null &&
      this.raceDistance != null &&
      (this.results.length > 0 || this.teamResults.length > 0) &&
      !this.results.some(result => !result.valid) &&
      !this.teamResults.some(result => !result.valid)
    );
  }

  get validRanking() {
    return (
      this.name != null &&
      this.organiserName != null &&
      this.raceDate != null &&
      this.sportCode != null &&
      this.eventClassificationId != null &&
      this.paymentModel != null &&
      this.raceLightCondition != null &&
      this.raceDistance != null &&
      (this.results.length > 0 || this.teamResults.length > 0) &&
      !this.results.some(result => !result.valid) &&
      !this.teamResults.some(result => !result.valid) &&
      (this.sportCode === 'INOL' ||
        this.sportCode === 'PREO' ||
        (this.rankingBasetimePerKilometer != null &&
          this.rankingBasepoint != null &&
          this.rankingBaseDescription != null))
    );
  }
}
