import { message, Spin, TableProps } from 'antd';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IEventSelectorWizard } from '../../../models/eventSelectorWizardModel';
import { PostJsonData } from '../../../utils/api';
import { useMobxStore } from '../../../utils/mobxStore';
import { ICalendarEvent } from '../../../utils/responseCalendarInterfaces';
import {
  IEventorEvent,
  IEventorEventRace,
  IEventorEvents,
  IEventorOrganisation
} from '../../../utils/responseEventorInterfaces';
import { SpinnerDiv, StyledTable } from '../../styled/styled';

const flatten = (list: (IEventorEventRace[] | IEventorEventRace)[]): IEventorEventRace[] =>
  list.reduce(
    (a: IEventorEventRace[], b) => a.concat(Array.isArray(b) ? flatten(b) : (b as IEventorEventRace)),
    [] as IEventorEventRace[]
  );
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // km (change this constant to get miles)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d);
};

interface IStateEvent {
  calendarEventId: number;
  eventorId: number | undefined;
  eventorRaceId: number | undefined;
  name: string;
  organiserName: string;
  raceDate: string;
  raceTime: string;
  longitude: number | null;
  latitude: number | null;
  distanceKm: number | null;
}

interface IEventSelectorWizardStep1ChooseRaceProps {
  eventSelectorWizardModel: IEventSelectorWizard;
  eventorOrganisations: IEventorOrganisation[];
  height: number;
  visible: boolean;
  onFailed: () => void;
  onValidate: (valid: boolean) => void;
}
const EventSelectorWizardStep1ChooseRace = observer(
  ({
    eventSelectorWizardModel,
    eventorOrganisations,
    height,
    visible,
    onFailed,
    onValidate
  }: IEventSelectorWizardStep1ChooseRaceProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const [loaded, setLoaded] = useState(false);
    const [events, setEvents] = useState<IStateEvent[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    useEffect(() => {
      const url = clubModel.modules.find(module => module.name === 'Calendar')?.queryUrl;
      if (!url || !clubModel.eventor) return;

      const data = {
        iType: 'EVENTS',
        iFromDate: eventSelectorWizardModel.queryStartDate,
        iToDate: eventSelectorWizardModel.queryEndDate
      };

      const alreadySavedEventsPromise = PostJsonData<ICalendarEvent[]>(
        url,
        data,
        true,
        sessionModel.authorizationHeader
      );
      const events1Promise = PostJsonData<IEventorEvents>(
        clubModel.eventorCorsProxy,
        {
          csurl: encodeURIComponent(
            clubModel.eventor.eventsUrl +
              '?fromDate=' +
              eventSelectorWizardModel.queryStartDate +
              '&toDate=' +
              eventSelectorWizardModel.queryEndDate +
              '&includeAttributes=true&includeOrganisationElement=true'
          )
        },
        true
      );
      const events2Promise = eventSelectorWizardModel.eventorIds.length
        ? PostJsonData<IEventorEvents>(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.eventsUrl +
                  '?eventIds=' +
                  eventSelectorWizardModel.eventorIds.join(',') +
                  '&includeAttributes=true&includeOrganisationElement=true'
              )
            },
            true
          )
        : new Promise((resolve: (value: IEventorEvents) => void) => resolve({ Event: [] }));
      Promise.all([alreadySavedEventsPromise, events1Promise, events2Promise])
        .then(([alreadySavedEventsJson, events1Json, events2Json]) => {
          if (events1Json == null || events1Json.Event == null) {
            events1Json = { Event: [] };
          } else if (!Array.isArray(events1Json.Event)) {
            events1Json.Event = [events1Json.Event];
          }
          if (events2Json == null || events2Json.Event == null) {
            events2Json = { Event: [] };
          } else if (!Array.isArray(events2Json.Event)) {
            events2Json.Event = [events2Json.Event];
          }
          const eventsJson: IEventorEvents = {
            Event: [...(events1Json.Event as IEventorEvent[]), ...(events2Json.Event as IEventorEvent[])]
          };
          let calendarEventId = -1;
          const events = flatten((eventsJson.Event as IEventorEvent[]).map(event => event.EventRace))
            .filter(eventRace => eventRace.EventRaceId != null)
            .filter((evt, i, list) => i === list.findIndex(listEvt => evt.EventRaceId === listEvt.EventRaceId))
            .map(eventRace => {
              const entry = {
                Event: (eventsJson.Event as IEventorEvent[]).find(e =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map(er => er.EventRaceId).includes(eventRace.EventRaceId)
                    : e.EventRace.EventRaceId === eventRace.EventRaceId
                )
              };
              const alreadySaved = alreadySavedEventsJson?.find(
                saved =>
                  saved.eventorId.toString() === entry.Event?.EventId &&
                  saved.eventorRaceId.toString() === eventRace.EventRaceId
              );
              let orgId = entry.Event?.Organiser
                ? (entry.Event.Organiser as { OrganisationId: string | string[] }).OrganisationId
                : undefined;
              if (orgId && Array.isArray(orgId)) {
                orgId = orgId.find(() => true);
              }
              const org = orgId ? eventorOrganisations.find(o => o.OrganisationId === orgId) : undefined;
              const organisationName = org ? org.Name : '';
              const savedCalendarEventId = alreadySaved ? alreadySaved.calendarEventId : calendarEventId--;
              const longitude = eventRace.EventCenterPosition
                ? parseFloat(eventRace.EventCenterPosition['@attributes'].x)
                : null;
              const latitude = eventRace.EventCenterPosition
                ? parseFloat(eventRace.EventCenterPosition['@attributes'].y)
                : null;

              return {
                Event: {
                  ...entry.Event,
                  EventRace: eventRace,
                  Name:
                    entry.Event?.Name +
                    ', ' +
                    (JSON.stringify(eventRace.Name) === JSON.stringify({}) || !eventRace.Name
                      ? ''
                      : ', ' + eventRace.Name)
                },
                EventRaceId: eventRace.EventRaceId,
                parentOrganisationId: org?.ParentOrganisation?.OrganisationId,
                organisationId: org?.OrganisationId,
                organisationName,
                calendarEventId: savedCalendarEventId,
                longitude,
                latitude,
                distanceKm:
                  latitude && longitude && clubModel.map?.center
                    ? distanceKm(clubModel.map?.center[1], clubModel.map?.center[0], latitude, longitude)
                    : null
              };
            })
            // EventStatusId: 10 Canceled
            // EventClassificationId: 0 = International, 1 = championchip, 2 = National, 3 = District, 4 = Nearby, 5 = Club, 6 = International
            .filter(
              event =>
                event.Event.EventRace.RaceDate.Date >= eventSelectorWizardModel.queryStartDate &&
                event.Event.EventRace.RaceDate.Date <= eventSelectorWizardModel.queryEndDate &&
                event.Event.EventStatusId !== '10' &&
                event.Event.EventClassificationId &&
                (event.calendarEventId > 0 ||
                  eventSelectorWizardModel.eventorIds.includes(event.Event.EventRace.EventId) ||
                  ['0', '1', '6'].includes(event.Event.EventClassificationId) ||
                  (event.Event.EventClassificationId === '2' &&
                    (eventSelectorWizardModel.maxDistanceNational == null ||
                      eventSelectorWizardModel.parentOrganisationIdsNational.some(
                        parentOrgId => parentOrgId === event.parentOrganisationId
                      ) ||
                      (event.distanceKm !== null &&
                        event.distanceKm <= eventSelectorWizardModel.maxDistanceNational))) ||
                  (event.Event.EventClassificationId === '3' &&
                    (eventSelectorWizardModel.maxDistanceDistrict == null ||
                      eventSelectorWizardModel.parentOrganisationIdsDistrict.some(
                        parentOrgId => parentOrgId === event.parentOrganisationId
                      ) ||
                      (event.distanceKm !== null &&
                        event.distanceKm <= eventSelectorWizardModel.maxDistanceDistrict))) ||
                  (['4', '5'].includes(event.Event.EventClassificationId) &&
                    (eventSelectorWizardModel.maxDistanceNearbyAndClub == null ||
                      eventSelectorWizardModel.organisationIdsNearbyAndClub.some(
                        orgId => orgId === event.organisationId
                      ) ||
                      (event.distanceKm !== null &&
                        event.distanceKm <= eventSelectorWizardModel.maxDistanceNearbyAndClub))))
            )
            .sort((a, b) =>
              a.Event.EventRace.RaceDate.Date > b.Event.EventRace.RaceDate.Date
                ? 1
                : a.Event.EventRace.RaceDate.Date < b.Event.EventRace.RaceDate.Date
                  ? -1
                  : 0
            )
            .map(
              (event): IStateEvent => ({
                calendarEventId: event.calendarEventId,
                eventorId: event.Event.EventId ? parseInt(event.Event.EventId) : undefined,
                eventorRaceId: event.EventRaceId ? parseInt(event.EventRaceId) : undefined,
                name: event.Event.Name,
                organiserName: event.organisationName,
                raceDate: event.Event.EventRace.RaceDate.Date,
                raceTime:
                  event.Event.EventRace.RaceDate.Clock === '00:00:00'
                    ? ''
                    : event.Event.EventRace.RaceDate.Clock.substr(0, 5),
                longitude: event.longitude,
                latitude: event.latitude,
                distanceKm: event.distanceKm
              })
            );

          setEvents(events);
          setSelectedRowKeys(
            events
              .filter(
                event =>
                  event.calendarEventId > 0 ||
                  eventSelectorWizardModel.eventorIds.some(id => id === event.eventorId?.toString())
              )
              .map(event => event.calendarEventId)
          );
          setLoaded(true);
          eventSelectorWizardModel.setSelectedEvents(events.filter(event => event.calendarEventId > 0));
          onValidate(true);
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          onFailed?.();
        });
    }, [
      eventorOrganisations,
      eventSelectorWizardModel.queryStartDate,
      eventSelectorWizardModel.queryEndDate,
      clubModel.modules,
      clubModel.eventor,
      clubModel.eventorCorsProxy,
      clubModel.map?.center,
      eventSelectorWizardModel,
      sessionModel.authorizationHeader,
      onValidate,
      onFailed
    ]);

    const onSelectChange = useCallback(
      (newSelectedRowKeys: React.Key[]) => {
        const selected = events.filter(event => newSelectedRowKeys.includes(event.calendarEventId));

        eventSelectorWizardModel.setSelectedEvents(selected);
        setSelectedRowKeys(newSelectedRowKeys);
      },
      [eventSelectorWizardModel, events]
    );

    const onRowClick = useCallback(
      (key: React.Key) => {
        const exists = selectedRowKeys.includes(key);
        const newSelectedRowKeys = !exists ? [...selectedRowKeys, key] : selectedRowKeys.filter(k => k !== key);

        onSelectChange(newSelectedRowKeys);
      },
      [onSelectChange, selectedRowKeys]
    );

    const rowSelection: TableProps<IStateEvent & { key: number }>['rowSelection'] = {
      selectedRowKeys,
      onChange: onSelectChange
    };
    const columns: TableProps<IStateEvent & { key: number }>['columns'] = [
      {
        title: t('results.Date'),
        dataIndex: 'raceDate',
        key: 'raceDate',
        ellipsis: true,
        width: 100,
        fixed: 'left'
      },
      {
        title: t('results.Time'),
        dataIndex: 'raceTime',
        key: 'raceTime',
        ellipsis: true,
        width: 80,
        fixed: 'left'
      },
      {
        title: t('results.Club'),
        dataIndex: 'organiserName',
        key: 'organiserName',
        ellipsis: true,
        width: 200
      },
      {
        title: t('results.Name'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        width: 200
      },
      {
        title: t('results.DistanceKm'),
        dataIndex: 'distanceKm',
        key: 'distanceKm',
        ellipsis: true,
        width: 120,
        fixed: 'right'
      }
    ];

    return loaded && visible ? (
      <StyledTable<IStateEvent & { key: number }>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={events.map(event => ({ ...event, key: event.calendarEventId }))}
        pagination={{ pageSize: Math.trunc((height - 96) / 32), hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: true }}
        tableLayout="fixed"
        size="middle"
        onRow={record => {
          return {
            onClick: () => onRowClick(record.key)
          };
        }}
      />
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  }
);

export default EventSelectorWizardStep1ChooseRace;
