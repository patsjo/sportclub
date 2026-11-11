import {
  ExclamationCircleOutlined,
  GlobalOutlined,
  ImportOutlined,
  LeftOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  ModalFuncProps,
  Popconfirm,
  Row,
  Select,
  Spin,
  Switch,
  TableProps,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import useResizeObserver from '@react-hook/resize-observer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IRace,
  IResultListType,
  ITeamMemberRaceResult,
  ITeamMemberResult,
  ResultStatus
} from '../../models/iof.xsd-3.0';
import {
  IRaceCompetitor,
  IRaceEventBasic,
  IRaceEventProps,
  IRaceResultMultiDayProps,
  IRaceResultProps,
  IRaceTeamResultProps
} from '../../models/resultModel';
import { IWinnerResultProps } from '../../models/resultWizardModel';
import { IFetchProgress, PostJsonData, PostJsonDataWithProgress } from '../../utils/api';
import { dateFormat, errorRequiredField, shortTimeFormat } from '../../utils/formHelper';
import { correctPhpEventorProxyXmlResponseForResult } from '../../utils/iofXsd30ResponseHelper';
import {
  ApplyLiveloxLengths,
  ChooseLiveloxEvent,
  EventorEventUrl,
  FetchLiveloxEvent,
  FetchLiveloxEventIds,
  FindLiveloxEvent,
  GetLiveloxClassesByName,
  ILiveloxClass,
  ILiveloxEvent,
  LiveloxEventIdFromLink,
  LiveloxEventUrl,
  LiveloxProxyUrl,
  LiveloxSearchTexts,
  LiveloxSearchUrl
} from '../../utils/liveloxHelper';
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
  IEventorTeamResult
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
  raceLightConditionOptions
} from '../../utils/resultConstants';
import { AutoCompleteRaceEvent, IAutoCompleteSummary, MissingTotalLengths } from '../../utils/resultAutoComplete';
import {
  CalculateAllAwards,
  CalculateAllClassClassificationId,
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
  GetCourseLengths,
  GetMissingTime,
  GetRelaySplitTimes,
  GetSecondsWithFractionsPerKiloMeter,
  GetSplitTimes,
  GetTimeWithHour,
  ResetClassClassifications,
  TimeDiff,
  WinnerTime
} from '../../utils/resultHelper';
import {
  CalculateTotalAfterStage,
  FetchTotalResultsPage,
  FetchWinSplitsResults,
  FindCompetitorByName,
  FindLinkedCompetitorId,
  FindTotalClass,
  FindTotalPerson,
  IsClubOrganisation,
  ITotalResultList,
  LinkResultName,
  ResultNameKey,
  SplitClubNames,
  StageFromName,
  TotalLengthInMeter,
  TotalResultsFromStages
} from '../../utils/resultSources';
import { IEventViewResultResponse } from '../../utils/responseInterfaces';
import { useResultWizardStore } from '../../utils/resultWizardStore';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';
import InputTime from '../formItems/InputTime';
import { GetPositionModal } from '../map/GetPositionModal';
import { MissingTag, NoWrap, SpinnerDiv, StyledIcon, StyledTable } from '../styled/styled';
import { AddMapCompetitorConfirmModal, CompetitorInputAborted } from './AddMapCompetitorConfirmModal';
import ImportExternalResults, { LoadExternalResults } from './ImportExternalResults';
import StageResultsInput, { IStageResults } from './StageResultsInput';
import {
  ExpandableDetails,
  ILoadWarning,
  LoadProgress,
  loadWarningShort,
  LoadWarningList,
  toLoadWarning,
  useLoadProgress
} from './LoadProgress';
import EditResultIndividual, { IExtendedRaceResult } from './EditResultIndividual';
import EditResultRelay, { IExtendedRaceTeamResult } from './EditResultRelay';

// The host closes a request after about 100 seconds. The proxy goes on with the work, and the next
// attempt waits for it, so a large result list (e.g. O-Ringen) needs a few attempts.
const STREAM_ATTEMPTS = 8;
// Above this many starters the whole result list with split times is not fetched, the results of the club
// and the top results (with split times) are fetched instead
const MAX_STARTERS_FOR_IOF_SPLITS = 5000;

