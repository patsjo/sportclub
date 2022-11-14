import { INewCompetitorForm } from 'components/results/AddMapCompetitor';
import { cast, flow, Instance, SnapshotIn, types } from 'mobx-state-tree';
import moment from 'moment';
import { datetimeFormat, INumberOption } from 'utils/formHelper';
import { PostJsonData } from '../utils/api';
import {
  AwardTypes,
  DifficultyTypes,
  distances,
  DistanceTypes,
  EventClassificationIdTypes,
  FailedReasonTypes,
  LightConditionTypes,
  PaymentTypes,
  SportCodeTypes,
} from '../utils/resultConstants';
import { GetAge, GetAward } from '../utils/resultHelper';

const RaceCompetitor = types
  .model({
    competitorId: types.identifierNumber,
    firstName: types.string,
    lastName: types.string,
    birthDay: types.string,
    gender: types.string,
    excludeResults: types.boolean,
    excludeTime: types.maybeNull(types.string),
    startDate: types.string,
    endDate: types.maybeNull(types.string),
    eventorCompetitorIds: types.array(types.integer),
  })
  .actions((self) => {
    return {
      addEventorId: flow(function* addEventorId(url: string, id: string, authorizationHeader: Record<string, string>) {
        try {
          yield PostJsonData(
            url,
            { iType: 'EVENTOR_COMPETITOR_ID', iCompetitorId: self.competitorId, iEventorCompetitorId: id },
            false,
            authorizationHeader
          );
          self.eventorCompetitorIds.push(parseInt(id));
        } catch (error) {
          console.error(error);
        }
      }),
      renounce() {
        self.excludeResults = true;
        self.excludeTime = moment().format(datetimeFormat);
      },
      regretRenounce() {
        self.excludeResults = false;
        self.excludeTime = moment().format(datetimeFormat);
      },
    };
  })
  .views((self) => ({
    get fullName() {
      return `${self.firstName} ${self.lastName}`;
    },
  }));
export type IRaceCompetitor = Instance<typeof RaceCompetitor>;
export type IRaceCompetitorSnapshotIn = SnapshotIn<typeof RaceCompetitor>;

const RaceClassLevel = types.model({
  classShortName: types.identifier,
  classTypeShortName: types.string,
  age: types.integer,
  difficulty: types.string,
});
export type IRaceClassLevelSnapshotIn = SnapshotIn<typeof RaceClassLevel>;

const RaceClassClassification = types.model({
  classClassificationId: types.identifierNumber,
  description: types.string,
  classTypeShortName: types.maybeNull(types.string),
  ageUpperLimit: types.maybeNull(types.integer),
  ageLowerLimit: types.maybeNull(types.integer),
  decreaseBasePoint: types.integer,
  decreaseBase1000Point: types.integer,
  decreaseOldBasePoint: types.integer,
});
export type IRaceClassClassificationSnapshotIn = SnapshotIn<typeof RaceClassClassification>;

const RaceEventClassification = types.model({
  eventClassificationId: types.identifier,
  description: types.string,
  basePoint: types.integer,
  base1000Point: types.integer,
  oldBasePoint: types.integer,
  oldPositionBasePoint: types.integer,
  classClassifications: types.array(RaceClassClassification),
});
export type IRaceEventClassificationSnapshotIn = SnapshotIn<typeof RaceEventClassification>;

const RaceSport = types.model({
  sportCode: types.identifier,
  description: types.string,
});

const RaceClub = types
  .model({
    clubId: types.identifierNumber,
    name: types.string,
    eventorOrganisationId: types.integer,
    competitors: types.array(RaceCompetitor),
  })
  .actions((self) => {
    return {
      addCompetitor: flow(function* addCompetitor(
        url: string,
        competitor: INewCompetitorForm,
        authorizationHeader: Record<string, string>
      ) {
        try {
          const responseJson: IRaceCompetitorSnapshotIn = yield PostJsonData(
            url,
            competitor,
            false,
            authorizationHeader
          );
          self.competitors.push(responseJson);
          return responseJson.competitorId;
        } catch (error) {
          return undefined;
        }
      }),
    };
  })
  .views((self) => ({
    competitorById(id: number): IRaceCompetitor | undefined {
      return self.competitors.find((competitor) => competitor.competitorId === id);
    },
    competitorByEventorId(id: number): IRaceCompetitor | undefined {
      return self.competitors.find((competitor) => competitor.eventorCompetitorIds.includes(id));
    },
    get competitorsOptions() {
      return self.competitors
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
            description: `${competitor.fullName} (${competitor.birthDay})`,
          })
        );
    },
  }));
export type IRaceClub = Instance<typeof RaceClub>;

