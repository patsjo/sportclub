import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { IRaceResult, IRaceResultProps } from '../../models/resultModel';
import { IRaceWizard } from '../../models/resultWizardModel';
import { ISessionModel } from '../../models/sessionModel';
import { INumberOption, errorRequiredField, hasErrors, timeFormat } from '../../utils/formHelper';
import {
  AwardTypes,
  DifficultyTypes,
  EventClassificationIdTypes,
  ManuallyEditedMissingTimePostfix,
  PaymentTypes,
  difficulties,
  failedReasonOptions,
  failedReasons
} from '../../utils/resultConstants';
import {
  GetAge,
  GetAward,
  GetClassClassificationId,
  GetClassLevel,
  GetClassShortName,
  GetCompetitorFee
} from '../../utils/resultHelper';
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
  margin-top: 1px;
`;

export interface IExtendedRaceResult extends IRaceResultProps {
  isAwardTouched: boolean;
  fee: number | null;
}

interface IRaceResultForm extends Omit<IExtendedRaceResult, 'competitorId'> {
  competitorId: number | undefined;
  totalFeeToClub: number;
  eventClassificationId: EventClassificationIdTypes;
}

interface IEditResultIndividualProps {
  clubModel: IMobxClubModel;
  sessionModel: ISessionModel;
  raceWizardModel: IRaceWizard;
  paymentModel: PaymentTypes;
  meetsAwardRequirements: boolean;
  isSprint: boolean;
  raceDate: string;
  eventClassificationId: EventClassificationIdTypes;
  result: IExtendedRaceResult;
  results: IRaceResult[];
  competitorsOptions: INumberOption[];
  autoUpdateResultWithSameClass: boolean;
  onChange: (changes: Partial<IExtendedRaceResult>) => void;
  onChangeAll: (changes: Partial<IExtendedRaceResult>) => void;
  onValidate: (valid: boolean) => void;
}
const EditResultIndividual = ({
  clubModel,
  sessionModel,
  paymentModel,
  raceWizardModel,
  meetsAwardRequirements,
  isSprint,
  raceDate,
  eventClassificationId,
  result,
  results,
  competitorsOptions,
  autoUpdateResultWithSameClass,
  onChange,
  onChangeAll,
  onValidate
}: IEditResultIndividualProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<IRaceResultForm>();
  const formId = useMemo(() => 'editResultIndividual' + Math.floor(Math.random() * 1000000000000000), []);
  eventClassificationId = result.deviantEventClassificationId
    ? (result.deviantEventClassificationId as EventClassificationIdTypes)
    : eventClassificationId;
  const [raceEventClassification, setRaceEventClassification] = useState(
    clubModel.raceClubs?.eventClassifications.find(ec => ec.eventClassificationId === eventClassificationId)
  );
  const competitor = useMemo(
    () => clubModel.raceClubs?.selectedClub?.competitorById(result.competitorId),
    [clubModel.raceClubs?.selectedClub, result.competitorId]
  );
  const [failedReason, setFailedReason] = useState(result.failedReason);
  const [age, setAge] = useState(competitor ? GetAge(competitor.birthDay, raceDate) : null);
  const [isAwardTouched, setIsAwardTouched] = useState(result.isAwardTouched);
  const [classClassification, setClassClassification] = useState(
    raceEventClassification?.classClassifications.find(cc => cc.classClassificationId === result.classClassificationId)
  );
  const { raceClubs } = clubModel;
  const [modal, contextHolder] = Modal.useModal();
  const calculatedAward = useMemo(
    () =>
      meetsAwardRequirements && raceEventClassification && raceClubs
        ? GetAward(raceEventClassification, raceClubs.classLevels, result, age, isSprint)
        : null,
    [age, isSprint, meetsAwardRequirements, raceClubs, raceEventClassification, result]
  );
  if (!isAwardTouched && result.award !== calculatedAward) {
    result.award = calculatedAward;
  }
  const initialValues: IRaceResultForm = useMemo(
    () => ({
      ...result,
      competitorId: !result.competitorId || result.competitorId === -1 ? undefined : result.competitorId,
      missingTime: result.missingTime != null ? result.missingTime.substring(0, 8) : null,
      totalFeeToClub: (result.feeToClub ?? 0) + (result.serviceFeeToClub ?? 0),
      eventClassificationId: eventClassificationId
    }),
    [eventClassificationId, result]
  );

  useEffect(() => {
    setTimeout(() => {
      if (form) hasErrors(form).then((notValid: boolean) => onValidate(!notValid));
    }, 0);
  }, [onValidate, form]);

  return raceClubs?.selectedClub ? (
    <Form
      form={form}
      id={formId}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={() => hasErrors(form).then(notValid => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={18}>
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
        <Col span={6} style={{ paddingTop: 28 }}>
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
                    const changes: Partial<IExtendedRaceResult> = {
                      competitorId: competitor.competitorId,
                      feeToClub: GetCompetitorFee(paymentModel, result, age, classClassification)
                    };
                    onChange(changes);
                    form.setFieldsValue(changes);
                    setAge(GetAge(competitor.birthDay, raceDate));
                    form.validateFields(['competitorId', 'feeToClub']);
                  })
                  .catch(error => {
                    console.error(error);
                  });
            }}
          />
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
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
                const changes: Partial<IExtendedRaceResult> = { className: e.currentTarget.value };
                const resultWithSameClass = results.find(
                  r =>
                    r.className === e.currentTarget.value &&
                    r.failedReason == null &&
                    r.resultId !== result.resultId &&
                    r.classClassificationId != null &&
                    r.difficulty != null
                );
                if (resultWithSameClass && autoUpdateResultWithSameClass) {
                  Object.assign(changes, {
                    classClassificationId2: resultWithSameClass.classClassificationId,
                    difficulty: resultWithSameClass.difficulty,
                    lengthInMeter: resultWithSameClass.lengthInMeter,
                    winnerTime: resultWithSameClass.winnerTime,
                    secondTime: resultWithSameClass.secondTime,
                    nofStartsInClass: resultWithSameClass.nofStartsInClass,
                    originalFee: resultWithSameClass.originalFee,
                    deviantEventClassificationId: resultWithSameClass.deviantEventClassificationId
                  });
                  onChange(changes);
                  form.setFieldsValue(changes);
                  form.validateFields([
                    'classClassificationId',
                    'difficulty',
                    'lengthInMeter',
                    'winnerTime',
                    'secondTime',
                    'nofStartsInClass',
                    'originalFee',
                    'deviantEventClassificationId'
                  ]);
                } else {
                  const shortClassName = GetClassShortName(e.currentTarget.value);
                  const classLevel = GetClassLevel(raceClubs.classLevels, shortClassName);
                  Object.assign(changes, {
                    classClassificationId: GetClassClassificationId(
                      result.deviantEventClassificationId
                        ? (result.deviantEventClassificationId as EventClassificationIdTypes)
                        : eventClassificationId,
                      classLevel,
                      raceClubs.eventClassifications
                    ),
                    difficulty: classLevel ? classLevel.difficulty : null
                  });
                  onChange(changes);
                  form.setFieldsValue(changes);
                  form.validateFields(['classClassificationId', 'difficulty']);
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
                raceClubs.classClassificationOptions(result.deviantEventClassificationId ?? eventClassificationId) ?? []
              }
              onChange={code => {
                const classClassificationId = !code ? undefined : parseInt(code);
                const tempClassClassification = raceEventClassification?.classClassifications.find(
                  cc => cc.classClassificationId === classClassificationId
                );
                const changes: Partial<IExtendedRaceResult> = {
                  classClassificationId: classClassificationId,
                  feeToClub: GetCompetitorFee(
                    paymentModel,
                    { ...result, classClassificationId },
                    age,
                    tempClassClassification
                  )
                };
                onChange(changes);
                form.setFieldsValue(changes);
                setClassClassification(tempClassClassification);
                form.validateFields(['feeToClub']);
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ classClassificationId: classClassificationId });
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
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
                  wr => wr.className === result.className
                );
                if (raceWinnerResult && code) raceWinnerResult.setDifficulty(code);
                if (
                  !raceWinnerResult &&
                  result.className &&
                  result.lengthInMeter &&
                  result.winnerTime?.length === timeFormat.length
                )
                  raceWizardModel.addRaceWinnerResult({
                    id: raceWizardModel.raceWinnerResults.length,
                    personName: 'Unknown',
                    className: result.className,
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
                const raceWinnerResult = raceWizardModel.raceWinnerResults.find(
                  wr => wr.className === result.className
                );
                if (raceWinnerResult && value) raceWinnerResult.setLengthInMeter(value);
                if (!raceWinnerResult && result.className && value && result.winnerTime?.length === timeFormat.length)
                  raceWizardModel.addRaceWinnerResult({
                    id: raceWizardModel.raceWinnerResults.length,
                    personName: 'Unknown',
                    className: result.className,
                    difficulty: result.difficulty,
                    lengthInMeter: value,
                    winnerTime: result.winnerTime
                  });
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ lengthInMeter: value });
                }
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
                const changes: Partial<IExtendedRaceResult> = {
                  failedReason: code,
                  feeToClub: GetCompetitorFee(paymentModel, { ...result, failedReason: code }, age, classClassification)
                };
                onChange(changes);
                form.setFieldsValue(changes);
                setFailedReason(code);
                form.validateFields([
                  'lengthInMeter',
                  'competitorTime',
                  'winnerTime',
                  'secondTime',
                  'position',
                  'nofStartsInClass',
                  'feeToClub'
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
                  wr => wr.className === result.className
                );
                if (raceWinnerResult && time?.length === timeFormat.length) raceWinnerResult.setWinnerTime(time);
                if (!raceWinnerResult && result.className && result.lengthInMeter && time?.length === timeFormat.length)
                  raceWizardModel.addRaceWinnerResult({
                    id: raceWizardModel.raceWinnerResults.length,
                    personName: 'Unknown',
                    className: result.className,
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
          <FormItem name="award" label={t('results.Award')}>
            <Select
              allowClear={true}
              options={calculatedAward ? [{ value: calculatedAward, lebel: calculatedAward }] : []}
              onChange={(code: AwardTypes) => {
                onChange({ award: code });
                setIsAwardTouched(true);
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
              onChange={time => {
                onChange({ missingTime: time != null ? `${time}${ManuallyEditedMissingTimePostfix}` : null });
              }}
            />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
          <FormItem
            name="originalFee"
            label={t('results.OriginalFee')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.OriginalFee')
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
              onChange={(value: number | null) => {
                const changes: Partial<IExtendedRaceResult> = {
                  originalFee: value,
                  feeToClub: GetCompetitorFee(paymentModel, { ...result, originalFee: value }, age, classClassification)
                };
                onChange(changes);
                form.setFieldsValue({
                  ...changes,
                  totalFeeToClub: (changes.feeToClub ?? 0) + (result.serviceFeeToClub ?? 0)
                });
                form.validateFields(['feeToClub']);
                if (autoUpdateResultWithSameClass) {
                  onChangeAll(changes);
                }
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="lateFee"
            label={t('results.LateFee')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.LateFee')
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
              onChange={(value: number | null) => {
                const changes: Partial<IExtendedRaceResult> = {
                  lateFee: value,
                  feeToClub: GetCompetitorFee(paymentModel, { ...result, lateFee: value }, age, classClassification)
                };
                onChange(changes);
                form.setFieldsValue({
                  ...changes,
                  totalFeeToClub: (changes.feeToClub ?? 0) + (result.serviceFeeToClub ?? 0)
                });
                form.validateFields(['feeToClub']);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="feeToClub"
            label={t('results.FeeToClub')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.FeeToClub')
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
              onChange={(value: number | null) => {
                onChange({ feeToClub: value });
                form.setFieldsValue({
                  totalFeeToClub: (value ?? 0) + (result.serviceFeeToClub ?? 0)
                });
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
              onChange={(value: number | null) => {
                onChange({ serviceFeeToClub: value });
                form.setFieldsValue({
                  totalFeeToClub: (result.feeToClub ?? 0) + (value ?? 0)
                });
              }}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="serviceFeeDescription" label={t('results.ServiceFeeDescription')}>
            <Input
              style={{ width: '100%' }}
              onChange={e => onChange({ serviceFeeDescription: e.currentTarget.value })}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="totalFeeToClub" label={t('results.TotalFeeToClub')}>
            <InputNumber disabled={true} precision={2} decimalSeparator="," style={{ width: '100%' }} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem name="eventClassificationId" label={t('results.EventClassification')}>
            <FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="deviantEventClassificationId" label={t('results.DeviantEventClassification')}>
            <FormSelect
              allowClear={true}
              options={raceClubs.eventClassificationOptions.map(option => ({
                ...option,
                disabled: option.code === eventClassificationId
              }))}
              onChange={(code?: EventClassificationIdTypes) => {
                const changes: Partial<IExtendedRaceResult> = { deviantEventClassificationId: code };
                const shortClassName = GetClassShortName(result.className);
                const classLevel = GetClassLevel(raceClubs.classLevels, shortClassName);
                changes.classClassificationId = GetClassClassificationId(
                  code ? (code as EventClassificationIdTypes) : eventClassificationId,
                  classLevel,
                  raceClubs.eventClassifications
                );
                const newEventClassificationId = code ? code : eventClassificationId;
                const raceEventClassification = raceClubs.eventClassifications.find(
                  ec => ec.eventClassificationId === newEventClassificationId
                );
                onChange(changes);
                form.setFieldsValue(changes);
                setRaceEventClassification(raceEventClassification);
                form.validateFields(['classClassificationId']);
                if (autoUpdateResultWithSameClass) {
                  onChangeAll({ classClassificationId: changes.classClassificationId });
                }
              }}
            />
          </FormItem>
        </Col>
      </Row>
      {contextHolder}
    </Form>
  ) : null;
};

export default EditResultIndividual;
