import { DatePicker, Form, InputNumber } from 'antd';
import { FormInstance } from 'antd/lib/form';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IEventSelectorWizard, ILocalStorageEventSelectorWizard } from '../../../models/eventSelectorWizardModel';
import { IGraphic } from '../../../models/graphic';
import { dateFormat, errorRequiredField, warningIncludeAll } from '../../../utils/formHelper';
import { useMobxStore } from '../../../utils/mobxStore';
import FormItem from '../../formItems/FormItem';
import OSMOrienteeringMap from '../../map/OSMOrienteeringMap';

export const MaxDistance = 2000;
const { RangePicker } = DatePicker;

interface IMapContainerProps {
  height: number;
}
const MapContainer = styled.div<IMapContainerProps>`
  float: right;
  height: ${({ height }) => height}px;
  width: calc(100% - 300px);
`;

const StyledFullWidth = styled.div`
  width: 100%;
`;

interface IEventSelectorWizardStep0FormProps extends Omit<
  ILocalStorageEventSelectorWizard,
  'queryStartDate' | 'queryEndDate'
> {
  queryDateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface IEventSelectorWizardStep0InputProps {
  eventSelectorWizardModel: IEventSelectorWizard;
  height: number;
  onMount?: (form: FormInstance<IEventSelectorWizardStep0FormProps>) => void;
}
const EventSelectorWizardStep0Input = observer(
  ({ eventSelectorWizardModel, height, onMount }: IEventSelectorWizardStep0InputProps) => {
    const { t } = useTranslation();
    const { clubModel } = useMobxStore();
    const [form] = Form.useForm<IEventSelectorWizardStep0FormProps>();
    const [mounted, setMounted] = useState(false);
    const formId = useMemo(() => 'eventSelectorWizardForm' + Math.floor(Math.random() * 10000000000000000), []);

    useEffect(() => {
      if (!mounted && form) {
        setMounted(true);
        // To disable next button at the beginning.
        form.validateFields().then();
        onMount?.(form);
      }
    }, [mounted, onMount, form]);

    return (
      <StyledFullWidth>
        {clubModel.map?.center ? (
          <MapContainer height={height}>
            <OSMOrienteeringMap
              key="eventSelector#maxDistanceMap"
              height={`${height}px`}
              width="100%"
              containerId="maxDistanceMap"
              mapCenter={clubModel.map.center}
              useDefaultGraphicsAsHome={true}
              defaultGraphics={
                (
                  [
                    eventSelectorWizardModel.maxDistanceNational
                      ? {
                          geometry: {
                            type: 'circle',
                            center: clubModel.map.center,
                            geodesic: true,
                            radius: eventSelectorWizardModel.maxDistanceNational * 1000
                          },
                          symbol: {
                            type: 'gradient-fill',
                            color: [255, 240, 128, 0.75],
                            style: 'solid',
                            outline: {
                              color: [255, 240, 128, 0.75],
                              width: 2
                            }
                          }
                        }
                      : undefined,
                    eventSelectorWizardModel.maxDistanceDistrict
                      ? {
                          geometry: {
                            type: 'circle',
                            center: clubModel.map.center,
                            geodesic: true,
                            radius: eventSelectorWizardModel.maxDistanceDistrict * 1000
                          },
                          symbol: {
                            type: 'gradient-fill',
                            color: [128, 128, 255, 0.75],
                            style: 'solid',
                            outline: {
                              color: [128, 128, 255, 0.75],
                              width: 2
                            }
                          }
                        }
                      : undefined,
                    eventSelectorWizardModel.maxDistanceNearbyAndClub
                      ? {
                          geometry: {
                            type: 'circle',
                            center: clubModel.map.center,
                            geodesic: true,
                            radius: eventSelectorWizardModel.maxDistanceNearbyAndClub * 1000
                          },
                          symbol: {
                            type: 'gradient-fill',
                            color: [255, 128, 128, 0.75],
                            style: 'solid',
                            outline: {
                              color: [255, 128, 128, 0.75],
                              width: 2
                            }
                          }
                        }
                      : undefined
                  ] as (IGraphic | undefined)[]
                ).filter(graphic => graphic) as IGraphic[]
              }
            />
          </MapContainer>
        ) : null}
        <Form
          form={form}
          id={formId}
          layout="vertical"
          initialValues={{
            queryDateRange: [eventSelectorWizardModel.queryStartDate, eventSelectorWizardModel.queryEndDate],
            maxDistanceNational: eventSelectorWizardModel.maxDistanceNational,
            maxDistanceDistrict: eventSelectorWizardModel.maxDistanceDistrict,
            maxDistanceNearbyAndClub: eventSelectorWizardModel.maxDistanceNearbyAndClub
          }}
        >
          <FormItem
            name="queryDateRange"
            label={t('results.QueryDateRange')}
            rules={[
              {
                required: true,
                type: 'array',
                message: errorRequiredField(t, 'results.QueryDateRange')
              }
            ]}
            normalize={(values: dayjs.Dayjs[] | null) =>
              Array.isArray(values) && values.length === 2
                ? [values[0]?.format(dateFormat), values[1]?.format(dateFormat)]
                : null
            }
            getValueProps={(values: string[] | undefined) => ({
              value: values?.length === 2 ? [dayjs(values[0], dateFormat), dayjs(values[1], dateFormat)] : null
            })}
          >
            <RangePicker
              format={dateFormat}
              allowClear={false}
              onChange={dates => {
                if (Array.isArray(dates) && dates.length === 2 && dates[0] && dates[1]) {
                  eventSelectorWizardModel.setQueryStartDate(dates[0].format(dateFormat));
                  eventSelectorWizardModel.setQueryEndDate(dates[1].format(dateFormat));
                }
              }}
            />
          </FormItem>
          <FormItem
            name="maxDistanceNational"
            label={t('results.MaxDistanceNational')}
            rules={[
              {
                validator: (_, value, callback) => {
                  if (value == null) callback(warningIncludeAll(t, 'results.MaxDistanceNational'));
                },
                warningOnly: true
              }
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
            name="maxDistanceDistrict"
            label={t('results.MaxDistanceDistrict')}
            rules={[
              {
                validator: (_, value, callback) => {
                  if (value == null) callback(warningIncludeAll(t, 'results.MaxDistanceDistrict'));
                },
                warningOnly: true
              }
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
            name="maxDistanceNearbyAndClub"
            label={t('results.MaxDistanceNearbyAndClub')}
            rules={[
              {
                validator: (_, value, callback) => {
                  if (value == null) callback(warningIncludeAll(t, 'results.MaxDistanceNearbyAndClub'));
                },
                warningOnly: true
              }
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
      </StyledFullWidth>
    );
  }
);

export default EventSelectorWizardStep0Input;
