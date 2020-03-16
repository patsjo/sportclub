import React, { Component } from "react";
import PropTypes from "prop-types";
import { Form, TimePicker, Select, Input, InputNumber, Row, Col } from "antd";
import { withTranslation } from "react-i18next";
import FormItem from "../formItems/FormItem";
import { errorRequiredField, FormSelect, timeFormat } from "../../utils/formHelper";
import { GetClassClassificationId, GetAge } from "../../utils/resultHelper";
import {
  difficulties,
  failedReasons,
  failedReasonOptions,
  raceLightConditionOptions
} from "../../utils/resultConstants";
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

class EditResultRelay extends Component {
  static propTypes = {
    clubModel: PropTypes.object.isRequired,
    raceDate: PropTypes.string,
    eventClassificationId: PropTypes.object.isRequired,
    raceLightCondition: PropTypes.string.isRequired,
    result: PropTypes.object.isRequired,
    competitorsOptions: PropTypes.arrayOf(PropTypes.object),
    onValidate: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      formId: "editResultRelay" + Math.floor(Math.random() * 10000000000000000),
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
      eventClassificationId,
      raceLightCondition,
      result,
      competitorsOptions,
      form,
      raceDate
    } = this.props;
    const { formId, failedReason, valid } = this.state;
    const { getFieldDecorator, getFieldError, getFieldsError, getFieldValue, validateFields, setFieldsValue } = form;
    const { raceClubs } = clubModel;

    // Only show error after a field is touched.
    const competitorIdError = getFieldError("iCompetitorId");
    const teamNameError = getFieldError("iTeamName");
    const classNameError = getFieldError("iClassName");
    const classClassificationError = getFieldError("iClassClassificationId");
    const difficultyError = getFieldError("iDifficulty");
    const lengthInMeterError = getFieldError("iLengthInMeter");
    const competitorTimeError = getFieldError("iCompetitorTime");
    const winnerTimeError = getFieldError("iWinnerTime");
    const secondTimeError = getFieldError("iSecondTime");
    const positionError = getFieldError("iPosition");
    const nofStartsInClassError = getFieldError("iNofStartsInClass");
    const stageError = getFieldError("iStage");
    const totalStagesError = getFieldError("iTotalStages");
    const totalNofStartsInClassError = getFieldError("iTotalNofStartsInClass");
    const isValid = !this.hasErrors(getFieldsError());

    if (isValid !== valid) {
      onValidate(isValid);
      self.setState({ valid: isValid });
    }

