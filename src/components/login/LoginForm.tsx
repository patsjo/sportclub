import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Divider, Form, Input, Modal, Switch } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { ISessionInfo } from '../../models/sessionModel';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors } from '../../utils/formHelper';
import { oauthLoginUrl } from '../../utils/loginHelper';
import { useMobxStore } from '../../utils/mobxStore';
import FormItem from '../formItems/FormItem';
import { FacebookLogo, GoogleLogo } from './ProviderLogos';

const StyledModalContent = styled.div``;
const ProviderButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
// The colors and look that Google and Facebook require for their sign in buttons
const ProviderButton = styled.button<{ $provider: 'google' | 'facebook' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  border: 1px solid ${({ $provider }) => ($provider === 'google' ? '#747775' : '#1877f2')};
  background-color: ${({ $provider }) => ($provider === 'google' ? '#ffffff' : '#1877f2')};
  color: ${({ $provider }) => ($provider === 'google' ? '#1f1f1f' : '#ffffff')};
  &:hover:not(:disabled) {
    background-color: ${({ $provider }) => ($provider === 'google' ? '#f2f2f2' : '#166fe5')};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
const GuestInfo = styled.div`
  font-size: 12px;
  color: #808080;
  margin-top: 6px;
`;

interface ILoginFormValues {
  username?: string;
  password?: string;
  rememberLogin: boolean;
}

interface ILoginProps {
  open: boolean;
  onClose: () => void;
}
const Login = observer(({ open, onClose }: ILoginProps) => {
  const { clubModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [form] = Form.useForm<ILoginFormValues>();
  const [valid, setValid] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [failed, setFailed] = useState(false);
  const socialLogin = clubModel.socialLogin;
  const providers = [
    socialLogin?.googleUrl
      ? {
          key: 'google' as const,
          url: socialLogin.googleUrl,
          label: t('login.WithGoogle'),
          content: (
            <>
              <GoogleLogo />
              {t('login.WithGoogle')}
            </>
          )
        }
      : null,
    socialLogin?.facebookUrl
      ? {
          key: 'facebook' as const,
          url: socialLogin.facebookUrl,
          label: t('login.WithFacebook'),
          content: (
            <>
              <FacebookLogo size={20} />
              {t('login.WithFacebook')}
            </>
          )
        }
      : null
  ].filter(provider => provider !== null);

  useEffect(() => {
    setTimeout(() => {
      if (open) {
        // To disable submit button at the beginning.
        form?.resetFields();
        setFailed(false);
        hasErrors(form).then(notValid => setValid(!notValid));
      }
    }, 0);
  }, [form, open]);

  const onLogin = useCallback(
    async (values: ILoginFormValues) => {
      try {
        if (!values.username || !values.password) return;
        setLoggingIn(true);
        setFailed(false);
        const json = await PostJsonData<ISessionInfo>(
          clubModel.loginUrl,
          { username: values.username, password: values.password, rememberLogin: !!values.rememberLogin },
          true,
          { 'X-Requested-With': 'XMLHttpRequest' },
          1
        );
        setLoggingIn(false);
        if (json?.token) {
          sessionModel.setSession(json, values.username);
          onClose();
        } else {
          sessionModel.setFailedLogin();
          setFailed(true);
        }
      } catch {
        sessionModel.setFailedLogin();
        setLoggingIn(false);
        setFailed(true);
      }
    },
    [clubModel.loginUrl, onClose, sessionModel]
  );

  // The whole page goes to Google/Facebook and comes back with a one time code (see App).
  // Always remembered, the same account is logged in until the user logs out.
  const onProviderLogin = (url: string) => window.location.assign(oauthLoginUrl(url, true));

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
      // Above the modal of a news item, when logging in to comment
      zIndex={1100}
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
            password: '',
            rememberLogin: sessionModel.rememberLogin
          }}
          onValuesChange={() => hasErrors(form).then(notValid => setValid(!notValid))}
          onFinish={values => onLogin(values)}
        >
          <FormItem
            name="username"
            label={clubModel.eventor ? t('login.EventorUsername') : t('common.Username')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'common.Username')
              }
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} autoComplete="username" />
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
            validateStatus={failed ? 'error' : undefined}
            help={failed ? t('login.Failed') : undefined}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              autoComplete="current-password"
              onPressEnter={() => form.submit()}
            />
          </FormItem>
          <FormItem name="rememberLogin" label={t('common.RememberLogin')} valuePropName="checked">
            <Switch disabled={!sessionModel.canReadLocalStorage} />
          </FormItem>
        </Form>
        {providers.length > 0 ? (
          <>
            <Divider plain>{t('login.Or')}</Divider>
            <ProviderButtons>
              {providers.map(provider => (
                <ProviderButton
                  key={provider.key}
                  type="button"
                  $provider={provider.key}
                  aria-label={provider.label}
                  disabled={loggingIn}
                  onClick={() => onProviderLogin(provider.url)}
                >
                  {provider.content}
                </ProviderButton>
              ))}
            </ProviderButtons>
            <GuestInfo>{t('login.GuestInfo')}</GuestInfo>
          </>
        ) : null}
      </StyledModalContent>
    </Modal>
  );
});

export default Login;
