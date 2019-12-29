import React, { Component } from "react";
import { Spin, Form, Modal, message, Table, Icon } from "antd";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { GetJsonData } from "../../utils/api";
import { GetLength } from "../../utils/resultHelper";
import { WinnerTime, GetAge, GetFee } from "../../utils/resultHelper";
import PropTypes from "prop-types";
import AddMapCompetitor from "./AddMapCompetitor";
import { withTranslation } from "react-i18next";

const { confirm } = Modal;

const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
`;

const StyledIcon = styled(Icon)`
  &&& {
    margin-right: 8px;
  }
`;

// @inject("clubModel")
// @observer
const ResultWizardStep2EditRace = inject(
  "clubModel",
  "raceWizardModel"
)(
  observer(
    class ResultWizardStep2EditRace extends Component {
      static propTypes = {
        header: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        onFailed: PropTypes.func.isRequired
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
        const { t, clubModel, raceWizardModel, onFailed } = this.props;

        const entriesPromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(
              clubModel.eventor.entriesUrl +
                "?eventIds=" +
                raceWizardModel.selectedEventorId +
                "&organisationIds=" +
                clubModel.raceClubs.selectedClub.eventorOrganisationId +
                "&includeEntryFees=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
          true
        );
        const classPromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(
              clubModel.eventor.classesUrl + "?eventId=" + raceWizardModel.selectedEventorId + "&includeEntryFees=true"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
          false
        );
        const resultPromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(
              clubModel.eventor.resultUrl +
                "?eventId=" +
                raceWizardModel.selectedEventorId +
                "&organisationIds=" +
                clubModel.raceClubs.selectedClub.eventorOrganisationId +
                "&top=2&includeSplitTimes=false"
            ) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
          false
        );
        const lengthPromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(
              clubModel.eventor.lengthUrl +
                "?eventId=" +
                raceWizardModel.selectedEventorId +
                "&eventRaceId=" +
                raceWizardModel.selectedEventorRaceId +
                "&groupBy=EventClass"
            ) +
            "&noJsonConvert=true&headers=" +
            encodeURIComponent("ApiKey: " + self.props.clubModel.eventor.apiKey),
          false
        );
        const entryFeePromise = GetJsonData(
          clubModel.corsProxy +
            encodeURIComponent(clubModel.eventor.entryFeeUrl + raceWizardModel.selectedEventorId) +
            "&headers=" +
            encodeURIComponent("ApiKey: " + clubModel.eventor.apiKey),
          true
        );

        Promise.all([entriesPromise, classPromise, resultPromise, entryFeePromise, lengthPromise])
          .then(async ([entriesJson, classJson, resultJson, entryFeeJson, lengthHtmlJson]) => {
            if (entriesJson === undefined || entriesJson.Entry === undefined) {
              entriesJson = { Entry: [] };
            } else if (!Array.isArray(entriesJson.Entry)) {
              entriesJson.Entry = [entriesJson.Entry];
            }
            if (resultJson !== undefined && resultJson.ClassResult !== undefined) {
              resultJson.EventRace = Array.isArray(resultJson.Event.EventRace)
                ? resultJson.Event.EventRace.find(
                    er => er.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                  )
                : resultJson.Event.EventRace;

              const raceEvent = {
                eventId: -1,
                eventorId: raceWizardModel.selectedEventorId,
                eventorRaceId: raceWizardModel.selectedEventorRaceId,
                name: resultJson.Event.Name,
                organiserName: resultJson.Event.Organiser.Organisation.Name,
                raceDate: resultJson.EventRace.RaceDate.Date,
                raceTime:
                  resultJson.EventRace.RaceDate.Clock === "00:00:00" ? null : resultJson.EventRace.RaceDate.Clock,
                eventClassificationId: "F",
                raceLightCondition: resultJson.EventRace["@attributes"].raceLightCondition,
                raceDistance: resultJson.EventRace["@attributes"].raceDistance,
                results: []
              };
              const ClassResults = Array.isArray(resultJson.ClassResult)
                ? resultJson.ClassResult
                : [resultJson.ClassResult];
              for (let i = 0; i < ClassResults.length; i++) {
                const classResult = ClassResults[i];
                let currentClass = {
                  EventClassId: classResult.EventClass.EventClassId
                };
                if (classJson !== undefined) {
                  currentClass = classJson.EventClass.find(
                    evtClass => evtClass.EventClassId === classResult.EventClass.EventClassId
                  );
                  if (Array.isArray(currentClass.ClassRaceInfo)) {
                    currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                      raceInfo => raceInfo.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                    );
                  }
                  currentClass.numberOfStarts = currentClass.ClassRaceInfo["@attributes"].noOfStarts;
                }

                if (classResult.PersonResult !== undefined) {
                  const personResults = Array.isArray(classResult.PersonResult)
                    ? classResult.PersonResult.filter(
                        personResult =>
                          personResult.RaceResult === undefined ||
                          personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                      )
                    : classResult.PersonResult.RaceResult === undefined ||
                      classResult.PersonResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId.toString()
                    ? [classResult.PersonResult]
                    : [];

                  personResults.forEach(personResult => {
                    if (personResult.Result === undefined && personResult.RaceResult.Result !== undefined) {
                      personResult.Result = personResult.RaceResult.Result;
                    }
                  });

                  const clubPersonResults = personResults.filter(
                    personResult =>
                      personResult.Organisation.OrganisationId ===
                      clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()
                  );

                  for (let j = 0; j < clubPersonResults.length; j++) {
                    const personResult = clubPersonResults[j];
                    let competitor;
                    if (typeof personResult.Person.PersonId === "string" && personResult.Person.PersonId.length > 0) {
                      if (!competitor) {
                        competitor = clubModel.raceClubs.selectedClub.competitorByEventorId(
                          parseInt(personResult.Person.PersonId)
                        );
                      }

                      if (!competitor) {
                        competitor = clubModel.raceClubs.selectedClub.competitors.find(
                          c =>
                            c.firstName === personResult.Person.PersonName.Given &&
                            c.lastName === personResult.Person.PersonName.Family &&
                            c.birthDay === personResult.Person.BirthDate.Date
                        );
                        if (competitor) {
                          await competitor.addEventorId(
                            clubModel.modules.find(module => module.name === "Results").addUrl,
                            personResult.Person.PersonId
                          );
                        }
                      }
                    }
                    if (!competitor) {
                      // TODO popup to select competitor or create new one
                      competitor = await new Promise((resolve, reject) => {
                        const confirmObject = {
                          competitorId: undefined,
                          newCompetitor: {
                            iType: "COMPETITOR",
                            iFirstName: personResult.Person.PersonName.Given,
                            iLastName: personResult.Person.PersonName.Family,
                            iBirthDay:
                              personResult.Person.BirthDate === undefined ? null : personResult.Person.BirthDate.Date,
                            iClubId: clubModel.raceClubs.selectedClub.clubId,
                            iStartDate: "1930-01-01",
                            iEndDate: null,
                            iEventorCompetitorId:
                              typeof personResult.Person.PersonId !== "string" ||
                              personResult.Person.PersonId.length === 0
                                ? null
                                : personResult.Person.PersonId
                          }
                        };
                        let selectedTabKey = "1";
                        let confirmModal;
                        confirmModal = confirm({
                          title: `${t("results.ModalTitleMapCompetitor")} (${personResult.Person.PersonName.Given} ${
                            personResult.Person.PersonName.Family
                          }, ${currentClass.ClassShortName})`,
                          content: (
                            <AddMapCompetitor
                              addLinkCompetitor={confirmObject}
                              competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
                              onTabChange={key => (selectedTabKey = key)}
                              onValidate={valid =>
                                confirmModal.update({
                                  okButtonProps: {
                                    disabled: !valid
                                  }
                                })
                              }
                            />
                          ),
                          okText: t("common.Save"),
                          okButtonProps: {
                            disabled: true
                          },
                          cancelText: t("common.Cancel"),
                          onOk() {
                            if (selectedTabKey === "1") {
                              const comp = clubModel.raceClubs.selectedClub.competitorById(confirmObject.competitorId);
                              if (
                                typeof personResult.Person.PersonId === "string" &&
                                personResult.Person.PersonId.length > 0
                              ) {
                                competitor
                                  .addEventorId(
                                    clubModel.modules.find(module => module.name === "Results").addUrl,
                                    personResult.Person.PersonId
                                  )
                                  .then(() => resolve(comp));
                              } else {
                                resolve(comp);
                              }
                            } else {
                              clubModel.raceClubs.selectedClub
                                .addCompetitor(
                                  clubModel.modules.find(module => module.name === "Results").addUrl,
                                  confirmObject.newCompetitor
                                )
                                .then(competitorId =>
                                  resolve(clubModel.raceClubs.selectedClub.competitorById(competitorId))
                                );
                            }
                          },
                          onCancel() {
                            reject();
                          }
                        });
                      });
                    }

                    const entry = entriesJson.Entry.find(
                      entry => entry.Competitor.PersonId === personResult.Person.PersonId
                    );
                    let entryFeeIds = entry !== undefined ? entry.EntryEntryFee : currentClass.ClassEntryFee;
                    if (Array.isArray(entryFeeIds)) {
                      entryFeeIds = entryFeeIds.map(f => f.EntryFeeId);
                    } else if (entryFeeIds !== undefined) {
                      entryFeeIds = [entryFeeIds.EntryFeeId];
                    }

                    const age = GetAge(competitor.birthDay, resultJson.EventRace.RaceDate.Date);
                    const didNotStart = personResult.Result.CompetitorStatus["@attributes"].value === "DidNotStart";
                    const misPunch = personResult.Result.CompetitorStatus["@attributes"].value === "MisPunch";
                    const ok = personResult.Result.CompetitorStatus["@attributes"].value === "OK";
                    const valid = ok && !didNotStart && !misPunch;
                    const position = valid ? parseInt(personResult.Result.ResultPosition) : null;
                    const nofStartsInClass = valid ? parseInt(currentClass.numberOfStarts) : null;
                    const secondTime =
                      valid && nofStartsInClass > 1
                        ? personResults.find(pr => pr.Result.ResultPosition === "2").Result.Time
                        : null;

                    const raceResult = {
                      resultId: -1,
                      competitorId: competitor.competitorId,
                      resultMultiDay: null,
                      teamResult: null,
                      className: currentClass.ClassShortName,
                      deviantEventClassificationId: null,
                      classClassificationId: null,
                      lengthInMeter: GetLength(lengthHtmlJson, currentClass.Name),
                      failedReason: didNotStart ? "EJ START" : !ok ? "UTGÅTT" : null,
                      competitorTime: valid ? personResult.Result.Time : null,
                      winnerTime: valid
                        ? WinnerTime(
                            personResult.Result.Time,
                            personResult.Result.TimeDiff,
                            parseInt(personResult.Result.ResultPosition)
                          )
                        : null,
                      secondTime: secondTime,
                      position: position,
                      nofStartsInClass: nofStartsInClass,
                      originalFee: GetFee(
                        entryFeeJson.EntryFee,
                        entryFeeIds,
                        age,
                        currentClass.ClassShortName.indexOf("Ö") > -1
                      ),
                      feeToClub: null,
                      award: null,
                      points: 0,
                      pointsOld: 0,
                      points1000: 0
                    };
                    raceEvent.results.push(raceResult);
                  }
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
              }
              raceWizardModel.setValue("raceEvent", raceEvent);
            }
            /*
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
            if (
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
          } */
            self.setState({
              loaded: true
            });
          })
          .catch(e => {
            if (e && e.message) {
              message.error(e.message);
            }
            onFailed && onFailed();
          });
      }

      render() {
        const { t, raceWizardModel, clubModel } = this.props;
        const moduleInfo = clubModel.module("Eventor");
        const columns = [
          {
            title: t("results.Competitor"),
            dataIndex: "competitorId",
            key: "competitorId",
            render: id => clubModel.raceClubs.selectedClub.competitorById(id).fullName
          },
          {
            title: t("results.Class"),
            dataIndex: "className",
            key: "className"
          },
          {
            title: t("results.ClassClassification"),
            dataIndex: "classClassificationId",
            key: "classClassificationId"
          },
          {
            title: t("results.LengthInMeter"),
            dataIndex: "lengthInMeter",
            key: "lengthInMeter"
          },
          {
            title: t("results.FailedReason"),
            dataIndex: "failedReason",
            key: "failedReason"
          },
          {
            title: t("results.Time"),
            dataIndex: "competitorTime",
            key: "competitorTime"
          },
          {
            title: t("results.WinnerTime"),
            dataIndex: "winnerTime",
            key: "winnerTime"
          },
          {
            title: t("results.SecondTime"),
            dataIndex: "secondTime",
            key: "secondTime"
          },
          {
            title: t("results.Position"),
            dataIndex: "position",
            key: "position"
          },
          {
            title: t("results.NofStartsInClass"),
            dataIndex: "nofStartsInClass",
            key: "nofStartsInClass"
          },
          {
            title: t("results.EventFee"),
            dataIndex: "originalFee",
            key: "originalFee"
          },
          {
            title: t("results.FeeToClub"),
            dataIndex: "feeToClub",
            key: "feeToClub"
          },
          {
            title: t("results.DeviantEventClassification"),
            dataIndex: "deviantEventClassificationId",
            key: "deviantEventClassificationId",
            render: id => (
              <b>
                {id === 1 ? (
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

        return this.state.loaded ? (
          <Table
            columns={columns}
            dataSource={raceWizardModel.raceEvent.results}
            pagination={{ pageSize: 5 }}
            size="middle"
          />
        ) : (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        );
      }
    }
  )
);

const ResultWizardStep2EditRaceForm = Form.create()(ResultWizardStep2EditRace);
const ResultWizardStep2EditRaceWithI18n = withTranslation()(ResultWizardStep2EditRaceForm); // pass `t` function to App

export default ResultWizardStep2EditRaceWithI18n;
