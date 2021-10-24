import { Col, DatePicker, Form, Input, message, Modal, Popconfirm, Row, Spin, Switch } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { ModalFuncProps } from 'antd/lib/modal';
import { ColumnType } from 'antd/lib/table';
import InputTime from 'components/formItems/InputTime';
import { observer } from 'mobx-react';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import {
  IRaceCompetitor,
  IRaceEventBasic,
  IRaceEventSnapshotIn,
  IRaceResultSnapshotIn,
  IRaceTeamResultSnapshotIn,
} from 'models/resultModel';
import { IWinnerResultSnapshotIn } from 'models/resultWizardModel';
import moment from 'moment';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import {
  IEventorClassResult,
  IEventorEntries,
  IEventorEntry,
  IEventorEntryClassFee,
  IEventorEntryFees,
  IEventorEventClass,
  IEventorEventClasses,
  IEventorEventRace,
  IEventorOrganisation,
  IEventorPersonResult,
  IEventorResults,
  IEventorResultStatus,
  IEventorTeamMemberResult,
  IEventorTeamResult,
} from 'utils/responseEventorInterfaces';
import { useResultWizardStore } from 'utils/resultWizardStore';
import { PostJsonData } from '../../utils/api';
import { dateFormat, errorRequiredField, FormSelect, shortTimeFormat } from '../../utils/formHelper';
import {
  distances,
  EventClassificationIdTypes,
  failedReasons,
  genders,
  LightConditionTypes,
  paymentOptions,
  payments,
  PaymentTypes,
  raceDistanceOptions,
  raceLightConditionOptions,
} from '../../utils/resultConstants';
import {
  CalculateAllAwards,
  CalculateCompetitorsFee,
  ConvertSecondsToTime,
  ConvertSecondsWithFractionsToTime,
  FormatTime,
  GetAge,
  GetClassClassificationId,
  GetClassShortName,
  GetFees,
  GetLength,
  GetMissingTime,
  GetRelaySplitTimes,
  GetSecondsWithFractionsPerKiloMeter,
  GetSplitTimes,
  GetTimeWithHour,
  ResetClassClassifications,
  TimeDiff,
  WinnerTime,
} from '../../utils/resultHelper';
import FormItem from '../formItems/FormItem';
import { MissingTag, NoWrap, SpinnerDiv, StyledIcon, StyledTable } from '../styled/styled';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';
import EditResultIndividual, { IExtendedRaceResult } from './EditResultIndividual';
import EditResultRelay, { IExtendedRaceTeamResult } from './EditResultRelay';

const { info } = Modal;

interface IEventRaceResult {
  key: string;
  resultId?: number;
  teamResultId?: number;
  edit: undefined;
  competitorId: number;
  className: string;
  classClassificationId?: string | null;
  difficulty?: string | null;
  lengthInMeter?: number | null;
  failedReason?: string | null;
  competitorTime?: string | null;
  winnerTime?: string | null;
  secondTime?: string | null;
  position?: number | null;
  nofStartsInClass?: number | null;
  deviantEventClassificationId?: string | null;

  award?: string | null;
  isAwardTouched?: boolean;
  fee?: number | null;
  totalFeeToClub?: number | null;

  stageText?: string | null;
  deltaPositions?: number | null;
  deltaTimeBehind?: string | null;
  deviantRaceLightCondition?: string | null;
}

