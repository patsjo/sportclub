import { flow, types } from "mobx-state-tree";
import { PostJsonData } from "../utils/api";

const RaceCompetitor = types
  .model({
    competitorId: types.identifierNumber,
    firstName: types.string,
    lastName: types.string,
    birthDay: types.string,
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
      return self.competitors.find(competitor => competitor.competitorId === id);
    },
    competitorByEventorId(id) {
      return self.competitors.find(competitor => competitor.eventorCompetitorIds.includes(id));
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
    classLevels: types.array(RaceClassLevel)
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
      return self.eventClassifications
        .find(ec => ec.eventClassificationId === eventClassificationId)
        .classClassifications.find(cc => cc.classClassificationId === classClassificationId).description;
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
    }
  }));

const RaceTeamResult = types.model({
  teamResultId: types.identifierNumber,
  className: types.string,
  clubTeamNumber: types.integer,
  competitorId: types.reference(RaceCompetitor),
  lengthInMeter: types.maybeNull(types.integer),
  failedReason: types.maybeNull(types.string),
  competitorTime: types.maybeNull(types.string),
  winnerTime: types.maybeNull(types.string),
  secondTime: types.maybeNull(types.string),
  position: types.maybeNull(types.integer),
  nofStartsInClass: types.maybeNull(types.integer),
  stage: types.integer,
  totalStages: types.integer,
  deviantRaceLightCondition: types.maybeNull(types.string)
});

const RaceResultMultiDay = types.model({
  multiDayResultId: types.identifierNumber,
  className: types.string,
  lengthInMeter: types.maybeNull(types.integer),
  failedReason: types.maybeNull(types.string),
  competitorTime: types.maybeNull(types.string),
  winnerTime: types.maybeNull(types.string),
  secondTime: types.maybeNull(types.string),
  position: types.maybeNull(types.integer),
  nofStartsInClass: types.maybeNull(types.integer),
  stage: types.integer,
  totalStages: types.integer
});

const RaceResult = types
  .model({
    resultId: types.identifierNumber,
    competitorId: types.integer,
    resultMultiDay: types.maybeNull(RaceResultMultiDay),
    teamResult: types.maybeNull(RaceTeamResult),
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
    award: types.maybeNull(types.string),
    points: types.maybeNull(types.integer),
    pointsOld: types.maybeNull(types.integer),
    points1000: types.maybeNull(types.integer)
  })
  .actions(self => {
    return {
      setValue(key, value) {
        self[key] = value;
      }
    };
  });

export const RaceEvent = types
  .model({
    eventId: types.identifierNumber,
    eventorId: types.integer,
    eventorRaceId: types.integer,
    name: types.string,
    organiserName: types.maybeNull(types.string),
    raceDate: types.string,
    raceTime: types.maybeNull(types.string),
    eventClassificationId: types.string,
    raceLightCondition: types.maybeNull(types.string),
    raceDistance: types.maybeNull(types.string),
    paymentModel: types.integer,
    results: types.array(RaceResult)
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
      save: flow(function* save(url) {
        try {
          yield PostJsonData(url, self.getSnapshot(), false);
          return true;
        } catch (error) {
          return error;
        }
      })
    };
  });
