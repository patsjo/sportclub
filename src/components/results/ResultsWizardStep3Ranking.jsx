import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { Row, Col, Form, TimePicker, InputNumber } from "antd";
import { observer, inject } from "mobx-react";
import FormItem from "../formItems/FormItem";
import { errorRequiredField, FormSelect } from "../../utils/formHelper";
import { lightConditions } from "../../utils/resultConstants";
import moment from "moment";

const areaResultOptions = [
  { timePerKilometer: "00:03:45.000", description: "Sprint" },
  { timePerKilometer: "00:04:30.000", description: "Snabblöpt flack tallskog (Åhus)" },
  { timePerKilometer: "00:04:45.000", description: "Snabblöpt tallskog (Kalmar)" },
  { timePerKilometer: "00:05:00.000", description: "Östkust terräng (Oskarshamn)" },
  { timePerKilometer: "00:05:15.000", description: "Inlandet (Blekinge, Småland, Närke, Värmland, Dalarna, Fjäll)" },
  { timePerKilometer: "00:05:30.000", description: "Kuperad inlandsterräng (Jönköping, Örebro)" },
  { timePerKilometer: "00:05:45.000", description: "Lite tuffare terräng" },
  { timePerKilometer: "00:06:00.000", description: "Kuperad och tuff terräng" }
].map((option) => ({ code: JSON.stringify(option), description: `${option.timePerKilometer}, ${option.description}` }));

const areaNightResultOptions = [
  { timePerKilometer: "00:03:45.000", description: "Natt - sprint" },
  { timePerKilometer: "00:04:45.000", description: "Natt - Snabblöpt flack tallskog (Åhus)" },
  { timePerKilometer: "00:05:15.000", description: "Natt - Snabblöpt tallskog (Kalmar)" },
  { timePerKilometer: "00:05:30.000", description: "Natt - Östkust terräng (Oskarshamn)" },
  {
    timePerKilometer: "00:05:45.000",
    description: "Natt - Inlandet (Blekinge, Småland, Närke, Värmland, Dalarna, Fjäll)"
  },
  { timePerKilometer: "00:06:00.000", description: "Natt - Kuperad inlandsterräng (Jönköping, Örebro)" },
  { timePerKilometer: "00:06:15.000", description: "Natt - Lite tuffare terräng" },
  { timePerKilometer: "00:06:30.000", description: "Natt - Kuperad och tuff terräng" }
].map((option) => ({ code: JSON.stringify(option), description: `${option.timePerKilometer}, ${option.description}` }));

