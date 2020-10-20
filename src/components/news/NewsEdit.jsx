import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { observer, inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { hasErrors, errorRequiredField, dateFormat, maxByteSize } from '../../utils/formHelper';
import { PostJsonData } from '../../utils/api';
import moment from 'moment';
import UploadDragger from '../formItems/UploadDragger';
import FormItem from '../formItems/FormItem';

const { TextArea } = Input;
const Option = Select.Option;
const StyledModalContent = styled.div``;

// @inject("clubModel")
// @observer
const NewsEdit = inject(
  'clubModel',
  'sessionModel'
)(
  observer((props) => {
    const { clubModel, sessionModel, newsObject, open, onClose, onChange } = props;
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [valid, setValid] = useState(false);
    const [saving, setSaving] = useState(false);
    const formId = 'newsEditForm' + Math.floor(Math.random() * 10000000000000000);

    useEffect(() => {
      setTimeout(() => {
        if (open) {
          // To disable submit button at the beginning.
          form && form.resetFields();
          hasErrors(form).then((notValid) => setValid(!notValid));
        }
      }, 0);
    }, [form, open]);

    const onSave = useCallback((values) => {
      const newsModule = clubModel.modules.find((module) => module.name === 'News');
      const saveUrl = values.iNewsID === -1 ? newsModule.addUrl : newsModule.updateUrl;

      setSaving(true);
      values.iExpireDate =
        values.iExpireDate && typeof values.iExpireDate.format === 'function'
          ? values.iExpireDate.format(dateFormat)
          : values.iExpireDate;
      if (!Array.isArray(values.iFiles)) {
        values.iFiles = [];
      }
      if (values.iFiles.length === 0) {
        values.iFileID = 0;
      } else if (values.iFiles[0].originalFile) {
        values.iFileID = values.iFiles[0].uid;
      } else {
        values.iFileID = -1;
        values.iFileData = values.iFiles[0].originFileObj;
      }
      values.iFiles = undefined;
      PostJsonData(
        saveUrl,
        {
          ...values,
          username: sessionModel.username,
          password: sessionModel.password,
          jsonResponse: true,
        },
        true,
        sessionModel.authorizationHeader
      )
        .then((newsObjectResponse) => {
          onChange && onChange(newsObjectResponse);
          setSaving(false);
          onClose();
        })
        .catch((e) => {
          message.error(e.message);
          setSaving(false);
        });
    }, []);

    return (
      <Modal
        closable={false}
        maskClosable={false}
        title={t('news.Edit')}
        visible={open}
        okText={t('common.Save')}
        okButtonProps={{ disabled: !valid, loading: saving }}
        cancelText={t('common.Cancel')}
        cancelButtonProps={{ loading: saving }}
        onOk={() => {
          form.validateFields().then((values) => {
            onSave(values);
          });
        }}
        onCancel={onClose}
        style={{ top: 40, minWidth: 560 }}
      >
        <StyledModalContent>
          <Form
            form={form}
            id={formId}
            layout="vertical"
            initialValues={{
              iNewsID: newsObject.id,
              iNewsTypeID: newsObject.newsTypeId.toString(),
              iRubrik: newsObject.header,
              iLank: newsObject.link,
              iInledning: newsObject.introduction,
              iTexten: newsObject.text,
              iExpireDate: moment(newsObject.expireDate, dateFormat),
              iFileID: newsObject.fileId,
              iFileData: null,
              iFiles:
                newsObject.fileId !== 0
                  ? [
                      {
                        uid: newsObject.fileId,
                        name: newsObject.fileName,
                        type: newsObject.fileType,
                        size: newsObject.fileSize,
                        status: 'done',
                        originalFile: true,
                      },
                    ]
                  : [],
            }}
            onValuesChange={() => hasErrors(form).then((notValid) => setValid(!notValid))}
          >
            <FormItem name="iNewsID">
              <Input type="hidden" />
            </FormItem>
            <FormItem name="iNewsTypeID">
              <Select style={{ minWidth: 174 }}>
                <Option value="1">{t('modules.News')}</Option>
                <Option value="2">{t('news.LongTimeNews')}</Option>
                <Option value="3">{t('news.Educations')}</Option>
              </Select>
            </FormItem>
            <FormItem
              name="iRubrik"
              label={t('news.Header')}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, 'news.Header'),
                },
              ]}
            >
              <Input />
            </FormItem>
            <FormItem name="iLank" label={t('news.Link')}>
              <Input />
            </FormItem>
            <FormItem
              name="iInledning"
              label={t('news.Introduction')}
              rules={[
                {
                  required: true,
                  message: errorRequiredField(t, 'news.Introduction'),
                },
              ]}
            >
              <TextArea autosize={{ minRows: 1, maxRows: 4 }} />
            </FormItem>
            <FormItem name="iTexten" label={t('news.Text')}>
              <TextArea autosize={{ minRows: 2, maxRows: 6 }} />
            </FormItem>
            <FormItem
              name="iExpireDate"
              label={t('news.ExpireDate')}
              rules={[
                {
                  required: true,
                  type: 'object',
                  message: errorRequiredField(t, 'news.ExpireDate'),
                },
              ]}
            >
              <DatePicker format={dateFormat} />
            </FormItem>
            <UploadDragger form={form} fieldName="iFiles" maxByteSize={maxByteSize} multiple={false} />
            <FormItem name="iFileID">
              <Input type="hidden" />
            </FormItem>
            <FormItem name="iFileData">
              <Input type="hidden" />
            </FormItem>
          </Form>
        </StyledModalContent>
      </Modal>
    );
  })
);

export default NewsEdit;
