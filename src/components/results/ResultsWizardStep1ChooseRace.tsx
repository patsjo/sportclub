import { LeftOutlined, ReloadOutlined } from '@ant-design/icons';
import useResizeObserver from '@react-hook/resize-observer';
import { Alert, Button, Spin, TableProps } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostJsonData } from '../../utils/api';
import { dateFormat } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
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
  IEventorTeamResult
} from '../../utils/responseEventorInterfaces';
import { IEventViewResultResponse } from '../../utils/responseInterfaces';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import DeleteSavedRaceButton from './DeleteSavedRaceButton';
import {
  ExpandableDetails,
  ILoadWarning,
  LoadProgress,
  loadWarningShort,
  LoadWarningList,
  toLoadWarning,
  useLoadProgress
} from './LoadProgress';

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
  /** Eventor could not be reached, the saved race is opened as a race without Eventor and can only be edited */
  editOnly: boolean;
}

/** The key of a row is what is chosen. A race that can only be edited is chosen without its race in Eventor. */
const withKey = (event: Omit<IResultEvent, 'key'>): IResultEvent => {
  const key: IResultEventKey = {
    selectedEventorId: !event.editOnly && event.eventorId > 0 ? event.eventorId : -1,
    selectedEventorRaceId: !event.editOnly && event.eventorRaceId != null ? event.eventorRaceId : -1,
    selectedEventId: event.eventId ?? -1,
    alreadySaved: event.alreadySaved,
    existInEventor: !event.editOnly && event.existInEventor,
    isRelay: event.isRelay
  };
  return { ...event, key: JSON.stringify(key) };
};

