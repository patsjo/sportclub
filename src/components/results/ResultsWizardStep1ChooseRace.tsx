import { message, Spin } from 'antd';
import { ColumnType, TableRowSelection } from 'antd/lib/table/interface';
import { observer } from 'mobx-react';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import {
  IEventorCompetitorResult,
  IEventorCompetitors,
  IEventorEntries,
  IEventorEntry,
  IEventorEvent,
  IEventorEventRace,
  IEventorEvents,
  IEventorOrganisation,
  IEventorTeamResult,
} from 'utils/responseEventorInterfaces';
import { IEventViewResultResponse } from 'utils/responseInterfaces';
import { useResultWizardStore } from 'utils/resultWizardStore';
import { PostJsonData } from '../../utils/api';
import { dateFormat } from '../../utils/formHelper';
import { SpinnerDiv, StyledTable } from '../styled/styled';

const flatten = (list: (IEventorEventRace[] | IEventorEventRace)[]): IEventorEventRace[] =>
  list.reduce(
    (a: IEventorEventRace[], b) => a.concat(Array.isArray(b) ? flatten(b) : (b as IEventorEventRace)),
    [] as IEventorEventRace[]
  );

interface IResultEventKey {
  selectedEventorId: number;
  selectedEventorRaceId: number;
  selectedEventId: number;
  alreadySaved: boolean;
  existInEventor: boolean;
  isRelay: boolean;
}
interface IResultEvent extends IEventViewResultResponse {
  key: string;
  alreadySaved: boolean;
  alreadySavedEventsNotInEventor: boolean;
  existInEventor: boolean;
  isRelay: boolean;
  eventStatusId?: string;
}

