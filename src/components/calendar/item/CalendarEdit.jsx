import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Form, Input, DatePicker, TimePicker, Row, Col, message, InputNumber, Switch } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { observer, inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  FormSelect,
  hasErrors,
  errorRequiredField,
  dateFormat,
  weekFormat,
  shortTimeFormat,
  timeFormat,
} from '../../../utils/formHelper';
import { PostJsonData } from '../../../utils/api';
import moment from 'moment';
import FormItem from '../../formItems/FormItem';
import { GetPositionModal } from '../../map/GetPositionModal';
import { v4 as uuidv4 } from 'uuid';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const StyledModal = styled(Modal)`
  &&& .ant-modal-body {
    max-height: calc(100vh - 200px);
    overflow-y: scroll;
    overflow-x: hidden;
  }
  @media screen and (max-width: 550px) {
    &&& .ant-row {
      display: block;
    }
    &&& .ant-col {
      display: block !important;
      max-width: 100% !important;
    }
  }
`;
const StyledModalContent = styled.div``;

const MapButton = styled(Button)`
  &&& {
    width: 100%;
    margin-top: 25px;
  }
`;

// @inject("clubModel")
// @observer
const CalendarEdit = inject(
  'clubModel',
  'sessionModel',
  'globalStateModel'
)(
  observer((props) => {
    const {
      clubModel,
      sessionModel,
      globalStateModel,
      title,
      calendarObject,
      domains,
      open,
      onClose,
      onChange,
    } = props;
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [valid, setValid] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isRepeating, setIsRepeating] = useState(calendarObject.repeatingGid != null);
    const [repeatingDisabled] = useState(calendarObject.repeatingGid != null);
    const [repeatingModifiedDisabled] = useState(
      calendarObject.repeatingGid == null || calendarObject.repeatingModified
    );
    const formId = 'calendarEditForm' + Math.floor(Math.random() * 10000000000000000);

    useEffect(() => {
      setTimeout(() => {
        if (open) {
          // To disable submit button at the beginning.
          form && form.resetFields();
          hasErrors(form).then((notValid) => setValid(!notValid));
        }
      }, 0);
    }, [open]);

    useEffect(() => {
      hasErrors(form).then((notValid) => setValid(!notValid));
    }, [isRepeating]);

    const onSave = useCallback(
      (values) => {
        const calendarModule = clubModel.modules.find((module) => module.name === 'Calendar');
        const saveUrl = values.iActivityID === 0 ? calendarModule.addUrl : calendarModule.updateUrl;
        setSaving(true);
        values.iActivityDay =
          values.iActivityDay && typeof values.iActivityDay.format === 'function'
            ? values.iActivityDay.format(dateFormat)
            : values.iActivityDay;
        values.iActivityTime =
          values.iActivityTime && typeof values.iActivityTime.format === 'function'
            ? values.iActivityTime.format(timeFormat)
            : values.iActivityTime;
        values.iIsRepeating = isRepeating;

        if (isRepeating) {
          values.iFirstRepeatingDate =
            values.iFirstRepeatingDate && typeof values.iFirstRepeatingDate.format === 'function'
              ? values.iFirstRepeatingDate.format(dateFormat)
              : values.iFirstRepeatingDate;
          values.iLastRepeatingDate =
            values.iLastRepeatingDate && typeof values.iLastRepeatingDate.format === 'function'
              ? values.iLastRepeatingDate.format(dateFormat)
              : values.iLastRepeatingDate;
          if (Array.isArray(values.iRepeatingDates) && values.iRepeatingDates.length === 2) {
            values.iNewFirstRepeatingDate =
              values.iRepeatingDates[0] && typeof values.iRepeatingDates[0].format === 'function'
                ? values.iRepeatingDates[0].format(dateFormat)
                : values.iRepeatingDates[0];
            values.iNewLastRepeatingDate =
              values.iRepeatingDates[1] && typeof values.iRepeatingDates[1].format === 'function'
                ? values.iRepeatingDates[1].format(dateFormat)
                : values.iRepeatingDates[1];
            values.iRepeatingDates = null;
          }
        }
        PostJsonData(
          saveUrl,
          {
            ...values,
            iType: 'ACTIVITY',
            username: sessionModel.username,
            password: sessionModel.password,
            jsonResponse: true,
          },
          true,
          sessionModel.authorizationHeader
        )
          .then((calendarObjectResponse) => {
            onChange && onChange(calendarObjectResponse);
            setSaving(false);
            onClose();
          })
          .catch((e) => {
            message.error(e.message);
            setSaving(false);
          });
      },
      [isRepeating]
    );

    const onChooseMapPosition = useCallback(() => {
      const { getFieldValue, setFieldsValue } = form;
      const longitude = getFieldValue('iLongitude');
      const latitude = getFieldValue('iLatitude');
      const clubLongitude = clubModel.map?.center ? clubModel.map?.center[0] : undefined;
      const clubLatitude = clubModel.map?.center ? clubModel.map?.center[1] : undefined;
      const exists = longitude && latitude;
      GetPositionModal(
        t,
        exists ? longitude : clubLongitude,
        exists ? latitude : clubLatitude,
        exists,
        globalStateModel,
        clubModel
      ).then((selectedPosition) => {
        if (selectedPosition) {
          setFieldsValue({ iLongitude: selectedPosition.longitude, iLatitude: selectedPosition.latitude });
        }
      });
    }, []);

    return (
      <StyledModal
        closable={false}
        maskClosable={false}
        title={title}
        visible={open}
        okText={t('common.Save')}
        okButtonProps={{ disabled: !valid, loading: saving }}
        cancelText={t('common.Cancel')}
        cancelButtonProps={{ loading: saving }}
        style={{ top: 40 }}
        width={1000}
        onOk={() => {
          form.validateFields().then((values) => {
            onSave(values);
          });
        }}
        onCancel={onClose}
      >
        <StyledModalContent>
          <Form
            form={form}
            id={formId}
            layout="vertical"
            initialValues={{
              iActivityID: calendarObject.activityId,
              iActivityTypeID: calendarObject.activityTypeId,
              iGroupID: calendarObject.groupId,
              iHeader: calendarObject.header,
              iActivityDay: moment(calendarObject.date, dateFormat),
              iActivityTime: !calendarObject.time ? null : moment(calendarObject.time, shortTimeFormat),
              iActivityDurationMinutes: calendarObject.activityDurationMinutes,
              iPlace: calendarObject.place,
              iLongitude: calendarObject.longitude,
              iLatitude: calendarObject.latitude,
              iDescr: calendarObject.description,
              iURL: calendarObject.url,
              iResponsibleUserID: sessionModel.isAdmin ? calendarObject.responsibleUserId : parseInt(sessionModel.id),
              iIsRepeating: isRepeating,
              iRepeatingGid: calendarObject.repeatingGid,
              iRepeatingModified: calendarObject.repeatingModified,
              iFirstRepeatingDate: !calendarObject.firstRepeatingDate
                ? null
                : moment(calendarObject.firstRepeatingDate, dateFormat),
              iLastRepeatingDate: !calendarObject.lastRepeatingDate
                ? null
                : moment(calendarObject.lastRepeatingDate, dateFormat),
              iRepeatingDates:
                !calendarObject.firstRepeatingDate || !calendarObject.lastRepeatingDate
                  ? null
                  : [
                      moment(calendarObject.firstRepeatingDate, dateFormat),
                      moment(calendarObject.lastRepeatingDate, dateFormat),
                    ],
            }}
            onValuesChange={() => hasErrors(form).then((notValid) => setValid(!notValid))}
          >
            <FormItem name="iActivityID">
              <Input type="hidden" />
            </FormItem>
            <Row gutter={8}>
              <Col span={12}>
                <FormItem
                  name="iActivityTypeID"
                  label={t('calendar.ActivityType')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'calendar.ActivityType'),
                    },
                  ]}
                >
                  <FormSelect style={{ minWidth: 174 }} options={domains.activityTypes} />
                </FormItem>
              </Col>
              <Col span={12}>
                <FormItem
                  name="iGroupID"
                  label={t('calendar.Group')}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, 'calendar.Group'),
                    },
                  ]}
                >
                  <FormSelect style={{ minWidth: 174 }} options={domains.groups} />
                </FormItem>
              </Col>
            </Row>
            <FormItem
              name="iHeader"
              label={t('calendar.Header')}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, 'calendar.Header'),
                },
              ]}
            >
              <Input maxLength={32} />
            </FormItem>
            <Row gutter={8}>
              <Col span={8}>
                <FormItem
                  name="iActivityDay"
                  label={t('calendar.ActivityDay')}
                  rules={[
                    {
                      required: true,
                      type: 'object',
                      message: errorRequiredField(t, 'calendar.ActivityDay'),
                    },
                  ]}
                >
                  <DatePicker disabled={repeatingDisabled} format={dateFormat} style={{ width: '100%' }} />
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem name="iActivityTime" label={t('calendar.ActivityTime')}>
                  <TimePicker format={shortTimeFormat} allowClear={true} style={{ width: '100%' }} />
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem name="iActivityDurationMinutes" label={t('calendar.DurationMinutes')}>
                  <InputNumber min={0} max={1440} step={15} allowClear={true} style={{ width: '100%' }} />
                </FormItem>
              </Col>
            </Row>
            <FormItem name="iRepeatingGid" hidden={true} />
            <FormItem name="iFirstRepeatingDate" hidden={true} />
            <FormItem name="iLastRepeatingDate" hidden={true} />
            <FormItem name="iIsRepeating" label={t('calendar.IsRepeating')} valuePropName="checked">
              <Switch
                disabled={repeatingDisabled}
                onChange={(checked) => {
                  const guid = checked ? uuidv4() : null;
                  form.setFieldsValue({
                    iRepeatingGid: guid,
                  });
                  setIsRepeating(checked);
                }}
              />
            </FormItem>
            {isRepeating ? (
              <Row gutter={8}>
                <Col span={16}>
                  <FormItem
                    name="iRepeatingDates"
                    label={t('calendar.RepeatingDates')}
                    rules={[
                      {
                        required: isRepeating,
                        type: 'array',
                        message: errorRequiredField(t, 'calendar.RepeatingDates'),
                      },
                    ]}
                  >
                    <RangePicker
                      picker="week"
                      format={weekFormat}
                      allowClear={true}
                      style={{ width: '100%' }}
                      onChange={(dates) => {
                        if (Array.isArray(dates) && dates.length === 2) {
                          form.setFieldsValue({
                            iRepeatingDates: [dates[0].isoWeekday(1), dates[1].isoWeekday(7)],
                          });
                        } else {
                          form.setFieldsValue({
                            iRepeatingDates: null,
                          });
                        }
                      }}
                    />
                  </FormItem>
                </Col>
                <Col span={8}>
                  <FormItem name="iRepeatingModified" label={t('calendar.RepeatingModified')} valuePropName="checked">
                    <Switch disabled={repeatingModifiedDisabled} />
                  </FormItem>
                </Col>
              </Row>
            ) : null}
            <FormItem name="iPlace" label={t('calendar.Place')}>
              <Input maxLength={64} />
            </FormItem>
            <Row gutter={8}>
              <Col span={8}>
                <MapButton variant="contained" onClick={onChooseMapPosition}>
                  <GlobalOutlined />
                  {t('map.ChooseMapPosition')}
                </MapButton>
              </Col>
              <Col span={8}>
                <FormItem name="iLongitude" label={t('map.Longitude')}>
                  <InputNumber step="0.000001" allowClear={true} style={{ width: '100%' }} />
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem name="iLatitude" label={t('map.Latitude')}>
                  <InputNumber step="0.000001" allowClear={true} style={{ width: '100%' }} />
                </FormItem>
              </Col>
            </Row>
            <FormItem name="iDescr" label={t('calendar.Description')}>
              <TextArea autosize={{ minRows: 2, maxRows: 6 }} maxLength={2048} />
            </FormItem>
            <FormItem name="iURL" label={t('calendar.Url')}>
              <Input maxLength={255} />
            </FormItem>
            <FormItem
              name="iResponsibleUserID"
              label={t('calendar.Responsible')}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, 'calendar.Responsible'),
                },
              ]}
            >
              <FormSelect
                style={{ minWidth: 174 }}
                options={domains.users.filter(
                  (user) => sessionModel.isAdmin || user.code.toString() === sessionModel.id
                )}
              />
            </FormItem>
          </Form>
        </StyledModalContent>
      </StyledModal>
    );
  })
);

export default CalendarEdit;
