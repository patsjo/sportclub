import React, { Component } from "react";
import { Button, Modal, Form, Icon, Input, DatePicker, TimePicker, Row, Col, message } from "antd";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
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
    margin-top: 23px;
  }
`;

// @inject("clubModel")
// @observer
const CalendarEdit = inject(
  "clubModel",
  "sessionModel"
)(
  observer(
    class CalendarEdit extends Component {
      static propTypes = {
        title: PropTypes.string.isRequired,
        calendarObject: PropTypes.object.isRequired,
        domains: PropTypes.object.isRequired,
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        onChange: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formId: "calendarEditForm" + Math.floor(Math.random() * 10000000000000000)
        };
      }

      componentDidMount() {
        // To disable submit button at the beginning.
        this.props.form.validateFields();
      }

      onSave = evt => {
        const self = this;
        evt.stopPropagation();
        evt.preventDefault();
        self.props.form.validateFields((err, values) => {
          if (!err) {
            const { clubModel, sessionModel, onChange } = self.props;
            const calendarModule = clubModel.modules.find(module => module.name === "Calendar");
            const saveUrl = values.iActivityID === 0 ? calendarModule.addUrl : calendarModule.updateUrl;
            self.setState({
              saving: true
            });
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
              .then(calendarObjectResponse => {
                onChange && onChange(calendarObjectResponse);
                self.setState({
                  saving: false
                });
                self.props.onClose();
              })
              .catch(e => {
                message.error(e.message);
                self.setState({
                  saving: false
                });
              });
          }
        });
      };

      onChooseMapPosition = () => {
        const self = this;
        const { t, form, clubModel } = self.props;
        const { getFieldValue, setFieldsValue } = form;
        const longitude = getFieldValue("iLongitude");
        const latitude = getFieldValue("iLatitude");
        const clubLongitude = clubModel.mapCenter ? clubModel.mapCenter[0] : undefined;
        const clubLatitude = clubModel.mapCenter ? clubModel.mapCenter[1] : undefined;
        const exists = longitude && latitude;
        GetPositionModal(t, exists ? longitude : clubLongitude, exists ? latitude : clubLatitude, exists).then(
          selectedPosition => {
            if (selectedPosition) {
              setFieldsValue({ iLongitude: selectedPosition.longitude, iLatitude: selectedPosition.latitude });
            }
          }
        );
      };

      render() {
        const self = this;
        const { t, form, title, calendarObject, domains, sessionModel } = self.props;
        const { saving, formId } = self.state;
        const { getFieldDecorator, getFieldsError, getFieldError, isFieldTouched } = form;
        // Only show error after a field is touched.
        const activityTypeIDError = isFieldTouched("iActivityTypeID") && getFieldError("iActivityTypeID");
        const groupIDError = isFieldTouched("iGroupID") && getFieldError("iGroupID");
        const headerError = isFieldTouched("iHeader") && getFieldError("iHeader");
        const activityDayError = isFieldTouched("iActivityDay") && getFieldError("iActivityDay");
        const responsibleUserIDError = isFieldTouched("iResponsibleUserID") && getFieldError("iResponsibleUserID");

        return (
          <Form id={formId} onSubmit={self.onSave}>
            <Modal
              closable={false}
              title={title}
              visible={self.props.open}
              onCancel={self.props.onClose}
              footer={[
                <Button
                  form={formId}
                  key="submit"
                  variant="contained"
                  color="primary"
                  type="primary"
                  htmlType="submit"
                  disabled={hasErrors(getFieldsError())}
                  loading={saving}
                >
                  {t("common.Save")}
                </Button>,
                <Button variant="contained" onClick={self.props.onClose} loading={saving}>
                  {t("common.Cancel")}
                </Button>
              ]}
            >
              <StyledModalContent>
                <FormItem>
                  {getFieldDecorator("iActivityID", {
                    initialValue: calendarObject.activityId
                  })(<Input type="hidden" />)}
                </FormItem>
                <Row gutter={8}>
                  <Col span={12}>
                    <FormItem
                      label={t("calendar.ActivityType")}
                      validateStatus={activityTypeIDError ? "error" : ""}
                      help={activityTypeIDError || ""}
                    >
                      {getFieldDecorator("iActivityTypeID", {
                        initialValue: calendarObject.activityTypeId,
                        rules: [
                          {
                            required: true,
                            message: errorRequiredField(t, "calendar.ActivityType")
                          }
                        ]
                      })(<FormSelect style={{ minWidth: 174 }} options={domains.activityTypes} />)}
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem
                      label={t("calendar.Group")}
                      validateStatus={groupIDError ? "error" : ""}
                      help={groupIDError || ""}
                    >
                      {getFieldDecorator("iGroupID", {
                        initialValue: calendarObject.groupId,
                        rules: [
                          {
                            required: true,
                            message: errorRequiredField(t, "calendar.Group")
                          }
                        ]
                      })(<FormSelect style={{ minWidth: 174 }} options={domains.groups} />)}
                    </FormItem>
                  </Col>
                </Row>
                <FormItem
                  label={t("calendar.Header")}
                  validateStatus={headerError ? "error" : ""}
                  help={headerError || ""}
                >
                  {getFieldDecorator("iHeader", {
                    initialValue: calendarObject.header,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "calendar.Header")
                      }
                    ]
                  })(<Input maxLength={32} />)}
                </FormItem>
                <Row gutter={8}>
                  <Col span={12}>
                    <FormItem
                      label={t("calendar.ActivityDay")}
                      validateStatus={activityDayError ? "error" : ""}
                      help={activityDayError || ""}
                    >
                      {getFieldDecorator("iActivityDay", {
                        initialValue: moment(calendarObject.date, dateFormat),
                        rules: [
                          {
                            required: true,
                            type: "object",
                            message: errorRequiredField(t, "calendar.ActivityDay")
                          }
                        ]
                      })(<DatePicker format={dateFormat} />)}
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label={t("calendar.ActivityTime")}>
                      {getFieldDecorator("iActivityTime", {
                        initialValue:
                          // eslint-disable-next-line eqeqeq
                          calendarObject.time == null ? null : moment(calendarObject.time, shortTimeFormat)
                      })(<TimePicker format={shortTimeFormat} allowClear={true} />)}
                    </FormItem>
                  </Col>
                </Row>
                <FormItem label={t("calendar.Place")}>
                  {getFieldDecorator("iPlace", {
                    initialValue: calendarObject.place
                  })(<Input maxLength={64} />)}
                </FormItem>
                <Row gutter={8}>
                  <Col span={8}>
                    <MapButton variant="contained" onClick={self.onChooseMapPosition}>
                      <Icon type="global" />
                      {t("map.ChooseMapPosition")}
                    </MapButton>
                  </Col>
                  <Col span={8}>
                    <FormItem label={t("map.Longitude")}>
                      {getFieldDecorator("iLongitude", {
                        initialValue: calendarObject.longitude
                      })(<Input type="number" step="0.000001" />)}
                    </FormItem>
                  </Col>
                  <Col span={8}>
                    <FormItem label={t("map.Latitude")}>
                      {getFieldDecorator("iLatitude", {
                        initialValue: calendarObject.latitude
                      })(<Input type="number" step="0.000001" />)}
                    </FormItem>
                  </Col>
                </Row>
                <FormItem label={t("calendar.Description")}>
                  {getFieldDecorator("iDescr", {
                    initialValue: calendarObject.description
                  })(<TextArea autosize={{ minRows: 2, maxRows: 6 }} maxLength={2048} />)}
                </FormItem>
                <FormItem label={t("calendar.Url")}>
                  {getFieldDecorator("iURL", {
                    initialValue: calendarObject.url
                  })(<Input maxLength={255} />)}
                </FormItem>
                <FormItem
                  label={t("calendar.Responsible")}
                  validateStatus={responsibleUserIDError ? "error" : ""}
                  help={responsibleUserIDError || ""}
                >
                  {getFieldDecorator("iResponsibleUserID", {
                    initialValue: sessionModel.isAdmin ? calendarObject.responsibleUserId : parseInt(sessionModel.id),
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "calendar.Responsible")
                      }
                    ]
                  })(
                    <FormSelect
                      style={{ minWidth: 174 }}
                      options={domains.users.filter(
                        user => sessionModel.isAdmin || user.code.toString() === sessionModel.id
                      )}
                    />
                  )}
                </FormItem>
              </StyledModalContent>
            </Modal>
          </Form>
        );
      }
    }
  )
);

const CalendarEditForm = Form.create()(CalendarEdit);
const CalendarEditWithI18n = withTranslation()(CalendarEditForm); // pass `t` function to App

export default CalendarEditWithI18n;
