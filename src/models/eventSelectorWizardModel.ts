import { action, makeObservable, observable } from 'mobx';
import moment from 'moment';

export interface ILocalStorageEventSelectorWizard {
  queryStartDate: string;
  queryEndDate: string;
  maxDistanceDistrict: number;
  maxDistanceNearbyAndClub: number;
}
const setLocalStorage = (eventSelectorWizard: ILocalStorageEventSelectorWizard) => {
  const obj: ILocalStorageEventSelectorWizard = {
    queryStartDate: eventSelectorWizard.queryStartDate,
    queryEndDate: eventSelectorWizard.queryEndDate,
    maxDistanceDistrict: eventSelectorWizard.maxDistanceDistrict,
    maxDistanceNearbyAndClub: eventSelectorWizard.maxDistanceNearbyAndClub,
  };

  localStorage.setItem('eventSelectorWizard', JSON.stringify(obj));
};

export const getLocalStorage = (): IEventSelectorWizardProps => {
  const startDate = moment().startOf('year').format('YYYY-MM-DD');
  const endDate = moment().endOf('year').format('YYYY-MM-DD');
  try {
    const eventSelectorWizardData = localStorage.getItem('eventSelectorWizard');

    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      selectedEvents: [],
      ...(eventSelectorWizardData ? (JSON.parse(eventSelectorWizardData) as ILocalStorageEventSelectorWizard) : {}),
    };
  } catch (error) {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      selectedEvents: [],
    };
  }
};

interface ISelectedEventProps {
  calendarEventId: number;
  eventorId?: number | null;
  eventorRaceId?: number | null;
  name?: string | null;
  organiserName?: string | null;
  raceDate?: string | null;
  raceTime?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  distanceKm?: number | null;
}

interface IEventSelectorWizardProps {
  queryStartDate: string;
  queryEndDate: string;
  maxDistanceDistrict: number;
  maxDistanceNearbyAndClub: number;
  selectedEvents: ISelectedEventProps[];
}

export interface IEventSelectorWizard extends IEventSelectorWizardProps {
  setQueryStartDate: (value: string) => void;
  setQueryEndDate: (value: string) => void;
  setMaxDistanceDistrict: (value: number) => void;
  setMaxDistanceNearbyAndClub: (value: number) => void;
  setSelectedEvents: (value: ISelectedEventProps[]) => void;
}

export class EventSelectorWizard implements IEventSelectorWizard {
  queryStartDate = '';
  queryEndDate = '';
  maxDistanceDistrict = 140;
  maxDistanceNearbyAndClub = 80;
  selectedEvents: ISelectedEventProps[] = [];

  constructor(options?: Partial<IEventSelectorWizardProps>) {
    options && Object.assign(this, options);
    makeObservable(this, {
      queryStartDate: observable,
      queryEndDate: observable,
      maxDistanceDistrict: observable,
      maxDistanceNearbyAndClub: observable,
      selectedEvents: observable,
      setQueryStartDate: action,
      setQueryEndDate: action,
      setMaxDistanceDistrict: action,
      setMaxDistanceNearbyAndClub: action,
      setSelectedEvents: action,
    });
  }

  setQueryStartDate(value: string) {
    this.queryStartDate = value;
    setLocalStorage(this);
  }

  setQueryEndDate(value: string) {
    this.queryEndDate = value;
    setLocalStorage(this);
  }

  setMaxDistanceDistrict(value: number) {
    this.maxDistanceDistrict = value;
    setLocalStorage(this);
  }

  setMaxDistanceNearbyAndClub(value: number) {
    this.maxDistanceNearbyAndClub = value;
    setLocalStorage(this);
  }

  setSelectedEvents(value: ISelectedEventProps[]) {
    this.selectedEvents = [...value];
    setLocalStorage(this);
  }
}
