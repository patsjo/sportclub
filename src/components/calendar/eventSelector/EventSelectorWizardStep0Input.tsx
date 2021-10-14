import { Col, DatePicker, Form, InputNumber, Row } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { observer } from 'mobx-react';
import { IEventSelectorWizard } from 'models/eventSelectorWizardModel';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { dateFormat, errorRequiredField } from '../../../utils/formHelper';
import FormItem from '../../formItems/FormItem';
import EsriOSMOrienteeringMap from '../../map/EsriOSMOrienteeringMap';

const { RangePicker } = DatePicker;

const MapContainer = styled.div`
  float: right;
  height: 400px;
  width: 400px;
`;

interface IEventSelectorWizardStep0InputProps {
  eventSelectorWizardModel: IEventSelectorWizard;
  onMount: (form: FormInstance) => void;
}
const EventSelectorWizardStep0Input = observer(
  ({ eventSelectorWizardModel, onMount }: IEventSelectorWizardStep0InputProps) => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel } = useMobxStore();
    const formRef = React.useRef<FormInstance>(null);
    const [mounted, setMounted] = useState(false);
    const formId = useMemo(() => 'eventSelectorWizardForm' + Math.floor(Math.random() * 10000000000000000), []);

    useEffect(() => {
      if (!mounted && formRef.current) {
        setMounted(true);
        // To disable next button at the beginning.
        formRef.current.validateFields().then();
        onMount && onMount(formRef.current);
      }
    }, [mounted, formRef.current]);

    return (
      <Row gutter={8}>
        <Col span={12}>
          <Form
            id={formId}
            ref={formRef}
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
                  if (Array.isArray(dates) && dates.length === 2 && dates[0] && dates[1]) {
                    eventSelectorWizardModel.setQueryStartDate(dates[0].format(dateFormat));
                    eventSelectorWizardModel.setQueryEndDate(dates[1].format(dateFormat));
                  }
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
                onChange={(value) =>
                  value !== undefined && eventSelectorWizardModel.setMaxDistanceDistrict(Number(value))
                }
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
                onChange={(value) => eventSelectorWizardModel.setMaxDistanceNearbyAndClub(Number(value))}
              />
            </FormItem>
          </Form>
        </Col>
        {clubModel.map?.center ? (
          <Col span={12}>
            <MapContainer>
              <EsriOSMOrienteeringMap
                key="eventSelector#maxDistanceMap"
                height="400px"
                width="100%"
                containerId="maxDistanceMap"
                mapCenter={clubModel.map.center}
                defaultGraphics={[
                  {
                    geometry: {
                      type: 'circle',
                      center: clubModel.map.center,
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
                      center: clubModel.map.center,
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
              />
            </MapContainer>
          </Col>
        ) : null}
      </Row>
    );
  }
);

export default EventSelectorWizardStep0Input;