interface IResultWizardStep1ChooseRaceProps {
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed?: () => void;
}
const ResultWizardStep1ChooseRace = observer(({ visible, onValidate, onFailed }: IResultWizardStep1ChooseRaceProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const { raceWizardModel } = useResultWizardStore();
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<IResultEvent[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>();

  const onSelectChange = useCallback((keys: React.Key[]) => {
    const selected: IResultEventKey =
      Array.isArray(keys) && keys.length > 0 ? JSON.parse(keys[0] as string) : JSON.parse(keys as unknown as string);

    raceWizardModel.setNumberValueOrNull(
      'selectedEventId',
      selected.selectedEventId != -1 ? selected.selectedEventId : null
    );
    raceWizardModel.setNumberValueOrNull(
      'selectedEventorId',
      selected.selectedEventorId != -1 ? selected.selectedEventorId : null
    );
    raceWizardModel.setNumberValueOrNull(
      'selectedEventorRaceId',
      selected.selectedEventorRaceId != -1 ? selected.selectedEventorRaceId : null
    );
    raceWizardModel.setBooleanValue('selectedIsRelay', selected.isRelay ? true : false);
    raceWizardModel.setBooleanValue('eventExistInEventor', selected.existInEventor);
    setSelectedRowKeys(keys);
    onValidate(true);
  }, []);

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url || !clubModel.raceClubs || !clubModel.eventor) return;

    const queryData = {
      iType: 'EVENTS',
      iClubId: clubModel.raceClubs.selectedClub.clubId,
      iFromDate: moment(raceWizardModel.queryStartDate, dateFormat).add(-7, 'days').format(dateFormat),
      iToDate: moment(raceWizardModel.queryEndDate, dateFormat).add(7, 'days').format(dateFormat),
    };

    const alreadySavedEventsPromise = PostJsonData(url, queryData, true, sessionModel.authorizationHeader);
    const entriesPromise = PostJsonData(
      clubModel.eventorCorsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor.entriesUrl +
            '?organisationIds=' +
            clubModel.raceClubs.selectedClub.eventorOrganisationId +
            '&fromEventDate=' +
            raceWizardModel.queryStartDate +
            '&toEventDate=' +
            raceWizardModel.queryEndDate +
            '&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true'
        ),
      },
      true
    );

    const noEntriesPromise: Promise<IEventorEvents> = raceWizardModel.queryForEventWithNoEntry
      ? new Promise((resolve, reject) => {
          PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor?.competitorsUrl +
                  '?organisationId=' +
                  clubModel.raceClubs?.selectedClub.eventorOrganisationId
              ),
            },
            true
          )
            .then((competitorsJson: IEventorCompetitors) => {
              if (!competitorsJson || !Array.isArray(competitorsJson.Competitor)) {
                resolve({ Event: [] });
                return;
              }
              const competitorsPromiseis = competitorsJson.Competitor.map((c) =>
                PostJsonData(
                  clubModel.eventorCorsProxy,
                  {
                    csurl: encodeURIComponent(
                      clubModel.eventor?.personResultUrl +
                        '?personId=' +
                        c.Person?.PersonId +
                        '&fromDate=' +
                        raceWizardModel.queryStartDate +
                        '&toDate=' +
                        raceWizardModel.queryEndDate
                    ),
                  },
                  true
                )
              );
              Promise.all(competitorsPromiseis)
                .then((competitorsJsons: IEventorCompetitorResult[]) => {
                  if (!competitorsJsons) {
                    resolve({ Event: [] });
                    return;
                  }
                  const events: { Event: IEventorEvent[] } = { Event: [] };
                  if (!Array.isArray(competitorsJsons)) {
                    competitorsJsons = [competitorsJsons];
                  }
                  competitorsJsons.forEach((c) => {
                    if (c.ResultList) {
                      if (!Array.isArray(c.ResultList)) {
                        c.ResultList = [c.ResultList];
                      }
                      c.ResultList.forEach((r) => {
                        if (!Array.isArray(r.ClassResult)) {
                          r.ClassResult = [r.ClassResult];
                        }
                        let isCurrentClub = false;
                        r.ClassResult.forEach((cr) => {
                          if (Array.isArray(cr.PersonResult)) {
                            cr.PersonResult = cr.PersonResult[0];
                          }
                          if (
                            cr.PersonResult &&
                            (!cr.PersonResult.Organisation ||
                              cr.PersonResult.Organisation.OrganisationId ===
                                clubModel.raceClubs?.selectedClub.eventorOrganisationId.toString())
                          ) {
                            isCurrentClub = true;
                          }
                          if (cr.TeamResult != null) {
                            const preTeamResults = Array.isArray(cr.TeamResult)
                              ? cr.TeamResult.filter(
                                  (teamResult) =>
                                    teamResult.RaceResult == null ||
                                    teamResult.RaceResult.EventRaceId ===
                                      raceWizardModel.selectedEventorRaceId?.toString()
                                )
                              : cr.TeamResult.RaceResult == null ||
                                cr.TeamResult.RaceResult.EventRaceId ===
                                  raceWizardModel.selectedEventorRaceId?.toString()
                              ? [cr.TeamResult]
                              : [];

                            const teamResults: IEventorTeamResult[] = preTeamResults.map((pre) =>
                              pre.RaceResult?.TeamMemberResult != null ? pre.RaceResult : (pre as IEventorTeamResult)
                            );
                            const teamOrganisations = teamResults.reduce(
                              (a: IEventorOrganisation[], b) => a.concat(b.Organisation),
                              [] as IEventorOrganisation[]
                            );
                            isCurrentClub = teamOrganisations.some(
                              (org) =>
                                org.OrganisationId ===
                                clubModel.raceClubs?.selectedClub.eventorOrganisationId.toString()
                            );
                          }
                        });
                        if (isCurrentClub && !events.Event.some((e) => e.EventId === r.Event.EventId)) {
                          events.Event.push(r.Event);
                        }
                      });
                    }
                  });
                  resolve(events);
                })
                .catch((e) => reject(e));
            })
            .catch((e) => reject(e));
        })
      : new Promise((resolve) => resolve({ Event: [] }));

    const oringenEventsPromise = PostJsonData(
      clubModel.eventorCorsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor.eventsUrl +
            '?organisationIds=' +
            clubModel.eventor.oRingenOrganisationId +
            '&fromDate=' +
            raceWizardModel.queryStartDate +
            '&toDate=' +
            raceWizardModel.queryEndDate +
            '&includeAttributes=true'
        ),
      },
      true
    );

    Promise.all([alreadySavedEventsPromise, entriesPromise, noEntriesPromise, oringenEventsPromise])
      .then(
        ([alreadySavedEventsJson, entriesJson, noEntriesJson, oringenEventsJson]: [
          IEventViewResultResponse[],
          IEventorEntries,
          IEventorEvents,
          IEventorEvents
        ]) => {
          let entries: IEventorEntry[] = [];
          let oringenEvents: IEventorEvent[] = [];
          let noEntriesEvents: IEventorEvent[] = [];
          if (entriesJson != null) {
            if (Array.isArray(entriesJson.Entry)) entries = entriesJson.Entry;
            else entries = [entriesJson.Entry];
          }
          if (oringenEventsJson != null && oringenEventsJson.Event != null) {
            if (Array.isArray(oringenEventsJson.Event)) oringenEvents = oringenEventsJson.Event;
            else oringenEvents = [oringenEventsJson.Event];
          }
          if (noEntriesJson != null && noEntriesJson.Event != null) {
            if (Array.isArray(noEntriesJson.Event)) noEntriesEvents = noEntriesJson.Event;
            else noEntriesEvents = [noEntriesJson.Event];
          }
          oringenEvents = [...oringenEvents, ...noEntriesEvents];
          let events: IResultEvent[] = [
            ...flatten(entries.map((entry) => entry.Event.EventRace)),
            ...flatten(oringenEvents.map((event) => event.EventRace)),
          ]
            .filter((eventRace) => eventRace.EventRaceId != null)
            .filter((evt, i, list) => i === list.findIndex((listEvt) => evt.EventRaceId === listEvt.EventRaceId))
            .map((eventRace): IResultEvent => {
              let entryEvent = entries.find((e) =>
                Array.isArray(e.Event.EventRace)
                  ? e.Event.EventRace.map((er) => er.EventRaceId).includes(eventRace.EventRaceId)
                  : e.EventRaceId === eventRace.EventRaceId
              )?.Event;
              if (entryEvent == null) {
                entryEvent = oringenEvents.find((e) =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map((er) => er.EventRaceId).includes(eventRace.EventRaceId)
                    : e.EventRace.EventRaceId === eventRace.EventRaceId
                );
              }
              if (entryEvent) {
                entryEvent.Name =
                  entryEvent.Name +
                  ', ' +
                  (JSON.stringify(eventRace.Name) === JSON.stringify({}) || !eventRace.Name
                    ? ''
                    : ', ' + eventRace.Name);
              }
              const alreadySaved = alreadySavedEventsJson.find(
                (saved) =>
                  saved.eventorId.toString() === entryEvent?.EventId &&
                  saved.eventorRaceId!.toString() === eventRace.EventRaceId
              );

              const isRelay =
                entryEvent != null &&
                entryEvent['@attributes'] &&
                entryEvent['@attributes'].eventForm &&
                entryEvent['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0;
              return {
                key: JSON.stringify({
                  selectedEventorId: entryEvent ? parseInt(entryEvent.EventId) : -1,
                  selectedEventorRaceId: parseInt(eventRace.EventRaceId),
                  selectedEventId: alreadySaved ? alreadySaved.eventId : -1,
                  alreadySaved: !!alreadySaved,
                  existInEventor: true,
                  isRelay: isRelay,
                }),
                date: entryEvent ? eventRace.RaceDate.Date : '',
                eventId: alreadySaved ? alreadySaved.eventId : -1,
                eventorId: entryEvent ? parseInt(entryEvent.EventId) : -1,
                eventorRaceId: parseInt(eventRace.EventRaceId),
                invoiceVerified: alreadySaved ? alreadySaved.invoiceVerified : false,
                name: entryEvent?.Name ?? '',
                time: entryEvent ? eventRace.RaceDate.Clock : '',
                alreadySaved: !!alreadySaved,
                alreadySavedEventsNotInEventor: false,
                existInEventor: true,
                eventStatusId: entryEvent?.EventStatusId,
                isRelay: isRelay,
              };
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
          events = events.filter((event) => event.eventStatusId && ['9', '11'].includes(event.eventStatusId));
          const alreadySavedEventsNotInEventor: IResultEvent[] = alreadySavedEventsJson
            .filter(
              (saved) =>
                (moment(raceWizardModel.queryStartDate).isSame(saved.date) ||
                  moment(raceWizardModel.queryStartDate).isBefore(saved.date)) &&
                (moment(raceWizardModel.queryEndDate).isSame(saved.date) ||
                  moment(raceWizardModel.queryEndDate).isAfter(saved.date)) &&
                !events.some(
                  (event) => saved.eventorId === event.eventorId && saved.eventorRaceId === event.eventorRaceId
                )
            )
            .map(
              (e): IResultEvent => ({
                ...e,
                key: JSON.stringify({
                  selectedEventorId: e.eventorId,
                  selectedEventorRaceId: e.eventorRaceId,
                  selectedEventId: e.eventId,
                  alreadySaved: true,
                  existInEventor: false,
                  isRelay: e.isRelay,
                }),
                existInEventor: false,
                isRelay: e.isRelay,
                alreadySaved: true,
                alreadySavedEventsNotInEventor: true,
              })
            );
          if (!raceWizardModel.queryIncludeExisting) {
            events = events.filter((event) => !event.alreadySaved);
          } else {
            events = [...events, ...alreadySavedEventsNotInEventor];
          }
          events = events.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
          setEvents(events);
          setSelectedRowKeys(undefined);
          setLoaded(true);
        }
      )
      .catch((e) => {
        message.error(e.message);
        onFailed && onFailed();
      });
  }, []);

  const rowSelection: TableRowSelection<IResultEvent> = {
    selectedRowKeys,
    onChange: onSelectChange,
    type: 'radio',
  };

  const columns: ColumnType<IResultEvent>[] = [
    {
      title: t('results.Date'),
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: t('results.Time'),
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: t('results.Name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('results.AlreadySaved'),
      dataIndex: 'alreadySaved',
      key: 'alreadySaved',
      render: (alreadySaved) => (alreadySaved ? t('common.Yes') : t('common.No')),
    },
    {
      title: t('results.ExistInEventor'),
      dataIndex: 'existInEventor',
      key: 'existInEventor',
      render: (existInEventor) => (existInEventor ? t('common.Yes') : t('common.No')),
    },
  ];

  return loaded && visible ? (
    <StyledTable
      rowSelection={rowSelection as TableRowSelection<any>}
      onRow={(record) => {
        return {
          onClick: () => onSelectChange([(record as IResultEvent).key]),
        };
      }}
      columns={columns as ColumnType<any>[]}
      dataSource={events}
      pagination={{ pageSize: 8 }}
      size="middle"
    />
  ) : visible ? (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  ) : null;
});

export default ResultWizardStep1ChooseRace;