interface IResultWizardStep2EditRaceProps {
  visible: boolean;
  onValidate: (valid: boolean) => void;
  onFailed: (e: any) => void;
}
const ResultWizardStep2EditRace = observer(({ visible, onValidate, onFailed }: IResultWizardStep2EditRaceProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const { raceWizardModel } = useResultWizardStore();
  const formRef = useRef<FormInstance>(null);
  const formId = useMemo(() => 'resultsWizardFormStep2EditRace' + Math.floor(Math.random() * 1000000000000000), []);
  const [loaded, setLoaded] = useState(false);
  const [isRelay, setIsRelay] = useState(raceWizardModel.selectedIsRelay);

  useEffect(() => {
    if (!raceWizardModel.existInEventor) {
      raceWizardModel.setRaceEvent({
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
      onValidate(!!raceWizardModel.raceEvent?.valid);
      setIsRelay(false);
      setLoaded(true);
      formRef.current?.validateFields().then();
      return;
    }

    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url || !clubModel.raceClubs || !clubModel.eventor) return;

    const editResultPromise =
      raceWizardModel.selectedEventId != null && raceWizardModel.selectedEventId > 0
        ? PostJsonData(
            url,
            { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
            true,
            sessionModel.authorizationHeader
          )
        : new Promise((resolve) => resolve(undefined));

    const entriesPromise =
      raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.entriesUrl +
                  '?eventIds=' +
                  raceWizardModel.selectedEventorId +
                  '&organisationIds=' +
                  clubModel.eventor.organisationId +
                  ',' +
                  clubModel.eventor.districtOrganisationId +
                  '&includeEntryFees=true'
              ),
            },
            true
          )
        : new Promise((resolve) => resolve(undefined));
    const classPromise =
      raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.classesUrl +
                  '?eventId=' +
                  raceWizardModel.selectedEventorId +
                  '&includeEntryFees=true'
              ),
            },
            false
          )
        : new Promise((resolve) => resolve(undefined));
    const resultPromise =
      raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.resultUrl +
                  '?eventId=' +
                  raceWizardModel.selectedEventorId +
                  '&organisationIds=' +
                  clubModel.eventor.organisationId +
                  ',' +
                  clubModel.eventor.districtOrganisationId +
                  `&top=${raceWizardModel.selectedIsRelay ? 30 : 15}&includeSplitTimes=true`
              ),
            },
            false
          )
        : new Promise((resolve) => resolve(undefined));
    const lengthPromise =
      raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(
                clubModel.eventor.lengthUrl +
                  '?eventId=' +
                  raceWizardModel.selectedEventorId +
                  '&eventRaceId=' +
                  raceWizardModel.selectedEventorRaceId +
                  '&groupBy=EventClass'
              ),
              noJsonConvert: true,
            },
            false
          )
        : new Promise((resolve) => resolve(undefined));
    const entryFeePromise =
      raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0
        ? PostJsonData(
            clubModel.eventorCorsProxy,
            {
              csurl: encodeURIComponent(clubModel.eventor.entryFeeUrl + raceWizardModel.selectedEventorId),
            },
            true
          )
        : new Promise((resolve) => resolve(undefined));

    Promise.all([editResultPromise, entriesPromise, classPromise, resultPromise, entryFeePromise, lengthPromise])
      .then(
        async ([editResultJson, entriesJson, classJson, resultJson, entryFeeJson, lengthHtmlJson]: [
          IRaceEventSnapshotIn | undefined,
          IEventorEntries | undefined,
          IEventorEventClasses | undefined,
          IEventorResults | undefined,
          IEventorEntryFees | undefined,
          string
        ]) => {
          const eventIsRelay =
            editResultJson?.isRelay ||
            (resultJson != null &&
              resultJson.Event &&
              resultJson.Event['@attributes'] &&
              resultJson.Event['@attributes'].eventForm &&
              resultJson.Event['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0);
          // 1 = championchip, 2 = National, 3 = District, 4 = Nearby, 5 = Club, 6 = International
          const eventorEventClassificationId =
            resultJson && resultJson.Event ? resultJson.Event.EventClassificationId : null;
          let eventClassificationId: EventClassificationIdTypes = 'F';
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
          if (entriesJson == null || entriesJson.Entry == null) {
            entriesJson = { Entry: [] };
          }
          if (!Array.isArray(entriesJson.Entry)) {
            entriesJson.Entry = [entriesJson.Entry];
          }

          if (!entryFeeJson) {
            entryFeeJson = { EntryFee: [] };
          }
          if (!Array.isArray(entryFeeJson.EntryFee)) {
            entryFeeJson.EntryFee = entryFeeJson.EntryFee ? [entryFeeJson.EntryFee] : [];
          }
          let eventClasses: IEventorEventClass[] | undefined;
          if (classJson) {
            eventClasses = Array.isArray(classJson.EventClass) ? classJson.EventClass : [classJson.EventClass];
          }

          let raceEvent: IRaceEventSnapshotIn | undefined = !raceWizardModel.overwrite ? editResultJson : undefined;
          let eventRace: IEventorEventRace | undefined;
          if (resultJson != null) {
            if (Array.isArray(resultJson.Event.EventRace)) {
              eventRace = resultJson.Event.EventRace.find(
                (eventRace) => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
              );
              resultJson.Event.Name = resultJson.Event.Name + ', ' + eventRace?.Name;
            } else {
              eventRace = resultJson.Event.EventRace;
            }
            if (eventRace) {
              const raceLightCondition = eventRace['@attributes'].raceLightCondition;
              raceEvent = {
                eventId: raceWizardModel.selectedEventId ?? -1,
                eventorId: raceWizardModel.selectedEventorId,
                eventorRaceId: raceWizardModel.selectedEventorRaceId,
                name: resultJson.Event.Name,
                organiserName: Array.isArray(resultJson.Event.Organiser?.Organisation)
                  ? resultJson.Event.Organiser?.Organisation.map((org) => org.Name)
                      .join('/')
                      .substr(0, 128)
                  : resultJson.Event.Organiser?.Organisation?.Name,
                raceDate: eventRace.RaceDate.Date,
                raceTime: eventRace.RaceDate.Clock === '00:00:00' ? null : eventRace.RaceDate.Clock,
                sportCode: 'OL',
                isRelay: !!eventIsRelay,
                eventClassificationId: eventClassificationId,
                raceLightCondition: raceLightConditionOptions(t).some((option) => option.code === raceLightCondition)
                  ? raceLightCondition
                  : null,
                raceDistance: eventRace['@attributes'].raceDistance,
                paymentModel: raceWizardModel.paymentModel,
                meetsAwardRequirements: true,
                longitude: eventRace.EventCenterPosition
                  ? parseFloat(eventRace.EventCenterPosition['@attributes'].x)
                  : null,
                latitude: eventRace.EventCenterPosition
                  ? parseFloat(eventRace.EventCenterPosition['@attributes'].y)
                  : null,
                results: [],
                teamResults: [],
                rankingBaseDescription: editResultJson?.rankingBaseDescription,
                rankingBasetimePerKilometer: editResultJson?.rankingBasetimePerKilometer,
                rankingBasepoint: editResultJson?.rankingBasepoint,
              };
            }
          }

          if (resultJson != null && resultJson.ClassResult != null) {
            const raceWinnerResults: IWinnerResultSnapshotIn[] = [];
            const classResults: IEventorClassResult[] = Array.isArray(resultJson.ClassResult)
              ? resultJson.ClassResult
              : [resultJson.ClassResult];
            let nofStartsInClass: number | null = null;
            if (!eventIsRelay) {
              for (let i = 0; i < classResults.length; i++) {
                const classResult = classResults[i];
                let currentClass: IEventorEventClass | undefined;
                if (eventClasses != null) {
                  currentClass = eventClasses.find(
                    (evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId
                  );
                  if (currentClass) {
                    if (Array.isArray(currentClass.ClassRaceInfo)) {
                      currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                        (raceInfo) => raceInfo.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                      )!;
                    }
                    nofStartsInClass = parseInt(currentClass.ClassRaceInfo['@attributes'].noOfStarts);
                  }
                }

                if (classResult.PersonResult != null) {
                  const personResults: IEventorPersonResult[] = Array.isArray(classResult.PersonResult)
                    ? classResult.PersonResult.filter(
                        (personResult) =>
                          personResult.RaceResult == null ||
                          personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                      )
                    : classResult.PersonResult.RaceResult == null ||
                      classResult.PersonResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.PersonResult]
                    : [];

                  personResults.forEach((personResult) => {
                    if (personResult.Result == null && personResult.RaceResult?.Result != null) {
                      personResult.Result = personResult.RaceResult.Result;
                    }
                  });
                  const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetSplitTimes(personResults);
                  const shortClassName = GetClassShortName(currentClass?.ClassShortName);
                  const classLevel = clubModel
                    .raceClubs!.classLevels.filter(
                      (cl) => shortClassName && shortClassName.indexOf(cl.classShortName) >= 0
                    )
                    .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                    .find(() => true);
                  const lengthInMeter = currentClass ? GetLength(lengthHtmlJson, currentClass.Name) : null;
                  const winnerResult = personResults.find(
                    (personResult) => personResult.Result?.ResultPosition === '1'
                  );

                  if (
                    winnerResult &&
                    (!classLevel ||
                      (classLevel.difficulty.toLowerCase() !== 'grön' &&
                        classLevel.difficulty.toLowerCase() !== 'vit' &&
                        classLevel.difficulty.toLowerCase() !== 'gul'))
                  ) {
                    const secondsPerKilometer =
                      winnerResult.Result && lengthInMeter
                        ? GetSecondsWithFractionsPerKiloMeter(winnerResult.Result.Time, lengthInMeter)
                        : undefined;
                    raceWinnerResults.push({
                      id: raceWinnerResults.length,
                      personName: `${winnerResult.Person.PersonName.Given} ${winnerResult.Person.PersonName.Family}`,
                      className: shortClassName ?? '',
                      difficulty: classLevel ? classLevel.difficulty : null,
                      lengthInMeter: lengthInMeter,
                      winnerTime: winnerResult.Result?.Time,
                      secondsPerKilometer: secondsPerKilometer,
                      timePerKilometer: secondsPerKilometer
                        ? ConvertSecondsWithFractionsToTime(secondsPerKilometer)
                        : undefined,
                    });
                  }

                  if (raceWizardModel.overwrite) {
                    const clubPersonResults = personResults.filter(
                      (personResult) =>
                        personResult.Organisation &&
                        (personResult.Organisation.OrganisationId === clubModel.eventor?.organisationId.toString() ||
                          (personResult.Organisation.OrganisationId ===
                            clubModel.eventor?.districtOrganisationId.toString() &&
                            clubModel.raceClubs?.selectedClub.competitorByEventorId(
                              parseInt(personResult.Person.PersonId)
                            ) != null))
                    );

                    for (let j = 0; j < clubPersonResults.length; j++) {
                      const personResult = clubPersonResults[j];
                      let competitor;
                      if (typeof personResult.Person.PersonId === 'string' && personResult.Person.PersonId.length > 0) {
                        if (!competitor) {
                          competitor = clubModel.raceClubs?.selectedClub.competitorByEventorId(
                            parseInt(personResult.Person.PersonId)
                          );
                        }

                        if (!competitor) {
                          competitor = clubModel.raceClubs?.selectedClub.competitors.find(
                            (c) =>
                              c.firstName === personResult.Person.PersonName.Given &&
                              c.lastName === personResult.Person.PersonName.Family &&
                              c.birthDay === personResult.Person.BirthDate?.Date
                          );
                          if (competitor) {
                            await competitor.addEventorId(
                              clubModel.modules.find((module) => module.name === 'Results')?.addUrl,
                              personResult.Person.PersonId
                            );
                          }
                        }
                      }
                      if (!competitor) {
                        competitor = await AddMapCompetitorConfirmModal(
                          t,
                          -1,
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
                            iClubId: clubModel.raceClubs!.selectedClub.clubId,
                            iStartDate: '1930-01-01',
                            iEndDate: null,
                            iEventorCompetitorId:
                              typeof personResult.Person.PersonId !== 'string' ||
                              personResult.Person.PersonId.length === 0
                                ? null
                                : personResult.Person.PersonId,
                          },
                          currentClass?.ClassShortName ?? '',
                          clubModel
                        );
                      }

                      const entry: IEventorEntry | undefined = entriesJson.Entry.find(
                        (entry) =>
                          entry.Competitor?.PersonId === personResult.Person.PersonId ||
                          entry.Competitor?.Person?.PersonId === personResult.Person.PersonId
                      );
                      let entryFees: IEventorEntryClassFee[] = Array.isArray(entry?.EntryEntryFee)
                        ? entry!.EntryEntryFee
                        : entry?.EntryEntryFee != null
                        ? [entry.EntryEntryFee]
                        : [];
                      if (entry?.EntryEntryFee == null && currentClass) {
                        if (Array.isArray(currentClass.ClassEntryFee)) {
                          entryFees = currentClass.ClassEntryFee;
                        } else if (currentClass.ClassEntryFee != null) {
                          entryFees = [currentClass.ClassEntryFee];
                        }
                      }
                      const entryFeeIds = entryFees.map((f) => f.EntryFeeId);
                      const age = eventRace && competitor ? GetAge(competitor.birthDay, eventRace.RaceDate.Date) : null;
                      const didNotStart = personResult.Result?.CompetitorStatus['@attributes'].value === 'DidNotStart';
                      const misPunch = personResult.Result?.CompetitorStatus['@attributes'].value === 'MisPunch';
                      const ok = personResult.Result?.CompetitorStatus['@attributes'].value === 'OK';
                      const valid = ok && !didNotStart && !misPunch;
                      const position =
                        valid && personResult.Result?.ResultPosition
                          ? parseInt(personResult.Result.ResultPosition)
                          : null;
                      const secondTime =
                        valid &&
                        nofStartsInClass &&
                        nofStartsInClass > 1 &&
                        personResults.some((pr) => pr.Result?.ResultPosition === '2')
                          ? personResults.find((pr) => pr.Result?.ResultPosition === '2')?.Result?.Time
                          : null;
                      const fees = GetFees(
                        entryFeeJson.EntryFee,
                        entryFeeIds,
                        age,
                        !!currentClass && currentClass.ClassShortName.indexOf('Ö') > -1
                      );

                      const raceResult: IRaceResultSnapshotIn = {
                        resultId: -1 - 10000 * i - j,
                        competitorId: competitor?.competitorId ?? -1,
                        resultMultiDay: null,
                        className: shortClassName ?? '',
                        deviantEventClassificationId: null,
                        classClassificationId: GetClassClassificationId(
                          raceEvent?.eventClassificationId as EventClassificationIdTypes | undefined,
                          classLevel,
                          clubModel.raceClubs?.eventClassifications
                        ),
                        difficulty: classLevel ? classLevel.difficulty : null,
                        lengthInMeter: lengthInMeter,
                        failedReason: didNotStart
                          ? failedReasons.NotStarted
                          : !ok
                          ? failedReasons.NotFinished
                          : !personResult.Result?.Time ||
                            (position !== 1 && !personResult.Result.TimeDiff) ||
                            shortClassName === 'INSK'
                          ? failedReasons.Finished
                          : null,
                        competitorTime: valid && personResult.Result ? GetTimeWithHour(personResult.Result.Time) : null,
                        winnerTime:
                          valid && personResult.Result
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
                      raceEvent && raceEvent.results?.push(raceResult);
                    }
                  }
                }
              }
            } else if (eventIsRelay && raceWizardModel.overwrite) {
              for (let i = 0; i < classResults.length; i++) {
                const classResult = classResults[i];
                let currentClass: IEventorEventClass | undefined;
                let nofStartsInClass: number | null = null;
                let numberOfLegs: number | null = null;
                let shortClassName: string | null = null;
                let classRaceInfos: { ClassRaceInfoId: string; leg: number; numberOfStarts: number }[] = [];

                if (eventClasses != null) {
                  currentClass = eventClasses.find(
                    (evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId
                  );
                  if (currentClass) {
                    currentClass.ClassRaceInfo = Array.isArray(currentClass.ClassRaceInfo)
                      ? currentClass.ClassRaceInfo
                      : [currentClass.ClassRaceInfo];
                    classRaceInfos = currentClass.ClassRaceInfo.map((classRaceInfo) => ({
                      ClassRaceInfoId: classRaceInfo.ClassRaceInfoId,
                      leg: parseInt(classRaceInfo['@attributes'].relayLeg!),
                      numberOfStarts: parseInt(classRaceInfo['@attributes'].noOfStarts),
                    }));
                    const leg1ClassRaceInfo = classRaceInfos.find((c) => c.leg === 1);
                    nofStartsInClass = leg1ClassRaceInfo ? leg1ClassRaceInfo.numberOfStarts : null;
                    numberOfLegs = parseInt(currentClass['@attributes'].numberOfLegs);
                    shortClassName = GetClassShortName(currentClass.ClassShortName);
                  }
                }

                if (classResult.TeamResult != null) {
                  const preTeamResults = Array.isArray(classResult.TeamResult)
                    ? classResult.TeamResult.filter(
                        (teamResult) =>
                          teamResult.RaceResult == null ||
                          teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                      )
                    : classResult.TeamResult.RaceResult == null ||
                      classResult.TeamResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.TeamResult]
                    : [];
                  const teamResults: IEventorTeamResult[] = preTeamResults.map((pre) =>
                    pre.RaceResult?.TeamMemberResult != null ? pre.RaceResult : (pre as IEventorTeamResult)
                  );

                  const allLegsSplitTimes = GetRelaySplitTimes(teamResults);
                  const classLevel = clubModel
                    .raceClubs!.classLevels.filter(
                      (cl) => shortClassName && shortClassName.indexOf(cl.classShortName) >= 0
                    )
                    .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                    .find(() => true);

                  const clubTeamMemberResults: (IEventorTeamMemberResult & {
                    Competitor?: IRaceCompetitor | null;
                    TeamName?: string;
                    TeamTime?: string;
                    TeamTimeDiff?: string;
                    TeamPosition?: number | null;
                    TeamStatus: IEventorResultStatus;
                  })[] = [];
                  teamResults.forEach((teamResult) => {
                    const teamMemberResults: IEventorTeamMemberResult[] = Array.isArray(teamResult.TeamMemberResult!)
                      ? teamResult.TeamMemberResult!
                      : [teamResult.TeamMemberResult!];
                    const teamOrganisations: IEventorOrganisation[] = Array.isArray(teamResult.Organisation!)
                      ? teamResult.Organisation!
                      : [teamResult.Organisation!];

                    const hasClubMembers = teamOrganisations.some(
                      (org) => org.OrganisationId === clubModel.eventor?.organisationId.toString()
                    );
                    const hasDistrictMembers = teamOrganisations.some(
                      (org) => org.OrganisationId === clubModel.eventor?.districtOrganisationId.toString()
                    );

                    teamMemberResults.forEach((teamMemberResult) => {
                      const competitor =
                        (hasClubMembers || hasDistrictMembers) &&
                        typeof teamMemberResult.Person.PersonId === 'string' &&
                        teamMemberResult.Person.PersonId.length > 0
                          ? clubModel.raceClubs?.selectedClub.competitorByEventorId(
                              parseInt(teamMemberResult.Person.PersonId)
                            )
                          : null;

                      if (
                        (teamMemberResult.Organisation &&
                          teamMemberResult.Organisation.OrganisationId ===
                            clubModel.eventor?.organisationId.toString()) ||
                        competitor ||
                        (hasClubMembers && teamOrganisations.length === 1)
                      ) {
                        clubTeamMemberResults.push({
                          ...teamMemberResult,
                          Competitor: competitor,
                          TeamName: teamResult.TeamName,
                          TeamTime: teamResult.Time,
                          TeamTimeDiff: teamResult.TimeDiff,
                          TeamPosition: teamResult.ResultPosition != null ? parseInt(teamResult.ResultPosition) : null,
                          TeamStatus: teamResult.TeamStatus,
                          BibNumber: teamResult.BibNumber ?? `${shortClassName}-${teamResult.TeamName}`,
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
                        competitor = clubModel.raceClubs?.selectedClub.competitors.find(
                          (c) =>
                            c.firstName === teamMemberResult.Person.PersonName.Given &&
                            c.lastName === teamMemberResult.Person.PersonName.Family &&
                            c.birthDay === teamMemberResult.Person.BirthDate?.Date
                        );
                        if (competitor) {
                          await competitor.addEventorId(
                            clubModel.modules.find((module) => module.name === 'Results')?.addUrl,
                            teamMemberResult.Person.PersonId
                          );
                        }
                      }
                    }
                    if (!competitor) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        -1,
                        teamMemberResult.Person.PersonId,
                        {
                          iType: 'COMPETITOR',
                          iFirstName: teamMemberResult.Person.PersonName.Given,
                          iLastName: teamMemberResult.Person.PersonName.Family,
                          iBirthDay:
                            teamMemberResult.Person.BirthDate == null ? null : teamMemberResult.Person.BirthDate?.Date,
                          iGender:
                            teamMemberResult.Person['@attributes'] == null
                              ? null
                              : teamMemberResult.Person['@attributes'].sex === 'F'
                              ? genders.FeMale
                              : genders.Male,
                          iClubId: clubModel.raceClubs!.selectedClub.clubId,
                          iStartDate: '1930-01-01',
                          iEndDate: null,
                          iEventorCompetitorId:
                            typeof teamMemberResult.Person.PersonId !== 'string' ||
                            teamMemberResult.Person.PersonId.length === 0
                              ? null
                              : teamMemberResult.Person.PersonId,
                        },
                        currentClass?.ClassShortName ?? '',
                        clubModel
                      );
                    }

                    const didNotStart = teamMemberResult.CompetitorStatus['@attributes'].value === 'DidNotStart';
                    const misPunch = teamMemberResult.CompetitorStatus['@attributes'].value === 'MisPunch';
                    const ok = teamMemberResult.CompetitorStatus['@attributes'].value === 'OK';
                    const valid = ok && !didNotStart && !misPunch;
                    const position =
                      valid && teamMemberResult.Position != null ? parseInt(teamMemberResult.Position) : null;
                    const leg = parseInt(teamMemberResult.Leg);
                    const legRaceInfo = classRaceInfos.find((classRaceInfo) => classRaceInfo.leg === leg);
                    const nofStartsInLeg = valid && legRaceInfo ? legRaceInfo.numberOfStarts : null;
                    //const secondTime =
                    //  valid && nofStartsInClass > 1
                    //    ? personResults.find(pr => pr.Result.ResultPosition === "2").Result.Time
                    //    : null;

                    const stageOk = teamMemberResult.OverallResult?.TeamStatus['@attributes'].value === 'OK';
                    const teamDidNotStart = teamMemberResult.TeamStatus['@attributes'].value === 'DidNotStart';
                    const teamMisPunch = teamMemberResult.TeamStatus['@attributes'].value === 'MisPunch';
                    const teamOk = teamMemberResult.TeamStatus['@attributes'].value === 'OK';
                    const teamValid = teamOk && !teamDidNotStart && !teamMisPunch;
                    const teamPosition = teamValid ? teamMemberResult.TeamPosition : null;
                    const totalStagePosition =
                      stageOk && teamMemberResult.OverallResult?.ResultPosition
                        ? parseInt(teamMemberResult.OverallResult.ResultPosition)
                        : null;
                    const totalStageTimeBehind = stageOk
                      ? GetTimeWithHour(teamMemberResult.OverallResult?.TimeDiff)
                      : null;
                    let deltaPositions: number | null = null;
                    let deltaTimeBehind: string | null = null;
                    if (leg > 1 && stageOk) {
                      const prevLeg = (leg - 1).toString();
                      const prevResult = teamResults
                        .filter((teamResult) => teamResult.BibNumber === teamMemberResult.BibNumber)
                        .map((teamResult) => {
                          const teamMemberResults: IEventorTeamMemberResult[] = Array.isArray(
                            teamResult.TeamMemberResult!
                          )
                            ? teamResult.TeamMemberResult!
                            : [teamResult.TeamMemberResult!];
                          return teamMemberResults;
                        })
                        .find(() => true)
                        ?.find((tmr) => tmr.Leg === prevLeg);
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
                    const raceTeamResult: IRaceTeamResultSnapshotIn = {
                      teamResultId: -1 - i * 20000 - j,
                      competitorId: competitor?.competitorId ?? -1,
                      className: shortClassName ?? '',
                      deviantEventClassificationId: null,
                      classClassificationId: GetClassClassificationId(
                        raceEvent?.eventClassificationId as EventClassificationIdTypes | undefined,
                        classLevel,
                        clubModel.raceClubs?.eventClassifications
                      ),
                      difficulty: classLevel ? classLevel.difficulty : null,
                      teamName: teamMemberResult.TeamName,
                      lengthInMeter: null,
                      failedReason: didNotStart
                        ? failedReasons.NotStarted
                        : !ok
                        ? failedReasons.NotFinished
                        : teamMemberResult.Time == null
                        ? failedReasons.Finished
                        : null,
                      teamFailedReason: teamDidNotStart
                        ? failedReasons.NotStarted
                        : !teamOk
                        ? failedReasons.NotFinished
                        : teamValid && (!teamPosition || !nofStartsInClass || !teamMemberResult.TeamTimeDiff)
                        ? failedReasons.Finished
                        : null,
                      competitorTime: valid ? GetTimeWithHour(teamMemberResult.Time) : null,
                      winnerTime:
                        valid && teamMemberResult.Position === '1'
                          ? GetTimeWithHour(teamMemberResult.Time)
                          : valid && teamMemberResult.TimeBehind
                          ? WinnerTime(
                              teamMemberResult.Time,
                              ConvertSecondsToTime(parseInt(teamMemberResult.TimeBehind)),
                              teamMemberResult.Position ? parseInt(teamMemberResult.Position) : 2
                            )
                          : null,
                      secondTime: null, //TODO GetTimeWithHour(secondTime),
                      position: position,
                      nofStartsInClass: nofStartsInLeg,
                      stage: leg,
                      totalStages: numberOfLegs ?? 1,
                      deltaPositions: deltaPositions,
                      deltaTimeBehind: deltaTimeBehind,
                      totalStagePosition: totalStagePosition,
                      totalStageTimeBehind: totalStageTimeBehind,
                      totalPosition: teamPosition,
                      totalNofStartsInClass: nofStartsInClass,
                      totalTimeBehind: teamValid ? GetTimeWithHour(teamMemberResult.TeamTimeDiff) : null,
                      points1000: 0,
                      missingTime: legSplitTimes
                        ? GetMissingTime(
                            teamMemberResult.Person.PersonId,
                            legSplitTimes.splitTimes,
                            legSplitTimes.bestSplitTimes,
                            legSplitTimes.secondBestSplitTimes
                          )
                        : null,
                    };

                    raceEvent && raceEvent.teamResults?.push(raceTeamResult);
                  }
                }
              }
            }

            raceWizardModel.setRaceWinnerResults(raceWinnerResults);
          }

          if (!raceWizardModel.overwrite && editResultJson != null) {
            raceWizardModel.setRaceEvent(editResultJson);
          } else if (raceEvent != null) {
            raceWizardModel.setRaceEvent(raceEvent);
          }

          if (!eventIsRelay && raceWizardModel.overwrite && clubModel.raceClubs && raceWizardModel.raceEvent) {
            CalculateCompetitorsFee(
              raceWizardModel.raceEvent,
              clubModel.raceClubs.selectedClub,
              clubModel.raceClubs.eventClassifications
            );
            CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
          }

          formRef.current?.validateFields().then();
          onValidate(!!raceWizardModel.raceEvent?.valid);
          setIsRelay(!!eventIsRelay);
          setLoaded(true);
        }
      )
      .catch((e) => {
        if (e && e.message) {
          message.error(e.message);
        }
        onFailed && onFailed(e);
      });
  }, []);

  const columns: ColumnType<IExtendedRaceResult>[] = [
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
              let confirmModal: {
                destroy: () => void;
                update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
              };
              // eslint-disable-next-line prefer-const
              confirmModal = info({
                width: 800,
                icon: <StyledIcon type="edit" />,
                title: `${t('results.Edit')} (${
                  clubModel.raceClubs?.selectedClub.competitorById(record.competitorId)?.fullName
                }, ${record.className})`,
                content:
                  raceWizardModel.raceEvent && clubModel.raceClubs ? (
                    <EditResultIndividual
                      clubModel={clubModel}
                      paymentModel={raceWizardModel.raceEvent.paymentModel as PaymentTypes}
                      meetsAwardRequirements={raceWizardModel.raceEvent.meetsAwardRequirements}
                      isSprint={raceWizardModel.raceEvent.raceDistance === distances.sprint}
                      raceDate={raceWizardModel.raceEvent.raceDate ?? ''}
                      eventClassificationId={
                        raceWizardModel.raceEvent.eventClassificationId as EventClassificationIdTypes
                      }
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
                  ) : null,
                okText: t('common.Save'),
                okButtonProps: {
                  disabled: true,
                },
                cancelText: t('common.Cancel'),
                onOk() {
                  const mobxResult = raceWizardModel.raceEvent?.results.find(
                    (r) => r.resultId === resultObject.resultId
                  );
                  if (mobxResult) {
                    applySnapshot(mobxResult, resultObject);
                    mobxResult.setIsAwardTouched(clubModel.raceClubs!, raceWizardModel.raceEvent as IRaceEventBasic);
                  }
                  onValidate(!!raceWizardModel.raceEvent?.valid);
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
              raceWizardModel.raceEvent?.removeResult(record);
              onValidate(!!raceWizardModel.raceEvent?.valid);
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
        id == null ? <MissingTag t={t} /> : clubModel.raceClubs?.selectedClub.competitorById(id)?.fullName,
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
          const classClassificationDescription = clubModel.raceClubs?.classClassification(
            record.deviantEventClassificationId
              ? (record.deviantEventClassificationId as EventClassificationIdTypes)
              : (raceWizardModel.raceEvent?.eventClassificationId as EventClassificationIdTypes),
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
        record.feeToClub == null ? <MissingTag t={t} /> : record.feeToClub + (record.serviceFeeToClub ?? 0),
    },
    {
      title: t('results.DeviantEventClassification'),
      dataIndex: 'deviantEventClassificationId',
      key: 'deviantEventClassificationId',
    },
  ];

  const teamColumns: ColumnType<IExtendedRaceTeamResult>[] = [
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
              let confirmModal: {
                destroy: () => void;
                update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
              };
              // eslint-disable-next-line prefer-const
              confirmModal = info({
                width: 800,
                icon: <StyledIcon type="edit" />,
                title: `${t('results.Edit')} (${
                  clubModel.raceClubs?.selectedClub.competitorById(record.competitorId)?.fullName
                }, ${record.className})`,
                content:
                  raceWizardModel.raceEvent && clubModel.raceClubs ? (
                    <EditResultRelay
                      clubModel={clubModel}
                      eventClassificationId={
                        raceWizardModel.raceEvent.eventClassificationId as EventClassificationIdTypes
                      }
                      raceLightCondition={raceWizardModel.raceEvent.raceLightCondition as LightConditionTypes}
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
                  ) : null,
                okText: t('common.Save'),
                okButtonProps: {
                  disabled: true,
                },
                cancelText: t('common.Cancel'),
                onOk() {
                  const mobxResult = raceWizardModel.raceEvent?.teamResults.find(
                    (r) => r.teamResultId === resultObject.teamResultId
                  );
                  if (mobxResult) applySnapshot(mobxResult, resultObject);
                  onValidate(!!raceWizardModel.raceEvent?.valid);
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
              raceWizardModel.raceEvent?.removeTeamResult(record);
              onValidate(!!raceWizardModel.raceEvent?.valid);
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
        id == null ? <MissingTag t={t} /> : clubModel.raceClubs?.selectedClub.competitorById(id)?.fullName,
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
          const classClassificationDescription = clubModel.raceClubs?.classClassification(
            record.deviantEventClassificationId
              ? (record.deviantEventClassificationId as EventClassificationIdTypes)
              : (raceWizardModel.raceEvent?.eventClassificationId as EventClassificationIdTypes),
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
    {
      title: t('results.Stage'),
      dataIndex: 'stageText',
      key: 'stageText',
      render: (value, record) => (record.stage == null || record.totalStages == null ? <MissingTag t={t} /> : value),
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
  ];

  return raceWizardModel.raceEvent && clubModel.raceClubs && loaded && visible ? (
    <Form
      id={formId}
      ref={formRef}
      layout="vertical"
      initialValues={{
        iName: raceWizardModel.raceEvent.name,
        iOrganiserName: raceWizardModel.raceEvent.organiserName,
        iRaceDate: !raceWizardModel.raceEvent.raceDate ? null : moment(raceWizardModel.raceEvent.raceDate, dateFormat),
        iRaceTime: raceWizardModel.raceEvent.raceTime,
        iMeetsAwardRequirements: raceWizardModel.raceEvent.meetsAwardRequirements,
        iEventClassificationId: raceWizardModel.raceEvent.eventClassificationId,
        iPaymentModel: raceWizardModel.raceEvent.paymentModel,
        iSportCode: !raceWizardModel.raceEvent.sportCode ? undefined : raceWizardModel.raceEvent.sportCode,
        iIsRelay: raceWizardModel.raceEvent.isRelay,
        iRaceDistance: !raceWizardModel.raceEvent.raceDistance ? undefined : raceWizardModel.raceEvent.raceDistance,
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
                raceWizardModel.raceEvent?.setStringValueOrNull('name', e.currentTarget.value);
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                raceWizardModel.raceEvent?.setStringValueOrNull('organiserName', e.currentTarget.value);
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                date && raceWizardModel.raceEvent?.setStringValueOrNull('raceDate', date.format(dateFormat));
                onValidate(!!raceWizardModel.raceEvent?.valid);
              }}
            />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem name="iRaceTime" label={t('results.Time')}>
            <InputTime
              format={shortTimeFormat}
              allowClear={true}
              onChange={(time) => {
                time && raceWizardModel.raceEvent?.setStringValueOrNull('raceTime', time);
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                  raceWizardModel.raceEvent?.setBooleanValue('meetsAwardRequirements', checked);
                  CalculateAllAwards(clubModel.raceClubs!, raceWizardModel.raceEvent!);
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
                raceWizardModel.raceEvent?.setEventClassificationId(code);
                ResetClassClassifications(
                  raceWizardModel.raceEvent!,
                  clubModel.raceClubs!.eventClassifications,
                  clubModel.raceClubs!.classLevels
                );
                CalculateAllAwards(clubModel.raceClubs!, raceWizardModel.raceEvent!);
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                raceWizardModel.raceEvent?.setPaymentModel(code);
                if (code !== payments.defaultFeePaidByCompetitor) {
                  raceWizardModel.setNumberValue('paymentModel', code);
                }
                CalculateCompetitorsFee(
                  raceWizardModel.raceEvent!,
                  clubModel.raceClubs!.selectedClub,
                  clubModel.raceClubs!.eventClassifications
                );
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                raceWizardModel.raceEvent?.setSportCode(code);
                raceWizardModel.raceEvent?.setBooleanValue('meetsAwardRequirements', code === 'OL');
                CalculateAllAwards(clubModel.raceClubs!, raceWizardModel.raceEvent!);
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                raceWizardModel.raceEvent?.setBooleanValue('isRelay', checked);
                setIsRelay(checked);
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
                raceWizardModel.raceEvent?.setRaceDistance(code);
                onValidate(!!raceWizardModel.raceEvent?.valid);
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
                raceWizardModel.raceEvent?.setRaceLightCondition(code);
                onValidate(!!raceWizardModel.raceEvent?.valid);
              }}
            />
          </FormItem>
        </Col>
      </Row>
      {isRelay ? (
        <StyledTable
          columns={teamColumns as ColumnType<any>[]}
          dataSource={raceWizardModel.raceEvent.teamResults.map((result) => ({
            ...getSnapshot(result),
            stageText: `${result.stage} ${t('common.Of')} ${result.totalStages}`,
          }))}
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      ) : (
        <StyledTable
          columns={columns as ColumnType<any>[]}
          dataSource={raceWizardModel.raceEvent.results.map((result) => ({
            ...getSnapshot(result),
            isAwardTouched: result.isAwardTouched,
            fee: `${result.originalFee != null && result.lateFee != null ? result.originalFee + result.lateFee : null}`,
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
});

export default ResultWizardStep2EditRace;
