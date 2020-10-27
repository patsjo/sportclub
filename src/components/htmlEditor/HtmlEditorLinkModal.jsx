import React from 'react';
import { Form, Input, Modal, message } from 'antd';
import { hasErrors, errorRequiredField } from '../../utils/formHelper';
import { PostJsonData } from '../../utils/api';
import FormItem from '../formItems/FormItem';
import { LinkOutlined } from '@ant-design/icons';
const { confirm } = Modal;

export const HtmlEditorLinkModal = (t, linkId, menuPath, url, form, globalStateModel, sessionModel, clubModel) =>
  new Promise((resolve, reject) => {
    const formId = 'htmlEditorForm' + Math.floor(Math.random() * 10000000000000000);
    let confirmModal;
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
                  disabled: notValid,
                },
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
        const htmlEditorModule = clubModel.modules.find((module) => module.name === 'HTMLEditor');
        const saveUrl = linkId < 0 ? htmlEditorModule.addUrl : htmlEditorModule.updateUrl;

        confirmModal.update({
          okButtonProps: {
            loading: true,
          },
        });
        form.validateFields().then((values) => {
          PostJsonData(
            saveUrl,
            {
              ...values,
              iLinkID: linkId,
              username: sessionModel.username,
              password: sessionModel.password,
              jsonResponse: true,
            },
            true,
            sessionModel.authorizationHeader
          )
            .then((linkResponse) => {
              globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, sessionModel, message);
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
      },
      onCancel() {
        reject();
      },
    });
  });
