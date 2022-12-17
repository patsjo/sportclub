import { LinkOutlined } from '@ant-design/icons';
import { Form, Input, message, Modal } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { ModalFuncProps } from 'antd/lib/modal';
import { TFunction } from 'i18next';
import { IGlobalStateModel } from 'models/globalStateModel';
import { IMobxClubModel } from 'models/mobxClubModel';
import { ISessionModel } from 'models/sessionModel';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
const { confirm } = Modal;
declare type ConfigUpdate = ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps);

export const HtmlEditorLinkModal = (
  t: TFunction,
  linkId: number,
  menuPath: string,
  url: string,
  form: FormInstance,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel
) =>
  new Promise((resolve, reject) => {
    const formId = 'htmlEditorForm' + Math.floor(Math.random() * 1000000000000000);
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
    };
    // eslint-disable-next-line prefer-const
    confirmModal = confirm({
      title: t('htmlEditor.MenuLink'),
      icon: <LinkOutlined />,
      content: (
        <Form
          form={form}
          id={formId}
          layout="vertical"
          initialValues={{
            iLinkID: linkId,
            iMenuPath: menuPath,
            iUrl: url,
          }}
          onValuesChange={() =>
            hasErrors(form).then((notValid) =>
              confirmModal.update({
                okButtonProps: {
                  danger: notValid && linkId > 0,
                  disabled: linkId > 0 ? false : notValid,
                },
                okText: notValid && linkId > 0 ? t('common.Delete') : t('common.Save'),
              })
            )
          }
        >
          <FormItem name="iLinkID">
            <Input type="hidden" />
          </FormItem>
          <FormItem
            name="iMenuPath"
            label={t('htmlEditor.Path')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'htmlEditor.Path'),
              },
              {
                validator: (rule, value: string, callback) => {
                  if (value.startsWith('http')) {
                    callback(t('htmlEditor.NoUrlError') ?? undefined);
                  } else if (value.includes('//')) {
                    callback(t('htmlEditor.DoubleSlashError') ?? undefined);
                  } else if (!value.startsWith('/') || value.endsWith('/')) {
                    callback(t('htmlEditor.FormatError') ?? undefined);
                  }
                  callback();
                },
              },
            ]}
          >
            <Input />
          </FormItem>
          <FormItem
            name="iUrl"
            label={t('htmlEditor.Url')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'htmlEditor.Url'),
              },
            ]}
          >
            <Input />
          </FormItem>
        </Form>
      ),
      okText: t('common.Save'),
      okButtonProps: {
        disabled: true,
      },
      cancelText: t('common.Cancel'),
      onOk() {
        hasErrors(form).then((notValid) => {
          const htmlEditorModule = clubModel.modules.find((module) => module.name === 'HTMLEditor');
          const deleteUrl = htmlEditorModule?.deleteUrl;
          const saveUrl = linkId < 0 ? htmlEditorModule?.addUrl : htmlEditorModule?.updateUrl;

          confirmModal.update({
            okButtonProps: {
              loading: true,
            },
          });

          if (notValid && linkId > 0) {
            PostJsonData(
              deleteUrl,
              {
                iLinkID: linkId,
                username: sessionModel.username,
                password: sessionModel.password,
              },
              true,
              sessionModel.authorizationHeader
            )
              .then((linkResponse) => {
                htmlEditorModule && globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, sessionModel, message);
                resolve(linkResponse);
              })
              .catch((e) => {
                message.error(e.message);
                confirmModal.update({
                  okButtonProps: {
                    loading: false,
                  },
                });
              });
          } else {
            form.validateFields().then((values) => {
              PostJsonData(
                saveUrl,
                {
                  ...values,
                  iLinkID: linkId,
                  username: sessionModel.username,
                  password: sessionModel.password,
                },
                true,
                sessionModel.authorizationHeader
              )
                .then((linkResponse) => {
                  htmlEditorModule && globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, sessionModel, message);
                  resolve(linkResponse);
                })
                .catch((e) => {
                  message.error(e.message);
                  confirmModal.update({
                    okButtonProps: {
                      loading: false,
                    },
                  });
                });
            });
          }
        });
      },
      onCancel() {
        reject();
      },
    });
  });
