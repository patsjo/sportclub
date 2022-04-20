import { Spin } from 'antd';
import { IChildContainerProps } from 'components/dashboard/columns/mapNodesToColumns';
import { observer } from 'mobx-react';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import {
  IEventorClassPersonStart,
  IEventorClassTeamStart,
  IEventorCompetitor,
  IEventorEventClasses,
  IEventorResults,
  IEventorStarts,
} from 'utils/responseEventorInterfaces';
import { IClubViewResultResponse } from 'utils/responseInterfaces';
import { failedReasons } from 'utils/resultConstants';
import { PostJsonData } from '../../utils/api';
import { FormatTime, TimeDiff } from '../../utils/resultHelper';
import FadeOutItem from '../fadeOutItem/FadeOutItem';

const ContentHolder = styled.div``;

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const EventTime = styled.div`
  font-size: 10px;
  font-weight: normal;
  text-align: left;
  text-color: #606060;
`;

const EventHeader = styled.div`
  font-size: 14px;
  font-weight: bolder;
  text-align: left;
`;

const EventorUrl = styled.a`
  color: black;
  cursor: pointer;
`;

const StyledTable = styled.table`
  border-spacing: 0px;
  font-size: 12px;
  width: 100%;
`;
const StyledTableRow = styled.tr`
  font-weight: ${(props: { isTeam?: boolean }) => (props.isTeam ? 'bold' : 'unset')};
`;
const StyledTableBody = styled.tbody``;
const StyledTableDataName = styled.td`
  padding-left: 0px;
  padding-right: 4px;
  width: 60%;
  white-space: nowrap;
  text-overflow: ellipses;
`;
const StyledTableDataClass = styled.td`
  padding-left: 0px;
  padding-right: 4px;
  width: 20%;
  white-space: nowrap;
`;
const StyledTableDataStart = styled.td`
  padding-left: 0px;
  padding-right: 4px;
  width: 20%;
  white-space: nowrap;
`;

export interface IEventDashboardObject {
  eventId?: number;
  eventorId: string;
  eventorRaceId: string;
  name: string;
  date: string;
  statusId: number;
  Competitors: IEventorCompetitor[];
}

interface IEventDashboardCompetitorResult {
  numberOfStarts?: number;
  position: number;
  time: string;
  timeDiff: string;
}
interface IEventDashboardCompetitorStart {
  numberOfEntries?: number;
  time: string;
}
interface IEventDashboardCompetitor {
  key: string;
  isTeam?: boolean;
  firstName: string;
  lastName: string;
  className: string;
  result?: IEventDashboardCompetitorResult;
  start?: IEventDashboardCompetitorStart;
}

