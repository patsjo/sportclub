import React from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';
import { GetJsonData, PostJsonData } from '../../utils/api';
import EventRace from './EventRace';
import { useLocation } from 'react-router-dom';

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const useEventorEntries = (clubModel) => {
  const [loaded, setLoaded] = React.useState(false);
  const [events, setEvents] = React.useState([]);
  let location = useLocation();

  React.useEffect(() => {
    if (location.pathname != '/') {
      return;
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let prevMonth = new Date(today.valueOf());
    let prevWeek = new Date(today.valueOf());
    let nextWeek = new Date(today.valueOf());
    let nextMonths = new Date(today.valueOf());
    prevMonth.setDate(prevWeek.getDate() - 60);
    prevWeek.setDate(prevWeek.getDate() - 10);
    nextWeek.setDate(nextWeek.getDate() + 4);
    nextMonths.setDate(nextMonths.getDate() + 20);
    const fromDate = prevWeek.toISOString().substr(0, 10);
    const toDate = nextWeek.toISOString().substr(0, 10);
    const toOringenDate = nextMonths.toISOString().substr(0, 10);
    const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
    const queryData = {
      iType: 'EVENTS',
      iEventorOrganisationId: clubModel.eventor.organisationId,
      iFromDate: prevMonth.toISOString().substr(0, 10),
      iToDate: toDate,
    };
    const alreadySavedEventsPromise = PostJsonData(url, queryData, true);
    const entriesPromise = PostJsonData(
      clubModel.corsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor.entriesUrl +
            '?organisationIds=' +
            clubModel.eventor.organisationId +
            '&fromEventDate=' +
            fromDate +
            '&toEventDate=' +
            toDate +
            '&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true'
        ),
        cache: true,
      },
      false
    );
    const oringenEventsPromise = PostJsonData(
      clubModel.corsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor.eventsUrl +
            '?organisationIds=' +
            clubModel.eventor.oRingenOrganisationId +
            '&fromDate=' +
            fromDate +
            '&toDate=' +
            toOringenDate +
            '&includeAttributes=true'
        ),
        cache: true,
      },
      false
    );
    Promise.all([alreadySavedEventsPromise, entriesPromise, oringenEventsPromise]).then(
      ([alreadySavedEventsJson, entriesJson, oringenEventsJson]) => {
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
        entriesJson.Entry.forEach((entry) => {
          if (Array.isArray(entry.Event.EventRace)) {
            entry.EventRaceId = entry.Event.EventRace.map((eventRace) => eventRace.EventRaceId);
          } else {
            entry.EventRaceId = entry.Event.EventRace.EventRaceId;
          }
        });
        let events = [
          ...new Set([
            ...flatten(entriesJson.Entry.map((entry) => entry.EventRaceId)),
            ...flatten(oringenEventsJson.Event.map((event) => event.EventRace)).map(
              (eventRace) => eventRace.EventRaceId
            ),
          ]),
        ]
          // eslint-disable-next-line eqeqeq
          .filter((eventRaceId) => eventRaceId != undefined)
          .map((eventRaceId) => {
            return { EventRaceId: eventRaceId };
          });
        events.forEach((event) => {
          let entry = entriesJson.Entry.find((e) =>
            Array.isArray(e.EventRaceId)
              ? e.EventRaceId.includes(event.EventRaceId)
              : e.EventRaceId === event.EventRaceId
          );
          // eslint-disable-next-line eqeqeq
          if (entry == undefined) {
            entry = {
              Event: oringenEventsJson.Event.find((e) =>
                Array.isArray(e.EventRace)
                  ? e.EventRace.map((er) => er.EventRaceId).includes(event.EventRaceId)
                  : e.EventRace.EventRaceId === event.EventRaceId
              ),
            };
          }
          event.Event = {
            ...entry.Event,
          };
          if (Array.isArray(event.Event.EventRace)) {
            event.Event.EventRace = event.Event.EventRace.find(
              (eventRace) => eventRace.EventRaceId === event.EventRaceId
            );
            event.Event.Name = event.Event.Name + ', ' + event.Event.EventRace.Name;
          }
          event.Competitors = entriesJson.Entry.filter(
            (entry) =>
              // eslint-disable-next-line eqeqeq
              entry.Competitor != undefined &&
              // eslint-disable-next-line eqeqeq
              entry.Competitor.Person != undefined &&
              (Array.isArray(entry.EventRaceId)
                ? entry.EventRaceId.includes(event.EventRaceId)
                : entry.EventRaceId === event.EventRaceId)
          ).map((entry) => {
            return {
              ...entry.Competitor,
              EntryId: entry.EntryId,
              EntryClass: entry.EntryClass,
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
        events = events
          .filter((event) => ['5', '6', '7', '8', '9', '11'].includes(event.Event.EventStatusId))
          .map((event) => {
            const savedEvent = alreadySavedEventsJson.find(
              (saved) => '' + saved.eventorRaceId === '' + event.EventRaceId
            );
            return {
              eventorId: event.Event.EventId,
              eventorRaceId: event.EventRaceId,
              date: event.Event.EventRace.RaceDate.Date,
              name: event.Event.Name,
              statusId: event.Event.EventStatusId,
              ...savedEvent,
            };
          });
        let savedEvents = alreadySavedEventsJson.filter(
          (savedEvent) => !events.some((event) => event.eventId === savedEvent.eventId)
        );
        const eventsToShow = savedEvents
          .filter((savedEvent) => fromDate <= savedEvent.date && savedEvent.date <= toDate)
          .map((event) => ({ ...event, statusId: 9 }));
        events = [...events, ...eventsToShow];
        savedEvents = savedEvents.filter(
          (savedEvent) => !eventsToShow.some((event) => event.eventId === savedEvent.eventId)
        );
        if (events.length < 5) {
          savedEvents = savedEvents
            .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
            .slice(0, 5 - events.length)
            .map((event) => ({ ...event, statusId: 9 }));
          events = [...events, ...savedEvents];
        }
        events = events.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
        setEvents(events);
        setLoaded(true);

        return () => {
          setLoaded(false);
          setEvents([]);
        };
      }
    );
  }, [location.pathname]);

  return loaded ? (
    events.map((event, index) => (
      <EventRace
        key={`entryObject#${event.eventId || event.eventorRaceId}`}
        column={-50}
        header={event.name}
        date={event.date}
        eventObject={event}
      />
    ))
  ) : (
    <SpinnerDiv key="entryObject#spinner" column={-50}>
      <Spin size="large" />
    </SpinnerDiv>
  );
};

export default useEventorEntries;
