import React, { useState, useEffect, useCallback } from "react";
import { Modal, Form, Input, Switch } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { observer, inject } from "mobx-react";
import { useTranslation } from "react-i18next";
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
  observer((props) => {
    const { clubModel, sessionModel, open, onClose } = props;
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [valid, setValid] = useState(false);
    const [loggingIn, setLoggingIn] = useState(false);

    useEffect(() => {
      setTimeout(() => {
        if (open) {
          // To disable submit button at the beginning.
          form && form.resetFields();
          hasErrors(form).then((notValid) => setValid(!notValid));
        }
      }, 0);
    }, [open]);

    const onLogin = useCallback((values) => {
      setLoggingIn(true);
      PostJsonData(
        clubModel.loginUrl,
        { username: values.username, password: values.password },
        true,
        { "X-Requested-With": "XMLHttpRequest" },
        1
      )
        .then((json) => {
          sessionModel.setLogin(values.username, values.password, values.rememberLogin);
          // eslint-disable-next-line eqeqeq
          if (json == undefined) {
            json = { id: undefined, name: values.username, isAdmin: false };
          }
          sessionModel.setSuccessfullyLogin(json.id, json.name, json.isAdmin, json.eventorPersonId);
          setLoggingIn(false);
          onClose();
        })
        .catch(() => {
          sessionModel.setFailedLogin();
          setLoggingIn(false);
        });
    }, []);

    return (
      <Modal
        closable={false}
        maskClosable={false}
        title={t("common.Login")}
        visible={open}
        okText={t("common.Login")}
        okButtonProps={{ disabled: !valid, loading: loggingIn }}
        cancelText={t("common.Cancel")}
        cancelButtonProps={{ loading: loggingIn }}
        onOk={() => {
          form.validateFields().then((values) => {
            onLogin(values);
          });
        }}
        onCancel={onClose}
        style={{ top: 40, minWidth: 560 }}
      >
        <StyledModalContent>
          <Form
            form={form}
            id="loginForm"
            layout="vertical"
            initialValues={{
              username: sessionModel.username,
              password: sessionModel.password,
              rememberLogin: sessionModel.rememberLogin
            }}
            onValuesChange={() => hasErrors(form).then((notValid) => setValid(!notValid))}
          >
            <FormItem
              name="username"
              label={t("common.Username")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "common.Username")
                }
              ]}
            >
              <Input prefix={<UserOutlined style={{ color: "rgba(0,0,0,.25)" }} />} />
            </FormItem>
            <FormItem
              name="password"
              label={t("common.Password")}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, "common.Password")
                }
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: "rgba(0,0,0,.25)" }} />} />
            </FormItem>
            <FormItem name="rememberLogin" label={t("common.RememberLogin")} valuePropName="checked">
              <Switch disabled={!sessionModel.canReadLocalStorage} />
            </FormItem>
          </Form>
        </StyledModalContent>
      </Modal>
    );
  })
);

export default Login;
