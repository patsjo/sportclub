import React from "react";
import { Spin } from "antd";
import styled from "styled-components";
import { dashboardContents } from "../../models/globalStateModel";
import { GetJsonData } from "../../utils/api";
import EventRace from "./EventRace";

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const flatten = list => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const useEventorEntries = (globalStateModel, clubModel, dashboardContentId) => {
  const [loaded, setLoaded] = React.useState(false);
  const [events, setEvents] = React.useState([]);

  React.useEffect(() => {
    if (dashboardContentId !== dashboardContents.home) {
      return;
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let prevWeek = new Date(today.valueOf());
    let nextWeek = new Date(today.valueOf());
    let nextMonths = new Date(today.valueOf());
    prevWeek.setDate(prevWeek.getDate() - ([0, 1, 2, 11].includes(today.getMonth()) ? 31 : 7));
    nextWeek.setDate(nextWeek.getDate() + ([0, 1, 10, 11].includes(today.getMonth()) ? 31 : 7));
    nextMonths.setDate(nextMonths.getDate() + 60);
    const fromDate = prevWeek.toISOString().substr(0, 10);
    const toDate = nextWeek.toISOString().substr(0, 10);
    const toOringenDate = nextMonths.toISOString().substr(0, 10);
    const entriesPromise = GetJsonData(
      clubModel.corsProxy +
        encodeURIComponent(
          clubModel.eventor.entriesUrl +
            "?organisationIds=" +
            clubModel.eventor.organisationId +
            "&fromEventDate=" +
            fromDate +
            "&toEventDate=" +
            toDate +
            "&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true"
        ) +
        "&headers=" +
        encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
      false
    );
    const oringenEventsPromise = GetJsonData(
      clubModel.corsProxy +
        encodeURIComponent(
          clubModel.eventor.eventsUrl +
            "?organisationIds=" +
            clubModel.eventor.oRingenOrganisationId +
            "&fromDate=" +
            fromDate +
            "&toDate=" +
            toOringenDate +
            "&includeAttributes=true"
        ) +
        "&headers=" +
        encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
      false
    );
    Promise.all([entriesPromise, oringenEventsPromise]).then(([entriesJson, oringenEventsJson]) => {
      // eslint-disable-next-line eqeqeq
      if (entriesJson == undefined || entriesJson.Entry == undefined) {
        entriesJson = { Entry: [] };
      } else if (!Array.isArray(entriesJson.Entry)) {
        entriesJson.Entry = [entriesJson.Entry];
      }
      // eslint-disable-next-line eqeqeq
      if (oringenEventsJson == undefined || oringenEventsJson.Event == undefined) {
        oringenEventsJson = { Event: [] };
      } else if (!Array.isArray(oringenEventsJson.Event)) {
        oringenEventsJson.Event = [oringenEventsJson.Event];
      }
      entriesJson.Entry.forEach(entry => {
        if (Array.isArray(entry.Event.EventRace)) {
          entry.EventRaceId = entry.Event.EventRace.map(eventRace => eventRace.EventRaceId);
        } else {
          entry.EventRaceId = entry.Event.EventRace.EventRaceId;
        }
      });
      let events = [
        ...new Set([
          ...flatten(entriesJson.Entry.map(entry => entry.EventRaceId)),
          ...flatten(oringenEventsJson.Event.map(event => event.EventRace)).map(eventRace => eventRace.EventRaceId)
        ])
      ]
        // eslint-disable-next-line eqeqeq
        .filter(eventRaceId => eventRaceId != undefined)
        .map(eventRaceId => {
          return { EventRaceId: eventRaceId };
        });
      events.forEach(event => {
        let entry = entriesJson.Entry.find(e =>
          Array.isArray(e.EventRaceId) ? e.EventRaceId.includes(event.EventRaceId) : e.EventRaceId === event.EventRaceId
        );
        // eslint-disable-next-line eqeqeq
        if (entry == undefined) {
          entry = {
            Event: oringenEventsJson.Event.find(e =>
              Array.isArray(e.EventRace)
                ? e.EventRace.map(er => er.EventRaceId).includes(event.EventRaceId)
                : e.EventRace.EventRaceId === event.EventRaceId
            )
          };
        }
        event.Event = {
          ...entry.Event
        };
        if (Array.isArray(event.Event.EventRace)) {
          event.Event.EventRace = event.Event.EventRace.find(eventRace => eventRace.EventRaceId === event.EventRaceId);
          event.Event.Name = event.Event.Name + ", " + event.Event.EventRace.Name;
        }
        event.Competitors = entriesJson.Entry.filter(
          entry =>
            // eslint-disable-next-line eqeqeq
            entry.Competitor != undefined &&
            // eslint-disable-next-line eqeqeq
            entry.Competitor.Person != undefined &&
            (Array.isArray(entry.EventRaceId)
              ? entry.EventRaceId.includes(event.EventRaceId)
              : entry.EventRaceId === event.EventRaceId)
        ).map(entry => {
          return {
            ...entry.Competitor,
            EntryId: entry.EntryId,
            EntryClass: entry.EntryClass
          };
        });
      });
      // EventStatusId:
      // 1 Applied
      // 2 ApprovedByRegion
      // 3 Approved
      // 4 Created
      // 5 EntryOpened
      // 6 EntryPaused
      // 7 EntryClosed
      // 8 Live
      // 9 Completed
      // 10 Canceled
      // 11 Reported
      events = events.filter(event => ["5", "6", "7", "8", "9", "11"].includes(event.Event.EventStatusId));
      events = events.sort((a, b) =>
        a.Event.EventRace.RaceDate.Date > b.Event.EventRace.RaceDate.Date
          ? 1
          : a.Event.EventRace.RaceDate.Date < b.Event.EventRace.RaceDate.Date
          ? -1
          : 0
      );
      const graphics = events
        .filter(
          event => event.Event.EventRace.EventCenterPosition && event.Event.EventRace.EventCenterPosition["@attributes"]
        )
        .map(event => ({
          geometry: {
            longitude: parseFloat(event.Event.EventRace.EventCenterPosition["@attributes"].x),
            latitude: parseFloat(event.Event.EventRace.EventCenterPosition["@attributes"].y)
          },
          attributes: {
            type: "event",
            name: event.Event.Name,
            time:
              event.Event.EventRace.RaceDate.Date +
              (event.Event.EventRace.RaceDate.Clock === "00:00:00"
                ? ""
                : ` ${event.Event.EventRace.RaceDate.Clock.substring(0, 5)}`)
          }
        }));
      globalStateModel.setGraphics("event", graphics);
      setLoaded(true);
      setEvents(events);

      return () => {
        setLoaded(false);
        setEvents([]);
      };
    });
  }, [dashboardContentId]);

  const Items = loaded
    ? events.map((event, index) => (
        <EventRace
          key={"entryObject#" + index}
          header={event.Event.Name}
          date={event.Event.EventRace.RaceDate.Date}
          eventObject={event}
        />
      ))
    : [
        <SpinnerDiv key="entryObject#spinner">
          <Spin size="large" />
        </SpinnerDiv>
      ];
  return Items;
};

export default useEventorEntries;
