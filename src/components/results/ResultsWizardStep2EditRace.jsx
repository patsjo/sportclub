import React, { Component } from 'react';
import { Spin, Form, Switch, Input, DatePicker, TimePicker, Modal, message, Row, Col, Popconfirm } from 'antd';
import { MissingTag, NoWrap, SpinnerDiv, StyledIcon, StyledTable } from '../styled/styled';
import { observer, inject } from 'mobx-react';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { GetJsonData, PostJsonData } from '../../utils/api';
import {
  genders,
  payments,
  paymentOptions,
  raceDistanceOptions,
  raceLightConditionOptions,
  failedReasons,
  distances,
} from '../../utils/resultConstants';
import FormItem from '../formItems/FormItem';
import { errorRequiredField, FormSelect, dateFormat, shortTimeFormat } from '../../utils/formHelper';
import {
  ConvertSecondsToTime,
  ConvertSecondsWithFractionsToTime,
  TimeDiff,
  WinnerTime,
  FormatTime,
  GetSplitTimes,
  GetRelaySplitTimes,
  GetMissingTime,
  GetLength,
  GetAge,
  GetFees,
  GetTimeWithHour,
  GetSecondsWithFractionsPerKiloMeter,
  CalculateCompetitorsFee,
  ResetClassClassifications,
  GetClassShortName,
  GetClassClassificationId,
  CalculateAllAwards,
} from '../../utils/resultHelper';
import PropTypes from 'prop-types';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';
import EditResultIndividual from './EditResultIndividual';
import EditResultRelay from './EditResultRelay';
import { withTranslation } from 'react-i18next';
import moment from 'moment';

const { info } = Modal;
const MakeArray = (object) => (!object ? [] : Array.isArray(object) ? object : [object]);

