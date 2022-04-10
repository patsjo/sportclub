import { Form, message, Spin } from 'antd';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react';
import { IMobxClubModel } from 'models/mobxClubModel';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import {
  IClubViewResultResponse,
  IEventViewResultResponse,
  IIndividualViewResultResponse,
  IPrintSettings,
  IPrintSettingsColumn,
  IViewResult,
  IViewTeamResult,
} from 'utils/responseInterfaces';
import { PostJsonData } from '../../utils/api';
import { FormSelect, INumberOption, IOption } from '../../utils/formHelper';
import { getPdf, getZip, IPrintInput, IPrintObject, IPrintTable, IPrintTableColumn } from '../../utils/pdf';
import {
  failedReasons,
  ManuallyEditedMissingTimePostfix,
  raceDistanceOptions,
  raceLightConditionOptions,
} from '../../utils/resultConstants';
import { FormatTime } from '../../utils/resultHelper';
import FormItem from '../formItems/FormItem';
import { SpinnerDiv, StyledTable } from '../styled/styled';
import TablePrintSettingButtons from '../tableSettings/TablePrintSettingButtons';

const StyledTable2 = styled.table`
  &&& {
    margin-top: 8px;
    margin-left: 8px;
  }
  &&& tr td {
    padding-right: 20px;
  }
`;

const StyledRow = styled.div`
  display: block;
  white-space: nowrap;
  width: 100%;
`;
const Col = styled.div`
  display: inline-block;
  margin-left: 5px;
  vertical-align: bottom;
`;

const columns = (
  t: TFunction,
  clubModel: IMobxClubModel,
  isIndividual: boolean
): IPrintTableColumn<IViewResult | IViewTeamResult>[] => {
  const cols: IPrintTableColumn<IViewResult | IViewTeamResult>[] = [];
  if (isIndividual) {
    cols.push({
      title: t('results.Date'),
      selected: true,
      dataIndex: 'raceDate',
      key: 'raceDate',
      fixed: 'left',
      width: 90,
    });
    cols.push({
      title: t('results.Name'),
      selected: true,
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 180,
      render: (id: string) => (id == null ? null : id),
    });
    cols.push({
      title: t('results.Club'),
      selected: false,
      dataIndex: 'organiserName',
      key: 'organiserName',
      fixed: 'left',
      width: 180,
      render: (id: string) => (id == null ? null : id),
    });
  } else {
    cols.push({
      title: t('results.Competitor'),
      selected: true,
      dataIndex: 'competitorId',
      key: 'competitorId',
      fixed: 'left',
      width: 180,
      render: (id: number) => (id == null ? null : clubModel.raceClubs?.selectedClub.competitorById(id)?.fullName),
    });
  }

  cols.push({
    title: t('results.Sport'),
    selected: false,
    dataIndex: 'sportCode',
    key: 'sportCode',
  });
  cols.push({
    title: t('results.EventClassification'),
    selected: false,
    dataIndex: 'eventClassificationId',
    key: 'eventClassificationId',
    render: (value: string, record) =>
      clubModel.raceClubs?.eventClassifications.find(
        (ec) =>
          ec.eventClassificationId ===
          (record.deviantEventClassificationId ? record.deviantEventClassificationId : value)
      )?.description,
  });
  cols.push({
    title: t('results.Class'),
    selected: true,
    dataIndex: 'className',
    key: 'className',
  });
  cols.push({
    title: t('results.Difficulty'),
    selected: false,
    dataIndex: 'difficulty',
    key: 'difficulty',
  });
  cols.push({
    title: t('results.LengthInMeter'),
    selected: true,
    dataIndex: 'lengthInMeter',
    key: 'lengthInMeter',
  });
  cols.push({
    title: t('results.Time'),
    selected: true,
    dataIndex: 'competitorTime',
    key: 'competitorTime',
    render: (value: string, record) =>
      record.failedReason != null
        ? record.failedReason.charAt(0).toUpperCase() + record.failedReason.substr(1).toLowerCase()
        : record.failedReason == null && value == null
        ? null
        : FormatTime(value),
  });
  cols.push({
    title: t('results.WinnerTime'),
    selected: true,
    dataIndex: 'winnerTime',
    key: 'winnerTime',
    render: (value: string) => FormatTime(value),
  });
  cols.push({
    title: t('results.SecondTime'),
    selected: false,
    dataIndex: 'secondTime',
    key: 'secondTime',
    render: (value: string) => (value ? FormatTime(value) : ''),
  });
  cols.push({
    title: t('results.Position'),
    selected: true,
    dataIndex: 'position',
    key: 'position',
  });
  cols.push({
    title: t('results.NofStartsInClass'),
    selected: true,
    dataIndex: 'nofStartsInClass',
    key: 'nofStartsInClass',
  });
  cols.push({
    title: t('results.MissingTime'),
    selected: true,
    dataIndex: 'missingTime',
    key: 'missingTime',
    render: (value) =>
      value?.substr(-5) === ManuallyEditedMissingTimePostfix ? FormatTime(value) + '*' : FormatTime(value),
  });
  cols.push({
    title: t('results.RankingLeague'),
    selected: true,
    dataIndex: 'ranking',
    key: 'ranking',
  });
  cols.push({
    title: t('results.RankingSpeedLeague'),
    selected: true,
    dataIndex: 'speedRanking',
    key: 'speedRanking',
  });
  cols.push({
    title: t('results.RankingTechnicalLeague'),
    selected: true,
    dataIndex: 'technicalRanking',
    key: 'technicalRanking',
  });
  cols.push({
    title: t('results.Points1000League'),
    selected: true,
    dataIndex: 'points1000',
    key: 'points1000',
  });

  return cols;
};

