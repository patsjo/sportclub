import React, { Component } from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { GetJsonData } from "../../utils/api";
import PropTypes from "prop-types";
import FadeOutItem from "../fadeOutItem/FadeOutItem";

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
const EventRace = inject("clubModel")(
  observer(
    class EventorEntriesView extends Component {
      static propTypes = {
        header: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        eventObject: PropTypes.object.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          eventObject: undefined,
          showStart: false,
          showResult: false
        };
      }

      componentDidMount() {
        const self = this;
        const eventObject = self.props.eventObject;
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
          self.props.clubModel.corsProxy +
            encodeURIComponent(
              self.props.clubModel.eventor.classesUrl +
                "?eventId=" +
                self.props.eventObject.Event.EventId +
                "&includeEntryFees=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + self.props.clubModel.eventor.apiKey)
        );
        const startPromise =
          eventObject.Event.EventStatusId < 8
            ? GetJsonData(
                self.props.clubModel.corsProxy +
                  encodeURIComponent(
                    self.props.clubModel.eventor.startUrl +
                      "?eventId=" +
                      self.props.eventObject.Event.EventId +
                      "&organisationIds=" +
                      self.props.clubModel.eventor.organisationId
                  ) +
                  "&headers=" +
                  encodeURIComponent(
                    "ApiKey: " + self.props.clubModel.eventor.apiKey
                  )
              )
            : new Promise(resolve => resolve(undefined));
        const resultPromise =
          eventObject.Event.EventStatusId >= 8
            ? GetJsonData(
                self.props.clubModel.corsProxy +
                  encodeURIComponent(
                    self.props.clubModel.eventor.resultUrl +
                      "?eventId=" +
                      self.props.eventObject.Event.EventId +
                      "&organisationIds=" +
                      self.props.clubModel.eventor.organisationId +
                      "&top=0&includeSplitTimes=true"
                  ) +
                  "&headers=" +
                  encodeURIComponent(
                    "ApiKey: " + self.props.clubModel.eventor.apiKey
                  )
              )
            : new Promise(resolve => resolve(undefined));
        const lengthPromise = GetJsonData(
          self.props.clubModel.corsProxy +
            encodeURIComponent(
              self.props.clubModel.eventor.lengthUrl +
                "?eventId=" +
                self.props.eventObject.Event.EventId +
                "&eventRaceId=" +
                self.props.eventObject.Event.EventRace.EventRaceId +
                "&groupBy=EventClass"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + self.props.clubModel.eventor.apiKey)
        );
        Promise.all([
          classPromise,
          startPromise,
          resultPromise,
          lengthPromise
        ]).then(jsons => {
          const classJson = jsons[0];
          const startJson = jsons[1];
          const resultJson = jsons[2];
          const lengthHtmlJson = jsons[3];
          if (startJson !== undefined && startJson.ClassStart !== undefined) {
            eventObject.Competitors = [];
            const ClassStarts = Array.isArray(startJson.ClassStart)
              ? startJson.ClassStart
              : [startJson.ClassStart];
            ClassStarts.forEach(classStart => {
              let currentClass = { EventClassId: classStart.EventClassId };
              if (classJson !== undefined) {
                currentClass = classJson.EventClass.find(
                  evtClass => evtClass.EventClassId === classStart.EventClassId
                );
                if (Array.isArray(currentClass.ClassRaceInfo)) {
                  currentClass.numberOfEntries = currentClass.ClassRaceInfo.find(
                    raceInfo => raceInfo.EventRaceId === eventObject.EventRaceId
                  )["@attributes"].noOfEntries;
                } else {
                  currentClass.numberOfEntries =
                    currentClass["@attributes"].numberOfEntries;
                }
              }

              if (classStart.PersonStart !== undefined) {
                const PersonStarts = Array.isArray(classStart.PersonStart)
                  ? classStart.PersonStart.filter(
                      personStart =>
                        personStart.RaceStart === undefined ||
                        personStart.RaceStart.EventRaceId ===
                          eventObject.EventRaceId
                    )
                  : [classStart.PersonStart];
                PersonStarts.forEach(personStart => {
                  eventObject.Competitors.push({
                    Person: personStart.Person,
                    EntryClass: currentClass,
                    Start:
                      personStart.RaceStart !== undefined
                        ? personStart.RaceStart.Start
                        : personStart.Start
                  });
                });
              }
              if (classStart.TeamStart !== undefined) {
                const TeamStarts = Array.isArray(classStart.TeamStart)
                  ? classStart.TeamStart
                  : [classStart.TeamStart];
                TeamStarts.forEach(teamStart => {
                  eventObject.Competitors.push({
                    Person: {
                      PersonName: { Given: teamStart.TeamName, Family: "" }
                    },
                    EntryClass: currentClass,
                    Start: { StartTime: teamStart.StartTime }
                  });
                });
              }
            });
          }
          if (
            resultJson !== undefined &&
            resultJson.ClassResult !== undefined
          ) {
            eventObject.Competitors = [];
            const ClassResults = Array.isArray(resultJson.ClassResult)
              ? resultJson.ClassResult
              : [resultJson.ClassResult];
            ClassResults.forEach(classResult => {
              let currentClass = {
                EventClassId: classResult.EventClass.EventClassId
              };
              if (classJson !== undefined) {
                currentClass = classJson.EventClass.find(
                  evtClass =>
                    evtClass.EventClassId ===
                    classResult.EventClass.EventClassId
                );
                if (Array.isArray(currentClass.ClassRaceInfo)) {
                  currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                    raceInfo => raceInfo.EventRaceId === eventObject.EventRaceId
                  );
                }
                currentClass.numberOfEntries =
                  currentClass.ClassRaceInfo["@attributes"].noOfEntries;
                currentClass.numberOfStarts =
                  currentClass.ClassRaceInfo["@attributes"].noOfStarts;
              }

              if (classResult.PersonResult !== undefined) {
                const PersonResults = Array.isArray(classResult.PersonResult)
                  ? classResult.PersonResult.filter(
                      personResult =>
                        personResult.RaceResult === undefined ||
                        personResult.RaceResult.EventRaceId ===
                          eventObject.EventRaceId
                    )
                  : classResult.PersonResult.RaceResult === undefined ||
                    classResult.PersonResult.RaceResult.EventRaceId ===
                      eventObject.EventRaceId
                  ? [classResult.PersonResult]
                  : [];
                PersonResults.forEach(personResult => {
                  eventObject.Competitors.push({
                    Person: personResult.Person,
                    EntryClass: currentClass,
                    Result:
                      personResult.RaceResult !== undefined
                        ? personResult.RaceResult.Result
                        : personResult.Result
                  });
                });
              }
              // if (classResult.TeamStart !== undefined) {
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
          eventObject.Competitors.forEach(competitor => {
            if (
              competitor.Start === undefined ||
              competitor.Start.StartTime === undefined
            ) {
              competitor.Start = {
                StartTime: {
                  Clock: ""
                }
              };
            }
            if (
              competitor.EntryClass.ClassShortName === undefined &&
              classJson !== undefined
            ) {
              const currentClass = classJson.EventClass.find(
                evtClass =>
                  evtClass.EventClassId === competitor.EntryClass.EventClassId
              );
              if (Array.isArray(currentClass.ClassRaceInfo)) {
                currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                  raceInfo => raceInfo.EventRaceId === eventObject.EventRaceId
                );
              }
              currentClass.numberOfEntries =
                currentClass.ClassRaceInfo["@attributes"].noOfEntries;
              currentClass.numberOfStarts =
                currentClass.ClassRaceInfo["@attributes"].noOfStarts;
              competitor.EntryClass = currentClass;
            }
          });
          if (startJson !== undefined && startJson.ClassStart !== undefined) {
            eventObject.Competitors = eventObject.Competitors.sort((a, b) =>
              a.Start.StartTime.Clock > b.Start.StartTime.Clock
                ? 1
                : a.Start.StartTime.Clock < b.Start.StartTime.Clock
                ? -1
                : 0
            );
          } else if (
            resultJson !== undefined &&
            resultJson.ClassResult !== undefined
          ) {
            eventObject.Competitors = eventObject.Competitors.filter(
              competitor =>
                competitor.Result !== undefined &&
                competitor.Result.CompetitorStatus["@attributes"].value === "OK"
            );
            eventObject.Competitors = eventObject.Competitors.sort((a, b) =>
              parseInt(a.Result.ResultPosition) >
              parseInt(b.Result.ResultPosition)
                ? 1
                : parseInt(a.Result.ResultPosition) <
                  parseInt(b.Result.ResultPosition)
                ? -1
                : 0
            );
          }
          self.setState({
            loaded: true,
            eventObject: eventObject,
            showStart:
              startJson !== undefined && startJson.ClassStart !== undefined,
            showResult:
              resultJson !== undefined && resultJson.ClassResult !== undefined
          });
        });
      }

      render() {
        const EventItem =
          this.state.loaded && this.state.showStart ? (
            <StyledTable>
              <StyledTableBody>
                {this.state.eventObject.Competitors.map(competitor => (
                  <StyledTableRow
                    key={
                      "entryID#" +
                      (competitor.EntryId || competitor.Start.StartId)
                    }
                  >
                    <StyledTableDataName>
                      {competitor.Person.PersonName.Given +
                        " " +
                        competitor.Person.PersonName.Family}
                    </StyledTableDataName>
                    <StyledTableDataClass>
                      {competitor.EntryClass.ClassShortName +
                        (competitor.EntryClass.numberOfEntries !== undefined
                          ? " (" + competitor.EntryClass.numberOfEntries + ")"
                          : "")}
                    </StyledTableDataClass>
                    <StyledTableDataStart>
                      {competitor.Start !== undefined
                        ? competitor.Start.StartTime.Clock
                        : ""}
                    </StyledTableDataStart>
                  </StyledTableRow>
                ))}
              </StyledTableBody>
            </StyledTable>
          ) : this.state.loaded && this.state.showResult ? (
            <StyledTable>
              <StyledTableBody>
                {this.state.eventObject.Competitors.map(competitor => (
                  <StyledTableRow
                    key={
                      "entryID#" +
                      (competitor.EntryId || competitor.Result.ResultId)
                    }
                  >
                    <StyledTableDataName>
                      {competitor.Result.ResultPosition +
                        ". " +
                        competitor.Person.PersonName.Given +
                        " " +
                        competitor.Person.PersonName.Family}
                    </StyledTableDataName>
                    <StyledTableDataClass>
                      {competitor.EntryClass.ClassShortName +
                        (competitor.EntryClass.numberOfStarts !== undefined
                          ? " (" + competitor.EntryClass.numberOfStarts + ")"
                          : "")}
                    </StyledTableDataClass>
                    <StyledTableDataStart>
                      {parseInt(competitor.Result.ResultPosition) === 1
                        ? competitor.Result.Time
                        : competitor.Result.Time +
                          " (+" +
                          competitor.Result.TimeDiff +
                          ")"}
                    </StyledTableDataStart>
                  </StyledTableRow>
                ))}
              </StyledTableBody>
            </StyledTable>
          ) : !this.state.loaded ? (
            <SpinnerDiv>
              <CircularProgress color="primary" size={25} thickness={3} />
            </SpinnerDiv>
          ) : null;
        const ShowEventItem =
          EventItem !== null ? (
            <FadeOutItem
              content={
                <ContentHolder>
                  <EventHeader>{this.props.header}</EventHeader>
                  <EventTime>{this.props.date}</EventTime>
                  {EventItem}
                </ContentHolder>
              }
              modalContent={
                <ContentHolder>
                  <EventHeader>{this.props.header}</EventHeader>
                  <EventTime>{this.props.date}</EventTime>
                  {EventItem}
                </ContentHolder>
              }
            />
          ) : null;
        return ShowEventItem;
      }
    }
  )
);

export default EventRace;
