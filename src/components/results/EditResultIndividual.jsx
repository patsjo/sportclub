import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, TimePicker, Select, Input, InputNumber, Row, Col } from 'antd';
import { withTranslation } from 'react-i18next';
import FormItem from '../formItems/FormItem';
import { errorRequiredField, FormSelect, timeFormat, hasErrors } from '../../utils/formHelper';
import { GetCompetitorFee, GetClassClassificationId, GetAward, GetAge } from '../../utils/resultHelper';
import { difficulties, failedReasons, failedReasonOptions } from '../../utils/resultConstants';
import moment from 'moment';
import styled from 'styled-components';
import { StyledIcon } from '../styled/styled';
import { AddMapCompetitorConfirmModal } from './AddMapCompetitorConfirmModal';

const { Option } = Select;
const ColorOptionContent = styled.div`
  background: ${(props) => props.background};
  height: 18px;
  width: 30px;
  border: black 1px solid;
  margin-top: 6px;
`;

class EditResultIndividual extends Component {
  static propTypes = {
    clubModel: PropTypes.object.isRequired,
    paymentModel: PropTypes.number,
    meetsAwardRequirements: PropTypes.bool,
    isSprint: PropTypes.bool,
    raceDate: PropTypes.string,
    eventClassificationId: PropTypes.object.isRequired,
    result: PropTypes.object.isRequired,
    results: PropTypes.arrayOf(PropTypes.object),
    competitorsOptions: PropTypes.arrayOf(PropTypes.object),
    onValidate: PropTypes.func.isRequired,
  };
  formRef = React.createRef();

  constructor(props) {
    super(props);

    const eventClassificationId = props.result.deviantEventClassificationId
      ? props.result.deviantEventClassificationId
      : props.eventClassificationId;
    const raceEventClassification = props.clubModel.raceClubs.eventClassifications.find(
      (ec) => ec.eventClassificationId === eventClassificationId
    );
    const competitor = props.clubModel.raceClubs.selectedClub.competitorById(props.result.competitorId);
    const age = competitor ? GetAge(competitor.birthDay, props.raceDate) : null;
    const classClassification = raceEventClassification.classClassifications.find(
      (cc) => cc.classClassificationId === props.result.classClassificationId
    );

    this.state = {
      formId: 'editResultIndividual' + Math.floor(Math.random() * 10000000000000000),
      failedReason: props.result.failedReason,
      age: age,
      raceEventClassification: raceEventClassification,
      isAwardTouched: props.result.isAwardTouched,
      classClassification: classClassification,
    };
  }

  componentDidMount() {
    const self = this;
    const { onValidate } = this.props;

    setTimeout(() => {
      hasErrors(self.formRef.current).then((notValid) => onValidate(!notValid));
    }, 0);
  }

