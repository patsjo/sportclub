import dayjs from 'dayjs';
import { action, makeObservable, observable } from 'mobx';
import { IEventorProps } from './mobxClubModel';

export interface ILocalStorageEventSelectorWizard {
  queryStartDate: string;
  queryEndDate: string;
  maxDistanceNational: number | null;
  maxDistanceDistrict: number | null;
  maxDistanceNearbyAndClub: number | null;
  parentOrganisationIdsNational: string[];
  parentOrganisationIdsDistrict: string[];
  organisationIdsNearbyAndClub: string[];
}
const setLocalStorage = (eventSelectorWizard: ILocalStorageEventSelectorWizard) => {
  const obj: ILocalStorageEventSelectorWizard = {
    queryStartDate: eventSelectorWizard.queryStartDate,
    queryEndDate: eventSelectorWizard.queryEndDate,
    maxDistanceNational: eventSelectorWizard.maxDistanceNational,
    maxDistanceDistrict: eventSelectorWizard.maxDistanceDistrict,
    maxDistanceNearbyAndClub: eventSelectorWizard.maxDistanceNearbyAndClub,
    parentOrganisationIdsNational: eventSelectorWizard.parentOrganisationIdsNational,
    parentOrganisationIdsDistrict: eventSelectorWizard.parentOrganisationIdsDistrict,
    organisationIdsNearbyAndClub: eventSelectorWizard.organisationIdsNearbyAndClub
  };

  localStorage.setItem('eventSelectorWizard', JSON.stringify(obj));
};

export const getLocalStorage = (
  clubEventorDefault: IEventorProps | undefined
): Omit<IEventSelectorWizardProps, 'eventorIds'> => {
  const startDate = dayjs().format('YYYY-MM-DD');
  const endDate = dayjs().add(2, 'months').endOf('month').format('YYYY-MM-DD');
  try {
    const eventSelectorWizardData = localStorage.getItem('eventSelectorWizard');
    const eventSelectorWizardJson = eventSelectorWizardData
      ? (JSON.parse(eventSelectorWizardData) as ILocalStorageEventSelectorWizard)
      : ({} as Partial<ILocalStorageEventSelectorWizard>);

    return {
      maxDistanceNational: null,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      selectedEvents: [],
      ...eventSelectorWizardJson,
      parentOrganisationIdsNational:
        eventSelectorWizardJson.parentOrganisationIdsNational ??
        clubEventorDefault?.defaultParentOrganisationIdsNational ??
        [],
      parentOrganisationIdsDistrict:
        eventSelectorWizardJson.parentOrganisationIdsDistrict ??
        clubEventorDefault?.defaultParentOrganisationIdsDistrict ??
        [],
      organisationIdsNearbyAndClub:
        eventSelectorWizardJson.organisationIdsNearbyAndClub ??
        clubEventorDefault?.defaultOrganisationIdsNearbyAndClub ??
        [],
      queryStartDate: startDate,
      queryEndDate: endDate
    };
  } catch {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceNational: null,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      parentOrganisationIdsNational: clubEventorDefault?.defaultParentOrganisationIdsNational ?? [],
      parentOrganisationIdsDistrict: clubEventorDefault?.defaultParentOrganisationIdsDistrict ?? [],
      organisationIdsNearbyAndClub: clubEventorDefault?.defaultOrganisationIdsNearbyAndClub ?? [],
      selectedEvents: []
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
  parentOrganisationIdsNational: string[];
  parentOrganisationIdsDistrict: string[];
  organisationIdsNearbyAndClub: string[];
  eventorIds: string[];
  selectedEvents: ISelectedEventProps[];
}

export interface IEventSelectorWizard extends IEventSelectorWizardProps {
  setQueryStartDate: (value: string) => void;
  setQueryEndDate: (value: string) => void;
  setMaxDistanceNational: (value: number | null) => void;
  setMaxDistanceDistrict: (value: number | null) => void;
  setMaxDistanceNearbyAndClub: (value: number | null) => void;
  setParentOrganisationIdsNational: (value: string[]) => void;
  setParentOrganisationIdsDistrict: (value: string[]) => void;
  setOrganisationIdsNearbyAndClub: (value: string[]) => void;
  setEventorIds: (value: string[]) => void;
  setSelectedEvents: (value: ISelectedEventProps[]) => void;
}

export class EventSelectorWizard implements IEventSelectorWizard {
  queryStartDate = '';
  queryEndDate = '';
  maxDistanceNational: number | null = null;
  maxDistanceDistrict: number | null = 140;
  maxDistanceNearbyAndClub: number | null = 80;
  parentOrganisationIdsNational: string[] = [];
  parentOrganisationIdsDistrict: string[] = [];
  organisationIdsNearbyAndClub: string[] = [];
  eventorIds: string[] = [];
  selectedEvents: ISelectedEventProps[] = [];

  constructor(options?: Partial<IEventSelectorWizardProps>) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      queryStartDate: observable,
      queryEndDate: observable,
      maxDistanceNational: observable,
      maxDistanceDistrict: observable,
      maxDistanceNearbyAndClub: observable,
      selectedEvents: observable,
      parentOrganisationIdsNational: observable,
      parentOrganisationIdsDistrict: observable,
      organisationIdsNearbyAndClub: observable,
      eventorIds: observable,
      setQueryStartDate: action.bound,
      setQueryEndDate: action.bound,
      setMaxDistanceNational: action.bound,
      setMaxDistanceDistrict: action.bound,
      setMaxDistanceNearbyAndClub: action.bound,
      setParentOrganisationIdsNational: action.bound,
      setParentOrganisationIdsDistrict: action.bound,
      setOrganisationIdsNearbyAndClub: action.bound,
      setEventorIds: action.bound,
      setSelectedEvents: action.bound
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

  setParentOrganisationIdsNational(value: string[]) {
    this.parentOrganisationIdsNational = [...value];
    setLocalStorage(this);
  }

  setParentOrganisationIdsDistrict(value: string[]) {
    this.parentOrganisationIdsDistrict = [...value];
    setLocalStorage(this);
  }

  setOrganisationIdsNearbyAndClub(value: string[]) {
    this.organisationIdsNearbyAndClub = [...value];
    setLocalStorage(this);
  }

  setEventorIds(value: string[]) {
    this.eventorIds = [...value];
  }

  setSelectedEvents(value: ISelectedEventProps[]) {
    this.selectedEvents = [...value];
  }
}
