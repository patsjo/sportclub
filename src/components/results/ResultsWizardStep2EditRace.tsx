import { ExclamationCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Spin,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import { ModalFuncProps } from 'antd/lib/modal';
import { ColumnType } from 'antd/lib/table';
import dayjs from 'dayjs';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IRace,
  IResultListType,
  ITeamMemberRaceResult,
  ITeamMemberResult,
  ResultStatus,
} from '../../models/iof.xsd-3.0';
import {
  IRaceCompetitor,
  IRaceEventBasic,
  IRaceEventProps,
  IRaceResultMultiDayProps,
  IRaceResultProps,
  IRaceTeamResultProps,
} from '../../models/resultModel';
import { IWinnerResultProps } from '../../models/resultWizardModel';
import { PostJsonData } from '../../utils/api';
import { dateFormat, errorRequiredField, FormSelect, shortTimeFormat } from '../../utils/formHelper';
import { correctPhpEventorProxyXmlResponseForResult } from '../../utils/iofXsd30ResponseHelper';
import { useMobxStore } from '../../utils/mobxStore';
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
} from '../../utils/responseEventorInterfaces';
import {
  distances,
  DistanceTypes,
  EventClassificationIdTypes,
  failedReasons,
  genders,
  LightConditionTypes,
  ManuallyEditedMissingTimePostfix,
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
  GetClassClassificationId,
  GetClassLevel,
  GetClassShortName,
  GetFees,
  GetIOFRelaySplitTimes,
  GetIOFSplitTimes,
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
import { useResultWizardStore } from '../../utils/resultWizardStore';
import FormItem from '../formItems/FormItem';
import InputTime from '../formItems/InputTime';
import { GetPositionModal } from '../map/GetPositionModal';
import { MissingTag, NoWrap, SpinnerDiv, StyledIcon, StyledTable } from '../styled/styled';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';
import EditResultIndividual, { IExtendedRaceResult } from './EditResultIndividual';
import EditResultRelay, { IExtendedRaceTeamResult } from './EditResultRelay';

const { info } = Modal;

interface IResultWizardStep2EditRaceProps {
  height: number;
  visible: boolean;
  autoUpdateResultWithSameClass: boolean;
  onValidate: (valid: boolean) => void;
  onFailed: (e: any) => void;
}
const ResultWizardStep2EditRace = observer(
  ({ height, visible, autoUpdateResultWithSameClass, onValidate, onFailed }: IResultWizardStep2EditRaceProps) => {
    const { t } = useTranslation();
    const { globalStateModel, clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [form] = Form.useForm();
    const formId = useMemo(() => 'resultsWizardFormStep2EditRace' + Math.floor(Math.random() * 1000000000000000), []);
    const [loaded, setLoaded] = useState(false);
    const [isRelay, setIsRelay] = useState(raceWizardModel.selectedIsRelay);

    const onChooseMapPosition = useCallback(() => {
      const longitude = raceWizardModel.raceEvent?.longitude;
      const latitude = raceWizardModel.raceEvent?.latitude;
      const clubLongitude = clubModel.map?.center ? clubModel.map?.center[0] : undefined;
      const clubLatitude = clubModel.map?.center ? clubModel.map?.center[1] : undefined;
      const exists = !!longitude && !!latitude;
      if (exists || (clubLongitude && clubLatitude))
        GetPositionModal(
          t,
          exists ? longitude : clubLongitude!,
          exists ? latitude : clubLatitude!,
          exists,
          globalStateModel,
          sessionModel,
          clubModel,
        ).then((selectedPosition) => {
          if (selectedPosition) {
            raceWizardModel.raceEvent?.setNumberValueOrNull('longitude', selectedPosition.longitude);
            raceWizardModel.raceEvent?.setNumberValueOrNull('latitude', selectedPosition.latitude);
          }
        });
    }, [clubModel, globalStateModel, sessionModel]);

    const handleEventorResults = useCallback(
      async (
        editResultJson: IRaceEventProps | undefined,
        resultJson: IEventorResults | undefined,
        totalIofResults: IResultListType | undefined,
        entriesJson: IEventorEntries | undefined,
        entryFeeJson: IEventorEntryFees | undefined,
        classJson: IEventorEventClasses | undefined,
        lengthHtmlJson: string,
        eventIsRelay: boolean,
      ) => {
        // 0 = International, 1 = championchip, 2 = National, 3 = District, 4 = Nearby, 5 = Club, 6 = International
        const eventorEventClassificationId =
          resultJson && resultJson.Event ? resultJson.Event.EventClassificationId : null;
        let eventClassificationId: EventClassificationIdTypes = 'F';
        if (eventorEventClassificationId != null) {
          switch (eventorEventClassificationId) {
            case '0':
              eventClassificationId = 'D';
              break;
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
          entriesJson.Entry = entriesJson.Entry ? [entriesJson.Entry] : [];
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

        let raceEvent: IRaceEventProps | undefined = !raceWizardModel.overwrite ? editResultJson : undefined;
        let eventRace: IEventorEventRace | undefined;
        if (resultJson != null) {
          if (Array.isArray(resultJson.Event.EventRace)) {
            eventRace = resultJson.Event.EventRace.find(
              (eventRace) => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString(),
            );
            resultJson.Event.Name = resultJson.Event.Name + ', ' + eventRace?.Name;
          } else {
            eventRace = resultJson.Event.EventRace;
          }
          if (eventRace) {
            const raceLightCondition = eventRace['@attributes']?.raceLightCondition;
            raceEvent = {
              eventId: raceWizardModel.selectedEventId ?? -1,
              eventorId: raceWizardModel.selectedEventorId,
              eventorRaceId: raceWizardModel.selectedEventorRaceId,
              name: resultJson.Event.Name,
              organiserName: Array.isArray(resultJson.Event.Organiser?.Organisation)
                ? resultJson.Event.Organiser?.Organisation.map((org) => org.Name)
                    .join('/')
                    .substring(0, 128)
                : resultJson.Event.Organiser?.Organisation?.Name,
              raceDate: eventRace.RaceDate.Date,
              raceTime: eventRace.RaceDate.Clock === '00:00:00' ? null : eventRace.RaceDate.Clock,
              sportCode:
                resultJson.Event.DisciplineId === '1'
                  ? 'OL'
                  : resultJson.Event.DisciplineId === '2'
                    ? 'MTBO'
                    : resultJson.Event.DisciplineId === '3'
                      ? 'SKIO'
                      : 'OL',
              isRelay: !!eventIsRelay,
              eventClassificationId: eventClassificationId,
              raceLightCondition: raceLightConditionOptions(t).some((option) => option.code === raceLightCondition)
                ? raceLightCondition
                : null,
              raceDistance: eventRace['@attributes']?.raceDistance,
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
              invoiceVerified: false,
            };
          }
        }

        if (resultJson != null && resultJson.ClassResult != null) {
          const raceWinnerResults: IWinnerResultProps[] = [];
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
                  (evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId,
                );
              }
              if (!currentClass) {
                currentClass = {
                  ClassShortName: classResult.EventClass.ClassShortName,
                  Name: classResult.EventClass.Name,
                  ClassRaceInfo: classResult.EventClass.ClassRaceInfo,
                  EventClassId: classResult.EventClass.EventClassId,
                  '@attributes': classResult.EventClass['@attributes'],
                  EventClassStatus: classResult.EventClass.EventClassStatus,
                  ExternalId: classResult.EventClass.ExternalId,
                  PunchingUnitType: classResult.EventClass.PunchingUnitType,
                };
              }

              if (Array.isArray(currentClass.ClassRaceInfo)) {
                currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                  (raceInfo) => raceInfo.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString(),
                )!;
              }
              nofStartsInClass = parseInt(currentClass.ClassRaceInfo['@attributes'].noOfStarts);

              if (classResult.PersonResult != null) {
                const personResults: IEventorPersonResult[] = Array.isArray(classResult.PersonResult)
                  ? classResult.PersonResult.filter(
                      (personResult) =>
                        personResult.RaceResult == null ||
                        personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString(),
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
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);
                const lengthInMeter = currentClass ? GetLength(lengthHtmlJson, currentClass.Name) : null;
                const winnerResult = personResults.find((personResult) => personResult.Result?.ResultPosition === '1');

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
                      (raceWizardModel.queryForCompetitorWithNoClub && !personResult.Organisation?.OrganisationId) ||
                      personResult.Organisation?.OrganisationId === clubModel.eventor?.organisationId.toString() ||
                      (personResult.Organisation?.OrganisationId ===
                        clubModel.eventor?.districtOrganisationId.toString() &&
                        clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                          parseInt(personResult.Person.PersonId),
                        ) != null),
                  );

                  for (let j = 0; j < clubPersonResults.length; j++) {
                    const personResult = clubPersonResults[j];
                    let competitor: IRaceCompetitor | undefined;
                    if (typeof personResult.Person.PersonId === 'string' && personResult.Person.PersonId.length > 0) {
                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                          parseInt(personResult.Person.PersonId),
                        );
                      }

                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                          (c) =>
                            c.firstName === personResult.Person.PersonName.Given &&
                            c.lastName === personResult.Person.PersonName.Family &&
                            c.birthDay === personResult.Person.BirthDate?.Date,
                        );
                        if (competitor) {
                          await competitor.addEventorId(
                            clubModel.modules.find((module) => module.name === 'Results')!.addUrl!,
                            personResult.Person.PersonId,
                            sessionModel.authorizationHeader,
                          );
                        }
                      }
                    }
                    if (!competitor && clubModel.raceClubs?.selectedClub) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        -1,
                        personResult.Person.PersonId,
                        {
                          iType: 'COMPETITOR',
                          iFirstName: personResult.Person.PersonName.Given,
                          iLastName: personResult.Person.PersonName.Family,
                          iBirthDay: personResult.Person.BirthDate == null ? null : personResult.Person.BirthDate?.Date,
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
                        currentClass?.ClassShortName ?? '',
                        clubModel,
                        sessionModel,
                      );
                    }

                    if (competitor) {
                      const entry: IEventorEntry | undefined = personResult.Person.PersonId
                        ? entriesJson.Entry.find(
                            (entry) =>
                              entry.Competitor?.PersonId === personResult.Person.PersonId ||
                              entry.Competitor?.Person?.PersonId === personResult.Person.PersonId,
                          )
                        : undefined;
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
                      const fees = GetFees(entryFeeJson.EntryFee, entryFeeIds, competitor.birthDay);

                      let resultMultiDay: IRaceResultMultiDayProps | undefined;
                      if (totalIofResults && totalIofResults.ClassResult) {
                        const totalEventRace = totalIofResults.Event.Race?.find(
                          (eventRace) => eventRace.Extensions.EventRaceId == raceWizardModel.selectedEventorRaceId,
                        );
                        const totalClassPersonResults = totalIofResults.ClassResult.find(
                          (cr) => cr.Class.Id === currentClass?.EventClassId,
                        )?.PersonResult?.map((pr) => ({
                          ...pr,
                          Result: pr.Result?.find((r) => r['@attributes'].raceNumber === totalEventRace?.RaceNumber),
                        }));
                        const totalPersonResult = totalClassPersonResults?.find(
                          (pr) =>
                            pr.Person.Id?.some((id) => id === personResult.Person.PersonId) &&
                            pr.Result?.BibNumber === personResult.Result?.BibNumber &&
                            pr.Result?.Status !== 'NotCompeting',
                        )?.Result;

                        if (totalPersonResult) {
                          const totalDidNotStart = totalPersonResult.Status === 'DidNotStart';
                          const totalMisPunch = totalPersonResult.Status === 'MissingPunch';
                          const totalOk = totalPersonResult.Status === 'OK';
                          const totalValid = totalOk && !totalDidNotStart && !totalMisPunch;

                          resultMultiDay = {
                            multiDayResultId: -1 - 10000 * i - j,
                            stage: totalEventRace?.RaceNumber ?? 1,
                            totalStages: totalIofResults.Event.Race?.length ?? 1,
                            totalFailedReason: totalDidNotStart
                              ? failedReasons.NotStarted
                              : !totalOk
                                ? failedReasons.NotFinished
                                : !totalPersonResult.Time ||
                                    (totalPersonResult.Position !== 1 && !totalPersonResult.TimeBehind) ||
                                    shortClassName === 'INSK'
                                  ? failedReasons.Finished
                                  : null,
                            totalLengthInMeter: null,
                            totalPosition: totalPersonResult.Position,
                            totalNofStartsInClass: nofStartsInClass,
                            totalTime:
                              totalValid && totalPersonResult.Time
                                ? ConvertSecondsToTime(totalPersonResult.Time)
                                : null,
                            totalWinnerTime:
                              totalValid && totalPersonResult.Time && totalPersonResult.TimeBehind != null
                                ? ConvertSecondsToTime(totalPersonResult.Time - totalPersonResult.TimeBehind)
                                : null,
                            totalSecondTime: null,
                          };
                        }
                      }

                      const raceResult: IRaceResultProps = {
                        resultId: -1 - 10000 * i - j,
                        competitorId: competitor.competitorId,
                        resultMultiDay: null,
                        className: shortClassName ?? '',
                        deviantEventClassificationId: null,
                        classClassificationId: GetClassClassificationId(
                          raceEvent?.eventClassificationId as EventClassificationIdTypes | undefined,
                          classLevel,
                          clubModel.raceClubs?.eventClassifications,
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
                                parseInt(personResult.Result.ResultPosition),
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
                          secondBestSplitTimes,
                        ),
                      };
                      raceEvent && raceEvent.results?.push(raceResult);
                    }
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
                  (evtClass) => evtClass.EventClassId === classResult.EventClass.EventClassId,
                );
              }
              if (!currentClass) {
                currentClass = {
                  ClassShortName: classResult.EventClass.ClassShortName,
                  Name: classResult.EventClass.Name,
                  ClassRaceInfo: classResult.EventClass.ClassRaceInfo,
                  EventClassId: classResult.EventClass.EventClassId,
                  '@attributes': classResult.EventClass['@attributes'],
                  EventClassStatus: classResult.EventClass.EventClassStatus,
                  ExternalId: classResult.EventClass.ExternalId,
                  PunchingUnitType: classResult.EventClass.PunchingUnitType,
                };
              }
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

              if (classResult.TeamResult != null) {
                const preTeamResults = Array.isArray(classResult.TeamResult)
                  ? classResult.TeamResult.filter(
                      (teamResult) =>
                        teamResult.RaceResult == null ||
                        teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString(),
                    )
                  : classResult.TeamResult.RaceResult == null ||
                      classResult.TeamResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.TeamResult]
                    : [];
                const teamResults: IEventorTeamResult[] = preTeamResults.map((pre) =>
                  pre.RaceResult?.TeamMemberResult != null ? pre.RaceResult : (pre as IEventorTeamResult),
                );

                const allLegsSplitTimes = GetRelaySplitTimes(teamResults);
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);

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
                    ? teamResult.Organisation!.filter((org) => !!org)
                    : [teamResult.Organisation!].filter((org) => !!org);

                  const hasClubMembers = teamOrganisations.some(
                    (org) => org.OrganisationId === clubModel.eventor?.organisationId.toString(),
                  );
                  const hasDistrictMembers = teamOrganisations.some(
                    (org) => org.OrganisationId === clubModel.eventor?.districtOrganisationId.toString(),
                  );

                  teamMemberResults.forEach((teamMemberResult) => {
                    const competitor =
                      (hasClubMembers || hasDistrictMembers) &&
                      typeof teamMemberResult.Person.PersonId === 'string' &&
                      teamMemberResult.Person.PersonId.length > 0
                        ? clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                            parseInt(teamMemberResult.Person.PersonId),
                          )
                        : null;

                    if (
                      (raceWizardModel.queryForCompetitorWithNoClub &&
                        !teamMemberResult.Organisation?.OrganisationId) ||
                      teamMemberResult.Organisation?.OrganisationId === clubModel.eventor?.organisationId.toString() ||
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
                      competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                        (c) =>
                          c.firstName === teamMemberResult.Person.PersonName.Given &&
                          c.lastName === teamMemberResult.Person.PersonName.Family &&
                          c.birthDay === teamMemberResult.Person.BirthDate?.Date,
                      );
                      if (competitor) {
                        await competitor.addEventorId(
                          clubModel.modules.find((module) => module.name === 'Results')!.addUrl!,
                          teamMemberResult.Person.PersonId,
                          sessionModel.authorizationHeader,
                        );
                      }
                    }
                  }
                  if (!competitor && clubModel.raceClubs?.selectedClub) {
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
                        iClubId: clubModel.raceClubs.selectedClub.clubId,
                        iStartDate: '1930-01-01',
                        iEndDate: null,
                        iEventorCompetitorId:
                          typeof teamMemberResult.Person.PersonId !== 'string' ||
                          teamMemberResult.Person.PersonId.length === 0
                            ? null
                            : teamMemberResult.Person.PersonId,
                      },
                      currentClass?.ClassShortName ?? '',
                      clubModel,
                      sessionModel,
                    );
                  }

                  if (competitor) {
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
                            teamResult.TeamMemberResult!,
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
                    const raceTeamResult: IRaceTeamResultProps = {
                      teamResultId: -1 - i * 20000 - j,
                      competitorId: competitor?.competitorId ?? -1,
                      className: shortClassName ?? '',
                      deviantEventClassificationId: null,
                      classClassificationId: GetClassClassificationId(
                        raceEvent?.eventClassificationId as EventClassificationIdTypes | undefined,
                        classLevel,
                        clubModel.raceClubs?.eventClassifications,
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
                                teamMemberResult.Position ? parseInt(teamMemberResult.Position) : 2,
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
                            legSplitTimes.secondBestSplitTimes,
                          )
                        : null,
                    };

                    raceEvent && raceEvent.teamResults?.push(raceTeamResult);
                  }
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
      },
      [],
    );

    const handleIOFResults = useCallback(
      async (
        editResultJson: IRaceEventProps | undefined,
        iofResults: IResultListType | undefined,
        totalIofResults: IResultListType | undefined,
        entriesJson: IEventorEntries | undefined,
        entryFeeJson: IEventorEntryFees | undefined,
        classJson: IEventorEventClasses | undefined,
        eventIsRelay: boolean,
      ) => {
        let eventClassificationId: EventClassificationIdTypes = 'F';
        if (iofResults?.Event.Classification != null) {
          switch (iofResults.Event.Classification) {
            case 'Regional':
              eventClassificationId = 'I';
              break;
            case 'Local':
            case 'Club':
              eventClassificationId = 'G';
              break;
            case 'International':
              eventClassificationId = 'B';
              break;
            default:
          }
        }
        if (entriesJson == null || entriesJson.Entry == null) {
          entriesJson = { Entry: [] };
        }
        if (!Array.isArray(entriesJson.Entry)) {
          entriesJson.Entry = entriesJson.Entry ? [entriesJson.Entry] : [];
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

        let raceEvent: IRaceEventProps | undefined = !raceWizardModel.overwrite ? editResultJson : undefined;
        let eventRace: IRace | undefined;
        if (iofResults != null) {
          eventRace = iofResults.Event.Race?.find(
            (eventRace) => eventRace.Extensions.EventRaceId == raceWizardModel.selectedEventorRaceId,
          );
          if (eventRace?.Name && iofResults.Event.Race && iofResults.Event.Race.length > 1)
            iofResults.Event.Name = iofResults.Event.Name + ', ' + eventRace?.Name;

          if (eventRace) {
            const raceLightCondition = eventRace.Extensions.LightCondition;
            raceEvent = {
              eventId: raceWizardModel.selectedEventId ?? -1,
              eventorId: raceWizardModel.selectedEventorId,
              eventorRaceId: raceWizardModel.selectedEventorRaceId,
              name: iofResults.Event.Name,
              organiserName: iofResults.Event.Organiser
                ? iofResults.Event.Organiser.map((org) => org.Name)
                    .join('/')
                    .substring(0, 128)
                : undefined,
              raceDate: eventRace.StartTime?.Date,
              raceTime: eventRace.StartTime?.Time === '00:00' ? null : eventRace.StartTime?.Time,
              sportCode:
                eventRace.Extensions?.Discipline === 'Foot'
                  ? 'OL'
                  : eventRace.Extensions?.Discipline === 'MountainBike'
                    ? 'MTBO'
                    : eventRace.Extensions?.Discipline === 'Ski'
                      ? 'SKIO'
                      : 'OL',
              isRelay: eventIsRelay,
              eventClassificationId: eventClassificationId,
              raceLightCondition: raceLightConditionOptions(t).find((option) => option.code === raceLightCondition)
                ?.code as LightConditionTypes | undefined,
              raceDistance: raceDistanceOptions(t).find(
                (option) =>
                  (option.code as string).toLowerCase() === eventRace?.Discipline?.find(() => true)?.toLowerCase(),
              )?.code as DistanceTypes | undefined,
              paymentModel: raceWizardModel.paymentModel,
              meetsAwardRequirements: true,
              longitude: eventRace.Position?.['@attributes'].lng,
              latitude: eventRace.Position?.['@attributes'].lat,
              results: [],
              teamResults: [],
              rankingBaseDescription: editResultJson?.rankingBaseDescription,
              rankingBasetimePerKilometer: editResultJson?.rankingBasetimePerKilometer,
              rankingBasepoint: editResultJson?.rankingBasepoint,
              invoiceVerified: false,
            };
          }
        }

        if (iofResults != null && iofResults.ClassResult != null) {
          const raceWinnerResults: IWinnerResultProps[] = [];
          const classResults = iofResults.ClassResult;
          if (!eventIsRelay) {
            for (let i = 0; i < classResults.length; i++) {
              const classResult = classResults[i];
              let currentClass:
                | {
                    ClassShortName: string;
                    Name: string;
                    ClassEntryFee?: IEventorEntryClassFee[] | IEventorEntryClassFee;
                  }
                | undefined;
              if (eventClasses != null) {
                currentClass = eventClasses.find((evtClass) => evtClass.EventClassId === classResult.Class.Id);
              }
              if (!currentClass) {
                currentClass = {
                  ClassShortName: classResult.Class.ShortName ?? classResult.Class.Name,
                  Name: classResult.Class.Name,
                };
              }

              if (classResult.PersonResult != null && classResult.PersonResult.length > 0) {
                const personResults = classResult.PersonResult.filter((personResult) =>
                  personResult.Result?.some((r) => r['@attributes'].raceNumber === eventRace?.RaceNumber),
                ).map((personResult) => ({
                  ...personResult,
                  Result: personResult.Result?.find(() => true),
                }));

                const nofStartsInClass =
                  personResults?.filter(
                    (pr) =>
                      pr.Result &&
                      pr.Result.Status !== 'DidNotEnter' &&
                      pr.Result.Status !== 'DidNotStart' &&
                      pr.Result.Status !== 'Moved' &&
                      pr.Result.Status !== 'MovedUp' &&
                      pr.Result.Status !== 'NotCompeting',
                  )?.length ?? 0;

                const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetIOFSplitTimes(personResults);
                const shortClassName = GetClassShortName(currentClass?.ClassShortName);
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);
                const lengthInMeter =
                  classResult.Course?.find((c) => c['@attributes'].raceNumber === eventRace?.RaceNumber)?.Length ??
                  personResults.find(() => true)?.Result?.Course?.Length;
                const winnerResult = personResults.find((personResult) => personResult.Result?.Position === 1);
                const winnerTime = winnerResult?.Result?.Time
                  ? ConvertSecondsToTime(winnerResult.Result.Time)
                  : undefined;

                if (
                  winnerResult &&
                  (!classLevel ||
                    (classLevel.difficulty.toLowerCase() !== 'grön' &&
                      classLevel.difficulty.toLowerCase() !== 'vit' &&
                      classLevel.difficulty.toLowerCase() !== 'gul'))
                ) {
                  const secondsPerKilometer =
                    winnerTime && lengthInMeter
                      ? GetSecondsWithFractionsPerKiloMeter(winnerTime, lengthInMeter)
                      : undefined;
                  raceWinnerResults.push({
                    id: raceWinnerResults.length,
                    personName: `${winnerResult.Person.Name.Given} ${winnerResult.Person.Name.Family}`,
                    className: shortClassName ?? '',
                    difficulty: classLevel ? classLevel.difficulty : null,
                    lengthInMeter: lengthInMeter,
                    winnerTime: winnerTime,
                    secondsPerKilometer: secondsPerKilometer,
                    timePerKilometer: secondsPerKilometer
                      ? ConvertSecondsWithFractionsToTime(secondsPerKilometer)
                      : undefined,
                  });
                }

                if (raceWizardModel.overwrite) {
                  const clubPersonResults = personResults.filter(
                    (personResult) =>
                      (raceWizardModel.queryForCompetitorWithNoClub && !personResult.Organisation?.Id) ||
                      personResult?.Organisation?.Id == clubModel.eventor?.organisationId ||
                      (personResult.Organisation?.Id == clubModel.eventor?.districtOrganisationId &&
                        clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                          parseInt(personResult.Person.Id?.find(() => true) as string),
                        ) != null),
                  );

                  for (let j = 0; j < clubPersonResults.length; j++) {
                    const personResult = clubPersonResults[j];
                    const personId = personResult.Person.Id?.find(() => true);
                    let competitor: IRaceCompetitor | undefined;
                    if (personId && personId.length > 0) {
                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitorByEventorId(parseInt(personId));
                      }

                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                          (c) =>
                            c.firstName === personResult.Person.Name.Given &&
                            c.lastName === personResult.Person.Name.Family &&
                            c.birthDay === personResult.Person.BirthDate?.format(dateFormat),
                        );
                        if (competitor) {
                          await competitor.addEventorId(
                            clubModel.modules.find((module) => module.name === 'Results')!.addUrl!,
                            personId,
                            sessionModel.authorizationHeader,
                          );
                        }
                      }
                    }
                    if (!competitor && clubModel.raceClubs?.selectedClub) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        -1,
                        personId,
                        {
                          iType: 'COMPETITOR',
                          iFirstName: personResult.Person.Name.Given,
                          iLastName: personResult.Person.Name.Family,
                          iBirthDay:
                            personResult.Person.BirthDate == null
                              ? null
                              : personResult.Person.BirthDate?.format(dateFormat),
                          iGender:
                            personResult.Person['@attributes'] == null
                              ? null
                              : personResult.Person['@attributes'].sex === 'F'
                                ? genders.FeMale
                                : genders.Male,
                          iClubId: clubModel.raceClubs.selectedClub.clubId,
                          iStartDate: '1930-01-01',
                          iEndDate: null,
                          iEventorCompetitorId: personId && personId.length > 0 ? personId : null,
                        },
                        currentClass?.ClassShortName ?? '',
                        clubModel,
                        sessionModel,
                      );
                    }

                    if (competitor) {
                      const entry: IEventorEntry | undefined = personId
                        ? entriesJson.Entry.find(
                            (entry) =>
                              entry.Competitor?.PersonId === personId ||
                              entry.Competitor?.Person?.PersonId === personId,
                          )
                        : undefined;
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
                      const didNotStart = personResult.Result?.Status === 'DidNotStart';
                      const misPunch = personResult.Result?.Status === 'MissingPunch';
                      const ok = personResult.Result?.Status === 'OK';
                      const valid = ok && !didNotStart && !misPunch;
                      const secondTime =
                        valid &&
                        nofStartsInClass &&
                        nofStartsInClass > 1 &&
                        personResults.some((pr) => pr.Result?.Position === 2)
                          ? personResults.find((pr) => pr.Result?.Position === 2)?.Result?.Time
                          : null;
                      const fees = GetFees(entryFeeJson.EntryFee, entryFeeIds, competitor.birthDay);

                      let resultMultiDay: IRaceResultMultiDayProps | undefined;
                      if (totalIofResults && totalIofResults.ClassResult) {
                        const totalEventRace = totalIofResults.Event.Race?.find(
                          (eventRace) => eventRace.Extensions.EventRaceId == raceWizardModel.selectedEventorRaceId,
                        );
                        const totalClassPersonResults = totalIofResults.ClassResult.find(
                          (cr) => cr.Class.Id === classResult.Class.Id,
                        )
                          ?.PersonResult?.filter((pr) =>
                            pr.Result?.some((r) => r['@attributes'].raceNumber === totalEventRace?.RaceNumber),
                          )
                          ?.map((personResult) => ({
                            ...personResult,
                            Result: personResult.Result?.find(() => true),
                          }));
                        const totalPersonResult = totalClassPersonResults?.find(
                          (pr) =>
                            pr.Person.Id?.some((id) => id === personId) &&
                            pr.Result?.BibNumber === personResult.Result?.BibNumber &&
                            pr.Result?.Status !== 'NotCompeting',
                        )?.Result;

                        if (totalPersonResult) {
                          const totalDidNotStart = totalPersonResult.Status === 'DidNotStart';
                          const totalMisPunch = totalPersonResult.Status === 'MissingPunch';
                          const totalOk = totalPersonResult.Status === 'OK';
                          const totalValid = totalOk && !totalDidNotStart && !totalMisPunch;

                          resultMultiDay = {
                            multiDayResultId: -1 - 10000 * i - j,
                            stage: totalEventRace?.RaceNumber ?? 1,
                            totalStages: totalIofResults.Event.Race?.length ?? 1,
                            totalFailedReason: totalDidNotStart
                              ? failedReasons.NotStarted
                              : !totalOk
                                ? failedReasons.NotFinished
                                : !totalPersonResult?.Time ||
                                    (totalPersonResult.Position !== 1 && !totalPersonResult.TimeBehind) ||
                                    shortClassName === 'INSK'
                                  ? failedReasons.Finished
                                  : null,
                            totalLengthInMeter: null,
                            totalPosition: totalPersonResult.Position,
                            totalNofStartsInClass: nofStartsInClass,
                            totalTime:
                              totalValid && totalPersonResult.Time
                                ? ConvertSecondsToTime(totalPersonResult.Time)
                                : null,
                            totalWinnerTime:
                              totalValid && totalPersonResult.Time && totalPersonResult.TimeBehind != null
                                ? ConvertSecondsToTime(totalPersonResult.Time - totalPersonResult.TimeBehind)
                                : null,
                            totalSecondTime: null,
                          };
                        }
                      }

                      const raceResult: IRaceResultProps = {
                        resultId: -1 - 10000 * i - j,
                        competitorId: competitor?.competitorId ?? -1,
                        resultMultiDay: resultMultiDay,
                        className: shortClassName ?? '',
                        deviantEventClassificationId: null,
                        classClassificationId: GetClassClassificationId(
                          raceEvent?.eventClassificationId as EventClassificationIdTypes | undefined,
                          classLevel,
                          clubModel.raceClubs?.eventClassifications,
                        ),
                        difficulty: classLevel ? classLevel.difficulty : null,
                        lengthInMeter: lengthInMeter,
                        failedReason: didNotStart
                          ? failedReasons.NotStarted
                          : !ok
                            ? failedReasons.NotFinished
                            : !personResult.Result?.Time ||
                                (personResult.Result.Position !== 1 && !personResult.Result.TimeBehind) ||
                                shortClassName === 'INSK'
                              ? failedReasons.Finished
                              : null,
                        competitorTime:
                          valid && personResult.Result?.Time ? ConvertSecondsToTime(personResult.Result.Time) : null,
                        winnerTime: winnerTime,
                        secondTime: secondTime ? ConvertSecondsToTime(secondTime) : null,
                        position: personResult.Result?.Position,
                        nofStartsInClass: nofStartsInClass,
                        originalFee: fees.originalFee,
                        lateFee: fees.lateFee,
                        feeToClub: null,
                        award: null,
                        points: 0,
                        pointsOld: 0,
                        points1000: 0,
                        missingTime: GetMissingTime(personId ?? '#', splitTimes, bestSplitTimes, secondBestSplitTimes),
                      };
                      raceEvent && raceEvent.results?.push(raceResult);
                    }
                  }
                }
              }
            }
          } else if (eventIsRelay && raceWizardModel.overwrite) {
            for (let i = 0; i < classResults.length; i++) {
              const classResult = classResults[i];

              if (classResult.TeamResult != null && classResult.TeamResult.length > 0) {
                let currentClass:
                  | {
                      ClassShortName: string;
                      Name: string;
                      ClassEntryFee?: IEventorEntryClassFee[] | IEventorEntryClassFee;
                    }
                  | undefined;
                let nofStartsInClass: number | null = null;

                if (eventClasses != null) {
                  currentClass = eventClasses.find((evtClass) => evtClass.EventClassId === classResult.Class.Id);
                }
                if (!currentClass) {
                  currentClass = {
                    ClassShortName: classResult.Class.ShortName ?? classResult.Class.Name,
                    Name: classResult.Class.Name,
                  };
                }

                let shortClassName: string | null = null;
                const teamResults = classResult.TeamResult.map((teamResult) => ({
                  ...teamResult,
                  TeamMemberResult: teamResult.TeamMemberResult?.filter((teamMemberResult) =>
                    teamMemberResult.Result?.some((r) => r['@attributes'].raceNumber === eventRace?.RaceNumber),
                  )?.map((teamMemberResult) => ({
                    ...teamMemberResult,
                    Result: teamMemberResult.Result?.find(() => true),
                  })),
                }));
                const allLegsSplitTimes = GetIOFRelaySplitTimes(teamResults);
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);
                const numberOfLegs = Math.max(
                  1,
                  ...(teamResults.map((tr) =>
                    Math.max(
                      1,
                      ...((tr.TeamMemberResult?.map((tmr) => tmr.Result?.Leg)?.filter((l) => l) as number[]) ?? []),
                    ),
                  ) ?? []),
                );
                const legInfos = Array.from(Array(numberOfLegs).keys())
                  .map((idx) => idx + 1)
                  .map((leg) => {
                    const courses =
                      classResult.Course?.filter((r) => r['@attributes'].raceNumber === eventRace?.RaceNumber) ?? [];
                    const course = courses.find((c, idx) => leg === idx + 1 || courses.length === idx + 1);
                    const startedlegMembers = teamResults
                      .map((tr) =>
                        (tr.TeamMemberResult ?? []).filter(
                          (tmr) =>
                            tmr.Result &&
                            tmr.Result.Leg === leg &&
                            tmr.Result.Status !== 'DidNotEnter' &&
                            tmr.Result.Status !== 'DidNotStart' &&
                            tmr.Result.Status !== 'Moved' &&
                            tmr.Result.Status !== 'MovedUp' &&
                            tmr.Result.Status !== 'NotCompeting',
                        ),
                      )
                      .reduce(
                        (a, b) => [...b, ...a],
                        [] as (Omit<ITeamMemberResult, 'Result'> & { Result: ITeamMemberRaceResult })[],
                      ) as (Omit<ITeamMemberResult, 'Result'> & { Result: ITeamMemberRaceResult })[];
                    const oklegMembers = startedlegMembers?.filter((tmr) => tmr.Result.Status === 'OK');
                    const legWinner = oklegMembers?.find((tmr) => tmr.Result?.Position === 1);
                    const lengthInMeter = course?.Length;
                    const winnerTime = legWinner?.Result?.Time
                      ? ConvertSecondsToTime(legWinner.Result.Time)
                      : undefined;
                    const secondsPerKilometer =
                      winnerTime && lengthInMeter
                        ? GetSecondsWithFractionsPerKiloMeter(winnerTime, lengthInMeter)
                        : undefined;

                    raceWinnerResults.push({
                      id: raceWinnerResults.length,
                      personName: `${legWinner?.Person?.Name.Given} ${legWinner?.Person?.Name.Family}`,
                      className: `${shortClassName} - ${leg}`,
                      difficulty: classLevel ? classLevel.difficulty : null,
                      lengthInMeter: lengthInMeter,
                      winnerTime: winnerTime,
                      secondsPerKilometer: secondsPerKilometer,
                      timePerKilometer: secondsPerKilometer
                        ? ConvertSecondsWithFractionsToTime(secondsPerKilometer)
                        : undefined,
                    });

                    const legWinnerTime = oklegMembers?.find((r) => r.Result.Position === 1)?.Result.Time;
                    const overallWinnerTime = oklegMembers?.find((r) => r.Result.OverallResult?.Position === 1)?.Result
                      .OverallResult?.Time;

                    return {
                      leg: leg,
                      numberOfStarts: startedlegMembers?.length ?? 0,
                      legWinnerTime: legWinnerTime,
                      overallWinnerTime: overallWinnerTime,
                      oklegMembers: oklegMembers,
                      lengthInMeter: lengthInMeter,
                    };
                  });
                const firstLegInfo = legInfos?.find((c) => c.leg === 1);
                const lastLegInfo = legInfos?.find((c) => c.leg === legInfos?.length);
                nofStartsInClass = firstLegInfo ? firstLegInfo.numberOfStarts : null;
                shortClassName = GetClassShortName(currentClass.ClassShortName);

                const clubTeamMemberResults: (Omit<ITeamMemberResult, 'Result'> & {
                  Result?: ITeamMemberRaceResult;
                  Competitor?: IRaceCompetitor | null;
                  TeamName?: string;
                  TeamTime?: number;
                  TeamTimeDiff?: number;
                  TeamPosition?: number;
                  TeamStatus: ResultStatus;
                  BibNumber: string;
                })[] = [];
                teamResults.forEach((teamResult) => {
                  const hasClubMembers = teamResult.Organisation?.some(
                    (org) => org.Id === clubModel.eventor?.organisationId.toString(),
                  );
                  const hasDistrictMembers = teamResult.Organisation?.some(
                    (org) => org.Id === clubModel.eventor?.districtOrganisationId.toString(),
                  );
                  const teamOverallResult = teamResult.TeamMemberResult?.find(
                    (tmr) => tmr.Result?.Leg === lastLegInfo?.leg,
                  )?.Result?.OverallResult;

                  teamResult.TeamMemberResult?.forEach((teamMemberResult) => {
                    const personId = teamMemberResult.Person?.Id?.find(() => true);
                    const competitor =
                      (hasClubMembers || hasDistrictMembers) && personId && personId.length > 0
                        ? clubModel.raceClubs?.selectedClub?.competitorByEventorId(parseInt(personId))
                        : null;

                    if (
                      (raceWizardModel.queryForCompetitorWithNoClub && !teamMemberResult.Organisation?.Id) ||
                      teamMemberResult.Organisation?.Id === clubModel.eventor?.organisationId.toString() ||
                      competitor ||
                      (hasClubMembers && teamResult.Organisation?.length === 1)
                    ) {
                      clubTeamMemberResults.push({
                        ...teamMemberResult,
                        Competitor: competitor,
                        TeamName: teamResult.Name,
                        TeamTime: teamOverallResult?.Time,
                        TeamTimeDiff:
                          teamOverallResult?.Time && lastLegInfo?.overallWinnerTime
                            ? teamOverallResult.Time - lastLegInfo.overallWinnerTime
                            : undefined,
                        TeamPosition: teamOverallResult?.Position,
                        TeamStatus: teamOverallResult?.Status ?? 'DidNotEnter',
                        BibNumber: teamMemberResult.Result?.BibNumber ?? `${shortClassName}-${teamResult.Name}`,
                      });
                    }
                  });
                });

                for (let j = 0; j < clubTeamMemberResults.length; j++) {
                  const teamMemberResult = clubTeamMemberResults[j];
                  const personId = teamMemberResult.Person?.Id?.find(() => true);
                  let competitor = teamMemberResult.Competitor;
                  if (personId && personId.length > 0) {
                    if (!competitor) {
                      competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                        (c) =>
                          c.firstName === teamMemberResult.Person?.Name.Given &&
                          c.lastName === teamMemberResult.Person?.Name.Family &&
                          c.birthDay === teamMemberResult.Person.BirthDate?.format(dateFormat),
                      );
                      if (competitor) {
                        await competitor.addEventorId(
                          clubModel.modules.find((module) => module.name === 'Results')!.addUrl!,
                          personId,
                          sessionModel.authorizationHeader,
                        );
                      }
                    }
                  }
                  if (!competitor && clubModel.raceClubs?.selectedClub) {
                    competitor = await AddMapCompetitorConfirmModal(
                      t,
                      -1,
                      personId,
                      {
                        iType: 'COMPETITOR',
                        iFirstName: teamMemberResult.Person?.Name.Given ?? null,
                        iLastName: teamMemberResult.Person?.Name.Family ?? null,
                        iBirthDay:
                          teamMemberResult.Person?.BirthDate == null
                            ? null
                            : teamMemberResult.Person.BirthDate?.format(dateFormat),
                        iGender:
                          !teamMemberResult.Person || teamMemberResult.Person['@attributes'] == null
                            ? null
                            : teamMemberResult.Person['@attributes'].sex === 'F'
                              ? genders.FeMale
                              : genders.Male,
                        iClubId: clubModel.raceClubs.selectedClub.clubId,
                        iStartDate: '1930-01-01',
                        iEndDate: null,
                        iEventorCompetitorId: personId ?? null,
                      },
                      currentClass?.ClassShortName ?? '',
                      clubModel,
                      sessionModel,
                    );
                  }

                  if (competitor) {
                    const didNotStart = teamMemberResult.Result?.Status === 'DidNotStart';
                    const misPunch = teamMemberResult.Result?.Status === 'MissingPunch';
                    const ok = teamMemberResult.Result?.Status === 'OK';
                    const valid = ok && !didNotStart && !misPunch;
                    const position =
                      valid && teamMemberResult.Result?.Position != null ? teamMemberResult.Result.Position : null;
                    const leg = teamMemberResult.Result?.Leg ?? 0;
                    const legRaceInfo = legInfos?.find((classRaceInfo) => classRaceInfo.leg === leg);
                    const nofStartsInLeg = valid && legRaceInfo ? legRaceInfo.numberOfStarts : null;
                    //const secondTime =
                    //  valid && nofStartsInClass > 1
                    //    ? personResults.find(pr => pr.Result.ResultPosition === "2").Result.Time
                    //    : null;

                    const stageOk = teamMemberResult.Result?.OverallResult?.Status === 'OK';
                    const teamDidNotStart = teamMemberResult.TeamStatus === 'DidNotStart';
                    const teamMisPunch = teamMemberResult.TeamStatus === 'MissingPunch';
                    const teamOk = teamMemberResult.TeamStatus === 'OK';
                    const teamValid = teamOk && !teamDidNotStart && !teamMisPunch;
                    const teamPosition = teamValid ? teamMemberResult.TeamPosition : null;
                    const totalStagePosition =
                      stageOk && teamMemberResult.Result?.OverallResult?.Position
                        ? teamMemberResult.Result.OverallResult.Position
                        : null;
                    const totalStageTimeBehind =
                      teamMemberResult.Result?.OverallResult?.Time && stageOk && legRaceInfo?.overallWinnerTime
                        ? teamMemberResult.Result.OverallResult?.Time - legRaceInfo.overallWinnerTime
                        : null;
                    let deltaPositions: number | null = null;
                    let deltaTimeBehind: string | null = null;
                    if (leg > 1 && stageOk) {
                      const prevLeg = (leg - 1).toString();
                      const prevLegRaceInfo = legInfos?.find((classRaceInfo) => classRaceInfo.leg === leg - 1);
                      const prevResults = prevLegRaceInfo?.oklegMembers.filter(
                        (r) => r.Result.BibNumber === teamMemberResult.Result?.BibNumber,
                      );
                      let prevResult = prevResults?.find((r) =>
                        r.Result.FinishTime?.isSame(teamMemberResult.Result?.StartTime),
                      );
                      if (!prevResult) prevResult = prevResults?.find(() => true);
                      const prevOverallResult = prevResult ? prevResult.Result.OverallResult : null;
                      const prevStagePosition =
                        prevOverallResult && prevOverallResult.Position ? prevOverallResult.Position : null;
                      const prevStageTimeBehind =
                        prevOverallResult?.Time && prevLegRaceInfo?.overallWinnerTime
                          ? prevOverallResult.Time - prevLegRaceInfo.overallWinnerTime
                          : null;
                      deltaPositions =
                        totalStagePosition && prevStagePosition ? totalStagePosition - prevStagePosition : null;
                      deltaTimeBehind =
                        totalStageTimeBehind && prevStageTimeBehind
                          ? ConvertSecondsToTime(totalStageTimeBehind - prevStageTimeBehind)
                          : null;
                    }

                    const legSplitTimes = allLegsSplitTimes.find(
                      (lst) => lst.leg === teamMemberResult.Result?.Leg?.toString(),
                    );

                    const raceTeamResult: IRaceTeamResultProps = {
                      teamResultId: -1 - i * 20000 - j,
                      competitorId: competitor?.competitorId ?? -1,
                      className: shortClassName ?? '',
                      deviantEventClassificationId: null,
                      classClassificationId: GetClassClassificationId(
                        raceEvent?.eventClassificationId as EventClassificationIdTypes | undefined,
                        classLevel,
                        clubModel.raceClubs?.eventClassifications,
                      ),
                      difficulty: classLevel ? classLevel.difficulty : null,
                      teamName: teamMemberResult.TeamName,
                      lengthInMeter: legRaceInfo?.lengthInMeter,
                      failedReason: didNotStart
                        ? failedReasons.NotStarted
                        : !ok
                          ? failedReasons.NotFinished
                          : teamMemberResult.Result?.Time == null
                            ? failedReasons.Finished
                            : null,
                      teamFailedReason: teamDidNotStart
                        ? failedReasons.NotStarted
                        : !teamOk
                          ? failedReasons.NotFinished
                          : teamValid && (!teamPosition || !nofStartsInClass || !teamMemberResult.TeamTimeDiff)
                            ? failedReasons.Finished
                            : null,
                      competitorTime:
                        valid && teamMemberResult.Result?.Time
                          ? ConvertSecondsToTime(teamMemberResult.Result.Time)
                          : null,
                      winnerTime: legRaceInfo?.legWinnerTime ? ConvertSecondsToTime(legRaceInfo.legWinnerTime) : null,
                      secondTime: null, //TODO GetTimeWithHour(secondTime),
                      position: position,
                      nofStartsInClass: nofStartsInLeg,
                      stage: leg,
                      totalStages: numberOfLegs ?? 1,
                      deltaPositions: deltaPositions,
                      deltaTimeBehind: deltaTimeBehind,
                      totalStagePosition: totalStagePosition,
                      totalStageTimeBehind: totalStageTimeBehind ? ConvertSecondsToTime(totalStageTimeBehind) : null,
                      totalPosition: teamPosition,
                      totalNofStartsInClass: nofStartsInClass,
                      totalTimeBehind:
                        teamValid && teamMemberResult.TeamTimeDiff
                          ? ConvertSecondsToTime(teamMemberResult.TeamTimeDiff)
                          : null,
                      points1000: 0,
                      missingTime:
                        legSplitTimes && personId
                          ? GetMissingTime(
                              personId,
                              legSplitTimes.splitTimes,
                              legSplitTimes.bestSplitTimes,
                              legSplitTimes.secondBestSplitTimes,
                            )
                          : null,
                    };

                    raceEvent && raceEvent.teamResults?.push(raceTeamResult);
                  }
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
      },
      [],
    );

    useEffect(() => {
      const fetchData = async () => {
        const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
        if (!url || !clubModel.raceClubs || !clubModel.eventor) return;

        try {
          let editResultJson: IRaceEventProps | undefined;
          if (raceWizardModel.selectedEventId != null && raceWizardModel.selectedEventId > 0)
            editResultJson = await PostJsonData(
              url,
              { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
              true,
              sessionModel.authorizationHeader,
            );

          let entriesJson: IEventorEntries | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              entriesJson = await PostJsonData(
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
                      '&includeEntryFees=true',
                  ),
                },
                true,
              );
            } catch (e: any) {
              message.warning(`Failed to fetch entries ${clubModel.eventor.entriesUrl}`);
            }

          let classJson: IEventorEventClasses | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              classJson = await PostJsonData(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor.classesUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&includeEntryFees=true',
                  ),
                },
                false,
              );
            } catch (e: any) {
              message.warning(`Failed to fetch classes ${clubModel.eventor.classesUrl}`);
            }

          let iofResults: IResultListType | undefined;
          let iofResultsWithSplitTimes = false;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              const response = await PostJsonData(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor.iofResultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&includeSplitTimes=true&totalResult=false',
                  ),
                },
                false,
              );
              iofResults = correctPhpEventorProxyXmlResponseForResult(response);
              iofResultsWithSplitTimes = true;
            } catch (e: any) {
              message.warning(`Failed to fetch IOF results with splittimes ${clubModel.eventor.iofResultUrl}`);
            }

          let totalIofResults: IResultListType | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              const response = await PostJsonData(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor.iofResultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&includeSplitTimes=false&totalResult=true',
                  ),
                },
                false,
              );
              totalIofResults = correctPhpEventorProxyXmlResponseForResult(response);
            } catch (e: any) {
              message.warning(`Failed to fetch IOF total results ${clubModel.eventor.iofResultUrl}`);
            }

          let resultJson: IEventorResults | undefined;
          if (
            !iofResults &&
            iofResultsWithSplitTimes === false &&
            raceWizardModel.selectedEventorId != null &&
            raceWizardModel.selectedEventorId > 0
          )
            try {
              resultJson = await PostJsonData(
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
                      `&top=${
                        raceWizardModel.queryForCompetitorWithNoClub ? 2500 : raceWizardModel.selectedIsRelay ? 30 : 15
                      }&includeSplitTimes=true`,
                  ),
                },
                false,
              );
            } catch (e: any) {
              message.warning(`Failed to fetch results ${clubModel.eventor.resultUrl}`);
            }

          if (
            !iofResults &&
            iofResultsWithSplitTimes === false &&
            !resultJson &&
            raceWizardModel.selectedEventorId != null &&
            raceWizardModel.selectedEventorId > 0
          )
            try {
              const response = await PostJsonData(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor.iofResultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&includeSplitTimes=false&totalResult=false',
                  ),
                },
                false,
              );
              iofResults = correctPhpEventorProxyXmlResponseForResult(response);
            } catch (e: any) {
              message.warning(`Failed to fetch IOF results ${clubModel.eventor.iofResultUrl}`);
            }

          let lengthHtmlJson = '';
          if (resultJson && raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              lengthHtmlJson = await PostJsonData(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(
                    clubModel.eventor.lengthUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&groupBy=EventClass',
                  ),
                  noJsonConvert: true,
                },
                false,
              );
            } catch (e: any) {
              message.warning(`Failed to fetch cource length ${clubModel.eventor.lengthUrl}`);
            }

          let entryFeeJson: IEventorEntryFees | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              entryFeeJson = await PostJsonData(
                clubModel.eventorCorsProxy,
                {
                  csurl: encodeURIComponent(clubModel.eventor.entryFeeUrl + raceWizardModel.selectedEventorId),
                },
                true,
              );
            } catch (e: any) {
              message.warning(`Failed to fetch cource length ${clubModel.eventor.lengthUrl}`);
            }

          if (
            !resultJson &&
            !iofResults &&
            raceWizardModel.selectedEventorId != null &&
            raceWizardModel.selectedEventorId > 0
          ) {
            throw new Error('Failed to load results (both eventor and IOF).');
          }

          let eventIsRelay = false;
          if (resultJson) {
            eventIsRelay =
              editResultJson?.isRelay ||
              (resultJson != null &&
                resultJson.Event &&
                resultJson.Event['@attributes'] &&
                resultJson.Event['@attributes'].eventForm &&
                resultJson.Event['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0);

            await handleEventorResults(
              editResultJson,
              resultJson,
              totalIofResults,
              entriesJson,
              entryFeeJson,
              classJson,
              lengthHtmlJson,
              eventIsRelay,
            );
          } else if (iofResults) {
            eventIsRelay = editResultJson?.isRelay || !!iofResults.Event.Form?.some((f) => f === 'Relay');

            await handleIOFResults(
              editResultJson,
              iofResults!,
              totalIofResults,
              entriesJson,
              entryFeeJson,
              classJson,
              eventIsRelay,
            );
          } else {
            eventIsRelay = !!editResultJson?.isRelay;
            raceWizardModel.setRaceEvent(editResultJson ?? null);
          }

          if (raceWizardModel.overwrite && clubModel.raceClubs && raceWizardModel.raceEvent) {
            if (!eventIsRelay && clubModel.raceClubs.selectedClub) {
              CalculateCompetitorsFee(
                raceWizardModel.raceEvent,
                clubModel.raceClubs.selectedClub,
                clubModel.raceClubs.eventClassifications,
              );
              CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
              raceWizardModel.raceEvent.results.forEach((result) => {
                if (result.missingTime?.substr(-5) !== ManuallyEditedMissingTimePostfix) {
                  result.setStringValueOrNull('missingTime', result.missingTime);
                }
              });
            } else {
              raceWizardModel.raceEvent.teamResults.forEach((teamResult) => {
                if (teamResult.missingTime?.substr(-5) !== ManuallyEditedMissingTimePostfix) {
                  teamResult.setStringValueOrNull('missingTime', teamResult.missingTime);
                }
              });
            }
          }

          form?.validateFields().then();
          onValidate(!!raceWizardModel.raceEvent?.valid);
          setIsRelay(!!eventIsRelay);
          setLoaded(true);
        } catch (e: any) {
          if (e && e.message) {
            message.error(e.message);
          }
          onFailed && onFailed(e);
        }
      };

      if (!raceWizardModel.existInEventor) {
        raceWizardModel.setRaceEvent({
          eventId: -1,
          raceDate: dayjs().format('YYYY-MM-DD'),
          paymentModel: raceWizardModel.paymentModel,
          meetsAwardRequirements: true,
          sportCode: 'OL',
          isRelay: false,
          eventClassificationId: 'F',
          results: [],
          teamResults: [],
          invoiceVerified: false,
        });
        onValidate(!!raceWizardModel.raceEvent?.valid);
        setIsRelay(false);
        setLoaded(true);
        form?.validateFields().then();
        return;
      } else {
        fetchData();
      }
    }, []);

    const columns: ColumnType<IExtendedRaceResult>[] = [
      {
        title: t('results.Edit'),
        dataIndex: 'edit',
        key: 'edit',
        ellipsis: true,
        width: 70,
        fixed: 'left',
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
                    clubModel.raceClubs?.selectedClub?.competitorById(record.competitorId)?.fullName
                  }, ${record.className})`,
                  content:
                    raceWizardModel.raceEvent && clubModel.raceClubs ? (
                      <EditResultIndividual
                        clubModel={clubModel}
                        sessionModel={sessionModel}
                        raceWizardModel={raceWizardModel}
                        paymentModel={raceWizardModel.raceEvent.paymentModel as PaymentTypes}
                        meetsAwardRequirements={raceWizardModel.raceEvent.meetsAwardRequirements}
                        isSprint={raceWizardModel.raceEvent.raceDistance === distances.sprint}
                        raceDate={raceWizardModel.raceEvent.raceDate ?? ''}
                        eventClassificationId={
                          raceWizardModel.raceEvent.eventClassificationId as EventClassificationIdTypes
                        }
                        result={resultObject}
                        results={raceWizardModel.raceEvent.results}
                        autoUpdateResultWithSameClass={autoUpdateResultWithSameClass}
                        competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
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
                      (r) => r.resultId === resultObject.resultId,
                    );
                    if (mobxResult) {
                      mobxResult.setValues(resultObject);
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
        ellipsis: true,
        width: 200,
        fixed: 'left',
        render: (id) =>
          id == null ? <MissingTag t={t} /> : clubModel.raceClubs?.selectedClub?.competitorById(id)?.fullName,
      },
      {
        title: t('results.Class'),
        dataIndex: 'className',
        key: 'className',
        ellipsis: true,
        width: 70,
        fixed: 'left',
        render: (value) => (value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.ClassClassification'),
        dataIndex: 'classClassificationId',
        key: 'classClassificationId',
        ellipsis: true,
        width: 100,
        render: (id, record) => {
          if (id) {
            const classClassificationDescription = clubModel.raceClubs?.classClassification(
              record.deviantEventClassificationId
                ? (record.deviantEventClassificationId as EventClassificationIdTypes)
                : (raceWizardModel.raceEvent?.eventClassificationId as EventClassificationIdTypes),
              id,
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
        ellipsis: true,
        width: 80,
        render: (value) => (value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.LengthInMeter'),
        dataIndex: 'lengthInMeter',
        key: 'lengthInMeter',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.FailedReason'),
        dataIndex: 'failedReason',
        key: 'failedReason',
        ellipsis: true,
        width: 120,
        render: (reason) => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null),
      },
      {
        title: t('results.Time'),
        dataIndex: 'competitorTime',
        key: 'competitorTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value),
      },
      {
        title: t('results.WinnerTime'),
        dataIndex: 'winnerTime',
        key: 'winnerTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value),
      },
      {
        title: t('results.MissingTime'),
        dataIndex: 'missingTime',
        key: 'missingTime',
        ellipsis: true,
        width: 70,
        render: (value) =>
          value?.substr(-5) === ManuallyEditedMissingTimePostfix ? (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              {FormatTime(value)}
            </Tag>
          ) : (
            FormatTime(value)
          ),
      },
      {
        title: t('results.Position'),
        dataIndex: 'position',
        key: 'position',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.NofStartsInClass'),
        dataIndex: 'nofStartsInClass',
        key: 'nofStartsInClass',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.Award'),
        dataIndex: 'award',
        key: 'award',
        ellipsis: true,
        width: 70,
      },
      {
        title: t('results.EventFee'),
        dataIndex: 'fee',
        key: 'fee',
        ellipsis: true,
        width: 120,
        render: (value) => (value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.TotalFeeToClub'),
        dataIndex: 'totalFeeToClub',
        key: 'totalFeeToClub',
        ellipsis: true,
        width: 120,
        render: (_text, record) =>
          record.feeToClub == null ? <MissingTag t={t} /> : record.feeToClub + (record.serviceFeeToClub ?? 0),
      },
      {
        title: t('results.DeviantEventClassification'),
        dataIndex: 'deviantEventClassificationId',
        key: 'deviantEventClassificationId',
        ellipsis: true,
        width: 120,
      },
    ];

    const teamColumns: ColumnType<IExtendedRaceTeamResult>[] = [
      {
        title: t('results.Edit'),
        dataIndex: 'edit',
        key: 'edit',
        ellipsis: true,
        width: 70,
        fixed: 'left',
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
                    clubModel.raceClubs?.selectedClub?.competitorById(record.competitorId)?.fullName
                  }, ${record.className})`,
                  content:
                    raceWizardModel.raceEvent && clubModel.raceClubs ? (
                      <EditResultRelay
                        clubModel={clubModel}
                        sessionModel={sessionModel}
                        raceWizardModel={raceWizardModel}
                        eventClassificationId={
                          raceWizardModel.raceEvent.eventClassificationId as EventClassificationIdTypes
                        }
                        raceLightCondition={raceWizardModel.raceEvent.raceLightCondition ?? undefined}
                        result={resultObject}
                        results={raceWizardModel.raceEvent.teamResults}
                        autoUpdateResultWithSameClass={autoUpdateResultWithSameClass}
                        competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
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
                      (r) => r.teamResultId === resultObject.teamResultId,
                    );
                    if (mobxResult) mobxResult.setValues(resultObject);
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
        ellipsis: true,
        width: 200,
        fixed: 'left',
        render: (id) =>
          id == null ? <MissingTag t={t} /> : clubModel.raceClubs?.selectedClub?.competitorById(id)?.fullName,
      },
      {
        title: t('results.Class'),
        dataIndex: 'className',
        key: 'className',
        ellipsis: true,
        width: 70,
        fixed: 'left',
        render: (value) => (value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.ClassClassification'),
        dataIndex: 'classClassificationId',
        key: 'classClassificationId',
        ellipsis: true,
        width: 100,
        render: (id, record) => {
          if (id) {
            const classClassificationDescription = clubModel.raceClubs?.classClassification(
              record.deviantEventClassificationId
                ? (record.deviantEventClassificationId as EventClassificationIdTypes)
                : (raceWizardModel.raceEvent?.eventClassificationId as EventClassificationIdTypes),
              id,
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
        ellipsis: true,
        width: 80,
        render: (value) => (value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.LengthInMeter'),
        dataIndex: 'lengthInMeter',
        key: 'lengthInMeter',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.FailedReason'),
        dataIndex: 'failedReason',
        key: 'failedReason',
        ellipsis: true,
        width: 120,
        render: (reason) => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null),
      },
      {
        title: t('results.Time'),
        dataIndex: 'competitorTime',
        key: 'competitorTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value),
      },
      {
        title: t('results.WinnerTime'),
        dataIndex: 'winnerTime',
        key: 'winnerTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value),
      },
      {
        title: t('results.MissingTime'),
        dataIndex: 'missingTime',
        key: 'missingTime',
        ellipsis: true,
        width: 70,
        render: (value) =>
          value?.substr(-5) === ManuallyEditedMissingTimePostfix ? (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              {FormatTime(value)}
            </Tag>
          ) : (
            FormatTime(value)
          ),
      },
      {
        title: t('results.Position'),
        dataIndex: 'position',
        key: 'position',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.NofStartsInClass'),
        dataIndex: 'nofStartsInClass',
        key: 'nofStartsInClass',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.Stage'),
        dataIndex: 'stageText',
        key: 'stageText',
        ellipsis: true,
        width: 70,
        render: (value, record) => (record.stage == null || record.totalStages == null ? <MissingTag t={t} /> : value),
      },
      {
        title: t('results.DeltaPositions'),
        dataIndex: 'deltaPositions',
        key: 'deltaPositions',
        ellipsis: true,
        width: 100,
      },
      {
        title: t('results.DeltaTimeBehind'),
        dataIndex: 'deltaTimeBehind',
        key: 'deltaTimeBehind',
        ellipsis: true,
        width: 120,
        render: (value) => FormatTime(value),
      },
      {
        title: t('results.DeviantRaceLightCondition'),
        dataIndex: 'deviantRaceLightCondition',
        key: 'deviantRaceLightCondition',
        ellipsis: true,
        width: 120,
      },
      {
        title: t('results.DeviantEventClassification'),
        dataIndex: 'deviantEventClassificationId',
        key: 'deviantEventClassificationId',
        ellipsis: true,
        width: 120,
      },
    ];

    return raceWizardModel.raceEvent && clubModel.raceClubs && loaded && visible ? (
      <Form
        id={formId}
        form={form}
        layout="vertical"
        initialValues={{
          iName: raceWizardModel.raceEvent.name,
          iOrganiserName: raceWizardModel.raceEvent.organiserName,
          iRaceDate: !raceWizardModel.raceEvent.raceDate ? null : dayjs(raceWizardModel.raceEvent.raceDate, dateFormat),
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
          <Col span={2}>
            <FormItem name="iLongitude" label={t('map.ChooseMapPosition')}>
              <Tooltip
                title={
                  !raceWizardModel.raceEvent?.longitude || !raceWizardModel.raceEvent?.latitude ? (
                    t('error.MissingMapPosition')
                  ) : (
                    <div>
                      <p style={{ lineHeight: '12px' }}>{`${t('map.Longitude')}: ${
                        raceWizardModel.raceEvent?.longitude
                      }`}</p>
                      <p style={{ lineHeight: '12px' }}>{`${t('map.Latitude')}: ${
                        raceWizardModel.raceEvent?.latitude
                      }`}</p>
                    </div>
                  )
                }
              >
                <Button
                  danger={!raceWizardModel.raceEvent?.longitude || !raceWizardModel.raceEvent?.latitude}
                  icon={<GlobalOutlined />}
                  onClick={onChooseMapPosition}
                />
              </Tooltip>
            </FormItem>
          </Col>
          <Col span={5}>
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
                    clubModel.raceClubs!.classLevels,
                  );
                  CalculateAllAwards(clubModel.raceClubs!, raceWizardModel.raceEvent!);
                  onValidate(!!raceWizardModel.raceEvent?.valid);
                }}
              />
            </FormItem>
          </Col>
          <Col span={5}>
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
                    clubModel.raceClubs!.selectedClub!,
                    clubModel.raceClubs!.eventClassifications,
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
              ...toJS(result),
              key: result.teamResultId,
              isValid: result.valid,
              stageText: `${result.stage} ${t('common.Of')} ${result.totalStages}`,
            }))}
            pagination={{ pageSize: Math.trunc((height - 244) / 32), hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: true }}
            size="middle"
            tableLayout="fixed"
            rowClassName={(record: any) => (!record.isValid ? 'table-row-red' : '')}
          />
        ) : (
          <StyledTable
            columns={columns as ColumnType<any>[]}
            dataSource={raceWizardModel.raceEvent.results.map((result) => ({
              ...toJS(result),
              key: result.resultId,
              isValid: result.valid,
              isAwardTouched: result.isAwardTouched,
              fee: `${
                result.originalFee != null && result.lateFee != null ? result.originalFee + result.lateFee : null
              }`,
            }))}
            pagination={{ pageSize: Math.trunc((height - 244) / 32), hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: true }}
            size="middle"
            tableLayout="fixed"
            rowClassName={(record: any) => (!record.isValid ? 'table-row-red' : '')}
          />
        )}
      </Form>
    ) : visible ? (
      <SpinnerDiv>
        <Spin size="large" />
      </SpinnerDiv>
    ) : null;
  },
);

export default ResultWizardStep2EditRace;
