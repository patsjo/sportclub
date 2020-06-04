import React, { Component } from "react";
import { Form, DatePicker } from "antd";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import { errorRequiredField, dateFormat } from "../../../utils/formHelper";
import moment from "moment";
import FormItem from "../../formItems/FormItem";

const { RangePicker } = DatePicker;

// @inject("eventSelectorWizardModel")
// @observer
const EventSelectorWizardStep0Input = inject("eventSelectorWizardModel")(
  observer(
    class EventSelectorWizardStep0Input extends Component {
      static propTypes = {
        eventSelectorWizardModel: PropTypes.object.isRequired,
        onMount: PropTypes.func.isRequired
      };
      formRef = React.createRef();

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formId: "eventSelectorWizardForm" + Math.floor(Math.random() * 10000000000000000)
        };
      }

      componentDidMount() {
        // To disable next button at the beginning.
        this.formRef.current.validateFields();
        this.props.onMount && this.props.onMount(this.formRef.current);
      }

      render() {
        const self = this;
        const { t, eventSelectorWizardModel } = self.props;
        const { formId } = self.state;

        return (
          <Form
            id={formId}
            ref={self.formRef}
            layout="vertical"
            initialValues={{
              QueryDateRange: [
                moment(eventSelectorWizardModel.queryStartDate, dateFormat),
                moment(eventSelectorWizardModel.queryEndDate, dateFormat)
              ]
            }}
          >
            <FormItem
              name="QueryDateRange"
              label={t("results.QueryDateRange")}
              rules={[
                {
                  required: true,
                  type: "array",
                  message: errorRequiredField(t, "results.QueryDateRange")
                }
              ]}
            >
              <RangePicker
                format={dateFormat}
                allowClear={false}
                onChange={(dates) => {
                  eventSelectorWizardModel.setValue("queryStartDate", dates[0].format(dateFormat));
                  eventSelectorWizardModel.setValue("queryEndDate", dates[1].format(dateFormat));
                }}
              />
            </FormItem>
            <p>Alla Nationella kan väljas. Övriga närtävlingar är endast valbara om de är inom en radie på 80km.</p>
          </Form>
        );
      }
    }
  )
);

const EventSelectorWizardStep0InputWithI18n = withTranslation()(EventSelectorWizardStep0Input); // pass `t` function to App

export default EventSelectorWizardStep0InputWithI18n;
