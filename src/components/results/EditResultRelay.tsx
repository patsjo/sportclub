import { Col, Form, Input, InputNumber, Row, Select } from 'antd';
import InputTime, { stringToMilliSeconds } from 'components/formItems/InputTime';
import { IMobxClubModel } from 'models/mobxClubModel';
import { IRaceTeamResult, IRaceTeamResultProps } from 'models/resultModel';
import { IRaceWizard } from 'models/resultWizardModel';
import { ISessionModel } from 'models/sessionModel';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { errorRequiredField, FormSelect, hasErrors, INumberOption, timeFormat } from '../../utils/formHelper';
import {
  difficulties,
  DifficultyTypes,
  EventClassificationIdTypes,
  failedReasonOptions,
  failedReasons,
  LightConditionTypes,
  ManuallyEditedMissingTimePostfix,
  raceLightConditionOptions,
} from '../../utils/resultConstants';
import { GetClassClassificationId } from '../../utils/resultHelper';
import FormItem from '../formItems/FormItem';
import { StyledIcon } from '../styled/styled';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';

const { Option } = Select;

interface IColorOptionContentProps {
  background: string;
}
const ColorOptionContent = styled.div<IColorOptionContentProps>`
  background: ${(props) => props.background};
  height: 18px;
  width: 30px;
  border: black 1px solid;
  margin-top: 6px;
`;