// @inject("clubModel")
// @observer
const ResultWizardStep2EditRace = inject(
  'sessionModel',
  'clubModel',
  'raceWizardModel'
)(
  observer(
    class ResultWizardStep2EditRace extends Component {
      static propTypes = {
        visible: PropTypes.string.isRequired,
        onFailed: PropTypes.func.isRequired,
        onValidate: PropTypes.func.isRequired,
      };
      formRef = React.createRef();

      constructor(props) {
        super(props);
        this.state = {
          loaded: false,
          eventObject: undefined,
          showStart: false,
          showResult: false,
          isRelay: false,
          formId: 'addMapCompetitor' + Math.floor(Math.random() * 10000000000000000),
        };
      }

      componentDidMount() {
        const self = this;
        const { t, sessionModel, clubModel, raceWizardModel, onFailed, onValidate } = this.props;

        if (!raceWizardModel.existInEventor) {
          raceWizardModel.setValue('raceEvent', {
            eventId: -1,
            raceDate: moment().format('YYYY-MM-DD'),
            paymentModel: raceWizardModel.paymentModel,
            meetsAwardRequirements: true,
            sportCode: 'OL',
            isRelay: false,
            eventClassificationId: 'F',
            results: [],
            teamResults: [],
          });
          onValidate(raceWizardModel.raceEvent.valid);
          self.setState(
            {
              loaded: true,
              isRelay: false,
            },
            () => {
              self.formRef.current.validateFields(undefined, {
                force: true,
              });
            }
          );
          return;
        }

        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;
        const editResultPromise = !raceWizardModel.overwrite
          ? PostJsonData(
              url,
              { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
              true,
              sessionModel.authorizationHeader
            )
          : new Promise((resolve) => resolve(undefined));

        const entriesPromise = raceWizardModel.selectedEventorId
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(
                  clubModel.eventor.entriesUrl +
                    '?eventIds=' +
                    raceWizardModel.selectedEventorId +
                    '&organisationIds=' +
                    clubModel.raceClubs.selectedClub.eventorOrganisationId +
                    '&includeEntryFees=true'
                ) +
                '&headers=' +
                encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
              true
            )
          : new Promise((resolve) => resolve(undefined));
        const classPromise = raceWizardModel.selectedEventorId
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(
                  clubModel.eventor.classesUrl +
                    '?eventId=' +
                    raceWizardModel.selectedEventorId +
                    '&includeEntryFees=true'
                ) +
                '&headers=' +
                encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
              false
            )
          : new Promise((resolve) => resolve(undefined));
        const resultPromise = raceWizardModel.selectedEventorId
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(
                  clubModel.eventor.resultUrl +
                    '?eventId=' +
                    raceWizardModel.selectedEventorId +
                    '&organisationIds=' +
                    clubModel.raceClubs.selectedClub.eventorOrganisationId +
                    `&top=${raceWizardModel.selectedIsRelay ? 30 : 15}&includeSplitTimes=true`
                ) +
                '&headers=' +
                encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
              false
            )
          : new Promise((resolve) => resolve(undefined));
        const lengthPromise = raceWizardModel.selectedEventorId
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(
                  clubModel.eventor.lengthUrl +
                    '?eventId=' +
                    raceWizardModel.selectedEventorId +
                    '&eventRaceId=' +
                    raceWizardModel.selectedEventorRaceId +
                    '&groupBy=EventClass'
                ) +
                '&noJsonConvert=true&headers=' +
                encodeURIComponent('ApiKey: ' + self.props.clubModel.eventor.apiKey),
              false
            )
          : new Promise((resolve) => resolve(undefined));
        const entryFeePromise = raceWizardModel.selectedEventorId
          ? GetJsonData(
              clubModel.corsProxy +
                encodeURIComponent(clubModel.eventor.entryFeeUrl + raceWizardModel.selectedEventorId) +
                '&headers=' +
                encodeURIComponent('ApiKey: ' + clubModel.eventor.apiKey),
              true
            )
          : new Promise((resolve) => resolve(undefined));

        Promise.all([editResultPromise, entriesPromise, classPromise, resultPromise, entryFeePromise, lengthPromise])
          .then(async ([editResultJson, entriesJson, classJson, resultJson, entryFeeJson, lengthHtmlJson]) => {
            const isRelay =
              resultJson &&
              resultJson.Event &&
              resultJson.Event['@attributes'] &&
              resultJson.Event['@attributes'].eventForm &&
              resultJson.Event['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0;
            // 1 = championchip, 2 = National, 3 = District, 4 = Nearby, 5 = Club, 6 = International
            const eventorEventClassificationId =
              resultJson && resultJson.Event ? resultJson.Event.EventClassificationId : null;
            let eventClassificationId = 'F';
            if (eventorEventClassificationId !== null) {
              switch (eventorEventClassificationId) {
                case '1':
                  eventClassificationId = 'E';
                  break;
                case '3':
                  eventClassificationId = 'I';
                  break;
                case '4':
                case '5':
                  eventClassificationId = 'G';
                  break;
                case '6':
                  eventClassificationId = 'B';
                  break;
                default:
              }
            }
            // eslint-disable-next-line eqeqeq
            if (entriesJson == undefined || entriesJson.Entry == undefined) {
              entriesJson = { Entry: [] };
            } else if (!Array.isArray(entriesJson.Entry)) {
              entriesJson.Entry = [entriesJson.Entry];
            }

            if (!entryFeeJson) {
              entryFeeJson = { EntryFee: [] };
            } else if (!Array.isArray(entryFeeJson.EntryFee)) {
              entryFeeJson.EntryFee = entryFeeJson.EntryFee ? [entryFeeJson.EntryFee] : [];
            }
            if (classJson) {
              classJson.EventClass = MakeArray(classJson.EventClass);
            }

            let raceEvent;
            // eslint-disable-next-line eqeqeq
            if (resultJson != undefined) {
              if (Array.isArray(resultJson.Event.EventRace)) {
                resultJson.EventRace = resultJson.Event.EventRace.find(
                  (eventRace) => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                );
                resultJson.Event.Name = resultJson.Event.Name + ', ' + resultJson.EventRace.Name;
              } else {
                resultJson.EventRace = resultJson.Event.EventRace;
              }

              const raceLightCondition = resultJson.EventRace['@attributes'].raceLightCondition;
              raceEvent = {
                eventId: raceWizardModel.selectedEventId,
                eventorId: raceWizardModel.selectedEventorId,
                eventorRaceId: raceWizardModel.selectedEventorRaceId,
                name: resultJson.Event.Name,
                organiserName: resultJson.Event.Organiser.Organisation.Name,
                raceDate: resultJson.EventRace.RaceDate.Date,
                raceTime:
                  resultJson.EventRace.RaceDate.Clock === '00:00:00' ? null : resultJson.EventRace.RaceDate.Clock,
                sportCode: 'OL',
                isRelay: isRelay,
                eventClassificationId: eventClassificationId,
                raceLightCondition: raceLightConditionOptions(t).some((option) => option.code === raceLightCondition)
                  ? raceLightCondition
                  : null,
                raceDistance: resultJson.EventRace['@attributes'].raceDistance,
                paymentModel: raceWizardModel.paymentModel,
                meetsAwardRequirements: true,
                longitude: resultJson.EventRace.EventCenterPosition
                  ? parseFloat(resultJson.EventRace.EventCenterPosition['@attributes'].x)
                  : null,
                latitude: resultJson.EventRace.EventCenterPosition
                  ? parseFloat(resultJson.EventRace.EventCenterPosition['@attributes'].y)
                  : null,
                results: [],
                teamResults: [],
              };
            }

            // eslint-disable-next-line eqeqeq
            if (resultJson != undefined && resultJson.ClassResult != undefined) {
              const raceWinnerResults = [];
              const ClassResults = MakeArray(resultJson.ClassResult);
              if (!isRelay) {
                for (let i = 0; i < ClassResults.length; i++) {
                  const classResult = ClassResults[i];
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
                        (raceInfo) => raceInfo.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                      );
                    }
                    currentClass.numberOfStarts = currentClass.ClassRaceInfo['@attributes'].noOfStarts;
                  }

                  // eslint-disable-next-line eqeqeq
                  if (classResult.PersonResult != undefined) {
                    const personResults = Array.isArray(classResult.PersonResult)
                      ? classResult.PersonResult.filter(
                          (personResult) =>
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

                    personResults.forEach((personResult) => {
                      // eslint-disable-next-line eqeqeq
                      if (personResult.Result == undefined && personResult.RaceResult.Result != undefined) {
                        personResult.Result = personResult.RaceResult.Result;
                      }
                    });
                    const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetSplitTimes(personResults);
                    const shortClassName = GetClassShortName(currentClass.ClassShortName);
                    const classLevel = clubModel.raceClubs.classLevels
                      .filter((cl) => shortClassName.indexOf(cl.classShortName) >= 0)
                      .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                      .find(() => true);
                    const lengthInMeter = GetLength(lengthHtmlJson, currentClass.Name);
                    const winnerResult = personResults.find(
                      (personResult) => personResult.Result.ResultPosition === '1'
                    );

                    if (
                      winnerResult &&
                      (!classLevel ||
                        (classLevel.difficulty.toLowerCase() !== 'grön' &&
                          classLevel.difficulty.toLowerCase() !== 'vit' &&
                          classLevel.difficulty.toLowerCase() !== 'gul'))
                    ) {
                      const secondsPerKilometer = GetSecondsWithFractionsPerKiloMeter(
                        winnerResult.Result.Time,
                        lengthInMeter
                      );
                      raceWinnerResults.push({
                        id: raceWinnerResults.length,
                        personName: `${winnerResult.Person.PersonName.Given} ${winnerResult.Person.PersonName.Family}`,
                        className: shortClassName,
                        difficulty: classLevel ? classLevel.difficulty : null,
                        lengthInMeter: lengthInMeter,
                        winnerTime: winnerResult.Result.Time,
                        secondsPerKilometer: secondsPerKilometer,
                        timePerKilometer: ConvertSecondsWithFractionsToTime(secondsPerKilometer),
                      });
                    }

                    if (!editResultJson) {
                      const clubPersonResults = personResults.filter(
                        (personResult) =>
                          personResult.Organisation &&
                          personResult.Organisation.OrganisationId ===
                            clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()
                      );

                      for (let j = 0; j < clubPersonResults.length; j++) {
                        const personResult = clubPersonResults[j];
                        let competitor;
                        if (
                          typeof personResult.Person.PersonId === 'string' &&
                          personResult.Person.PersonId.length > 0
                        ) {
                          if (!competitor) {
                            competitor = clubModel.raceClubs.selectedClub.competitorByEventorId(
                              parseInt(personResult.Person.PersonId)
                            );
                          }

                          if (!competitor) {
                            competitor = clubModel.raceClubs.selectedClub.competitors.find(
                              (c) =>
                                c.firstName === personResult.Person.PersonName.Given &&
                                c.lastName === personResult.Person.PersonName.Family &&
                                c.birthDay === personResult.Person.BirthDate?.Date
                            );
                            if (competitor) {
                              await competitor.addEventorId(
                                clubModel.modules.find((module) => module.name === 'Results').addUrl,
                                personResult.Person.PersonId
                              );
                            }
                          }
                        }
                        if (!competitor) {
                          competitor = await AddMapCompetitorConfirmModal(
                            t,
                            undefined,
                            personResult.Person.PersonId,
                            {
                              iType: 'COMPETITOR',
                              iFirstName: personResult.Person.PersonName.Given,
                              iLastName: personResult.Person.PersonName.Family,
                              iBirthDay:
                                personResult.Person.BirthDate == null ? null : personResult.Person.BirthDate?.Date,
                              iGender:
                                personResult.Person['@attributes'] == null
                                  ? null
                                  : personResult.Person['@attributes'].sex === 'F'
                                  ? genders.FeMale
                                  : genders.Male,
                              iClubId: clubModel.raceClubs.selectedClub.clubId,
                              iStartDate: '1930-01-01',
                              iEndDate: null,
                              iEventorCompetitorId:
                                typeof personResult.Person.PersonId !== 'string' ||
                                personResult.Person.PersonId.length === 0
                                  ? null
                                  : personResult.Person.PersonId,
                            },
                            currentClass.ClassShortName,
                            clubModel
                          );
                        }

                        const entry = entriesJson.Entry.find(
                          (entry) => entry.Competitor.PersonId === personResult.Person.PersonId
                        );
                        // eslint-disable-next-line eqeqeq
                        let entryFeeIds = entry != undefined ? entry.EntryEntryFee : currentClass.ClassEntryFee;
                        if (Array.isArray(entryFeeIds)) {
                          entryFeeIds = entryFeeIds.map((f) => f.EntryFeeId);
                          // eslint-disable-next-line eqeqeq
                        } else if (entryFeeIds != undefined) {
                          entryFeeIds = [entryFeeIds.EntryFeeId];
                        }

                        const age = GetAge(competitor.birthDay, resultJson.EventRace.RaceDate.Date);
                        const didNotStart = personResult.Result.CompetitorStatus['@attributes'].value === 'DidNotStart';
                        const misPunch = personResult.Result.CompetitorStatus['@attributes'].value === 'MisPunch';
                        const ok = personResult.Result.CompetitorStatus['@attributes'].value === 'OK';
                        const valid = ok && !didNotStart && !misPunch;
                        const position =
                          valid && personResult.Result.ResultPosition
                            ? parseInt(personResult.Result.ResultPosition)
                            : null;
                        const nofStartsInClass = valid ? parseInt(currentClass.numberOfStarts) : null;
                        const secondTime =
                          valid && nofStartsInClass > 1 && personResults.some((pr) => pr.Result.ResultPosition === '2')
                            ? personResults.find((pr) => pr.Result.ResultPosition === '2').Result.Time
                            : null;
                        const fees = GetFees(
                          entryFeeJson.EntryFee,
                          entryFeeIds,
                          age,
                          currentClass.ClassShortName.indexOf('Ö') > -1
                        );

                        const raceResult = {
                          resultId: -1 - raceEvent.results.length,
                          competitorId: competitor.competitorId,
                          resultMultiDay: null,
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
                            : !personResult.Result.Time ||
                              (position !== 1 && !personResult.Result.TimeDiff) ||
                              shortClassName === 'INSK'
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
                          points1000: 0,
                          missingTime: GetMissingTime(
                            personResult.Person?.PersonId,
                            splitTimes,
                            bestSplitTimes,
                            secondBestSplitTimes
                          ),
                        };
                        raceEvent.results.push(raceResult);
                      }
                    }
                  }
                }
              } else if (isRelay && !editResultJson) {
                for (let i = 0; i < ClassResults.length; i++) {
                  const classResult = ClassResults[i];
                  let currentClass = {
                    EventClassId: classResult.EventClass.EventClassId,
                  };
                  // eslint-disable-next-line eqeqeq
                  if (classJson != undefined) {
                    currentClass = classJson.EventClass.find(
                      (evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId
                    );
                    currentClass.ClassRaceInfo = MakeArray(currentClass.ClassRaceInfo);
                    currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.map((classRaceInfo) => ({
                      ClassRaceInfoId: classRaceInfo.ClassRaceInfoId,
                      leg: parseInt(classRaceInfo['@attributes'].relayLeg),
                      numberOfStarts: parseInt(classRaceInfo['@attributes'].noOfStarts),
                    }));
                  }
                  currentClass.numberOfStarts = parseInt(
                    classResult.EventClass.ClassRaceInfo['@attributes'].noOfStarts
                  );

                  // eslint-disable-next-line eqeqeq
                  if (classResult.TeamResult != undefined) {
                    const teamResults = Array.isArray(classResult.TeamResult)
                      ? classResult.TeamResult.filter(
                          (teamResult) =>
                            // eslint-disable-next-line eqeqeq
                            teamResult.RaceResult == undefined ||
                            teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId.toString()
                        )
                      : // eslint-disable-next-line eqeqeq
                      classResult.TeamResult.RaceResult == undefined ||
                        classResult.TeamResult.RaceResult.EventRaceId ===
                          raceWizardModel.selectedEventorRaceId.toString()
                      ? [classResult.TeamResult]
                      : [];

                    teamResults.forEach((teamResult) => {
                      if (
                        // eslint-disable-next-line eqeqeq
                        teamResult.TeamMemberResult == undefined &&
                        // eslint-disable-next-line eqeqeq
                        teamResult.RaceResult.TeamMemberResult != undefined
                      ) {
                        teamResult.TeamMemberResult = teamResult.RaceResult.TeamMemberResult;
                      }
                    });
                    const allLegsSplitTimes = GetRelaySplitTimes(teamResults);
                    const numberOfLegs = parseInt(currentClass['@attributes'].numberOfLegs);
                    const shortClassName = GetClassShortName(currentClass.ClassShortName);
                    const classLevel = clubModel.raceClubs.classLevels
                      .filter((cl) => shortClassName.indexOf(cl.classShortName) >= 0)
                      .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                      .find(() => true);

                    const clubTeamMemberResults = [];
                    teamResults.forEach((teamResult) => {
                      const members = MakeArray(teamResult.TeamMemberResult);
                      const teamOrganisations = MakeArray(teamResult.Organisation);
                      const hasClubMembers = teamOrganisations.some(
                        (org) =>
                          org.OrganisationId === clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()
                      );
                      members.forEach((member) => {
                        const competitor =
                          hasClubMembers &&
                          typeof member.Person.PersonId === 'string' &&
                          member.Person.PersonId.length > 0
                            ? clubModel.raceClubs.selectedClub.competitorByEventorId(parseInt(member.Person.PersonId))
                            : null;

                        if (
                          (member.Organisation &&
                            member.Organisation.OrganisationId ===
                              clubModel.raceClubs.selectedClub.eventorOrganisationId.toString()) ||
                          competitor ||
                          (hasClubMembers && teamOrganisations.length === 1)
                        ) {
                          clubTeamMemberResults.push({
                            ...member,
                            Competitor: competitor,
                            TeamName: teamResult.TeamName,
                            TeamTime: teamResult.Time,
                            TeamTimeDiff: teamResult.TimeDiff,
                            TeamPosition: teamResult.ResultPosition,
                            TeamStatus: teamResult.TeamStatus,
                            BibNumber: teamResult.BibNumber,
                          });
                        }
                      });
                    });

                    for (let j = 0; j < clubTeamMemberResults.length; j++) {
                      const teamMemberResult = clubTeamMemberResults[j];
                      let competitor = teamMemberResult.Competitor;
                      if (
                        typeof teamMemberResult.Person.PersonId === 'string' &&
                        teamMemberResult.Person.PersonId.length > 0
                      ) {
                        if (!competitor) {
                          competitor = clubModel.raceClubs.selectedClub.competitors.find(
                            (c) =>
                              c.firstName === teamMemberResult.Person.PersonName.Given &&
                              c.lastName === teamMemberResult.Person.PersonName.Family &&
                              c.birthDay === teamMemberResult.Person.BirthDate?.Date
                          );
                          if (competitor) {
                            await competitor.addEventorId(
                              clubModel.modules.find((module) => module.name === 'Results').addUrl,
                              teamMemberResult.Person.PersonId
                            );
                          }
                        }
                      }
                      if (!competitor) {
                        competitor = await AddMapCompetitorConfirmModal(
                          t,
                          undefined,
                          teamMemberResult.Person.PersonId,
                          {
                            iType: 'COMPETITOR',
                            iFirstName: teamMemberResult.Person.PersonName.Given,
                            iLastName: teamMemberResult.Person.PersonName.Family,
                            iBirthDay:
                              // eslint-disable-next-line eqeqeq
                              teamMemberResult.Person.BirthDate == undefined
                                ? null
                                : teamMemberResult.Person.BirthDate?.Date,
                            iGender:
                              teamMemberResult.Person['@attributes'] == null
                                ? null
                                : teamMemberResult.Person['@attributes'].sex === 'F'
                                ? genders.FeMale
                                : genders.Male,
                            iClubId: clubModel.raceClubs.selectedClub.clubId,
                            iStartDate: '1930-01-01',
                            iEndDate: null,
                            iEventorCompetitorId:
                              typeof teamMemberResult.Person.PersonId !== 'string' ||
                              teamMemberResult.Person.PersonId.length === 0
                                ? null
                                : teamMemberResult.Person.PersonId,
                          },
                          currentClass.ClassShortName,
                          clubModel
                        );
                      }

                      const didNotStart = teamMemberResult.CompetitorStatus['@attributes'].value === 'DidNotStart';
                      const misPunch = teamMemberResult.CompetitorStatus['@attributes'].value === 'MisPunch';
                      const ok = teamMemberResult.CompetitorStatus['@attributes'].value === 'OK';
                      const valid = ok && !didNotStart && !misPunch;
                      const position = valid ? parseInt(teamMemberResult.Position) : null;
                      const leg = parseInt(teamMemberResult.Leg);
                      const nofStartsInClass = valid
                        ? parseInt(
                            currentClass.ClassRaceInfo.find((classRaceInfo) => classRaceInfo.leg === leg).numberOfStarts
                          )
                        : null;
                      //const secondTime =
                      //  valid && nofStartsInClass > 1
                      //    ? personResults.find(pr => pr.Result.ResultPosition === "2").Result.Time
                      //    : null;

                      const stageOk = teamMemberResult.OverallResult.TeamStatus['@attributes'].value === 'OK';
                      const teamDidNotStart = teamMemberResult.TeamStatus['@attributes'].value === 'DidNotStart';
                      const teamMisPunch = teamMemberResult.TeamStatus['@attributes'].value === 'MisPunch';
                      const teamOk = teamMemberResult.TeamStatus['@attributes'].value === 'OK';
                      const teamValid = teamOk && !teamDidNotStart && !teamMisPunch;
                      const teamPosition = teamValid ? parseInt(teamMemberResult.TeamPosition) : null;
                      const totalStagePosition =
                        stageOk && teamMemberResult.OverallResult.ResultPosition
                          ? parseInt(teamMemberResult.OverallResult.ResultPosition)
                          : null;
                      const totalStageTimeBehind = stageOk
                        ? GetTimeWithHour(teamMemberResult.OverallResult.TimeDiff)
                        : null;
                      let deltaPositions;
                      let deltaTimeBehind;
                      if (leg > 1 && stageOk) {
                        const prevLeg = (leg - 1).toString();
                        const prevResult = MakeArray(
                          teamResults.find((teamResult) => teamResult.BibNumber === teamMemberResult.BibNumber)
                            .TeamMemberResult
                        ).find((tmr) => tmr.Leg === prevLeg);
                        const prevOverallResult = prevResult ? prevResult.OverallResult : null;
                        const prevStagePosition =
                          prevOverallResult && prevOverallResult.ResultPosition
                            ? parseInt(prevOverallResult.ResultPosition)
                            : null;
                        const prevStageTimeBehind = prevOverallResult
                          ? GetTimeWithHour(prevOverallResult.TimeDiff)
                          : null;
                        deltaPositions =
                          totalStagePosition && prevStagePosition ? totalStagePosition - prevStagePosition : null;
                        deltaTimeBehind = prevStageTimeBehind
                          ? TimeDiff(prevStageTimeBehind, totalStageTimeBehind)
                          : null;
                      }

                      const legSplitTimes = allLegsSplitTimes.find((lst) => lst.leg === teamMemberResult.Leg);
                      const raceTeamResult = {
                        teamResultId: -1 - raceEvent.teamResults.length,
                        competitorId: competitor.competitorId,
                        className: shortClassName,
                        deviantEventClassificationId: null,
                        classClassificationId: GetClassClassificationId(
                          raceEvent.eventClassificationId,
                          classLevel,
                          clubModel.raceClubs.eventClassifications
                        ),
                        difficulty: classLevel ? classLevel.difficulty : null,
                        teamName: teamMemberResult.TeamName,
                        lengthInMeter: null,
                        failedReason: didNotStart
                          ? failedReasons.NotStarted
                          : !ok
                          ? failedReasons.NotFinished
                          : // eslint-disable-next-line eqeqeq
                          teamMemberResult.Time == undefined
                          ? failedReasons.Finished
                          : null,
                        teamFailedReason: teamDidNotStart
                          ? failedReasons.NotStarted
                          : !teamOk
                          ? failedReasons.NotFinished
                          : // eslint-disable-next-line eqeqeq
                          teamValid && (!teamPosition || !currentClass.numberOfStarts || !teamMemberResult.TeamTimeDiff)
                          ? failedReasons.Finished
                          : null,
                        competitorTime: valid ? GetTimeWithHour(teamMemberResult.Time) : null,
                        winnerTime:
                          valid && (teamMemberResult.TimeBehind || teamMemberResult.Position === '1')
                            ? WinnerTime(
                                teamMemberResult.Time,
                                ConvertSecondsToTime(teamMemberResult.TimeBehind),
                                teamMemberResult.Position ? parseInt(teamMemberResult.Position) : 2
                              )
                            : null,
                        secondTime: null, //TODO GetTimeWithHour(secondTime),
                        position: position,
                        nofStartsInClass: nofStartsInClass,
                        stage: leg,
                        totalStages: numberOfLegs,
                        deltaPositions: deltaPositions,
                        deltaTimeBehind: deltaTimeBehind,
                        totalStagePosition: totalStagePosition,
                        totalStageTimeBehind: totalStageTimeBehind,
                        totalPosition: teamPosition,
                        totalNofStartsInClass: currentClass.numberOfStarts,
                        totalTimeBehind: teamValid ? GetTimeWithHour(teamMemberResult.TeamTimeDiff) : null,
                        points1000: 0,
                        missingTime: GetMissingTime(
                          teamMemberResult.Person.PersonId,
                          legSplitTimes.splitTimes,
                          legSplitTimes.bestSplitTimes,
                          legSplitTimes.secondBestSplitTimes
                        ),
                      };
                      raceEvent.teamResults.push(raceTeamResult);
                    }
                  }
                }
              }
              raceWizardModel.setValue('raceEvent', editResultJson ? editResultJson : raceEvent);
              raceWizardModel.setValue('raceWinnerResults', raceWinnerResults);

              if (!isRelay && !editResultJson) {
                CalculateCompetitorsFee(
                  raceWizardModel.raceEvent,
                  clubModel.raceClubs.selectedClub,
                  clubModel.raceClubs.eventClassifications
                );
                CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
              }
              // eslint-disable-next-line eqeqeq
            } else if (editResultJson != undefined) {
              raceWizardModel.setValue('raceEvent', editResultJson);
            } else {
              raceWizardModel.setValue('raceEvent', raceEvent);
            }
            onValidate(raceWizardModel.raceEvent.valid);
            self.setState(
              {
                loaded: true,
                isRelay: isRelay,
              },
              () => {
                self.formRef.current.validateFields(undefined, {
                  force: true,
                });
              }
            );
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            onFailed && onFailed();
          });
      }

      render() {
        const self = this;
        const { t, raceWizardModel, clubModel, onValidate, visible } = this.props;
        const { formId, isRelay, loaded } = this.state;
        let columns = [
          {
            title: t('results.Edit'),
            dataIndex: 'edit',
            key: 'edit',
            render: (text, record) => (
              <NoWrap>
                <StyledIcon
                  type="edit"
                  onClick={() => {
                    const resultObject = { ...record };
                    let confirmModal;
                    confirmModal = info({
                      width: 800,
                      icon: <StyledIcon type="edit" />,
                      title: `${t('results.Edit')} (${
                        clubModel.raceClubs.selectedClub.competitorById(record.competitorId).fullName
                      }, ${record.className})`,
                      content: !isRelay ? (
                        <EditResultIndividual
                          clubModel={clubModel}
                          paymentModel={raceWizardModel.raceEvent.paymentModel}
                          meetsAwardRequirements={raceWizardModel.raceEvent.meetsAwardRequirements}
                          isSprint={raceWizardModel.raceEvent.raceDistance === distances.sprint}
                          raceDate={raceWizardModel.raceEvent.raceDate}
                          eventClassificationId={raceWizardModel.raceEvent.eventClassificationId}
                          result={resultObject}
                          results={raceWizardModel.raceEvent.results}
                          competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
                          onValidate={(valid) =>
                            confirmModal.update({
                              okButtonProps: {
                                disabled: !valid,
                              },
                            })
                          }
                        />
                      ) : (
                        <EditResultRelay
                          clubModel={clubModel}
                          raceDate={raceWizardModel.raceEvent.raceDate}
                          eventClassificationId={raceWizardModel.raceEvent.eventClassificationId}
                          raceLightCondition={raceWizardModel.raceEvent.raceLightCondition}
                          result={resultObject}
                          results={raceWizardModel.raceEvent.teamResults}
                          competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
                          onValidate={(valid) =>
                            confirmModal.update({
                              okButtonProps: {
                                disabled: !valid,
                              },
                            })
                          }
                        />
                      ),
                      okText: t('common.Save'),
                      okButtonProps: {
                        disabled: true,
                      },
                      cancelText: t('common.Cancel'),
                      onOk() {
                        if (isRelay) {
                          const mobxResult = raceWizardModel.raceEvent.teamResults.find(
                            (r) => r.teamResultId === resultObject.teamResultId
                          );
                          applySnapshot(mobxResult, resultObject);
                        } else {
                          const mobxResult = raceWizardModel.raceEvent.results.find(
                            (r) => r.resultId === resultObject.resultId
                          );
                          applySnapshot(mobxResult, resultObject);
                          mobxResult.setIsAwardTouched(clubModel.raceClubs, raceWizardModel.raceEvent);
                        }
                        onValidate(raceWizardModel.raceEvent.valid);
                      },
                    });
                  }}
                />
                <Popconfirm
                  placement="right"
                  title={t('common.Confirm')}
                  okText={t('common.Yes')}
                  cancelText={t('common.No')}
                  onConfirm={() => {
                    if (isRelay) {
                      raceWizardModel.raceEvent.removeTeamResult(record);
                    } else {
                      raceWizardModel.raceEvent.removeResult(record);
                    }
                    onValidate(raceWizardModel.raceEvent.valid);
                  }}
                >
                  <StyledIcon type="delete" />
                </Popconfirm>
              </NoWrap>
            ),
          },
          {
            title: t('results.Competitor'),
            dataIndex: 'competitorId',
            key: 'competitorId',
            render: (id) =>
              id == null ? <MissingTag t={t} /> : clubModel.raceClubs.selectedClub.competitorById(id).fullName,
          },
          {
            title: t('results.Class'),
            dataIndex: 'className',
            key: 'className',
            render: (value) => (value == null ? <MissingTag t={t} /> : value),
          },
          {
            title: t('results.ClassClassification'),
            dataIndex: 'classClassificationId',
            key: 'classClassificationId',
            render: (id, record) => {
              if (id) {
                const classClassificationDescription = clubModel.raceClubs.classClassification(
                  record.deviantEventClassificationId
                    ? record.deviantEventClassificationId
                    : raceWizardModel.raceEvent.eventClassificationId,
                  id
                );
                return classClassificationDescription ? classClassificationDescription : <MissingTag t={t} />;
              }
              return <MissingTag t={t} />;
            },
          },
          {
            title: t('results.Difficulty'),
            dataIndex: 'difficulty',
            key: 'difficulty',
            render: (value) => (value == null ? <MissingTag t={t} /> : value),
          },
          {
            title: t('results.LengthInMeter'),
            dataIndex: 'lengthInMeter',
            key: 'lengthInMeter',
            render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
          },
          {
            title: t('results.FailedReason'),
            dataIndex: 'failedReason',
            key: 'failedReason',
            render: (reason) => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null),
          },
          {
            title: t('results.Time'),
            dataIndex: 'competitorTime',
            key: 'competitorTime',
            render: (value, record) =>
              record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value),
          },
          {
            title: t('results.WinnerTime'),
            dataIndex: 'winnerTime',
            key: 'winnerTime',
            render: (value, record) =>
              record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value),
          },
          {
            title: t('results.SecondTime'),
            dataIndex: 'secondTime',
            key: 'secondTime',
            render: (value) => FormatTime(value),
          },
          {
            title: t('results.Position'),
            dataIndex: 'position',
            key: 'position',
            render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
          },
          {
            title: t('results.NofStartsInClass'),
            dataIndex: 'nofStartsInClass',
            key: 'nofStartsInClass',
            render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
          },
        ];

        if (isRelay) {
          columns = [
            ...columns,
            ...[
              {
                title: t('results.Stage'),
                dataIndex: 'stageText',
                key: 'stageText',
                render: (value, record) =>
                  record.stage == null || record.totalStages == null ? <MissingTag t={t} /> : value,
              },
              {
                title: t('results.DeltaPositions'),
                dataIndex: 'deltaPositions',
                key: 'deltaPositions',
              },
              {
                title: t('results.DeltaTimeBehind'),
                dataIndex: 'deltaTimeBehind',
                key: 'deltaTimeBehind',
                render: (value) => FormatTime(value),
              },
              {
                title: t('results.DeviantRaceLightCondition'),
                dataIndex: 'deviantRaceLightCondition',
                key: 'deviantRaceLightCondition',
              },
              {
                title: t('results.DeviantEventClassification'),
                dataIndex: 'deviantEventClassificationId',
                key: 'deviantEventClassificationId',
              },
            ],
          ];
        } else {
          columns = [
            ...columns,
            ...[
              {
                title: t('results.Award'),
                dataIndex: 'award',
                key: 'award',
              },
              {
                title: t('results.EventFee'),
                dataIndex: 'fee',
                key: 'fee',
                render: (value) => (value == null ? <MissingTag t={t} /> : value),
              },
              {
                title: t('results.TotalFeeToClub'),
                dataIndex: 'totalFeeToClub',
                key: 'totalFeeToClub',
                render: (_text, record) =>
                  record.feeToClub == null ? <MissingTag t={t} /> : record.feeToClub + record.serviceFeeToClub,
              },
              {
                title: t('results.DeviantEventClassification'),
                dataIndex: 'deviantEventClassificationId',
                key: 'deviantEventClassificationId',
              },
            ],
          ];
        }

        return loaded && visible ? (
          <Form
            id={formId}
            ref={self.formRef}
            layout="vertical"
            initialValues={{
              iName: raceWizardModel.raceEvent.name,
              iOrganiserName: raceWizardModel.raceEvent.organiserName,
              iRaceDate: !raceWizardModel.raceEvent.raceDate
                ? null
                : moment(raceWizardModel.raceEvent.raceDate, dateFormat),
              iRaceTime: !raceWizardModel.raceEvent.raceTime
                ? null
                : moment(raceWizardModel.raceEvent.raceTime, shortTimeFormat),
              iMeetsAwardRequirements: raceWizardModel.raceEvent.meetsAwardRequirements,
              iEventClassificationId: raceWizardModel.raceEvent.eventClassificationId,
              iPaymentModel: raceWizardModel.raceEvent.paymentModel,
              iSportCode: !raceWizardModel.raceEvent.sportCode ? undefined : raceWizardModel.raceEvent.sportCode,
              iIsRelay: raceWizardModel.raceEvent.isRelay,
              iRaceDistance: !raceWizardModel.raceEvent.raceDistance
                ? undefined
                : raceWizardModel.raceEvent.raceDistance,
              iRaceLightCondition: !raceWizardModel.raceEvent.raceLightCondition
                ? undefined
                : raceWizardModel.raceEvent.raceLightCondition,
            }}
          >
            <Row gutter={8}>
              <Col span={6}>
                <FormItem
                  name="iName"
                  label={t('results.Name')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.Name'),
                    },
                  ]}
                >
                  <Input
                    onChange={(e) => {
                      raceWizardModel.raceEvent.setValue('name', e.currentTarget.value);
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={6}>
                <FormItem
                  name="iOrganiserName"
                  label={t('results.Club')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.Club'),
                    },
                  ]}
                >
                  <Input
                    onChange={(e) => {
                      raceWizardModel.raceEvent.setValue('organiserName', e.currentTarget.value);
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem
                  name="iRaceDate"
                  label={t('results.Date')}
                  rules={[
                    {
                      required: true,
                      type: 'object',
                      message: errorRequiredField(t, 'results.Date'),
                    },
                  ]}
                >
                  <DatePicker
                    format={dateFormat}
                    allowClear={false}
                    onChange={(date) => {
                      date && raceWizardModel.raceEvent.setValue('raceDate', date.format(dateFormat));
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={4}>
                <FormItem name="iRaceTime" label={t('results.Time')}>
                  <TimePicker
                    format={shortTimeFormat}
                    allowClear={true}
                    onChange={(time) => {
                      time && raceWizardModel.raceEvent.setValue('raceTime', time.format(shortTimeFormat));
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              {['OL', 'SKIO', 'MTBO'].includes(raceWizardModel.raceEvent.sportCode) ? (
                <Col span={4}>
                  <FormItem
                    name="iMeetsAwardRequirements"
                    label={t('results.MeetsAwardRequirements')}
                    valuePropName="checked"
                  >
                    <Switch
                      onChange={(checked) => {
                        raceWizardModel.raceEvent.setValue('meetsAwardRequirements', checked);
                        CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
                      }}
                    />
                  </FormItem>
                </Col>
              ) : null}
            </Row>
            <Row gutter={8}>
              <Col span={6}>
                <FormItem
                  name="iEventClassificationId"
                  label={t('results.EventClassification')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.EventClassification'),
                    },
                  ]}
                >
                  <FormSelect
                    dropdownMatchSelectWidth={false}
                    allowClear={false}
                    options={clubModel.raceClubs.eventClassificationOptions}
                    onChange={(code) => {
                      raceWizardModel.raceEvent.setValue('eventClassificationId', code);
                      ResetClassClassifications(
                        raceWizardModel.raceEvent,
                        clubModel.raceClubs.eventClassifications,
                        clubModel.raceClubs.classLevels
                      );
                      CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={6}>
                <FormItem
                  name="iPaymentModel"
                  label={t('results.PaymentModel')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.RaceDistance'),
                    },
                  ]}
                >
                  <FormSelect
                    allowClear={false}
                    options={paymentOptions(t)}
                    onChange={(code) => {
                      raceWizardModel.raceEvent.setValue('paymentModel', code);
                      if (code !== payments.defaultFeePaidByCompetitor) {
                        raceWizardModel.setValue('paymentModel', code);
                      }
                      CalculateCompetitorsFee(
                        raceWizardModel.raceEvent,
                        clubModel.raceClubs.selectedClub,
                        clubModel.raceClubs.eventClassifications
                      );
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={3}>
                <FormItem
                  name="iSportCode"
                  label={t('results.Sport')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.Sport'),
                    },
                  ]}
                >
                  <FormSelect
                    allowClear={false}
                    options={clubModel.raceClubs.sportOptions}
                    onChange={(code) => {
                      raceWizardModel.raceEvent.setValue('sportCode', code);
                      raceWizardModel.raceEvent.setValue('meetsAwardRequirements', code === 'OL');
                      CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={3}>
                <FormItem name="iIsRelay" label={t('results.IsRelay')} valuePropName="checked">
                  <Switch
                    disabled={
                      raceWizardModel.raceEvent.results.length > 0 || raceWizardModel.raceEvent.teamResults.length > 0
                    }
                    onChange={(checked) => {
                      raceWizardModel.raceEvent.setValue('isRelay', checked);
                      self.setState({
                        isRelay: checked,
                      });
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={3}>
                <FormItem
                  name="iRaceDistance"
                  label={t('results.RaceDistance')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.RaceDistance'),
                    },
                  ]}
                >
                  <FormSelect
                    allowClear={true}
                    options={raceDistanceOptions(t)}
                    onChange={(code) => {
                      raceWizardModel.raceEvent.setValue('raceDistance', code);
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={3}>
                <FormItem
                  name="iRaceLightCondition"
                  label={t('results.RaceLightCondition')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.RaceLightCondition'),
                    },
                  ]}
                >
                  <FormSelect
                    allowClear={true}
                    options={raceLightConditionOptions(t)}
                    onChange={(code) => {
                      raceWizardModel.raceEvent.setValue('raceLightCondition', code);
                      onValidate(raceWizardModel.raceEvent.valid);
                    }}
                  />
                </FormItem>
              </Col>
            </Row>
            {isRelay ? (
              <StyledTable
                columns={columns}
                dataSource={raceWizardModel.raceEvent.teamResults.map((result) => ({
                  ...getSnapshot(result),
                  stageText: `${result.stage} ${t('common.Of')} ${result.totalStages}`,
                }))}
                pagination={{ pageSize: 5 }}
                size="middle"
              />
            ) : (
              <StyledTable
                columns={columns}
                dataSource={raceWizardModel.raceEvent.results.map((result) => ({
                  ...getSnapshot(result),
                  isAwardTouched: result.isAwardTouched,
                  fee: `${
                    result.originalFee != null && result.lateFee != null ? result.originalFee + result.lateFee : null
                  }`,
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

const ResultWizardStep2EditRaceWithI18n = withTranslation()(ResultWizardStep2EditRace); // pass `t` function to App

export default ResultWizardStep2EditRaceWithI18n;
