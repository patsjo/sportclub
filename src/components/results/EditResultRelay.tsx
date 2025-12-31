import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { IRaceTeamResult, IRaceTeamResultProps } from '../../models/resultModel';
import { IRaceWizard } from '../../models/resultWizardModel';
import { ISessionModel } from '../../models/sessionModel';
import { INumberOption, errorRequiredField, hasErrors, timeFormat } from '../../utils/formHelper';
import {
  DifficultyTypes,
  EventClassificationIdTypes,
  LightConditionTypes,
  ManuallyEditedMissingTimePostfix,
  difficulties,
  failedReasonOptions,
  failedReasons,
  raceLightConditionOptions
} from '../../utils/resultConstants';
import { GetClassClassificationId, GetClassLevel, GetClassShortName } from '../../utils/resultHelper';
import FormItem from '../formItems/FormItem';
import { FormSelect } from '../formItems/FormSelect';
import InputTime, { stringToMilliSeconds } from '../formItems/InputTime';
import { StyledIcon } from '../styled/styled';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';

interface IColorOptionContentProps {
  background: string;
}
const ColorOptionContent = styled.div<IColorOptionContentProps>`
  background: ${props => props.background};
  height: 18px;
  width: 30px;
  border: black 1px solid;
  margin-top: 6px;
`;

export interface IExtendedRaceTeamResult extends IRaceTeamResultProps {
  stageText: string;
}

interface IRaceTeamResultForm extends Omit<IExtendedRaceTeamResult, 'competitorId' | 'stage'> {
  competitorId: number | undefined;
  stage: number | null;
  raceLightCondition: LightConditionTypes | undefined;
  eventClassificationId: EventClassificationIdTypes;
}