export interface IExtendedRaceTeamResult extends IRaceTeamResultProps {
  stageText: string;
}
interface IEditResultRelayProps {
  clubModel: IMobxClubModel;
  sessionModel: ISessionModel;
  raceWizardModel: IRaceWizard;
  eventClassificationId: EventClassificationIdTypes;
  raceLightCondition: LightConditionTypes;
  result: IExtendedRaceTeamResult;
  results: IRaceTeamResult[];
  competitorsOptions: INumberOption[];
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
  onValidate,
}: IEditResultRelayProps) => {
  const { t } = useTranslation();
  const formRef = useRef<any>(null);
  const formId = useMemo(() => 'editResultRelay' + Math.floor(Math.random() * 1000000000000000), []);
  const [failedReason, setFailedReason] = useState(result.failedReason);
  const { raceClubs } = clubModel;

  useEffect(() => {
    setTimeout(() => {
      formRef.current && hasErrors(formRef.current).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [formRef.current]);

  return raceClubs ? (
    <Form
      id={formId}
      ref={formRef}
      layout="vertical"
      initialValues={{
        iCompetitorId: !result.competitorId || result.competitorId === -1 ? undefined : result.competitorId,
        iTeamName: result.teamName,
        iClassName: result.className,
        iClassClassificationId: !result.classClassificationId ? undefined : result.classClassificationId.toString(),
        iDifficulty: result.difficulty,
        iLengthInMeter: result.lengthInMeter,
        iFailedReason: result.failedReason,
        iCompetitorTime: result.competitorTime,
        iWinnerTime: result.winnerTime,
        iSecondTime: result.secondTime,
        iMissingTime: result.missingTime != null ? result.missingTime.substr(0, 8) : null,
        iPosition: result.position,
        iNofStartsInClass: result.nofStartsInClass,
        iStage: result.stage,
        iTotalStages: result.totalStages,
        iDeltaPositions: result.deltaPositions,
        iDeltaTimeBehind: result.deltaTimeBehind,
        iTotalStagePosition: result.totalStagePosition,
        iTotalStageTimeBehind: result.totalStageTimeBehind,
        iTeamFailedReason: result.teamFailedReason,
        iTotalPosition: result.totalPosition,
        iTotalNofStartsInClass: result.totalNofStartsInClass,
        iTotalTimeBehind: result.totalTimeBehind,
        iRaceLightCondition: raceLightCondition,
        iDeviantRaceLightCondition: result.deviantRaceLightCondition,
        iEventClassificationId: eventClassificationId,
        iDeviantEventClassificationId: result.deviantEventClassificationId,
        iServiceFeeToClub: result.serviceFeeToClub,
        iServiceFeeDescription: result.serviceFeeDescription,
      }}
      onValuesChange={() => hasErrors(formRef.current).then((notValid) => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={12}>
          <FormItem
            name="iCompetitorId"
            label={t('results.Competitor')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Competitor'),
              },
            ]}
          >
            <FormSelect
              disabled={true}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => option?.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
              options={competitorsOptions}
              onChange={(code: number) => {
                result.competitorId = code == null ? -1 : code;
              }}
            />
          </FormItem>
        </Col>
        <Col span={1} style={{ paddingTop: 28 }}>
          <StyledIcon
            type="edit"
            onClick={() => {
              raceClubs.selectedClub &&
                AddMapCompetitorConfirmModal(
                  t,
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
                    iEventorCompetitorId: null,
                  },
                  result.className,
                  clubModel,
                  sessionModel
                )
                  .then((competitor) => {
                    result.competitorId = competitor ? competitor.competitorId : -1;
                    formRef.current.setFieldsValue({
                      iCompetitorId: result.competitorId == null ? undefined : result.competitorId,
                    });
                    formRef.current.validateFields(['iCompetitorId'], { force: true });
                  })
                  .catch((error) => {
                    console.error(error);
                  });
            }}
          />
        </Col>
        <Col span={11}>
          <FormItem
            name="iTeamName"
            label={t('results.TeamName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.TeamName'),
              },
            ]}
          >
            <Input
              onChange={(e) => {
                result.teamName = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={4}>
          <FormItem
            name="iClassName"
            label={t('results.Class')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Class'),
              },
            ]}
          >
            <Input
              onChange={(e) => {
                result.className = e.currentTarget.value;
                const classLevel = raceClubs.classLevels
                  .filter((cl) => result.className.indexOf(cl.classShortName) >= 0)
                  .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                  .find(() => true);
                result.classClassificationId = GetClassClassificationId(
                  result.deviantEventClassificationId
                    ? (result.deviantEventClassificationId as EventClassificationIdTypes)
                    : eventClassificationId,
                  classLevel,
                  raceClubs.eventClassifications
                );
                result.difficulty = classLevel ? classLevel.difficulty : null;
                formRef.current.setFieldsValue({
                  iClassClassificationId:
                    result.classClassificationId == null ? undefined : result.classClassificationId.toString(),
                  iDifficulty: result.difficulty,
                });
                formRef.current.validateFields(['iClassClassificationId', 'iDifficulty'], { force: true });
              }}
            />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem
            name="iStage"
            label={t('results.Stage')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Stage'),
              },
            ]}
          >
            <InputNumber
              min={1}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.stage = value as number;
                const resultWithSameClass = results.find(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.failedReason == null &&
                    r.teamResultId !== result.teamResultId &&
                    r.classClassificationId != null &&
                    r.difficulty != null
                );
                if (resultWithSameClass) {
                  result.classClassificationId = resultWithSameClass.classClassificationId;
                  result.difficulty = resultWithSameClass.difficulty;
                  result.lengthInMeter = resultWithSameClass.lengthInMeter;
                  result.winnerTime = resultWithSameClass.winnerTime;
                  result.secondTime = resultWithSameClass.secondTime;
                  result.nofStartsInClass = resultWithSameClass.nofStartsInClass;
                  result.totalStages = resultWithSameClass.totalStages;
                  result.deviantRaceLightCondition = resultWithSameClass.deviantRaceLightCondition;
                  result.totalNofStartsInClass = resultWithSameClass.totalNofStartsInClass;
                  result.deviantEventClassificationId = resultWithSameClass.deviantEventClassificationId;
                  formRef.current.setFieldsValue({
                    iClassClassificationId:
                      result.classClassificationId == null ? undefined : result.classClassificationId.toString(),
                    iDifficulty: result.difficulty,
                    iLengthInMeter: result.lengthInMeter,
                    iWinnerTime: result.winnerTime,
                    iSecondTime: result.secondTime,
                    iNofStartsInClass: result.nofStartsInClass,
                    iTotalStages: result.totalStages,
                    iDeviantRaceLightCondition: result.deviantRaceLightCondition,
                    iTotalNofStartsInClass: result.totalNofStartsInClass,
                    iDeviantEventClassificationId: result.deviantEventClassificationId,
                  });
                  formRef.current.validateFields(
                    [
                      'iClassClassificationId',
                      'iDifficulty',
                      'iLengthInMeter',
                      'iWinnerTime',
                      'iSecondTime',
                      'iNofStartsInClass',
                      'iTotalStages',
                      'iDeviantRaceLightCondition',
                      'iTotalNofStartsInClass',
                      'iDeviantEventClassificationId',
                      'iTotalStages',
                    ],
                    { force: true }
                  );
                } else {
                  formRef.current.validateFields(['iTotalStages'], { force: true });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iClassClassificationId"
            label={t('results.ClassClassification')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.ClassClassification'),
              },
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
              onChange={(code) => {
                result.classClassificationId = code == null ? undefined : parseInt(code);
                const resultsWithSameClass = results.filter(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.teamResultId !== result.teamResultId
                );
                resultsWithSameClass.forEach((r) =>
                  r.setNumberValueOrNull('classClassificationId', result.classClassificationId)
                );
              }}
            />
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem
            name="iDifficulty"
            label={t('results.Difficulty')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Difficulty'),
              },
            ]}
          >
            <Select
              allowClear={true}
              onChange={(code: DifficultyTypes) => {
                result.difficulty = code;
                const resultsWithSameClass = results.filter(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.teamResultId !== result.teamResultId
                );
                resultsWithSameClass.forEach((r) => r.setDifficulty(result.difficulty as DifficultyTypes));
                const raceWinnerResult = raceWizardModel.raceWinnerResults.find(
                  (wr) => wr.className === `${result.className} - ${result.stage}`
                );
                if (raceWinnerResult && result.difficulty) raceWinnerResult.setDifficulty(result.difficulty);
              }}
            >
              <Option value={difficulties.green}>
                <ColorOptionContent background="green" />
              </Option>
              <Option value={difficulties.white}>
                <ColorOptionContent background="white" />
              </Option>
              <Option value={difficulties.yellow}>
                <ColorOptionContent background="yellow" />
              </Option>
              <Option value={difficulties.orange}>
                <ColorOptionContent background="orange" />
              </Option>
              <Option value={difficulties.red}>
                <ColorOptionContent background="red" />
              </Option>
              <Option value={difficulties.purple}>
                <ColorOptionContent background="purple" />
              </Option>
              <Option value={difficulties.blue}>
                <ColorOptionContent background="blue" />
              </Option>
              <Option value={difficulties.black}>
                <ColorOptionContent background="black" />
              </Option>
            </Select>
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iLengthInMeter"
            label={t('results.LengthInMeter')}
            rules={[
              {
                required: failedReason !== failedReasons.NotStarted,
                message: errorRequiredField(t, 'results.LengthInMeter'),
              },
            ]}
          >
            <InputNumber
              min={10}
              max={100000}
              step={100}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.lengthInMeter = value;
                const resultsWithSameClass = results.filter(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.teamResultId !== result.teamResultId
                );
                resultsWithSameClass.forEach((r) => r.setNumberValueOrNull('lengthInMeter', result.lengthInMeter));
                const raceWinnerResult = raceWizardModel.raceWinnerResults.find(
                  (wr) => wr.className === `${result.className} - ${result.stage}`
                );
                if (raceWinnerResult && result.lengthInMeter) raceWinnerResult.setLengthInMeter(result.lengthInMeter);
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem name="iFailedReason" label={t('results.FailedReason')}>
            <FormSelect
              allowClear={true}
              options={failedReasonOptions(t)}
              onChange={(code) => {
                result.failedReason = code;
                setFailedReason(code);
                formRef.current.validateFields(
                  ['iLengthInMeter', 'iCompetitorTime', 'iWinnerTime', 'iSecondTime', 'iPosition', 'iNofStartsInClass'],
                  {
                    force: true,
                  }
                );
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iCompetitorTime"
            label={t('results.Time')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.Time'),
              },
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.competitorTime = time;
                formRef.current.validateFields(['iWinnerTime'], { force: true });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iWinnerTime"
            label={t('results.WinnerTime')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.WinnerTime'),
              },
              {
                validator: (rule, value, callback) => {
                  const competitorTime = stringToMilliSeconds(
                    formRef.current.getFieldValue('iCompetitorTime'),
                    timeFormat
                  );
                  const winnerTime = stringToMilliSeconds(value, timeFormat);
                  if (competitorTime > 0 && winnerTime > 0 && competitorTime < winnerTime) {
                    callback(t('results.WinnerTimeLessOrEqualThanTime') ?? undefined);
                  }
                  callback();
                },
              },
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.winnerTime = time;
                formRef.current.validateFields(['iSecondTime'], { force: true });
                const resultsWithSameClass = results.filter(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.teamResultId !== result.teamResultId
                );
                result.winnerTime &&
                  resultsWithSameClass.forEach((r) => r.setStringValueOrNull('winnerTime', result.winnerTime));
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iSecondTime"
            label={t('results.SecondTime')}
            rules={[
              {
                validator: (rule, value, callback) => {
                  const winnerTime = stringToMilliSeconds(formRef.current.getFieldValue('iWinnerTime'), timeFormat);
                  const secondTime = stringToMilliSeconds(value, timeFormat);
                  if (winnerTime > 0 && secondTime > 0 && secondTime < winnerTime) {
                    callback(t('results.SecondTimeGreaterOrEqualThanWinnerTime') ?? undefined);
                  }
                  callback();
                },
              },
            ]}
          >
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.secondTime = time;
                const resultsWithSameClass = results.filter(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.teamResultId !== result.teamResultId
                );
                result.secondTime &&
                  resultsWithSameClass.forEach((r) => r.setStringValueOrNull('secondTime', result.secondTime));
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem
            name="iPosition"
            label={t('results.Position')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.Position'),
              },
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.position = value;
                formRef.current.validateFields(['iNofStartsInClass'], { force: true });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iNofStartsInClass"
            label={t('results.NofStartsInClass')}
            rules={[
              {
                required: !failedReason,
                message: errorRequiredField(t, 'results.NofStartsInClass'),
              },
              {
                validator: (rule, value, callback) => {
                  const position = formRef.current.getFieldValue('iPosition');
                  if (position && value && value < position) {
                    callback(t('results.PositionGreaterThanStarts') ?? undefined);
                  }
                  callback();
                },
              },
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.nofStartsInClass = value;
                const resultsWithSameClass = results.filter(
                  (r) =>
                    r.className === result.className &&
                    r.stage === result.stage &&
                    r.teamResultId !== result.teamResultId
                );
                resultsWithSameClass.forEach((r) =>
                  r.setNumberValueOrNull('nofStartsInClass', result.nofStartsInClass)
                );
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iTotalStages"
            label={t('results.TotalStages')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.TotalStages'),
              },
              {
                validator: (rule, value, callback) => {
                  const stage = formRef.current.getFieldValue('iStage');
                  if (stage && value && value < stage) {
                    callback(t('results.StageGreaterThanTotalStages') ?? undefined);
                  }
                  callback();
                },
              },
            ]}
          >
            <InputNumber
              min={1}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.totalStages = value as number;
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.teamResultId !== result.teamResultId
                );
                resultsWithSameClass.forEach((r) => r.setNumberValue('totalStages', result.totalStages));
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iMissingTime" label={t('results.MissingTime')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.missingTime = time != null ? `${time}${ManuallyEditedMissingTimePostfix}` : null;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem name="iDeltaPositions" label={t('results.DeltaPositions')}>
            <InputNumber
              min={-1000}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.deltaPositions = value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iDeltaTimeBehind" label={t('results.DeltaTimeBehind')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              allowNegativeTime={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.deltaTimeBehind = time;
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iTotalStagePosition" label={t('results.TotalStagePosition')}>
            <InputNumber
              min={-1000}
              max={1000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.totalStagePosition = value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iTotalStageTimeBehind" label={t('results.TotalStageTimeBehind')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              allowNegativeTime={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.totalStageTimeBehind = time;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem name="iTeamFailedReason" label={t('results.TeamFailedReason')}>
            <FormSelect
              allowClear={true}
              options={failedReasonOptions(t)}
              onChange={(code) => {
                result.teamFailedReason = code;
                formRef.current.validateFields(['iTotalTimeBehind', 'iTotalPosition', 'iTotalNofStartsInClass'], {
                  force: true,
                });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iTotalPosition" label={t('results.TotalPosition')}>
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.totalPosition = value;
                formRef.current.validateFields(['iTotalNofStartsInClass'], { force: true });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iTotalNofStartsInClass"
            label={t('results.TotalNofStartsInClass')}
            rules={[
              {
                validator: (rule, value, callback) => {
                  const totalPosition = formRef.current.getFieldValue('iTotalPosition');
                  if (totalPosition && value && value < totalPosition) {
                    callback(t('results.PositionGreaterThanStarts') ?? undefined);
                  }
                  callback();
                },
              },
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              step={1}
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.totalNofStartsInClass = value;
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.teamResultId !== result.teamResultId
                );
                resultsWithSameClass.forEach((r) =>
                  r.setNumberValueOrNull('totalNofStartsInClass', result.totalNofStartsInClass)
                );
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iTotalTimeBehind" label={t('results.TotalTimeBehind')}>
            <InputTime
              format={timeFormat}
              allowClear={true}
              allowNegativeTime={true}
              style={{ width: '100%' }}
              onChange={(time) => {
                result.totalTimeBehind = time;
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={4}>
          <FormItem name="iRaceLightCondition" label={t('results.RaceLightCondition')}>
            <FormSelect disabled={true} options={raceLightConditionOptions(t)} />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iDeviantRaceLightCondition" label={t('results.DeviantRaceLightCondition')}>
            <FormSelect
              allowClear={true}
              options={raceLightConditionOptions(t)}
              onChange={(code) => {
                result.deviantRaceLightCondition = code;
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iEventClassificationId" label={t('results.EventClassification')}>
            <FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="iDeviantEventClassificationId" label={t('results.DeviantEventClassification')}>
            <FormSelect
              dropdownMatchSelectWidth={false}
              allowClear={true}
              options={raceClubs.eventClassificationOptions}
              onChange={(code) => {
                result.deviantEventClassificationId = code;
                const classLevel = raceClubs.classLevels
                  .filter((cl) => result.className.indexOf(cl.classShortName) >= 0)
                  .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                  .find(() => true);
                result.classClassificationId = GetClassClassificationId(
                  code ? code : eventClassificationId,
                  classLevel,
                  raceClubs.eventClassifications
                );
                const newEventClassificationId = code ? code : eventClassificationId;
                const raceEventClassification = raceClubs.eventClassifications.find(
                  (ec) => ec.eventClassificationId === newEventClassificationId
                );
                formRef.current.setFieldsValue({
                  iClassClassificationId:
                    result.classClassificationId == null ? undefined : result.classClassificationId.toString(),
                });
                formRef.current.validateFields(['iClassClassificationId'], { force: true });
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem
            name="iServiceFeeToClub"
            label={t('results.ServiceFeeToClub')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.ServiceFeeToClub'),
              },
            ]}
          >
            <InputNumber
              min={0}
              max={100000}
              step={5}
              precision={2}
              decimalSeparator=","
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                result.serviceFeeToClub = value!;
              }}
            />
          </FormItem>
        </Col>
        <Col span={18}>
          <FormItem name="iServiceFeeDescription" label={t('results.ServiceFeeDescription')}>
            <Input
              style={{ width: '100%' }}
              onChange={(e) => {
                result.serviceFeeDescription = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
      </Row>
    </Form>
  ) : null;
};

export default EditResultRelay;
