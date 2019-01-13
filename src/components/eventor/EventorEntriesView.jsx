import React, { Component } from "react";
import Grid from "@material-ui/core/Grid";
import CircularProgress from "@material-ui/core/CircularProgress";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { GetJsonData } from "../../utils/api";
import EventRace from "./EventRace";

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;
// @inject("clubModel")
// @observer
const EventorEntriesView = inject("clubModel")(
  observer(
    class EventorEntriesView extends Component {
      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          events: []
        };
      }

      componentDidMount() {
        const self = this;
        const fromDate = "2018-09-01";
        const toDate = "2018-09-30";
        const entriesPromise = GetJsonData(
          self.props.clubModel.corsProxy +
            encodeURIComponent(
              self.props.clubModel.eventor.entriesUrl +
                "?organisationIds=" +
                self.props.clubModel.eventor.organisationId +
                "&fromEventDate=" +
                fromDate +
                "&toEventDate=" +
                toDate +
                "&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + self.props.clubModel.eventor.apiKey)
        );
        const oringenEventsPromise = GetJsonData(
          self.props.clubModel.corsProxy +
            encodeURIComponent(
              self.props.clubModel.eventor.eventsUrl +
                "?organisationIds=" +
                self.props.clubModel.eventor.oRingenOrganisationId +
                "&fromDate=" +
                fromDate +
                "&toDate=" +
                toDate +
                "&includeAttributes=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + self.props.clubModel.eventor.apiKey)
        );
        Promise.all([entriesPromise, oringenEventsPromise]).then(jsons => {
          let entriesJson = jsons[0];
          let oringenEventsJson = jsons[1];

          if (entriesJson === undefined) {
            entriesJson = { Entry: [] };
          } else if (!Array.isArray(entriesJson.Entry)) {
            entriesJson.Entry = [entriesJson.Entry];
          }
          if (
            oringenEventsJson === undefined ||
            oringenEventsJson.Event === undefined
          ) {
            oringenEventsJson = { Event: [] };
          } else if (!Array.isArray(oringenEventsJson.Event)) {
            oringenEventsJson.Event = [oringenEventsJson.Event];
          }
          let events = [
            ...new Set([
              ...entriesJson.Entry.map(entry => entry.EventRaceId).flat(),
              ...oringenEventsJson.Event.map(event => event.EventRace)
                .flat()
                .map(eventRace => eventRace.EventRaceId)
            ])
          ]
            .filter(eventRaceId => eventRaceId !== undefined)
            .map(eventRaceId => {
              return { EventRaceId: eventRaceId };
            });
          events.forEach(event => {
            let entry = entriesJson.Entry.find(e =>
              Array.isArray(e.EventRaceId)
                ? e.EventRaceId.includes(event.EventRaceId)
                : e.EventRaceId === event.EventRaceId
            );
            if (entry === undefined) {
              entry = {
                Event: oringenEventsJson.Event.find(e =>
                  Array.isArray(e.EventRace)
                    ? e.EventRace.map(er => er.EventRaceId).includes(
                        event.EventRaceId
                      )
                    : e.EventRace.EventRaceId === event.EventRaceId
                )
              };
            }
            event.Event = {
              ...entry.Event
            };
            if (Array.isArray(event.Event.EventRace)) {
              event.Event.EventRace = event.Event.EventRace.find(
                eventRace => eventRace.EventRaceId === event.EventRaceId
              );
              event.Event.Name =
                event.Event.Name + ", " + event.Event.EventRace.Name;
            }
            event.Competitors = entriesJson.Entry.filter(
              entry =>
                entry.Competitor !== undefined &&
                entry.Competitor.Person !== undefined &&
                (Array.isArray(entry.EventRaceId)
                  ? entry.EventRaceId.includes(event.EventRaceId)
                  : entry.EventRaceId === event.EventRaceId)
            ).map(entry => {
              return {
                ...entry.Competitor,
                EntryId: entry.EntryId,
                EntryClass: entry.EntryClass
              };
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
          events = events.filter(event =>
            ["5", "6", "7", "8", "9", "11"].includes(event.Event.EventStatusId)
          );
          events = events.sort((a, b) =>
            a.Event.EventRace.RaceDate.Date > b.Event.EventRace.RaceDate.Date
              ? 1
              : a.Event.EventRace.RaceDate.Date <
                b.Event.EventRace.RaceDate.Date
              ? -1
              : 0
          );
          self.setState({
            loaded: true,
            events: events
          });
        });
      }

      render() {
        const Items = this.state.loaded ? (
          <React.Fragment>
            {this.state.events.map((event, index) => (
              <EventRace
                key={"entryObject#" + index}
                header={event.Event.Name}
                date={event.Event.EventRace.RaceDate.Date}
                eventObject={event}
              />
            ))}
          </React.Fragment>
        ) : (
          <Grid item key="eventsInProgress" xs={12} sm={6} md={4} lg={3} xl={2}>
            <SpinnerDiv>
              <CircularProgress color="primary" size={50} thickness={5} />
            </SpinnerDiv>
          </Grid>
        );
        return Items;
      }
    }
  )
);

export default EventorEntriesView;
