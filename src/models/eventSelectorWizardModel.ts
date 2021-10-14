import { cast, Instance, SnapshotIn, types } from 'mobx-state-tree';
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

export const getLocalStorage = (): IEventSelectorWizardSnapshotIn => {
  const startDate = moment().startOf('year').format('YYYY-MM-DD');
  const endDate = moment().endOf('year').format('YYYY-MM-DD');
  try {
    const eventSelectorWizardData = localStorage.getItem('eventSelectorWizard');

    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      ...(eventSelectorWizardData ? (JSON.parse(eventSelectorWizardData) as ILocalStorageEventSelectorWizard) : {}),
    };
  } catch (error) {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
    };
  }
};
const SelectedEvent = types.model({
  calendarEventId: types.identifierNumber,
  eventorId: types.maybeNull(types.integer),
  eventorRaceId: types.maybeNull(types.integer),
  name: types.maybeNull(types.string),
  organiserName: types.maybeNull(types.string),
  raceDate: types.maybeNull(types.string),
  raceTime: types.maybeNull(types.string),
  longitude: types.maybeNull(types.number),
  latitude: types.maybeNull(types.number),
  distanceKm: types.maybeNull(types.integer),
});
type ISelectedEventSnapshotIn = SnapshotIn<typeof SelectedEvent>;

export const EventSelectorWizard = types
  .model({
    queryStartDate: types.string,
    queryEndDate: types.string,
    maxDistanceDistrict: types.integer,
    maxDistanceNearbyAndClub: types.integer,
    selectedEvents: types.array(SelectedEvent),
  })
  .actions((self) => {
    return {
      setQueryStartDate(value: string) {
        self.queryStartDate = value;
        setLocalStorage(self);
      },
      setQueryEndDate(value: string) {
        self.queryEndDate = value;
        setLocalStorage(self);
      },
      setMaxDistanceDistrict(value: number) {
        self.maxDistanceDistrict = value;
        setLocalStorage(self);
      },
      setMaxDistanceNearbyAndClub(value: number) {
        self.maxDistanceNearbyAndClub = value;
        setLocalStorage(self);
      },
      setSelectedEvents(value: ISelectedEventSnapshotIn[]) {
        self.selectedEvents = cast(value);
        setLocalStorage(self);
      },
    };
  });
export type IEventSelectorWizard = Instance<typeof EventSelectorWizard>;
type IEventSelectorWizardSnapshotIn = SnapshotIn<typeof EventSelectorWizard>;
