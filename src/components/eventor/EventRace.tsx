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

const StyledTable = styled.table`
  border-spacing: 0px;
  font-size: 12px;
  width: 100%;
`;
const StyledTableRow = styled.tr``;
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
        if (editResultJson.results) {
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
                      timeDiff: result?.TimeDiff ?? '',
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
            <StyledTableRow key={competitor.key}>
              <StyledTableDataName>
                {competitor.result?.position + '. ' + competitor.firstName + ' ' + competitor.lastName}
              </StyledTableDataName>
              <StyledTableDataClass>
                {competitor.className +
                  (competitor.result?.numberOfStarts != null ? ' (' + competitor.result.numberOfStarts + ')' : '')}
              </StyledTableDataClass>
              <StyledTableDataStart>
                {competitor.result?.position === 1
                  ? competitor.result.time
                  : competitor.result?.time + ' (+' + competitor.result?.timeDiff + ')'}
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
  const ShowEventItem =
    EventItem != null && eventorModule ? (
      <FadeOutItem
        key={`FadeOutItem#EventorRaceId#${eventObject.eventorRaceId}`}
        ref={ref}
        maxHeight={100}
        module={eventorModule}
        content={
          <ContentHolder>
            <EventHeader>
              {loaded && showStart
                ? `${t('eventor.Startlist')} - `
                : loaded && showResult
                ? `${t('eventor.Result')} - `
                : ''}
              {header}
            </EventHeader>
            <EventTime>{date}</EventTime>
            {EventItem}
          </ContentHolder>
        }
        modalContent={
          <ContentHolder>
            <EventHeader>
              {loaded && showStart
                ? `${t('eventor.Startlist')} - `
                : loaded && showResult
                ? `${t('eventor.Result')} - `
                : ''}
              {header}
            </EventHeader>
            <EventTime>{date}</EventTime>
            {EventItem}
          </ContentHolder>
        }
        modalColumns={1}
      />
    ) : null;
  return ShowEventItem;
});

export default EventRace;
