import { cast, Instance, SnapshotIn, types } from 'mobx-state-tree';
import moment from 'moment';
import { ConvertSecondsWithFractionsToTime, GetSecondsWithFractionsPerKiloMeter } from 'utils/resultHelper';
import { difficulties, payments } from '../utils/resultConstants';
import { IRaceEventSnapshotIn, RaceEvent } from './resultModel';

export interface ILocalStorageRaceWizard {
  paymentModel: number;
}

const setLocalStorage = (raceWizard: IRaceWizardSnapshotIn) => {
  const obj: ILocalStorageRaceWizard = {
    paymentModel: raceWizard.paymentModel,
  };

  localStorage.setItem('raceWizard', JSON.stringify(obj));
};

export const getLocalStorage = (): IRaceWizardSnapshotIn => {
  const endDate = moment().format('YYYY-MM-DD');
  const startDate = moment().add(-30, 'days').format('YYYY-MM-DD');
  try {
    const raceWizardData = localStorage.getItem('raceWizard');

    if (!raceWizardData) {
      return {
        queryStartDate: startDate,
        queryEndDate: endDate,
        paymentModel: payments.defaultFee0And100IfNotStarted,
        queryIncludeExisting: false,
        existInEventor: true,
      };
    }

    return {
      ...JSON.parse(raceWizardData),
      queryStartDate: startDate,
      queryEndDate: endDate,
      queryIncludeExisting: false,
      existInEventor: true,
    };
  } catch (error) {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      paymentModel: payments.defaultFee0And100IfNotStarted,
      queryIncludeExisting: false,
      existInEventor: true,
    };
  }
};
const WinnerResult = types
  .model({
    id: types.identifierNumber,
    personName: types.string,
    className: types.string,
    difficulty: types.maybeNull(types.string),
    lengthInMeter: types.maybeNull(types.integer),
    winnerTime: types.maybeNull(types.string),
    secondsPerKilometer: types.maybeNull(types.number),
    timePerKilometer: types.maybeNull(types.string),
  })
  .actions((self) => {
    return {
      setLengthInMeter(value: number) {
        self.lengthInMeter = value;
        self.secondsPerKilometer =
          self.winnerTime && self.lengthInMeter
            ? GetSecondsWithFractionsPerKiloMeter(self.winnerTime, self.lengthInMeter) ?? null
            : null;
        self.timePerKilometer = self.secondsPerKilometer
          ? ConvertSecondsWithFractionsToTime(self.secondsPerKilometer)
          : null;
      },
      setDifficulty(value: string) {
        self.difficulty = value;
      },
    };
  });
export type IWinnerResultSnapshotIn = SnapshotIn<typeof WinnerResult>;

export const RaceWizard = types
  .model({
    queryStartDate: types.string,
    queryEndDate: types.string,
    queryIncludeExisting: types.boolean,
    existInEventor: types.boolean,
    eventExistInEventor: types.optional(types.boolean, false),
    overwrite: types.optional(types.boolean, false),
    queryForEventWithNoEntry: types.optional(types.boolean, false),
    queryForCompetitorWithNoClub: types.optional(types.boolean, false),
    paymentModel: types.integer,
    selectedEventId: types.maybeNull(types.integer),
    selectedEventorId: types.maybeNull(types.integer),
    selectedEventorRaceId: types.maybeNull(types.integer),
    selectedIsRelay: types.optional(types.boolean, false),
    raceEvent: types.maybeNull(RaceEvent),
    raceWinnerResults: types.array(WinnerResult),
    importedIds: types.optional(types.array(types.integer), []),
  })
  .actions((self) => {
    return {
      setStringValue(key: 'queryStartDate' | 'queryEndDate', value: string) {
        self[key] = value;
        setLocalStorage(self);
      },
      setBooleanValue(
        key:
          | 'queryIncludeExisting'
          | 'existInEventor'
          | 'eventExistInEventor'
          | 'overwrite'
          | 'queryForEventWithNoEntry'
          | 'queryForCompetitorWithNoClub'
          | 'selectedIsRelay',
        value: boolean
      ) {
        self[key] = value;
        setLocalStorage(self);
      },
      setNumberValue(key: 'paymentModel', value: number) {
        self[key] = value;
        setLocalStorage(self);
      },
      setNumberValueOrNull(
        key: 'selectedEventId' | 'selectedEventorId' | 'selectedEventorRaceId',
        value?: number | null
      ) {
        self[key] = value != null ? value : null;
        setLocalStorage(self);
      },
      setRaceEvent(value: IRaceEventSnapshotIn | null) {
        self.raceEvent = value == null ? null : cast(value);
        setLocalStorage(self);
      },
      setRaceWinnerResults(value: IWinnerResultSnapshotIn[]) {
        self.raceWinnerResults = cast(value);
        setLocalStorage(self);
      },
      addImportedId(id: number) {
        self.importedIds = cast([...self.importedIds, id]);
      },
    };
  })
  .views((self) => ({
    get raceWinnerResultOptions() {
      return self.raceWinnerResults
        .slice()
        .sort((a, b) => {
          if (a.difficulty === difficulties.black && b.difficulty !== difficulties.black) {
            return -1;
          } else if (a.difficulty !== difficulties.black && b.difficulty === difficulties.black) {
            return 1;
          }

          if (a.secondsPerKilometer && b.secondsPerKilometer && a.secondsPerKilometer < b.secondsPerKilometer) {
            return -1;
          }
          return 1;
        })
        .map((wr) => ({
          code: JSON.stringify(wr),
          description: `${wr.timePerKilometer}, ${wr.className}, ${wr.personName}`,
        }));
    },
  }));
export type IRaceWizard = Instance<typeof RaceWizard>;
type IRaceWizardSnapshotIn = SnapshotIn<typeof RaceWizard>;
