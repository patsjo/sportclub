import React, { Component } from 'react';
import { Form, DatePicker, InputNumber, Row, Col } from 'antd';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { withTranslation } from 'react-i18next';
import { errorRequiredField, dateFormat } from '../../../utils/formHelper';
import moment from 'moment';
import FormItem from '../../formItems/FormItem';
import EsriOSMOrienteeringMap from '../../map/EsriOSMOrienteeringMap';
import styled from 'styled-components';

const { RangePicker } = DatePicker;

const MapContainer = styled.div`
  float: right;
  height: 400px;
  width: 400px;
`;

// @inject("eventSelectorWizardModel")
// @observer
const EventSelectorWizardStep0Input = inject(
  'clubModel',
  'eventSelectorWizardModel'
)(
  observer(
    class EventSelectorWizardStep0Input extends Component {
      static propTypes = {
        clubModel: PropTypes.object.isRequired,
        eventSelectorWizardModel: PropTypes.object.isRequired,
        onMount: PropTypes.func.isRequired,
      };
      formRef = React.createRef();

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formId: 'eventSelectorWizardForm' + Math.floor(Math.random() * 10000000000000000),
        };
      }

      componentDidMount() {
        // To disable next button at the beginning.
        this.formRef.current.validateFields().then(() => {});
        this.props.onMount && this.props.onMount(this.formRef.current);
      }

      render() {
        const self = this;
        const { t, clubModel, eventSelectorWizardModel } = self.props;
        const { formId } = self.state;

        return (
          <Row gutter={8}>
            <Col span={12}>
              <Form
                id={formId}
                ref={self.formRef}
                layout="vertical"
                initialValues={{
                  QueryDateRange: [
                    moment(eventSelectorWizardModel.queryStartDate, dateFormat),
                    moment(eventSelectorWizardModel.queryEndDate, dateFormat),
                  ],
                  MaxDistanceDistrict: eventSelectorWizardModel.maxDistanceDistrict,
                  MaxDistanceNearbyAndClub: eventSelectorWizardModel.maxDistanceNearbyAndClub,
                }}
              >
                <FormItem
                  name="QueryDateRange"
                  label={t('results.QueryDateRange')}
                  rules={[
                    {
                      required: true,
                      type: 'array',
                      message: errorRequiredField(t, 'results.QueryDateRange'),
                    },
                  ]}
                >
                  <RangePicker
                    format={dateFormat}
                    allowClear={false}
                    onChange={(dates) => {
                      eventSelectorWizardModel.setValue('queryStartDate', dates[0].format(dateFormat));
                      eventSelectorWizardModel.setValue('queryEndDate', dates[1].format(dateFormat));
                    }}
                  />
                </FormItem>
                <FormItem
                  name="MaxDistanceDistrict"
                  label={t('results.MaxDistanceDistrict')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.MaxDistanceDistrict'),
                    },
                  ]}
                >
                  <InputNumber
                    min={10}
                    max={2000}
                    step={10}
                    allowClear={false}
                    onChange={(value) => eventSelectorWizardModel.setValue('maxDistanceDistrict', value)}
                  />
                </FormItem>
                <FormItem
                  name="MaxDistanceNearbyAndClub"
                  label={t('results.MaxDistanceNearbyAndClub')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'results.MaxDistanceNearbyAndClub'),
                    },
                  ]}
                >
                  <InputNumber
                    min={10}
                    max={2000}
                    step={10}
                    allowClear={false}
                    onChange={(value) => eventSelectorWizardModel.setValue('maxDistanceNearbyAndClub', value)}
                  />
                </FormItem>
              </Form>
            </Col>
            {clubModel.mapCenter ? (
              <Col span={12}>
                <MapContainer>
                  <EsriOSMOrienteeringMap
                    key="eventSelector#maxDistanceMap"
                    containerId="maxDistanceMap"
                    mapCenter={clubModel.mapCenter}
                    graphics={[
                      {
                        geometry: {
                          type: 'circle',
                          center: clubModel.mapCenter,
                          geodesic: true,
                          radius: eventSelectorWizardModel.maxDistanceDistrict,
                          radiusUnit: 'kilometers',
                        },
                        symbol: {
                          type: 'simple-fill',
                          color: [128, 128, 255, 0.5],
                          style: 'solid',
                          outline: {
                            color: [128, 128, 255, 0.9],
                            width: 2,
                          },
                        },
                      },
                      {
                        geometry: {
                          type: 'circle',
                          center: clubModel.mapCenter,
                          geodesic: true,
                          radius: eventSelectorWizardModel.maxDistanceNearbyAndClub,
                          radiusUnit: 'kilometers',
                        },
                        symbol: {
                          type: 'simple-fill',
                          color: [128, 255, 128, 0.5],
                          style: 'solid',
                          outline: {
                            color: [128, 255, 128, 0.9],
                            width: 2,
                          },
                        },
                      },
                    ]}
                    nofGraphics={2}
                  />
                </MapContainer>
              </Col>
            ) : null}
          </Row>
        );
      }
    }
  )
);

const EventSelectorWizardStep0InputWithI18n = withTranslation()(EventSelectorWizardStep0Input); // pass `t` function to App

export default EventSelectorWizardStep0InputWithI18n;
