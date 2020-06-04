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
      // eslint-disable-next-line eqeqeq
      onValidate(addLinkCompetitor.competitorId != undefined);
    } else {
      onValidate(iFirstName && iLastName && iBirthDay && iStartDate && iFirstName.length > 0 && iLastName.length > 0);
    }
  }

  render() {
    const self = this;
    const { t, addLinkCompetitor, competitorsOptions, onValidate } = this.props;
    const { formId } = this.state;

    return (
      <Form
        id={formId}
        layout="vertical"
        initialValues={{
          iCompetitorId: !addLinkCompetitor.competitorId ? undefined : addLinkCompetitor.competitorId.toString(),
          iFirstName: addLinkCompetitor.newCompetitor.iFirstName,
          iLastName: addLinkCompetitor.newCompetitor.iLastName,
          iBirthDay: !addLinkCompetitor.newCompetitor.iBirthDay
            ? null
            : moment(addLinkCompetitor.newCompetitor.iBirthDay, dateFormat),
          iStartDate: !addLinkCompetitor.newCompetitor.iStartDate
            ? null
            : moment(addLinkCompetitor.newCompetitor.iStartDate, dateFormat)
        }}
      >
        <Tabs defaultActiveKey="1" onChange={self.onThisTabChange.bind(self)}>
          <TabPane tab={t("results.MapCompetitor")} key="1">
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
                style={{ minWidth: 174, maxWidth: 334 }}
                allowClear={true}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                options={competitorsOptions}
                onChange={(code) => {
                  // eslint-disable-next-line eqeqeq
                  addLinkCompetitor.competitorId = code == undefined ? undefined : parseInt(code);
                  // eslint-disable-next-line eqeqeq
                  onValidate(addLinkCompetitor.competitorId != undefined);
                }}
              />
            </FormItem>
          </TabPane>
          <TabPane tab={t("results.AddCompetitor")} key="2">
            <FormItem
              name="iFirstName"
              label={t("results.FirstName")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.FirstName")
                }
              ]}
            >
              <Input
                onChange={(e) => {
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
            </FormItem>
            <FormItem
              name="iLastName"
              label={t("results.LastName")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "results.LastName")
                }
              ]}
            >
              <Input
                onChange={(e) => {
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
            </FormItem>
            <FormItem
              name="iBirthDay"
              label={t("results.BirthDay")}
              rules={[
                {
                  required: true,
                  type: "object",
                  message: errorRequiredField(t, "results.BirthDay")
                }
              ]}
            >
              <DatePicker
                format={dateFormat}
                allowClear={false}
                onChange={(date) => {
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
            </FormItem>
            <FormItem
              name="iStartDate"
              label={t("results.StartDate")}
              rules={[
                {
                  required: true,
                  type: "object",
                  message: errorRequiredField(t, "results.StartDate")
                }
              ]}
            >
              <DatePicker
                format={dateFormat}
                allowClear={false}
                onChange={(date) => {
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
            </FormItem>
          </TabPane>
        </Tabs>
      </Form>
    );
  }
}

const AddMapCompetitorWithI18n = withTranslation()(AddMapCompetitor); // pass `t` function to App

export default AddMapCompetitorWithI18n;
