import { message, Spin } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import { observer } from 'mobx-react';
import { IEventSelectorWizard } from 'models/eventSelectorWizardModel';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import { ICalendarEvent } from 'utils/responseCalendarInterfaces';
import { IEventorEvent, IEventorEventRace, IEventorEvents } from 'utils/responseEventorInterfaces';
import { PostJsonData } from '../../../utils/api';
import { SpinnerDiv, StyledTable } from '../../styled/styled';
import organisationJson from './eventorOrganisations2020';

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
  height: number;
  visible: boolean;
  onFailed: () => void;
  onValidate: (valid: boolean) => void;
}
const EventSelectorWizardStep1ChooseRace = observer(
  ({ eventSelectorWizardModel, height, visible, onFailed, onValidate }: IEventSelectorWizardStep1ChooseRaceProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const [loaded, setLoaded] = useState(false);
    const [events, setEvents] = useState<IStateEvent[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    useEffect(() => {
      const url = clubModel.modules.find((module) => module.name === 'Calendar')?.queryUrl;
      if (!url || !clubModel.eventor) return;

      const data = {
        iType: 'EVENTS',
        iFromDate: eventSelectorWizardModel.queryStartDate,
        iToDate: eventSelectorWizardModel.queryEndDate,
      };

      const alreadySavedEventsPromise = PostJsonData(url, data, true, sessionModel.authorizationHeader);
      const eventsPromise = PostJsonData(
        clubModel.eventorCorsProxy,
        {
          csurl: encodeURIComponent(
            clubModel.eventor.eventsUrl +
              '?fromDate=' +
              eventSelectorWizardModel.queryStartDate +
              '&toDate=' +
              eventSelectorWizardModel.queryEndDate +
              '&includeAttributes=true&includeOrganisationElement=true'
          ),
        },
        true
      );

      Promise.all([alreadySavedEventsPromise, eventsPromise])
        .then(([alreadySavedEventsJson, eventsJson]: [ICalendarEvent[], IEventorEvents]) => {
          if (eventsJson == null || eventsJson.Event == null) {
            eventsJson = { Event: [] };
          } else if (!Array.isArray(eventsJson.Event)) {
            eventsJson.Event = [eventsJson.Event];
          }
          let calendarEventId = -1;
          const events = flatten((eventsJson.Event as IEventorEvent[]).map((event) => event.EventRace))
            .filter((eventRace) => eventRace.EventRaceId != null)
            .filter((evt, i, list) => i === list.findIndex((listEvt) => evt.EventRaceId === listEvt.EventRaceId))
            .map((eventRace) => {
              const entry = {
                Event: (eventsJson.Event as IEventorEvent[]).find((e) =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map((er) => er.EventRaceId).includes(eventRace.EventRaceId)
                    : e.EventRace.EventRaceId === eventRace.EventRaceId
                ),
              };
              const alreadySaved = alreadySavedEventsJson.find(
                (saved) =>
                  saved.eventorId.toString() === entry.Event?.EventId &&
                  saved.eventorRaceId.toString() === eventRace.EventRaceId
              );
              let orgId = entry.Event?.Organiser
                ? (entry.Event.Organiser as { OrganisationId: string | string[] }).OrganisationId
                : undefined;
              if (orgId && Array.isArray(orgId)) {
                orgId = orgId.find((id) => true);
              }
              const org = orgId ? organisationJson.find((o) => o.id === orgId) : undefined;
              const organisationName = org ? org.name : '';
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
                      : ', ' + eventRace.Name),
                },
                EventRaceId: eventRace.EventRaceId,
                organisationName,
                calendarEventId: savedCalendarEventId,
                longitude,
                latitude,
                distanceKm:
                  latitude && longitude && clubModel.map?.center
                    ? distanceKm(clubModel.map?.center[1], clubModel.map?.center[0], latitude, longitude)
                    : null,
              };
            })
            // EventStatusId: 10 Canceled
            // EventClassificationId: 0 = International, 1 = championchip, 2 = National, 3 = District, 4 = Nearby, 5 = Club, 6 = International
            .filter(
              (event) =>
                event.Event.EventStatusId !== '10' &&
                event.Event.EventClassificationId &&
                (event.calendarEventId > 0 ||
                  ['0', '1', '6'].includes(event.Event.EventClassificationId) ||
                  (event.Event.EventClassificationId === '2' &&
                    (eventSelectorWizardModel.maxDistanceNational == null ||
                      (event.distanceKm !== null &&
                        event.distanceKm <= eventSelectorWizardModel.maxDistanceNational))) ||
                  (event.Event.EventClassificationId === '3' &&
                    (eventSelectorWizardModel.maxDistanceDistrict == null ||
                      (event.distanceKm !== null &&
                        event.distanceKm <= eventSelectorWizardModel.maxDistanceDistrict))) ||
                  (['4', '5'].includes(event.Event.EventClassificationId) &&
                    (eventSelectorWizardModel.maxDistanceNearbyAndClub == null ||
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
                distanceKm: event.distanceKm,
              })
            );

          setEvents(events);
          setSelectedRowKeys(events.map((event) => event.calendarEventId).filter((id) => id > 0));
          setLoaded(true);
          eventSelectorWizardModel.setSelectedEvents(events.filter((event) => event.calendarEventId > 0));
          onValidate(true);
        })
        .catch((e) => {
          message.error(e.message);
          onFailed && onFailed();
        });
    }, [eventSelectorWizardModel.queryStartDate, eventSelectorWizardModel.queryEndDate]);

    const onRowClick = useCallback(
      (key: React.Key) => {
        const exists = selectedRowKeys.includes(key);
        const newSelectedRowKeys = !exists ? [...selectedRowKeys, key] : selectedRowKeys.filter((k) => k !== key);

        onSelectChange(newSelectedRowKeys);
      },
      [selectedRowKeys]
    );

    const onSelectChange = useCallback(
      (newSelectedRowKeys: React.Key[]) => {
        const selected = events.filter((event) => newSelectedRowKeys.includes(event.calendarEventId));

        eventSelectorWizardModel.setSelectedEvents(selected);
        setSelectedRowKeys(newSelectedRowKeys);
      },
      [eventSelectorWizardModel, events]
    );

    const rowSelection: TableRowSelection<IStateEvent> = {
      selectedRowKeys,
      onChange: onSelectChange,
    };
    const columns: ColumnType<IStateEvent>[] = [
      {
        title: t('results.Date'),
        dataIndex: 'raceDate',
        key: 'raceDate',
        ellipsis: true,
        width: 100,
        fixed: 'left',
      },
      {
        title: t('results.Time'),
        dataIndex: 'raceTime',
        key: 'raceTime',
        ellipsis: true,
        width: 80,
        fixed: 'left',
      },
      {
        title: t('results.Club'),
        dataIndex: 'organiserName',
        key: 'organiserName',
        ellipsis: true,
        width: 200,
      },
      {
        title: t('results.Name'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        width: 200,
      },
      {
        title: t('results.DistanceKm'),
        dataIndex: 'distanceKm',
        key: 'distanceKm',
        ellipsis: true,
        width: 120,
        fixed: 'right',
      },
    ];

    return loaded && visible ? (
      <StyledTable
        rowSelection={rowSelection as TableRowSelection<any>}
        onRow={(record: ColumnType<IStateEvent>) => {
          return {
            onClick: () => onRowClick(record.key!),
          };
        }}
        columns={columns as ColumnType<any>[]}
        dataSource={events.map((event) => ({ ...event, key: event.calendarEventId }))}
        pagination={{ pageSize: Math.trunc((height - 96) / 32), hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: true }}
        tableLayout="fixed"
        size="middle"
      />
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  }
);

export default EventSelectorWizardStep1ChooseRace;
