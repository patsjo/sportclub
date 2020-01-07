import { types } from "mobx-state-tree";
import { RaceEvent } from "./resultModel";
import moment from "moment";

export const difficulties = {
  green: "Grön",
  white: "Vit",
  yellow: "Gul",
  orange: "Orange",
  red: "Röd",
  purple: "Lila",
  blue: "Blå",
  black: "Svart"
};

export const failedReasons = {
  NotStarted: "EJ START",
  NotFinished: "UTGÅTT",
  Finished: "FULLFÖ",
  Approved: "GODK"
};

export const failedReasonOptions = t => [
  { code: failedReasons.NotStarted, description: t("results.NotStarted") },
  { code: failedReasons.NotFinished, description: t("results.NotFinished") },
  { code: failedReasons.Finished, description: t("results.Finished") }
];

export const payments = {
  defaultFee0And100IfNotStarted: 0,
  defaultFee0And100IfNotFinished: 1,
  defaultFee50And100IfNotFinished: 2,
  defaultFeePaidByCompetitor: 3
};

export const paymentOptions = t => [
  { code: payments.defaultFee0And100IfNotStarted, description: t("results.DefaultFee0And100IfNotStarted") },
  { code: payments.defaultFee0And100IfNotFinished, description: t("results.DefaultFee0And100IfNotFinished") },
  { code: payments.defaultFee50And100IfNotFinished, description: t("results.DefaultFee50And100IfNotFinished") },
  { code: payments.defaultFeePaidByCompetitor, description: t("results.DefaultFeePaidByCompetitor") }
];

export const raceLightConditionOptions = t => [
  { code: "Day", description: t("results.Day") },
  { code: "Night", description: t("results.Night") }
];

export const raceDistanceOptions = t => [
  { code: "Sprint", description: t("results.Sprint") },
  { code: "Middle", description: t("results.Middle") },
  { code: "Long", description: t("results.Long") },
  { code: "UltraLong", description: t("results.UltraLong") }
];

export const raceRelayDistanceOptions = t =>
  raceDistanceOptions(t).map(option => ({
    code: `Relay${option.code}`,
    description: `${option.description}${t("results.Relay")}`
  }));

const setLocalStorage = raceWizard => {
  const obj = {
    queryStartDate: raceWizard.queryStartDate,
    paymentModel: raceWizard.paymentModel
  };

  localStorage.setItem("raceWizard", JSON.stringify(obj));
};

export const getLocalStorage = () => {
  const startDate = moment()
    .startOf("year")
    .format("YYYY-MM-DD");
  const endDate = moment().format("YYYY-MM-DD");
  try {
    const raceWizardData = localStorage.getItem("raceWizard");

    if (!raceWizardData) {
      return {
        queryStartDate: startDate,
        queryEndDate: endDate,
        paymentModel: payments.defaultFee0And100IfNotStarted,
        queryIncludeExisting: false,
        existInEventor: true
      };
    }

    return { ...JSON.parse(raceWizardData), queryEndDate: endDate, queryIncludeExisting: false, existInEventor: true };
  } catch (error) {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      paymentModel: payments.defaultFee0And100IfNotStarted,
      queryIncludeExisting: false,
      existInEventor: true
    };
  }
};
const WinnerResult = types.model({
  id: types.identifierNumber,
  personName: types.string,
  className: types.string,
  difficulty: types.maybeNull(types.string),
  lengthInMeter: types.maybeNull(types.integer),
  winnerTime: types.maybeNull(types.string),
  secondsPerKilometer: types.maybeNull(types.integer),
  timePerKilometer: types.maybeNull(types.string)
});

export const RaceWizard = types
  .model({
    queryStartDate: types.string,
    queryEndDate: types.string,
    queryIncludeExisting: types.boolean,
    existInEventor: types.boolean,
    paymentModel: types.integer,
    selectedEventorId: types.maybeNull(types.integer),
    selectedEventorRaceId: types.maybeNull(types.integer),
    raceEvent: types.maybeNull(RaceEvent),
    raceWinnerResults: types.array(WinnerResult)
  })
  .actions(self => {
    return {
      setValue(key, value) {
        self[key] = value;
        setLocalStorage(self);
      }
    };
  });
