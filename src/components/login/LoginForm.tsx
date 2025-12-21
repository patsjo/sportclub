import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Form, Input, Modal, Switch } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ILocalStorageLogin } from '../../models/sessionModel';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import FormItem from '../formItems/FormItem';

const StyledModalContent = styled.div``;

interface ILoginProps {
  open: boolean;
  onClose: () => void;
}
const Login = observer(({ open, onClose }: ILoginProps) => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [form] = Form.useForm<ILocalStorageLogin>();
  const [valid, setValid] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      if (open) {
        // To disable submit button at the beginning.
        form?.resetFields();
        hasErrors(form).then(notValid => setValid(!notValid));
      }
    }, 0);
  }, [form, open]);

  const onLogin = useCallback(
    async (values: ILocalStorageLogin) => {
      try {
        if (!values.username || !values.password) return;
        setLoggingIn(true);
        const json = await PostJsonData<{
          id: string;
          name: string;
          isAdmin: boolean;
          eventorPersonId: number;
        }>(
          clubModel.loginUrl,
          { username: values.username, password: values.password },
          true,
          { 'X-Requested-With': 'XMLHttpRequest' },
          1
        );
        sessionModel.setLogin(values.username, values.password, values.rememberLogin);
        if (json) {
          sessionModel.setSuccessfullyLogin(json.id, json.name, json.isAdmin, json.eventorPersonId);
          setLoggingIn(false);
          onClose();
        }
      } catch {
        sessionModel.setFailedLogin();
        setLoggingIn(false);
      }
    },
    [clubModel.loginUrl, onClose, sessionModel]
  );

  return (
    <Modal
      closable={false}
      maskClosable={false}
      title={t('common.Login')}
      open={open}
      okText={t('common.Login')}
      okButtonProps={{ disabled: !valid, loading: loggingIn }}
      cancelText={t('common.Cancel')}
      cancelButtonProps={{ loading: loggingIn }}
      style={{ top: 40 }}
      onOk={() => {
        form.validateFields().then(values => {
          onLogin(values);
        });
      }}
      onCancel={onClose}
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
          onValuesChange={() => hasErrors(form).then(notValid => setValid(!notValid))}
        >
          <FormItem
            name="username"
            label={t('common.Username')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'common.Username')
              }
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} />
          </FormItem>
          <FormItem
            name="password"
            label={t('common.Password')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'common.Password')
              }
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} />
          </FormItem>
          <FormItem name="rememberLogin" label={t('common.RememberLogin')} valuePropName="checked">
            <Switch disabled={!sessionModel.canReadLocalStorage} />
          </FormItem>
        </Form>
      </StyledModalContent>
    </Modal>
  );
});

export default Login;
