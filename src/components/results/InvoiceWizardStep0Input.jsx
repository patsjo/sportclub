import React, { Component } from 'react';
import { Switch, Form, DatePicker } from 'antd';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { withTranslation } from 'react-i18next';
import { errorRequiredField, dateFormat, FormSelect } from '../../utils/formHelper';
import moment from 'moment';
import FormItem from '../formItems/FormItem';

// @inject("raceWizardModel")
// @observer
const InvoiceWizardStep0Input = inject(
  'clubModel',
  'raceWizardModel'
)(
  observer(
    class InvoiceWizardStep0Input extends Component {
      static propTypes = {
        clubModel: PropTypes.object.isRequired,
        raceWizardModel: PropTypes.object.isRequired,
        onMount: PropTypes.func.isRequired,
      };
      formRef = React.createRef();

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formId: 'raceInvoiceWizardForm' + Math.floor(Math.random() * 10000000000000000),
        };
      }

      componentDidMount() {
        // To disable next button at the beginning.
        this.formRef.current.validateFields();
        this.props.onMount && this.props.onMount(this.formRef.current);
      }

      render() {
        const self = this;
        const { t, clubModel, raceWizardModel } = self.props;
        const { formId } = self.state;

        return (
          <Form
            id={formId}
            ref={self.formRef}
            layout="vertical"
            initialValues={{
              Club: clubModel.raceClubs.selectedClub.clubId.toString(),
              QueryStartDate: moment(raceWizardModel.queryStartDate, dateFormat),
              QueryEndDate: moment(raceWizardModel.queryEndDate, dateFormat),
              QueryIncludeExisting: raceWizardModel.queryIncludeExisting,
            }}
          >
            <FormItem name="Club" label={t('results.Club')}>
              <FormSelect
                style={{ minWidth: 174, maxWidth: 334 }}
                options={clubModel.raceClubs.clubOptions}
                onChange={(code) => clubModel.raceClubs.setSelectedClub(code)}
              />
            </FormItem>
            <FormItem
              name="QueryStartDate"
              label={t('results.QueryStartDate')}
              rules={[
                {
                  required: true,
                  type: 'object',
                  message: errorRequiredField(t, 'results.QueryStartDate'),
                },
              ]}
            >
              <DatePicker
                format={dateFormat}
                allowClear={false}
                onChange={(date) => raceWizardModel.setValue('queryStartDate', date.format(dateFormat))}
              />
            </FormItem>
            <FormItem
              name="QueryEndDate"
              label={t('results.QueryEndDate')}
              rules={[
                {
                  required: true,
                  type: 'object',
                  message: errorRequiredField(t, 'results.QueryEndDate'),
                },
              ]}
            >
              <DatePicker
                format={dateFormat}
                allowClear={false}
                onChange={(date) => raceWizardModel.setValue('queryEndDate', date.format(dateFormat))}
              />
            </FormItem>
            <FormItem name="QueryIncludeExisting" label={t('results.QueryIncludeExisting')} valuePropName="checked">
              <Switch onChange={(checked) => raceWizardModel.setValue('queryIncludeExisting', checked)} />
            </FormItem>
          </Form>
        );
      }
    }
  )
);

const InvoiceWizardStep0InputWithI18n = withTranslation()(InvoiceWizardStep0Input); // pass `t` function to App

export default InvoiceWizardStep0InputWithI18n;
