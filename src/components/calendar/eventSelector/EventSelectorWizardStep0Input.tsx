import { Col, DatePicker, Form, InputNumber, Row } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { observer } from 'mobx-react';
import { IEventSelectorWizard } from 'models/eventSelectorWizardModel';
import { IGraphic } from 'models/graphic';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { dateFormat, errorRequiredField, warningIncludeAll } from '../../../utils/formHelper';
import FormItem from '../../formItems/FormItem';
import OSMOrienteeringMap from '../../map/OSMOrienteeringMap';

export const MaxDistance = 2000;
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
              MaxDistanceNational: eventSelectorWizardModel.maxDistanceNational,
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
              name="MaxDistanceNational"
              label={t('results.MaxDistanceNational')}
              rules={[
                {
                  validator: (_, value, callback) => {
                    if (value == null) callback(warningIncludeAll(t, 'results.MaxDistanceNational'));
                  },
                  warningOnly: true,
                },
              ]}
            >
              <InputNumber
                min={10}
                max={MaxDistance}
                step={10}
                onChange={(value: number | null) => eventSelectorWizardModel.setMaxDistanceNational(value ?? null)}
              />
            </FormItem>
            <FormItem
              name="MaxDistanceDistrict"
              label={t('results.MaxDistanceDistrict')}
              rules={[
                {
                  validator: (_, value, callback) => {
                    if (value == null) callback(warningIncludeAll(t, 'results.MaxDistanceDistrict'));
                  },
                  warningOnly: true,
                },
              ]}
            >
              <InputNumber
                min={10}
                max={MaxDistance}
                step={10}
                onChange={(value: number | null) => eventSelectorWizardModel.setMaxDistanceDistrict(value ?? null)}
              />
            </FormItem>
            <FormItem
              name="MaxDistanceNearbyAndClub"
              label={t('results.MaxDistanceNearbyAndClub')}
              rules={[
                {
                  validator: (_, value, callback) => {
                    if (value == null) callback(warningIncludeAll(t, 'results.MaxDistanceNearbyAndClub'));
                  },
                  warningOnly: true,
                },
              ]}
            >
              <InputNumber
                min={10}
                max={MaxDistance}
                step={10}
                onChange={(value: number | null) => eventSelectorWizardModel.setMaxDistanceNearbyAndClub(value ?? null)}
              />
            </FormItem>
          </Form>
        </Col>
        {clubModel.map?.center ? (
          <Col span={12}>
            <MapContainer>
              <OSMOrienteeringMap
                key="eventSelector#maxDistanceMap"
                height="400px"
                width="100%"
                containerId="maxDistanceMap"
                mapCenter={clubModel.map.center}
                defaultGraphics={
                  (
                    [
                      eventSelectorWizardModel.maxDistanceNational
                        ? {
                            geometry: {
                              type: 'circle',
                              center: clubModel.map.center,
                              geodesic: true,
                              radius: eventSelectorWizardModel.maxDistanceNational * 1000,
                            },
                            symbol: {
                              type: 'gradient-fill',
                              color: [255, 240, 128, 0.75],
                              style: 'solid',
                              outline: {
                                color: [255, 240, 128, 0.75],
                                width: 2,
                              },
                            },
                          }
                        : undefined,
                      eventSelectorWizardModel.maxDistanceDistrict
                        ? {
                            geometry: {
                              type: 'circle',
                              center: clubModel.map.center,
                              geodesic: true,
                              radius: eventSelectorWizardModel.maxDistanceDistrict * 1000,
                            },
                            symbol: {
                              type: 'gradient-fill',
                              color: [128, 128, 255, 0.75],
                              style: 'solid',
                              outline: {
                                color: [128, 128, 255, 0.75],
                                width: 2,
                              },
                            },
                          }
                        : undefined,
                      eventSelectorWizardModel.maxDistanceNearbyAndClub
                        ? {
                            geometry: {
                              type: 'circle',
                              center: clubModel.map.center,
                              geodesic: true,
                              radius: eventSelectorWizardModel.maxDistanceNearbyAndClub * 1000,
                            },
                            symbol: {
                              type: 'gradient-fill',
                              color: [255, 128, 128, 0.75],
                              style: 'solid',
                              outline: {
                                color: [255, 128, 128, 0.75],
                                width: 2,
                              },
                            },
                          }
                        : undefined,
                    ] as (IGraphic | undefined)[]
                  ).filter((graphic) => graphic) as IGraphic[]
                }
              />
            </MapContainer>
          </Col>
        ) : null}
      </Row>
    );
  }
);

export default EventSelectorWizardStep0Input;
