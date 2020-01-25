import { types } from "mobx-state-tree";
import { RaceEvent } from "./resultModel";
import moment from "moment";
import { payments, difficulties } from "../utils/resultConstants";

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
    overwrite: types.optional(types.boolean, false),
    paymentModel: types.integer,
    selectedEventId: types.maybeNull(types.integer),
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
  })
  .views(self => ({
    get raceWinnerResultOptions() {
      return self.raceWinnerResults
        .sort((a, b) => {
          if (a.difficulty === difficulties.black && b.difficulty !== difficulties.black) {
            return -1;
          } else if (a.difficulty !== difficulties.black && b.difficulty === difficulties.black) {
            return 1;
          }

          if (a.secondsPerKilometer < b.secondsPerKilometer) {
            return -1;
          }
          return 1;
        })
        .map(wr => ({
          code: JSON.stringify(wr),
          description: `${wr.timePerKilometer}, ${wr.className}, ${wr.personName}`
        }));
    }
  }));
