import React, { Component } from "react";
import { Spin, Form, Switch, Input, DatePicker, TimePicker, Modal, message, Row, Col, Popconfirm } from "antd";
import { MissingTag, NoWrap, SpinnerDiv, StyledIcon, StyledTable } from "../styled/styled";
import { observer, inject } from "mobx-react";
import { applySnapshot, getSnapshot } from "mobx-state-tree";
import { GetJsonData, PostJsonData } from "../../utils/api";
import {
  paymentOptions,
  raceDistanceOptions,
  raceRelayDistanceOptions,
  raceLightConditionOptions,
  failedReasons,
  distances
} from "../../utils/resultConstants";
import FormItem from "../formItems/FormItem";
import { errorRequiredField, FormSelect, dateFormat, shortTimeFormat } from "../../utils/formHelper";
import {
  ConvertSecondsToTime,
  WinnerTime,
  FormatTime,
  GetLength,
  GetAge,
  GetFees,
  GetTimeWithHour,
  GetSecondsPerKiloMeter,
  CalculateCompetitorsFee,
  ResetClassClassifications,
  GetClassShortName,
  GetClassClassificationId,
  CalculateAllAwards
} from "../../utils/resultHelper";
import PropTypes from "prop-types";
import { AddMapCompetitorConfirmModal } from "./AddMapCompetitorConfirmModal";
import EditResultIndividual from "./EditResultIndividual";
import { withTranslation } from "react-i18next";
import moment from "moment";
import styled from "styled-components";

const StyledImg = styled.img`
  &&& {
    margin-top: 10px;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
`;

const { confirm } = Modal;

