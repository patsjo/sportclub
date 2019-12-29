import React, { Component } from "react";
import PropTypes from "prop-types";
import { Form, Tabs, DatePicker, Input } from "antd";
import { withTranslation } from "react-i18next";
import FormItem from "../formItems/FormItem";
import { errorRequiredField, FormSelect, dateFormat } from "../../utils/formHelper";
import moment from "moment";

const { TabPane } = Tabs;

class AddMapCompetitor extends Component {
  static propTypes = {
    addLinkCompetitor: PropTypes.object.isRequired,
    competitorsOptions: PropTypes.arrayOf(PropTypes.object),
    onTabChange: PropTypes.func.isRequired,
    onValidate: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      formId: "addMapCompetitor" + Math.floor(Math.random() * 10000000000000000)
    };
  }

  onThisTabChange(key) {
    const { addLinkCompetitor, onValidate, onTabChange } = this.props;
    let { iFirstName, iLastName, iBirthDay, iStartDate } = addLinkCompetitor.newCompetitor;

    onTabChange(key);
    if (key === "1") {
      onValidate(addLinkCompetitor.competitorId !== undefined);
    } else {
      onValidate(iFirstName && iLastName && iBirthDay && iStartDate && iFirstName.length > 0 && iLastName.length > 0);
    }
  }

  render() {
    const self = this;
    const { t, addLinkCompetitor, competitorsOptions, onValidate, form } = this.props;
    const { formId } = this.state;
    const { getFieldDecorator, getFieldError, isFieldTouched } = form;

    // Only show error after a field is touched.
    const competitorIdError = isFieldTouched("iCompetitorId") && getFieldError("iCompetitorId");
    const firstNameError = isFieldTouched("iFirstName") && getFieldError("iFirstName");
    const lastNameError = isFieldTouched("iLastName") && getFieldError("iLastName");
    const birthDayError = isFieldTouched("iBirthDay") && getFieldError("iBirthDay");
    const startDateError = isFieldTouched("iStartDate") && getFieldError("iStartDate");

    return (
      <Form id={formId} onSubmit={self.onSave}>
        <Tabs defaultActiveKey="1" onChange={self.onThisTabChange.bind(self)}>
          <TabPane tab={t("results.MapCompetitor")} key="1">
            <FormItem
              label={t("results.Competitor")}
              validateStatus={competitorIdError ? "error" : ""}
              help={competitorIdError || ""}
            >
              {getFieldDecorator("iCompetitorId", {
                initialValue:
                  addLinkCompetitor.competitorId === undefined ? undefined : addLinkCompetitor.competitorId.toString(),
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.Competitor")
                  }
                ]
              })(
                <FormSelect
                  allowClear={true}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  options={competitorsOptions}
                  onChange={code => {
                    addLinkCompetitor.competitorId = code === undefined ? undefined : parseInt(code);
                    onValidate(addLinkCompetitor.competitorId !== undefined);
                  }}
                />
              )}
            </FormItem>
          </TabPane>
          <TabPane tab={t("results.AddCompetitor")} key="2">
            <FormItem
              label={t("results.FirstName")}
              validateStatus={firstNameError ? "error" : ""}
              help={firstNameError || ""}
            >
              {getFieldDecorator("iFirstName", {
                initialValue: addLinkCompetitor.newCompetitor.iFirstName,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.FirstName")
                  }
                ]
              })(
                <Input
                  onChange={e => {
                    addLinkCompetitor.newCompetitor.iFirstName = e.currentTarget.value;
                    onValidate(
                      addLinkCompetitor.newCompetitor.iFirstName &&
                        addLinkCompetitor.newCompetitor.iLastName &&
                        addLinkCompetitor.newCompetitor.iBirthDay &&
                        addLinkCompetitor.newCompetitor.iStartDate &&
                        addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                        addLinkCompetitor.newCompetitor.iLastName.length > 0
                    );
                  }}
                />
              )}
            </FormItem>
            <FormItem
              label={t("results.LastName")}
              validateStatus={lastNameError ? "error" : ""}
              help={lastNameError || ""}
            >
              {getFieldDecorator("iLastName", {
                initialValue: addLinkCompetitor.newCompetitor.iLastName,
                rules: [
                  {
                    required: true,
                    message: errorRequiredField(t, "results.LastName")
                  }
                ]
              })(
                <Input
                  onChange={e => {
                    addLinkCompetitor.newCompetitor.iLastName = e.currentTarget.value;
                    onValidate(
                      addLinkCompetitor.newCompetitor.iFirstName &&
                        addLinkCompetitor.newCompetitor.iLastName &&
                        addLinkCompetitor.newCompetitor.iBirthDay &&
                        addLinkCompetitor.newCompetitor.iStartDate &&
                        addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                        addLinkCompetitor.newCompetitor.iLastName.length > 0
                    );
                  }}
                />
              )}
            </FormItem>
            <FormItem
              label={t("results.BirthDay")}
              validateStatus={birthDayError ? "error" : ""}
              help={birthDayError || ""}
            >
              {getFieldDecorator("iBirthDay", {
                initialValue:
                  addLinkCompetitor.newCompetitor.iBirthDay === null
                    ? null
                    : moment(addLinkCompetitor.newCompetitor.iBirthDay, dateFormat),
                rules: [
                  {
                    required: true,
                    type: "object",
                    message: errorRequiredField(t, "results.BirthDay")
                  }
                ]
              })(
                <DatePicker
                  format={dateFormat}
                  allowClear={false}
                  onChange={date => {
                    addLinkCompetitor.newCompetitor.iBirthDay = date.format(dateFormat);
                    onValidate(
                      addLinkCompetitor.newCompetitor.iFirstName &&
                        addLinkCompetitor.newCompetitor.iLastName &&
                        addLinkCompetitor.newCompetitor.iBirthDay &&
                        addLinkCompetitor.newCompetitor.iStartDate &&
                        addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                        addLinkCompetitor.newCompetitor.iLastName.length > 0
                    );
                  }}
                />
              )}
            </FormItem>
            <FormItem
              label={t("results.StartDate")}
              validateStatus={startDateError ? "error" : ""}
              help={startDateError || ""}
            >
              {getFieldDecorator("iStartDate", {
                initialValue:
                  addLinkCompetitor.newCompetitor.iStartDate === null
                    ? null
                    : moment(addLinkCompetitor.newCompetitor.iStartDate, dateFormat),
                rules: [
                  {
                    required: true,
                    type: "object",
                    message: errorRequiredField(t, "results.StartDate")
                  }
                ]
              })(
                <DatePicker
                  format={dateFormat}
                  allowClear={false}
                  onChange={date => {
                    addLinkCompetitor.newCompetitor.iStartDate = date.format(dateFormat);
                    onValidate(
                      addLinkCompetitor.newCompetitor.iFirstName &&
                        addLinkCompetitor.newCompetitor.iLastName &&
                        addLinkCompetitor.newCompetitor.iBirthDay &&
                        addLinkCompetitor.newCompetitor.iStartDate &&
                        addLinkCompetitor.newCompetitor.iFirstName.length > 0 &&
                        addLinkCompetitor.newCompetitor.iLastName.length > 0
                    );
                  }}
                />
              )}
            </FormItem>
          </TabPane>
        </Tabs>
      </Form>
    );
  }
}

const AddMapCompetitorForm = Form.create()(AddMapCompetitor);
const AddMapCompetitorWithI18n = withTranslation()(AddMapCompetitorForm); // pass `t` function to App

export default AddMapCompetitorWithI18n;