export const RaceClubs = types
  .model({
    clubs: types.array(RaceClub),
    selectedClub: types.reference(RaceClub),
    eventClassifications: types.array(RaceEventClassification),
    classLevels: types.array(RaceClassLevel),
    sports: types.array(RaceSport),
  })
  .actions((self) => {
    return {
      setSelectedClub(code: number) {
        self.selectedClub = code as any;
      },
    };
  })
  .views((self) => ({
    classClassification(eventClassificationId: EventClassificationIdTypes, classClassificationId: number) {
      const eventClassification = self.eventClassifications.find(
        (ec) => ec.eventClassificationId === eventClassificationId
      );
      const classClassification = eventClassification?.classClassifications.find(
        (cc) => cc.classClassificationId === classClassificationId
      );
      return classClassification ? classClassification.description : null;
    },
    classClassificationOptions(eventClassificationId: EventClassificationIdTypes) {
      const eventClassification = self.eventClassifications.find(
        (ec) => ec.eventClassificationId === eventClassificationId
      );
      return eventClassification?.classClassifications.map((cc) => ({
        code: cc.classClassificationId.toString(),
        description: cc.description,
      }));
    },
    get eventClassificationOptions() {
      return self.eventClassifications.map((ec) => ({
        code: ec.eventClassificationId,
        description: ec.description,
      }));
    },
    get clubOptions() {
      return self.clubs.map((club) => ({
        code: club.clubId.toString(),
        description: club.name,
      }));
    },
    get sportOptions() {
      return self.sports.map((sport) => ({
        code: sport.sportCode,
        description: sport.description,
      }));
    },
  }));
export type IRaceClubs = Instance<typeof RaceClubs>;
export type IRaceClubsSnapshotIn = SnapshotIn<typeof RaceClubs>;

const RaceTeamResult = types
  .model({
    teamResultId: types.identifierNumber,
    className: types.string,
    deviantEventClassificationId: types.maybeNull(types.string),
    classClassificationId: types.maybeNull(types.integer),
    difficulty: types.maybeNull(types.string),
    teamName: types.maybeNull(types.string),
    competitorId: types.integer,
    lengthInMeter: types.maybeNull(types.integer),
    failedReason: types.maybeNull(types.string),
    teamFailedReason: types.maybeNull(types.string),
    competitorTime: types.maybeNull(types.string),
    winnerTime: types.maybeNull(types.string),
    secondTime: types.maybeNull(types.string),
    position: types.maybeNull(types.integer),
    nofStartsInClass: types.maybeNull(types.integer),
    stage: types.integer,
    totalStages: types.integer,
    deviantRaceLightCondition: types.maybeNull(types.string),
    deltaPositions: types.maybeNull(types.integer),
    deltaTimeBehind: types.maybeNull(types.string),
    totalStagePosition: types.maybeNull(types.integer),
    totalStageTimeBehind: types.maybeNull(types.string),
    totalPosition: types.maybeNull(types.integer),
    totalNofStartsInClass: types.maybeNull(types.integer),
    totalTimeBehind: types.maybeNull(types.string),
    points1000: types.maybeNull(types.integer),
    ranking: types.maybeNull(types.number),
    missingTime: types.maybeNull(types.string),
    speedRanking: types.maybeNull(types.number),
    technicalRanking: types.maybeNull(types.number),
    serviceFeeToClub: types.optional(types.number, 0),
    serviceFeeDescription: types.maybeNull(types.string),
  })
  .actions((self) => {
    return {
      setDeviantEventClassificationId(value: EventClassificationIdTypes) {
        self.deviantEventClassificationId = value;
      },
      setDifficulty(value: DifficultyTypes) {
        self.difficulty = value;
      },
      setFailedReason(value: FailedReasonTypes) {
        self.failedReason = value;
      },
      setTeamFailedReason(value: FailedReasonTypes) {
        self.teamFailedReason = value;
      },
      setDeviantRaceLightCondition(value: LightConditionTypes) {
        self.deviantRaceLightCondition = value;
      },
      setStringValue(key: 'className', value: string) {
        self[key] = value;
      },
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
        self[key] = value != null ? value : null;
      },
      setNumberValue(key: 'competitorId' | 'stage' | 'totalStages' | 'serviceFeeToClub', value: number) {
        self[key] = value;
      },
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
        self[key] = value != null ? value : null;
      },
    };
  })
  .views((self) => ({
    get valid() {
      return (
        self.competitorId != null &&
        self.teamName != null &&
        self.className != null &&
        self.classClassificationId != null &&
        self.difficulty != null &&
        self.stage != null &&
        self.totalStages != null &&
        (self.failedReason != null ||
          (self.lengthInMeter != null &&
            self.competitorTime != null &&
            self.winnerTime != null &&
            self.position != null &&
            self.nofStartsInClass != null)) &&
        (self.teamFailedReason != null ||
          (self.totalTimeBehind != null && self.totalPosition != null && self.totalNofStartsInClass != null))
      );
    },
  }));