// @inject("clubModel")
// @observer
const ResultWizardStep3Ranking = inject(
  "clubModel",
  "raceWizardModel",
  "sessionModel"
)(
  observer(
    class ResultWizardStep3Ranking extends Component {
      formRef = React.createRef();

      constructor(props) {
        super(props);
        this.state = {
          formId: "step3Ranking" + Math.floor(Math.random() * 10000000000000000)
        };
      }

      componentDidMount() {
        const { raceWizardModel, clubModel, onValidate } = this.props;

        if (
          raceWizardModel.raceEvent.rankingBasetimePerKilometer != null &&
          raceWizardModel.raceEvent.rankingBasepoint != null &&
          raceWizardModel.raceEvent.rankingBaseDescription != null
        ) {
          onValidate(true);
        } else {
          if (["OL", "SKIO", "MTBO"].includes(raceWizardModel.raceEvent.sportCode)) {
            raceWizardModel.raceEvent.setValue("rankingBasetimePerKilometer", undefined);
            raceWizardModel.raceEvent.setValue("rankingBasepoint", undefined);
            if (!raceWizardModel.existInEventor) {
              raceWizardModel.raceEvent.setValue("rankingBaseDescription", raceWizardModel.raceEvent.sportCode);
            } else {
              raceWizardModel.raceEvent.setValue("rankingBaseDescription", undefined);
            }
          } else {
            let timePerKilometer = "00:03:00.000";
            let description = clubModel.raceClubs.sportOptions.find(
              (option) => option.code === raceWizardModel.raceEvent.sportCode
            ).description;

            if (raceWizardModel.raceEvent.sportCode === "RUN") {
              timePerKilometer = "00:02:50.000";
            } else if (raceWizardModel.raceEvent.sportCode === "SKI") {
              timePerKilometer = "00:02:20.000";
            } else if (raceWizardModel.raceEvent.sportCode === "MTB") {
              timePerKilometer = "00:01:45.000";
            }
            raceWizardModel.raceEvent.setValue("rankingBasetimePerKilometer", timePerKilometer);
            raceWizardModel.raceEvent.setValue("rankingBasepoint", 0);
            raceWizardModel.raceEvent.setValue("rankingBaseDescription", `${timePerKilometer}, ${description}`);
            onValidate(true);
          }
        }
      }

      render() {
        const self = this;
        const { t, saving, raceWizardModel, onValidate } = this.props;
        const { formId } = this.state;

        return !saving ? (
          <Form
            id={formId}
            ref={self.formRef}
            layout="vertical"
            initialValues={{
              iRankingBasetimePerKilometer: !raceWizardModel.raceEvent.rankingBasetimePerKilometer
                ? null
                : moment(raceWizardModel.raceEvent.rankingBasetimePerKilometer, "HH:mm:ss.SSS"),
              iRankingBasepoint: raceWizardModel.raceEvent.rankingBasepoint
            }}
          >
            {["OL", "SKIO", "MTBO"].includes(raceWizardModel.raceEvent.sportCode) ? (
              <>
                <Row gutter={8}>
                  <Col span={24}>
                    Välj i första hand bästa herrsenioren, och hans ranking på samma tävling enligt sverigelistan.
                  </Col>
                </Row>
                <Row gutter={8}>
                  <Col span={24}>Välj i andra hand bästa junior, om denna tillhör sverige eliten.</Col>
                </Row>
                <Row gutter={8}>
                  <Col span={24}>Välj i tredje hand hastighet från en terrängtyp.</Col>
                </Row>
                <Row gutter={8}>
                  <Col span={24}>
                    OBS! Undvik att välja gubbar, damer eller ungdomar från sverigelistan, då detta blir helt
                    missvisande.
                  </Col>
                </Row>
                <Row gutter={8}>
                  {raceWizardModel.existInEventor && !raceWizardModel.raceEvent.isRelay ? (
                    <Col span={12}>
                      <FormItem name="iWinnerTime" label={t("results.WinnerTime")}>
                        <FormSelect
                          dropdownMatchSelectWidth={false}
                          allowClear={true}
                          options={raceWizardModel.raceWinnerResultOptions}
                          onChange={(code) => {
                            const raceWinnerResult = JSON.parse(code);
                            raceWizardModel.raceEvent.setValue(
                              "rankingBasetimePerKilometer",
                              raceWinnerResult.timePerKilometer
                            );
                            raceWizardModel.raceEvent.setValue("rankingBasepoint", undefined);
                            raceWizardModel.raceEvent.setValue(
                              "rankingBaseDescription",
                              `${raceWinnerResult.timePerKilometer}, ${raceWinnerResult.className}, ${raceWinnerResult.personName}`
                            );
                            self.formRef.current.setFieldsValue({
                              iAreaTime: undefined,
                              iRankingBasetimePerKilometer: moment(raceWinnerResult.timePerKilometer, "HH:mm:ss.SSS"),
                              iRankingBasepoint: undefined
                            });
                            onValidate(raceWizardModel.raceEvent.validRanking);
                          }}
                        />
                      </FormItem>
                    </Col>
                  ) : null}
                  {raceWizardModel.raceEvent.sportCode === "OL" ? (
                    <Col span={12}>
                      <FormItem name="iAreaTime" label={t("results.Area")}>
                        <FormSelect
                          dropdownMatchSelectWidth={false}
                          allowClear={true}
                          options={
                            raceWizardModel.raceEvent.raceLightCondition === lightConditions.night
                              ? areaNightResultOptions
                              : areaResultOptions
                          }
                          onChange={(code) => {
                            const areaResult = JSON.parse(code);
                            raceWizardModel.raceEvent.setValue(
                              "rankingBasetimePerKilometer",
                              areaResult.timePerKilometer
                            );
                            raceWizardModel.raceEvent.setValue("rankingBasepoint", 0);
                            raceWizardModel.raceEvent.setValue(
                              "rankingBaseDescription",
                              `${areaResult.timePerKilometer}, ${areaResult.description}`
                            );
                            self.formRef.current.setFieldsValue({
                              iWinnerTime: undefined,
                              iRankingBasetimePerKilometer: moment(areaResult.timePerKilometer, "HH:mm:ss.SSS"),
                              iRankingBasepoint: 0
                            });
                            onValidate(raceWizardModel.raceEvent.validRanking);
                          }}
                        />
                      </FormItem>
                    </Col>
                  ) : null}
                </Row>
              </>
            ) : null}
            <Row gutter={8}>
              <Col span={6}>
                <FormItem
                  name="iRankingBasetimePerKilometer"
                  label={t("results.TimePerKilometer")}
                  rules={[
                    {
                      type: "object",
                      required: true,
                      message: errorRequiredField(t, "results.TimePerKilometer")
                    }
                  ]}
                >
                  <TimePicker
                    format={"mm:ss.SSS"}
                    disabled={!["OL", "SKIO", "MTBO"].includes(raceWizardModel.raceEvent.sportCode)}
                    allowClear={false}
                    style={{ width: "100%" }}
                    onChange={(time) => {
                      raceWizardModel.raceEvent.setValue(
                        "rankingBasetimePerKilometer",
                        !time ? null : time.format("HH:mm:ss.SSS")
                      );
                      onValidate(raceWizardModel.raceEvent.validRanking);
                    }}
                  />
                </FormItem>
              </Col>
              <Col span={6}>
                <FormItem
                  name="iRankingBasepoint"
                  label={t("results.Ranking")}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, "results.Ranking")
                    }
                  ]}
                >
                  <InputNumber
                    disabled={!["OL", "SKIO", "MTBO"].includes(raceWizardModel.raceEvent.sportCode)}
                    min={-5}
                    max={100}
                    step={0.01}
                    decimalSeparator=","
                    style={{ width: "100%" }}
                    onChange={(value) => {
                      try {
                        const val = value.indexOf && value.indexOf(".") === value.length - 1 ? `${value}0` : value;
                        raceWizardModel.raceEvent.setValue("rankingBasepoint", val);
                      } catch (error) {}
                      onValidate(raceWizardModel.raceEvent.validRanking);
                    }}
                  />
                </FormItem>
              </Col>
            </Row>
          </Form>
        ) : null;
      }
    }
  )
);

const ResultWizardStep3RankingWithI18n = withTranslation()(ResultWizardStep3Ranking); // pass `t` function to App

export default ResultWizardStep3RankingWithI18n;
