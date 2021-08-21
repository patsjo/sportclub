import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { Spin, message } from 'antd';
import { SpinnerDiv, StyledTable } from '../../styled/styled';
import { observer, inject } from 'mobx-react';
import { GetJsonData, PostJsonData } from '../../../utils/api';
import organisationJson from './eventorOrganisations2020';

const flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
const MakeArray = (object) => (!object ? [] : Array.isArray(object) ? object : [object]);
const distanceKm = (lat1, lon1, lat2, lon2) => {
  var R = 6371; // km (change this constant to get miles)
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return Math.round(d);
};

// @inject("clubModel")
// @observer
const EventSelectorWizardStep1ChooseRace = inject(
  'clubModel',
  'eventSelectorWizardModel',
  'sessionModel'
)(
  observer(
    class EventSelectorWizardStep1ChooseRace extends Component {
      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          events: [],
          selectedRowKeys: undefined,
        };
      }

      componentDidMount() {
        const self = this;
        const { eventSelectorWizardModel, clubModel, sessionModel, onFailed, onValidate } = this.props;
        const url = clubModel.modules.find((module) => module.name === 'Calendar').queryUrl;
        const data = {
          iType: 'EVENTS',
          iFromDate: eventSelectorWizardModel.queryStartDate,
          iToDate: eventSelectorWizardModel.queryEndDate,
        };

        const alreadySavedEventsPromise = PostJsonData(url, data, true, sessionModel.authorizationHeader);
        const eventsPromise = PostJsonData(
          clubModel.corsProxy,
          {
            csurl: encodeURIComponent(
              clubModel.eventor.eventsUrl +
                '?fromDate=' +
                eventSelectorWizardModel.queryStartDate +
                '&toDate=' +
                eventSelectorWizardModel.queryEndDate +
                '&includeAttributes=true&includeOrganisationElement=true'
            ),
            requestMethod: 'GET',
            headers: encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
          },
          true
        );

        Promise.all([alreadySavedEventsPromise, eventsPromise])
          .then(([alreadySavedEventsJson, eventsJson]) => {
            // eslint-disable-next-line eqeqeq
            if (eventsJson == undefined || eventsJson.Event == undefined) {
              eventsJson = { Event: [] };
            } else if (!Array.isArray(eventsJson.Event)) {
              eventsJson.Event = [eventsJson.Event];
            }
            let events = [
              ...new Set([
                ...flatten(eventsJson.Event.map((event) => event.EventRace)).map((eventRace) => eventRace.EventRaceId),
              ]),
            ]
              // eslint-disable-next-line eqeqeq
              .filter((eventRaceId) => eventRaceId != undefined)
              .map((eventRaceId) => {
                return { EventRaceId: eventRaceId };
              });
            let calendarEventId = -1;
            events.forEach((event) => {
              let entry = {
                Event: eventsJson.Event.find((e) =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map((er) => er.EventRaceId).includes(event.EventRaceId)
                    : e.EventRace.EventRaceId === event.EventRaceId
                ),
              };
              event.Event = {
                ...entry.Event,
              };
              if (Array.isArray(event.Event.EventRace)) {
                event.Event.EventRace = event.Event.EventRace.find(
                  (eventRace) => eventRace.EventRaceId === event.EventRaceId
                );
                event.Event.Name = event.Event.Name + ', ' + event.Event.EventRace.Name;
              }
              const alreadySaved = alreadySavedEventsJson.find(
                (saved) =>
                  saved.eventorId.toString() === event.Event.EventId &&
                  saved.eventorRaceId.toString() === event.EventRaceId
              );
              let orgId = event.Event.Organiser ? event.Event.Organiser.OrganisationId : undefined;
              if (orgId && Array.isArray(orgId)) {
                orgId = orgId.find((id) => true);
              }
              const org = orgId ? organisationJson.find((o) => o.id === orgId) : undefined;
              event.organisationName = org ? org.name : '';
              event.calendarEventId = alreadySaved ? alreadySaved.calendarEventId : calendarEventId--;
              event.longitude = event.Event.EventRace.EventCenterPosition
                ? parseFloat(event.Event.EventRace.EventCenterPosition['@attributes'].x)
                : null;
              event.latitude = event.Event.EventRace.EventCenterPosition
                ? parseFloat(event.Event.EventRace.EventCenterPosition['@attributes'].y)
                : null;
              event.distanceKm =
                event.latitude && event.longitude && clubModel.map?.center
                  ? distanceKm(clubModel.map?.center[1], clubModel.map?.center[0], event.latitude, event.longitude)
                  : null;
            });
            // EventStatusId: 10 Canceled
            // 1 = championchip, 2 = National, 3 = District, 4 = Nearby, 5 = Club, 6 = International
            events = events
              .filter(
                (event) =>
                  event.Event.EventStatusId !== '10' &&
                  (['1', '2', '6'].includes(event.Event.EventClassificationId) ||
                    (event.Event.EventClassificationId === '3' &&
                      event.distanceKm !== null &&
                      event.distanceKm <= eventSelectorWizardModel.maxDistanceDistrict) ||
                    (event.distanceKm !== null &&
                      event.distanceKm <= eventSelectorWizardModel.maxDistanceNearbyAndClub))
              )
              .sort((a, b) =>
                a.Event.EventRace.RaceDate.Date > b.Event.EventRace.RaceDate.Date
                  ? 1
                  : a.Event.EventRace.RaceDate.Date < b.Event.EventRace.RaceDate.Date
                  ? -1
                  : 0
              );
            events = events.map((event) => ({
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
            }));
            self.setState({
              loaded: true,
              events: events,
              selectedRowKeys: events.map((event) => event.calendarEventId).filter((id) => id > 0),
            });
            eventSelectorWizardModel.setValue(
              'selectedEvents',
              events.filter((event) => event.calendarEventId > 0)
            );
            onValidate(true);
          })
          .catch((e) => {
            message.error(e.message);
            onFailed && onFailed();
          });
      }

      onRowClick = (key) => {
        const { selectedRowKeys } = this.state;
        let newSelectedRowKeys = MakeArray(selectedRowKeys);
        const exists = newSelectedRowKeys.includes(key);

        newSelectedRowKeys = !exists ? [...newSelectedRowKeys, key] : newSelectedRowKeys.filter((k) => k !== key);

        this.onSelectChange(newSelectedRowKeys);
      };

      onSelectChange = (selectedRowKeys) => {
        const { eventSelectorWizardModel } = this.props;
        const { events } = this.state;
        const selected = events.filter((event) => MakeArray(selectedRowKeys).includes(event.calendarEventId));

        eventSelectorWizardModel.setValue('selectedEvents', selected);
        this.setState({ selectedRowKeys });
      };

      render() {
        const self = this;
        const { visible, t } = this.props;
        const { loaded, selectedRowKeys, events } = this.state;
        const rowSelection = {
          selectedRowKeys,
          onChange: self.onSelectChange,
        };
        const columns = [
          {
            title: t('results.Date'),
            dataIndex: 'raceDate',
            key: 'raceDate',
          },
          {
            title: t('results.Time'),
            dataIndex: 'raceTime',
            key: 'raceTime',
          },
          {
            title: t('results.Club'),
            dataIndex: 'organiserName',
            key: 'organiserName',
          },
          {
            title: t('results.Name'),
            dataIndex: 'name',
            key: 'name',
          },
          {
            title: t('results.DistanceKm'),
            dataIndex: 'distanceKm',
            key: 'distanceKm',
          },
        ];

        return loaded && visible ? (
          <StyledTable
            rowSelection={rowSelection}
            onRow={(record) => {
              return {
                onClick: () => self.onRowClick(record.key),
              };
            }}
            columns={columns}
            dataSource={events.map((event) => ({ ...event, key: event.calendarEventId }))}
            pagination={{ pageSize: 8 }}
            size="middle"
          />
        ) : visible ? (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        ) : null;
      }
    }
  )
);

const EventSelectorWizardStep1ChooseRaceWithI18n = withTranslation()(EventSelectorWizardStep1ChooseRace); // pass `t` function to App

export default EventSelectorWizardStep1ChooseRaceWithI18n;
