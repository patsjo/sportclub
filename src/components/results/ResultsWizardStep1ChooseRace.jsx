import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { Spin, message } from "antd";
import { SpinnerDiv, StyledIcon, StyledTable } from "../styled/styled";
import { observer, inject } from "mobx-react";
import { GetJsonData, PostJsonData } from "../../utils/api";

const flatten = list => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

// @inject("clubModel")
// @observer
const ResultWizardStep1ChooseRace = inject(
  "clubModel",
  "raceWizardModel",
  "sessionModel"
)(
  observer(
    class ResultWizardStep1ChooseRace extends Component {
      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          events: [],
          selectedRowKeys: undefined
        };
      }

      componentDidMount() {
        const self = this;
        const { raceWizardModel, clubModel, sessionModel, onFailed } = this.props;
        const url = clubModel.modules.find(module => module.name === "Results").queryUrl;
        const data = {
          iType: "EVENTS",
          iClubId: clubModel.raceClubs.selectedClub.clubId,
          iFromDate: raceWizardModel.queryStartDate,
          iToDate: raceWizardModel.queryEndDate
        };

        const alreadySavedEventsPromise = PostJsonData(url, data, true, sessionModel.authorizationHeader);
        const entriesPromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(
              clubModel.eventor.entriesUrl +
                "?organisationIds=" +
                clubModel.raceClubs.selectedClub.eventorOrganisationId +
                "&fromEventDate=" +
                raceWizardModel.queryStartDate +
                "&toEventDate=" +
                raceWizardModel.queryEndDate +
                "&includeEntryFees=true&includePersonElement=true&includeOrganisationElement=true&includeEventElement=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
          true
        );
        const noEntriesPromise = raceWizardModel.queryForEventWithNoEntry
          ? new Promise((resolve, reject) => {
              GetJsonData(
                clubModel.corsProxy +
                  encodeURIComponent(
                    clubModel.eventor.competitorsUrl +
                      "?organisationId=" +
                      clubModel.raceClubs.selectedClub.eventorOrganisationId
                  ) +
                  "&headers=" +
                  encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
                true
              )
                .then(competitorsJson => {
                  if (!competitorsJson || !Array.isArray(competitorsJson.Competitor)) {
                    resolve({ Event: [] });
                    return;
                  }
                  const competitorsPromiseis = competitorsJson.Competitor.map(c =>
                    GetJsonData(
                      clubModel.corsProxy +
                        encodeURIComponent(
                          clubModel.eventor.personResultUrl +
                            "?personId=" +
                            c.Person.PersonId +
                            "&fromDate=" +
                            raceWizardModel.queryStartDate +
                            "&toDate=" +
                            raceWizardModel.queryEndDate
                        ) +
                        "&headers=" +
                        encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
                      true
                    )
                  );
                  Promise.all(competitorsPromiseis)
                    .then(competitorsJsons => {
                      if (!competitorsJsons) {
                        resolve({ Event: [] });
                        return;
                      }
                      const events = { Event: [] };
                      if (!Array.isArray(competitorsJsons)) {
                        competitorsJsons = [competitorsJsons];
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
                                cr.PersonResult.Organisation.OrganisationId ===
                                clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()
                              ) {
                                isCurrentClub = true;
                              }
                            });
                            if (isCurrentClub && !events.Event.some(e => e.EventId === r.Event.EventId)) {
                              events.Event.push(r.Event);
                            }
                          });
                        }
                      });
                      resolve(events);
                    })
                    .catch(e => reject(e));
                })
                .catch(e => reject(e));
            })
          : new Promise(resolve => resolve(undefined));

        const oringenEventsPromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(
              clubModel.eventor.eventsUrl +
                "?organisationIds=" +
                self.props.clubModel.eventor.oRingenOrganisationId +
                "&fromDate=" +
                raceWizardModel.queryStartDate +
                "&toDate=" +
                raceWizardModel.queryEndDate +
                "&includeAttributes=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
          true
        );

        Promise.all([alreadySavedEventsPromise, entriesPromise, noEntriesPromise, oringenEventsPromise])
          .then(([alreadySavedEventsJson, entriesJson, noEntriesJson, oringenEventsJson]) => {
            // eslint-disable-next-line eqeqeq
            if (entriesJson == undefined || entriesJson.Entry == undefined) {
              entriesJson = { Entry: [] };
            } else if (!Array.isArray(entriesJson.Entry)) {
              entriesJson.Entry = [entriesJson.Entry];
            }
            // eslint-disable-next-line eqeqeq
            if (oringenEventsJson == undefined || oringenEventsJson.Event == undefined) {
              oringenEventsJson = { Event: [] };
            } else if (!Array.isArray(oringenEventsJson.Event)) {
              oringenEventsJson.Event = [oringenEventsJson.Event];
            }
            // eslint-disable-next-line eqeqeq
            if (noEntriesJson == undefined || noEntriesJson.Event == undefined) {
              noEntriesJson = { Event: [] };
            } else if (!Array.isArray(noEntriesJson.Event)) {
              noEntriesJson.Event = [noEntriesJson.Event];
            }
            oringenEventsJson.Event = [...oringenEventsJson.Event, ...noEntriesJson.Event];
            entriesJson.Entry.forEach(entry => {
              if (Array.isArray(entry.Event.EventRace)) {
                entry.EventRaceId = entry.Event.EventRace.map(eventRace => eventRace.EventRaceId);
              } else {
                entry.EventRaceId = entry.Event.EventRace.EventRaceId;
              }
            });
            let events = [
              ...new Set([
                ...flatten(entriesJson.Entry.map(entry => entry.EventRaceId)),
                ...flatten(oringenEventsJson.Event.map(event => event.EventRace)).map(
                  eventRace => eventRace.EventRaceId
                )
              ])
            ]
              // eslint-disable-next-line eqeqeq
              .filter(eventRaceId => eventRaceId != undefined)
              .map(eventRaceId => {
                return { EventRaceId: eventRaceId };
              });
            events.forEach(event => {
              let entry = entriesJson.Entry.find(e =>
                Array.isArray(e.EventRaceId)
                  ? e.EventRaceId.includes(event.EventRaceId)
                  : e.EventRaceId === event.EventRaceId
              );
              // eslint-disable-next-line eqeqeq
              if (entry == undefined) {
                entry = {
                  Event: oringenEventsJson.Event.find(e =>
                    Array.isArray(e.EventRace)
                      ? e.EventRace.map(er => er.EventRaceId).includes(event.EventRaceId)
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
                event.Event.Name = event.Event.Name + ", " + event.Event.EventRace.Name;
              }
              const alreadySaved = alreadySavedEventsJson.find(
                saved =>
                  saved.eventorId.toString() === event.Event.EventId &&
                  saved.eventorRaceId.toString() === event.EventRaceId
              );
              event.alreadySavedEventId = alreadySaved ? alreadySaved.eventId : -1;
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
            events = events.filter(event => ["9", "11"].includes(event.Event.EventStatusId));
            const alreadySavedEventsNotInEventor = alreadySavedEventsJson
              .filter(
                saved =>
                  !events.some(
                    event =>
                      saved.eventorId.toString() === event.Event.EventId &&
                      saved.eventorRaceId.toString() === event.EventRaceId
                  )
              )
              .map(e => ({
                ...e,
                alreadySavedEventId: e.eventId,
                alreadySavedEventsNotInEventor: true,
                Event: {
                  EventId: e.eventorId,
                  EventRace: {
                    RaceDate: {
                      Date: e.date,
                      Clock: e.time
                    }
                  },
                  Name: e.name
                },
                EventRaceId: e.eventorRaceId
              }));
            if (!raceWizardModel.queryIncludeExisting) {
              events = events.filter(event => event.alreadySavedEventId === -1);
            } else {
              events = [...events, ...alreadySavedEventsNotInEventor];
            }
            events = events.sort((a, b) =>
              a.Event.EventRace.RaceDate.Date > b.Event.EventRace.RaceDate.Date
                ? 1
                : a.Event.EventRace.RaceDate.Date < b.Event.EventRace.RaceDate.Date
                ? -1
                : 0
            );
            self.setState({
              loaded: true,
              events: events,
              selectedRowKeys: undefined
            });
          })
          .catch(e => {
            message.error(e.message);
            onFailed && onFailed();
          });
      }

      onSelectChange = selectedRowKeys => {
        const { raceWizardModel, onValidate } = this.props;
        const selected = JSON.parse(selectedRowKeys);

        raceWizardModel.setValue("selectedEventId", parseInt(selected.selectedEventId));
        raceWizardModel.setValue(
          "selectedEventorId",
          selected.selectedEventorId ? parseInt(selected.selectedEventorId) : null
        );
        raceWizardModel.setValue(
          "selectedEventorRaceId",
          selected.selectedEventorRaceId ? parseInt(selected.selectedEventorRaceId) : null
        );
        raceWizardModel.setValue("overwrite", selected.existInEventor);
        this.setState({ selectedRowKeys });
        onValidate(true);
      };

      render() {
        const { visible, t } = this.props;
        const { loaded, selectedRowKeys, events } = this.state;
        const rowSelection = {
          selectedRowKeys,
          onChange: this.onSelectChange,
          type: "radio"
        };
        const columns = [
          {
            title: t("results.Date"),
            dataIndex: "date",
            key: "date"
          },
          {
            title: t("results.Time"),
            dataIndex: "time",
            key: "time"
          },
          {
            title: t("results.Name"),
            dataIndex: "name",
            key: "name"
          },
          {
            title: t("results.AlreadySaved"),
            dataIndex: "alreadySavedEventId",
            key: "alreadySavedEventId",
            render: alreadySavedEventId => (alreadySavedEventId !== -1 ? t("common.Yes") : t("common.No"))
          },
          {
            title: t("results.ExistInEventor"),
            dataIndex: "existInEventor",
            key: "existInEventor",
            render: existInEventor => (existInEventor ? t("common.Yes") : t("common.No"))
          }
        ];
        const data = events.map(event =>
          event.alreadySavedEventsNotInEventor
            ? {
                ...event,
                key: JSON.stringify({
                  selectedEventorId: event.eventorId,
                  selectedEventorRaceId: event.eventorRaceId,
                  selectedEventId: event.eventId,
                  alreadySavedEventId: -1,
                  existInEventor: false
                }),
                alreadySavedEventId: event.alreadySavedEventId,
                existInEventor: false
              }
            : {
                key: JSON.stringify({
                  selectedEventorId: event.Event.EventId,
                  selectedEventorRaceId: event.EventRaceId,
                  selectedEventId: event.alreadySavedEventId,
                  alreadySavedEventId: event.alreadySavedEventId,
                  existInEventor: true
                }),
                date: event.Event.EventRace.RaceDate.Date,
                time: event.Event.EventRace.RaceDate.Clock === "00:00:00" ? "" : event.Event.EventRace.RaceDate.Clock,
                name: `${event.Event.Name}`,
                alreadySavedEventId: event.alreadySavedEventId,
                existInEventor: true
              }
        );

        return loaded && visible ? (
          <StyledTable
            rowSelection={rowSelection}
            onRow={(record, rowIndex) => {
              return {
                onClick: event => this.onSelectChange(record.key)
              };
            }}
            columns={columns}
            dataSource={data}
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

const ResultWizardStep1ChooseRaceWithI18n = withTranslation()(ResultWizardStep1ChooseRace); // pass `t` function to App

export default ResultWizardStep1ChooseRaceWithI18n;
