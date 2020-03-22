import React, { Component } from "react";
import { Switch, Form, DatePicker } from "antd";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import { errorRequiredField, dateFormat, FormSelect } from "../../utils/formHelper";
import moment from "moment";
import FormItem from "../formItems/FormItem";

// @inject("raceWizardModel")
// @observer
const ResultWizardStep0Input = inject(
  "clubModel",
  "raceWizardModel"
)(
  observer(
    class ResultWizardStep0Input extends Component {
      static propTypes = {
        clubModel: PropTypes.object.isRequired,
        raceWizardModel: PropTypes.object.isRequired,
        onMount: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formId: "raceWizardForm" + Math.floor(Math.random() * 10000000000000000)
        };
      }

      componentDidMount() {
        // To disable next button at the beginning.
        this.props.form.validateFields();
        this.props.onMount && this.props.onMount(this.props.form);
      }

      render() {
        const self = this;
        const { t, form, clubModel, raceWizardModel } = self.props;
        const { formId } = self.state;
        const { getFieldDecorator, getFieldError } = form;
        // Only show error after a field is touched.
        const queryStartDateError = getFieldError("iQueryStartDate");
        const queryEndDateError = getFieldError("iQueryEndDate");

        return (
          <Form id={formId} onSubmit={self.onSave}>
            <FormItem label={t("results.Club")}>
              {getFieldDecorator("Club", {
                initialValue: clubModel.raceClubs.selectedClub.clubId.toString()
              })(
                <FormSelect
                  style={{ minWidth: 174, maxWidth: 334 }}
                  options={clubModel.raceClubs.clubOptions}
                  onChange={code => clubModel.raceClubs.setSelectedClub(code)}
                />
              )}
            </FormItem>
            {raceWizardModel.existInEventor ? (
              <>
                <FormItem
                  label={t("results.QueryStartDate")}
                  validateStatus={queryStartDateError ? "error" : ""}
                  help={queryStartDateError || ""}
                >
                  {getFieldDecorator("QueryStartDate", {
                    initialValue: moment(raceWizardModel.queryStartDate, dateFormat),
                    rules: [
                      {
                        required: true,
                        type: "object",
                        message: errorRequiredField(t, "results.QueryStartDate")
                      }
                    ]
                  })(
                    <DatePicker
                      format={dateFormat}
                      allowClear={false}
                      onChange={date => raceWizardModel.setValue("queryStartDate", date.format(dateFormat))}
                    />
                  )}
                </FormItem>
                <FormItem
                  label={t("results.QueryEndDate")}
                  validateStatus={queryEndDateError ? "error" : ""}
                  help={queryEndDateError || ""}
                >
                  {getFieldDecorator("QueryEndDate", {
                    initialValue: moment(raceWizardModel.queryEndDate, dateFormat),
                    rules: [
                      {
                        required: true,
                        type: "object",
                        message: errorRequiredField(t, "results.QueryEndDate")
                      }
                    ]
                  })(
                    <DatePicker
                      format={dateFormat}
                      allowClear={false}
                      onChange={date => raceWizardModel.setValue("queryEndDate", date.format(dateFormat))}
                    />
                  )}
                </FormItem>
                <FormItem label={t("results.QueryIncludeExisting")}>
                  {getFieldDecorator("QueryIncludeExisting", {
                    valuePropName: "checked",
                    initialValue: raceWizardModel.queryIncludeExisting
                  })(<Switch onChange={checked => raceWizardModel.setValue("queryIncludeExisting", checked)} />)}
                </FormItem>
                <FormItem label={t("results.QueryForEventWithNoEntry")}>
                  {getFieldDecorator("QueryForEventWithNoEntry", {
                    valuePropName: "checked",
                    initialValue: raceWizardModel.queryForEventWithNoEntry
                  })(<Switch onChange={checked => raceWizardModel.setValue("queryForEventWithNoEntry", checked)} />)}
                </FormItem>
              </>
            ) : null}
            <FormItem label={t("results.ImportEventExistInEventor")}>
              {getFieldDecorator("ExistInEventor", {
                valuePropName: "checked",
                initialValue: raceWizardModel.existInEventor
              })(
                <Switch
                  onChange={checked => {
                    raceWizardModel.setValue("existInEventor", checked);
                    raceWizardModel.setValue("selectedEventId", -1);
                  }}
                />
              )}
            </FormItem>
          </Form>
        );
      }
    }
  )
);

const ResultWizardStep0InputForm = Form.create()(ResultWizardStep0Input);
const ResultWizardStep0InputWithI18n = withTranslation()(ResultWizardStep0InputForm); // pass `t` function to App

export default ResultWizardStep0InputWithI18n;
