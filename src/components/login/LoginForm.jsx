import React, { Component } from "react";
import { Button, Modal, Form, Input, Icon, Switch } from "antd";
import PropTypes from "prop-types";
import { observer, inject } from "mobx-react";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import { PostJsonData } from "../../utils/api";
import { hasErrors, errorRequiredField } from "../../utils/formHelper";
import FormItem from "../formItems/FormItem";

const StyledModalContent = styled.div``;

// @inject("sessionModel", "clubModel")
// @observer
const Login = inject(
  "sessionModel",
  "clubModel"
)(
  observer(
    class Login extends Component {
      static propTypes = {
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.state = {
          loggingIn: false
        };
      }

      componentDidMount() {
        // To disabled submit button at the beginning.
        this.props.form.validateFields();
      }

      onLogin = evt => {
        evt.stopPropagation();
        evt.preventDefault();
        this.props.form.validateFields((err, values) => {
          if (!err) {
            const { clubModel, sessionModel } = this.props;
            const self = this;
            this.setState({
              loggingIn: true
            });
            PostJsonData(
              clubModel.loginUrl,
              { username: values.username, password: values.password },
              true,
              { "X-Requested-With": "XMLHttpRequest" },
              1
            )
              .then(json => {
                sessionModel.setLogin(values.username, values.password, values.rememberLogin);
                // eslint-disable-next-line eqeqeq
                if (json == undefined) {
                  json = { id: undefined, name: values.username, isAdmin: false };
                }
                sessionModel.setSuccessfullyLogin(json.id, json.name, json.isAdmin);
                self.setState({
                  loggingIn: false
                });
                self.props.onClose();
              })
              .catch(() => {
                sessionModel.setFailedLogin();
                self.setState({
                  loggingIn: false
                });
              });
          }
        });
      };

      render() {
        const { t, form, sessionModel } = this.props;
        const { loggingIn } = this.state;
        const { getFieldDecorator, getFieldsError, getFieldError, isFieldTouched } = form;

        // Only show error after a field is touched.
        const userNameError = isFieldTouched("username") && getFieldError("username");
        const passwordError = isFieldTouched("password") && getFieldError("password");

        return (
          <Form id="loginForm" onSubmit={this.onLogin}>
            <Modal
              closable={false}
              centered={true}
              title={t("common.Login")}
              visible={this.props.open}
              onCancel={this.props.onClose}
              footer={[
                <Button
                  form="loginForm"
                  key="submit"
                  variant="contained"
                  color="primary"
                  type="primary"
                  htmlType="submit"
                  disabled={hasErrors(getFieldsError())}
                  loading={loggingIn}
                >
                  {t("common.Login")}
                </Button>,
                <Button variant="contained" onClick={this.props.onClose} loading={loggingIn}>
                  {t("common.Cancel")}
                </Button>
              ]}
            >
              <StyledModalContent>
                <FormItem
                  label={t("common.Username")}
                  validateStatus={userNameError ? "error" : ""}
                  help={userNameError || ""}
                >
                  {getFieldDecorator("username", {
                    initialValue: sessionModel.username,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "common.Username")
                      }
                    ]
                  })(<Input prefix={<Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />} />)}
                </FormItem>
                <FormItem
                  label={t("common.Password")}
                  validateStatus={passwordError ? "error" : ""}
                  help={passwordError || ""}
                >
                  {getFieldDecorator("password", {
                    initialValue: sessionModel.password,
                    rules: [
                      {
                        required: true,
                        message: errorRequiredField(t, "common.Password")
                      }
                    ]
                  })(<Input.Password prefix={<Icon type="lock" style={{ color: "rgba(0,0,0,.25)" }} />} />)}
                </FormItem>
                <FormItem label={t("common.RememberLogin")}>
                  {getFieldDecorator("rememberLogin", {
                    valuePropName: "checked",
                    initialValue: sessionModel.rememberLogin
                  })(<Switch disabled={!sessionModel.canReadLocalStorage} />)}
                </FormItem>
              </StyledModalContent>
            </Modal>
          </Form>
        );
      }
    }
  )
);

const LoginForm = Form.create({ name: "loginForm" })(Login);
const LoginFormWithI18n = withTranslation()(LoginForm); // pass `t` function to App

export default LoginFormWithI18n;