export type IRaceTeamResult = Instance<typeof RaceTeamResult>;
export type IRaceTeamResultSnapshotIn = SnapshotIn<typeof RaceTeamResult>;

const RaceResultMultiDay = types.model({
  multiDayResultId: types.identifierNumber,
  stage: types.integer,
  totalStages: types.integer,
  totalLengthInMeter: types.maybeNull(types.integer),
  totalFailedReason: types.maybeNull(types.string),
  totalTime: types.maybeNull(types.string),
  totalWinnerTime: types.maybeNull(types.string),
  totalSecondTime: types.maybeNull(types.string),
  totalPosition: types.maybeNull(types.integer),
  totalNofStartsInClass: types.maybeNull(types.integer),
});

export type IRaceResultMultiDaySnapshotIn = SnapshotIn<typeof RaceResultMultiDay>;

export interface IRaceEventBasic {
  eventClassificationId: string;
  raceDate: string;
  meetsAwardRequirements: boolean;
  raceDistance: DistanceTypes;
}

const RaceResult = types
  .model({
    resultId: types.identifierNumber,
    competitorId: types.integer,
    resultMultiDay: types.maybeNull(RaceResultMultiDay),
    className: types.string,
    deviantEventClassificationId: types.maybeNull(types.string),
    classClassificationId: types.maybeNull(types.integer),
    difficulty: types.maybeNull(types.string),
    lengthInMeter: types.maybeNull(types.integer),
    failedReason: types.maybeNull(types.string),
    competitorTime: types.maybeNull(types.string),
    winnerTime: types.maybeNull(types.string),
    secondTime: types.maybeNull(types.string),
    position: types.maybeNull(types.integer),
    nofStartsInClass: types.maybeNull(types.integer),
    originalFee: types.maybeNull(types.number),
    lateFee: types.maybeNull(types.number),
    feeToClub: types.maybeNull(types.number),
    serviceFeeToClub: types.optional(types.number, 0),
    serviceFeeDescription: types.maybeNull(types.string),
    award: types.maybeNull(types.string),
    points: types.maybeNull(types.integer),
    pointsOld: types.maybeNull(types.integer),
    points1000: types.maybeNull(types.integer),
    ranking: types.maybeNull(types.number),
    missingTime: types.maybeNull(types.string),
    speedRanking: types.maybeNull(types.number),
    technicalRanking: types.maybeNull(types.number),
  })
  .volatile((self) => ({
    isAwardTouched: false,
  }))
  .actions((self) => {
    return {
      setAward(value: AwardTypes) {
        self.award = value;
        self.isAwardTouched = true;
      },
      setDeviantEventClassificationId(value?: EventClassificationIdTypes | null) {
        self.deviantEventClassificationId = value != null ? value : null;
      },
      setDifficulty(value: DifficultyTypes) {
        self.difficulty = value;
      },
      setFailedReason(value: FailedReasonTypes) {
        self.failedReason = value;
      },
      setStringValue(key: 'className', value: string) {
        self[key] = value;
      },
      setStringValueOrNull(
        key: 'competitorTime' | 'winnerTime' | 'secondTime' | 'missingTime' | 'serviceFeeDescription',
        value?: string | null
      ) {
        self[key] = value != null ? value : null;
      },
      setNumberValue(key: 'competitorId' | 'serviceFeeToClub', value: number) {
        self[key] = value;
      },
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
        self[key] = value != null ? value : null;
      },
      setIsAwardTouched(raceClubs: IRaceClubs, raceEvent: IRaceEventBasic) {
        const raceEventClassification = raceClubs.eventClassifications?.find(
          (ec) => ec.eventClassificationId === raceEvent.eventClassificationId
        );
        const competitor = raceClubs.selectedClub?.competitorById(self.competitorId);
        const age = competitor && GetAge(competitor.birthDay, raceEvent.raceDate);
        const calculatedAward =
          raceEvent.meetsAwardRequirements && raceEventClassification
            ? GetAward(
                raceEventClassification,
                raceClubs.classLevels,
                self,
                age !== undefined ? age : null,
                raceEvent.raceDistance === distances.sprint
              )
            : null;
        self.isAwardTouched =
          self.isAwardTouched || !((!calculatedAward && !self.award) || calculatedAward === self.award);
      },
      setCalculatedAward(value: AwardTypes | null) {
        if (!self.isAwardTouched) {
          self.award = value;
        }
      },
    };
  })
  .views((self) => ({
    get valid() {
      return (
        self.competitorId != null &&
        self.className != null &&
        self.classClassificationId != null &&
        self.difficulty != null &&
        self.originalFee != null &&
        self.lateFee != null &&
        self.feeToClub != null &&
        (self.failedReason != null ||
          (self.lengthInMeter != null &&
            self.competitorTime != null &&
            self.winnerTime != null &&
            self.position != null &&
            self.nofStartsInClass != null))
      );
    },
  }));
