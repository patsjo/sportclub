import { action, computed, makeObservable, observable } from 'mobx';
import moment from 'moment';
import { IOption } from 'utils/formHelper';
import { DifficultyTypes, PaymentModelTypes, difficulties, payments } from 'utils/resultConstants';
import { ConvertSecondsWithFractionsToTime, GetSecondsWithFractionsPerKiloMeter } from 'utils/resultHelper';
import { IRaceEvent, IRaceEventProps, RaceEvent } from './resultModel';

export interface ILocalStorageRaceWizard {
  paymentModel: PaymentModelTypes;
}

const setLocalStorage = (raceWizard: IRaceWizardProps) => {
  const obj: ILocalStorageRaceWizard = {
    paymentModel: raceWizard.paymentModel,
  };

  localStorage.setItem('raceWizard', JSON.stringify(obj));
};

export const getLocalStorage = (): IRaceWizardProps => {
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
        eventExistInEventor: false,
        overwrite: false,
        queryForEventWithNoEntry: false,
        queryForCompetitorWithNoClub: false,
        selectedIsRelay: false,
        raceWinnerResults: [],
        importedIds: [],
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
      eventExistInEventor: false,
      overwrite: false,
      queryForEventWithNoEntry: false,
      queryForCompetitorWithNoClub: false,
      selectedIsRelay: false,
      raceWinnerResults: [],
      importedIds: [],
    };
  }
};

export interface IWinnerResultProps {
  id: number;
  personName: string;
  className: string;
  difficulty?: DifficultyTypes | null;
  lengthInMeter?: number | null;
  winnerTime?: string;
  secondsPerKilometer?: number;
  timePerKilometer?: string;
}

export interface IWinnerResult extends IWinnerResultProps {
  setLengthInMeter: (value: number) => void;
  setDifficulty: (value: DifficultyTypes) => void;
  setWinnerTime: (value: string) => void;
}

class WinnerResult implements IWinnerResult {
  id = -1;
  personName = '';
  className = '';
  difficulty?: DifficultyTypes;
  lengthInMeter?: number;
  winnerTime?: string;
  secondsPerKilometer?: number;
  timePerKilometer?: string;

  constructor(options: IWinnerResultProps) {
    options && Object.assign(this, options);
    makeObservable(this, {
      id: observable,
      personName: observable,
      className: observable,
      difficulty: observable,
      lengthInMeter: observable,
      winnerTime: observable,
      secondsPerKilometer: observable,
      timePerKilometer: observable,
      setLengthInMeter: action.bound,
      setDifficulty: action.bound,
      setWinnerTime: action.bound,
    });
  }

  setLengthInMeter(value: number) {
    this.lengthInMeter = value;
    this.secondsPerKilometer =
      this.winnerTime && this.lengthInMeter
        ? GetSecondsWithFractionsPerKiloMeter(this.winnerTime, this.lengthInMeter) ?? undefined
        : undefined;
    this.timePerKilometer = this.secondsPerKilometer
      ? ConvertSecondsWithFractionsToTime(this.secondsPerKilometer)
      : undefined;
  }

  setDifficulty(value: DifficultyTypes) {
    this.difficulty = value;
  }

  setWinnerTime(value: string) {
    this.winnerTime = value;
    this.secondsPerKilometer =
      this.winnerTime && this.lengthInMeter
        ? GetSecondsWithFractionsPerKiloMeter(this.winnerTime, this.lengthInMeter) ?? undefined
        : undefined;
    this.timePerKilometer = this.secondsPerKilometer
      ? ConvertSecondsWithFractionsToTime(this.secondsPerKilometer)
      : undefined;
  }
}

interface IRaceWizardProps {
  queryStartDate: string;
  queryEndDate: string;
  queryIncludeExisting: boolean;
  existInEventor: boolean;
  eventExistInEventor: boolean;
  overwrite: boolean;
  queryForEventWithNoEntry: boolean;
  queryForCompetitorWithNoClub: boolean;
  paymentModel: PaymentModelTypes;
  selectedEventId?: number;
  selectedEventorId?: number;
  selectedEventorRaceId?: number;
  selectedIsRelay: boolean;
  raceEvent?: IRaceEventProps;
  raceWinnerResults: IWinnerResultProps[];
  importedIds: number[];
}