interface IEventRaceProps extends IChildContainerProps {
  header: string;
  date: string;
  eventObject: IEventDashboardObject;
  ref?: React.ForwardedRef<HTMLDivElement>;
}
const EventRace = observer(({ header, date, eventObject, ref }: IEventRaceProps) => {
  const { clubModel } = useMobxStore();
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [competitors, setCompetitors] = useState<IEventDashboardCompetitor[]>([]);
  const [showStart, setShowStart] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const eventorModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'Eventor'), []);

  const loadFromClubResult = useCallback(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;

    PostJsonData(url, { iType: 'EVENT', iEventId: eventObject.eventId }, true)
      .then((editResultJson: IClubViewResultResponse) => {
        if (editResultJson.results && editResultJson.results.length > 0) {
          const competitors = editResultJson.results
            .filter((result) => !result.failedReason)
            .sort((a, b) => (a.position! > b.position! ? 1 : a.position! < b.position! ? -1 : 0))
            .map(
              (result): IEventDashboardCompetitor => ({
                key: `eventResultID#${eventObject.eventId}-${result.resultId}`,
                className: result.className,
                firstName: result.firstName!,
                lastName: result.lastName!,
                result: {
                  numberOfStarts: result.nofStartsInClass!,
                  position: result.position!,
                  time: FormatTime(result.competitorTime)!,
                  timeDiff: TimeDiff(
                    result.winnerTime === result.competitorTime && result.secondTime
                      ? result.secondTime
                      : result.winnerTime,
                    result.competitorTime,
                    true
                  ),
                },
              })
            );

          setCompetitors(competitors);
          setShowResult(true);
        } else if (editResultJson.teamResults && editResultJson.teamResults.length > 0) {
          const competitors = editResultJson.teamResults
            .filter(
              (result) =>
                result.failedReason !== failedReasons.NotStarted && result.teamFailedReason !== failedReasons.NotStarted
            )
            .sort((a, b) =>
              (a.teamFailedReason ?? failedReasons.Finished) === failedReasons.Finished &&
              (b.teamFailedReason ?? failedReasons.Finished) !== failedReasons.Finished
                ? 1
                : (a.teamFailedReason ?? failedReasons.Finished) !== failedReasons.Finished &&
                  (b.teamFailedReason ?? failedReasons.Finished) === failedReasons.Finished
                ? -1
                : (a.totalPosition ?? 0) > (b.totalPosition ?? 0)
                ? 1
                : (a.totalPosition ?? 0) < (b.totalPosition ?? 0)
                ? -1
                : (a.className ?? '').localeCompare(b.className ?? '') !== 0
                ? (a.className ?? '').localeCompare(b.className ?? '')
                : (a.stage ?? 0) > (b.stage ?? 0)
                ? 1
                : (a.stage ?? 0) < (b.stage ?? 0)
                ? -1
                : 0
            )
            .map((result): IEventDashboardCompetitor[] => [
              {
                key: `teamEventResultID#${eventObject.eventId}-${result.className}-${result.teamName}`,
                isTeam: true,
                className: result.className,
                firstName: result.teamName!,
                lastName: '',
                result: {
                  numberOfStarts: result.totalNofStartsInClass!,
                  position: result.totalPosition!,
                  time: '',
                  timeDiff: FormatTime(result.totalTimeBehind)!,
                },
              },
              {
                key: `eventResultID#${eventObject.eventId}-${result.teamResultId}`,
                className: `${t('results.Leg')} ${result.stage}`,
                firstName: result.firstName!,
                lastName: result.lastName!,
                result: {
                  numberOfStarts: result.nofStartsInClass!,
                  position: result.position!,
                  time: FormatTime(result.competitorTime)!,
                  timeDiff: TimeDiff(
                    result.winnerTime === result.competitorTime && result.secondTime
                      ? result.secondTime
                      : result.winnerTime,
                    result.competitorTime,
                    true
                  ),
                },
              },
            ])
            .reduce((a: IEventDashboardCompetitor[], b) => [...a, ...b], [] as IEventDashboardCompetitor[])
            .filter((value, index, self) => self.findIndex((v) => v.key === value.key) === index);

          setCompetitors(competitors);
          setShowResult(true);
        } else {
          setCompetitors([]);
          setShowResult(false);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const loadFromEventor = useCallback(() => {
    if (!clubModel.eventor?.classesUrl || !clubModel.eventor?.startUrl || !clubModel.eventor.organisationId) return;

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
    const classPromise = PostJsonData(
      clubModel.eventorCorsProxy,
      {
        csurl: encodeURIComponent(
          clubModel.eventor.classesUrl + '?eventId=' + eventObject.eventorId + '&includeEntryFees=true'
        ),
        cache: true,
      },
      false
    );
    const startPromise =
      eventObject.statusId < 8
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.startUrl +
                  '?eventId=' +
                  eventObject.eventorId +
                  '&organisationIds=' +
                  clubModel.eventor.organisationId
              ),
              cache: true,
            },
            false
          )
        : new Promise((resolve) => resolve(undefined));
    const resultPromise =
      eventObject.statusId >= 8 && eventObject.statusId !== 10
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.resultUrl +
                  '?eventId=' +
                  eventObject.eventorId +
                  '&organisationIds=' +
                  clubModel.eventor.organisationId +
                  '&top=0&includeSplitTimes=true'
              ),
              cache: true,
            },
            false
          )
        : new Promise((resolve) => resolve(undefined));

    Promise.all([classPromise, startPromise, resultPromise])
      .then(([classJson, startJson, resultJson]: [IEventorEventClasses, IEventorStarts, IEventorResults]) => {
        let raceCompetitors: IEventDashboardCompetitor[] = [];

        if (startJson != null && startJson.ClassStart != null) {
          const ClassStarts = Array.isArray(startJson.ClassStart) ? startJson.ClassStart : [startJson.ClassStart];
          ClassStarts.forEach((classStart) => {
            let className = '';
            let numberOfEntries: number | undefined = undefined;
            if (classJson != null) {
              const currentClass = Array.isArray(classJson.EventClass)
                ? classJson.EventClass.find((evtClass) => evtClass.EventClassId === classStart.EventClassId)
                : classJson.EventClass;
              if (currentClass?.ClassShortName) className = currentClass.ClassShortName;

              if (Array.isArray(currentClass?.ClassRaceInfo)) {
                const classRaceInfo = currentClass?.ClassRaceInfo.find(
                  (raceInfo) => raceInfo.EventRaceId === eventObject.eventorRaceId
                );
                numberOfEntries =
                  classRaceInfo != null ? parseInt(classRaceInfo['@attributes'].noOfEntries) : undefined;
              } else if (currentClass !== undefined) {
                numberOfEntries = parseInt(currentClass['@attributes'].numberOfEntries);
              }
            }

            if (classStart.PersonStart != null) {
              const personStarts: IEventorClassPersonStart[] = Array.isArray(classStart.PersonStart)
                ? classStart.PersonStart.filter(
                    (personStart) =>
                      personStart.RaceStart == null || personStart.RaceStart.EventRaceId === eventObject.eventorRaceId
                  )
                : [classStart.PersonStart];
              personStarts.forEach((personStart, i) => {
                const start = personStart.RaceStart != undefined ? personStart.RaceStart.Start : personStart.Start;
                raceCompetitors.push({
                  key: `eventorStartID#${eventObject.eventorId}-${start?.StartId || start?.BibNumber}`,
                  className: className,
                  firstName: personStart.Person.PersonName.Given,
                  lastName: personStart.Person.PersonName.Family,
                  start: {
                    numberOfEntries: numberOfEntries,
                    time: start?.StartTime?.Clock ?? '',
                  },
                });
              });
            }
            if (classStart.TeamStart != null) {
              const teamStarts: IEventorClassTeamStart[] = Array.isArray(classStart.TeamStart)
                ? classStart.TeamStart
                : [classStart.TeamStart];
              let startTime = '';
              teamStarts.forEach((teamStart, i) => {
                raceCompetitors.push({
                  key: `eventorTeamStartID#${eventObject.eventorId}-${teamStart?.BibNumber}`,
                  className: className,
                  firstName: teamStart.TeamName,
                  lastName: '',
                  start: {
                    numberOfEntries: numberOfEntries,
                    time: teamStart?.StartTime?.Clock ?? startTime,
                  },
                });
                !startTime && (startTime = teamStart?.StartTime?.Clock ?? '');
              });
            }
          });
          raceCompetitors = raceCompetitors.sort((a, b) =>
            a.start!.time! > b.start!.time! ? 1 : a.start!.time! < b.start!.time! ? -1 : 0
          );
        }
        if (resultJson != null && resultJson.ClassResult != null) {
          const ClassResults = Array.isArray(resultJson.ClassResult)
            ? resultJson.ClassResult
            : [resultJson.ClassResult];
          ClassResults.forEach((classResult) => {
            let className = '';
            let numberOfStarts: number | undefined = undefined;
            if (classJson != null) {
              const currentClass = Array.isArray(classJson.EventClass)
                ? classJson.EventClass.find((evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId)
                : classJson.EventClass;

              if (currentClass?.ClassShortName) className = currentClass.ClassShortName;

              if (Array.isArray(currentClass?.ClassRaceInfo)) {
                const classRaceInfo = currentClass?.ClassRaceInfo.find(
                  (raceInfo) => raceInfo.EventRaceId === eventObject.eventorRaceId
                );
                numberOfStarts = classRaceInfo != null ? parseInt(classRaceInfo['@attributes'].noOfStarts) : undefined;
              } else if (currentClass !== undefined && currentClass['@attributes'].noOfStarts !== undefined) {
                numberOfStarts = parseInt(currentClass['@attributes'].noOfStarts);
              }
            }

            if (classResult.PersonResult != null) {
              const personResults = Array.isArray(classResult.PersonResult)
                ? classResult.PersonResult.filter(
                    (personResult) =>
                      personResult.RaceResult == null ||
                      personResult.RaceResult.EventRaceId === eventObject.eventorRaceId
                  )
                : classResult.PersonResult.RaceResult == null ||
                  classResult.PersonResult.RaceResult.EventRaceId === eventObject.eventorRaceId
                ? [classResult.PersonResult]
                : [];
              personResults.forEach((personResult, i) => {
                const result = personResult.RaceResult != null ? personResult.RaceResult.Result : personResult.Result;
                if (result?.CompetitorStatus['@attributes'].value === 'OK') {
                  raceCompetitors.push({
                    key: `eventorResultID#${eventObject.eventorId}-${result?.ResultId || result?.CCardId}`,
                    className: className,
                    firstName: personResult.Person.PersonName.Given,
                    lastName: personResult.Person.PersonName.Family,
                    result: {
                      position: parseInt(result?.ResultPosition ?? '0'),
                      numberOfStarts: numberOfStarts,
                      time: result?.Time ?? '',
                      timeDiff: result?.ResultPosition === '1' ? '' : result?.TimeDiff ?? '',
                    },
                  });
                }
              });
            }
            // if (classResult.TeamStart != undefined) {
            //   const TeamStarts = Array.isArray(classResult.TeamStart)
            //     ? classResult.TeamStart
            //     : [classResult.TeamStart];
            //   TeamStarts.forEach(teamStart => {
            //     eventObject.Competitors.push({
            //       Person: {
            //         PersonName: { Given: teamStart.TeamName, Family: "" }
            //       },
            //       EntryClass: currentClass,
            //       Start: { StartTime: teamStart.StartTime }
            //     });
            //   });
            // }
          });
          raceCompetitors = raceCompetitors.sort((a, b) =>
            a.result!.position! > b.result!.position! ? 1 : a.result!.position! < b.result!.position! ? -1 : 0
          );
        }

        const currentDate = moment().format('YYYY-MM-DD');
        setCompetitors(raceCompetitors);
        setShowStart(startJson != null && raceCompetitors.length > 0 && date >= currentDate);
        setShowResult(resultJson != null && raceCompetitors.length > 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (eventObject.eventId != null) {
      loadFromClubResult();
    } else {
      loadFromEventor();
    }
  }, []);

  const EventItem =
    loaded && showStart ? (
      <StyledTable>
        <StyledTableBody>
          {competitors.map((competitor) => (
            <StyledTableRow key={competitor.key}>
              <StyledTableDataName>{competitor.firstName + ' ' + competitor.lastName}</StyledTableDataName>
              <StyledTableDataClass>
                {competitor.className +
                  (competitor.start?.numberOfEntries != null ? ' (' + competitor.start.numberOfEntries + ')' : '')}
              </StyledTableDataClass>
              <StyledTableDataStart>{competitor.start?.time}</StyledTableDataStart>
            </StyledTableRow>
          ))}
        </StyledTableBody>
      </StyledTable>
    ) : loaded && showResult ? (
      <StyledTable>
        <StyledTableBody>
          {competitors.map((competitor) => (
            <StyledTableRow key={competitor.key} isTeam={competitor.isTeam}>
              <StyledTableDataName>
                {competitor.result?.position + '. ' + competitor.firstName + ' ' + competitor.lastName}
              </StyledTableDataName>
              <StyledTableDataClass>
                {competitor.className +
                  (competitor.result?.numberOfStarts != null ? ' (' + competitor.result.numberOfStarts + ')' : '')}
              </StyledTableDataClass>
              <StyledTableDataStart>
                {competitor.result?.position === 1 && competitor.result?.timeDiff
                  ? competitor.result?.time + ' (' + competitor.result?.timeDiff + ')'
                  : competitor.result?.position === 1
                  ? competitor.result.time
                  : competitor.result?.time +
                    (competitor.result?.timeDiff ? ' (+' + competitor.result?.timeDiff + ')' : '')}
              </StyledTableDataStart>
            </StyledTableRow>
          ))}
        </StyledTableBody>
      </StyledTable>
    ) : !loaded ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;

  const startlistUrl = `https://eventor.orientering.se/Events/StartList?eventId=${eventObject.eventorId}&eventRaceId=${eventObject.eventorRaceId}&organisationId=${clubModel.eventor?.organisationId}`;
  const resultsUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${eventObject.eventorId}&eventRaceId=${eventObject.eventorRaceId}&organisationId=${clubModel.eventor?.organisationId}`;
  const url = !eventObject.eventorId
    ? undefined
    : showStart
    ? startlistUrl
    : showResult
    ? resultsUrl
    : `https://eventor.orientering.se/Events/Show/${eventObject.eventorId}`;
  const headerText =
    (loaded && showStart ? `${t('eventor.Startlist')} - ` : loaded && showResult ? `${t('eventor.Result')} - ` : '') +
    header;

  const EventContent = (isModal: boolean) => (
    <ContentHolder>
      <EventHeader>
        {url && isModal ? (
          <EventorUrl href={url} target="_blank">
            {headerText}
          </EventorUrl>
        ) : (
          headerText
        )}
      </EventHeader>
      <EventTime>{date}</EventTime>
      {EventItem}
    </ContentHolder>
  );

  return EventItem != null && eventorModule ? (
    <FadeOutItem
      key={`FadeOutItem#EventorRaceId#${eventObject.eventorRaceId}`}
      ref={ref}
      maxHeight={100}
      module={eventorModule}
      content={EventContent(false)}
      modalContent={EventContent(true)}
      modalColumns={1}
    />
  ) : null;
});

export default EventRace;