// @inject("clubModel")
// @observer
const ResultWizardStep2EditRace = inject(
  "sessionModel",
  "clubModel",
  "raceWizardModel"
)(
  observer(
    class ResultWizardStep2EditRace extends Component {
      static propTypes = {
        visible: PropTypes.string.isRequired,
        onFailed: PropTypes.func.isRequired,
        onValidate: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          eventObject: undefined,
          showStart: false,
          showResult: false,
          isRelay: false,
          formId: "addMapCompetitor" + Math.floor(Math.random() * 10000000000000000)
        };
      }

      componentDidMount() {
        const self = this;
        const { t, sessionModel, clubModel, raceWizardModel, onFailed, onValidate } = this.props;

        if (!raceWizardModel.existInEventor) {
          raceWizardModel.setValue("raceEvent", {
            eventId: -1,
            raceDate: moment().format("YYYY-MM-DD"),
            paymentModel: raceWizardModel.paymentModel,
            meetsAwardRequirements: true,
            sportCode: "OL",
            eventClassificationId: "F",
            results: [],
            teamResults: []
          });
          onValidate(raceWizardModel.raceEvent.valid);
          self.setState(
            {
              loaded: true,
              isRelay: false
            },
            () => {
              this.props.form.validateFields(undefined, {
                force: true
              });
            }
          );
          return;
        }

        const url = clubModel.modules.find(module => module.name === "Results").queryUrl;
        const editResultPromise = !raceWizardModel.overwrite
          ? PostJsonData(
              url,
              { iType: "EVENT", iEventId: raceWizardModel.selectedEventId },
              true,
              sessionModel.authorizationHeader
            )
          : new Promise(resolve => resolve(undefined));

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

        Promise.all([editResultPromise, entriesPromise, classPromise, resultPromise, entryFeePromise, lengthPromise])
          .then(async ([editResultJson, entriesJson, classJson, resultJson, entryFeeJson, lengthHtmlJson]) => {
            const isRelay =
              resultJson &&
              resultJson.Event &&
              resultJson.Event["@attributes"] &&
              resultJson.Event["@attributes"].eventForm &&
              resultJson.Event["@attributes"].eventForm.toLowerCase().indexOf("relay") >= 0;
            // eslint-disable-next-line eqeqeq
            if (entriesJson == undefined || entriesJson.Entry == undefined) {
              entriesJson = { Entry: [] };
            } else if (!Array.isArray(entriesJson.Entry)) {
              entriesJson.Entry = [entriesJson.Entry];
            }
            // eslint-disable-next-line eqeqeq
            if (resultJson != undefined && resultJson.ClassResult != undefined) {
              if (Array.isArray(resultJson.Event.EventRace)) {
                resultJson.EventRace = resultJson.Event.EventRace.find(
                  eventRace => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                );
                resultJson.Event.Name = resultJson.Event.Name + ", " + resultJson.EventRace.Name;
              } else {
                resultJson.EventRace = resultJson.Event.EventRace;
              }

              const raceWinnerResults = [];
              const raceEvent = {
                eventId: raceWizardModel.selectedEventId,
                eventorId: raceWizardModel.selectedEventorId,
                eventorRaceId: raceWizardModel.selectedEventorRaceId,
                name: resultJson.Event.Name,
                organiserName: resultJson.Event.Organiser.Organisation.Name,
                raceDate: resultJson.EventRace.RaceDate.Date,
                raceTime:
                  resultJson.EventRace.RaceDate.Clock === "00:00:00" ? null : resultJson.EventRace.RaceDate.Clock,
                sportCode: "OL",
                eventClassificationId: "F",
                raceLightCondition: resultJson.EventRace["@attributes"].raceLightCondition,
                raceDistance: resultJson.EventRace["@attributes"].raceDistance,
                paymentModel: raceWizardModel.paymentModel,
                meetsAwardRequirements: true,
                longitude: resultJson.EventRace.EventCenterPosition
                  ? parseFloat(resultJson.EventRace.EventCenterPosition["@attributes"].x)
                  : null,
                latitude: resultJson.EventRace.EventCenterPosition
                  ? parseFloat(resultJson.EventRace.EventCenterPosition["@attributes"].y)
                  : null,
                results: [],
                teamResults: []
              };
              const ClassResults = Array.isArray(resultJson.ClassResult)
                ? resultJson.ClassResult
                : [resultJson.ClassResult];
              if (!isRelay) {
                for (let i = 0; i < ClassResults.length; i++) {
                  const classResult = ClassResults[i];
                  let currentClass = {
                    EventClassId: classResult.EventClass.EventClassId
                  };
                  // eslint-disable-next-line eqeqeq
                  if (classJson != undefined) {
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

                  // eslint-disable-next-line eqeqeq
                  if (classResult.PersonResult != undefined) {
                    const personResults = Array.isArray(classResult.PersonResult)
                      ? classResult.PersonResult.filter(
                          personResult =>
                            // eslint-disable-next-line eqeqeq
                            personResult.RaceResult == undefined ||
                            personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                        )
                      : // eslint-disable-next-line eqeqeq
                      classResult.PersonResult.RaceResult == undefined ||
                        classResult.PersonResult.RaceResult.EventRaceId ===
                          raceWizardModel.selectedEventorRaceId.toString()
                      ? [classResult.PersonResult]
                      : [];

                    personResults.forEach(personResult => {
                      // eslint-disable-next-line eqeqeq
                      if (personResult.Result == undefined && personResult.RaceResult.Result != undefined) {
                        personResult.Result = personResult.RaceResult.Result;
                      }
                    });
                    const shortClassName = GetClassShortName(currentClass.ClassShortName);
                    const classLevel = clubModel.raceClubs.classLevels
                      .filter(cl => shortClassName.indexOf(cl.classShortName) >= 0)
                      .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                      .find(() => true);
                    const lengthInMeter = GetLength(lengthHtmlJson, currentClass.Name);
                    const winnerResult = personResults.find(personResult => personResult.Result.ResultPosition === "1");

                    if (
                      winnerResult &&
                      (!classLevel ||
                        (classLevel.difficulty.toLowerCase() !== "grön" &&
                          classLevel.difficulty.toLowerCase() !== "vit" &&
                          classLevel.difficulty.toLowerCase() !== "gul"))
                    ) {
                      const secondsPerKilometer = GetSecondsPerKiloMeter(winnerResult.Result.Time, lengthInMeter);
                      raceWinnerResults.push({
                        id: raceWinnerResults.length,
                        personName: `${winnerResult.Person.PersonName.Given} ${winnerResult.Person.PersonName.Family}`,
                        className: shortClassName,
                        difficulty: classLevel ? classLevel.difficulty : null,
                        lengthInMeter: lengthInMeter,
                        winnerTime: winnerResult.Result.Time,
                        secondsPerKilometer: secondsPerKilometer,
                        timePerKilometer: ConvertSecondsToTime(secondsPerKilometer)
                      });
                    }

                    const clubPersonResults = personResults.filter(
                      personResult =>
                        personResult.Organisation &&
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
                        competitor = await AddMapCompetitorConfirmModal(
                          t,
                          undefined,
                          personResult.Person.PersonId,
                          {
                            iType: "COMPETITOR",
                            iFirstName: personResult.Person.PersonName.Given,
                            iLastName: personResult.Person.PersonName.Family,
                            iBirthDay:
                              // eslint-disable-next-line eqeqeq
                              personResult.Person.BirthDate == undefined ? null : personResult.Person.BirthDate.Date,
                            iClubId: clubModel.raceClubs.selectedClub.clubId,
                            iStartDate: "1930-01-01",
                            iEndDate: null,
                            iEventorCompetitorId:
                              typeof personResult.Person.PersonId !== "string" ||
                              personResult.Person.PersonId.length === 0
                                ? null
                                : personResult.Person.PersonId
                          },
                          currentClass.ClassShortName,
                          clubModel
                        );
                      }

                      const entry = entriesJson.Entry.find(
                        entry => entry.Competitor.PersonId === personResult.Person.PersonId
                      );
                      // eslint-disable-next-line eqeqeq
                      let entryFeeIds = entry != undefined ? entry.EntryEntryFee : currentClass.ClassEntryFee;
                      if (Array.isArray(entryFeeIds)) {
                        entryFeeIds = entryFeeIds.map(f => f.EntryFeeId);
                        // eslint-disable-next-line eqeqeq
                      } else if (entryFeeIds != undefined) {
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
                      const fees = GetFees(
                        entryFeeJson.EntryFee,
                        entryFeeIds,
                        age,
                        currentClass.ClassShortName.indexOf("Ö") > -1
                      );

                      const raceResult = {
                        resultId: -1 - raceEvent.results.length,
                        competitorId: competitor.competitorId,
                        resultMultiDay: null,
                        teamResult: null,
                        className: shortClassName,
                        deviantEventClassificationId: null,
                        classClassificationId: GetClassClassificationId(
                          raceEvent.eventClassificationId,
                          classLevel,
                          clubModel.raceClubs.eventClassifications
                        ),
                        difficulty: classLevel ? classLevel.difficulty : null,
                        lengthInMeter: lengthInMeter,
                        failedReason: didNotStart
                          ? failedReasons.NotStarted
                          : !ok
                          ? failedReasons.NotFinished
                          : // eslint-disable-next-line eqeqeq
                          personResult.Result.Time == undefined
                          ? failedReasons.Finished
                          : null,
                        competitorTime: valid ? GetTimeWithHour(personResult.Result.Time) : null,
                        winnerTime: valid
                          ? WinnerTime(
                              personResult.Result.Time,
                              personResult.Result.TimeDiff,
                              parseInt(personResult.Result.ResultPosition)
                            )
                          : null,
                        secondTime: GetTimeWithHour(secondTime),
                        position: position,
                        nofStartsInClass: nofStartsInClass,
                        originalFee: fees.originalFee,
                        lateFee: fees.lateFee,
                        feeToClub: null,
                        award: null,
                        points: 0,
                        pointsOld: 0,
                        points1000: 0
                      };
                      raceEvent.results.push(raceResult);
                    }
                  }
                }
              } else {
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
              }
              raceWizardModel.setValue("raceEvent", editResultJson ? editResultJson : raceEvent);
              raceWizardModel.setValue("raceWinnerResults", raceWinnerResults);

              if (!isRelay && !editResultJson) {
                CalculateCompetitorsFee(raceWizardModel.raceEvent);
                CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
              }
            }
            onValidate(raceWizardModel.raceEvent.valid);
            self.setState(
              {
                loaded: true,
                isRelay: isRelay
              },
              () => {
                this.props.form.validateFields(undefined, {
                  force: true
                });
              }
            );
          })
          .catch(e => {
            if (e && e.message) {
              message.error(e.message);
            }
            onFailed && onFailed();
          });
      }

      render() {
        const { t, raceWizardModel, clubModel, form, onValidate, visible } = this.props;
        const { formId, isRelay, loaded } = this.state;
        const { getFieldDecorator, getFieldError } = form;
        const columns = [
          {
            title: t("results.Edit"),
            dataIndex: "edit",
            key: "edit",
            render: (text, record) => (
              <NoWrap>
                <StyledIcon
                  type="edit"
                  theme="twoTone"
                  onClick={() => {
                    const resultObject = { ...record };
                    let confirmModal;
                    confirmModal = confirm({
                      width: 800,
                      icon: <StyledIcon type="edit" theme="twoTone" />,
                      title: `${t("results.Edit")} (${
                        clubModel.raceClubs.selectedClub.competitorById(record.competitorId).fullName
                      }, ${record.className})`,
                      content: (
                        <EditResultIndividual
                          clubModel={clubModel}
                          paymentModel={raceWizardModel.raceEvent.paymentModel}
                          meetsAwardRequirements={raceWizardModel.raceEvent.meetsAwardRequirements}
                          isSprint={raceWizardModel.raceEvent.raceDistance === distances.sprint}
                          raceDate={raceWizardModel.raceEvent.raceDate}
                          eventClassificationId={raceWizardModel.raceEvent.eventClassificationId}
                          result={resultObject}
                          competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
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
                        const mobxResult = raceWizardModel.raceEvent.results.find(
                          r => r.resultId === resultObject.resultId
                        );
                        applySnapshot(mobxResult, resultObject);
                        mobxResult.setIsAwardTouched(clubModel.raceClubs, raceWizardModel.raceEvent);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }
                    });
                  }}
                />
                <Popconfirm
                  placement="right"
                  title={t("common.Confirm")}
                  okText={t("common.Yes")}
                  cancelText={t("common.No")}
                  onConfirm={() => {
                    raceWizardModel.raceEvent.removeResult(record);
                    onValidate(raceWizardModel.raceEvent.valid);
                  }}
                >
                  <StyledIcon type="delete" theme="twoTone" />
                </Popconfirm>
              </NoWrap>
            )
          },
          {
            title: t("results.Competitor"),
            dataIndex: "competitorId",
            key: "competitorId",
            render: id =>
              id == null ? <MissingTag t={t} /> : clubModel.raceClubs.selectedClub.competitorById(id).fullName
          },
          {
            title: t("results.Class"),
            dataIndex: "className",
            key: "className",
            render: value => (value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.ClassClassification"),
            dataIndex: "classClassificationId",
            key: "classClassificationId",
            render: (id, record) =>
              id ? (
                clubModel.raceClubs.classClassification(
                  record.deviantEventClassificationId
                    ? record.deviantEventClassificationId
                    : raceWizardModel.raceEvent.eventClassificationId,
                  id
                )
              ) : (
                <MissingTag t={t} />
              )
          },
          {
            title: t("results.Difficulty"),
            dataIndex: "difficulty",
            key: "difficulty",
            render: value => (value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.LengthInMeter"),
            dataIndex: "lengthInMeter",
            key: "lengthInMeter",
            render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.FailedReason"),
            dataIndex: "failedReason",
            key: "failedReason",
            render: reason => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null)
          },
          {
            title: t("results.Time"),
            dataIndex: "competitorTime",
            key: "competitorTime",
            render: (value, record) =>
              record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value)
          },
          {
            title: t("results.WinnerTime"),
            dataIndex: "winnerTime",
            key: "winnerTime",
            render: (value, record) =>
              record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value)
          },
          {
            title: t("results.SecondTime"),
            dataIndex: "secondTime",
            key: "secondTime",
            render: value => FormatTime(value)
          },
          {
            title: t("results.Position"),
            dataIndex: "position",
            key: "position",
            render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.NofStartsInClass"),
            dataIndex: "nofStartsInClass",
            key: "nofStartsInClass",
            render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.Award"),
            dataIndex: "award",
            key: "award"
          },
          {
            title: t("results.EventFee"),
            dataIndex: "fee",
            key: "fee",
            render: value => (value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.FeeToClub"),
            dataIndex: "feeToClub",
            key: "feeToClub",
            render: value => (value == null ? <MissingTag t={t} /> : value)
          },
          {
            title: t("results.DeviantEventClassification"),
            dataIndex: "deviantEventClassificationId",
            key: "deviantEventClassificationId"
          }
        ];

        const nameError = getFieldError("iName");
        const organiserNameError = getFieldError("iOrganiserName");
        const raceDateError = getFieldError("iRaceDate");
        const raceDistanceError = getFieldError("iRaceDistance");
        const raceLightConditionError = getFieldError("iRaceLightCondition");
        const paymentModelError = getFieldError("iPaymentModel");
        const eventClassificationError = getFieldError("iEventClassificationId");
        const sportCodeError = getFieldError("iSportCode");

        return loaded && visible ? (
          <Form id={formId}>
            <Row gutter={8}>
              <Col span={6}>
                <FormItem label={t("results.Name")} validateStatus={nameError ? "error" : ""} help={nameError || ""}>
                  {getFieldDecorator("iName", {
                    initialValue: raceWizardModel.raceEvent.name,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.Name")
                      }
                    ]
                  })(
                    <Input
                      onChange={e => {
                        raceWizardModel.raceEvent.setValue("name", e.currentTarget.value);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={6}>
                <FormItem
                  label={t("results.Club")}
                  validateStatus={organiserNameError ? "error" : ""}
                  help={organiserNameError || ""}
                >
                  {getFieldDecorator("iOrganiserName", {
                    initialValue: raceWizardModel.raceEvent.organiserName,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.Club")
                      }
                    ]
                  })(
                    <Input
                      onChange={e => {
                        raceWizardModel.raceEvent.setValue("organiserName", e.currentTarget.value);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem
                  label={t("results.Date")}
                  validateStatus={raceDateError ? "error" : ""}
                  help={raceDateError || ""}
                >
                  {getFieldDecorator("iRaceDate", {
                    initialValue:
                      // eslint-disable-next-line eqeqeq
                      raceWizardModel.raceEvent.raceDate == null
                        ? null
                        : moment(raceWizardModel.raceEvent.raceDate, dateFormat),
                    rules: [
                      {
                        required: true,
                        type: "object",
                        message: errorRequiredField(t, "results.Date")
                      }
                    ]
                  })(
                    <DatePicker
                      format={dateFormat}
                      allowClear={false}
                      onChange={date => {
                        date && raceWizardModel.raceEvent.setValue("raceDate", date.format(dateFormat));
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem label={t("results.Time")}>
                  {getFieldDecorator("iRaceTime", {
                    initialValue:
                      // eslint-disable-next-line eqeqeq
                      raceWizardModel.raceEvent.raceTime == null
                        ? null
                        : moment(raceWizardModel.raceEvent.raceTime, shortTimeFormat)
                  })(
                    <TimePicker
                      format={shortTimeFormat}
                      allowClear={true}
                      onChange={time => {
                        time && raceWizardModel.raceEvent.setValue("raceTime", time.format(shortTimeFormat));
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              {["OL", "SKIO", "MTBO"].includes(raceWizardModel.raceEvent.sportCode) ? (
                <Col span={4}>
                  <FormItem label={t("results.MeetsAwardRequirements")}>
                    {getFieldDecorator("iMeetsAwardRequirements", {
                      valuePropName: "checked",
                      initialValue: raceWizardModel.raceEvent.meetsAwardRequirements
                    })(
                      <Switch
                        onChange={checked => {
                          raceWizardModel.raceEvent.setValue("meetsAwardRequirements", checked);
                          CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
                        }}
                      />
                    )}
                  </FormItem>
                </Col>
              ) : null}
            </Row>
            <Row gutter={8}>
              <Col span={6}>
                <FormItem
                  label={t("results.EventClassification")}
                  validateStatus={eventClassificationError ? "error" : ""}
                  help={eventClassificationError || ""}
                >
                  {getFieldDecorator("iEventClassificationId", {
                    initialValue: raceWizardModel.raceEvent.eventClassificationId,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.EventClassification")
                      }
                    ]
                  })(
                    <FormSelect
                      dropdownMatchSelectWidth={false}
                      allowClear={false}
                      options={clubModel.raceClubs.eventClassificationOptions}
                      onChange={code => {
                        raceWizardModel.raceEvent.setValue("eventClassificationId", code);
                        ResetClassClassifications(
                          raceWizardModel.raceEvent,
                          clubModel.raceClubs.eventClassifications,
                          clubModel.raceClubs.classLevels
                        );
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={6}>
                <FormItem
                  label={t("results.PaymentModel")}
                  validateStatus={paymentModelError ? "error" : ""}
                  help={paymentModelError || ""}
                >
                  {getFieldDecorator("iPaymentModel", {
                    initialValue: raceWizardModel.raceEvent.paymentModel,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.RaceDistance")
                      }
                    ]
                  })(
                    <FormSelect
                      allowClear={false}
                      options={paymentOptions(t)}
                      onChange={code => {
                        raceWizardModel.raceEvent.setValue("paymentModel", code);
                        raceWizardModel.setValue("paymentModel", code);
                        CalculateCompetitorsFee(raceWizardModel.raceEvent);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem
                  label={t("results.Sport")}
                  validateStatus={sportCodeError ? "error" : ""}
                  help={sportCodeError || ""}
                >
                  {getFieldDecorator("iSportCode", {
                    initialValue:
                      // eslint-disable-next-line eqeqeq
                      raceWizardModel.raceEvent.sportCode == undefined
                        ? undefined
                        : raceWizardModel.raceEvent.sportCode,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.Sport")
                      }
                    ]
                  })(
                    <FormSelect
                      allowClear={false}
                      options={clubModel.raceClubs.sportOptions}
                      onChange={code => {
                        raceWizardModel.raceEvent.setValue("sportCode", code);
                        raceWizardModel.raceEvent.setValue("meetsAwardRequirements", code === "OL");
                        CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem
                  label={t("results.RaceDistance")}
                  validateStatus={raceDistanceError ? "error" : ""}
                  help={raceDistanceError || ""}
                >
                  {getFieldDecorator("iRaceDistance", {
                    initialValue:
                      // eslint-disable-next-line eqeqeq
                      raceWizardModel.raceEvent.raceDistance == undefined
                        ? undefined
                        : raceWizardModel.raceEvent.raceDistance,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.RaceDistance")
                      }
                    ]
                  })(
                    <FormSelect
                      allowClear={true}
                      options={isRelay ? raceRelayDistanceOptions(t) : raceDistanceOptions(t)}
                      onChange={code => {
                        raceWizardModel.raceEvent.setValue("raceDistance", code);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem
                  label={t("results.RaceLightCondition")}
                  validateStatus={raceLightConditionError ? "error" : ""}
                  help={raceLightConditionError || ""}
                >
                  {getFieldDecorator("iRaceLightCondition", {
                    initialValue:
                      // eslint-disable-next-line eqeqeq
                      raceWizardModel.raceEvent.raceLightCondition == undefined
                        ? undefined
                        : raceWizardModel.raceEvent.raceLightCondition,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "results.RaceLightCondition")
                      }
                    ]
                  })(
                    <FormSelect
                      allowClear={true}
                      options={raceLightConditionOptions(t)}
                      onChange={code => {
                        raceWizardModel.raceEvent.setValue("raceLightCondition", code);
                        onValidate(raceWizardModel.raceEvent.valid);
                      }}
                    />
                  )}
                </FormItem>
              </Col>
            </Row>
            {isRelay ? (
              <StyledImg
                alt="Under construction"
                src="http://clipart-library.com/img/1011925.jpg"
                height={160}
                width={332}
              />
            ) : (
              <StyledTable
                columns={columns}
                dataSource={raceWizardModel.raceEvent.results.map(result => ({
                  ...getSnapshot(result),
                  isAwardTouched: result.isAwardTouched,
                  fee: `${
                    result.originalFee != null && result.lateFee != null ? result.originalFee + result.lateFee : null
                  }`
                }))}
                pagination={{ pageSize: 5 }}
                size="middle"
              />
            )}
          </Form>
        ) : visible ? (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        ) : null;
      }
    }
  )
);

const ResultWizardStep2EditRaceForm = Form.create()(ResultWizardStep2EditRace);
const ResultWizardStep2EditRaceWithI18n = withTranslation()(ResultWizardStep2EditRaceForm); // pass `t` function to App

export default ResultWizardStep2EditRaceWithI18n;
