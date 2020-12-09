import { flow, types } from "mobx-state-tree";
import { PostJsonData } from "../utils/api";
import { GetAward, GetAge } from "../utils/resultHelper";
import { distances } from "../utils/resultConstants";

const RaceCompetitor = types
  .model({
    competitorId: types.identifierNumber,
    firstName: types.string,
    lastName: types.string,
    birthDay: types.string,
    gender: types.string,
    startDate: types.string,
    endDate: types.maybeNull(types.string),
    eventorCompetitorIds: types.array(types.integer)
  })
  .actions(self => {
    return {
      addEventorId: flow(function* addEventorId(url, id) {
        try {
          yield PostJsonData(
            url,
            { iType: "EVENTOR_COMPETITOR_ID", iCompetitorId: self.competitorId, iEventorCompetitorId: id },
            false
          );
          self.eventorCompetitorIds.push(id);
        } catch (error) {}
      })
    };
  })
  .views(self => ({
    get fullName() {
      return `${self.firstName} ${self.lastName}`;
    },
    get isActive() {
      return self.name !== "Eventor";
    }
  }));

const RaceClassLevel = types.model({
  classShortName: types.identifier,
  classTypeShortName: types.string,
  age: types.integer,
  difficulty: types.string
});

const RaceClassClassification = types.model({
  classClassificationId: types.identifierNumber,
  description: types.string,
  classTypeShortName: types.maybeNull(types.string),
  ageUpperLimit: types.maybeNull(types.integer),
  ageLowerLimit: types.maybeNull(types.integer),
  decreaseBasePoint: types.integer,
  decreaseBase1000Point: types.integer,
  decreaseOldBasePoint: types.integer
});

const RaceEventClassification = types.model({
  eventClassificationId: types.identifier,
  description: types.string,
  basePoint: types.integer,
  base1000Point: types.integer,
  oldBasePoint: types.integer,
  oldPositionBasePoint: types.integer,
  classClassifications: types.array(RaceClassClassification)
});

const RaceSport = types.model({
  sportCode: types.identifier,
  description: types.string
});

const RaceClub = types
  .model({
    clubId: types.identifierNumber,
    name: types.string,
    eventorOrganisationId: types.integer,
    competitors: types.array(RaceCompetitor)
  })
  .actions(self => {
    return {
      addCompetitor: flow(function* addCompetitor(url, competitor) {
        try {
          const responseJson = yield PostJsonData(url, competitor, false);
          self.competitors.push(responseJson);
          return responseJson.competitorId;
        } catch (error) {
          return undefined;
        }
      })
    };
  })
  .views(self => ({
    competitorById(id) {
      return self.competitors.find(competitor => competitor.competitorId === parseInt(id));
    },
    competitorByEventorId(id) {
      return self.competitors.find(competitor => competitor.eventorCompetitorIds.includes(parseInt(id)));
    },
    get competitorsOptions() {
      return self.competitors
        .sort((a, b) =>
          a.lastName.toLowerCase() === b.lastName.toLowerCase()
            ? a.firstName.toLowerCase() > b.firstName.toLowerCase()
              ? 1
              : -1
            : a.lastName.toLowerCase() > b.lastName.toLowerCase()
            ? 1
            : -1
        )
        .map(competitor => ({
          code: competitor.competitorId.toString(),
          description: `${competitor.fullName} (${competitor.birthDay})`
        }));
    }
  }));

export const RaceClubs = types
  .model({
    clubs: types.array(RaceClub),
    selectedClub: types.reference(RaceClub),
    eventClassifications: types.array(RaceEventClassification),
    classLevels: types.array(RaceClassLevel),
    sports: types.array(RaceSport)
  })
  .actions(self => {
    return {
      setSelectedClub(code) {
        self.selectedClub = parseInt(code);
      }
    };
  })
  .views(self => ({
    classClassification(eventClassificationId, classClassificationId) {
      const classClassification = self.eventClassifications
        .find(ec => ec.eventClassificationId === eventClassificationId)
        .classClassifications.find(cc => cc.classClassificationId === classClassificationId);
      return classClassification ? classClassification.description : null;
    },
    classClassificationOptions(eventClassificationId) {
      return self.eventClassifications
        .find(ec => ec.eventClassificationId === eventClassificationId)
        .classClassifications.map(cc => ({
          code: cc.classClassificationId.toString(),
          description: cc.description
        }));
    },
    get eventClassificationOptions() {
      return self.eventClassifications.map(ec => ({
        code: ec.eventClassificationId,
        description: ec.description
      }));
    },
    get clubOptions() {
      return self.clubs.map(club => ({
        code: club.clubId.toString(),
        description: club.name
      }));
    },
    get sportOptions() {
      return self.sports.map(sport => ({
        code: sport.sportCode,
        description: sport.description
      }));
    }
  }));

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
    serviceFeeToClub: types.optional(types.number, 0),
    serviceFeeDescription: types.maybeNull(types.string)
  })
  .actions(self => {
    return {
      setValue(key, value) {
        self[key] = value;
      }
    };
  })
  .views(self => ({
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
    }
  }));

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
  totalNofStartsInClass: types.maybeNull(types.integer)
});

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
    ranking: types.maybeNull(types.number)
  })
  .volatile(self => ({
    isAwardTouched: false
  }))
  .actions(self => {
    return {
      setValue(key, value) {
        self[key] = value;
        if (key === "award") {
          self.isAwardTouched = true;
        }
      },
      setIsAwardTouched(raceClubs, raceEvent) {
        const raceEventClassification = raceClubs.eventClassifications.find(
          ec => ec.eventClassificationId === raceEvent.eventClassificationId
        );
        const competitor = raceClubs.selectedClub.competitorById(self.competitorId);
        const age = GetAge(competitor.birthDay, raceEvent.raceDate);
        const calculatedAward = raceEvent.meetsAwardRequirements
          ? GetAward(
              raceEventClassification,
              raceClubs.classLevels,
              self,
              age,
              raceEvent.raceDistance === distances.sprint
            )
          : null;
        self.isAwardTouched =
          self.isAwardTouched || !((!calculatedAward && !self.award) || calculatedAward === self.award);
      },
      setCalculatedAward(value) {
        if (!self.isAwardTouched) {
          self.award = value;
        }
      }
    };
  })
  .views(self => ({
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
    }
  }));

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
    invoiceVerified: types.optional(types.boolean, false)
  })
  .actions(self => {
    return {
      setValue(key, value) {
        self[key] = value;
      },
      addResult(result) {
        self.results.push(result);
      },
      removeResult(result) {
        self.results = self.results.filter(item => item.resultId !== result.resultId);
      },
      addTeamResult(result) {
        self.teamResults.push(result);
      },
      removeTeamResult(result) {
        self.teamResults = self.teamResults.filter(item => item.teamResultId !== result.teamResultId);
      }
    };
  })
  .views(self => ({
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
        !self.results.some(result => !result.valid) &&
        !self.teamResults.some(result => !result.valid)
      );
    },
    get validRanking() {
      return (
        self.valid &&
        self.rankingBasetimePerKilometer != null &&
        self.rankingBasepoint != null &&
        self.rankingBaseDescription != null
      );
    }
  }));