export interface IRaceWizard extends Omit<IRaceWizardProps, 'raceEvent' | 'raceWinnerResults'> {
  raceEvent?: IRaceEvent;
  raceWinnerResults: IWinnerResult[];
  setStringValue: (key: 'queryStartDate' | 'queryEndDate', value: string) => void;
  setBooleanValue: (
    key:
      | 'queryIncludeExisting'
      | 'existInEventor'
      | 'eventExistInEventor'
      | 'overwrite'
      | 'queryForEventWithNoEntry'
      | 'queryForCompetitorWithNoClub'
      | 'selectedIsRelay',
    value: boolean
  ) => void;
  setNumberValue: (key: 'paymentModel', value: PaymentModelTypes) => void;
  setNumberValueOrNull: (
    key: 'selectedEventId' | 'selectedEventorId' | 'selectedEventorRaceId',
    value?: number | null
  ) => void;
  setRaceEvent: (value: IRaceEventProps | null) => void;
  setRaceWinnerResults: (values: IWinnerResultProps[]) => void;
  addRaceWinnerResult: (value: Omit<IWinnerResultProps, 'secondsPerKilometer' | 'timePerKilometer'>) => void;
  addImportedId: (id: number) => void;
  raceWinnerResultOptions: IOption[];
}

export class RaceWizard implements IRaceWizard {
  queryStartDate = '';
  queryEndDate = '';
  queryIncludeExisting = false;
  existInEventor = false;
  eventExistInEventor = false;
  overwrite = false;
  queryForEventWithNoEntry = false;
  queryForCompetitorWithNoClub = false;
  paymentModel: PaymentModelTypes = 0;
  selectedEventId?: number;
  selectedEventorId?: number;
  selectedEventorRaceId?: number;
  selectedIsRelay = false;
  raceEvent?: IRaceEvent;
  raceWinnerResults: IWinnerResult[] = [];
  importedIds: number[] = [];

  constructor(options: Partial<IRaceWizardProps>) {
    options && Object.assign(this, options);
    makeObservable(this, {
      queryStartDate: observable,
      queryEndDate: observable,
      queryIncludeExisting: observable,
      existInEventor: observable,
      eventExistInEventor: observable,
      overwrite: observable,
      queryForEventWithNoEntry: observable,
      queryForCompetitorWithNoClub: observable,
      selectedEventId: observable,
      selectedEventorId: observable,
      selectedEventorRaceId: observable,
      selectedIsRelay: observable,
      raceEvent: observable,
      raceWinnerResults: observable,
      importedIds: observable,
      setStringValue: action.bound,
      setBooleanValue: action.bound,
      setNumberValue: action.bound,
      setNumberValueOrNull: action.bound,
      setRaceEvent: action.bound,
      setRaceWinnerResults: action.bound,
      addRaceWinnerResult: action.bound,
      addImportedId: action.bound,
      raceWinnerResultOptions: computed,
    });
  }

  setStringValue(key: 'queryStartDate' | 'queryEndDate', value: string) {
    this[key] = value;
    setLocalStorage(this);
  }

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
    this[key] = value;
    setLocalStorage(this);
  }

  setNumberValue(key: 'paymentModel', value: PaymentModelTypes) {
    this[key] = value;
    setLocalStorage(this);
  }

  setNumberValueOrNull(key: 'selectedEventId' | 'selectedEventorId' | 'selectedEventorRaceId', value?: number | null) {
    this[key] = value != null ? value : undefined;
    setLocalStorage(this);
  }

  setRaceEvent(value: IRaceEventProps | null) {
    this.raceEvent = value == null ? undefined : new RaceEvent(value);
    setLocalStorage(this);
  }

  setRaceWinnerResults(values: IWinnerResultProps[]) {
    this.raceWinnerResults = values.map((value) => new WinnerResult(value));
    setLocalStorage(this);
  }

  addRaceWinnerResult(value: Omit<IWinnerResultProps, 'secondsPerKilometer' | 'timePerKilometer'>) {
    const newWinnerResult = new WinnerResult(value);
    value.lengthInMeter && value.winnerTime && newWinnerResult.setWinnerTime(value.winnerTime);
    this.raceWinnerResults = [...this.raceWinnerResults, newWinnerResult];
  }

  addImportedId(id: number) {
    this.importedIds = [...this.importedIds, id];
  }

  get raceWinnerResultOptions() {
    return this.raceWinnerResults
      .filter(
        (wr) => wr.difficulty && [difficulties.purple, difficulties.blue, difficulties.black].includes(wr.difficulty)
      )
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
  }
}
