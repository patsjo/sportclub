import { Spin } from 'antd';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import { IChildContainerProps } from '../../components/dashboard/columns/mapNodesToColumns';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { PostJsonData } from '../../utils/api';
import {
  IEventorEntries,
  IEventorEntry,
  IEventorEvent,
  IEventorEventRace,
  IEventorEvents
} from '../../utils/responseEventorInterfaces';
import { IEventViewResultResponse } from '../../utils/responseInterfaces';
import EventRace, { IEventDashboardObject } from './EventRace';

const SpinnerDiv = styled.div<IChildContainerProps>`
  text-align: center;
  width: 100%;
`;

const flatten = (list: (IEventorEventRace[] | IEventorEventRace)[]): IEventorEventRace[] =>
  list.reduce(
    (a: IEventorEventRace[], b) => a.concat(Array.isArray(b) ? flatten(b) : (b as IEventorEventRace)),
    [] as IEventorEventRace[]
  );

const useEventorEntries = (clubModel: IMobxClubModel) => {
  const [loaded, setLoaded] = React.useState(false);
  const [events, setEvents] = React.useState<IEventDashboardObject[]>([]);
  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname != '/') {
      return;
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const prevMonth = new Date(today.valueOf());
    const prevWeek = new Date(today.valueOf());
    const nextWeek = new Date(today.valueOf());
    const nextMonths = new Date(today.valueOf());
    prevMonth.setDate(prevWeek.getDate() - 60);
    prevWeek.setDate(prevWeek.getDate() - 10);
    nextWeek.setDate(nextWeek.getDate() + 4);
    nextMonths.setDate(nextMonths.getDate() + 20);
    const fromDate = prevWeek.toISOString().substr(0, 10);
    const toDate = nextWeek.toISOString().substr(0, 10);
    const toOringenDate = nextMonths.toISOString().substr(0, 10);
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url) return;

    const queryData = {
      iType: 'EVENTS',
      iEventorOrganisationId: clubModel.eventor?.organisationId,
      iFromDate: prevMonth.toISOString().substr(0, 10),
      iToDate: toDate
    };
    const alreadySavedEventsPromise = PostJsonData<IEventViewResultResponse[]>(url, queryData, true);
    const entriesPromise = PostJsonData<IEventorEntries>(
      clubModel.eventorCorsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor?.entriesUrl +
            '?organisationIds=' +
            clubModel.eventor?.organisationId +
            '&fromEventDate=' +
            fromDate +
            '&toEventDate=' +
            toDate +
            '&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true'
        ),
        cache: true
      },
      false
    );
    const oringenEventsPromise = PostJsonData<IEventorEvents>(
      clubModel.eventorCorsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor?.eventsUrl +
            '?organisationIds=' +
            clubModel.eventor?.oRingenOrganisationId +
            '&fromDate=' +
            fromDate +
            '&toDate=' +
            toOringenDate +
            '&includeAttributes=true'
        ),
        cache: true
      },
      false
    );
    Promise.all([alreadySavedEventsPromise, entriesPromise, oringenEventsPromise]).then(
      ([alreadySavedEventsJson, entriesJson, oringenEventsJson]) => {
        if (entriesJson == null || entriesJson.Entry == null) {
          entriesJson = { Entry: [] };
        } else if (!Array.isArray(entriesJson.Entry)) {
          entriesJson.Entry = [entriesJson.Entry];
        }
        if (oringenEventsJson == null || oringenEventsJson.Event == null) {
          oringenEventsJson = { Event: [] };
        } else if (!Array.isArray(oringenEventsJson.Event)) {
          oringenEventsJson.Event = [oringenEventsJson.Event];
        }
        (entriesJson.Entry as IEventorEntry[]).forEach(entry => {
          if (Array.isArray(entry.Event.EventRace)) {
            entry.EventRaceId = entry.Event.EventRace.map(eventRace => eventRace.EventRaceId).find(() => true)!;
          } else {
            entry.EventRaceId = entry.Event.EventRace.EventRaceId;
          }
        });
        let events: IEventDashboardObject[] = [
          ...flatten((entriesJson.Entry as IEventorEntry[]).map(entry => entry.Event.EventRace)),
          ...flatten((oringenEventsJson.Event as IEventorEvent[]).map(event => event.EventRace))
        ]
          .filter(eventRace => eventRace.EventRaceId != null)
          .filter((evt, i, list) => i === list.findIndex(listEvt => evt.EventRaceId === listEvt.EventRaceId))
          .map(eventRace => {
            let event = (entriesJson.Entry as IEventorEntry[]).find(e =>
              Array.isArray(e.EventRaceId)
                ? e.EventRaceId.includes(eventRace.EventRaceId)
                : e.EventRaceId === eventRace.EventRaceId
            )?.Event;
            if (!event) {
              event = (oringenEventsJson.Event as IEventorEvent[]).find(e =>
                Array.isArray(e.EventRace)
                  ? e.EventRace.map(er => er.EventRaceId).includes(eventRace.EventRaceId)
                  : e.EventRace.EventRaceId === eventRace.EventRaceId
              )!;
            }

            return {
              Event: {
                ...event,
                EventRace: eventRace,
                Name:
                  event?.Name +
                  (JSON.stringify(eventRace.Name) === JSON.stringify({}) || !eventRace.Name
                    ? ''
                    : ', ' + eventRace.Name)
              },
              EventRaceId: eventRace.EventRaceId,
              Competitors: (entriesJson.Entry as IEventorEntry[])
                .filter(
                  entry =>
                    entry.Competitor != null &&
                    entry.Competitor.Person != null &&
                    (Array.isArray(entry.EventRaceId)
                      ? entry.EventRaceId.includes(eventRace.EventRaceId)
                      : entry.EventRaceId === eventRace.EventRaceId)
                )
                .map(entry => {
                  return {
                    ...entry.Competitor,
                    EntryId: entry.EntryId,
                    EntryClass: entry.EntryClass
                  };
                })
            };
          })
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
          .filter(event => ['5', '6', '7', '8', '9', '11'].includes(event.Event.EventStatusId))
          .map(event => {
            const savedEvent = alreadySavedEventsJson?.find(
              saved => '' + saved.eventorRaceId === '' + event.EventRaceId
            );
            return savedEvent
              ? {
                  eventId: savedEvent.eventId,
                  eventorId: event.Event.EventId,
                  eventorRaceId: event.EventRaceId,
                  date: savedEvent.date,
                  name: savedEvent.name,
                  statusId: 9,
                  Competitors: []
                }
              : {
                  eventorId: event.Event.EventId,
                  eventorRaceId: event.EventRaceId,
                  date: event.Event.EventRace.RaceDate.Date,
                  name: event.Event.Name,
                  statusId: parseInt(event.Event.EventStatusId),
                  Competitors: event.Competitors
                };
          });
        let savedEvents =
          alreadySavedEventsJson?.filter(savedEvent => !events.some(event => event.eventId === savedEvent.eventId)) ??
          [];
        const eventsToShow: IEventDashboardObject[] = savedEvents
          .filter(savedEvent => fromDate <= savedEvent.date && savedEvent.date <= toDate)
          .map(savedEvent => ({
            eventId: savedEvent.eventId,
            eventorId: savedEvent.eventorId?.toString() ?? '',
            eventorRaceId: savedEvent.eventorRaceId?.toString() ?? '',
            date: savedEvent.date,
            name: savedEvent.name,
            statusId: 9,
            Competitors: []
          }));
        events = [...events, ...eventsToShow];
        savedEvents = savedEvents.filter(
          savedEvent => !eventsToShow.some(event => event.eventId === savedEvent.eventId)
        );
        if (events.length < 5) {
          const olderEvents: IEventDashboardObject[] = savedEvents
            .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
            .slice(0, 5 - events.length)
            .map(savedEvent => ({
              eventId: savedEvent.eventId,
              eventorId: savedEvent.eventorId?.toString() ?? '',
              eventorRaceId: savedEvent.eventorRaceId?.toString() ?? '',
              date: savedEvent.date,
              name: savedEvent.name,
              statusId: 9,
              Competitors: []
            }));
          events = [...events, ...olderEvents];
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
  }, [
    clubModel.eventor?.entriesUrl,
    clubModel.eventor?.eventsUrl,
    clubModel.eventor?.oRingenOrganisationId,
    clubModel.eventor?.organisationId,
    clubModel.eventorCorsProxy,
    clubModel.modules,
    location.pathname
  ]);

  return loaded ? (
    events.map(event => (
      <EventRace
        key={`entryObject#${event.eventId || event.eventorRaceId}`}
        preferredColumn="50%rightFixed"
        header={event.name}
        date={event.date}
        eventObject={event}
        preferredHeight={100}
      />
    ))
  ) : (
    <SpinnerDiv key="entryObject#spinner" preferredColumn="50%rightFixed" preferredHeight={100}>
      <Spin size="large" />
    </SpinnerDiv>
  );
};

export default useEventorEntries;