interface IResultWizardStep1ChooseRaceProps {
  height: number;
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed?: () => void;
}
const ResultWizardStep1ChooseRace = observer(
  ({ height, visible, onValidate, onFailed }: IResultWizardStep1ChooseRaceProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [loaded, setLoaded] = useState(false);
    const [events, setEvents] = useState<IResultEvent[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>();
    // What the load is doing and how far it has come, an error is shown with the choice to go back or load again
    const { tasks: loadTasks, startedAt: loadStartedAt, api: progress } = useLoadProgress();
    const [loadError, setLoadError] = useState<string>();
    // Eventor failed, only the saved races are shown
    const [eventorWarning, setEventorWarning] = useState<ILoadWarning>();
    const [warningElement, setWarningElement] = useState<HTMLDivElement | null>(null);
    const [warningHeight, setWarningHeight] = useState(0);
    useResizeObserver(warningElement, entry => setWarningHeight((entry.target as HTMLElement).offsetHeight));
    const [reloadCount, setReloadCount] = useState(0);

    const onSelectChange = useCallback(
      (keys: React.Key[]) => {
        const selected: IResultEventKey =
          Array.isArray(keys) && keys.length > 0
            ? JSON.parse(keys[0] as string)
            : JSON.parse(keys as unknown as string);

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
      },
      [onValidate, raceWizardModel]
    );

    useEffect(() => {
      const fetchData = async () => {
        setLoaded(false);
        setLoadError(undefined);
        setEventorWarning(undefined);
        const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
        if (!url || !clubModel.raceClubs || !clubModel.eventor) return;
        const loadCompetitors = raceWizardModel.queryForEventWithNoEntry && raceWizardModel.selectedEventorId == null;
        progress.reset([
          { key: 'saved', title: t('results.LoadTaskSavedEvents') },
          { key: 'entries', title: t('results.LoadTaskClubEntries') },
          ...(raceWizardModel.selectedEventorId != null ? [{ key: 'event', title: t('results.LoadTaskEvent') }] : []),
          ...(loadCompetitors ? [{ key: 'competitors', title: t('results.LoadTaskCompetitors') }] : []),
          { key: 'oringen', title: t('results.LoadTaskOringen') },
          { key: 'process', title: t('results.LoadTaskEvents') }
        ]);

        const queryData =
          raceWizardModel.selectedEventorId == null
            ? {
                iType: 'EVENTS',
                iClubId: clubModel.raceClubs.selectedClub?.clubId,
                iFromDate: dayjs(raceWizardModel.queryStartDate, dateFormat).add(-7, 'days').format(dateFormat),
                iToDate: dayjs(raceWizardModel.queryEndDate, dateFormat).add(7, 'days').format(dateFormat)
              }
            : {
                iType: 'EVENTS',
                iClubId: clubModel.raceClubs.selectedClub?.clubId,
                iEventorId: raceWizardModel.selectedEventorId
              };

        try {
          progress.start('saved');
          const alreadySavedEventsJson = await PostJsonData<IEventViewResultResponse[]>(
            url,
            queryData,
            true,
            sessionModel.authorizationHeader
          );
          progress.finish('saved', t('results.LoadNofEvents', { count: alreadySavedEventsJson?.length ?? 0 }));

          let entriesJson: IEventorEntries | undefined;
          let oringenEventsJson: IEventorEvents | undefined;
          const noEntriesJson: { Event: IEventorEvent[] } = { Event: [] };
          // The task in Eventor that is loading, to tell which one failed
          let eventorTask = 'entries';
          // Eventor failed: the races already saved are shown, and they can only be edited
          let eventorFailure: ILoadWarning | undefined;
          try {
            progress.start('entries');
            entriesJson = await PostJsonData<IEventorEntries>(
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
                      )
              },
              true
            );
            progress.finish(
              'entries',
              t('results.LoadNofEntries', {
                count: Array.isArray(entriesJson?.Entry) ? entriesJson.Entry.length : entriesJson?.Entry ? 1 : 0
              })
            );

            if (raceWizardModel.selectedEventorId != null) {
              eventorTask = 'event';
              progress.start('event');
              const eventsJson = await PostJsonData<IEventorEvents>(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor.eventsUrl +
                      '?eventIds=' +
                      raceWizardModel.selectedEventorId +
                      '&includeAttributes=true'
                  )
                },
                true
              );
              if (Array.isArray(eventsJson?.Event)) {
                eventsJson.Event.forEach(e => noEntriesJson.Event.push(e));
              } else if (eventsJson?.Event != null) noEntriesJson.Event.push(eventsJson.Event);
              progress.finish('event');
            }

            if (loadCompetitors) {
              eventorTask = 'competitors';
              progress.start('competitors');
              const competitorListJson = await PostJsonData<IEventorCompetitors>(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor?.competitorsUrl +
                      '?organisationId=' +
                      clubModel.raceClubs?.selectedClub?.eventorOrganisationId
                  )
                },
                true
              );

              if (competitorListJson && Array.isArray(competitorListJson.Competitor)) {
                const competitorList = competitorListJson.Competitor as IEventorCompetitor[];
                const competitorsJsons: IEventorCompetitorResult[] = [];
                for (const [index, c] of competitorList.entries()) {
                  progress.progress(
                    'competitors',
                    index,
                    competitorList.length,
                    `${c.Person?.PersonName?.Given} ${c.Person?.PersonName?.Family}`
                  );
                  const competitorResults = await PostJsonData<IEventorCompetitorResult>(
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
                      )
                    },
                    true
                  );
                  if (competitorResults) competitorsJsons.push(competitorResults);
                  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200)));
                }

                competitorsJsons.forEach(c => {
                  if (c.ResultList) {
                    if (!Array.isArray(c.ResultList)) {
                      c.ResultList = [c.ResultList];
                    }
                    c.ResultList.forEach(r => {
                      if (!Array.isArray(r.ClassResult)) {
                        r.ClassResult = [r.ClassResult];
                      }
                      let isCurrentClub = false;
                      r.ClassResult.forEach(cr => {
                        if (Array.isArray(cr.PersonResult)) {
                          cr.PersonResult = cr.PersonResult[0];
                        }
                        if (
                          cr.PersonResult &&
                          (!cr.PersonResult.Organisation ||
                            cr.PersonResult.Organisation.OrganisationId ===
                              clubModel.eventor?.organisationId.toString() ||
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
                                teamResult =>
                                  teamResult.RaceResult == null ||
                                  teamResult.RaceResult.EventRaceId ===
                                    raceWizardModel.selectedEventorRaceId?.toString()
                              )
                            : cr.TeamResult.RaceResult == null ||
                                cr.TeamResult.RaceResult.EventRaceId ===
                                  raceWizardModel.selectedEventorRaceId?.toString()
                              ? [cr.TeamResult]
                              : [];

                          const teamResults: IEventorTeamResult[] = preTeamResults.map(pre =>
                            pre.RaceResult?.TeamMemberResult != null ? pre.RaceResult : (pre as IEventorTeamResult)
                          );
                          const teamOrganisations = teamResults
                            .reduce(
                              (a: IEventorOrganisation[], b) => a.concat(b.Organisation),
                              [] as IEventorOrganisation[]
                            )
                            .filter(org => !!org);
                          isCurrentClub = teamOrganisations.some(
                            org =>
                              org.OrganisationId === clubModel.eventor?.organisationId.toString() ||
                              org.OrganisationId === clubModel.eventor?.districtOrganisationId.toString()
                          );
                        }
                      });

                      if (isCurrentClub && !noEntriesJson.Event.some(e => e.EventId === r.Event.EventId)) {
                        noEntriesJson.Event.push(r.Event);
                      }
                    });
                  }
                });
              }
            }

            if (loadCompetitors) progress.finish('competitors');
            eventorTask = 'oringen';
            progress.start('oringen');
            oringenEventsJson = await PostJsonData<IEventorEvents>(
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
                )
              },
              true
            );
            progress.finish('oringen');
          } catch (error) {
            // Without the saved races there is nothing to show, the load fails
            if (!raceWizardModel.queryIncludeExisting) throw error;
            const title = progress.warn(eventorTask, `${loadWarningShort(t, error)}, ${t('results.LoadReplaced')}`);
            eventorFailure = {
              ...toLoadWarning(t, eventorTask, title, error),
              resolvedBy: t('results.LoadResolvedBy', {
                title: progress.title('saved'),
                detail: t('results.LoadSavedEditOnly')
              })
            };
            progress.skipWaiting();
          }
          progress.start('process');

          // The saved races of the period, the query also has the week before and after
          const inQueryPeriod = (date: string) =>
            (dayjs(raceWizardModel.queryStartDate).isSame(date) ||
              dayjs(raceWizardModel.queryStartDate).isBefore(date)) &&
            (dayjs(raceWizardModel.queryEndDate).isSame(date) || dayjs(raceWizardModel.queryEndDate).isAfter(date));

          if (eventorFailure) {
            // Opened as races without Eventor, nothing can be fetched again or completed from Eventor
            const savedEvents = (alreadySavedEventsJson ?? [])
              .filter(saved => raceWizardModel.selectedEventorId != null || inQueryPeriod(saved.date))
              .map(saved =>
                withKey({
                  ...saved,
                  existInEventor: saved.eventorId > 0,
                  alreadySaved: true,
                  alreadySavedEventsNotInEventor: true,
                  editOnly: true
                })
              )
              .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
            progress.finish('process', t('results.LoadNofEvents', { count: savedEvents.length }));
            setEvents(savedEvents);
            setEventorWarning(eventorFailure);
            setSelectedRowKeys(undefined);
            setLoaded(true);
            return;
          }

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
            ...flatten(entries.map(entry => entry.Event.EventRace)),
            ...flatten(oringenEvents.map(event => event.EventRace))
          ]
            .filter(eventRace => eventRace.EventRaceId != null)
            .filter((evt, i, list) => i === list.findIndex(listEvt => evt.EventRaceId === listEvt.EventRaceId))
            .map((eventRace): IResultEvent => {
              let entryEvent = entries.find(e =>
                Array.isArray(e.Event.EventRace)
                  ? e.Event.EventRace.map(er => er.EventRaceId).includes(eventRace.EventRaceId)
                  : e.EventRaceId === eventRace.EventRaceId
              )?.Event;
              let entryEventName = '';
              if (entryEvent == null) {
                entryEvent = oringenEvents.find(e =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map(er => er.EventRaceId).includes(eventRace.EventRaceId)
                    : e.EventRace.EventRaceId === eventRace.EventRaceId
                );
              }
              if (entryEvent) {
                entryEventName =
                  entryEvent.Name +
                  (JSON.stringify(eventRace.Name) === JSON.stringify({}) || !eventRace.Name
                    ? ''
                    : ', ' + eventRace.Name);
              }
              const alreadySaved = alreadySavedEventsJson?.find(
                saved =>
                  saved.eventorId.toString() === entryEvent?.EventId &&
                  saved.eventorRaceId!.toString() === eventRace.EventRaceId
              );

              const isRelay =
                entryEvent != null &&
                entryEvent['@attributes'] &&
                entryEvent['@attributes'].eventForm &&
                entryEvent['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0;
              return withKey({
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
                isRelay: !!isRelay,
                editOnly: false
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
          events = events.filter(event => event.eventStatusId && ['9', '11'].includes(event.eventStatusId));
          const alreadySavedEventsNotInEventor =
            alreadySavedEventsJson
              ?.filter(
                saved =>
                  inQueryPeriod(saved.date) &&
                  !events.some(
                    event => saved.eventorId === event.eventorId && saved.eventorRaceId === event.eventorRaceId
                  )
              )
              .map(e =>
                withKey({
                  ...e,
                  existInEventor: e.eventorId > 0,
                  alreadySaved: true,
                  alreadySavedEventsNotInEventor: true,
                  editOnly: false
                })
              ) ?? [];
          if (!raceWizardModel.queryIncludeExisting) {
            events = events.filter(event => !event.alreadySaved);
          } else {
            events = [...events, ...alreadySavedEventsNotInEventor];
          }
          events = events.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
          progress.finish('process', t('results.LoadNofEvents', { count: events.length }));
          setEvents(events);
          setEventorWarning(undefined);
          setSelectedRowKeys(undefined);
          setLoaded(true);
        } catch (e) {
          const errorMessage =
            e instanceof Error
              ? e.message
              : typeof e === 'string'
                ? e
                : ((e as { message?: string } | undefined)?.message ?? t('results.LoadRaceUnknownError'));
          progress.fail(errorMessage);
          setLoadError(errorMessage);
        }
      };

      if (!loaded && visible) fetchData().catch(console.error);
    }, [
      clubModel.eventor,
      clubModel.eventorCorsProxy,
      clubModel.modules,
      clubModel.raceClubs,
      loaded,
      progress,
      reloadCount,
      raceWizardModel.queryEndDate,
      raceWizardModel.queryForEventWithNoEntry,
      raceWizardModel.queryIncludeExisting,
      raceWizardModel.queryStartDate,
      raceWizardModel.selectedEventorId,
      raceWizardModel.selectedEventorRaceId,
      sessionModel.authorizationHeader,
      t,
      visible
    ]);

    useEffect(() => {
      setSelectedRowKeys([]);
      setEvents(oldEvents =>
        raceWizardModel.queryIncludeExisting
          ? oldEvents
              .map((e): IResultEvent => ({
                ...e,
                // A race saved for the first time had no id (-1), as every race not yet saved. It is found by the
                // race in Eventor, otherwise the next stage of the same event was given the id of the race just
                // saved, and was opened (and saved) as that race.
                eventId:
                  raceWizardModel.importedIds.find(
                    imp =>
                      (e.eventorRaceId != null && e.eventorRaceId > 0 && imp.eventorRaceId === e.eventorRaceId) ||
                      (imp.prevEventId != null && imp.prevEventId > 0 && imp.prevEventId === e.eventId)
                  )?.eventId ?? e.eventId,
                alreadySaved:
                  e.alreadySaved ||
                  (e.eventorRaceId != null &&
                    raceWizardModel.importedIds.some(imp => imp.eventorRaceId === e.eventorRaceId))
              }))
              .map(withKey)
          : oldEvents.filter(
              e => !e.eventorRaceId || !raceWizardModel.importedIds.some(imp => imp.eventorRaceId === e.eventorRaceId)
            )
      );
    }, [raceWizardModel.importedIds, raceWizardModel.importedIds.length, raceWizardModel.queryIncludeExisting]);

    // A race from Eventor is still there to import, a race only saved here is gone
    const onRaceDeleted = useCallback(
      (eventId: number) => {
        raceWizardModel.removeImportedRace(eventId);
        setEvents(oldEvents =>
          oldEvents
            // Without Eventor a deleted race cannot be imported again
            .filter(e => e.eventId !== eventId || (e.existInEventor && !e.editOnly))
            .map((e): IResultEvent => {
              if (e.eventId !== eventId) return e;
              return withKey({
                ...e,
                eventId: -1,
                invoiceVerified: false,
                alreadySaved: false,
                alreadySavedEventsNotInEventor: false
              });
            })
        );
        if (raceWizardModel.selectedEventId === eventId) {
          raceWizardModel.setNumberValueOrNull('selectedEventId', null);
          setSelectedRowKeys([]);
          onValidate(false);
        }
      },
      [onValidate, raceWizardModel]
    );

    const rowSelection: TableProps<IResultEvent>['rowSelection'] = {
      selectedRowKeys,
      fixed: true,
      onChange: onSelectChange,
      type: 'radio'
    };

    const columns: TableProps<IResultEvent>['columns'] = [
      {
        title: t('results.Date'),
        dataIndex: 'date',
        key: 'date',
        ellipsis: true,
        width: 100,
        fixed: 'left'
      },
      {
        title: t('results.Time'),
        dataIndex: 'time',
        key: 'time',
        ellipsis: true,
        width: 80,
        fixed: 'left'
      },
      {
        title: t('results.Name'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        width: 200,
        fixed: 'left'
      },
      {
        title: t('results.AlreadySaved'),
        dataIndex: 'alreadySaved',
        key: 'alreadySaved',
        render: alreadySaved => (alreadySaved ? t('common.Yes') : t('common.No')),
        ellipsis: true,
        width: 110
      },
      {
        title: t('results.ExistInEventor'),
        dataIndex: 'existInEventor',
        key: 'existInEventor',
        render: existInEventor => (existInEventor ? t('common.Yes') : t('common.No')),
        ellipsis: true,
        width: 110
      },
      ...(sessionModel.isAdmin
        ? [
            {
              key: 'delete',
              width: 56,
              render: (_: unknown, record: IResultEvent) =>
                record.alreadySaved && record.eventId > 0 ? (
                  <DeleteSavedRaceButton
                    iconOnly
                    size="small"
                    eventId={record.eventId}
                    name={`${record.date}, ${record.name}`}
                    onDeleted={onRaceDeleted}
                  />
                ) : null
            }
          ]
        : [])
    ];

    return loaded && visible ? (
      <>
        {eventorWarning ? (
          <div ref={setWarningElement}>
            <Alert
              showIcon
              type="warning"
              title={t('results.LoadEventsEventorFailed')}
              description={
                <>
                  <div>{t('results.LoadEventsEventorFailedDescription')}</div>
                  <LoadWarningList warnings={[eventorWarning]} />
                </>
              }
              action={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    onValidate(false);
                    setLoaded(false);
                    setReloadCount(count => count + 1);
                  }}
                >
                  {t('results.LoadEventsEventorAgain')}
                </Button>
              }
              style={{ marginBottom: 12 }}
            />
          </div>
        ) : null}
        <StyledTable
          rowSelection={rowSelection}
          columns={columns}
          dataSource={events}
          pagination={{
            pageSize: Math.max(1, Math.trunc((height - 96 - (eventorWarning ? warningHeight : 0)) / 32)),
            hideOnSinglePage: true,
            showSizeChanger: false
          }}
          scroll={{ x: true }}
          tableLayout="fixed"
          size="middle"
          onRow={record => {
            return {
              onClick: () => onSelectChange([(record as IResultEvent).key])
            };
          }}
        />
      </>
    ) : visible && loadError ? (
      <Alert
        showIcon
        type="error"
        title={t('results.LoadEventsFailed')}
        description={
          <>
            <div>{loadError}</div>
            <ExpandableDetails>
              <LoadProgress embedded title={null} tasks={loadTasks} />
            </ExpandableDetails>
          </>
        }
        action={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onFailed ? (
              <Button icon={<LeftOutlined />} onClick={onFailed}>
                {t('common.Previous')}
              </Button>
            ) : null}
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => setReloadCount(count => count + 1)}>
              {t('results.LoadRaceAgain')}
            </Button>
          </div>
        }
      />
    ) : visible && loadTasks.length > 0 ? (
      <LoadProgress title={t('results.LoadingEvents')} tasks={loadTasks} startedAt={loadStartedAt} />
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  }
);

export default ResultWizardStep1ChooseRace;
