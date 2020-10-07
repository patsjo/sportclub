import { types } from "mobx-state-tree";
import moment from "moment";

const setLocalStorage = (eventSelectorWizard) => {
  const obj = {
    queryStartDate: eventSelectorWizard.queryStartDate,
    queryEndDate: eventSelectorWizard.queryEndDate,
    maxDistanceDistrict: eventSelectorWizard.maxDistanceDistrict,
    maxDistanceNearbyAndClub: eventSelectorWizard.maxDistanceNearbyAndClub
  };

  localStorage.setItem("eventSelectorWizard", JSON.stringify(obj));
};

export const getLocalStorage = () => {
  const startDate = moment().startOf("year").format("YYYY-MM-DD");
  const endDate = moment().endOf("year").format("YYYY-MM-DD");
  try {
    const eventSelectorWizardData = localStorage.getItem("eventSelectorWizard");

    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80,
      ...(eventSelectorWizardData ? JSON.parse(eventSelectorWizardData) : {})
    };
  } catch (error) {
    return {
      queryStartDate: startDate,
      queryEndDate: endDate,
      maxDistanceDistrict: 140,
      maxDistanceNearbyAndClub: 80
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
  distanceKm: types.maybeNull(types.integer)
});

export const EventSelectorWizard = types
  .model({
    queryStartDate: types.string,
    queryEndDate: types.string,
    maxDistanceDistrict: types.integer,
    maxDistanceNearbyAndClub: types.integer,
    selectedEvents: types.array(SelectedEvent)
  })
  .actions((self) => {
    return {
      setValue(key, value) {
        self[key] = value;
        setLocalStorage(self);
      }
    };
  });
