import React, { Component } from "react";
import PropTypes from "prop-types";
import { Form, TimePicker, Select, Input, InputNumber, Row, Col } from "antd";
import { withTranslation } from "react-i18next";
import FormItem from "../formItems/FormItem";
import { errorRequiredField, FormSelect, timeFormat, hasErrors } from "../../utils/formHelper";
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
  background: ${(props) => props.background};
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
    results: PropTypes.arrayOf(PropTypes.object),
    competitorsOptions: PropTypes.arrayOf(PropTypes.object),
    onValidate: PropTypes.func.isRequired
  };
  formRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      formId: "editResultRelay" + Math.floor(Math.random() * 10000000000000000),
      failedReason: props.result.failedReason
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
      eventClassificationId,
      raceLightCondition,
      result,
      results,
      competitorsOptions,
      raceDate
    } = this.props;
    const { formId, failedReason } = this.state;
    const { raceClubs } = clubModel;

    return (
      <Form
        id={formId}
        ref={self.formRef}
        layout="vertical"
        initialValues={{
          iCompetitorId: !result.competitorId ? undefined : result.competitorId.toString(),
          iTeamName: result.teamName,
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
          iStage: result.stage,
          iTotalStages: result.totalStages,
          iDeltaPositions: result.deltaPositions,
          iDeltaTimeBehind: !result.deltaTimeBehind
            ? null
            : moment(
                result.deltaTimeBehind.length <= 5 ? `0:${result.deltaTimeBehind}` : result.deltaTimeBehind,
                timeFormat
              ),
          iTotalStagePosition: result.totalStagePosition,
          iTotalStageTimeBehind: !result.totalStageTimeBehind
            ? null
            : moment(
                result.totalStageTimeBehind.length <= 5
                  ? `0:${result.totalStageTimeBehind}`
                  : result.totalStageTimeBehind,
                timeFormat
              ),
          iTeamFailedReason: result.teamFailedReason,
          iTotalPosition: result.totalPosition,
          iTotalNofStartsInClass: result.totalNofStartsInClass,
          iTotalTimeBehind: !result.totalTimeBehind
            ? null
            : moment(
                result.totalTimeBehind.length <= 5 ? `0:${result.totalTimeBehind}` : result.totalTimeBehind,
                timeFormat
              ),
          iRaceLightCondition: raceLightCondition,
          iDeviantRaceLightCondition: result.deviantRaceLightCondition,
          iEventClassificationId: eventClassificationId,
          iDeviantEventClassificationId: result.deviantEventClassificationId
        }}
        onValuesChange={() => hasErrors(self.formRef.current).then((notValid) => onValidate(!notValid))}
      >
        <Row gutter={8}>
          <Col span={12}>
            <FormItem
              name="iCompetitorId"
              label={t("results.Competitor")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.Competitor")
                }
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
          <Col span={1} style={{ paddingTop: 28 }}>
            <StyledIcon
              type="edit"
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
                  .then((competitor) => {
                    result.competitorId = competitor ? competitor.competitorId : undefined;
                    self.formRef.current.setFieldsValue({
                      // eslint-disable-next-line eqeqeq
                      iCompetitorId: result.competitorId == undefined ? undefined : result.competitorId.toString()
                    });
                    self.setState({ age: competitor ? GetAge(competitor.birthDay, raceDate) : null }, () => {
                      self.formRef.current.validateFields(["iCompetitorId"], { force: true });
                    });
                  })
                  .catch(() => {});
              }}
            />
          </Col>
          <Col span={11}>
            <FormItem
              name="iTeamName"
              label={t("results.TeamName")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.TeamName")
                }
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
              label={t("results.Class")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.Class")
                }
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
                    result.deviantEventClassificationId ? result.deviantEventClassificationId : eventClassificationId,
                    classLevel,
                    raceClubs.eventClassifications
                  );
                  result.difficulty = classLevel ? classLevel.difficulty : null;
                  self.formRef.current.setFieldsValue({
                    iClassClassificationId:
                      // eslint-disable-next-line eqeqeq
                      result.classClassificationId == undefined ? undefined : result.classClassificationId.toString(),
                    iDifficulty: result.difficulty
                  });
                  self.setState({}, () => {
                    self.formRef.current.validateFields(["iClassClassificationId", "iDifficulty"], { force: true });
                  });
                }}
              />
            </FormItem>
          </Col>
          <Col span={4}>
            <FormItem
              name="iStage"
              label={t("results.Stage")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.Stage")
                }
              ]}
            >
              <InputNumber
                min={1}
                max={1000}
                step={1}
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.stage = value;
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
                    self.formRef.current.setFieldsValue({
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
                      iDeviantEventClassificationId: result.deviantEventClassificationId
                    });
                    self.setState({}, () => {
                      self.formRef.current.validateFields(
                        [
                          "iClassClassificationId",
                          "iDifficulty",
                          "iLengthInMeter",
                          "iWinnerTime",
                          "iSecondTime",
                          "iNofStartsInClass",
                          "iTotalStages",
                          "iDeviantRaceLightCondition",
                          "iTotalNofStartsInClass",
                          "iDeviantEventClassificationId",
                          "iTotalStages"
                        ],
                        { force: true }
                      );
                    });
                  } else {
                    self.setState({}, () => {
                      self.formRef.current.validateFields(["iTotalStages"], { force: true });
                    });
                  }
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iClassClassificationId"
              label={t("results.ClassClassification")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.ClassClassification")
                }
              ]}
            >
              <FormSelect
                allowClear={true}
                options={raceClubs.classClassificationOptions(
                  result.deviantEventClassificationId ? result.deviantEventClassificationId : eventClassificationId
                )}
                onChange={(code) => {
                  // eslint-disable-next-line eqeqeq
                  result.classClassificationId = code == undefined ? undefined : parseInt(code);
                  const resultsWithSameClass = results.filter(
                    (r) =>
                      r.className === result.className &&
                      r.stage === result.stage &&
                      r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) =>
                    r.setValue("classClassificationId", result.classClassificationId)
                  );
                }}
              />
            </FormItem>
          </Col>
          <Col span={4}>
            <FormItem
              name="iDifficulty"
              label={t("results.Difficulty")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.Difficulty")
                }
              ]}
            >
              <Select
                allowClear={true}
                onChange={(code) => {
                  result.difficulty = code;
                  const resultsWithSameClass = results.filter(
                    (r) =>
                      r.className === result.className &&
                      r.stage === result.stage &&
                      r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue("difficulty", result.difficulty));
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
              label={t("results.LengthInMeter")}
              rules={[
                {
                  required: failedReason !== failedReasons.NotStarted,
                  message: errorRequiredField(t, "results.LengthInMeter")
                }
              ]}
            >
              <InputNumber
                min={10}
                max={100000}
                step={100}
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.lengthInMeter = value;
                  const resultsWithSameClass = results.filter(
                    (r) =>
                      r.className === result.className &&
                      r.stage === result.stage &&
                      r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue("lengthInMeter", result.lengthInMeter));
                }}
              />
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem name="iFailedReason" label={t("results.FailedReason")}>
              <FormSelect
                allowClear={true}
                options={failedReasonOptions(t)}
                onChange={(code) => {
                  result.failedReason = code;
                  self.setState({ failedReason: code }, () => {
                    self.formRef.current.validateFields(
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
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iCompetitorTime"
              label={t("results.Time")}
              rules={[
                {
                  type: "object",
                  required: !failedReason,
                  message: errorRequiredField(t, "results.Time")
                }
              ]}
            >
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: "100%" }}
                onChange={(time) => {
                  result.competitorTime = !time ? null : time.format(timeFormat);
                  self.setState({}, () => {
                    self.formRef.current.validateFields(["iWinnerTime"], { force: true });
                  });
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iWinnerTime"
              label={t("results.WinnerTime")}
              rules={[
                {
                  type: "object",
                  required: !failedReason,
                  message: errorRequiredField(t, "results.WinnerTime")
                },
                {
                  type: "object",
                  validator: (rule, value, callback) => {
                    const competitorTime = self.formRef.current.getFieldValue("iCompetitorTime");
                    if (competitorTime && value && !value.isSameOrBefore(competitorTime)) {
                      callback(t("results.WinnerTimeLessOrEqualThanTime"));
                    }
                    callback();
                  }
                }
              ]}
            >
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: "100%" }}
                onChange={(time) => {
                  result.winnerTime = !time ? null : time.format(timeFormat);
                  self.setState({}, () => {
                    self.formRef.current.validateFields(["iSecondTime"], { force: true });
                  });
                  const resultsWithSameClass = results.filter(
                    (r) =>
                      r.className === result.className &&
                      r.stage === result.stage &&
                      r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue("winnerTime", result.winnerTime));
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iSecondTime"
              label={t("results.SecondTime")}
              rules={[
                {
                  type: "object",
                  validator: (rule, value, callback) => {
                    const winnerTime = self.formRef.current.getFieldValue("iWinnerTime");
                    if (winnerTime && value && !value.isSameOrAfter(winnerTime)) {
                      callback(t("results.SecondTimeGreaterOrEqualThanWinnerTime"));
                    }
                    callback();
                  }
                }
              ]}
            >
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: "100%" }}
                onChange={(time) => {
                  result.secondTime = !time ? null : time.format(timeFormat);
                  const resultsWithSameClass = results.filter(
                    (r) =>
                      r.className === result.className &&
                      r.stage === result.stage &&
                      r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue("secondTime", result.secondTime));
                }}
              />
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem
              name="iPosition"
              label={t("results.Position")}
              rules={[
                {
                  required: !failedReason,
                  message: errorRequiredField(t, "results.Position")
                }
              ]}
            >
              <InputNumber
                min={1}
                max={100000}
                step={1}
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.position = value;
                  self.setState({}, () => {
                    self.formRef.current.validateFields(["iNofStartsInClass"], { force: true });
                  });
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iNofStartsInClass"
              label={t("results.NofStartsInClass")}
              rules={[
                {
                  required: !failedReason,
                  message: errorRequiredField(t, "results.NofStartsInClass")
                },
                {
                  validator: (rule, value, callback) => {
                    const position = self.formRef.current.getFieldValue("iPosition");
                    if (position && value && value < position) {
                      callback(t("results.PositionGreaterThanStarts"));
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
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.nofStartsInClass = value;
                  const resultsWithSameClass = results.filter(
                    (r) =>
                      r.className === result.className &&
                      r.stage === result.stage &&
                      r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue("nofStartsInClass", result.nofStartsInClass));
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iTotalStages"
              label={t("results.TotalStages")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.TotalStages")
                },
                {
                  validator: (rule, value, callback) => {
                    const stage = self.formRef.current.getFieldValue("iStage");
                    if (stage && value && value < stage) {
                      callback(t("results.StageGreaterThanTotalStages"));
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
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.totalStages = value;
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) => r.setValue("totalStages", result.totalStages));
                }}
              />
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem name="iDeltaPositions" label={t("results.DeltaPositions")}>
              <InputNumber
                min={-1000}
                max={1000}
                step={1}
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.deltaPositions = value;
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iDeltaTimeBehind" label={t("results.DeltaTimeBehind")}>
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: "100%" }}
                onChange={(time) => {
                  result.deltaTimeBehind = !time ? null : time.format(timeFormat);
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iTotalStagePosition" label={t("results.TotalStagePosition")}>
              <InputNumber
                min={-1000}
                max={1000}
                step={1}
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.totalStagePosition = value;
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iTotalStageTimeBehind" label={t("results.TotalStageTimeBehind")}>
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: "100%" }}
                onChange={(time) => {
                  result.totalStageTimeBehind = !time ? null : time.format(timeFormat);
                }}
              />
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <FormItem name="iTeamFailedReason" label={t("results.TeamFailedReason")}>
              <FormSelect
                allowClear={true}
                options={failedReasonOptions(t)}
                onChange={(code) => {
                  result.teamFailedReason = code;
                  self.setState({ teamFailedReason: code }, () => {
                    self.formRef.current.validateFields(
                      ["iTotalTimeBehind", "iTotalPosition", "iTotalNofStartsInClass"],
                      {
                        force: true
                      }
                    );
                  });
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iTotalPosition" label={t("results.TotalPosition")}>
              <InputNumber
                min={1}
                max={100000}
                step={1}
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.totalPosition = value;
                  self.setState({}, () => {
                    self.formRef.current.validateFields(["iTotalNofStartsInClass"], { force: true });
                  });
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem
              name="iTotalNofStartsInClass"
              label={t("results.TotalNofStartsInClass")}
              rules={[
                {
                  validator: (rule, value, callback) => {
                    const totalPosition = self.formRef.current.getFieldValue("iTotalPosition");
                    if (totalPosition && value && value < totalPosition) {
                      callback(t("results.PositionGreaterThanStarts"));
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
                style={{ width: "100%" }}
                onChange={(value) => {
                  result.totalNofStartsInClass = value;
                  const resultsWithSameClass = results.filter(
                    (r) => r.className === result.className && r.teamResultId !== result.teamResultId
                  );
                  resultsWithSameClass.forEach((r) =>
                    r.setValue("totalNofStartsInClass", result.totalNofStartsInClass)
                  );
                }}
              />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iTotalTimeBehind" label={t("results.TotalTimeBehind")}>
              <TimePicker
                format={timeFormat}
                allowClear={true}
                style={{ width: "100%" }}
                onChange={(time) => {
                  result.totalTimeBehind = !time ? null : time.format(timeFormat);
                }}
              />
            </FormItem>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={4}>
            <FormItem name="iRaceLightCondition" label={t("results.RaceLightCondition")}>
              <FormSelect disabled={true} options={raceLightConditionOptions(t)} />
            </FormItem>
          </Col>
          <Col span={6}>
            <FormItem name="iDeviantRaceLightCondition" label={t("results.DeviantRaceLightCondition")}>
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
            <FormItem name="iEventClassificationId" label={t("results.EventClassification")}>
              <FormSelect disabled={true} options={raceClubs.eventClassificationOptions} />
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem name="iDeviantEventClassificationId" label={t("results.DeviantEventClassification")}>
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
                  self.formRef.current.setFieldsValue({
                    iClassClassificationId:
                      // eslint-disable-next-line eqeqeq
                      result.classClassificationId == undefined ? undefined : result.classClassificationId.toString()
                  });
                  self.setState({ raceEventClassification: raceEventClassification }, () => {
                    self.formRef.current.validateFields(["iClassClassificationId"], { force: true });
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

const EditResultRelayWithI18n = withTranslation()(EditResultRelay); // pass `t` function to App

export default EditResultRelayWithI18n;