export type IRaceResult = Instance<typeof RaceResult>;
export type IRaceResultSnapshotIn = SnapshotIn<typeof RaceResult>;

export const RaceEvent = types
  .model({
    eventId: types.identifierNumber,
    eventorId: types.maybeNull(types.integer),
    eventorRaceId: types.maybeNull(types.integer),
    name: types.maybeNull(types.string),
    organiserName: types.maybeNull(types.string),
    raceDate: types.maybeNull(types.string),
    raceTime: types.maybeNull(types.string),
    sportCode: types.string,
    isRelay: types.boolean,
    eventClassificationId: types.string,
    raceLightCondition: types.maybeNull(types.string),
    raceDistance: types.maybeNull(types.string),
    paymentModel: types.integer,
    meetsAwardRequirements: types.boolean,
    results: types.array(RaceResult),
    teamResults: types.array(RaceTeamResult),
    rankingBasetimePerKilometer: types.maybeNull(types.string),
    rankingBasepoint: types.maybeNull(types.number),
    rankingBaseDescription: types.maybeNull(types.string),
    longitude: types.maybeNull(types.number),
    latitude: types.maybeNull(types.number),
    invoiceVerified: types.optional(types.boolean, false),
  })
  .actions((self) => {
    return {
      setEventClassificationId(value: EventClassificationIdTypes) {
        self.eventClassificationId = value;
      },
      setPaymentModel(value: PaymentTypes) {
        self.paymentModel = value;
      },
      setRaceDistance(value: DistanceTypes) {
        self.raceDistance = value;
      },
      setRaceLightCondition(value: LightConditionTypes) {
        self.raceLightCondition = value;
      },
      setSportCode(value: SportCodeTypes | string) {
        self.sportCode = value;
      },
      setStringValueOrNull(
        key:
          | 'name'
          | 'organiserName'
          | 'raceDate'
          | 'raceTime'
          | 'rankingBasetimePerKilometer'
          | 'rankingBaseDescription',
        value?: string | null
      ) {
        self[key] = value != null ? value : null;
      },
      setBooleanValue(key: 'isRelay' | 'meetsAwardRequirements' | 'invoiceVerified', value: boolean) {
        self[key] = value;
      },
      setNumberValueOrNull(
        key: 'eventorId' | 'eventorRaceId' | 'rankingBasepoint' | 'longitude' | 'latitude',
        value?: number | null
      ) {
        self[key] = value != null ? value : null;
      },
      addResult(result: IRaceResultSnapshotIn) {
        self.results.push(result);
      },
      removeResult(result: IRaceResultSnapshotIn) {
        self.results = cast(self.results.filter((item) => item.resultId !== result.resultId));
      },
      addTeamResult(result: IRaceTeamResultSnapshotIn) {
        self.teamResults.push(result);
      },
      removeTeamResult(result: IRaceTeamResultSnapshotIn) {
        self.teamResults = cast(self.teamResults.filter((item) => item.teamResultId !== result.teamResultId));
      },
    };
  })
  .views((self) => ({
    get valid() {
      return (
        self.name != null &&
        self.organiserName != null &&
        self.raceDate != null &&
        self.sportCode != null &&
        self.eventClassificationId != null &&
        self.paymentModel != null &&
        self.raceLightCondition != null &&
        self.raceDistance != null &&
        (self.results.length > 0 || self.teamResults.length > 0) &&
        !self.results.some((result) => !result.valid) &&
        !self.teamResults.some((result) => !result.valid)
      );
    },
    get validRanking() {
      return (
        self.name != null &&
        self.organiserName != null &&
        self.raceDate != null &&
        self.sportCode != null &&
        self.eventClassificationId != null &&
        self.paymentModel != null &&
        self.raceLightCondition != null &&
        self.raceDistance != null &&
        (self.results.length > 0 || self.teamResults.length > 0) &&
        !self.results.some((result) => !result.valid) &&
        !self.teamResults.some((result) => !result.valid) &&
        self.rankingBasetimePerKilometer != null &&
        self.rankingBasepoint != null &&
        self.rankingBaseDescription != null
      );
    },
  }));
export type IRaceEvent = Instance<typeof RaceEvent>;
export type IRaceEventSnapshotIn = SnapshotIn<typeof RaceEvent>;