const resultsColumns = (t: TFunction, clubModel: IMobxClubModel): IPrintTableColumn<IViewResult>[] => [
  {
    title: t('results.PointsLeague'),
    selected: true,
    dataIndex: 'points',
    key: 'points',
  },
  {
    title: t('results.PointsOldLeague'),
    selected: false,
    dataIndex: 'pointsOld',
    key: 'pointsOld',
  },
  {
    title: t('results.Award'),
    selected: true,
    dataIndex: 'award',
    key: 'award',
  },
  {
    title: t('results.RaceLightCondition'),
    selected: false,
    dataIndex: 'raceLightCondition',
    key: 'raceLightCondition',
    render: (value) => raceLightConditionOptions(t).find((opt) => opt.code === value)?.description,
  },
  {
    title: t('results.OriginalFee'),
    selected: false,
    dataIndex: 'originalFee',
    key: 'originalFee',
  },
  {
    title: t('results.LateFee'),
    selected: false,
    dataIndex: 'lateFee',
    key: 'lateFee',
  },
  {
    title: t('results.FeeToClub'),
    selected: true,
    dataIndex: 'feeToClub',
    key: 'feeToClub',
  },
  {
    title: t('results.ServiceFeeToClub'),
    selected: true,
    dataIndex: 'serviceFeeToClub',
    key: 'serviceFeeToClub',
  },
  {
    title: t('calendar.Description'),
    selected: true,
    dataIndex: 'serviceFeeDescription',
    key: 'serviceFeeDescription',
  },
  {
    title: t('results.TotalFeeToClub'),
    selected: true,
    dataIndex: 'totalFeeToClub',
    key: 'totalFeeToClub',
    render: (_text, record) => record.feeToClub + record.serviceFeeToClub,
  },
];

const teamResultsColumns = (t: TFunction, clubModel: IMobxClubModel): IPrintTableColumn<IViewTeamResult>[] => [
  {
    title: t('results.Stage'),
    selected: true,
    dataIndex: 'stage',
    key: 'stage',
    render: (value, record) =>
      record.stage == null || record.totalStages == null
        ? null
        : `${record.stage} ${t('common.Of')} ${record.totalStages}`,
  },
  {
    title: t('results.DeltaPositions'),
    selected: true,
    dataIndex: 'deltaPositions',
    key: 'deltaPositions',
  },
  {
    title: t('results.DeltaTimeBehind'),
    selected: true,
    dataIndex: 'deltaTimeBehind',
    key: 'deltaTimeBehind',
    render: (value) => FormatTime(value),
  },
  {
    title: t('results.RaceLightCondition'),
    selected: false,
    dataIndex: 'raceLightCondition',
    key: 'raceLightCondition',
    render: (value, record) =>
      raceLightConditionOptions(t).find(
        (opt) => opt.code === (record.deviantRaceLightCondition ? record.deviantRaceLightCondition : value)
      )?.description,
  },
  {
    title: t('results.ServiceFeeToClub'),
    selected: true,
    dataIndex: 'serviceFeeToClub',
    key: 'serviceFeeToClub',
  },
  {
    title: t('results.ServiceFeeDescription'),
    selected: true,
    dataIndex: 'serviceFeeDescription',
    key: 'serviceFeeDescription',
  },
];

