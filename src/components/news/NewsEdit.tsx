import { DatePicker, Form, Input, message, Modal, Select, Switch } from 'antd';
import { observer } from 'mobx-react';
import { INewsItem, INewsItemProps } from 'models/newsModel';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { PostJsonData } from '../../utils/api';
import { fileAsBase64, getFileType } from '../../utils/fileHelper';
import { dateFormat, errorRequiredField, hasErrors, maxByteSize } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import UploadDragger from '../formItems/UploadDragger';

const { TextArea } = Input;
const StyledModal = styled(Modal)`
  &&& .ant-modal-body {
    max-height: calc(100vh - 200px);
    overflow-y: scroll;
    overflow-x: hidden;
  }
`;
const Option = Select.Option;
const StyledModalContent = styled.div``;

interface INewsEditProps {
  newsObject: INewsItem;
  open?: boolean;
  onChange: (insertedNewsObject: INewsItemProps) => void;
  onClose?: () => void;
}
const NewsEdit = observer(({ newsObject, open, onClose, onChange }: INewsEditProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
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

  const onSave = useCallback(async (values) => {
    const newsModule = clubModel.modules.find((module) => module.name === 'News');
    const saveUrl = values.iNewsID === -1 ? newsModule?.addUrl : newsModule?.updateUrl;
    if (!saveUrl) return;

    try {
      setSaving(true);
      values.iExpireDate =
        values.iExpireDate && typeof values.iExpireDate.format === 'function'
          ? values.iExpireDate.format(dateFormat)
          : values.iExpireDate;
      if (!Array.isArray(values.iFiles)) {
        values.iFiles = [];
      }
      values.iMimeType = null;
      values.iFileSize = null;
      if (values.iFiles.length === 0) {
        values.iFileID = 0;
      } else if (values.iFiles[0].originalFile) {
        values.iFileID = values.iFiles[0].uid;
      } else {
        values.iFileID = -1;
        values.iFileData = await fileAsBase64(values.iFiles[0].originFileObj);
        values.iMimeType = getFileType(values.iFiles[0]);
        values.iFileSize = values.iFiles[0].size;
        values.iFileName = values.iFiles[0].name;
      }
      values.iFiles = undefined;
      const newsObjectResponse = await PostJsonData(
        saveUrl,
        {
          ...values,
          username: sessionModel.username,
          password: sessionModel.password,
        },
        true,
        sessionModel.authorizationHeader
      );
      onChange && onChange(newsObjectResponse);
      setSaving(false);
      onClose && onClose();
    } catch (e: any) {
      e && message.error(e?.message);
      setSaving(false);
    }
  }, []);

  return (
    <StyledModal
      closable={false}
      maskClosable={false}
      title={t('news.Edit')}
      open={open}
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
      style={{ top: 40 }}
      width={800}
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
            iUpdateModificationDate: true,
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
              <Option value="10">{t('news.Banner')}</Option>
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
            <TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
          </FormItem>
          <FormItem name="iTexten" label={t('news.Text')}>
            <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
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
          <FormItem name="iUpdateModificationDate" label={t('news.UpdateModificationDate')} valuePropName="checked">
            <Switch />
          </FormItem>
        </Form>
      </StyledModalContent>
    </StyledModal>
  );
});

export default NewsEdit;
