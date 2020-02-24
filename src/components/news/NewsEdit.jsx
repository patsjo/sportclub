import React, { Component } from "react";
import { Button, Modal, Form, Input, DatePicker, Select, message } from "antd";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import { hasErrors, errorRequiredField, dateFormat, normFile, maxByteSize } from "../../utils/formHelper";
import { PostJsonData } from "../../utils/api";
import moment from "moment";
import UploadDragger from "../formItems/UploadDragger";
import FormItem from "../formItems/FormItem";

const { TextArea } = Input;
const Option = Select.Option;
const StyledModalContent = styled.div``;

// @inject("clubModel")
// @observer
const NewsEdit = inject(
  "clubModel",
  "sessionModel"
)(
  observer(
    class NewsEdit extends Component {
      static propTypes = {
        newsObject: PropTypes.object.isRequired,
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        onChange: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          saving: false,
          formId: "newsEditForm" + Math.floor(Math.random() * 10000000000000000)
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
            const newsModule = clubModel.modules.find(module => module.name === "News");
            const saveUrl = values.iNewsID === -1 ? newsModule.addUrl : newsModule.updateUrl;
            self.setState({
              saving: true
            });
            values.iExpireDate =
              values.iExpireDate && typeof values.iExpireDate.format === "function"
                ? values.iExpireDate.format(dateFormat)
                : values.iExpireDate;
            if (!Array.isArray(values.iFiles)) {
              values.iFiles = [];
            }
            Promise.all(values.iFiles.map(file => normFile(file)))
              .then(files => {
                values.iFiles = undefined;
                if (files.length === 0) {
                  values.iFileID = 0;
                } else if (files[0].originalFile) {
                  values.iFileID = files[0].uid;
                } else {
                  values.iFileID = -1;
                  values.iFileData = files[0].originFileObj;
                }
                PostJsonData(
                  saveUrl,
                  {
                    ...values,
                    username: sessionModel.username,
                    password: sessionModel.password,
                    jsonResponse: true
                  },
                  true,
                  sessionModel.authorizationHeader
                )
                  .then(newsObjectResponse => {
                    onChange && onChange(newsObjectResponse);
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
              })
              .catch(() => {
                self.setState({
                  saving: false
                });
              });
          }
        });
      };

      render() {
        const self = this;
        const { t, form, newsObject } = self.props;
        const { saving, formId } = self.state;
        const { getFieldDecorator, getFieldsError, getFieldError, isFieldTouched } = form;
        // Only show error after a field is touched.
        const headerError = isFieldTouched("iRubrik") && getFieldError("iRubrik");
        const introductionError = isFieldTouched("iInledning") && getFieldError("iInledning");
        const expireDateError = isFieldTouched("iExpireDate") && getFieldError("iExpireDate");

        return (
          <Form id={formId} onSubmit={self.onSave}>
            <Modal
              closable={false}
              title={t("news.Edit")}
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
                  {getFieldDecorator("iNewsID", {
                    initialValue: newsObject.id
                  })(<Input type="hidden" />)}
                </FormItem>
                <FormItem>
                  {getFieldDecorator("iNewsTypeID", {
                    initialValue: newsObject.newsTypeId.toString()
                  })(
                    <Select style={{ minWidth: 174 }}>
                      <Option value="1">{t("modules.News")}</Option>
                      <Option value="2">{t("news.LongTimeNews")}</Option>
                      <Option value="3">{t("news.Educations")}</Option>
                    </Select>
                  )}
                </FormItem>
                <FormItem label={t("news.Header")} validateStatus={headerError ? "error" : ""} help={headerError || ""}>
                  {getFieldDecorator("iRubrik", {
                    initialValue: newsObject.header,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "news.Header")
                      }
                    ]
                  })(<Input />)}
                </FormItem>
                <FormItem label={t("news.Link")}>
                  {getFieldDecorator("iLank", {
                    initialValue: newsObject.link,
                    rules: [
                      {
                        required: false
                      }
                    ]
                  })(<Input />)}
                </FormItem>
                <FormItem
                  label={t("news.Introduction")}
                  validateStatus={introductionError ? "error" : ""}
                  help={introductionError || ""}
                >
                  {getFieldDecorator("iInledning", {
                    initialValue: newsObject.introduction,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "news.Introduction")
                      }
                    ]
                  })(<TextArea autosize={{ minRows: 1, maxRows: 4 }} />)}
                </FormItem>
                <FormItem label={t("news.Text")}>
                  {getFieldDecorator("iTexten", {
                    initialValue: newsObject.text,
                    rules: [
                      {
                        required: false
                      }
                    ]
                  })(<TextArea autosize={{ minRows: 2, maxRows: 6 }} />)}
                </FormItem>
                <FormItem
                  label={t("news.ExpireDate")}
                  validateStatus={expireDateError ? "error" : ""}
                  help={expireDateError || ""}
                >
                  {getFieldDecorator("iExpireDate", {
                    initialValue: moment(newsObject.expireDate, dateFormat),
                    rules: [
                      {
                        required: true,
                        type: "object",
                        message: errorRequiredField(t, "news.ExpireDate")
                      }
                    ]
                  })(<DatePicker format={dateFormat} />)}
                </FormItem>
                <UploadDragger
                  form={form}
                  fieldName="iFiles"
                  maxByteSize={maxByteSize}
                  multiple={false}
                  initialValue={
                    newsObject.fileId !== 0
                      ? [
                          {
                            uid: newsObject.fileId,
                            name: newsObject.fileName,
                            type: newsObject.fileType,
                            size: newsObject.fileSize,
                            status: "done",
                            originalFile: true
                          }
                        ]
                      : []
                  }
                />
                <FormItem>
                  {getFieldDecorator("iFileID", {
                    initialValue: newsObject.fileId
                  })(<Input type="hidden" />)}
                </FormItem>
                <FormItem>
                  {getFieldDecorator("iFileData", {
                    initialValue: null
                  })(<Input type="hidden" />)}
                </FormItem>
              </StyledModalContent>
            </Modal>
          </Form>
        );
      }
    }
  )
);

const NewsEditForm = Form.create()(NewsEdit);
const NewsEditWithI18n = withTranslation()(NewsEditForm); // pass `t` function to App

export default NewsEditWithI18n;