interface IEditResultRelayProps {
  clubModel: IMobxClubModel;
  sessionModel: ISessionModel;
  raceWizardModel: IRaceWizard;
  eventClassificationId: EventClassificationIdTypes;
  raceLightCondition?: LightConditionTypes;
  result: IExtendedRaceTeamResult;
  results: IRaceTeamResult[];
  competitorsOptions: INumberOption[];
  autoUpdateResultWithSameClass: boolean;
  onChange: (changes: Partial<IExtendedRaceTeamResult>) => void;
  onChangeAll: (changes: Partial<IExtendedRaceTeamResult>) => void;
  onValidate: (valid: boolean) => void;
}
const EditResultRelay = ({
  clubModel,
  sessionModel,
  raceWizardModel,
  eventClassificationId,
  raceLightCondition,
  result,
  results,
  competitorsOptions,
  autoUpdateResultWithSameClass,
  onChange,
  onChangeAll,
  onValidate
}: IEditResultRelayProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<IRaceTeamResultForm>();
  // eslint-disable-next-line react-hooks/purity
  const formId = useMemo(() => 'editResultRelay' + Math.floor(Math.random() * 1000000000000000), []);
  const [failedReason, setFailedReason] = useState(result.failedReason);
  const [teamFailedReason, setTeamFailedReason] = useState(result.teamFailedReason);
  const { raceClubs } = clubModel;
  const [modal, contextHolder] = Modal.useModal();
  const initialValues: IRaceTeamResultForm = useMemo(
    () => ({
      ...result,
      competitorId: result.competitorId == null || result.competitorId === -1 ? undefined : result.competitorId,
      classClassificationId: result.classClassificationId == null ? undefined : result.classClassificationId,
      missingTime: result.missingTime != null ? result.missingTime.substring(0, 8) : null,
      stage: result.stage > 0 ? result.stage : null,
      raceLightCondition: raceLightCondition,
      eventClassificationId: eventClassificationId
    }),
    [eventClassificationId, raceLightCondition, result]
  );

  useEffect(() => {
    setTimeout(() => {
      if (form) hasErrors(form).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [form, onValidate]);

  return raceClubs ? (
    <Form
      form={form}
      id={formId}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={() => hasErrors(form).then(notValid => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={12}>
          <FormItem
            name="competitorId"
            label={t('results.Competitor')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Competitor')
              }
            ]}
          >
            <FormSelect
              showSearch={{
                optionFilterProp: 'children',
                filterOption: (input, option) =>
                  option!.label!.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
              }}
              disabled={true}
              options={competitorsOptions}
              onChange={(code: number) => {
                onChange({ competitorId: code == null ? -1 : code });
              }}
            />
          </FormItem>
        </Col>
        <Col span={1} style={{ paddingTop: 28 }}>
          <StyledIcon
            type="edit"
            onClick={() => {
              if (raceClubs.selectedClub)
                AddMapCompetitorConfirmModal(
                  t,
                  modal,
                  result.competitorId,
                  undefined,
                  {
                    iType: 'COMPETITOR',
                    iFirstName: null,
                    iLastName: null,
                    iGender: null,
                    iBirthDay: null,
                    iClubId: raceClubs.selectedClub.clubId,
                    iStartDate: '1930-01-01',
                    iEndDate: null,
                    iEventorCompetitorId: null
                  },
                  result.className,
                  clubModel,
                  sessionModel
                )
                  .then(competitor => {
                    if (!competitor) return;
                    const changes: Partial<IExtendedRaceTeamResult> = {
                      competitorId: competitor.competitorId
                    };
                    onChange(changes);
                    form.setFieldsValue(changes);
                    form.validateFields(['competitorId']);
                  })
                  .catch(error => {
                    console.error(error);
                  });
            }}
          />
        </Col>
        <Col span={11}>
          <FormItem
            name="teamName"
            label={t('results.TeamName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.TeamName')
              }
            ]}
          >
            <Input
              onChange={e => {
                onChange({ teamName: e.currentTarget.value });
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={4}>
          <FormItem
            name="className"
            label={t('results.Class')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Class')
              }
            ]}
          >
            <Input
              onChange={e => {
                const changes: Partial<IExtendedRaceTeamResult> = {
                  className: e.currentTarget.value
                };
                const shortClassName = GetClassShortName(changes.className);
                const classLevel = GetClassLevel(raceClubs.classLevels, shortClassName);
                changes.classClassificationId = GetClassClassificationId(
                  result.deviantEventClassificationId
                    ? (result.deviantEventClassificationId as EventClassificationIdTypes)
                    : eventClassificationId,
                  classLevel,
                  raceClubs.eventClassifications
                );
                changes.difficulty = classLevel ? classLevel.difficulty : null;
                onChange(changes);
                form.setFieldsValue(changes);
                const resultWithSameClass = results.find(
                  r =>
                    r.className === changes.className &&
                    r.failedReason == null &&
                    r.teamResultId !== result.teamResultId &&
                    r.classClassificationId != null &&
                    r.difficulty != null
                );
                if (resultWithSameClass && autoUpdateResultWithSameClass) {
                  changes.classClassificationId = resultWithSameClass.classClassificationId;
                  changes.totalStages = resultWithSameClass.totalStages;
                  changes.nofStartsInClass = resultWithSameClass.nofStartsInClass;
                  changes.totalNofStartsInClass = resultWithSameClass.totalNofStartsInClass;
                  changes.deviantEventClassificationId = resultWithSameClass.deviantEventClassificationId;
                  onChange(changes);
                  form.setFieldsValue(changes);
                  form.validateFields([
                    'classClassificationId',
                    'difficulty',
                    'lengthInMeter',
                    'nofStartsInClass',
                    'totalStages',
                    'totalNofStartsInClass',
                    'deviantEventClassificationId'
                  ]);
                }
                const resultWithSameClassAndTeam = results.find(
                  r =>
                    r.className === changes.className &&
                    r.teamName === result.teamName &&
                    r.failedReason == null &&
                    r.teamResultId !== result.teamResultId &&
                    r.classClassificationId != null &&
                    r.difficulty != null &&
                    r.teamName != null
                );
                if (resultWithSameClassAndTeam && autoUpdateResultWithSameClass) {
                  changes.teamFailedReason = resultWithSameClassAndTeam.teamFailedReason;
                  changes.totalPosition = resultWithSameClassAndTeam.totalPosition;
                  changes.totalTimeBehind = resultWithSameClassAndTeam.totalTimeBehind;
                  changes.serviceFeeToClub = resultWithSameClassAndTeam.serviceFeeToClub;
                  changes.serviceFeeDescription = resultWithSameClassAndTeam.serviceFeeDescription;
                  onChange(changes);
                  form.setFieldsValue(changes);
                  form.validateFields([
                    'classClassificationId',
                    'difficulty',
                    'teamFailedReason',
                    'totalPosition',
                    'totalTimeBehind',
                    'serviceFeeToClub',
                    'serviceFeeDescription'
                  ]);
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem
            name="stage"
            label={t('results.Stage')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Stage')
              }
            ]}
          >
            <InputNumber
              min={1}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                const changes: Partial<IExtendedRaceTeamResult> = {
                  stage: value as number
                };
                onChange(changes);
                form.setFieldsValue(changes);
                form.validateFields(['totalStages']);
                const resultWithSameClass = results.find(
                  r =>
                    r.className === result.className &&
                    r.stage === changes.stage &&
                    r.failedReason == null &&
                    r.teamResultId !== result.teamResultId &&
                    r.classClassificationId != null &&
                    r.difficulty != null
                );
                if (resultWithSameClass && autoUpdateResultWithSameClass) {
                  changes.difficulty = resultWithSameClass.difficulty;
                  changes.lengthInMeter = resultWithSameClass.lengthInMeter;
                  changes.winnerTime = resultWithSameClass.winnerTime;
                  changes.secondTime = resultWithSameClass.secondTime;
                  changes.nofStartsInClass = resultWithSameClass.nofStartsInClass;
                  changes.deviantRaceLightCondition = resultWithSameClass.deviantRaceLightCondition;
                  onChange(changes);
                  form.setFieldsValue(changes);
                  form.validateFields([
                    'difficulty',
                    'lengthInMeter',
                    'winnerTime',
                    'secondTime',
                    'nofStartsInClass',
                    'deviantRaceLightCondition'
                  ]);
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="classClassificationId"
            label={t('results.ClassClassification')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.ClassClassification')
              }
            ]}
          >
            <FormSelect
              allowClear={true}
              options={
                raceClubs.classClassificationOptions(
                  result.deviantEventClassificationId
                    ? (result.deviantEventClassificationId as EventClassificationIdTypes)
                    : eventClassificationId
                ) ?? []
              }
              onChange={code => {
                const changes: Partial<IExtendedRaceTeamResult> = {
                  classClassificationId: code == null ? undefined : parseInt(code)
                };
                onChange(changes);
                form.setFieldsValue(changes);
                if (autoUpdateResultWithSameClass) {
                  onChangeAll(changes);
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem
            name="difficulty"
            label={t('results.Difficulty')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Difficulty')
              }
            ]}
          >
            <Select
              allowClear={true}
              options={[
                {
                  value: difficulties.green,
                  label: <ColorOptionContent background="green" />
                },
                {
                  value: difficulties.white,
                  label: <ColorOptionContent background="white" />
                },
                {
                  value: difficulties.yellow,
                  label: <ColorOptionContent background="yellow" />
                },
                {
                  value: difficulties.orange,
                  label: <ColorOptionContent background="orange" />
                },
                {
                  value: difficulties.red,
                  label: <ColorOptionContent background="red" />
                },
                {
                  value: difficulties.purple,
                  label: <ColorOptionContent background="purple" />
                },
                {
                  value: difficulties.blue,
                  label: <ColorOptionContent background="blue" />
                },
                {
                  value: difficulties.black,
                  label: <ColorOptionContent background="black" />
                }
              ]}
              onChange={(code: DifficultyTypes) => {
                onChange({ difficulty: code });
                const raceWinnerResult = raceWizardModel.raceWinnerResults.find(
                  wr => wr.className === `${result.className} - ${result.stage}`
                );
                if (raceWinnerResult && code) raceWinnerResult.setDifficulty(code);
                if (
                  !raceWinnerResult &&
                  result.className &&
                  result.stage &&
                  result.lengthInMeter &&
                  result.winnerTime?.length === timeFormat.length
                )
                  raceWizardModel.addRaceWinnerResult({
                    id: raceWizardModel.raceWinnerResults.length,
                    personName: 'Unknown',
                    className: `${result.className} - ${result.stage}`,
                    difficulty: code,
                    lengthInMeter: result.lengthInMeter,
                    winnerTime: result.winnerTime
                  });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ difficulty: code });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="lengthInMeter"
            label={t('results.LengthInMeter')}
            rules={[
              {
                required: failedReason !== failedReasons.NotStarted,
                message: errorRequiredField(t, 'results.LengthInMeter')
              }
            ]}
          >
            <InputNumber
              min={10}
              max={100000}
              step={100}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                onChange({ lengthInMeter: value });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ lengthInMeter: value });
                }
                const raceWinnerResult = raceWizardModel.raceWinnerResults.find(
                  wr => wr.className === `${result.className} - ${result.stage}`
                );
                if (raceWinnerResult && value) raceWinnerResult.setLengthInMeter(value);
                if (
                  !raceWinnerResult &&
                  result.className &&
                  result.stage &&
                  value &&
                  result.winnerTime?.length === timeFormat.length
                )
                  raceWizardModel.addRaceWinnerResult({
                    id: raceWizardModel.raceWinnerResults.length,
                    personName: 'Unknown',
                    className: `${result.className} - ${result.stage}`,
                    difficulty: result.difficulty,
                    lengthInMeter: value,
                    winnerTime: result.winnerTime
                  });
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem name="failedReason" label={t('results.FailedReason')}>
            <FormSelect
              allowClear={true}
              options={failedReasonOptions(t)}
              onChange={code => {
                onChange({ failedReason: code });
                setFailedReason(code);
                form.validateFields([
                  'lengthInMeter',
                  'competitorTime',
                  'winnerTime',
                  'secondTime',
                  'position',
                  'nofStartsInClass'
                ]);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="competitorTime"
            label={t('results.Time')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.Time')
              }
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={time => {
                onChange({ competitorTime: time });
                form.validateFields(['winnerTime']);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="winnerTime"
            label={t('results.WinnerTime')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.WinnerTime')
              },
              {
                validator: (rule, value, callback) => {
                  const competitorTime = stringToMilliSeconds(form.getFieldValue('competitorTime'), timeFormat);
                  const winnerTime = stringToMilliSeconds(value, timeFormat);
                  if (competitorTime > 0 && winnerTime > 0 && competitorTime < winnerTime) {
                    callback(t('results.WinnerTimeLessOrEqualThanTime') ?? undefined);
                  }
                  callback();
                }
              }
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={time => {
                onChange({ winnerTime: time });
                const raceWinnerResult = raceWizardModel.raceWinnerResults.find(
                  wr => wr.className === `${result.className} - ${result.stage}`
                );
                if (raceWinnerResult && result.lengthInMeter) raceWinnerResult.setLengthInMeter(result.lengthInMeter);
                if (raceWinnerResult && time?.length === timeFormat.length) raceWinnerResult.setWinnerTime(time);
                if (
                  !raceWinnerResult &&
                  result.className &&
                  result.stage &&
                  result.lengthInMeter &&
                  time?.length === timeFormat.length
                )
                  raceWizardModel.addRaceWinnerResult({
                    id: raceWizardModel.raceWinnerResults.length,
                    personName: 'Unknown',
                    className: `${result.className} - ${result.stage}`,
                    difficulty: result.difficulty,
                    lengthInMeter: result.lengthInMeter,
                    winnerTime: time
                  });
                form.validateFields(['secondTime']);
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ winnerTime: time });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="secondTime"
            label={t('results.SecondTime')}
            rules={[
              {
                validator: (rule, value, callback) => {
                  const winnerTime = stringToMilliSeconds(form.getFieldValue('winnerTime'), timeFormat);
                  const secondTime = stringToMilliSeconds(value, timeFormat);
                  if (winnerTime > 0 && secondTime > 0 && secondTime < winnerTime) {
                    callback(t('results.SecondTimeGreaterOrEqualThanWinnerTime') ?? undefined);
                  }
                  callback();
                }
              }
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={time => {
                onChange({ secondTime: time });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ secondTime: time });
                }
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem
            name="position"
            label={t('results.Position')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.Position')
              }
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                onChange({ position: value });
                form.validateFields(['nofStartsInClass']);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="nofStartsInClass"
            label={t('results.NofStartsInClass')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.NofStartsInClass')
              },
              {
                validator: (rule, value, callback) => {
                  const position = form.getFieldValue('position');
                  if (position && value && value < position) {
                    callback(t('results.PositionGreaterThanStarts') ?? undefined);
                  }
                  callback();
                }
              }
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                onChange({ nofStartsInClass: value });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ nofStartsInClass: value });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="totalStages"
            label={t('results.TotalStages')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.TotalStages')
              },
              {
                validator: (rule, value, callback) => {
                  const stage = form.getFieldValue('stage');
                  if (stage && value && value < stage) {
                    callback(t('results.StageGreaterThanTotalStages') ?? undefined);
                  }
                  callback();
                }
              }
            ]}
          >
            <InputNumber
              min={1}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                onChange({ totalStages: value as number });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ totalStages: value as number });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="missingTime" label={t('results.MissingTime')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={time =>
                onChange({ missingTime: time != null ? `${time}${ManuallyEditedMissingTimePostfix}` : null })
              }
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem name="deltaPositions" label={t('results.DeltaPositions')}>
            <InputNumber
              min={-1000}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => onChange({ deltaPositions: value })}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="deltaTimeBehind" label={t('results.DeltaTimeBehind')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              allowNegativeTime={true}
              style={{ width: '100%' }}
              onChange={time => onChange({ deltaTimeBehind: time })}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="totalStagePosition" label={t('results.TotalStagePosition')}>
            <InputNumber
              min={-1000}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => onChange({ totalStagePosition: value })}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="totalStageTimeBehind" label={t('results.TotalStageTimeBehind')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              allowNegativeTime={true}
              style={{ width: '100%' }}
              onChange={time => onChange({ totalStageTimeBehind: time })}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem name="teamFailedReason" label={t('results.TeamFailedReason')}>
            <FormSelect
              allowClear={true}
              options={failedReasonOptions(t)}
              onChange={code => {
                onChange({ teamFailedReason: code });
                setTeamFailedReason(code);
                form.validateFields(['totalTimeBehind', 'totalPosition', 'totalNofStartsInClass']);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="totalPosition"
            label={t('results.TotalPosition')}
            rules={[
              {
                required: !teamFailedReason,
                message: errorRequiredField(t, 'results.TotalPosition')
              }
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                onChange({ totalPosition: value });
                form.validateFields(['totalNofStartsInClass']);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="totalNofStartsInClass"
            label={t('results.TotalNofStartsInClass')}
            rules={[
              {
                required: !teamFailedReason,
                message: errorRequiredField(t, 'results.TotalNofStartsInClass')
              },
              {
                validator: (rule, value, callback) => {
                  const totalPosition = form.getFieldValue('totalPosition');
                  if (totalPosition && value && value < totalPosition) {
                    callback(t('results.PositionGreaterThanStarts') ?? undefined);
                  }
                  callback();
                }
              }
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                onChange({ totalNofStartsInClass: value });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ totalNofStartsInClass: value });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="totalTimeBehind"
            label={t('results.TotalTimeBehind')}
            rules={[
              {
                required: !teamFailedReason,
                message: errorRequiredField(t, 'results.TotalTimeBehind')
              }
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              allowNegativeTime={true}
              style={{ width: '100%' }}
              onChange={time => onChange({ totalTimeBehind: time })}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={4}>
          <FormItem name="raceLightCondition" label={t('results.RaceLightCondition')}>
            <FormSelect disabled={true} options={raceLightConditionOptions(t)} />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="deviantRaceLightCondition" label={t('results.DeviantRaceLightCondition')}>
            <FormSelect
              allowClear={true}
              options={raceLightConditionOptions(t)}
              onChange={code => onChange({ deviantRaceLightCondition: code })}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="eventClassificationId" label={t('results.EventClassification')}>
            <FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="deviantEventClassificationId" label={t('results.DeviantEventClassification')}>
            <FormSelect
              popupMatchSelectWidth={false}
              allowClear={true}
              options={raceClubs.eventClassificationOptions.map(option => ({
                ...option,
                disabled: option.code === eventClassificationId
              }))}
              onChange={code => {
                const changes: Partial<IExtendedRaceTeamResult> = {
                  deviantEventClassificationId: code
                };
                const shortClassName = GetClassShortName(result.className);
                const classLevel = GetClassLevel(raceClubs.classLevels, shortClassName);
                changes.classClassificationId = GetClassClassificationId(
                  code ? code : eventClassificationId,
                  classLevel,
                  raceClubs.eventClassifications
                );
                onChange(changes);
                form.setFieldsValue(changes);
                form.validateFields(['classClassificationId']);
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem
            name="serviceFeeToClub"
            label={t('results.ServiceFeeToClub')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.ServiceFeeToClub')
              }
            ]}
          >
            <InputNumber
              min={0}
              max={100000}
              step={5}
              precision={2}
              decimalSeparator=","
              style={{ width: '100%' }}
              onChange={(value: number | null) => onChange({ serviceFeeToClub: value })}
            />
          </FormItem>
        </Col>
        <Col span={18}>
          <FormItem name="serviceFeeDescription" label={t('results.ServiceFeeDescription')}>
            <Input
              style={{ width: '100%' }}
              onChange={e => onChange({ serviceFeeDescription: e.currentTarget.value })}
            />
          </FormItem>
        </Col>
      </Row>
      {contextHolder}
    </Form>
  ) : null;
};

export default EditResultRelay;