interface IResultWizardStep2EditRaceProps {
  height: number;
  visible: boolean;
  autoUpdateResultWithSameClass: boolean;
  onValidate: (valid: boolean) => void;
  onFailed: (e: unknown) => void;
  /** True when the race is loaded without errors, the buttons for editing are hidden until then */
  onReadyChange?: (ready: boolean) => void;
}
const ResultWizardStep2EditRace = observer(
  ({
    height,
    visible,
    autoUpdateResultWithSameClass,
    onValidate,
    onFailed,
    onReadyChange
  }: IResultWizardStep2EditRaceProps) => {
    const { t } = useTranslation();
    const { globalStateModel, clubModel, sessionModel } = useMobxStore();
    const { raceWizardModel } = useResultWizardStore();
    const [form] = Form.useForm<IRaceEventProps>();
    const formId = useMemo(() => 'resultsWizardFormStep2EditRace' + Math.floor(Math.random() * 1000000000000000), []);
    const [loaded, setLoaded] = useState(false);
    // Shown in the step instead of a flash message, with the choice to go back or load again
    const [loadError, setLoadError] = useState<string>();
    const [loadWarnings, setLoadWarnings] = useState<ILoadWarning[]>([]);
    // What the auto completion of the saved race filled in
    const [autoCompleteInfo, setAutoCompleteInfo] = useState<string>();
    const [reloadCount, setReloadCount] = useState(0);
    // What the load is doing, and how far it has come
    const { tasks: loadTasks, startedAt: loadStartedAt, api: progress } = useLoadProgress();
    // The number of starters in the whole event, from the classes in Eventor. A large event (e.g. O-Ringen)
    // takes long, then the steps show how far they have come.
    const nofStarters = useRef(0);
    const nofClasses = useRef(0);
    // The starters before each class of a result list, counted once per list
    const startersBeforeClass = useRef(new WeakMap<object, number[]>());
    // The classes and starters calculated, told when the calculation is done
    const calculated = useRef({ classes: 0, starters: 0, relay: false });
    /** How far the processing of the results has come, by classes and starters, and time for the browser to show it */
    const reportClassProgress = useCallback(
      async (
        classResults: ReadonlyArray<{ PersonResult?: unknown; TeamResult?: unknown }>,
        index: number,
        relay = false
      ) => {
        let before = startersBeforeClass.current.get(classResults);
        if (!before) {
          const count = (value: unknown) => (value == null ? 0 : Array.isArray(value) ? value.length : 1);
          before = [0];
          for (const classResult of classResults)
            before.push(before[before.length - 1] + count(classResult.PersonResult) + count(classResult.TeamResult));
          startersBeforeClass.current.set(classResults, before);
        }
        const total = before[classResults.length];
        calculated.current = { classes: index + 1, starters: before[index + 1], relay };
        progress.progress(
          'calculate',
          before[index],
          total,
          t(relay ? 'results.LoadClassProgressRelay' : 'results.LoadClassProgress', {
            index: index + 1,
            classes: classResults.length,
            done: before[index].toLocaleString('sv-SE'),
            total: total.toLocaleString('sv-SE')
          }),
          'percent'
        );
        if (index % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      },
      [progress, t]
    );
    const ready = loaded && !loadError;
    useEffect(() => {
      onReadyChange?.(ready);
    }, [onReadyChange, ready]);
    useEffect(() => () => onReadyChange?.(false), [onReadyChange]);
    const [isRelay, setIsRelay] = useState(raceWizardModel.selectedIsRelay);
    const [modal, contextHolder] = Modal.useModal();
    // The classes of Eventor, to find the classes in Livelox by their id
    const eventClassesRef = useRef<IEventorEventClass[]>([]);
    // The number of the race in the event (1 for a race of one day), to find the race in Livelox
    const raceNumberRef = useRef<number | undefined>(undefined);
    // The runners of another source than Eventor that the user skipped, not asked for again at the next import
    const skippedResultNames = useRef(new Set<string>());
    // The rows of the table are as many as fit below what is above it (the import, the race, Livelox), whose height
    // changes with what is shown. The height of the header and of a row are measured, the pager has its place.
    // The elements themselves, not refs: they are shown only when the race is loaded, and observed from then on
    const [aboveTableElement, setAboveTableElement] = useState<HTMLDivElement | null>(null);
    const [tableElement, setTableElement] = useState<HTMLDivElement | null>(null);
    const [aboveTableHeight, setAboveTableHeight] = useState(0);
    useResizeObserver(aboveTableElement, entry => setAboveTableHeight((entry.target as HTMLElement).offsetHeight));
    const [tableMetrics, setTableMetrics] = useState({ header: 47, row: 40 });
    // Measured whenever the table changes its size, e.g. when its rows are shown or changed
    const measureTable = useCallback((entry: ResizeObserverEntry) => {
      const table = entry.target as HTMLElement;
      const header = table.querySelector('thead')?.getBoundingClientRect().height;
      const rows = Array.from(table.querySelectorAll('tbody tr.ant-table-row')).map(
        row => row.getBoundingClientRect().height
      );
      // The highest row, a row of more lines must not push the pager out of sight
      const row = rows.length ? Math.max(...rows) : undefined;
      if (!header || !row) return;
      setTableMetrics(metrics =>
        Math.abs(header - metrics.header) > 0.5 || Math.abs(row - metrics.row) > 0.5 ? { header, row } : metrics
      );
    }, []);
    useResizeObserver(tableElement, measureTable);
    const tablePagerHeight = 64;
    const tablePageSize = Math.max(
      1,
      Math.floor((height - aboveTableHeight - tableMetrics.header - tablePagerHeight) / tableMetrics.row)
    );
    // The course lengths of every class and relay leg in Livelox, and how many results got their length from it
    const [livelox, setLivelox] = useState<{
      event: ILiveloxEvent;
      classes: Map<string, ILiveloxClass>;
      updated: number;
    }>();
    // A relay, or results without a course length, Livelox may have the lengths
    const [liveloxNeeded, setLiveloxNeeded] = useState(false);
    const [liveloxLink, setLiveloxLink] = useState('');
    const [liveloxLoading, setLiveloxLoading] = useState(false);
    const [liveloxError, setLiveloxError] = useState<string>();

    /** Fees, awards and class classifications of the imported results */
    const calculateFeesAndAwards = useCallback(
      (eventIsRelay: boolean) => {
        if (!raceWizardModel.overwrite || !clubModel.raceClubs || !raceWizardModel.raceEvent) return;
        if (!eventIsRelay && clubModel.raceClubs.selectedClub) {
          CalculateCompetitorsFee(
            raceWizardModel.raceEvent,
            clubModel.raceClubs.selectedClub,
            clubModel.raceClubs.eventClassifications
          );
          CalculateAllAwards(clubModel.raceClubs, raceWizardModel.raceEvent);
          CalculateAllClassClassificationId(clubModel.raceClubs, raceWizardModel.raceEvent);
          raceWizardModel.raceEvent.results.forEach(result => {
            if (result.missingTime?.substr(-5) !== ManuallyEditedMissingTimePostfix) {
              result.setStringValueOrNull('missingTime', result.missingTime);
            }
          });
        } else {
          raceWizardModel.raceEvent.teamResults.forEach(teamResult => {
            if (teamResult.missingTime?.substr(-5) !== ManuallyEditedMissingTimePostfix) {
              teamResult.setStringValueOrNull('missingTime', teamResult.missingTime);
            }
          });
        }
      },
      [clubModel.raceClubs, raceWizardModel]
    );

    /** The course lengths of Livelox in the results, returns the number of results that got a length */
    const applyLiveloxLengths = useCallback(
      (classes: Map<string, ILiveloxClass>, relay: boolean, onlyMissing = false) =>
        raceWizardModel.raceEvent
          ? ApplyLiveloxLengths(
              classes,
              relay,
              raceWizardModel.raceEvent.results,
              raceWizardModel.raceEvent.teamResults,
              raceWizardModel.raceWinnerResults,
              onlyMissing
            )
          : 0,
      [raceWizardModel]
    );

    /** The link to Livelox pasted by the user, when it could not be read from the race in Eventor */
    const loadLivelox = useCallback(
      async (link: string) => {
        setLiveloxError(undefined);
        const liveloxEventId = LiveloxEventIdFromLink(link);
        const liveloxProxy = LiveloxProxyUrl(clubModel.eventorCorsProxy);
        if (!liveloxEventId) {
          setLiveloxError(t('results.LiveloxInvalidLink'));
          return;
        }
        if (!liveloxProxy) return;
        setLiveloxLoading(true);
        try {
          const event = await FetchLiveloxEvent(liveloxProxy, liveloxEventId);
          const classes = GetLiveloxClassesByName(event, eventClassesRef.current);
          const updated = applyLiveloxLengths(classes, isRelay);
          setLivelox({ event, classes, updated });
          setLoadWarnings(warnings =>
            warnings.map(warning =>
              warning.key === 'livelox'
                ? { ...warning, resolvedBy: t('results.LiveloxResolvedByLink', { name: event.name }) }
                : warning
            )
          );
          onValidate(!!raceWizardModel.raceEvent?.valid);
        } catch (error) {
          setLiveloxError(
            `${t('results.LiveloxLoadFailed')}: ${error instanceof Error ? error.message : String(error)}`
          );
        } finally {
          setLiveloxLoading(false);
        }
      },
      [applyLiveloxLengths, clubModel.eventorCorsProxy, isRelay, onValidate, raceWizardModel, t]
    );

    const onChooseMapPosition = useCallback(() => {
      const longitude = raceWizardModel.raceEvent?.longitude;
      const latitude = raceWizardModel.raceEvent?.latitude;
      const clubLongitude = clubModel.map?.center ? clubModel.map?.center[0] : undefined;
      const clubLatitude = clubModel.map?.center ? clubModel.map?.center[1] : undefined;
      const exists = !!longitude && !!latitude;
      if (exists || (clubLongitude && clubLatitude))
        GetPositionModal(
          t,
          modal,
          exists ? longitude : clubLongitude!,
          exists ? latitude : clubLatitude!,
          exists,
          globalStateModel,
          sessionModel,
          clubModel
        ).then(selectedPosition => {
          if (selectedPosition) {
            raceWizardModel.raceEvent?.setNumberValueOrNull('longitude', selectedPosition.longitude);
            raceWizardModel.raceEvent?.setNumberValueOrNull('latitude', selectedPosition.latitude);
          }
        });
    }, [clubModel, globalStateModel, raceWizardModel.raceEvent, sessionModel, t, modal]);

    const handleEventorResults = useCallback(
      async (
        editResultJson: IRaceEventProps | undefined,
        resultJson: IEventorResults | undefined,
        totalIofResults: IResultListType | undefined,
        entriesJson: IEventorEntries | undefined,
        entryFeeJson: IEventorEntryFees | undefined,
        classJson: IEventorEventClasses | undefined,
        courseLengths: Map<string, number>,
        eventIsRelay: boolean
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

        // Auto completion reads the result list as an import does, the saved race is completed by it afterwards
        const importing = raceWizardModel.overwrite || raceWizardModel.autoComplete;
        let raceEvent: IRaceEventProps | undefined = !importing ? editResultJson : undefined;
        let eventRace: IEventorEventRace | undefined;
        if (resultJson != null) {
          if (Array.isArray(resultJson.Event.EventRace)) {
            const raceIndex = resultJson.Event.EventRace.findIndex(
              eventRace => eventRace.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
            );
            eventRace = raceIndex >= 0 ? resultJson.Event.EventRace[raceIndex] : undefined;
            raceNumberRef.current = raceIndex >= 0 ? raceIndex + 1 : undefined;
            resultJson.Event.Name = resultJson.Event.Name + ', ' + eventRace?.Name;
          } else {
            eventRace = resultJson.Event.EventRace;
            raceNumberRef.current = 1;
          }
          if (eventRace) {
            const raceLightCondition = eventRace['@attributes']?.raceLightCondition;
            raceEvent = {
              eventId: raceWizardModel.selectedEventId ?? -1,
              eventorId: raceWizardModel.selectedEventorId,
              eventorRaceId: raceWizardModel.selectedEventorRaceId,
              name: resultJson.Event.Name,
              organiserName: Array.isArray(resultJson.Event.Organiser?.Organisation)
                ? resultJson.Event.Organiser?.Organisation.map(org => org.Name)
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
              raceLightCondition: raceLightConditionOptions(t).some(option => option.code === raceLightCondition)
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
              invoiceVerified: false
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
              await reportClassProgress(classResults, i);
              let currentClass: IEventorEventClass | undefined;
              if (eventClasses != null) {
                currentClass = eventClasses.find(
                  evtClass => evtClass.EventClassId === classResult.EventClass.EventClassId
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
                  PunchingUnitType: classResult.EventClass.PunchingUnitType
                };
              }

              if (Array.isArray(currentClass.ClassRaceInfo)) {
                currentClass.ClassRaceInfo = currentClass.ClassRaceInfo.find(
                  raceInfo => raceInfo.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                )!;
              }
              nofStartsInClass = parseInt(currentClass.ClassRaceInfo['@attributes'].noOfStarts);

              if (classResult.PersonResult != null) {
                const personResults: IEventorPersonResult[] = Array.isArray(classResult.PersonResult)
                  ? classResult.PersonResult.filter(
                      personResult =>
                        personResult.RaceResult == null ||
                        personResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                    )
                  : classResult.PersonResult.RaceResult == null ||
                      classResult.PersonResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.PersonResult]
                    : [];

                personResults.forEach(personResult => {
                  if (personResult.Result == null && personResult.RaceResult?.Result != null) {
                    personResult.Result = personResult.RaceResult.Result;
                  }
                });
                const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetSplitTimes(personResults);
                const shortClassName = GetClassShortName(currentClass?.ClassShortName);
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);
                const lengthInMeter = currentClass
                  ? (courseLengths.get(currentClass.EventClassId) ?? courseLengths.get(currentClass.Name) ?? null)
                  : null;
                const winnerResult = personResults.find(personResult => personResult.Result?.ResultPosition === '1');

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
                      : undefined
                  });
                }

                if (importing) {
                  const clubPersonResults = personResults.filter(
                    personResult =>
                      (raceWizardModel.queryForCompetitorWithNoClub && !personResult.Organisation?.OrganisationId) ||
                      personResult.Organisation?.OrganisationId === clubModel.eventor?.organisationId.toString() ||
                      (personResult.Organisation?.OrganisationId ===
                        clubModel.eventor?.districtOrganisationId.toString() &&
                        clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                          parseInt(personResult.Person.PersonId)
                        ) != null)
                  );

                  for (let j = 0; j < clubPersonResults.length; j++) {
                    const personResult = clubPersonResults[j];
                    let competitor: IRaceCompetitor | undefined;
                    if (typeof personResult.Person.PersonId === 'string' && personResult.Person.PersonId.length > 0) {
                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                          parseInt(personResult.Person.PersonId)
                        );
                      }

                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                          c =>
                            c.firstName === personResult.Person.PersonName.Given &&
                            c.lastName === personResult.Person.PersonName.Family &&
                            c.birthDay === personResult.Person.BirthDate?.Date
                        );
                        if (competitor) {
                          await competitor.addEventorId(
                            clubModel.modules.find(module => module.name === 'Results')!.addUrl!,
                            personResult.Person.PersonId,
                            sessionModel.authorizationHeader
                          );
                        }
                      }
                    }
                    if (!competitor && clubModel.raceClubs?.selectedClub && !raceWizardModel.autoComplete) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        modal,
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
                              : personResult.Person.PersonId
                        },
                        currentClass?.ClassShortName ?? '',
                        clubModel,
                        sessionModel
                      );
                    }

                    if (competitor) {
                      const entry: IEventorEntry | undefined = personResult.Person.PersonId
                        ? entriesJson.Entry.find(
                            entry =>
                              entry.Competitor?.PersonId === personResult.Person.PersonId ||
                              entry.Competitor?.Person?.PersonId === personResult.Person.PersonId
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
                      const entryFeeIds = entryFees.map(f => f.EntryFeeId);
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
                        personResults.some(pr => pr.Result?.ResultPosition === '2')
                          ? personResults.find(pr => pr.Result?.ResultPosition === '2')?.Result?.Time
                          : null;
                      const fees = GetFees(entryFeeJson.EntryFee, entryFeeIds, competitor.birthDay);

                      let resultMultiDay: IRaceResultMultiDayProps | undefined;
                      if (totalIofResults && totalIofResults.ClassResult) {
                        const totalEventRace = totalIofResults.Event.Race?.find(
                          eventRace => eventRace.Extensions.EventRaceId == raceWizardModel.selectedEventorRaceId
                        );
                        const totalClassPersonResults = totalIofResults.ClassResult.find(
                          cr => cr.Class.Id === currentClass?.EventClassId
                        )?.PersonResult?.map(pr => ({
                          ...pr,
                          Result: pr.Result?.find(r => r['@attributes'].raceNumber === totalEventRace?.RaceNumber)
                        }));
                        const totalPersonResult = totalClassPersonResults?.find(
                          pr =>
                            pr.Person.Id?.some(id => id === personResult.Person.PersonId) &&
                            pr.Result?.BibNumber === personResult.Result?.BibNumber &&
                            pr.Result?.Status !== 'NotCompeting'
                        )?.Result;

                        if (totalPersonResult) {
                          const totalDidNotStart = totalPersonResult.Status === 'DidNotStart';
                          const totalMisPunch = totalPersonResult.Status === 'MissingPunch';
                          const totalOk = totalPersonResult.Status === 'OK';
                          const totalValid = totalOk && !totalDidNotStart && !totalMisPunch;

                          // The total course length is added afterwards, by the saved earlier stages
                          resultMultiDay = {
                            multiDayResultId: -1 - 10000 * i - j,
                            stage: totalEventRace?.RaceNumber ?? 1,
                            totalStages: totalIofResults.Event.Race?.length ?? 1,
                            totalFailedReason: totalDidNotStart
                              ? failedReasons.NotStarted
                              : !totalOk
                                ? failedReasons.NotFinished
                                : !totalPersonResult.Time
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
                            totalSecondTime: null
                          };
                        }
                      }

                      const raceResult: IRaceResultProps = {
                        resultId: -1 - 10000 * i - j,
                        competitorId: competitor.competitorId,
                        resultMultiDay: resultMultiDay ?? null,
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
                            : !personResult.Result?.Time
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
                        )
                      };
                      raceEvent?.results?.push(raceResult);
                    }
                  }
                }
              }
            }
          } else if (eventIsRelay && importing) {
            for (let i = 0; i < classResults.length; i++) {
              const classResult = classResults[i];
              await reportClassProgress(classResults, i, true);
              let currentClass: IEventorEventClass | undefined;
              let nofStartsInClass: number | null = null;
              let numberOfLegs: number | null = null;
              let shortClassName: string | null = null;
              let classRaceInfos: { ClassRaceInfoId: string; leg: number; numberOfStarts: number }[] = [];

              if (eventClasses != null) {
                currentClass = eventClasses.find(
                  evtClass => evtClass.EventClassId === classResult.EventClass.EventClassId
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
                  PunchingUnitType: classResult.EventClass.PunchingUnitType
                };
              }
              currentClass.ClassRaceInfo = Array.isArray(currentClass.ClassRaceInfo)
                ? currentClass.ClassRaceInfo
                : [currentClass.ClassRaceInfo];
              classRaceInfos = currentClass.ClassRaceInfo.map(classRaceInfo => ({
                ClassRaceInfoId: classRaceInfo.ClassRaceInfoId,
                leg: parseInt(classRaceInfo['@attributes'].relayLeg!),
                numberOfStarts: parseInt(classRaceInfo['@attributes'].noOfStarts)
              }));
              const leg1ClassRaceInfo = classRaceInfos.find(c => c.leg === 1);
              nofStartsInClass = leg1ClassRaceInfo ? leg1ClassRaceInfo.numberOfStarts : null;
              numberOfLegs = parseInt(currentClass['@attributes'].numberOfLegs);
              shortClassName = GetClassShortName(currentClass.ClassShortName);

              if (classResult.TeamResult != null) {
                const preTeamResults = Array.isArray(classResult.TeamResult)
                  ? classResult.TeamResult.filter(
                      teamResult =>
                        teamResult.RaceResult == null ||
                        teamResult.RaceResult.EventRaceId === raceWizardModel.selectedEventorRaceId?.toString()
                    )
                  : classResult.TeamResult.RaceResult == null ||
                      classResult.TeamResult.RaceResult.EventRaceId ===
                        raceWizardModel.selectedEventorRaceId?.toString()
                    ? [classResult.TeamResult]
                    : [];
                const teamResults: IEventorTeamResult[] = preTeamResults.map(pre =>
                  pre.RaceResult?.TeamMemberResult != null ? pre.RaceResult : (pre as IEventorTeamResult)
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
                teamResults.forEach(teamResult => {
                  const teamMemberResults: IEventorTeamMemberResult[] = Array.isArray(teamResult.TeamMemberResult!)
                    ? teamResult.TeamMemberResult!
                    : [teamResult.TeamMemberResult!];
                  const teamOrganisations: IEventorOrganisation[] = Array.isArray(teamResult.Organisation!)
                    ? teamResult.Organisation!.filter(org => !!org)
                    : [teamResult.Organisation!].filter(org => !!org);

                  const hasClubMembers = teamOrganisations.some(
                    org => org.OrganisationId === clubModel.eventor?.organisationId.toString()
                  );
                  const hasDistrictMembers = teamOrganisations.some(
                    org => org.OrganisationId === clubModel.eventor?.districtOrganisationId.toString()
                  );

                  teamMemberResults.forEach(teamMemberResult => {
                    const competitor =
                      (hasClubMembers || hasDistrictMembers) &&
                      typeof teamMemberResult.Person.PersonId === 'string' &&
                      teamMemberResult.Person.PersonId.length > 0
                        ? clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                            parseInt(teamMemberResult.Person.PersonId)
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
                        BibNumber: teamResult.BibNumber ?? `${shortClassName}-${teamResult.TeamName}`
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
                        c =>
                          c.firstName === teamMemberResult.Person.PersonName.Given &&
                          c.lastName === teamMemberResult.Person.PersonName.Family &&
                          c.birthDay === teamMemberResult.Person.BirthDate?.Date
                      );
                      if (competitor) {
                        await competitor.addEventorId(
                          clubModel.modules.find(module => module.name === 'Results')!.addUrl!,
                          teamMemberResult.Person.PersonId,
                          sessionModel.authorizationHeader
                        );
                      }
                    }
                  }
                  if (!competitor && clubModel.raceClubs?.selectedClub && !raceWizardModel.autoComplete) {
                    competitor = await AddMapCompetitorConfirmModal(
                      t,
                      modal,
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
                            : teamMemberResult.Person.PersonId
                      },
                      currentClass?.ClassShortName ?? '',
                      clubModel,
                      sessionModel
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
                    const legRaceInfo = classRaceInfos.find(classRaceInfo => classRaceInfo.leg === leg);
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
                        .filter(teamResult => teamResult.BibNumber === teamMemberResult.BibNumber)
                        .map(teamResult => {
                          const teamMemberResults: IEventorTeamMemberResult[] = Array.isArray(
                            teamResult.TeamMemberResult!
                          )
                            ? teamResult.TeamMemberResult!
                            : [teamResult.TeamMemberResult!];
                          return teamMemberResults;
                        })
                        .find(() => true)
                        ?.find(tmr => tmr.Leg === prevLeg);
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

                    const legSplitTimes = allLegsSplitTimes.find(lst => lst.leg === teamMemberResult.Leg);
                    const raceTeamResult: IRaceTeamResultProps = {
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
                        : null
                    };

                    raceEvent?.teamResults?.push(raceTeamResult);
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
        // The race read from the result list, to complete the saved race by
        return importing ? raceEvent : undefined;
      },
      [clubModel, raceWizardModel, sessionModel, t, modal, reportClassProgress]
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
        /** A source other than Eventor (e.g. WinSplits): one race, the club and its runners are found by name */
        externalSource?: { clubNames: string[]; raceNumber?: number }
      ) => {
        const isClubOrganisation = (organisation?: { Id?: string; Name?: string } | null) =>
          externalSource
            ? IsClubOrganisation(organisation?.Name, externalSource.clubNames)
            : organisation?.Id == clubModel.eventor?.organisationId;
        // A runner of another source than Eventor is found by name, or by a name the user linked to a runner before
        const findExternalCompetitor = (given?: string, family?: string): IRaceCompetitor | undefined => {
          const selectedClub = clubModel.raceClubs?.selectedClub;
          const byName = FindCompetitorByName(selectedClub?.competitors, given, family);
          if (byName || !selectedClub) return byName;
          const linkedId = FindLinkedCompetitorId(selectedClub.clubId, given, family);
          return linkedId != null ? selectedClub.competitorById(linkedId) : undefined;
        };
        // The runner the user linked (or skipped) in the dialog is not asked for again
        const rememberExternalCompetitor = (
          given: string | undefined,
          family: string | undefined,
          competitor: IRaceCompetitor | undefined
        ) => {
          const selectedClub = clubModel.raceClubs?.selectedClub;
          if (competitor && selectedClub) LinkResultName(selectedClub.clubId, given, family, competitor.competitorId);
          else if (!competitor) skippedResultNames.current.add(ResultNameKey(given, family));
        };
        const isSkippedExternal = (given?: string, family?: string) =>
          !!externalSource && skippedResultNames.current.has(ResultNameKey(given, family));
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

        // Auto completion reads the result list as an import does, the saved race is completed by it afterwards
        const importing = raceWizardModel.overwrite || raceWizardModel.autoComplete;
        let raceEvent: IRaceEventProps | undefined = !importing ? editResultJson : undefined;
        let eventRace: IRace | undefined;
        if (iofResults != null) {
          eventRace = externalSource
            ? (iofResults.Event.Race?.find(race => race.RaceNumber === externalSource.raceNumber) ??
              iofResults.Event.Race?.[0])
            : iofResults.Event.Race?.find(
                eventRace => eventRace.Extensions.EventRaceId == raceWizardModel.selectedEventorRaceId
              );
          raceNumberRef.current = eventRace?.RaceNumber;
          if (eventRace?.Name && iofResults.Event.Race && iofResults.Event.Race.length > 1)
            iofResults.Event.Name = iofResults.Event.Name + ', ' + eventRace?.Name;

          if (eventRace) {
            const raceLightCondition = eventRace.Extensions?.LightCondition;
            raceEvent = {
              eventId: raceWizardModel.selectedEventId ?? -1,
              eventorId: raceWizardModel.selectedEventorId,
              eventorRaceId: raceWizardModel.selectedEventorRaceId,
              name: iofResults.Event.Name,
              organiserName: iofResults.Event.Organiser
                ? iofResults.Event.Organiser.map(org => org.Name)
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
              raceLightCondition: raceLightConditionOptions(t).find(option => option.code === raceLightCondition)
                ?.code as LightConditionTypes | undefined,
              raceDistance: raceDistanceOptions(t).find(
                option =>
                  (option.code as string).toLowerCase() === eventRace?.Discipline?.find(() => true)?.toLowerCase()
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
              invoiceVerified: false
            };
          }
        }

        if (iofResults != null && iofResults.ClassResult != null) {
          const raceWinnerResults: IWinnerResultProps[] = [];
          const classResults = iofResults.ClassResult;
          if (!eventIsRelay) {
            for (let i = 0; i < classResults.length; i++) {
              const classResult = classResults[i];
              await reportClassProgress(classResults, i);
              let currentClass:
                | {
                    ClassShortName: string;
                    Name: string;
                    ClassEntryFee?: IEventorEntryClassFee[] | IEventorEntryClassFee;
                  }
                | undefined;
              if (eventClasses != null) {
                currentClass = eventClasses.find(evtClass => evtClass.EventClassId === classResult.Class.Id);
              }
              if (!currentClass) {
                currentClass = {
                  ClassShortName: classResult.Class.ShortName ?? classResult.Class.Name,
                  Name: classResult.Class.Name
                };
              }

              if (classResult.PersonResult != null && classResult.PersonResult.length > 0) {
                const personResults = classResult.PersonResult.filter(personResult =>
                  personResult.Result?.some(r => r['@attributes'].raceNumber === eventRace?.RaceNumber)
                ).map(personResult => ({
                  ...personResult,
                  Result: personResult.Result?.find(() => true)
                }));

                const nofStartsInClass =
                  personResults?.filter(
                    pr =>
                      pr.Result &&
                      pr.Result.Status !== 'DidNotEnter' &&
                      pr.Result.Status !== 'DidNotStart' &&
                      pr.Result.Status !== 'Moved' &&
                      pr.Result.Status !== 'MovedUp' &&
                      pr.Result.Status !== 'NotCompeting'
                  )?.length ?? 0;

                const { splitTimes, bestSplitTimes, secondBestSplitTimes } = GetIOFSplitTimes(personResults);
                const shortClassName = GetClassShortName(currentClass?.ClassShortName);
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);
                const lengthInMeter =
                  classResult.Course?.find(c => c['@attributes'].raceNumber === eventRace?.RaceNumber)?.Length ??
                  personResults.find(() => true)?.Result?.Course?.Length;
                const winnerResult = personResults.find(personResult => personResult.Result?.Position === 1);
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
                      : undefined
                  });
                }

                if (importing) {
                  const clubPersonResults = personResults.filter(
                    personResult =>
                      (raceWizardModel.queryForCompetitorWithNoClub && !personResult.Organisation?.Id) ||
                      isClubOrganisation(personResult?.Organisation) ||
                      (!externalSource &&
                        personResult.Organisation?.Id == clubModel.eventor?.districtOrganisationId &&
                        clubModel.raceClubs?.selectedClub?.competitorByEventorId(
                          parseInt(personResult.Person.Id?.find(() => true) as string)
                        ) != null)
                  );

                  for (let j = 0; j < clubPersonResults.length; j++) {
                    const personResult = clubPersonResults[j];
                    // The id the split times are kept by. Another source than Eventor has no ids of Eventor, it
                    // must never be stored as one.
                    const splitPersonId = personResult.Person.Id?.find(() => true);
                    const personId = externalSource ? undefined : splitPersonId;
                    let competitor: IRaceCompetitor | undefined = externalSource
                      ? findExternalCompetitor(personResult.Person.Name.Given, personResult.Person.Name.Family)
                      : undefined;
                    if (personId && personId.length > 0) {
                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitorByEventorId(parseInt(personId));
                      }

                      if (!competitor) {
                        competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                          c =>
                            c.firstName === personResult.Person.Name.Given &&
                            c.lastName === personResult.Person.Name.Family &&
                            c.birthDay === personResult.Person.BirthDate?.format(dateFormat)
                        );
                        if (competitor) {
                          await competitor.addEventorId(
                            clubModel.modules.find(module => module.name === 'Results')!.addUrl!,
                            personId,
                            sessionModel.authorizationHeader
                          );
                        }
                      }
                    }
                    if (
                      !competitor &&
                      clubModel.raceClubs?.selectedClub &&
                      !raceWizardModel.autoComplete &&
                      !isSkippedExternal(personResult.Person.Name.Given, personResult.Person.Name.Family)
                    ) {
                      competitor = await AddMapCompetitorConfirmModal(
                        t,
                        modal,
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
                          iEventorCompetitorId: personId && personId.length > 0 ? personId : null
                        },
                        currentClass?.ClassShortName ?? '',
                        clubModel,
                        sessionModel
                      );
                      if (externalSource)
                        rememberExternalCompetitor(
                          personResult.Person.Name.Given,
                          personResult.Person.Name.Family,
                          competitor
                        );
                    }

                    if (competitor) {
                      const entry: IEventorEntry | undefined = personId
                        ? entriesJson.Entry.find(
                            entry =>
                              entry.Competitor?.PersonId === personId || entry.Competitor?.Person?.PersonId === personId
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
                      const entryFeeIds = entryFees.map(f => f.EntryFeeId);
                      const didNotStart = personResult.Result?.Status === 'DidNotStart';
                      const misPunch = personResult.Result?.Status === 'MissingPunch';
                      const ok = personResult.Result?.Status === 'OK';
                      const valid = ok && !didNotStart && !misPunch;
                      const secondTime =
                        valid &&
                        nofStartsInClass &&
                        nofStartsInClass > 1 &&
                        personResults.some(pr => pr.Result?.Position === 2)
                          ? personResults.find(pr => pr.Result?.Position === 2)?.Result?.Time
                          : null;
                      const fees = GetFees(entryFeeJson.EntryFee, entryFeeIds, competitor.birthDay);

                      let resultMultiDay: IRaceResultMultiDayProps | undefined;
                      if (totalIofResults && totalIofResults.ClassResult) {
                        const totalEventRace = totalIofResults.Event.Race?.find(
                          eventRace => eventRace.Extensions.EventRaceId == raceWizardModel.selectedEventorRaceId
                        );
                        const totalClassPersonResults = totalIofResults.ClassResult.find(
                          cr => cr.Class.Id === classResult.Class.Id
                        )
                          ?.PersonResult?.filter(pr =>
                            pr.Result?.some(r => r['@attributes'].raceNumber === totalEventRace?.RaceNumber)
                          )
                          ?.map(personResult => ({
                            ...personResult,
                            Result: personResult.Result?.find(() => true)
                          }));
                        const totalPersonResult = totalClassPersonResults?.find(
                          pr =>
                            pr.Person.Id?.some(id => id === personId) &&
                            pr.Result?.BibNumber === personResult.Result?.BibNumber &&
                            pr.Result?.Status !== 'NotCompeting'
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
                                : !totalPersonResult?.Time
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
                            totalSecondTime: null
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
                          clubModel.raceClubs?.eventClassifications
                        ),
                        difficulty: classLevel ? classLevel.difficulty : null,
                        lengthInMeter: lengthInMeter,
                        failedReason: didNotStart
                          ? failedReasons.NotStarted
                          : !ok
                            ? failedReasons.NotFinished
                            : !personResult.Result?.Time
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
                        missingTime: GetMissingTime(
                          splitPersonId ?? '#',
                          splitTimes,
                          bestSplitTimes,
                          secondBestSplitTimes
                        )
                      };
                      raceEvent?.results?.push(raceResult);
                    }
                  }
                }
              }
            }
          } else if (eventIsRelay && importing) {
            for (let i = 0; i < classResults.length; i++) {
              const classResult = classResults[i];
              await reportClassProgress(classResults, i, true);

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
                  currentClass = eventClasses.find(evtClass => evtClass.EventClassId === classResult.Class.Id);
                }
                if (!currentClass) {
                  currentClass = {
                    ClassShortName: classResult.Class.ShortName ?? classResult.Class.Name,
                    Name: classResult.Class.Name
                  };
                }

                // Before the legs below, their winners are named by it ("<class> - <leg>")
                const shortClassName = GetClassShortName(currentClass.ClassShortName);
                const teamResults = classResult.TeamResult.map(teamResult => ({
                  ...teamResult,
                  TeamMemberResult: teamResult.TeamMemberResult?.filter(teamMemberResult =>
                    teamMemberResult.Result?.some(r => r['@attributes'].raceNumber === eventRace?.RaceNumber)
                  )?.map(teamMemberResult => ({
                    ...teamMemberResult,
                    Result: teamMemberResult.Result?.find(() => true)
                  }))
                }));
                const allLegsSplitTimes = GetIOFRelaySplitTimes(teamResults);
                const classLevel = GetClassLevel(clubModel.raceClubs!.classLevels, shortClassName);
                const numberOfLegs = Math.max(
                  1,
                  ...(teamResults.map(tr =>
                    Math.max(
                      1,
                      ...((tr.TeamMemberResult?.map(tmr => tmr.Result?.Leg)?.filter(l => l) as number[]) ?? [])
                    )
                  ) ?? [])
                );
                const legInfos = Array.from(Array(numberOfLegs).keys())
                  .map(idx => idx + 1)
                  .map(leg => {
                    const courses =
                      classResult.Course?.filter(r => r['@attributes'].raceNumber === eventRace?.RaceNumber) ?? [];
                    const course = courses.find((c, idx) => leg === idx + 1);
                    const startedlegMembers = teamResults
                      .map(tr =>
                        (tr.TeamMemberResult ?? []).filter(
                          tmr =>
                            tmr.Result &&
                            tmr.Result.Leg === leg &&
                            tmr.Result.Status !== 'DidNotEnter' &&
                            tmr.Result.Status !== 'DidNotStart' &&
                            tmr.Result.Status !== 'Moved' &&
                            tmr.Result.Status !== 'MovedUp' &&
                            tmr.Result.Status !== 'NotCompeting'
                        )
                      )
                      .reduce(
                        (a, b) => [...b, ...a],
                        [] as (Omit<ITeamMemberResult, 'Result'> & { Result: ITeamMemberRaceResult })[]
                      ) as (Omit<ITeamMemberResult, 'Result'> & { Result: ITeamMemberRaceResult })[];
                    const oklegMembers = startedlegMembers?.filter(tmr => tmr.Result.Status === 'OK');
                    const legWinner = oklegMembers?.find(tmr => tmr.Result?.Position === 1);
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
                        : undefined
                    });

                    const legWinnerTime = oklegMembers?.find(r => r.Result.Position === 1)?.Result.Time;
                    const overallWinnerTime = oklegMembers?.find(r => r.Result.OverallResult?.Position === 1)?.Result
                      .OverallResult?.Time;

                    return {
                      leg: leg,
                      numberOfStarts: startedlegMembers?.length ?? 0,
                      legWinnerTime: legWinnerTime,
                      overallWinnerTime: overallWinnerTime,
                      oklegMembers: oklegMembers,
                      lengthInMeter: lengthInMeter
                    };
                  });
                const firstLegInfo = legInfos?.find(c => c.leg === 1);
                const lastLegInfo = legInfos?.find(c => c.leg === legInfos?.length);
                nofStartsInClass = firstLegInfo ? firstLegInfo.numberOfStarts : null;

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
                teamResults.forEach(teamResult => {
                  const hasClubMembers = teamResult.Organisation?.some(org => isClubOrganisation(org));
                  const hasDistrictMembers =
                    !externalSource &&
                    teamResult.Organisation?.some(
                      org => org.Id === clubModel.eventor?.districtOrganisationId.toString()
                    );
                  const teamOverallResult = teamResult.TeamMemberResult?.find(
                    tmr => tmr.Result?.Leg === lastLegInfo?.leg
                  )?.Result?.OverallResult;

                  teamResult.TeamMemberResult?.forEach(teamMemberResult => {
                    const personId = externalSource ? undefined : teamMemberResult.Person?.Id?.find(() => true);
                    const competitor = externalSource
                      ? hasClubMembers
                        ? findExternalCompetitor(
                            teamMemberResult.Person?.Name.Given,
                            teamMemberResult.Person?.Name.Family
                          )
                        : null
                      : (hasClubMembers || hasDistrictMembers) && personId && personId.length > 0
                        ? clubModel.raceClubs?.selectedClub?.competitorByEventorId(parseInt(personId))
                        : null;

                    if (
                      (raceWizardModel.queryForCompetitorWithNoClub && !teamMemberResult.Organisation?.Id) ||
                      isClubOrganisation(teamMemberResult.Organisation) ||
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
                        BibNumber: teamMemberResult.Result?.BibNumber ?? `${shortClassName}-${teamResult.Name}`
                      });
                    }
                  });
                });

                for (let j = 0; j < clubTeamMemberResults.length; j++) {
                  const teamMemberResult = clubTeamMemberResults[j];
                  // The split times are kept by this id, it is only an id of Eventor when Eventor is the source
                  const splitPersonId = teamMemberResult.Person?.Id?.find(() => true);
                  const personId = externalSource ? undefined : splitPersonId;
                  let competitor = teamMemberResult.Competitor;
                  if (personId && personId.length > 0) {
                    if (!competitor) {
                      competitor = clubModel.raceClubs?.selectedClub?.competitors.find(
                        c =>
                          c.firstName === teamMemberResult.Person?.Name.Given &&
                          c.lastName === teamMemberResult.Person?.Name.Family &&
                          c.birthDay === teamMemberResult.Person.BirthDate?.format(dateFormat)
                      );
                      if (competitor) {
                        await competitor.addEventorId(
                          clubModel.modules.find(module => module.name === 'Results')!.addUrl!,
                          personId,
                          sessionModel.authorizationHeader
                        );
                      }
                    }
                  }
                  if (
                    !competitor &&
                    clubModel.raceClubs?.selectedClub &&
                    !raceWizardModel.autoComplete &&
                    !isSkippedExternal(teamMemberResult.Person?.Name.Given, teamMemberResult.Person?.Name.Family)
                  ) {
                    competitor = await AddMapCompetitorConfirmModal(
                      t,
                      modal,
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
                        iEventorCompetitorId: personId ?? null
                      },
                      currentClass?.ClassShortName ?? '',
                      clubModel,
                      sessionModel
                    );
                    if (externalSource)
                      rememberExternalCompetitor(
                        teamMemberResult.Person?.Name.Given,
                        teamMemberResult.Person?.Name.Family,
                        competitor ?? undefined
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
                    const legRaceInfo = legInfos?.find(classRaceInfo => classRaceInfo.leg === leg);
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
                      const prevLegRaceInfo = legInfos?.find(classRaceInfo => classRaceInfo.leg === leg - 1);
                      const prevResults = prevLegRaceInfo?.oklegMembers.filter(
                        r => r.Result.BibNumber === teamMemberResult.Result?.BibNumber
                      );
                      let prevResult = prevResults?.find(r =>
                        r.Result.FinishTime?.isSame(teamMemberResult.Result?.StartTime)
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
                      lst => lst.leg === teamMemberResult.Result?.Leg?.toString()
                    );

                    const raceTeamResult: IRaceTeamResultProps = {
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
                        legSplitTimes && splitPersonId
                          ? GetMissingTime(
                              splitPersonId,
                              legSplitTimes.splitTimes,
                              legSplitTimes.bestSplitTimes,
                              legSplitTimes.secondBestSplitTimes
                            )
                          : null
                    };

                    raceEvent?.teamResults?.push(raceTeamResult);
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
        // The race read from the result list, to complete the saved race by
        return importing ? raceEvent : undefined;
      },
      [clubModel, raceWizardModel, sessionModel, t, modal, reportClassProgress]
    );

    // Results of a race that is not in Eventor, from another source
    const [importClubNames, setImportClubNames] = useState(clubModel.raceClubs?.selectedClub?.name ?? '');
    const [importing, setImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string>();
    const [importError, setImportError] = useState<string>();

    const showImportError = useCallback((message: string) => {
      setImportStatus(undefined);
      setImportError(message);
    }, []);

    const importResults = useCallback(
      async (load: LoadExternalResults) => {
        setImportError(undefined);
        const clubNames = SplitClubNames(importClubNames);
        if (clubNames.length === 0) {
          setImportError(t('results.ImportMissingClubName'));
          return;
        }
        setImporting(true);
        try {
          const results = await load(setImportStatus);
          // WinSplits has the legs of a relay as classes of their own, for one runner each
          const relay =
            !!results.Event.Form?.some(form => form === 'Relay') ||
            !!results.ClassResult?.some(classResult => (classResult.TeamResult?.length ?? 0) > 0);
          setImportStatus(t('results.LoadTaskCalculate'));
          // A new race, the imported results take the place of the empty one
          raceWizardModel.setBooleanValue('overwrite', true);
          await handleIOFResults(undefined, results, undefined, undefined, undefined, undefined, relay, {
            clubNames
          });
          calculateFeesAndAwards(relay);
          setIsRelay(relay);
          if (raceWizardModel.raceEvent) form.setFieldsValue(toJS(raceWizardModel.raceEvent));
          const count =
            (raceWizardModel.raceEvent?.results.length ?? 0) + (raceWizardModel.raceEvent?.teamResults.length ?? 0);
          setImportStatus(t('results.ImportDone', { count, clubs: clubNames.join(', ') }));
          form.validateFields().then();
          onValidate(!!raceWizardModel.raceEvent?.valid);
        } catch (error) {
          setImportStatus(undefined);
          // The dialog of a runner was closed with the cross, the import is stopped
          if (!(error instanceof CompetitorInputAborted))
            setImportError(`${t('results.ImportFailed')}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setImporting(false);
        }
      },
      [calculateFeesAndAwards, form, handleIOFResults, importClubNames, onValidate, raceWizardModel, t]
    );

    // The total results of an event of several days, after the stage of this race
    // A page of the total (OE), or the result lists of every stage in their order
    const [totalSource, setTotalSource] = useState<'oeTotal' | 'stages'>('oeTotal');
    const [totalLink, setTotalLink] = useState('');
    const [totalStageResults, setTotalStageResults] = useState<IStageResults[]>([]);
    const [totalStage, setTotalStage] = useState<number | null>(null);
    const [totalLoading, setTotalLoading] = useState(false);
    const [totalStatus, setTotalStatus] = useState<string>();
    const [totalError, setTotalError] = useState<string>();
    // The earlier stages, saved races of the club up to 14 days before (no event of several days is longer). The
    // stage of this race is their number + 1, and the total course length is the sum of the lengths.
    const raceDate = raceWizardModel.raceEvent?.raceDate;
    const [earlierRaces, setEarlierRaces] = useState<IEventViewResultResponse[]>([]);
    const [earlierRaceIds, setEarlierRaceIds] = useState<number[]>([]);

    useEffect(() => {
      const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
      if (raceWizardModel.existInEventor || !raceDate || !url || !clubModel.raceClubs?.selectedClub) {
        setEarlierRaces([]);
        return;
      }
      let cancelled = false;
      PostJsonData<IEventViewResultResponse[]>(
        url,
        {
          iType: 'EVENTS',
          iClubId: clubModel.raceClubs.selectedClub.clubId,
          iFromDate: dayjs(raceDate, dateFormat).add(-14, 'days').format(dateFormat),
          iToDate: raceDate
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(races => {
          if (cancelled) return;
          setEarlierRaces(
            (races ?? [])
              .filter(race => !race.isRelay && race.eventId !== raceWizardModel.selectedEventId)
              .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`))
          );
        })
        .catch(error => {
          if (!cancelled) setTotalError(`${t('results.TotalEarlierStagesFailed')}: ${error?.message ?? error}`);
        });
      return () => {
        cancelled = true;
      };
    }, [
      clubModel.modules,
      clubModel.raceClubs?.selectedClub,
      raceDate,
      raceWizardModel.existInEventor,
      raceWizardModel.selectedEventId,
      sessionModel.authorizationHeader,
      t
    ]);

    const importTotalResults = useCallback(async () => {
      setTotalError(undefined);
      setTotalStatus(undefined);
      const liveloxProxy = LiveloxProxyUrl(clubModel.eventorCorsProxy);
      const raceEvent = raceWizardModel.raceEvent;
      if (!liveloxProxy || !raceEvent) return;
      if (raceEvent.isRelay) {
        setTotalError(t('results.TotalNotForRelay'));
        return;
      }
      setTotalLoading(true);
      try {
        let totalResults: ITotalResultList;
        if (totalSource === 'stages') {
          const stageLists: IResultListType[] = [];
          for (let i = 0; i < totalStageResults.length; i++) {
            const stageResults = totalStageResults[i];
            setTotalStatus(t('results.TotalStageProgress', { stage: i + 1, stages: totalStageResults.length }));
            stageLists.push(
              stageResults.results ??
                (await FetchWinSplitsResults(clubModel.eventorCorsProxy!, stageResults.winSplitsDatabaseId!))
            );
          }
          totalResults = TotalResultsFromStages(stageLists);
          setTotalStatus(undefined);
        } else {
          totalResults = await FetchTotalResultsPage(liveloxProxy, totalLink.trim(), sessionModel.authorizationHeader);
        }
        const stages = totalResults.nofStages;
        const stage =
          totalStage ??
          (earlierRaceIds.length > 0 ? earlierRaceIds.length + 1 : undefined) ??
          StageFromName(raceEvent.name) ??
          stages;
        if (stage < 1 || stage > stages) throw new Error(t('results.TotalStageMissing', { stage, stages }));
        // The results of the club in the earlier stages, for the total course length
        const queryUrl = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
        const earlierStages: IRaceEventProps[] = [];
        for (const eventId of earlierRaceIds) {
          const earlier = queryUrl
            ? await PostJsonData<IRaceEventProps>(
                queryUrl,
                { iType: 'EVENT', iEventId: eventId },
                true,
                sessionModel.authorizationHeader
              )
            : undefined;
          if (earlier) earlierStages.push(earlier);
        }
        let withoutLength = 0;
        let updated = 0;
        const missing: string[] = [];
        raceEvent.results.forEach((result, index) => {
          const competitor = clubModel.raceClubs?.selectedClub?.competitorById(result.competitorId);
          const totalClass = FindTotalClass(totalResults, result.className);
          const classTotals = totalClass ? CalculateTotalAfterStage(totalClass, stage, stages) : undefined;
          const total =
            classTotals && competitor
              ? FindTotalPerson(classTotals.totals, competitor.firstName, competitor.lastName)
              : undefined;
          if (!classTotals || !total) {
            missing.push(`${competitor?.fullName ?? '?'} (${result.className})`);
            return;
          }
          const toTime = (seconds?: number) => (seconds != null ? ConvertSecondsToTime(seconds) : null);
          const totalLengthInMeter =
            earlierStages.length > 0
              ? TotalLengthInMeter(result.lengthInMeter, result.competitorId, earlierStages)
              : undefined;
          if (totalLengthInMeter === null) withoutLength++;
          result.setValues({
            resultMultiDay: {
              multiDayResultId: result.resultMultiDay?.multiDayResultId ?? -1 - index,
              stage,
              totalStages: stages,
              totalLengthInMeter: totalLengthInMeter ?? result.resultMultiDay?.totalLengthInMeter ?? null,
              totalFailedReason:
                total.failed === 'NotStarted'
                  ? failedReasons.NotStarted
                  : total.failed === 'NotFinished'
                    ? failedReasons.NotFinished
                    : null,
              totalTime: toTime(total.totalTime),
              totalWinnerTime: toTime(classTotals.winnerTime),
              totalSecondTime: toTime(classTotals.secondTime),
              totalPosition: total.totalPosition ?? null,
              totalNofStartsInClass: classTotals.nofStarts
            }
          });
          updated++;
        });
        setTotalStatus(
          t('results.TotalApplied', { count: updated, stage, stages }) +
            (earlierStages.length > 0
              ? ` ${t('results.TotalLengthsCalculated', { count: updated - withoutLength, stages: earlierStages.length + 1 })}`
              : '') +
            (withoutLength > 0 ? ` ${t('results.TotalLengthsMissing', { count: withoutLength })}` : '') +
            (missing.length ? ` ${t('results.TotalNotFound', { names: missing.join(', ') })}` : '')
        );
        onValidate(!!raceWizardModel.raceEvent?.valid);
      } catch (error) {
        setTotalError(`${t('results.TotalFailed')}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setTotalLoading(false);
      }
    }, [
      clubModel.eventorCorsProxy,
      clubModel.modules,
      clubModel.raceClubs,
      earlierRaceIds,
      onValidate,
      raceWizardModel,
      sessionModel.authorizationHeader,
      t,
      totalLink,
      totalSource,
      totalStageResults,
      totalStage
    ]);

    useEffect(() => {
      const fetchData = async () => {
        const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
        if (!url || !clubModel.raceClubs || !clubModel.eventor) return;
        const warnings: ILoadWarning[] = [];
        const hasEventor = raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0;
        const hasDatabase = raceWizardModel.selectedEventId != null && raceWizardModel.selectedEventId > 0;
        // Number of top results per class fetched besides the club's own results (all for runners without club)
        const clubResultsTop = raceWizardModel.queryForCompetitorWithNoClub
          ? 2500
          : raceWizardModel.selectedIsRelay
            ? 30
            : 15;
        progress.reset([
          ...(hasDatabase ? [{ key: 'database', title: t('results.LoadTaskDatabase') }] : []),
          ...(hasEventor
            ? [
                { key: 'entries', title: t('results.LoadTaskEntries') },
                { key: 'classes', title: t('results.LoadTaskClasses') },
                { key: 'iofSplits', title: t('results.LoadTaskIofSplits') },
                { key: 'iofTotal', title: t('results.LoadTaskIofTotal') },
                {
                  key: 'results',
                  title: raceWizardModel.queryForCompetitorWithNoClub
                    ? t('results.LoadTaskResultsAll')
                    : t('results.LoadTaskResults', { top: clubResultsTop })
                },
                { key: 'iof', title: t('results.LoadTaskIof') },
                { key: 'length', title: t('results.LoadTaskLength') },
                { key: 'fees', title: t('results.LoadTaskFees') },
                { key: 'calculate', title: t('results.LoadTaskCalculate') },
                { key: 'livelox', title: t('results.LoadTaskLivelox') },
                { key: 'totalLength', title: t('results.LoadTaskTotalLength') },
                ...(hasDatabase && raceWizardModel.autoComplete
                  ? [{ key: 'autoComplete', title: t('results.LoadTaskAutoComplete') }]
                  : [])
              ]
            : []),
          { key: 'process', title: t('results.LoadTaskProcess') }
        ]);
        eventClassesRef.current = [];
        raceNumberRef.current = undefined;
        nofStarters.current = 0;
        nofClasses.current = 0;
        calculated.current = { classes: 0, starters: 0, relay: false };
        // The url in Eventor of the request being made, to tell where it went wrong
        let currentEventorUrl: string | undefined;
        const eventorUrl = (eventorRequestUrl: string) => {
          currentEventorUrl = eventorRequestUrl;
          return encodeURIComponent(eventorRequestUrl);
        };
        /** The phases of a large request: Eventor builds the answer, the download and the reading of it */
        const megabytes = (bytes: number) =>
          (bytes / 1000000).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const eventorProgress = (key: string) => (fetchProgress: IFetchProgress) => {
          const previous = fetchProgress.previousError;
          const previousStatus = previous ? loadWarningShort(t, previous) : '';
          const attempt =
            fetchProgress.attempt > 1
              ? ` (${t('results.LoadAttempt', { attempt: fetchProgress.attempt, attempts: fetchProgress.attempts })}${
                  previous
                    ? `, ${t('results.LoadPreviousAttemptFailed', {
                        attempt: fetchProgress.attempt - 1,
                        reason: previousStatus,
                        message:
                          previous.message.length > 160 ? previous.message.slice(0, 157) + '...' : previous.message
                      })}`
                    : ''
                })`
              : '';
          const server = fetchProgress.server;
          if (fetchProgress.phase === 'server' && server) {
            // What the server is doing, it tells every few seconds
            const shared = server.shared ? ` (${t('results.LoadServerContinues')})` : '';
            const serverAttempt =
              server.attempt && server.attempt > 1
                ? ` (${t('results.LoadServerAttempt', { attempt: server.attempt, attempts: server.attempts })}${
                    server.previousError ? `: ${server.previousError}` : ''
                  })`
                : '';
            if (server.step === 'converting' && server.total) {
              progress.progress(
                key,
                server.index ?? 0,
                server.total,
                t('results.LoadServerConverting', { index: (server.index ?? 0) + 1, total: server.total }) +
                  shared +
                  attempt,
                'percent'
              );
            } else if (server.step === 'parsing') {
              progress.progress(
                key,
                0,
                0,
                t('results.LoadServerParsing', { size: megabytes(server.size ?? 0) }) + shared + attempt
              );
            } else if (server.downloaded) {
              progress.progress(
                key,
                server.downloaded,
                server.total ?? 0,
                (server.total
                  ? t('results.LoadServerDownloading')
                  : t('results.LoadServerDownloadingSize', { size: megabytes(server.downloaded) })) +
                  serverAttempt +
                  shared +
                  attempt,
                'bytes'
              );
            } else {
              progress.progress(
                key,
                0,
                0,
                (nofStarters.current > 500
                  ? t('results.LoadWaitingForEventorLarge', {
                      starters: nofStarters.current.toLocaleString('sv-SE'),
                      classes: nofClasses.current
                    })
                  : t('results.LoadWaitingForEventor')) +
                  serverAttempt +
                  shared +
                  attempt
              );
            }
          } else if (fetchProgress.phase === 'waiting') {
            progress.progress(
              key,
              0,
              0,
              (nofStarters.current > 500
                ? t('results.LoadWaitingForEventorLarge', {
                    starters: nofStarters.current.toLocaleString('sv-SE'),
                    classes: nofClasses.current
                  })
                : t('results.LoadWaitingForEventor')) + attempt
            );
          } else if (fetchProgress.phase === 'downloading') {
            progress.progress(
              key,
              fetchProgress.loaded,
              fetchProgress.total ?? 0,
              (fetchProgress.total
                ? t('results.LoadDownloading')
                : t('results.LoadDownloadingSize', {
                    size: (fetchProgress.loaded / 1000000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })
                  })) + attempt,
              'bytes'
            );
          } else {
            progress.progress(key, 0, 0, t('results.LoadParsing') + attempt);
          }
        };
        /** The part failed, the load continues. The warning tells why and where, so that it can be put right */
        const failed = (key: string, error: unknown) => {
          const title = progress.warn(key, loadWarningShort(t, error));
          warnings.push(toLoadWarning(t, key, title, error, currentEventorUrl));
          currentEventorUrl = undefined;
        };
        /** A part that failed, but another source was loaded instead */
        const replacedBy = (key: string, otherKey: string, detail: string) => {
          const warning = warnings.find(w => w.key === key);
          if (!warning) return;
          warning.resolvedBy = t('results.LoadResolvedBy', { title: progress.title(otherKey), detail });
          progress.warn(key, `${loadWarningShort(t)}, ${t('results.LoadReplaced')}`);
        };

        try {
          let editResultJson: IRaceEventProps | undefined;
          if (hasDatabase) {
            progress.start('database');
            editResultJson = await PostJsonData<IRaceEventProps>(
              url,
              { iType: 'EVENT', iEventId: raceWizardModel.selectedEventId },
              true,
              sessionModel.authorizationHeader
            );
            progress.finish(
              'database',
              t('results.LoadNofResults', {
                count: (editResultJson?.results?.length ?? 0) + (editResultJson?.teamResults?.length ?? 0)
              })
            );
          }

          let entriesJson: IEventorEntries | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              progress.start('entries');
              entriesJson = await PostJsonData<IEventorEntries>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.entriesUrl +
                      '?eventIds=' +
                      raceWizardModel.selectedEventorId +
                      '&organisationIds=' +
                      clubModel.eventor.organisationId +
                      ',' +
                      clubModel.eventor.districtOrganisationId +
                      '&includeEntryFees=true'
                  )
                },
                true
              );
              progress.finish('entries');
            } catch (error) {
              failed('entries', error);
            }

          let classJson: IEventorEventClasses | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              progress.start('classes');
              classJson = await PostJsonData<IEventorEventClasses>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.classesUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&includeEntryFees=true'
                  )
                },
                true
              );
              const eventClasses = classJson?.EventClass
                ? Array.isArray(classJson.EventClass)
                  ? classJson.EventClass
                  : [classJson.EventClass]
                : [];
              eventClassesRef.current = eventClasses;
              // The attributes of the class count all the races of the event (e.g. all stages of O-Ringen),
              // the race info has the starters of each race
              const eventRaceId = String(raceWizardModel.selectedEventorRaceId);
              const toNumber = (value?: string) => parseInt(value ?? '', 10) || 0;
              const raceInfosOf = (eventClass: IEventorEventClass) =>
                eventClass.ClassRaceInfo == null
                  ? []
                  : Array.isArray(eventClass.ClassRaceInfo)
                    ? eventClass.ClassRaceInfo
                    : [eventClass.ClassRaceInfo];
              // A one day event without race info counts by the class
              const hasRaceInfo = eventClasses.some(eventClass =>
                raceInfosOf(eventClass).some(raceInfo => raceInfo.EventRaceId === eventRaceId)
              );
              nofStarters.current = 0;
              nofClasses.current = 0;
              for (const eventClass of eventClasses) {
                const starters = hasRaceInfo
                  ? raceInfosOf(eventClass)
                      .filter(raceInfo => raceInfo.EventRaceId === eventRaceId)
                      .reduce(
                        (sum, raceInfo) =>
                          sum +
                          (toNumber(raceInfo['@attributes']?.noOfStarts) ||
                            toNumber(raceInfo['@attributes']?.noOfEntries)),
                        0
                      )
                  : toNumber(eventClass['@attributes']?.noOfStarts) ||
                    toNumber(eventClass['@attributes']?.numberOfEntries);
                if (starters > 0) {
                  nofStarters.current += starters;
                  nofClasses.current++;
                }
              }
              progress.finish(
                'classes',
                nofStarters.current > 0
                  ? t('results.LoadNofStarters', {
                      count: nofStarters.current,
                      starters: nofStarters.current.toLocaleString('sv-SE'),
                      classes: nofClasses.current
                    })
                  : undefined
              );
            } catch (error) {
              failed('classes', error);
            }

          let iofResults: IResultListType | undefined;
          let iofResultsWithSplitTimes = false;
          // The whole result list with split times of a large event (e.g. O-Ringen) is too large to fetch,
          // the results of the club and the top results with split times are fetched instead
          const tooManyStarters = nofStarters.current > MAX_STARTERS_FOR_IOF_SPLITS;
          if (tooManyStarters)
            progress.skip(
              'iofSplits',
              t('results.LoadSkippedTooManyStarters', {
                limit: MAX_STARTERS_FOR_IOF_SPLITS.toLocaleString('sv-SE'),
                starters: nofStarters.current.toLocaleString('sv-SE')
              })
            );
          else if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              progress.start('iofSplits');
              const response = await PostJsonDataWithProgress<IResultListType>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.iofResultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&includeSplitTimes=true&totalResult=false'
                  ),
                  stream: true
                },
                true,
                {},
                eventorProgress('iofSplits'),
                STREAM_ATTEMPTS
              );
              iofResults = correctPhpEventorProxyXmlResponseForResult(response);
              iofResultsWithSplitTimes = true;
              progress.finish('iofSplits');
            } catch (error) {
              failed('iofSplits', error);
            }

          let totalIofResults: IResultListType | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              progress.start('iofTotal');
              const response = await PostJsonDataWithProgress<IResultListType>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.iofResultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&includeSplitTimes=false&totalResult=true'
                  ),
                  stream: true
                },
                true,
                {},
                eventorProgress('iofTotal'),
                STREAM_ATTEMPTS
              );
              totalIofResults = correctPhpEventorProxyXmlResponseForResult(response);
              progress.finish('iofTotal');
            } catch (error) {
              failed('iofTotal', error);
            }

          let resultJson: IEventorResults | undefined;
          if (
            !iofResults &&
            iofResultsWithSplitTimes === false &&
            raceWizardModel.selectedEventorId != null &&
            raceWizardModel.selectedEventorId > 0
          )
            try {
              progress.start('results');
              resultJson = await PostJsonDataWithProgress<IEventorResults>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.resultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&organisationIds=' +
                      clubModel.eventor.organisationId +
                      ',' +
                      clubModel.eventor.districtOrganisationId +
                      `&top=${clubResultsTop}&includeSplitTimes=true`
                  ),
                  stream: true
                },
                true,
                {},
                eventorProgress('results'),
                STREAM_ATTEMPTS
              );
              progress.finish('results');
            } catch (error) {
              failed('results', error);
            }

          if (
            !iofResults &&
            iofResultsWithSplitTimes === false &&
            !resultJson &&
            raceWizardModel.selectedEventorId != null &&
            raceWizardModel.selectedEventorId > 0
          )
            try {
              progress.start('iof');
              const response = await PostJsonDataWithProgress<IResultListType>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.iofResultUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId +
                      '&includeSplitTimes=false&totalResult=false'
                  ),
                  stream: true
                },
                true,
                {},
                eventorProgress('iof'),
                STREAM_ATTEMPTS
              );
              iofResults = correctPhpEventorProxyXmlResponseForResult(response);
              progress.finish('iof');
            } catch (error) {
              failed('iof', error);
            }

          // The course lengths are in the start list, the result list of the club does not have them
          let courseLengths = new Map<string, number>();
          if (resultJson && raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              progress.start('length');
              const startList = await PostJsonDataWithProgress<unknown>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(
                    clubModel.eventor.lengthUrl +
                      '?eventId=' +
                      raceWizardModel.selectedEventorId +
                      '&eventRaceId=' +
                      raceWizardModel.selectedEventorRaceId
                  ),
                  stream: true
                },
                true,
                {},
                eventorProgress('length'),
                STREAM_ATTEMPTS
              );
              courseLengths = GetCourseLengths(startList);
              progress.finish('length', t('results.LoadNofCourseLengths', { count: courseLengths.size }));
            } catch (error) {
              failed('length', error);
            }

          let entryFeeJson: IEventorEntryFees | undefined;
          if (raceWizardModel.selectedEventorId != null && raceWizardModel.selectedEventorId > 0)
            try {
              progress.start('fees');
              entryFeeJson = await PostJsonData<IEventorEntryFees>(
                clubModel.eventorCorsProxy,
                {
                  csurl: eventorUrl(clubModel.eventor.entryFeeUrl + raceWizardModel.selectedEventorId)
                },
                true
              );
              progress.finish('fees');
            } catch (error) {
              failed('fees', error);
            }

          if (resultJson) {
            replacedBy('iofSplits', 'results', t('results.LoadReplacedResults'));
          } else if (iofResults) {
            replacedBy('iofSplits', 'iof', t('results.LoadReplacedNoSplits'));
            replacedBy('results', 'iof', t('results.LoadReplacedNoSplits'));
          }
          progress.skipWaiting();
          if (!resultJson && !iofResults && hasEventor) {
            throw new Error(t('results.LoadRaceNoResults'));
          }
          // Split times, mistakes and ideal times of every class and runner, then the runners of the club
          if (resultJson || iofResults) progress.start('calculate');
          else progress.skip('calculate');

          let eventIsRelay = false;
          // The race read from the result list, when the saved race is completed by it
          let sourceRaceEvent: IRaceEventProps | undefined;
          if (resultJson) {
            eventIsRelay =
              editResultJson?.isRelay ||
              (resultJson != null &&
                resultJson.Event &&
                resultJson.Event['@attributes'] &&
                resultJson.Event['@attributes'].eventForm &&
                resultJson.Event['@attributes'].eventForm.toLowerCase().indexOf('relay') >= 0);

            sourceRaceEvent = await handleEventorResults(
              editResultJson,
              resultJson,
              totalIofResults,
              entriesJson,
              entryFeeJson,
              classJson,
              courseLengths,
              eventIsRelay
            );
          } else if (iofResults) {
            eventIsRelay = editResultJson?.isRelay || !!iofResults.Event.Form?.some(f => f === 'Relay');

            sourceRaceEvent = await handleIOFResults(
              editResultJson,
              iofResults!,
              totalIofResults,
              entriesJson,
              entryFeeJson,
              classJson,
              eventIsRelay
            );
          } else {
            eventIsRelay = !!editResultJson?.isRelay;
            raceWizardModel.setRaceEvent(editResultJson ?? null);
          }

          if (resultJson || iofResults)
            progress.finish(
              'calculate',
              calculated.current.classes > 0
                ? t(calculated.current.relay ? 'results.LoadCalculatedRelay' : 'results.LoadCalculated', {
                    classes: calculated.current.classes,
                    starters: calculated.current.starters.toLocaleString('sv-SE')
                  })
                : undefined
            );

          // The saved race keeps its values, only what it misses is taken from the result list
          let autoCompleteSummary: IAutoCompleteSummary | undefined;
          if (raceWizardModel.autoComplete && editResultJson && sourceRaceEvent) {
            const completed = AutoCompleteRaceEvent(editResultJson, sourceRaceEvent);
            raceWizardModel.setRaceEvent(completed.raceEvent);
            autoCompleteSummary = completed.summary;
          }
          let liveloxLengths = 0;

          // Course lengths from Livelox. Eventor and the IOF result list have one length per class, for a relay not
          // per leg, and often none. The race in Eventor links to the event in Livelox, which has every leg.
          const missingLength =
            !eventIsRelay &&
            !!raceWizardModel.raceEvent?.results.some(
              result => !result.lengthInMeter && result.failedReason !== failedReasons.NotStarted
            );
          setLiveloxNeeded(eventIsRelay || missingLength);
          const liveloxProxy = LiveloxProxyUrl(clubModel.eventorCorsProxy);
          if (hasEventor && liveloxProxy && raceWizardModel.raceEvent && (eventIsRelay || missingLength)) {
            const eventorEventId = raceWizardModel.selectedEventorId!;
            const raceDate = raceWizardModel.raceEvent.raceDate;
            const eventName = raceWizardModel.raceEvent.name;
            progress.start('livelox');
            let liveloxEvent: ILiveloxEvent | undefined;

            // 1. Livelox is searched for the event on the day of the race, it tells which event in Eventor it has
            let searchError: unknown;
            if (raceDate)
              try {
                currentEventorUrl = LiveloxSearchUrl;
                liveloxEvent = await FindLiveloxEvent(liveloxProxy, {
                  eventorEventId,
                  raceNumber: raceNumberRef.current,
                  raceDate,
                  eventName
                });
              } catch (error) {
                searchError = error;
              }

            // 2. The link to Livelox on the page of the race in Eventor, which has a browser check that the server
            // seldom passes
            let eventorError: unknown;
            let eventorUrlOfRace: string | undefined;
            if (!liveloxEvent)
              try {
                eventorUrlOfRace = currentEventorUrl = EventorEventUrl(eventorEventId);
                const liveloxEventIds = await FetchLiveloxEventIds(liveloxProxy, eventorEventId);
                // An event of several races links to one event in Livelox for each race
                const liveloxEvents: ILiveloxEvent[] = [];
                for (const liveloxEventId of liveloxEventIds.slice(0, 5)) {
                  currentEventorUrl = LiveloxEventUrl(liveloxEventId);
                  liveloxEvents.push(await FetchLiveloxEvent(liveloxProxy, liveloxEventId));
                }
                liveloxEvent = ChooseLiveloxEvent(liveloxEvents, eventorEventId, raceNumberRef.current);
              } catch (error) {
                eventorError = error;
              }

            const notFound = t('results.LoadLiveloxNotFound', {
              date: raceDate,
              texts: LiveloxSearchTexts(eventName).join('", "')
            });
            if (liveloxEvent) {
              const classes = GetLiveloxClassesByName(liveloxEvent, eventClassesRef.current);
              // A saved race keeps its lengths, Livelox is asked when a leg is changed. Auto completion only fills
              // in the lengths that are missing.
              const updated =
                raceWizardModel.overwrite || raceWizardModel.autoComplete
                  ? applyLiveloxLengths(classes, eventIsRelay, raceWizardModel.autoComplete)
                  : 0;
              liveloxLengths = updated;
              setLivelox({ event: liveloxEvent, classes, updated });
              progress.finish('livelox', t('results.LoadLiveloxFound', { name: liveloxEvent.name, count: updated }));
            } else if (eventorError || searchError) {
              // The error of Eventor tells most (e.g. its browser check), the search is told first
              failed('livelox', eventorError ?? searchError);
              const warning = warnings.find(w => w.key === 'livelox');
              if (warning) {
                warning.message = eventorError
                  ? `${searchError ? `${t('results.LoadLiveloxSearchFailed')}: ${searchError instanceof Error ? searchError.message : String(searchError)}` : notFound} ${t('results.LoadLiveloxEventorFailed')}: ${warning.message}`
                  : `${t('results.LoadLiveloxSearchFailed')}: ${warning.message}`;
                // What to do instead. The hint for the browser check of Eventor ("use the API") does not apply here.
                warning.hint = t('results.LoadHintLivelox');
              }
            } else {
              // Not an error, but the lengths are still missing
              const short = t('results.LoadLiveloxNotFoundShort');
              const title = progress.warn('livelox', short);
              warnings.push({
                key: 'livelox',
                title,
                short,
                message: `${notFound} ${t('results.LoadLiveloxNoLink')}`,
                hint: t('results.LoadHintLivelox'),
                url: eventorUrlOfRace,
                details: []
              });
            }
            currentEventorUrl = undefined;
          } else if (hasEventor) progress.skip('livelox');

          // The total course length of an event of several days, by the saved earlier stages of the event. For a
          // race read from Eventor (new or fetched again) as well as for a saved race that is completed.
          let totalLengths = 0;
          if ((raceWizardModel.overwrite || autoCompleteSummary) && raceWizardModel.raceEvent) {
            const raceEvent = raceWizardModel.raceEvent;
            const needsTotalLength = raceEvent.results.some(
              result =>
                result.lengthInMeter &&
                result.resultMultiDay &&
                result.resultMultiDay.stage > 1 &&
                !result.resultMultiDay.totalLengthInMeter
            );
            const raceDate = raceEvent.raceDate;
            if (needsTotalLength && raceDate && raceEvent.eventorId && clubModel.raceClubs.selectedClub)
              try {
                progress.start('totalLength');
                const thisRace = `${raceDate} ${raceEvent.raceTime ?? ''}`;
                const races =
                  (await PostJsonData<IEventViewResultResponse[]>(
                    url,
                    {
                      iType: 'EVENTS',
                      iClubId: clubModel.raceClubs.selectedClub.clubId,
                      iFromDate: dayjs(raceDate, dateFormat).add(-14, 'days').format(dateFormat),
                      iToDate: raceDate
                    },
                    true,
                    sessionModel.authorizationHeader
                  )) ?? [];
                // The earlier races of the same event, by the date and time of the race
                const earlierRaces = races.filter(
                  race =>
                    race.eventorId === raceEvent.eventorId &&
                    race.eventId !== raceEvent.eventId &&
                    race.eventorRaceId !== raceEvent.eventorRaceId &&
                    !race.isRelay &&
                    (race.date < raceDate || (!!raceEvent.raceTime && `${race.date} ${race.time ?? ''}` < thisRace))
                );
                const earlierStages: IRaceEventProps[] = [];
                for (const race of earlierRaces) {
                  const earlier = await PostJsonData<IRaceEventProps>(
                    url,
                    { iType: 'EVENT', iEventId: race.eventId },
                    true,
                    sessionModel.authorizationHeader
                  );
                  if (earlier) earlierStages.push(earlier);
                }
                MissingTotalLengths(toJS(raceEvent.results), earlierStages).forEach(
                  ({ resultId, totalLengthInMeter }) => {
                    const result = raceEvent.results.find(r => r.resultId === resultId);
                    if (!result?.resultMultiDay) return;
                    result.setValues({ resultMultiDay: { ...toJS(result.resultMultiDay), totalLengthInMeter } });
                    totalLengths++;
                  }
                );
                progress.finish('totalLength', t('results.AutoCompleteTotalLengths', { count: totalLengths }));
              } catch (error) {
                failed('totalLength', error);
              }
          }

          if (autoCompleteSummary && raceWizardModel.raceEvent) {
            progress.start('autoComplete');
            const competitorNames = autoCompleteSummary.notInSavedCompetitorIds
              .map(id => clubModel.raceClubs?.selectedClub?.competitorById(id)?.fullName)
              .filter((name, index, names) => !!name && names.indexOf(name) === index);
            const info = [
              t('results.AutoCompleteDone', {
                values: autoCompleteSummary.filledValues,
                count: autoCompleteSummary.completedResults
              }),
              autoCompleteSummary.missingTimesUpdated > 0
                ? t('results.AutoCompleteMissingTimes', { count: autoCompleteSummary.missingTimesUpdated })
                : null,
              liveloxLengths > 0 ? t('results.AutoCompleteLivelox', { count: liveloxLengths }) : null,
              totalLengths > 0 ? t('results.AutoCompleteTotalLengths', { count: totalLengths }) : null,
              competitorNames.length > 0
                ? t('results.AutoCompleteNotInSaved', { names: competitorNames.join(', ') })
                : null
            ]
              .filter(text => !!text)
              .join(' ');
            setAutoCompleteInfo(info);
            progress.finish(
              'autoComplete',
              t(
                autoCompleteSummary.missingTimesUpdated > 0
                  ? 'results.AutoCompleteProgressMissingTimes'
                  : 'results.AutoCompleteProgress',
                {
                  values: autoCompleteSummary.filledValues + liveloxLengths + totalLengths,
                  missingTimes: autoCompleteSummary.missingTimesUpdated
                }
              )
            );
          }

          progress.start('process');
          // Time for the browser to show it
          await new Promise(resolve => setTimeout(resolve, 0));

          calculateFeesAndAwards(eventIsRelay);

          progress.finish(
            'process',
            t('results.LoadNofResults', {
              count:
                (raceWizardModel.raceEvent?.results.length ?? 0) + (raceWizardModel.raceEvent?.teamResults.length ?? 0)
            })
          );
          form?.validateFields().then();
          onValidate(!!raceWizardModel.raceEvent?.valid);
          setIsRelay(!!eventIsRelay);
          setLoadWarnings(warnings);
          setLoaded(true);
        } catch (e) {
          // The dialog of a runner was closed with the cross: back to choosing the race
          if (e instanceof CompetitorInputAborted) {
            onFailed(e);
            return;
          }
          const errorMessage =
            e instanceof Error
              ? e.message
              : typeof e === 'string'
                ? e
                : ((e as { message?: string } | undefined)?.message ?? t('results.LoadRaceUnknownError'));
          progress.fail(errorMessage);
          setLoadWarnings(warnings);
          setLoadError(errorMessage);
        }
      };

      if (!raceWizardModel.existInEventor && !raceWizardModel.raceEvent) {
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
          invoiceVerified: false
        });
        onValidate(!!raceWizardModel.raceEvent!.valid);
        setIsRelay(false);
        setLoaded(true);
        form?.validateFields().then();
        return;
      } else if (!raceWizardModel.raceEvent) {
        fetchData();
      }
    }, [
      applyLiveloxLengths,
      calculateFeesAndAwards,
      clubModel.eventor,
      clubModel.eventorCorsProxy,
      clubModel.modules,
      clubModel.raceClubs,
      form,
      handleEventorResults,
      handleIOFResults,
      onFailed,
      onValidate,
      progress,
      raceWizardModel,
      reloadCount,
      sessionModel.authorizationHeader,
      t
    ]);

    const reload = useCallback(() => {
      setLoadError(undefined);
      setLoadWarnings([]);
      setAutoCompleteInfo(undefined);
      setLoaded(false);
      setLivelox(undefined);
      setLiveloxNeeded(false);
      setLiveloxError(undefined);
      raceWizardModel.setRaceEvent(null);
      setReloadCount(count => count + 1);
    }, [raceWizardModel]);

    const columns: TableProps<IExtendedRaceResult & { isValid?: boolean }>['columns'] = [
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
                const resultObject: IExtendedRaceResult = { ...record };
                const allResultObject: Partial<IExtendedRaceResult> = {};
                let confirmModal: {
                  destroy: () => void;
                  update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
                };

                // eslint-disable-next-line prefer-const
                confirmModal = modal.confirm({
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
                        onChange={changes => Object.assign(resultObject, changes)}
                        onChangeAll={changes => Object.assign(allResultObject, changes)}
                        onValidate={valid =>
                          confirmModal.update({
                            okButtonProps: {
                              disabled: !valid
                            }
                          })
                        }
                      />
                    ) : null,
                  okButtonProps: {
                    disabled: true
                  },
                  cancelText: t('common.Cancel'),
                  onOk() {
                    const mobxResult = raceWizardModel.raceEvent?.results.find(
                      r => r.resultId === resultObject.resultId
                    );
                    if (mobxResult) {
                      mobxResult.setValues(resultObject);
                      mobxResult.setIsAwardTouched(clubModel.raceClubs!, raceWizardModel.raceEvent as IRaceEventBasic);
                    }
                    if (Object.keys(allResultObject).length > 0) {
                      const resultsWithSameClass = raceWizardModel.raceEvent?.results.filter(
                        r => r.className === resultObject.className && r.resultId !== resultObject.resultId
                      );
                      resultsWithSameClass?.forEach(r => r.setValues(allResultObject));
                    }
                    onValidate(!!raceWizardModel.raceEvent?.valid);
                  }
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
        )
      },
      {
        title: t('results.Competitor'),
        dataIndex: 'competitorId',
        key: 'competitorId',
        ellipsis: true,
        width: 200,
        fixed: 'left',
        render: id =>
          id == null ? <MissingTag t={t} /> : clubModel.raceClubs?.selectedClub?.competitorById(id)?.fullName
      },
      {
        title: t('results.Class'),
        dataIndex: 'className',
        key: 'className',
        ellipsis: true,
        width: 70,
        fixed: 'left',
        render: value => (value == null ? <MissingTag t={t} /> : value)
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
              id
            );
            return classClassificationDescription ? classClassificationDescription : <MissingTag t={t} />;
          }
          return <MissingTag t={t} />;
        }
      },
      {
        title: t('results.Difficulty'),
        dataIndex: 'difficulty',
        key: 'difficulty',
        ellipsis: true,
        width: 80,
        render: value => (value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.LengthInMeter'),
        dataIndex: 'lengthInMeter',
        key: 'lengthInMeter',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.FailedReason'),
        dataIndex: 'failedReason',
        key: 'failedReason',
        ellipsis: true,
        width: 120,
        render: reason => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null)
      },
      {
        title: t('results.Time'),
        dataIndex: 'competitorTime',
        key: 'competitorTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value)
      },
      {
        title: t('results.WinnerTime'),
        dataIndex: 'winnerTime',
        key: 'winnerTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value)
      },
      {
        title: t('results.MissingTime'),
        dataIndex: 'missingTime',
        key: 'missingTime',
        ellipsis: true,
        width: 70,
        render: value =>
          value?.substr(-5) === ManuallyEditedMissingTimePostfix ? (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              {FormatTime(value)}
            </Tag>
          ) : (
            FormatTime(value)
          )
      },
      {
        title: t('results.Position'),
        dataIndex: 'position',
        key: 'position',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.NofStartsInClass'),
        dataIndex: 'nofStartsInClass',
        key: 'nofStartsInClass',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.Award'),
        dataIndex: 'award',
        key: 'award',
        ellipsis: true,
        width: 70
      },
      {
        title: t('results.EventFee'),
        dataIndex: 'fee',
        key: 'fee',
        ellipsis: true,
        width: 120,
        render: value => (value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.TotalFeeToClub'),
        dataIndex: 'totalFeeToClub',
        key: 'totalFeeToClub',
        ellipsis: true,
        width: 120,
        render: (_text, record) =>
          record.feeToClub == null ? <MissingTag t={t} /> : record.feeToClub + (record.serviceFeeToClub ?? 0)
      },
      {
        title: t('results.DeviantEventClassification'),
        dataIndex: 'deviantEventClassificationId',
        key: 'deviantEventClassificationId',
        ellipsis: true,
        width: 120
      },
      {
        key: 'isValid',
        hidden: true
      }
    ];

    const teamColumns: TableProps<IExtendedRaceTeamResult & { isValid?: boolean }>['columns'] = [
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
                const teamResultObject: IExtendedRaceTeamResult = { ...record };
                const allTeamResultObject: Partial<IExtendedRaceTeamResult> = {};
                let confirmModal: {
                  destroy: () => void;
                  update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
                };

                // eslint-disable-next-line prefer-const
                confirmModal = modal.confirm({
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
                        result={teamResultObject}
                        results={raceWizardModel.raceEvent.teamResults}
                        liveloxClasses={livelox?.classes}
                        autoUpdateResultWithSameClass={autoUpdateResultWithSameClass}
                        competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
                        onChange={changes => Object.assign(teamResultObject, changes)}
                        onChangeAll={changes => Object.assign(allTeamResultObject, changes)}
                        onValidate={valid =>
                          confirmModal.update({
                            okButtonProps: {
                              disabled: !valid
                            }
                          })
                        }
                      />
                    ) : null,
                  okButtonProps: {
                    disabled: true
                  },
                  cancelText: t('common.Cancel'),
                  onOk() {
                    const mobxResult = raceWizardModel.raceEvent?.teamResults.find(
                      r => r.teamResultId === teamResultObject.teamResultId
                    );
                    if (mobxResult) mobxResult.setValues(teamResultObject);
                    if (Object.keys(allTeamResultObject).length > 0) {
                      const resultsWithSameClass = raceWizardModel.raceEvent?.teamResults.filter(
                        r =>
                          r.className === teamResultObject.className &&
                          r.stage === teamResultObject.stage &&
                          r.teamResultId !== teamResultObject.teamResultId
                      );
                      resultsWithSameClass?.forEach(r => r.setValues(allTeamResultObject));
                    }
                    onValidate(!!raceWizardModel.raceEvent?.valid);
                  }
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
        )
      },
      {
        title: t('results.Competitor'),
        dataIndex: 'competitorId',
        key: 'competitorId',
        ellipsis: true,
        width: 200,
        fixed: 'left',
        render: id =>
          id == null ? <MissingTag t={t} /> : clubModel.raceClubs?.selectedClub?.competitorById(id)?.fullName
      },
      {
        title: t('results.Class'),
        dataIndex: 'className',
        key: 'className',
        ellipsis: true,
        width: 70,
        fixed: 'left',
        render: value => (value == null ? <MissingTag t={t} /> : value)
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
              id
            );
            return classClassificationDescription ? classClassificationDescription : <MissingTag t={t} />;
          }
          return <MissingTag t={t} />;
        }
      },
      {
        title: t('results.Difficulty'),
        dataIndex: 'difficulty',
        key: 'difficulty',
        ellipsis: true,
        width: 80,
        render: value => (value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.LengthInMeter'),
        dataIndex: 'lengthInMeter',
        key: 'lengthInMeter',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.FailedReason'),
        dataIndex: 'failedReason',
        key: 'failedReason',
        ellipsis: true,
        width: 120,
        render: reason => (reason ? reason.charAt(0).toUpperCase() + reason.substr(1).toLowerCase() : null)
      },
      {
        title: t('results.Time'),
        dataIndex: 'competitorTime',
        key: 'competitorTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value)
      },
      {
        title: t('results.WinnerTime'),
        dataIndex: 'winnerTime',
        key: 'winnerTime',
        ellipsis: true,
        width: 70,
        render: (value, record) =>
          record.failedReason == null && value == null ? <MissingTag t={t} /> : FormatTime(value)
      },
      {
        title: t('results.MissingTime'),
        dataIndex: 'missingTime',
        key: 'missingTime',
        ellipsis: true,
        width: 70,
        render: value =>
          value?.substr(-5) === ManuallyEditedMissingTimePostfix ? (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              {FormatTime(value)}
            </Tag>
          ) : (
            FormatTime(value)
          )
      },
      {
        title: t('results.Position'),
        dataIndex: 'position',
        key: 'position',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.NofStartsInClass'),
        dataIndex: 'nofStartsInClass',
        key: 'nofStartsInClass',
        ellipsis: true,
        width: 90,
        render: (value, record) => (record.failedReason == null && value == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.Stage'),
        dataIndex: 'stageText',
        key: 'stageText',
        ellipsis: true,
        width: 70,
        render: (value, record) => (record.stage == null || record.totalStages == null ? <MissingTag t={t} /> : value)
      },
      {
        title: t('results.DeltaPositions'),
        dataIndex: 'deltaPositions',
        key: 'deltaPositions',
        ellipsis: true,
        width: 100
      },
      {
        title: t('results.DeltaTimeBehind'),
        dataIndex: 'deltaTimeBehind',
        key: 'deltaTimeBehind',
        ellipsis: true,
        width: 120,
        render: value => FormatTime(value)
      },
      {
        title: t('results.DeviantRaceLightCondition'),
        dataIndex: 'deviantRaceLightCondition',
        key: 'deviantRaceLightCondition',
        ellipsis: true,
        width: 120
      },
      {
        title: t('results.DeviantEventClassification'),
        dataIndex: 'deviantEventClassificationId',
        key: 'deviantEventClassificationId',
        ellipsis: true,
        width: 120
      },
      {
        key: 'isValid',
        hidden: true
      }
    ];

    const warningsList = loadWarnings.length > 0 ? <LoadWarningList warnings={loadWarnings} /> : null;

    return (
      <>
        {loadError && visible ? (
          <Alert
            showIcon
            type="error"
            title={t('results.LoadRaceFailed')}
            description={
              <>
                <div>{loadError}</div>
                <ExpandableDetails>
                  <LoadProgress embedded title={null} tasks={loadTasks} />
                  {/* Why each part failed, the server's message, hint and url */}
                  {warningsList ? <div style={{ marginTop: 8 }}>{warningsList}</div> : null}
                </ExpandableDetails>
              </>
            }
            action={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button icon={<LeftOutlined />} onClick={() => onFailed?.(loadError)}>
                  {t('common.Previous')}
                </Button>
                <Button type="primary" icon={<ReloadOutlined />} onClick={reload}>
                  {t('results.LoadRaceAgain')}
                </Button>
              </div>
            }
          />
        ) : raceWizardModel.raceEvent && clubModel.raceClubs && loaded && visible ? (
          <Form id={formId} form={form} layout="vertical" initialValues={raceWizardModel.raceEvent}>
            {/* Everything above the table, the rows of the table are as many as fit below it */}
            <div ref={setAboveTableElement}>
              {warningsList ? (
                <Alert
                  closable
                  showIcon
                  type="warning"
                  title={t('results.LoadRaceWarnings')}
                  description={warningsList}
                  style={{ marginBottom: 12 }}
                />
              ) : null}
              {autoCompleteInfo ? (
                <Alert
                  closable
                  showIcon
                  type="info"
                  title={t('results.AutoCompleteTitle')}
                  description={autoCompleteInfo}
                  style={{ marginBottom: 12 }}
                />
              ) : null}
              {!raceWizardModel.existInEventor ? (
                <Card size="small" title={t('results.ImportTitle')} style={{ marginBottom: 12 }}>
                  <ImportExternalResults
                    eventorCorsProxy={clubModel.eventorCorsProxy}
                    importing={importing}
                    clubNames={importClubNames}
                    onClubNamesChange={setImportClubNames}
                    onImport={importResults}
                    onError={showImportError}
                  />
                  {importError ? (
                    <Typography.Text type="danger">{importError}</Typography.Text>
                  ) : importStatus ? (
                    <Typography.Text type="secondary">{importStatus}</Typography.Text>
                  ) : null}
                  <Row gutter={8} align="bottom" style={{ marginTop: 8 }}>
                    <Col span={4}>
                      <FormItem label={t('results.ImportSource')}>
                        <Select
                          value={totalSource}
                          popupMatchSelectWidth={false}
                          options={[
                            { value: 'oeTotal', label: t('results.TotalSourceOE') },
                            { value: 'stages', label: t('results.TotalSourceStages') }
                          ]}
                          onChange={(value: 'oeTotal' | 'stages') => setTotalSource(value)}
                        />
                      </FormItem>
                    </Col>
                    <Col span={13}>
                      {totalSource === 'stages' ? (
                        <FormItem label={t('results.TotalStageLinks')} tooltip={t('results.TotalStageLinksTooltip')}>
                          <StageResultsInput value={totalStageResults} onChange={setTotalStageResults} />
                        </FormItem>
                      ) : (
                        <FormItem label={t('results.TotalLink')} tooltip={t('results.TotalLinkTooltip')}>
                          <Input
                            allowClear
                            value={totalLink}
                            placeholder="https://host-open.dk/media/v2paaar0/samlet-klasseresultat.html"
                            onChange={e => setTotalLink(e.currentTarget.value)}
                          />
                        </FormItem>
                      )}
                    </Col>
                    <Col span={3}>
                      <FormItem label={t('results.TotalStage')} tooltip={t('results.TotalStageTooltip')}>
                        <InputNumber
                          min={1}
                          max={20}
                          style={{ width: '100%' }}
                          value={totalStage}
                          placeholder={(earlierRaceIds.length > 0
                            ? earlierRaceIds.length + 1
                            : StageFromName(raceWizardModel.raceEvent.name)
                          )?.toString()}
                          onChange={value => setTotalStage(value)}
                        />
                      </FormItem>
                    </Col>
                    <Col span={4}>
                      <Button
                        block
                        icon={<ImportOutlined />}
                        loading={totalLoading}
                        disabled={
                          (totalSource === 'stages' ? totalStageResults.length === 0 : !totalLink.trim()) ||
                          raceWizardModel.raceEvent.results.length === 0
                        }
                        onClick={importTotalResults}
                      >
                        {t('results.TotalImport')}
                      </Button>
                    </Col>
                  </Row>
                  <Row gutter={8} style={{ marginTop: 4 }}>
                    <Col span={20}>
                      <FormItem
                        label={t('results.TotalEarlierStages')}
                        tooltip={t('results.TotalEarlierStagesTooltip')}
                      >
                        <Select
                          allowClear
                          mode="multiple"
                          value={earlierRaceIds}
                          placeholder={
                            earlierRaces.length > 0
                              ? t('results.TotalEarlierStagesPlaceholder')
                              : t('results.TotalNoEarlierStages')
                          }
                          disabled={earlierRaces.length === 0}
                          options={earlierRaces.map(race => ({
                            value: race.eventId,
                            label: `${race.date} ${race.name}`
                          }))}
                          onChange={(ids: number[]) => setEarlierRaceIds(ids)}
                        />
                      </FormItem>
                    </Col>
                  </Row>
                  {totalError ? (
                    <Typography.Text type="danger">{totalError}</Typography.Text>
                  ) : totalStatus ? (
                    <Typography.Text type="secondary">{totalStatus}</Typography.Text>
                  ) : null}
                </Card>
              ) : null}
              <Row gutter={8}>
                <Col span={6}>
                  <FormItem
                    name="name"
                    label={t('results.Name')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.Name')
                      }
                    ]}
                  >
                    <Input
                      onChange={e => {
                        raceWizardModel.raceEvent?.setStringValueOrNull('name', e.currentTarget.value);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={6}>
                  <FormItem
                    name="organiserName"
                    label={t('results.Club')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.Club')
                      }
                    ]}
                  >
                    <Input
                      onChange={e => {
                        raceWizardModel.raceEvent?.setStringValueOrNull('organiserName', e.currentTarget.value);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={4}>
                  <FormItem
                    name="raceDate"
                    label={t('results.Date')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.Date')
                      }
                    ]}
                    normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
                    getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
                  >
                    <DatePicker
                      format={dateFormat}
                      allowClear={false}
                      onChange={date => {
                        if (date) raceWizardModel.raceEvent?.setStringValueOrNull('raceDate', date.format(dateFormat));
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={4}>
                  <FormItem name="raceTime" label={t('results.Time')}>
                    <InputTime
                      format={shortTimeFormat}
                      allowClear={true}
                      onChange={time => {
                        if (time) raceWizardModel.raceEvent?.setStringValueOrNull('raceTime', time);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                {['OL', 'SKIO', 'MTBO'].includes(raceWizardModel.raceEvent.sportCode) ? (
                  <Col span={4}>
                    <FormItem
                      name="meetsAwardRequirements"
                      label={t('results.MeetsAwardRequirements')}
                      valuePropName="checked"
                    >
                      <Switch
                        onChange={checked => {
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
                  <FormItem name="longitude" label={t('map.ChooseMapPosition')}>
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
                    name="eventClassificationId"
                    label={t('results.EventClassification')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.EventClassification')
                      }
                    ]}
                  >
                    <FormSelect
                      popupMatchSelectWidth={false}
                      allowClear={false}
                      options={clubModel.raceClubs.eventClassificationOptions}
                      onChange={code => {
                        raceWizardModel.raceEvent?.setEventClassificationId(code);
                        ResetClassClassifications(
                          raceWizardModel.raceEvent!,
                          clubModel.raceClubs!.eventClassifications,
                          clubModel.raceClubs!.classLevels
                        );
                        CalculateAllAwards(clubModel.raceClubs!, raceWizardModel.raceEvent!);
                        CalculateAllClassClassificationId(clubModel.raceClubs!, raceWizardModel.raceEvent!);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={5}>
                  <FormItem
                    name="paymentModel"
                    label={t('results.PaymentModel')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.RaceDistance')
                      }
                    ]}
                  >
                    <FormSelect
                      allowClear={false}
                      options={paymentOptions(t)}
                      onChange={code => {
                        raceWizardModel.raceEvent?.setPaymentModel(code);
                        if (code !== payments.defaultFeePaidByCompetitor) {
                          raceWizardModel.setNumberValue('paymentModel', code);
                        }
                        CalculateCompetitorsFee(
                          raceWizardModel.raceEvent!,
                          clubModel.raceClubs!.selectedClub!,
                          clubModel.raceClubs!.eventClassifications
                        );
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={3}>
                  <FormItem
                    name="sportCode"
                    label={t('results.Sport')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.Sport')
                      }
                    ]}
                  >
                    <FormSelect
                      allowClear={false}
                      options={clubModel.raceClubs.sportOptions}
                      onChange={code => {
                        raceWizardModel.raceEvent?.setSportCode(code);
                        raceWizardModel.raceEvent?.setBooleanValue('meetsAwardRequirements', code === 'OL');
                        CalculateAllAwards(clubModel.raceClubs!, raceWizardModel.raceEvent!);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={3}>
                  <FormItem name="isRelay" label={t('results.IsRelay')} valuePropName="checked">
                    <Switch
                      disabled={
                        raceWizardModel.raceEvent.results.length > 0 || raceWizardModel.raceEvent.teamResults.length > 0
                      }
                      onChange={checked => {
                        raceWizardModel.raceEvent?.setBooleanValue('isRelay', checked);
                        setIsRelay(checked);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={3}>
                  <FormItem
                    name="raceDistance"
                    label={t('results.RaceDistance')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.RaceDistance')
                      }
                    ]}
                  >
                    <FormSelect
                      allowClear={true}
                      options={raceDistanceOptions(t)}
                      onChange={code => {
                        raceWizardModel.raceEvent?.setRaceDistance(code);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={3}>
                  <FormItem
                    name="raceLightCondition"
                    label={t('results.RaceLightCondition')}
                    rules={[
                      {
                        required: true,
                        message: errorRequiredField(t, 'results.RaceLightCondition')
                      }
                    ]}
                  >
                    <FormSelect
                      allowClear={true}
                      options={raceLightConditionOptions(t)}
                      onChange={code => {
                        raceWizardModel.raceEvent?.setRaceLightCondition(code);
                        onValidate(!!raceWizardModel.raceEvent?.valid);
                      }}
                    />
                  </FormItem>
                </Col>
              </Row>
              {liveloxNeeded || livelox || liveloxError ? (
                <Row gutter={8} align="bottom" style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <FormItem label={t('results.LiveloxLink')} tooltip={t('results.LiveloxLinkTooltip')}>
                      <Input.Search
                        allowClear
                        value={liveloxLink}
                        placeholder={t('results.LiveloxLinkPlaceholder')}
                        enterButton={t('results.LiveloxFetch')}
                        loading={liveloxLoading}
                        onChange={e => setLiveloxLink(e.currentTarget.value)}
                        onSearch={value => {
                          if (value.trim()) loadLivelox(value);
                        }}
                      />
                    </FormItem>
                  </Col>
                  <Col span={14} style={{ paddingBottom: 5 }}>
                    {liveloxError ? (
                      <Typography.Text type="danger">{liveloxError}</Typography.Text>
                    ) : livelox ? (
                      <Typography.Text type="secondary">
                        <a href={livelox.event.url} target="_blank" rel="noopener noreferrer">
                          {livelox.event.name}
                        </a>
                        {' – '}
                        {livelox.updated > 0
                          ? t('results.LiveloxApplied', { count: livelox.updated })
                          : t('results.LiveloxNoChange')}
                      </Typography.Text>
                    ) : null}
                  </Col>
                </Row>
              ) : null}
            </div>
            <div ref={setTableElement}>
              {isRelay ? (
                <StyledTable
                  columns={teamColumns}
                  dataSource={raceWizardModel.raceEvent.teamResults.map(result => ({
                    ...toJS(result),
                    key: result.teamResultId,
                    isValid: result.valid,
                    stageText: `${result.stage} ${t('common.Of')} ${result.totalStages}`
                  }))}
                  pagination={{
                    pageSize: tablePageSize,
                    hideOnSinglePage: true,
                    showSizeChanger: false
                  }}
                  scroll={{ x: true }}
                  size="middle"
                  tableLayout="fixed"
                  rowClassName={record => (!record.isValid ? 'table-row-red' : '')}
                />
              ) : (
                <StyledTable
                  columns={columns}
                  dataSource={raceWizardModel.raceEvent.results.map(result => ({
                    ...toJS(result),
                    key: result.resultId,
                    isValid: result.valid,
                    isAwardTouched: result.isAwardTouched,
                    fee:
                      result.originalFee != null && result.lateFee != null ? result.originalFee + result.lateFee : null
                  }))}
                  pagination={{
                    pageSize: tablePageSize,
                    hideOnSinglePage: true,
                    showSizeChanger: false
                  }}
                  scroll={{ x: true }}
                  size="middle"
                  tableLayout="fixed"
                  rowClassName={record => (!record.isValid ? 'table-row-red' : '')}
                />
              )}
            </div>
          </Form>
        ) : visible && loadTasks.length > 0 ? (
          <LoadProgress title={t('results.LoadingRace')} tasks={loadTasks} startedAt={loadStartedAt} />
        ) : visible ? (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        ) : null}
        {contextHolder}
      </>
    );
  }
);

export default ResultWizardStep2EditRace;
