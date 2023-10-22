import { message, Progress, Spin } from 'antd';
import { ColumnType, TableRowSelection } from 'antd/lib/table/interface';
import { observer } from 'mobx-react';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostJsonData } from 'utils/api';
import { dateFormat } from 'utils/formHelper';
import { useMobxStore } from 'utils/mobxStore';
import {
  IEventorCompetitor,
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
import { SpinnerDiv, StyledTable } from '../styled/styled';

const stringFormat = (value: string, ...args) => {
  return value.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != 'undefined' ? args[number] : match;
  });
};

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
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(5);
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);

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
    const fetchData = async () => {
      setTotal(5);
      setProcessed(0);
      setCurrentEvent(t('results.loadSavedResults'));
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url || !clubModel.raceClubs || !clubModel.eventor) return;

      const queryData =
        raceWizardModel.selectedEventorId == null
          ? {
              iType: 'EVENTS',
              iClubId: clubModel.raceClubs.selectedClub?.clubId,
              iFromDate: moment(raceWizardModel.queryStartDate, dateFormat).add(-7, 'days').format(dateFormat),
              iToDate: moment(raceWizardModel.queryEndDate, dateFormat).add(7, 'days').format(dateFormat),
            }
          : {
              iType: 'EVENTS',
              iClubId: clubModel.raceClubs.selectedClub?.clubId,
              iEventorId: raceWizardModel.selectedEventorId,
            };

      try {
        const alreadySavedEventsJson: IEventViewResultResponse[] = await PostJsonData(
          url,
          queryData,
          true,
          sessionModel.authorizationHeader
        );
        setProcessed((prev) => prev + 1);
        setCurrentEvent(t('results.loadEntries'));
        const entriesJson: IEventorEntries = await PostJsonData(
          clubModel.eventorCorsProxy,
          {
            csurl:
              raceWizardModel.selectedEventorId == null
                ? encodeURIComponent(
                    clubModel.eventor.entriesUrl +
                      '?organisationIds=' +
                      clubModel.raceClubs.selectedClub?.eventorOrganisationId +
                      '&fromEventDate=' +
                      raceWizardModel.queryStartDate +
                      '&toEventDate=' +
                      raceWizardModel.queryEndDate +
                      '&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true'
                  )
                : encodeURIComponent(
                    clubModel.eventor.entriesUrl +
                      '?organisationIds=' +
                      clubModel.raceClubs.selectedClub?.eventorOrganisationId +
                      '&eventIds=' +
                      raceWizardModel.selectedEventorId +
                      '&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true'
                  ),
          },
          true
        );
        setProcessed((prev) => prev + 1);
        setCurrentEvent(t('results.loadEvent'));

        const noEntriesJson: { Event: IEventorEvent[] } = { Event: [] };

        if (raceWizardModel.selectedEventorId != null) {
          const eventsJson: IEventorEvents = await PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.eventsUrl +
                  '?organisationIds=' +
                  clubModel.eventor.oRingenOrganisationId +
                  '&eventIds=' +
                  raceWizardModel.selectedEventorId +
                  '&includeAttributes=true'
              ),
            },
            true
          );
          if (Array.isArray(eventsJson.Event)) {
            eventsJson.Event.forEach((e) => noEntriesJson.Event.push(e));
          } else if (eventsJson.Event != null) noEntriesJson.Event.push(eventsJson.Event);
        }
        setProcessed((prev) => prev + 1);

        if (raceWizardModel.queryForEventWithNoEntry) {
          setCurrentEvent(t('results.loadCompetitors'));
          const competitorListJson: IEventorCompetitors = await PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor?.competitorsUrl +
                  '?organisationId=' +
                  clubModel.raceClubs?.selectedClub?.eventorOrganisationId
              ),
            },
            true
          );

          if (competitorListJson && Array.isArray(competitorListJson.Competitor)) {
            setTotal((prev) => prev + (competitorListJson.Competitor as IEventorCompetitor[]).length);
            const competitorsJsons: IEventorCompetitorResult[] = [];
            for (const c of competitorListJson.Competitor) {
              setCurrentEvent(
                stringFormat(
                  t('results.loadCompetitor'),
                  `${c.Person?.PersonName?.Given} ${c.Person?.PersonName?.Family}`
                )
              );
              const competitorResults = (await PostJsonData(
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
              )) as IEventorCompetitorResult;
              competitorsJsons.push(competitorResults);
              await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 200)));
              setProcessed((prev) => prev + 1);
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
                        cr.PersonResult.Organisation.OrganisationId === clubModel.eventor?.organisationId.toString() ||
                        (cr.PersonResult.Organisation.OrganisationId ===
                          clubModel.eventor?.districtOrganisationId.toString() &&
                          clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                            parseInt(cr.PersonResult.Person.PersonId)
                          ) != null))
                    ) {
                      isCurrentClub = true;
                    }
                    if (cr.TeamResult != null) {
                      const preTeamResults = Array.isArray(cr.TeamResult)
                        ? cr.TeamResult.filter(
                            (teamResult) =>
                              teamResult.RaceResult == null ||
                              teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                          )
                        : cr.TeamResult.RaceResult == null ||
                          cr.TeamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
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
                          org.OrganisationId === clubModel.eventor?.organisationId.toString() ||
                          org.OrganisationId === clubModel.eventor?.districtOrganisationId.toString()
                      );
                    }
                  });

                  if (isCurrentClub && !noEntriesJson.Event.some((e) => e.EventId === r.Event.EventId)) {
                    noEntriesJson.Event.push(r.Event);
                  }
                });
              }
            });
          }
        }

        setCurrentEvent(t('results.loadOringenEvents'));
        const oringenEventsJson: IEventorEvents = await PostJsonData(
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
        setProcessed((prev) => prev + 1);
        setCurrentEvent(t('results.calculateResults'));

        let entries: IEventorEntry[] = [];
        let oringenEvents: IEventorEvent[] = [];
        let noEntriesEvents: IEventorEvent[] = [];
        if (entriesJson != null) {
          if (Array.isArray(entriesJson.Entry)) entries = entriesJson.Entry;
          else entries = entriesJson.Entry ? [entriesJson.Entry] : [];
        }
        if (oringenEventsJson != null && oringenEventsJson.Event != null) {
          if (Array.isArray(oringenEventsJson.Event)) oringenEvents = oringenEventsJson.Event;
          else oringenEvents = oringenEventsJson.Event ? [oringenEventsJson.Event] : [];
        }
        if (noEntriesJson != null && noEntriesJson.Event != null) {
          if (Array.isArray(noEntriesJson.Event)) noEntriesEvents = noEntriesJson.Event;
          else noEntriesEvents = noEntriesJson.Event ? [noEntriesJson.Event] : [];
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
            let entryEventName = '';
            if (entryEvent == null) {
              entryEvent = oringenEvents.find((e) =>
                Array.isArray(e.EventRace)
                  ? e.EventRace.map((er) => er.EventRaceId).includes(eventRace.EventRaceId)
                  : e.EventRace.EventRaceId === eventRace.EventRaceId
              );
            }
            if (entryEvent) {
              entryEventName =
                entryEvent.Name +
                (JSON.stringify(eventRace.Name) === JSON.stringify({}) || !eventRace.Name ? '' : ', ' + eventRace.Name);
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
              name: entryEventName,
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
                existInEventor: e.eventorId > 0,
                isRelay: e.isRelay,
              }),
              existInEventor: e.eventorId > 0,
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
      } catch (e: any) {
        message.error(e.message);
        onFailed && onFailed();
      }
    };

    fetchData().catch(console.error);
  }, []);

  useEffect(() => {
    setSelectedRowKeys([]);
    setEvents((oldEvents) =>
      raceWizardModel.queryIncludeExisting
        ? oldEvents.map(
            (e): IResultEvent => ({
              ...e,
              alreadySaved:
                e.alreadySaved || (e.eventorRaceId != null && raceWizardModel.importedIds.includes(e.eventorRaceId)),
            })
          )
        : oldEvents.filter((e) => !e.eventorRaceId || !raceWizardModel.importedIds.includes(e.eventorRaceId))
    );
  }, [raceWizardModel.importedIds.length]);

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
  ) : visible && total > 0 ? (
    <SpinnerDiv>
      <Progress type="circle" percent={(100 * processed) / total} format={() => `${processed}/${total}`} />
      <div>{currentEvent}...</div>
      <Spin size="large" />
    </SpinnerDiv>
  ) : visible ? (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  ) : null;
});

export default ResultWizardStep1ChooseRace;
