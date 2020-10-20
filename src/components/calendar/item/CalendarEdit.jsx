import React, { useState, useEffect, useCallback } from "react";
import { Button, Modal, Form, Input, DatePicker, TimePicker, Row, Col, message } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { observer, inject } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  FormSelect,
  hasErrors,
  errorRequiredField,
  dateFormat,
  shortTimeFormat,
  timeFormat
} from "../../../utils/formHelper";
import { PostJsonData } from "../../../utils/api";
import moment from "moment";
import FormItem from "../../formItems/FormItem";
import { GetPositionModal } from "../../map/GetPositionModal";

const { TextArea } = Input;
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
  "clubModel",
  "sessionModel"
)(
  observer((props) => {
    const { clubModel, sessionModel, title, calendarObject, domains, open, onClose, onChange } = props;
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [valid, setValid] = useState(false);
    const [saving, setSaving] = useState(false);
    const formId = "calendarEditForm" + Math.floor(Math.random() * 10000000000000000);

    useEffect(() => {
      setTimeout(() => {
        if (open) {
          // To disable submit button at the beginning.
          form && form.resetFields();
          hasErrors(form).then((notValid) => setValid(!notValid));
        }
      }, 0);
    }, [open]);

    const onSave = useCallback((values) => {
      const calendarModule = clubModel.modules.find((module) => module.name === "Calendar");
      const saveUrl = values.iActivityID === 0 ? calendarModule.addUrl : calendarModule.updateUrl;
      setSaving(true);
      values.iActivityDay =
        values.iActivityDay && typeof values.iActivityDay.format === "function"
          ? values.iActivityDay.format(dateFormat)
          : values.iActivityDay;
      values.iActivityTime =
        values.iActivityTime && typeof values.iActivityTime.format === "function"
          ? values.iActivityTime.format(timeFormat)
          : values.iActivityTime;
      PostJsonData(
        saveUrl,
        {
          ...values,
          iType: "ACTIVITY",
          username: sessionModel.username,
          password: sessionModel.password,
          jsonResponse: true
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
    }, []);

    const onChooseMapPosition = useCallback(() => {
      const { getFieldValue, setFieldsValue } = form;
      const longitude = getFieldValue("iLongitude");
      const latitude = getFieldValue("iLatitude");
      const clubLongitude = clubModel.mapCenter ? clubModel.mapCenter[0] : undefined;
      const clubLatitude = clubModel.mapCenter ? clubModel.mapCenter[1] : undefined;
      const exists = longitude && latitude;
      GetPositionModal(t, exists ? longitude : clubLongitude, exists ? latitude : clubLatitude, exists).then(
        (selectedPosition) => {
          if (selectedPosition) {
            setFieldsValue({ iLongitude: selectedPosition.longitude, iLatitude: selectedPosition.latitude });
          }
        }
      );
    }, []);

    return (
      <Modal
        closable={false}
        maskClosable={false}
        title={title}
        visible={open}
        okText={t("common.Save")}
        okButtonProps={{ disabled: !valid, loading: saving }}
        cancelText={t("common.Cancel")}
        cancelButtonProps={{ loading: saving }}
        style={{ top: 40, minWidth: 560 }}
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
              iPlace: calendarObject.place,
              iLongitude: calendarObject.longitude,
              iLatitude: calendarObject.latitude,
              iDescr: calendarObject.description,
              iURL: calendarObject.url,
              iResponsibleUserID: sessionModel.isAdmin ? calendarObject.responsibleUserId : parseInt(sessionModel.id)
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
                  label={t("calendar.ActivityType")}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, "calendar.ActivityType")
                    }
                  ]}
                >
                  <FormSelect style={{ minWidth: 174 }} options={domains.activityTypes} />
                </FormItem>
              </Col>
              <Col span={12}>
                <FormItem
                  name="iGroupID"
                  label={t("calendar.Group")}
                  rules={[
                    {
                      required: true,
                      message: errorRequiredField(t, "calendar.Group")
                    }
                  ]}
                >
                  <FormSelect style={{ minWidth: 174 }} options={domains.groups} />
                </FormItem>
              </Col>
            </Row>
            <FormItem
              name="iHeader"
              label={t("calendar.Header")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "calendar.Header")
                }
              ]}
            >
              <Input maxLength={32} />
            </FormItem>
            <Row gutter={8}>
              <Col span={12}>
                <FormItem
                  name="iActivityDay"
                  label={t("calendar.ActivityDay")}
                  rules={[
                    {
                      required: true,
                      type: "object",
                      message: errorRequiredField(t, "calendar.ActivityDay")
                    }
                  ]}
                >
                  <DatePicker format={dateFormat} />
                </FormItem>
              </Col>
              <Col span={12}>
                <FormItem name="iActivityTime" label={t("calendar.ActivityTime")}>
                  <TimePicker format={shortTimeFormat} allowClear={true} />
                </FormItem>
              </Col>
            </Row>
            <FormItem name="iPlace" label={t("calendar.Place")}>
              <Input maxLength={64} />
            </FormItem>
            <Row gutter={8}>
              <Col span={8}>
                <MapButton variant="contained" onClick={onChooseMapPosition}>
                  <GlobalOutlined />
                  {t("map.ChooseMapPosition")}
                </MapButton>
              </Col>
              <Col span={8}>
                <FormItem name="iLongitude" label={t("map.Longitude")}>
                  <Input type="number" step="0.000001" />
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem name="iLatitude" label={t("map.Latitude")}>
                  <Input type="number" step="0.000001" />
                </FormItem>
              </Col>
            </Row>
            <FormItem name="iDescr" label={t("calendar.Description")}>
              <TextArea autosize={{ minRows: 2, maxRows: 6 }} maxLength={2048} />
            </FormItem>
            <FormItem name="iURL" label={t("calendar.Url")}>
              <Input maxLength={255} />
            </FormItem>
            <FormItem
              name="iResponsibleUserID"
              label={t("calendar.Responsible")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "calendar.Responsible")
                }
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
      </Modal>
    );
  })
);

export default CalendarEdit;
