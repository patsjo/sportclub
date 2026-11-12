import dayjs from 'dayjs';
import { ICupRaceForEventProps } from './cupModel';
import { actionBound, computed, makeObservable, observable } from 'mobx';
import { IOption } from '../utils/formHelper';
import { DifficultyTypes, PaymentModelTypes, difficulties, payments } from '../utils/resultConstants';
import { ConvertSecondsWithFractionsToTime, GetSecondsWithFractionsPerKiloMeter } from '../utils/resultHelper';
import { IRaceEvent, IRaceEventProps, RaceEvent } from './resultModel';

export interface ILocalStorageRaceWizard {
  paymentModel: PaymentModelTypes;
}

const setLocalStorage = (raceWizard: IRaceWizardProps) => {
  const obj: ILocalStorageRaceWizard = {
    paymentModel: raceWizard.paymentModel
  };

  localStorage.setItem('raceWizard', JSON.stringify(obj));
};

export const getLocalStorage = (): IRaceWizardProps => {
  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().add(-30, 'days').format('YYYY-MM-DD');
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
        autoComplete: false,
        queryForEventWithNoEntry: false,
        queryForCompetitorWithNoClub: false,
        selectedIsRelay: false,
        raceWinnerResults: [],
        importedIds: []
      };
    }

    return {
      ...JSON.parse(raceWizardData),
      queryStartDate: startDate,
      queryEndDate: endDate,
      queryIncludeExisting: false,
      existInEventor: true
    };
  } catch {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      paymentModel: payments.defaultFee0And100IfNotStarted,
      queryIncludeExisting: false,
      existInEventor: true,
      eventExistInEventor: false,
      overwrite: false,
      autoComplete: false,
      queryForEventWithNoEntry: false,
      queryForCompetitorWithNoClub: false,
      selectedIsRelay: false,
      raceWinnerResults: [],
      importedIds: []
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

const IsRankingDifficulty = (difficulty?: DifficultyTypes | null) =>
  !!difficulty && [difficulties.purple, difficulties.blue, difficulties.black].includes(difficulty);

/** A winner to choose the ranking by, it can only be chosen when the speed is known (the length of the course) */
export interface IWinnerResultOption extends IOption {
  disabled: boolean;
}

/** "00:04:35.123, H21E, Anna Andersson, 7,2 km", the winner time instead of the speed when the length is missing */
export const WinnerResultOption = (wr: IWinnerResultProps): IWinnerResultOption => ({
  code: JSON.stringify(wr),
  description: [
    wr.timePerKilometer,
    wr.className,
    wr.personName,
    wr.lengthInMeter ? `${(wr.lengthInMeter / 1000).toFixed(1).replace('.', ',')} km` : undefined,
    !wr.timePerKilometer ? wr.winnerTime : undefined
  ]
    .filter(part => part)
    .join(', '),
  disabled: !wr.timePerKilometer
});

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
    if (options) Object.assign(this, options);
    makeObservable(this, {
      id: observable,
      personName: observable,
      className: observable,
      difficulty: observable,
      lengthInMeter: observable,
      winnerTime: observable,
      secondsPerKilometer: observable,
      timePerKilometer: observable,
      setLengthInMeter: actionBound,
      setDifficulty: actionBound,
      setWinnerTime: actionBound
    });
  }

  setLengthInMeter(value: number) {
    this.lengthInMeter = value;
    this.secondsPerKilometer =
      this.winnerTime && this.lengthInMeter
        ? (GetSecondsWithFractionsPerKiloMeter(this.winnerTime, this.lengthInMeter) ?? undefined)
        : undefined;
    this.timePerKilometer = this.secondsPerKilometer
      ? ConvertSecondsWithFractionsToTime(this.secondsPerKilometer)
      : undefined;
  }

  setDifficulty(value: DifficultyTypes) {
    this.difficulty = value;
  }

  setWinnerTime(value: string) {
    // Another time than the one of the winner, who won it is not known
    if (value !== this.winnerTime) this.personName = '';
    this.winnerTime = value;
    this.secondsPerKilometer =
      this.winnerTime && this.lengthInMeter
        ? (GetSecondsWithFractionsPerKiloMeter(this.winnerTime, this.lengthInMeter) ?? undefined)
        : undefined;
    this.timePerKilometer = this.secondsPerKilometer
      ? ConvertSecondsWithFractionsToTime(this.secondsPerKilometer)
      : undefined;
  }
}

