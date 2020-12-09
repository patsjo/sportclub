import React, { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { GetJsonData, PostJsonData } from '../../utils/api';
import FadeOutItem from '../fadeOutItem/FadeOutItem';
import { useTranslation } from 'react-i18next';
import withForwardedRef from '../../utils/withForwardedRef';
import { FormatTime, TimeDiff } from '../../utils/resultHelper';
import moment from 'moment';

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
  font-size: 11px;
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

// @inject("clubModel")
// @observer
const EventRace = inject('clubModel')(
  observer(({ clubModel, header, date, eventObject, forwardedRef }) => {
    const { t } = useTranslation();
    const [loaded, setLoaded] = useState(false);
    const [event, setEvent] = useState();
    const [showStart, setShowStart] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const loadFromClubResult = useCallback(() => {
      const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;

      PostJsonData(url, { iType: 'EVENT', iEventId: eventObject.eventId }, true)
        .then(async (editResultJson) => {
          eventObject.Competitors = editResultJson.results
            .filter((result) => !result.failedReason)
            .sort((a, b) => (a.position > b.position ? 1 : a.position < b.position ? -1 : 0))
            .map((result) => ({
              Person: {
                PersonName: {
                  Given: result.firstName,
                  Family: result.lastName,
                },
              },
              EntryClass: {
                ClassShortName: result.className,
                numberOfStarts: result.nofStartsInClass,
              },
              Result: {
                ResultId: result.resultId,
                ResultPosition: result.position,
                Time: FormatTime(result.competitorTime),
                TimeDiff: TimeDiff(
                  result.winnerTime === result.competitorTime && result.secondTime
                    ? result.secondTime
                    : result.winnerTime,
                  result.competitorTime,
                  true
                ),
              },
            }));

          setEvent(eventObject);
          setShowResult(eventObject.Competitors.length > 0);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }, []);

    const loadFromEventor = useCallback(() => {
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
      const classPromise = GetJsonData(
        clubModel.corsProxy +
          encodeURIComponent(
            clubModel.eventor.classesUrl + '?eventId=' + eventObject.eventorId + '&includeEntryFees=true'
          ) +
          '&headers=' +
          encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
        false
      );
      const startPromise =
        eventObject.statusId < 8
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(
                  clubModel.eventor.startUrl +
                    '?eventId=' +
                    eventObject.eventorId +
                    '&organisationIds=' +
                    clubModel.eventor.organisationId
                ) +
                '&headers=' +
                encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
              false
            )
          : new Promise((resolve) => resolve(undefined));
      const resultPromise =
        eventObject.statusId >= 8 && eventObject.statusId !== 10
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(
                  clubModel.eventor.resultUrl +
                    '?eventId=' +
                    eventObject.eventorId +
                    '&organisationIds=' +
                    clubModel.eventor.organisationId +
                    '&top=0&includeSplitTimes=true'
                ) +
                '&headers=' +
                encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
              false
            )
          : new Promise((resolve) => resolve(undefined));

      Promise.all([classPromise, startPromise, resultPromise])
        .then((jsons) => {
          const classJson = jsons[0];
          const startJson = jsons[1];
          const resultJson = jsons[2];
          // eslint-disable-next-line eqeqeq
          if (startJson != undefined && startJson.ClassStart != undefined) {
            eventObject.Competitors = [];
            const ClassStarts = Array.isArray(startJson.ClassStart) ? startJson.ClassStart : [startJson.ClassStart];
            ClassStarts.forEach((classStart) => {
              let currentClass = { EventClassId: classStart.EventClassId };
              // eslint-disable-next-line eqeqeq
              if (classJson != undefined) {
                currentClass = classJson.EventClass.find(
                  (evtClass) => evtClass.EventClassId === classStart.EventClassId
                );
                if (Array.isArray(currentClass.ClassRaceInfo)) {
                  currentClass.numberOfEntries = currentClass.ClassRaceInfo.find(
                    (raceInfo) => raceInfo.EventRaceId === eventObject.eventorRaceId
                  )['@attributes'].noOfEntries;
                } else {
                  currentClass.numberOfEntries = currentClass['@attributes'].numberOfEntries;
                }
              }

              // eslint-disable-next-line eqeqeq
              if (classStart.PersonStart != undefined) {
                const PersonStarts = Array.isArray(classStart.PersonStart)
                  ? classStart.PersonStart.filter(
                      (personStart) =>
                        // eslint-disable-next-line eqeqeq
                        personStart.RaceStart == undefined ||
                        personStart.RaceStart.EventRaceId === eventObject.eventorRaceId
                    )
                  : [classStart.PersonStart];
                PersonStarts.forEach((personStart) => {
                  eventObject.Competitors.push({
                    Person: personStart.Person,
                    EntryClass: currentClass,
                    // eslint-disable-next-line eqeqeq
                    Start: personStart.RaceStart != undefined ? personStart.RaceStart.Start : personStart.Start,
                  });
                });
              }
              // eslint-disable-next-line eqeqeq
              if (classStart.TeamStart != undefined) {
                const TeamStarts = Array.isArray(classStart.TeamStart) ? classStart.TeamStart : [classStart.TeamStart];
                TeamStarts.forEach((teamStart) => {
                  eventObject.Competitors.push({
                    Person: {
                      PersonName: { Given: teamStart.TeamName, Family: '' },
                    },
                    EntryClass: currentClass,
                    Start: { StartTime: teamStart.StartTime },
                  });
                });
              }
            });
          }
          // eslint-disable-next-line eqeqeq
          if (resultJson != undefined && resultJson.ClassResult != undefined) {
            eventObject.Competitors = [];
            const ClassResults = Array.isArray(resultJson.ClassResult)
              ? resultJson.ClassResult
              : [resultJson.ClassResult];
            ClassResults.forEach((classResult) => {
              let currentClass = {
                EventClassId: classResult.EventClass.EventClassId,
              };
              // eslint-disable-next-line eqeqeq
              if (classJson != undefined) {
                currentClass = classJson.EventClass.find(
                  (evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId
                );
                if (Array.isArray(currentClass.ClassRaceInfo)) {
                  currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                    (raceInfo) => raceInfo.EventRaceId === eventObject.eventorRaceId
                  );
                }
                currentClass.numberOfEntries = currentClass.ClassRaceInfo['@attributes'].noOfEntries;
                currentClass.numberOfStarts = currentClass.ClassRaceInfo['@attributes'].noOfStarts;
              }

              // eslint-disable-next-line eqeqeq
              if (classResult.PersonResult != undefined) {
                const PersonResults = Array.isArray(classResult.PersonResult)
                  ? classResult.PersonResult.filter(
                      (personResult) =>
                        // eslint-disable-next-line eqeqeq
                        personResult.RaceResult == undefined ||
                        personResult.RaceResult.EventRaceId === eventObject.eventorRaceId
                    )
                  : // eslint-disable-next-line eqeqeq
                  classResult.PersonResult.RaceResult == undefined ||
                    classResult.PersonResult.RaceResult.EventRaceId === eventObject.eventorRaceId
                  ? [classResult.PersonResult]
                  : [];
                PersonResults.forEach((personResult) => {
                  eventObject.Competitors.push({
                    Person: personResult.Person,
                    EntryClass: currentClass,
                    // eslint-disable-next-line eqeqeq
                    Result: personResult.RaceResult != undefined ? personResult.RaceResult.Result : personResult.Result,
                  });
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
          }
          eventObject.Competitors.forEach((competitor) => {
            // eslint-disable-next-line eqeqeq
            if (competitor.Start == undefined || competitor.Start.StartTime == undefined) {
              competitor.Start = {
                StartTime: {
                  Clock: '',
                },
              };
            }
            // eslint-disable-next-line eqeqeq
            if (competitor.EntryClass.ClassShortName == undefined && classJson != undefined) {
              const currentClass = classJson.EventClass.find(
                (evtClass) => evtClass.EventClassId === competitor.EntryClass.EventClassId
              );
              if (Array.isArray(currentClass.ClassRaceInfo)) {
                currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                  (raceInfo) => raceInfo.EventRaceId === eventObject.eventorRaceId
                );
              }
              currentClass.numberOfEntries = currentClass.ClassRaceInfo['@attributes'].noOfEntries;
              currentClass.numberOfStarts = currentClass.ClassRaceInfo['@attributes'].noOfStarts;
              competitor.EntryClass = currentClass;
            }
          });
          // eslint-disable-next-line eqeqeq
          if (startJson != undefined && startJson.ClassStart != undefined) {
            eventObject.Competitors = eventObject.Competitors.sort((a, b) =>
              a.Start.StartTime.Clock > b.Start.StartTime.Clock
                ? 1
                : a.Start.StartTime.Clock < b.Start.StartTime.Clock
                ? -1
                : 0
            );
            // eslint-disable-next-line eqeqeq
          } else if (resultJson != undefined && resultJson.ClassResult != undefined) {
            eventObject.Competitors = eventObject.Competitors.filter(
              (competitor) =>
                // eslint-disable-next-line eqeqeq
                competitor.Result != undefined && competitor.Result.CompetitorStatus['@attributes'].value === 'OK'
            );
            eventObject.Competitors = eventObject.Competitors.sort((a, b) =>
              parseInt(a.Result.ResultPosition) > parseInt(b.Result.ResultPosition)
                ? 1
                : parseInt(a.Result.ResultPosition) < parseInt(b.Result.ResultPosition)
                ? -1
                : 0
            );
          }
          const currentDate = moment().format('YYYY-MM-DD');
          setEvent(eventObject);
          setShowStart(startJson != null && startJson.ClassStart != null && date >= currentDate);
          setShowResult(resultJson != null && resultJson.ClassResult != null);
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

    const moduleInfo = clubModel.module('Eventor');

    const EventItem =
      loaded && showStart ? (
        <StyledTable>
          <StyledTableBody>
            {event.Competitors.map((competitor) => (
              <StyledTableRow key={'entryID#' + (competitor.EntryId || competitor.Start.StartId)}>
                <StyledTableDataName>
                  {competitor.Person.PersonName.Given + ' ' + competitor.Person.PersonName.Family}
                </StyledTableDataName>
                <StyledTableDataClass>
                  {competitor.EntryClass.ClassShortName +
                    // eslint-disable-next-line eqeqeq
                    (competitor.EntryClass.numberOfEntries != undefined
                      ? ' (' + competitor.EntryClass.numberOfEntries + ')'
                      : '')}
                </StyledTableDataClass>
                <StyledTableDataStart>
                  {
                    // eslint-disable-next-line eqeqeq
                    competitor.Start != undefined ? competitor.Start.StartTime.Clock : ''
                  }
                </StyledTableDataStart>
              </StyledTableRow>
            ))}
          </StyledTableBody>
        </StyledTable>
      ) : loaded && showResult ? (
        <StyledTable>
          <StyledTableBody>
            {event.Competitors.map((competitor) => (
              <StyledTableRow key={'entryID#' + (competitor.EntryId || competitor.Result.ResultId)}>
                <StyledTableDataName>
                  {competitor.Result.ResultPosition +
                    '. ' +
                    competitor.Person.PersonName.Given +
                    ' ' +
                    competitor.Person.PersonName.Family}
                </StyledTableDataName>
                <StyledTableDataClass>
                  {competitor.EntryClass.ClassShortName +
                    // eslint-disable-next-line eqeqeq
                    (competitor.EntryClass.numberOfStarts != undefined
                      ? ' (' + competitor.EntryClass.numberOfStarts + ')'
                      : '')}
                </StyledTableDataClass>
                <StyledTableDataStart>
                  {parseInt(competitor.Result.ResultPosition) === 1
                    ? competitor.Result.Time
                    : competitor.Result.Time + ' (+' + competitor.Result.TimeDiff + ')'}
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
      EventItem != null ? (
        <FadeOutItem
          key={`FadeOutItem#EventorRaceId#${eventObject.eventorRaceId}`}
          ref={forwardedRef}
          maxHeight={100}
          module={moduleInfo}
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
  })
);

export default withForwardedRef(EventRace);
