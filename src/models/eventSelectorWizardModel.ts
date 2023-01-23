import { action, makeObservable, observable } from 'mobx';
import moment from 'moment';

export interface ILocalStorageEventSelectorWizard {
  queryStartDate: string;
  queryEndDate: string;
  maxDistanceNational: number | null;
  maxDistanceDistrict: number | null;
  maxDistanceNearbyAndClub: number | null;
}
const setLocalStorage = (eventSelectorWizard: ILocalStorageEventSelectorWizard) => {
  const obj: ILocalStorageEventSelectorWizard = {
    queryStartDate: eventSelectorWizard.queryStartDate,
    queryEndDate: eventSelectorWizard.queryEndDate,
    maxDistanceNational: eventSelectorWizard.maxDistanceNational,
    maxDistanceDistrict: eventSelectorWizard.maxDistanceDistrict,
    maxDistanceNearbyAndClub: eventSelectorWizard.maxDistanceNearbyAndClub,
  };

  localStorage.setItem('eventSelectorWizard', JSON.stringify(obj));
};

export const getLocalStorage = (): IEventSelectorWizardProps => {
  const startDate = moment().format('YYYY-MM-DD');
  const endDate = moment().add(2, 'months').endOf('month').format('YYYY-MM-DD');
  try {
    const eventSelectorWizardData = localStorage.getItem('eventSelectorWizard');

    return {
      maxDistanceNational: null,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      selectedEvents: [],
      ...(eventSelectorWizardData ? (JSON.parse(eventSelectorWizardData) as ILocalStorageEventSelectorWizard) : {}),
      queryStartDate: startDate,
      queryEndDate: endDate,
    };
  } catch (error) {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceNational: null,
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
  maxDistanceNational: number | null;
  maxDistanceDistrict: number | null;
  maxDistanceNearbyAndClub: number | null;
  selectedEvents: ISelectedEventProps[];
}

export interface IEventSelectorWizard extends IEventSelectorWizardProps {
  setQueryStartDate: (value: string) => void;
  setQueryEndDate: (value: string) => void;
  setMaxDistanceNational: (value: number | null) => void;
  setMaxDistanceDistrict: (value: number | null) => void;
  setMaxDistanceNearbyAndClub: (value: number | null) => void;
  setSelectedEvents: (value: ISelectedEventProps[]) => void;
}

export class EventSelectorWizard implements IEventSelectorWizard {
  queryStartDate = '';
  queryEndDate = '';
  maxDistanceNational: number | null = null;
  maxDistanceDistrict: number | null = 140;
  maxDistanceNearbyAndClub: number | null = 80;
  selectedEvents: ISelectedEventProps[] = [];

  constructor(options?: Partial<IEventSelectorWizardProps>) {
    options && Object.assign(this, options);
    makeObservable(this, {
      queryStartDate: observable,
      queryEndDate: observable,
      maxDistanceNational: observable,
      maxDistanceDistrict: observable,
      maxDistanceNearbyAndClub: observable,
      selectedEvents: observable,
      setQueryStartDate: action,
      setQueryEndDate: action,
      setMaxDistanceNational: action,
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

  setMaxDistanceNational(value: number | null) {
    this.maxDistanceNational = value;
    setLocalStorage(this);
  }

  setMaxDistanceDistrict(value: number | null) {
    this.maxDistanceDistrict = value;
    setLocalStorage(this);
  }

  setMaxDistanceNearbyAndClub(value: number | null) {
    this.maxDistanceNearbyAndClub = value;
    setLocalStorage(this);
  }

  setSelectedEvents(value: ISelectedEventProps[]) {
    this.selectedEvents = [...value];
    setLocalStorage(this);
  }
}
