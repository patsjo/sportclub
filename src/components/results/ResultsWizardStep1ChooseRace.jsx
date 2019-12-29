import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { Icon, Spin, Table, message } from "antd";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { GetJsonData, PostJsonData } from "../../utils/api";

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;
const StyledIcon = styled(Icon)`
  &&& {
    margin-right: 8px;
  }
`;

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

        Promise.all([alreadySavedEventsPromise, entriesPromise, oringenEventsPromise])
          .then(([alreadySavedEventsJson, entriesJson, oringenEventsJson]) => {
            if (entriesJson === undefined || entriesJson.Entry === undefined) {
              entriesJson = { Entry: [] };
            } else if (!Array.isArray(entriesJson.Entry)) {
              entriesJson.Entry = [entriesJson.Entry];
            }
            if (oringenEventsJson === undefined || oringenEventsJson.Event === undefined) {
              oringenEventsJson = { Event: [] };
            } else if (!Array.isArray(oringenEventsJson.Event)) {
              oringenEventsJson.Event = [oringenEventsJson.Event];
            }
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
              event.alreadySaved = alreadySavedEventsJson.some(
                saved =>
                  saved.eventorId.toString() === event.Event.EventId &&
                  saved.eventorRaceId.toString() === event.EventRaceId
              );
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
        const { raceWizardModel } = this.props;
        const selected = JSON.parse(selectedRowKeys);

        raceWizardModel.setValue("selectedEventorId", parseInt(selected.selectedEventorId));
        raceWizardModel.setValue("selectedEventorRaceId", parseInt(selected.selectedEventorRaceId));
        this.setState({ selectedRowKeys });
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
            dataIndex: "alreadySaved",
            key: "alreadySaved",
            render: selected => (
              <b>
                {selected ? (
                  <>
                    <StyledIcon type="check-square" theme="twoTone" twoToneColor="#52c41a" />
                    {t("common.Yes")}
                  </>
                ) : (
                  <>
                    <StyledIcon type="plus-square" theme="twoTone" />
                    {t("common.No")}
                  </>
                )}
              </b>
            )
          }
        ];
        const data = events.map(event => ({
          key: JSON.stringify({ selectedEventorId: event.Event.EventId, selectedEventorRaceId: event.EventRaceId }),
          date: event.Event.EventRace.RaceDate.Date,
          time: event.Event.EventRace.RaceDate.Clock === "00:00:00" ? "" : event.Event.EventRace.RaceDate.Clock,
          name: `${event.Event.Name}`,
          alreadySaved: event.alreadySaved
        }));

        return loaded && visible ? (
          <Table
            rowSelection={rowSelection}
            onRow={(record, rowIndex) => {
              return {
                onClick: event => this.onSelectChange(record.key)
              };
            }}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 5 }}
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
