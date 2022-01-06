import { Col, Form, Input, InputNumber, Row, Select } from 'antd';
import InputTime, { stringToMilliSeconds } from 'components/formItems/InputTime';
import { IMobxClubModel } from 'models/mobxClubModel';
import { IRaceResult, IRaceResultSnapshotIn } from 'models/resultModel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { errorRequiredField, FormSelect, hasErrors, IOption, timeFormat } from '../../utils/formHelper';
import {
  AwardTypes,
  difficulties,
  DifficultyTypes,
  EventClassificationIdTypes,
  failedReasonOptions,
  failedReasons,
  ManuallyEditedMissingTimePostfix,
  PaymentTypes,
} from '../../utils/resultConstants';
import { GetAge, GetAward, GetClassClassificationId, GetCompetitorFee } from '../../utils/resultHelper';
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

export interface IExtendedRaceResult extends IRaceResultSnapshotIn {
  isAwardTouched: boolean;
  fee: number;
}
interface IEditResultIndividualProps {
  clubModel: IMobxClubModel;
  paymentModel: PaymentTypes;
  meetsAwardRequirements: boolean;
  isSprint: boolean;
  raceDate: string;
  eventClassificationId: EventClassificationIdTypes;
  result: IExtendedRaceResult;
  results: IRaceResult[];
  competitorsOptions: IOption[];
  onValidate: (valid: boolean) => void;
}
const EditResultIndividual = ({
  clubModel,
  paymentModel,
  meetsAwardRequirements,
  isSprint,
  raceDate,
  eventClassificationId,
  result,
  results,
  competitorsOptions,
  onValidate,
}: IEditResultIndividualProps) => {
  const { t } = useTranslation();
  const formRef = useRef<any>(null);
  const formId = useMemo(() => 'editResultIndividual' + Math.floor(Math.random() * 1000000000000000), []);
  eventClassificationId = result.deviantEventClassificationId
    ? (result.deviantEventClassificationId as EventClassificationIdTypes)
    : eventClassificationId;
  const [raceEventClassification, setRaceEventClassification] = useState(
    clubModel.raceClubs?.eventClassifications.find((ec) => ec.eventClassificationId === eventClassificationId)
  );
  const competitor = useMemo(
    () => clubModel.raceClubs?.selectedClub.competitorById(result.competitorId),
    [clubModel.raceClubs?.selectedClub]
  );
  const [failedReason, setFailedReason] = useState(result.failedReason);
  const [age, setAge] = useState(competitor ? GetAge(competitor.birthDay, raceDate) : null);
  const [isAwardTouched, setIsAwardTouched] = useState(result.isAwardTouched);
  const [classClassification, setClassClassification] = useState(
    raceEventClassification?.classClassifications.find(
      (cc) => cc.classClassificationId === result.classClassificationId
    )
  );
  const { raceClubs } = clubModel;
  const calculatedAward =
    meetsAwardRequirements && raceEventClassification && raceClubs
      ? GetAward(raceEventClassification, raceClubs.classLevels, result, age, isSprint)
      : null;
  if (!isAwardTouched && result.award !== calculatedAward) {
    result.award = calculatedAward;
  }

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
        iAward: result.award,
        iOriginalFee: result.originalFee,
        iLateFee: result.lateFee,
        iFeeToClub: result.feeToClub,
        iServiceFeeToClub: result.serviceFeeToClub,
        iServiceFeeDescription: result.serviceFeeDescription,
        iTotalFeeToClub: (result.feeToClub ?? 0) + (result.serviceFeeToClub ?? 0),
        iEventClassificationId: eventClassificationId,
        iDeviantEventClassificationId: result.deviantEventClassificationId,
      }}
      onValuesChange={() => hasErrors(formRef.current).then((notValid) => onValidate(!notValid))}
    >
      <Row gutter={8}>
        <Col span={18}>
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
              onChange={(code) => {
                result.competitorId = code == null ? -1 : parseInt(code);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6} style={{ paddingTop: 28 }}>
          <StyledIcon
            type="edit"
            onClick={() => {
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
                clubModel
              )
                .then((competitor) => {
                  result.competitorId = competitor ? competitor.competitorId : -1;
                  result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                  formRef.current.setFieldsValue({
                    iCompetitorId: result.competitorId == null ? undefined : result.competitorId.toString(),
                    iFeeToClub: result.feeToClub,
                  });
                  setAge(competitor ? GetAge(competitor.birthDay, raceDate) : null);
                  formRef.current.validateFields(['iCompetitorId', 'iFeeToClub'], { force: true });
                })
                .catch((error) => {
                  console.error(error);
                });
            }}
          />
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={6}>
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
                const resultWithSameClass = results.find(
                  (r) =>
                    r.className === result.className &&
                    r.failedReason == null &&
                    r.resultId !== result.resultId &&
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
                  result.originalFee = resultWithSameClass.originalFee;
                  result.deviantEventClassificationId = resultWithSameClass.deviantEventClassificationId;
                  formRef.current.setFieldsValue({
                    iClassClassificationId:
                      result.classClassificationId == null ? undefined : result.classClassificationId.toString(),
                    iDifficulty: result.difficulty,
                    iLengthInMeter: result.lengthInMeter,
                    iWinnerTime: result.winnerTime,
                    iSecondTime: result.secondTime,
                    iNofStartsInClass: result.nofStartsInClass,
                    iOriginalFee: result.originalFee,
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
                      'iOriginalFee',
                      'iDeviantEventClassificationId',
                    ],
                    { force: true }
                  );
                } else {
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
                result.classClassificationId = !code ? undefined : parseInt(code);
                const tempClassClassification = raceEventClassification?.classClassifications.find(
                  (cc) => cc.classClassificationId === result.classClassificationId
                );
                result.feeToClub = GetCompetitorFee(paymentModel, result, age, tempClassClassification);
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.resultId !== result.resultId
                );
                resultsWithSameClass.forEach((r) =>
                  r.setNumberValueOrNull('classClassificationId', result.classClassificationId)
                );
                formRef.current.setFieldsValue({
                  iFeeToClub: result.feeToClub,
                });
                setClassClassification(tempClassClassification);
                formRef.current.validateFields(['iFeeToClub'], {
                  force: true,
                });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
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
              onChange={(code: string) => {
                result.difficulty = code;
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.resultId !== result.resultId
                );
                resultsWithSameClass.forEach((r) => r.setDifficulty(result.difficulty as DifficultyTypes));
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
              onChange={(value?: number | string) => {
                result.lengthInMeter = value as number | undefined;
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.resultId !== result.resultId
                );
                resultsWithSameClass.forEach((r) => r.setNumberValueOrNull('lengthInMeter', result.lengthInMeter));
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
                result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                formRef.current.setFieldsValue({
                  iFeeToClub: result.feeToClub,
                });
                setFailedReason(code);
                formRef.current.validateFields(
                  [
                    'iLengthInMeter',
                    'iCompetitorTime',
                    'iWinnerTime',
                    'iSecondTime',
                    'iPosition',
                    'iNofStartsInClass',
                    'iFeeToClub',
                  ],
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
                    callback(t('results.WinnerTimeLessOrEqualThanTime'));
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
                  (r) => r.className === result.className && r.resultId !== result.resultId
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
                    callback(t('results.SecondTimeGreaterOrEqualThanWinnerTime'));
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
                  (r) => r.className === result.className && r.resultId !== result.resultId
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
              onChange={(value?: string | number) => {
                result.position = value as number | undefined;
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
                    callback(t('results.PositionGreaterThanStarts'));
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
              onChange={(value?: string | number) => {
                result.nofStartsInClass = value as number | undefined;
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.resultId !== result.resultId
                );
                resultsWithSameClass.forEach((r) =>
                  r.setNumberValueOrNull('nofStartsInClass', result.nofStartsInClass)
                );
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iAward" label={t('results.Award')}>
            <Select
              allowClear={true}
              onChange={(code: AwardTypes) => {
                result.award = code;
                setIsAwardTouched(true);
              }}
            >
              {calculatedAward ? <Option value={calculatedAward}>{calculatedAward}</Option> : null}
            </Select>
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
          <FormItem
            name="iOriginalFee"
            label={t('results.OriginalFee')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.OriginalFee'),
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
              onChange={(value?: string | number) => {
                result.originalFee = value as number | undefined;
                result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                formRef.current.setFieldsValue({
                  iFeeToClub: result.feeToClub,
                  iTotalFeeToClub: result.feeToClub + (result.serviceFeeToClub ?? 0),
                });
                formRef.current.validateFields(['iFeeToClub'], {
                  force: true,
                });
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.resultId !== result.resultId
                );
                resultsWithSameClass.forEach((r) => {
                  r.setNumberValueOrNull('originalFee', result.originalFee);
                  r.setNumberValueOrNull('feeToClub', GetCompetitorFee(paymentModel, r, age, classClassification));
                });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iLateFee"
            label={t('results.LateFee')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.LateFee'),
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
              onChange={(value?: string | number) => {
                result.lateFee = value as number | undefined;
                result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                formRef.current.setFieldsValue({
                  iFeeToClub: result.feeToClub,
                  iTotalFeeToClub: result.feeToClub + (result.serviceFeeToClub ?? 0),
                });
                formRef.current.validateFields(['iFeeToClub'], {
                  force: true,
                });
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iFeeToClub"
            label={t('results.FeeToClub')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.FeeToClub'),
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
              onChange={(value?: string | number) => {
                result.feeToClub = value as number | undefined;
                formRef.current.setFieldsValue({
                  iTotalFeeToClub: (result.feeToClub ?? 0) + (result.serviceFeeToClub ?? 0),
                });
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
              onChange={(value?: string | number) => {
                result.serviceFeeToClub = value as number | undefined;
                formRef.current.setFieldsValue({
                  iTotalFeeToClub: (result.feeToClub ?? 0) + (result.serviceFeeToClub ?? 0),
                });
              }}
            />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="iServiceFeeDescription" label={t('results.ServiceFeeDescription')}>
            <Input
              style={{ width: '100%' }}
              onChange={(e) => {
                result.serviceFeeDescription = e.currentTarget.value;
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem name="iTotalFeeToClub" label={t('results.TotalFeeToClub')}>
            <InputNumber disabled={true} precision={2} decimalSeparator="," style={{ width: '100%' }} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <FormItem name="iEventClassificationId" label={t('results.EventClassification')}>
            <FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="iDeviantEventClassificationId" label={t('results.DeviantEventClassification')}>
            <FormSelect
              allowClear={true}
              options={raceClubs.eventClassificationOptions}
              onChange={(code?: string) => {
                result.deviantEventClassificationId = code;
                const classLevel = raceClubs.classLevels
                  .filter((cl) => result.className.indexOf(cl.classShortName) >= 0)
                  .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                  .find(() => true);
                result.classClassificationId = GetClassClassificationId(
                  code ? (code as EventClassificationIdTypes) : eventClassificationId,
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
                setRaceEventClassification(raceEventClassification);
                formRef.current.validateFields(['iClassClassificationId'], { force: true });
                const resultsWithSameClass = results.filter(
                  (r) => r.className === result.className && r.resultId !== result.resultId
                );
                resultsWithSameClass.forEach((r) => {
                  r.setDeviantEventClassificationId(
                    result.deviantEventClassificationId as EventClassificationIdTypes | undefined
                  );
                  r.setNumberValueOrNull('classClassificationId', result.classClassificationId);
                });
              }}
            />
          </FormItem>
        </Col>
      </Row>
    </Form>
  ) : null;
};

export default EditResultIndividual;