export interface IRaceWizardProps {
  queryStartDate: string;
  queryEndDate: string;
  queryIncludeExisting: boolean;
  existInEventor: boolean;
  eventExistInEventor: boolean;
  overwrite: boolean;
  /** The saved race is kept, the values it misses are taken from the result list and the missing times calculated again */
  autoComplete: boolean;
  queryForEventWithNoEntry: boolean;
  queryForCompetitorWithNoClub: boolean;
  paymentModel: PaymentModelTypes;
  selectedEventId?: number;
  selectedEventorId?: number;
  selectedEventorRaceId?: number;
  selectedIsRelay: boolean;
  raceEvent?: IRaceEventProps;
  raceWinnerResults: IWinnerResultProps[];
  importedIds: { eventId: number; eventorRaceId?: number; prevEventId?: number }[];
  /** The cup races the race is linked to, undefined = keep the links the race already has */
  cupRaceIds?: number[];
  /** The cup races the race can be linked to */
  cupRacesForEvent?: ICupRaceForEventProps[];
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
      | 'autoComplete'
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
  addImportedRace: (event: IRaceEventProps, prevEventId: number | undefined) => void;
  removeImportedRace: (eventId: number) => void;
  setCupRaceIds: (cupRaceIds: number[] | undefined) => void;
  setCupRacesForEvent: (cupRaces: ICupRaceForEventProps[] | undefined) => void;
  raceWinnerResultOptions: IWinnerResultOption[];
  otherRaceWinnerResultOptions: IWinnerResultOption[];
}

export class RaceWizard implements IRaceWizard {
  queryStartDate = '';
  queryEndDate = '';
  queryIncludeExisting = false;
  existInEventor = false;
  eventExistInEventor = false;
  overwrite = false;
  autoComplete = false;
  queryForEventWithNoEntry = false;
  queryForCompetitorWithNoClub = false;
  paymentModel: PaymentModelTypes = 0;
  selectedEventId?: number;
  selectedEventorId?: number;
  selectedEventorRaceId?: number;
  selectedIsRelay = false;
  raceEvent?: IRaceEvent;
  raceWinnerResults: IWinnerResult[] = [];
  importedIds: { eventId: number; eventorRaceId?: number; prevEventId?: number }[] = [];
  cupRaceIds?: number[];
  cupRacesForEvent?: ICupRaceForEventProps[];

  constructor(options: Partial<IRaceWizardProps>) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      queryStartDate: observable,
      queryEndDate: observable,
      queryIncludeExisting: observable,
      existInEventor: observable,
      eventExistInEventor: observable,
      overwrite: observable,
      autoComplete: observable,
      queryForEventWithNoEntry: observable,
      queryForCompetitorWithNoClub: observable,
      selectedEventId: observable,
      selectedEventorId: observable,
      selectedEventorRaceId: observable,
      selectedIsRelay: observable,
      raceEvent: observable,
      raceWinnerResults: observable,
      importedIds: observable,
      cupRaceIds: observable,
      setCupRaceIds: actionBound,
      cupRacesForEvent: observable,
      setCupRacesForEvent: actionBound,
      setStringValue: actionBound,
      setBooleanValue: actionBound,
      setNumberValue: actionBound,
      setNumberValueOrNull: actionBound,
      setRaceEvent: actionBound,
      setRaceWinnerResults: actionBound,
      addRaceWinnerResult: actionBound,
      addImportedRace: actionBound,
      removeImportedRace: actionBound,
      raceWinnerResultOptions: computed,
      otherRaceWinnerResultOptions: computed
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
      | 'autoComplete'
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
    this.cupRaceIds = undefined;
    this.cupRacesForEvent = undefined;
    setLocalStorage(this);
  }

  setRaceWinnerResults(values: IWinnerResultProps[]) {
    this.raceWinnerResults = values.map(value => new WinnerResult(value));
    setLocalStorage(this);
  }

  addRaceWinnerResult(value: Omit<IWinnerResultProps, 'secondsPerKilometer' | 'timePerKilometer'>) {
    const newWinnerResult = new WinnerResult(value);
    if (value.lengthInMeter && value.winnerTime) newWinnerResult.setWinnerTime(value.winnerTime);
    this.raceWinnerResults = [...this.raceWinnerResults, newWinnerResult];
  }

  addImportedRace(event: IRaceEventProps, prevEventId: number | undefined) {
    this.importedIds = [
      ...this.importedIds,
      { eventId: event.eventId, eventorRaceId: event.eventorRaceId ?? undefined, prevEventId }
    ];
  }

  /** A saved race that is deleted, is no longer imported */
  removeImportedRace(eventId: number) {
    this.importedIds = this.importedIds.filter(imp => imp.eventId !== eventId && imp.prevEventId !== eventId);
  }

  setCupRaceIds(cupRaceIds: number[] | undefined) {
    this.cupRaceIds = cupRaceIds;
  }

  setCupRacesForEvent(cupRaces: ICupRaceForEventProps[] | undefined) {
    this.cupRacesForEvent = cupRaces;
  }

  /** The winners of the purple, blue and black classes, the base of the ranking: black first, then the fastest */
  get raceWinnerResultOptions(): IWinnerResultOption[] {
    return this.raceWinnerResults
      .filter(wr => IsRankingDifficulty(wr.difficulty))
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
      .map(WinnerResultOption);
  }

  /**
   * The winners of all other classes, by the name of the class. A race of another source than Eventor (e.g. WinSplits
   * abroad) has class names the club has no level for ("Men Elite", "M21E"), its winners are here.
   */
  get otherRaceWinnerResultOptions(): IWinnerResultOption[] {
    return this.raceWinnerResults
      .filter(wr => !IsRankingDifficulty(wr.difficulty))
      .sort((a, b) => a.className.localeCompare(b.className, 'sv', { numeric: true }))
      .map(WinnerResultOption);
  }
}