  render() {
    const self = this;
    const {
      t,
      onValidate,
      clubModel,
      paymentModel,
      eventClassificationId,
      classClassification,
      result,
      results,
      competitorsOptions,
      meetsAwardRequirements,
      isSprint,
      raceDate,
    } = this.props;
    const { formId, failedReason, raceEventClassification, age, isAwardTouched } = this.state;
    const { raceClubs } = clubModel;
    const calculatedAward = meetsAwardRequirements
      ? GetAward(raceEventClassification, raceClubs.classLevels, result, age, isSprint)
      : null;
    if (!isAwardTouched && result.award !== calculatedAward) {
      result.award = calculatedAward;
    }

    return (
      <Form
        id={formId}
        ref={self.formRef}
        layout="vertical"
        initialValues={{
          iCompetitorId: !result.competitorId ? undefined : result.competitorId.toString(),
          iClassName: result.className,
          iClassClassificationId: !result.classClassificationId ? undefined : result.classClassificationId.toString(),
          iDifficulty: result.difficulty,
          iLengthInMeter: result.lengthInMeter,
          iFailedReason: result.failedReason,
          iCompetitorTime: !result.competitorTime
            ? null
            : moment(
                result.competitorTime.length <= 5 ? `0:${result.competitorTime}` : result.competitorTime,
                timeFormat
              ),
          iWinnerTime: !result.winnerTime
            ? null
            : moment(result.winnerTime.length <= 5 ? `0:${result.winnerTime}` : result.winnerTime, timeFormat),
          iSecondTime: !result.secondTime
            ? null
            : moment(result.secondTime.length <= 5 ? `0:${result.secondTime}` : result.secondTime, timeFormat),
          iPosition: result.position,
          iNofStartsInClass: result.nofStartsInClass,
          iAward: result.award,
          iOriginalFee: result.originalFee,
          iLateFee: result.lateFee,
          iFeeToClub: result.feeToClub,
          iServiceFeeToClub: result.serviceFeeToClub,
          iServiceFeeDescription: result.serviceFeeDescription,
          iTotalFeeToClub: result.feeToClub + result.serviceFeeToClub,
          iEventClassificationId: eventClassificationId,
          iDeviantEventClassificationId: result.deviantEventClassificationId,
        }}
        onValuesChange={() => hasErrors(self.formRef.current).then((notValid) => onValidate(!notValid))}
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
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                options={competitorsOptions}
                onChange={(code) => {
                  // eslint-disable-next-line eqeqeq
                  result.competitorId = code == undefined ? undefined : parseInt(code);
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
                    result.competitorId = competitor ? competitor.competitorId : undefined;
                    result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                    self.formRef.current.setFieldsValue({
                      // eslint-disable-next-line eqeqeq
                      iCompetitorId: result.competitorId == undefined ? undefined : result.competitorId.toString(),
                      iFeeToClub: result.feeToClub,
                    });
                    self.setState({ age: competitor ? GetAge(competitor.birthDay, raceDate) : null }, () => {
                      self.formRef.current.validateFields(['iCompetitorId', 'iFeeToClub'], { force: true });
                    });
                  })
                  .catch(() => {});
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
                    self.formRef.current.setFieldsValue({
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
                    self.setState({}, () => {
                      self.formRef.current.validateFields(
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
                    });
                  } else {
                    const classLevel = raceClubs.classLevels
                      .filter((cl) => result.className.indexOf(cl.classShortName) >= 0)
                      .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                      .find(() => true);
                    result.classClassificationId = GetClassClassificationId(
                      result.deviantEventClassificationId ? result.deviantEventClassificationId : eventClassificationId,
                      classLevel,
                      raceClubs.eventClassifications
                    );
                    result.difficulty = classLevel ? classLevel.difficulty : null;
                    self.formRef.current.setFieldsValue({
                      iClassClassificationId:
                        result.classClassificationId == null ? undefined : result.classClassificationId.toString(),
                      iDifficulty: result.difficulty,
                    });
                    self.setState({}, () => {
                      self.formRef.current.validateFields(['iClassClassificationId', 'iDifficulty'], { force: true });
                    });
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
                options={raceClubs.classClassificationOptions(
                  result.deviantEventClassificationId ? result.deviantEventClassificationId : eventClassificationId
                )}
                onChange={(code) => {
                  result.classClassificationId = !code ? undefined : parseInt(code);
                  const tempClassClassification = raceEventClassification.classClassifications.find(
                    (cc) => cc.classClassificationId === result.classClassificationId
                  );
                  result.feeToClub = GetCompetitorFee(paymentModel, result, age, tempClassClassification);
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) =>
                    r.setValue('classClassificationId', result.classClassificationId)
                  );
                  self.formRef.current.setFieldsValue({
                    iFeeToClub: result.feeToClub,
                  });
                  self.setState({ classClassification: tempClassClassification }, () => {
                    self.formRef.current.validateFields(['iFeeToClub'], {
                      force: true,
                    });
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
                onChange={(code) => {
                  result.difficulty = code;
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue('difficulty', result.difficulty));
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
                onChange={(value) => {
                  result.lengthInMeter = value;
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue('lengthInMeter', result.lengthInMeter));
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
                  self.formRef.current.setFieldsValue({
                    iFeeToClub: result.feeToClub,
                  });
                  self.setState({ failedReason: code }, () => {
                    self.formRef.current.validateFields(
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
                  });
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
                  type: 'object',
                  required: !failedReason,
                  message: errorRequiredField(t, 'results.Time'),
                },
              ]}
            >
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: '100%' }}
                onChange={(time) => {
                  result.competitorTime = !time ? null : time.format(timeFormat);
                  self.setState({}, () => {
                    self.formRef.current.validateFields(['iWinnerTime'], { force: true });
                  });
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
                  type: 'object',
                  required: !failedReason,
                  message: errorRequiredField(t, 'results.WinnerTime'),
                },
                {
                  type: 'object',
                  validator: (rule, value, callback) => {
                    const competitorTime = self.formRef.current.getFieldValue('iCompetitorTime');
                    if (competitorTime && value && !value.isSameOrBefore(competitorTime)) {
                      callback(t('results.WinnerTimeLessOrEqualThanTime'));
                    }
                    callback();
                  },
                },
              ]}
            >
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: '100%' }}
                onChange={(time) => {
                  result.winnerTime = !time ? null : time.format(timeFormat);
                  self.setState({}, () => {
                    self.formRef.current.validateFields(['iSecondTime'], { force: true });
                  });
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue('winnerTime', result.winnerTime));
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
                  type: 'object',
                  validator: (rule, value, callback) => {
                    const winnerTime = self.formRef.current.getFieldValue('iWinnerTime');
                    if (winnerTime && value && !value.isSameOrAfter(winnerTime)) {
                      callback(t('results.SecondTimeGreaterOrEqualThanWinnerTime'));
                    }
                    callback();
                  },
                },
              ]}
            >
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: '100%' }}
                onChange={(time) => {
                  result.secondTime = !time ? null : time.format(timeFormat);
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue('secondTime', result.secondTime));
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
                onChange={(value) => {
                  result.position = value;
                  self.setState({}, () => {
                    self.formRef.current.validateFields(['iNofStartsInClass'], { force: true });
                  });
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
                    const position = self.formRef.current.getFieldValue('iPosition');
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
                onChange={(value) => {
                  result.nofStartsInClass = value;
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue('nofStartsInClass', result.nofStartsInClass));
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iAward" label={t('results.Award')}>
              <Select
                allowClear={true}
                onChange={(code) => {
                  result.award = code;
                  self.setState({ isAwardTouched: true });
                }}
              >
                {calculatedAward ? <Option value={calculatedAward}>{calculatedAward}</Option> : null}
              </Select>
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
                onChange={(value) => {
                  result.originalFee = value;
                  result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                  self.formRef.current.setFieldsValue({
                    iFeeToClub: result.feeToClub,
                    iTotalFeeToClub: result.feeToClub + result.serviceFeeToClub,
                  });
                  self.setState({}, () => {
                    self.formRef.current.validateFields(['iFeeToClub'], {
                      force: true,
                    });
                  });
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => {
                    r.setValue('originalFee', result.originalFee);
                    r.setValue('feeToClub', GetCompetitorFee(paymentModel, r, age, classClassification));
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
                onChange={(value) => {
                  result.lateFee = value;
                  result.feeToClub = GetCompetitorFee(paymentModel, result, age, classClassification);
                  self.formRef.current.setFieldsValue({
                    iFeeToClub: result.feeToClub,
                    iTotalFeeToClub: result.feeToClub + result.serviceFeeToClub,
                  });
                  self.setState({}, () => {
                    self.formRef.current.validateFields(['iFeeToClub'], {
                      force: true,
                    });
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
                onChange={(value) => {
                  result.feeToClub = value;
                  self.formRef.current.setFieldsValue({
                    iTotalFeeToClub: result.feeToClub + result.serviceFeeToClub,
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
                onChange={(value) => {
                  result.serviceFeeToClub = value;
                  self.formRef.current.setFieldsValue({
                    iTotalFeeToClub: result.feeToClub + result.serviceFeeToClub,
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
                  self.formRef.current.setFieldsValue({
                    iClassClassificationId:
                      // eslint-disable-next-line eqeqeq
                      result.classClassificationId == undefined ? undefined : result.classClassificationId.toString(),
                  });
                  self.setState({ raceEventClassification: raceEventClassification }, () => {
                    self.formRef.current.validateFields(['iClassClassificationId'], { force: true });
                  });
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.resultId !== result.resultId
                  );
                  resultsWithSameClass.forEach((r) => {
                    r.setValue('deviantEventClassificationId', result.deviantEventClassificationId);
                    r.setValue('classClassificationId', result.classClassificationId);
                  });
                }}
              />
            </FormItem>
          </Col>
        </Row>
      </Form>
    );
  }
}

const EditResultIndividualWithI18n = withTranslation()(EditResultIndividual); // pass `t` function to App

export default EditResultIndividualWithI18n;
