import React, { Component } from "react";
import PropTypes from "prop-types";
import { Form, TimePicker, Select, Input, InputNumber, Row, Col } from "antd";
import { withTranslation } from "react-i18next";
import FormItem from "../formItems/FormItem";
import { errorRequiredField, FormSelect, timeFormat, timeFormatWithoutHour } from "../../utils/formHelper";
import { GetAge, GetFees, GetCompetitorFee, GetClassClassificationId } from "../../utils/resultHelper";
import { difficulties, failedReasons, failedReasonOptions } from "../../models/resultWizardModel";
import moment from "moment";
import styled from "styled-components";
import { StyledIcon } from "../styled/styled";
import { AddMapCompetitorConfirmModal } from "./AddMapCompetitorConfirmModal";

const { Option } = Select;
const ColorOptionContent = styled.div`
  background: ${props => props.background};
  height: 18px;
  width: 30px;
  border: black 1px solid;
  margin-top: 6px;
`;

class EditResultIndividual extends Component {
  static propTypes = {
    clubModel: PropTypes.object.isRequired,
    paymentModel: PropTypes.number,
    eventClassificationId: PropTypes.object.isRequired,
    result: PropTypes.object.isRequired,
    competitorsOptions: PropTypes.arrayOf(PropTypes.object),
    onValidate: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      formId: "editResultIndividual" + Math.floor(Math.random() * 10000000000000000),
      failedReason: props.result.failedReason,
      valid: false
    };
  }

  componentDidMount() {
    this.setState({}, () => {
      this.props.form.validateFields(undefined, {
        force: true
      });
    });
  }

  hasErrors(fieldsError) {
    return Object.keys(fieldsError).some(field => fieldsError[field]);
  }

  render() {
    const self = this;
    const {
      t,
      onValidate,
      clubModel,
      paymentModel,
      eventClassificationId,
      result,
      competitorsOptions,
      form
    } = this.props;
    const { formId, failedReason, valid } = this.state;
    const { getFieldDecorator, getFieldError, getFieldsError, getFieldValue, validateFields, setFieldsValue } = form;
    const { raceClubs } = clubModel;

    // Only show error after a field is touched.
    const competitorIdError = getFieldError("iCompetitorId");
    const classNameError = getFieldError("iClassName");
    const classClassificationError = getFieldError("iClassClassificationId");
    const difficultyError = getFieldError("iDifficulty");
    const lengthInMeterError = getFieldError("iLengthInMeter");
    const competitorTimeError = getFieldError("iCompetitorTime");
    const winnerTimeError = getFieldError("iWinnerTime");
    const secondTimeError = getFieldError("iSecondTime");
    const positionError = getFieldError("iPosition");
    const nofStartsInClassError = getFieldError("iNofStartsInClass");
    const originalFeeError = getFieldError("iOriginalFee");
    const lateFeeError = getFieldError("iLateFee");
    const feeToClubError = getFieldError("iFeeToClub");
    const isValid = !this.hasErrors(getFieldsError());

    if (isValid !== valid) {
      onValidate(isValid);
      self.setState({ valid: isValid });
    }

    return (
      <Form id={formId}>
        <Row gutter={8}>
          <Col span={18}>
            <FormItem
              label={t("results.Competitor")}
              validateStatus={competitorIdError ? "error" : ""}
              help={competitorIdError || ""}
            >
              {getFieldDecorator("iCompetitorId", {
                // eslint-disable-next-line eqeqeq
                initialValue: result.competitorId == undefined ? undefined : result.competitorId.toString(),
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.Competitor")
                  }
                ]
              })(
                <FormSelect
                  disabled={true}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  options={competitorsOptions}
                  onChange={code => {
                    // eslint-disable-next-line eqeqeq
                    result.competitorId = code == undefined ? undefined : parseInt(code);
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6} style={{ paddingTop: 28 }}>
            <StyledIcon
              type="edit"
              theme="twoTone"
              onClick={() => {
                AddMapCompetitorConfirmModal(
                  t,
                  result.competitorId,
                  undefined,
                  {
                    iType: "COMPETITOR",
                    iFirstName: null,
                    iLastName: null,
                    iBirthDay: null,
                    iClubId: raceClubs.selectedClub.clubId,
                    iStartDate: "1930-01-01",
                    iEndDate: null,
                    iEventorCompetitorId: null
                  },
                  result.className,
                  clubModel
                )
                  .then(competitor => {
                    result.competitorId = competitor ? competitor.competitorId : undefined;
                    setFieldsValue({
                      // eslint-disable-next-line eqeqeq
                      iCompetitorId: result.competitorId == undefined ? undefined : result.competitorId.toString()
                    });
                    self.setState({}, () => {
                      validateFields(["iCompetitorId"], { force: true });
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
              label={t("results.Class")}
              validateStatus={classNameError ? "error" : ""}
              help={classNameError || ""}
            >
              {getFieldDecorator("iClassName", {
                initialValue: result.className,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.Class")
                  }
                ]
              })(
                <Input
                  onChange={e => {
                    result.className = e.currentTarget.value;
                    const classLevel = raceClubs.classLevels
                      .filter(cl => result.className.indexOf(cl.classShortName) >= 0)
                      .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                      .find(() => true);
                    result.classClassificationId = GetClassClassificationId(
                      result.deviantEventClassificationId ? result.deviantEventClassificationId : eventClassificationId,
                      classLevel,
                      raceClubs.eventClassifications
                    );
                    result.difficulty = classLevel ? classLevel.difficulty : null;
                    setFieldsValue({
                      iClassClassificationId:
                        // eslint-disable-next-line eqeqeq
                        result.classClassificationId == undefined ? undefined : result.classClassificationId.toString(),
                      iDifficulty: result.difficulty
                    });
                    self.setState({}, () => {
                      validateFields(["iClassClassificationId", "iDifficulty"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.ClassClassification")}
              validateStatus={classClassificationError ? "error" : ""}
              help={classClassificationError || ""}
            >
              {getFieldDecorator("iClassClassificationId", {
                initialValue:
                  // eslint-disable-next-line eqeqeq
                  result.classClassificationId == undefined ? undefined : result.classClassificationId.toString(),
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.ClassClassification")
                  }
                ]
              })(
                <FormSelect
                  allowClear={true}
                  options={raceClubs.classClassificationOptions(
                    result.deviantEventClassificationId ? result.deviantEventClassificationId : eventClassificationId
                  )}
                  onChange={code => {
                    // eslint-disable-next-line eqeqeq
                    result.classClassificationId = code == undefined ? undefined : parseInt(code);
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.Difficulty")}
              validateStatus={difficultyError ? "error" : ""}
              help={difficultyError || ""}
            >
              {getFieldDecorator("iDifficulty", {
                initialValue: result.difficulty,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.Difficulty")
                  }
                ]
              })(
                <Select
                  allowClear={true}
                  onChange={code => {
                    result.difficulty = code;
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
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.LengthInMeter")}
              validateStatus={lengthInMeterError ? "error" : ""}
              help={lengthInMeterError || ""}
            >
              {getFieldDecorator("iLengthInMeter", {
                initialValue: result.lengthInMeter,
                rules: [
                  {
                    required: failedReason !== failedReasons.NotStarted,
                    message: errorRequiredField(t, "results.LengthInMeter")
                  }
                ]
              })(
                <InputNumber
                  min={10}
                  max={100000}
                  step={100}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.lengthInMeter = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem label={t("results.FailedReason")}>
              {getFieldDecorator("iFailedReason", {
                initialValue: result.failedReason
              })(
                <FormSelect
                  allowClear={true}
                  options={failedReasonOptions(t)}
                  onChange={code => {
                    result.failedReason = code;
                    result.feeToClub = GetCompetitorFee(paymentModel, result);
                    setFieldsValue({
                      iFeeToClub: result.feeToClub
                    });
                    self.setState({ failedReason: code }, () => {
                      validateFields(
                        [
                          "iLengthInMeter",
                          "iCompetitorTime",
                          "iWinnerTime",
                          "iSecondTime",
                          "iPosition",
                          "iNofStartsInClass",
                          "iFeeToClub"
                        ],
                        {
                          force: true
                        }
                      );
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.Time")}
              validateStatus={competitorTimeError ? "error" : ""}
              help={competitorTimeError || ""}
            >
              {getFieldDecorator("iCompetitorTime", {
                initialValue: !result.competitorTime
                  ? null
                  : moment(
                      result.competitorTime.length <= 5 ? `0:${result.competitorTime}` : result.competitorTime,
                      timeFormat
                    ),
                rules: [
                  {
                    required: !failedReason,
                    message: errorRequiredField(t, "results.Time")
                  }
                ]
              })(
                <TimePicker
                  format={timeFormat}
                  allowClear={true}
                  style={{ width: "100%" }}
                  onChange={time => {
                    result.competitorTime = !time
                      ? null
                      : time.format(time.get("hour") === 0 ? timeFormatWithoutHour : timeFormat);
                    self.setState({}, () => {
                      validateFields(["iWinnerTime"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.WinnerTime")}
              validateStatus={winnerTimeError ? "error" : ""}
              help={winnerTimeError || ""}
            >
              {getFieldDecorator("iWinnerTime", {
                initialValue: !result.winnerTime
                  ? null
                  : moment(result.winnerTime.length <= 5 ? `0:${result.winnerTime}` : result.winnerTime, timeFormat),
                rules: [
                  {
                    required: !failedReason,
                    message: errorRequiredField(t, "results.WinnerTime")
                  },
                  {
                    validator: (rule, value, callback) => {
                      const competitorTime = getFieldValue("iCompetitorTime");
                      if (competitorTime && value && !value.isSameOrBefore(competitorTime)) {
                        callback(t("results.WinnerTimeLessOrEqualThanTime"));
                      }
                      callback();
                    }
                  }
                ]
              })(
                <TimePicker
                  format={timeFormat}
                  allowClear={true}
                  style={{ width: "100%" }}
                  onChange={time => {
                    result.winnerTime = !time
                      ? null
                      : time.format(time.get("hour") === 0 ? timeFormatWithoutHour : timeFormat);
                    self.setState({}, () => {
                      validateFields(["iSecondTime"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.SecondTime")}
              validateStatus={secondTimeError ? "error" : ""}
              help={secondTimeError || ""}
            >
              {getFieldDecorator("iSecondTime", {
                initialValue: !result.secondTime
                  ? null
                  : moment(result.secondTime.length <= 5 ? `0:${result.secondTime}` : result.secondTime, timeFormat),
                rules: [
                  {
                    validator: (rule, value, callback) => {
                      const winnerTime = getFieldValue("iWinnerTime");
                      if (winnerTime && value && !value.isSameOrAfter(winnerTime)) {
                        callback(t("results.SecondTimeGreaterOrEqualThanWinnerTime"));
                      }
                      callback();
                    }
                  }
                ]
              })(
                <TimePicker
                  format={timeFormat}
                  allowClear={true}
                  style={{ width: "100%" }}
                  onChange={time => {
                    result.secondTime = !time
                      ? null
                      : time.format(time.get("hour") === 0 ? timeFormatWithoutHour : timeFormat);
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem
              label={t("results.Position")}
              validateStatus={positionError ? "error" : ""}
              help={positionError || ""}
            >
              {getFieldDecorator("iPosition", {
                initialValue: result.position,
                rules: [
                  {
                    required: !failedReason,
                    message: errorRequiredField(t, "results.Position")
                  }
                ]
              })(
                <InputNumber
                  min={1}
                  max={100000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.position = value;
                    self.setState({}, () => {
                      validateFields(["iNofStartsInClass"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.NofStartsInClass")}
              validateStatus={nofStartsInClassError ? "error" : ""}
              help={nofStartsInClassError || ""}
            >
              {getFieldDecorator("iNofStartsInClass", {
                initialValue: result.nofStartsInClass,
                rules: [
                  {
                    required: !failedReason,
                    message: errorRequiredField(t, "results.NofStartsInClass")
                  },
                  {
                    validator: (rule, value, callback) => {
                      const position = getFieldValue("iPosition");
                      if (position && value && value < position) {
                        callback(t("results.PositionGreaterThanStarts"));
                      }
                      callback();
                    }
                  }
                ]
              })(
                <InputNumber
                  min={1}
                  max={100000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.nofStartsInClass = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem
              label={t("results.OriginalFee")}
              validateStatus={originalFeeError ? "error" : ""}
              help={originalFeeError || ""}
            >
              {getFieldDecorator("iOriginalFee", {
                initialValue: result.originalFee,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.OriginalFee")
                  }
                ]
              })(
                <InputNumber
                  min={0}
                  max={100000}
                  step={5}
                  precision={2}
                  decimalSeparator=","
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.originalFee = value;
                    result.feeToClub = GetCompetitorFee(paymentModel, result);
                    setFieldsValue({
                      iFeeToClub: result.feeToClub
                    });
                    self.setState({}, () => {
                      validateFields(["iFeeToClub"], {
                        force: true
                      });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.LateFee")}
              validateStatus={lateFeeError ? "error" : ""}
              help={lateFeeError || ""}
            >
              {getFieldDecorator("iLateFee", {
                initialValue: result.lateFee,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.LateFee")
                  }
                ]
              })(
                <InputNumber
                  min={0}
                  max={100000}
                  step={5}
                  precision={2}
                  decimalSeparator=","
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.lateFee = value;
                    result.feeToClub = GetCompetitorFee(paymentModel, result);
                    setFieldsValue({
                      iFeeToClub: result.feeToClub
                    });
                    self.setState({}, () => {
                      validateFields(["iFeeToClub"], {
                        force: true
                      });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.FeeToClub")}
              validateStatus={feeToClubError ? "error" : ""}
              help={feeToClubError || ""}
            >
              {getFieldDecorator("iFeeToClub", {
                initialValue: result.feeToClub,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.FeeToClub")
                  }
                ]
              })(
                <InputNumber
                  min={0}
                  max={100000}
                  step={5}
                  precision={2}
                  decimalSeparator=","
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.feeToClub = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <FormItem label={t("results.EventClassification")}>
              {getFieldDecorator("iEventClassificationId", {
                initialValue: eventClassificationId
              })(<FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />)}
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label={t("results.DeviantEventClassification")}>
              {getFieldDecorator("iDeviantEventClassificationId", {
                initialValue: result.deviantEventClassificationId
              })(
                <FormSelect
                  allowClear={true}
                  options={raceClubs.eventClassificationOptions}
                  onChange={code => {
                    result.deviantEventClassificationId = code;
                    const classLevel = raceClubs.classLevels
                      .filter(cl => result.className.indexOf(cl.classShortName) >= 0)
                      .sort((a, b) => (a.classShortName.length < b.classShortName.length ? 1 : -1))
                      .find(() => true);
                    result.classClassificationId = GetClassClassificationId(
                      code ? code : eventClassificationId,
                      classLevel,
                      raceClubs.eventClassifications
                    );
                    setFieldsValue({
                      iClassClassificationId:
                        // eslint-disable-next-line eqeqeq
                        result.classClassificationId == undefined ? undefined : result.classClassificationId.toString()
                    });
                    self.setState({}, () => {
                      validateFields(["iClassClassificationId"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
      </Form>
    );
  }
}

const EditResultIndividualForm = Form.create()(EditResultIndividual);
const EditResultIndividualWithI18n = withTranslation()(EditResultIndividualForm); // pass `t` function to App

export default EditResultIndividualWithI18n;
