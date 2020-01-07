import React, { Component } from "react";
import { Switch, Form, DatePicker } from "antd";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import { errorRequiredField, dateFormat, FormSelect } from "../../utils/formHelper";
import moment from "moment";
import FormItem from "../formItems/FormItem";

const { RangePicker } = DatePicker;

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
        const queryDateRangeError = getFieldError("iQueryDateRange");

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
                  label={t("results.QueryDateRange")}
                  validateStatus={queryDateRangeError ? "error" : ""}
                  help={queryDateRangeError || ""}
                >
                  {getFieldDecorator("QueryDateRange", {
                    initialValue: [
                      moment(raceWizardModel.queryStartDate, dateFormat),
                      moment(raceWizardModel.queryEndDate, dateFormat)
                    ],
                    rules: [
                      {
                        required: true,
                        type: "object",
                        message: errorRequiredField(t, "results.QueryDateRange")
                      }
                    ]
                  })(
                    <RangePicker
                      format={dateFormat}
                      allowClear={false}
                      onChange={dates => {
                        raceWizardModel.setValue("queryStartDate", dates[0].format(dateFormat));
                        raceWizardModel.setValue("queryEndDate", dates[1].format(dateFormat));
                      }}
                    />
                  )}
                </FormItem>
                <FormItem label={t("results.QueryIncludeExisting")}>
                  {getFieldDecorator("QueryIncludeExisting", {
                    valuePropName: "checked",
                    initialValue: raceWizardModel.queryIncludeExisting
                  })(<Switch onChange={checked => raceWizardModel.setValue("queryIncludeExisting", checked)} />)}
                </FormItem>
              </>
            ) : null}
            <FormItem label={t("results.ExistInEventor")}>
              {getFieldDecorator("ExistInEventor", {
                valuePropName: "checked",
                initialValue: raceWizardModel.existInEventor
              })(<Switch onChange={checked => raceWizardModel.setValue("existInEventor", checked)} />)}
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