    return (
      <Form id={formId}>
        <Row gutter={8}>
          <Col span={12}>
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
          <Col span={1} style={{ paddingTop: 28 }}>
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
                    self.setState({ age: competitor ? GetAge(competitor.birthDay, raceDate) : null }, () => {
                      validateFields(["iCompetitorId"], { force: true });
                    });
                  })
                  .catch(() => {});
              }}
            />
          </Col>
          <Col span={11}>
            <FormItem
              label={t("results.TeamName")}
              validateStatus={teamNameError ? "error" : ""}
              help={teamNameError || ""}
            >
              {getFieldDecorator("iTeamName", {
                initialValue: result.teamName,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.TeamName")
                  }
                ]
              })(
                <Input
                  onChange={e => {
                    result.teamName = e.currentTarget.value;
                  }}
                />
              )}
            </FormItem>
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
                    self.setState({ failedReason: code }, () => {
                      validateFields(
                        [
                          "iLengthInMeter",
                          "iCompetitorTime",
                          "iWinnerTime",
                          "iSecondTime",
                          "iPosition",
                          "iNofStartsInClass"
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
                    result.competitorTime = !time ? null : time.format(timeFormat);
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
                    result.winnerTime = !time ? null : time.format(timeFormat);
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
                    result.secondTime = !time ? null : time.format(timeFormat);
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
          <Col span={6}>
            <FormItem label={t("results.Stage")} validateStatus={stageError ? "error" : ""} help={stageError || ""}>
              {getFieldDecorator("iStage", {
                initialValue: result.stage,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.Stage")
                  }
                ]
              })(
                <InputNumber
                  min={1}
                  max={1000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.stage = value;
                    self.setState({}, () => {
                      validateFields(["iTotalStages"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.TotalStages")}
              validateStatus={totalStagesError ? "error" : ""}
              help={totalStagesError || ""}
            >
              {getFieldDecorator("iTotalStages", {
                initialValue: result.totalStages,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.TotalStages")
                  },
                  {
                    validator: (rule, value, callback) => {
                      const stage = getFieldValue("iStage");
                      if (stage && value && value < stage) {
                        callback(t("results.StageGreaterThanTotalStages"));
                      }
                      callback();
                    }
                  }
                ]
              })(
                <InputNumber
                  min={1}
                  max={1000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.totalStages = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem label={t("results.DeltaPositions")}>
              {getFieldDecorator("iDeltaPositions", {
                initialValue: result.deltaPositions
              })(
                <InputNumber
                  min={-1000}
                  max={1000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.deltaPositions = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.DeltaTimeBehind")}>
              {getFieldDecorator("iDeltaTimeBehind", {
                initialValue: !result.deltaTimeBehind
                  ? null
                  : moment(
                      result.deltaTimeBehind.length <= 5 ? `0:${result.deltaTimeBehind}` : result.deltaTimeBehind,
                      timeFormat
                    )
              })(
                <TimePicker
                  format={timeFormat}
                  allowClear={true}
                  style={{ width: "100%" }}
                  onChange={time => {
                    result.deltaTimeBehind = !time ? null : time.format(timeFormat);
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.TotalStagePosition")}>
              {getFieldDecorator("iTotalStagePosition", {
                initialValue: result.totalStagePosition
              })(
                <InputNumber
                  min={-1000}
                  max={1000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.totalStagePosition = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.TotalStageTimeBehind")}>
              {getFieldDecorator("iTotalStageTimeBehind", {
                initialValue: !result.totalStageTimeBehind
                  ? null
                  : moment(
                      result.totalStageTimeBehind.length <= 5
                        ? `0:${result.totalStageTimeBehind}`
                        : result.totalStageTimeBehind,
                      timeFormat
                    )
              })(
                <TimePicker
                  format={timeFormat}
                  allowClear={true}
                  style={{ width: "100%" }}
                  onChange={time => {
                    result.totalStageTimeBehind = !time ? null : time.format(timeFormat);
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem label={t("results.TeamFailedReason")}>
              {getFieldDecorator("iTeamFailedReason", {
                initialValue: result.teamFailedReason
              })(
                <FormSelect
                  allowClear={true}
                  options={failedReasonOptions(t)}
                  onChange={code => {
                    result.teamFailedReason = code;
                    self.setState({ teamFailedReason: code }, () => {
                      validateFields(["iTotalTimeBehind", "iTotalPosition", "iTotalNofStartsInClass"], {
                        force: true
                      });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.TotalPosition")}>
              {getFieldDecorator("iTotalPosition", {
                initialValue: result.totalPosition
              })(
                <InputNumber
                  min={1}
                  max={100000}
                  step={1}
                  style={{ width: "100%" }}
                  onChange={value => {
                    result.totalPosition = value;
                    self.setState({}, () => {
                      validateFields(["iTotalNofStartsInClass"], { force: true });
                    });
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              label={t("results.TotalNofStartsInClass")}
              validateStatus={totalNofStartsInClassError ? "error" : ""}
              help={totalNofStartsInClassError || ""}
            >
              {getFieldDecorator("iTotalNofStartsInClass", {
                initialValue: result.totalNofStartsInClass,
                rules: [
                  {
                    validator: (rule, value, callback) => {
                      const totalPosition = getFieldValue("iTotalPosition");
                      if (totalPosition && value && value < totalPosition) {
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
                    result.totalNofStartsInClass = value;
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.TotalTimeBehind")}>
              {getFieldDecorator("iTotalTimeBehind", {
                initialValue: !result.totalTimeBehind
                  ? null
                  : moment(
                      result.totalTimeBehind.length <= 5 ? `0:${result.totalTimeBehind}` : result.totalTimeBehind,
                      timeFormat
                    )
              })(
                <TimePicker
                  format={timeFormat}
                  allowClear={true}
                  style={{ width: "100%" }}
                  onChange={time => {
                    result.totalTimeBehind = !time ? null : time.format(timeFormat);
                  }}
                />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={4}>
            <FormItem label={t("results.RaceLightCondition")}>
              {getFieldDecorator("iRaceLightCondition", {
                initialValue: raceLightCondition
              })(<FormSelect disabled={true} options={raceLightConditionOptions(t)} />)}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.DeviantRaceLightCondition")}>
              {getFieldDecorator("iDeviantRaceLightCondition", {
                initialValue: result.deviantRaceLightCondition
              })(
                <FormSelect
                  allowClear={true}
                  options={raceLightConditionOptions(t)}
                  onChange={code => {
                    result.raceLightCondition = code;
                  }}
                />
              )}
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem label={t("results.EventClassification")}>
              {getFieldDecorator("iEventClassificationId", {
                initialValue: eventClassificationId
              })(<FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />)}
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem label={t("results.DeviantEventClassification")}>
              {getFieldDecorator("iDeviantEventClassificationId", {
                initialValue: result.deviantEventClassificationId
              })(
                <FormSelect
                  dropdownMatchSelectWidth={false}
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
                    const newEventClassificationId = code ? code : eventClassificationId;
                    const raceEventClassification = raceClubs.eventClassifications.find(
                      ec => ec.eventClassificationId === newEventClassificationId
                    );
                    setFieldsValue({
                      iClassClassificationId:
                        // eslint-disable-next-line eqeqeq
                        result.classClassificationId == undefined ? undefined : result.classClassificationId.toString()
                    });
                    self.setState({ raceEventClassification: raceEventClassification }, () => {
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

const EditResultRelayForm = Form.create()(EditResultRelay);
const EditResultRelayWithI18n = withTranslation()(EditResultRelayForm); // pass `t` function to App

export default EditResultRelayWithI18n;