interface IViewResultsProps {
  isIndividual: boolean;
}

const ViewResults = observer(({ isIndividual }: IViewResultsProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [events, setEvents] = useState<IEventViewResultResponse[]>([]);
  const [result, setResult] = useState<IIndividualViewResultResponse | IClubViewResultResponse | undefined>();
  const [year, setYear] = useState(new Date().getFullYear());
  const [competitorId, setCompetitorId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const formId = useMemo(() => 'viewResultsForm' + Math.floor(Math.random() * 10000000000000000), []);
  const [columnsSetting, setColumnsSetting] = useState<IPrintSettingsColumn[]>([]);

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      {
        iType: 'CLUBS',
      },
      true,
      sessionModel.authorizationHeader
    )
      .then((clubsJson) => {
        clubModel.setRaceClubs(clubsJson);
        if (isIndividual) {
          setLoading(false);
        } else {
          updateEventYear(year);
        }
      })
      .catch((e) => {
        message.error(e.message);
      });
  }, []);

  const updateEventYear = useCallback(
    (newYear: number) => {
      const fromDate = moment(newYear, 'YYYY').format('YYYY-MM-DD');
      const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');

      setYear(newYear);

      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url) return;

      setLoading(true);

      PostJsonData(
        url,
        {
          iType: 'EVENTS',
          iFromDate: fromDate,
          iToDate: toDate,
        },
        true
      )
        .then((eventsJson: IEventViewResultResponse[]) => {
          setEvents(eventsJson.reverse());
          setResult(undefined);
          setLoading(false);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          setEvents([]);
          setResult(undefined);
          setLoading(false);
        });
    },
    [clubModel]
  );

  const updateEvent = useCallback(
    (eventId: number) => {
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      if (!url) return;

      setLoading(true);

      PostJsonData(url, { iType: 'EVENT', iEventId: eventId }, true, sessionModel.authorizationHeader)
        .then((eventJson: IClubViewResultResponse) => {
          setResult(eventJson);
          setLoading(false);
        })
        .catch((e) => {
          if (e && e.message) {
            message.error(e.message);
          }
          setResult(undefined);
          setLoading(false);
        });
    },
    [clubModel]
  );

  const updateCompetitor = useCallback(
    (newYear: number, newCompetitorId: number) => {
      setYear(newYear);
      setCompetitorId(newCompetitorId);

      if (newYear && newCompetitorId) {
        const fromDate = moment(newYear, 'YYYY').format('YYYY-MM-DD');
        const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');
        const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
        if (!url) return;

        setLoading(true);

        PostJsonData(
          url,
          { iType: 'COMPETITOR', iFromDate: fromDate, iToDate: toDate, iCompetitorId: newCompetitorId },
          true,
          sessionModel.authorizationHeader
        )
          .then((competitorJson: IIndividualViewResultResponse) => {
            setResult(competitorJson);
            setLoading(false);
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            setResult(undefined);
            setLoading(false);
          });
      }
    },
    [clubModel, sessionModel]
  );

  const getPrintObject = useCallback(
    (
      settings: IPrintSettings,
      printResult: IIndividualViewResultResponse | IClubViewResultResponse,
      printCompetitorId?: number
    ): IPrintObject<IViewResult | IViewTeamResult> => {
      if (!printResult || !clubModel.raceClubs)
        return {
          header: 'No data',
          inputs: [],
          tables: [],
        };

      let header = 'No data';
      const inputs: IPrintInput[] = [];
      const tables: IPrintTable<IViewResult | IViewTeamResult>[] = [];
      let nofStarts = 0;

      if (isIndividual && printCompetitorId) {
        const indResult = printResult as IIndividualViewResultResponse;
        header = `${t('modules.Results')} - ${
          clubModel.raceClubs?.selectedClub.competitorById(printCompetitorId)?.fullName
        } ${year}`;
        inputs.push({
          label: t('results.TotalFeeToClub'),
          value: (
            (indResult.results
              ? indResult.results.reduce((sum, obj) => (sum += obj.feeToClub + obj.serviceFeeToClub), 0)
              : 0) +
            (indResult.teamResults ? indResult.teamResults.reduce((sum, obj) => (sum += obj.serviceFeeToClub), 0) : 0)
          ).toString(),
        });
        nofStarts =
          (indResult.results
            ? indResult.results.reduce((sum, obj) => (sum += obj.failedReason !== failedReasons.NotStarted ? 1 : 0), 0)
            : 0) +
          (indResult.teamResults
            ? indResult.teamResults.reduce(
                (sum, obj) => (sum += obj.failedReason !== failedReasons.NotStarted ? 1 : 0),
                0
              )
            : 0);
      } else if (!isIndividual) {
        const clubResult = printResult as IClubViewResultResponse;
        header = `${t('modules.Results')} - ${clubResult.raceDate} ${clubResult.name}`;
        inputs.push({ label: t('results.Club'), value: clubResult.organiserName ?? '' });
        inputs.push({
          label: t('results.RaceLightCondition'),
          value:
            raceLightConditionOptions(t).find((opt) => opt.code === clubResult.raceLightCondition)?.description ?? '',
        });
        inputs.push({
          label: t('results.RaceDistance'),
          value: raceDistanceOptions(t).find((opt) => opt.code === clubResult.raceDistance)?.description ?? '',
        });
        inputs.push({
          label: t('results.EventClassification'),
          value:
            clubModel.raceClubs.eventClassificationOptions.find((opt) => opt.code === clubResult.eventClassificationId)
              ?.description ?? '',
        });
        inputs.push({
          label: t('results.Sport'),
          value: clubModel.raceClubs.sportOptions.find((opt) => opt.code === clubResult.sportCode)?.description ?? '',
        });
        nofStarts =
          (clubResult.results
            ? clubResult.results.reduce((sum, obj) => (sum += obj.failedReason !== failedReasons.NotStarted ? 1 : 0), 0)
            : 0) +
          (clubResult.teamResults
            ? clubResult.teamResults.reduce(
                (sum, obj) => (sum += obj.failedReason !== failedReasons.NotStarted ? 1 : 0),
                0
              )
            : 0);
      }

      inputs.push({
        label: t('results.TotalNofStarts'),
        value: nofStarts.toString(),
      });

      if (Array.isArray(printResult?.results) && printResult.results.length > 0) {
        tables.push({
          columns: [
            ...columns(t, clubModel, isIndividual),
            ...(resultsColumns(t, clubModel) as IPrintTableColumn<IViewResult | IViewTeamResult>[]),
          ].filter((col) => settings.pdf.columns.some((s) => col.key === s.key && s.selected)),
          dataSource: printResult.results as (IViewResult | IViewTeamResult)[],
        });
      }
      if (Array.isArray(printResult?.teamResults) && printResult.teamResults.length > 0) {
        tables.push({
          columns: [
            ...columns(t, clubModel, isIndividual),
            ...(teamResultsColumns(t, clubModel) as IPrintTableColumn<IViewResult | IViewTeamResult>[]),
          ].filter((col) => settings.pdf.columns.some((s) => col.key === s.key && s.selected)),
          dataSource: printResult.teamResults as (IViewResult | IViewTeamResult)[],
        });
      }

      return { header, inputs, tables };
    },
    [t, clubModel, isIndividual, year]
  );

  const onPrint = useCallback(
    (settings: IPrintSettings): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!result || !clubModel.corsProxy) {
          resolve();
          return;
        }
        const printObject = getPrintObject(settings, result, competitorId);
        getPdf(clubModel.corsProxy, clubModel.logo.url, printObject.header, [printObject], settings.pdf)
          .then(resolve)
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            reject();
          });
      });
    },
    [clubModel, getPrintObject, result, competitorId]
  );

  const onPrintAll = useCallback(
    (settings: IPrintSettings, allInOnePdf: boolean): Promise<void> => {
      const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
      let resultPromisies: Promise<IIndividualViewResultResponse | IClubViewResultResponse>[] = [];
      let competitorsOptions: INumberOption[] = [];

      if (!url || !clubModel.raceClubs) return new Promise<void>((resolve) => resolve());

      if (isIndividual) {
        const fromDate = moment(year, 'YYYY').format('YYYY-MM-DD');
        const toDate = moment(fromDate, 'YYYY-MM-DD').add(1, 'years').subtract(1, 'days').format('YYYY-MM-DD');
        competitorsOptions = clubModel.raceClubs.selectedClub.competitorsOptions;

        resultPromisies = competitorsOptions.map(
          (option) =>
            PostJsonData(
              url,
              { iType: 'COMPETITOR', iFromDate: fromDate, iToDate: toDate, iCompetitorId: option.code },
              true,
              sessionModel.authorizationHeader
            ) as Promise<IIndividualViewResultResponse>
        );
      } else {
        resultPromisies = events
          .slice()
          .reverse()
          .map(
            (event) =>
              PostJsonData(
                url,
                { iType: 'EVENT', iEventId: event.eventId },
                true,
                sessionModel.authorizationHeader
              ) as Promise<IClubViewResultResponse>
          );
      }

      return new Promise((resolve, reject) => {
        Promise.all(resultPromisies)
          .then((resultJsons: (IIndividualViewResultResponse | IClubViewResultResponse)[]) => {
            if (!clubModel.corsProxy) {
              resolve();
              return;
            }

            const printObjects = resultJsons
              .filter((printResult) => printResult && (printResult.results?.length || printResult.teamResults?.length))
              .map((printResult, index) => {
                let printCompetitorId: number | undefined;
                if (isIndividual) {
                  printCompetitorId = printResult.results.length
                    ? printResult.results[0].competitorId
                    : printResult.teamResults[0].competitorId;
                }
                return getPrintObject(settings, printResult, printCompetitorId);
              });

            if (allInOnePdf) {
              getPdf(
                clubModel.corsProxy,
                clubModel.logo.url,
                `${t(isIndividual ? 'results.Individual' : 'results.Latest')} ${year}`,
                printObjects,
                settings.pdf
              )
                .then(resolve)
                .catch((e) => {
                  if (e && e.message) {
                    message.error(e.message);
                  }
                  reject();
                });
            } else {
              getZip(
                clubModel.corsProxy,
                clubModel.logo.url,
                `${t(isIndividual ? 'results.Individual' : 'results.Latest')} ${year}`,
                printObjects,
                settings.pdf
              )
                .then(resolve)
                .catch((e) => {
                  if (e && e.message) {
                    message.error(e.message);
                  }
                  reject();
                });
            }
          })
          .catch((e) => {
            if (e && e.message) {
              message.error(e.message);
            }
            reject();
          });
      });
    },
    [t, clubModel, sessionModel, isIndividual, year, events, getPrintObject]
  );

  const Spinner = (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  );
  const fromYear = 1994;
  const currentYear = new Date().getFullYear();
  const yearOptions: IOption[] = [...Array(1 + currentYear - fromYear)].map((_, i) => ({
    code: (currentYear - i).toString(),
    description: (currentYear - i).toString(),
  }));
  const eventOptions: IOption[] = events.map((option) => ({
    code: option.eventId,
    description: `${option.date}, ${option.name}`,
  }));
  const clubResult = !isIndividual && result ? (result as IClubViewResultResponse) : undefined;

  return (
    <Form
      id={formId}
      layout="vertical"
      initialValues={{
        Year: year,
      }}
    >
      <StyledRow>
        <Col>
          <FormItem name="Year" label={t('calendar.SelectYear')}>
            <FormSelect
              disabled={loading}
              style={{ width: 80 }}
              options={yearOptions}
              onChange={(value) => (isIndividual ? updateCompetitor(value, competitorId) : updateEventYear(value))}
            />
          </FormItem>
        </Col>
        <Col style={{ width: 'calc(100% - 252px)' }}>
          {isIndividual ? (
            <FormItem name="Competitor" label={t('results.Competitor')}>
              <FormSelect
                disabled={loading}
                style={{ maxWidth: 600, width: '100%' }}
                dropdownMatchSelectWidth={false}
                options={loading || !clubModel.raceClubs ? [] : clubModel.raceClubs.selectedClub.competitorsOptions}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => option?.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={(competitorId) => updateCompetitor(year, competitorId)}
              />
            </FormItem>
          ) : (
            <FormItem name="Club" label={t('results.Step1ChooseRace')}>
              <FormSelect
                disabled={loading}
                style={{ maxWidth: 600, width: '100%' }}
                dropdownMatchSelectWidth={false}
                options={eventOptions}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => option?.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={(eventId) => updateEvent(eventId)}
              />
            </FormItem>
          )}
        </Col>
        <Col>
          <TablePrintSettingButtons
            localStorageName="results"
            columns={[
              ...columns(t, clubModel, isIndividual),
              ...resultsColumns(t, clubModel),
              ...teamResultsColumns(t, clubModel),
            ].filter((col, idx, arr) => arr.findIndex((c) => c.key === col.key) === idx)}
            disablePrint={loading || !result}
            disablePrintAll={loading}
            onPrint={onPrint}
            onPrintAll={onPrintAll}
            onTableColumns={(newColumnsSetting) => setColumnsSetting(newColumnsSetting)}
          />
        </Col>
      </StyledRow>
      {!loading && competitorId && result && isIndividual ? (
        <StyledTable2>
          <tr>
            <td>
              <b>{t('results.Competitor')}:</b>
            </td>
            <td>{clubModel.raceClubs?.selectedClub.competitorById(competitorId)?.fullName}</td>
            <td>
              <b>{t('calendar.Year')}:</b>
            </td>
            <td>{year}</td>
          </tr>
          <tr>
            <td>
              <b>{t('results.TotalFeeToClub')}:</b>
            </td>
            <td>
              {(result.results
                ? (result.results as { feeToClub: number; serviceFeeToClub: number }[]).reduce(
                    (sum, obj) => (sum += obj.feeToClub + obj.serviceFeeToClub),
                    0
                  )
                : 0) +
                (result.teamResults
                  ? (result.teamResults as { serviceFeeToClub: number }[]).reduce(
                      (sum, obj) => (sum += obj.serviceFeeToClub),
                      0
                    )
                  : 0)}
            </td>
          </tr>
        </StyledTable2>
      ) : null}
      {!loading && clubResult && !isIndividual ? (
        <StyledTable2>
          <tr>
            <td>
              <b>{t('results.Club')}:</b>
            </td>
            <td>{clubResult.organiserName}</td>
            <td>
              <b>{t('results.Name')}:</b>
            </td>
            <td>{clubResult.name}</td>
          </tr>
          <tr>
            <td>
              <b>{t('results.Date')}:</b>
            </td>
            <td>{clubResult.raceDate}</td>
            <td>
              <b>{t('results.RaceLightCondition')}:</b>
            </td>
            <td>
              {raceLightConditionOptions(t).find((opt) => opt.code === clubResult.raceLightCondition)?.description}
            </td>
          </tr>
          <tr>
            <td>
              <b>{t('results.RaceDistance')}:</b>
            </td>
            <td>{raceDistanceOptions(t).find((opt) => opt.code === clubResult.raceDistance)?.description}</td>
            <td>
              <b>{t('results.EventClassification')}:</b>
            </td>
            <td>
              {
                clubModel.raceClubs?.eventClassificationOptions.find(
                  (opt) => opt.code === clubResult.eventClassificationId
                )?.description
              }
            </td>
          </tr>
          <tr>
            <td>
              <b>{t('results.Sport')}:</b>
            </td>
            <td>{clubModel.raceClubs?.sportOptions.find((opt) => opt.code === clubResult.sportCode)?.description}</td>
          </tr>
        </StyledTable2>
      ) : null}
      {!loading && result && result.results?.length ? (
        <StyledTable
          columns={
            [...columns(t, clubModel, isIndividual), ...resultsColumns(t, clubModel)].filter((col) =>
              columnsSetting.some((s) => col.key === s.key && s.selected)
            ) as IPrintTableColumn<any>[]
          }
          dataSource={result.results}
          size="middle"
          pagination={false}
          scroll={{ x: true }}
        />
      ) : loading ? (
        Spinner
      ) : null}
      {!loading && result && result.teamResults?.length ? (
        <StyledTable
          columns={
            [...columns(t, clubModel, isIndividual), ...teamResultsColumns(t, clubModel)].filter((col) =>
              columnsSetting.some((s) => col.key === s.key && s.selected)
            ) as IPrintTableColumn<any>[]
          }
          dataSource={result.teamResults}
          size="middle"
          pagination={false}
          scroll={{ x: true }}
        />
      ) : null}
    </Form>
  );
});

export default ViewResults;
