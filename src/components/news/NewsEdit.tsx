import { DatePicker, Form, Input, message, Modal, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { INewsItem, INewsItemProps } from '../../models/newsModel';
import { PostJsonData } from '../../utils/api';
import { fileAsBase64, getFileType } from '../../utils/fileHelper';
import { dateFormat, errorRequiredField, hasErrors, IFile, maxByteSize } from '../../utils/formHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { INewsEditRequest } from '../../utils/requestInterfaces';
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
const StyledModalContent = styled.div``;

interface INewsEditForm extends Omit<INewsEditRequest, 'iFileData'> {
  iFiles: IFile[];
}

interface INewsEditProps {
  newsObject: INewsItem;
  open?: boolean;
  onChange: (insertedNewsObject: INewsItemProps) => void;
  onClose?: () => void;
}
const NewsEdit = observer(({ newsObject, open, onClose, onChange }: INewsEditProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [form] = Form.useForm<INewsEditForm>();
  const [valid, setValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const formId = 'newsEditForm' + Math.floor(Math.random() * 10000000000000000);

  useEffect(() => {
    setTimeout(() => {
      if (open) {
        // To disable submit button at the beginning.
        form?.resetFields();
        hasErrors(form).then(notValid => setValid(!notValid));
      }
    }, 0);
  }, [form, open]);

  const onSave = useCallback(
    async (formValues: INewsEditForm) => {
      const newsModule = clubModel.modules.find(module => module.name === 'News');
      const saveUrl = formValues.iNewsID === -1 ? newsModule?.addUrl : newsModule?.updateUrl;
      if (!saveUrl) return;

      try {
        setSaving(true);
        if (!Array.isArray(formValues.iFiles)) {
          formValues.iFiles = [];
        }
        const values: INewsEditRequest = {
          ...formValues,
          iMimeType: null,
          iFileSize: null,
          iFileData: null
        };
        if (formValues.iFiles.length === 0) {
          values.iFileID = 0;
        } else if (formValues.iFiles[0].isOriginalFile) {
          values.iFileID = parseInt(formValues.iFiles[0].uid);
        } else {
          values.iFileID = -1;
          values.iFileData = await fileAsBase64(formValues.iFiles[0].originFileObj);
          values.iMimeType = getFileType(formValues.iFiles[0]);
          values.iFileSize = formValues.iFiles[0].size;
          values.iFileName = formValues.iFiles[0].name;
        }
        (values as Partial<typeof values> & { iFiles: undefined }).iFiles = undefined;
        const newsObjectResponse = await PostJsonData<INewsItemProps>(
          saveUrl,
          {
            ...values,
            username: sessionModel.username,
            password: sessionModel.password
          },
          true,
          sessionModel.authorizationHeader
        );
        if (newsObjectResponse) {
          onChange?.(newsObjectResponse);
          onClose?.();
        }
        setSaving(false);
      } catch (e) {
        if (e && (e as { message: string }).message) message.error((e as { message: string }).message);
        setSaving(false);
      }
    },
    [
      clubModel.modules,
      onChange,
      onClose,
      sessionModel.authorizationHeader,
      sessionModel.password,
      sessionModel.username
    ]
  );

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
      style={{ top: 40 }}
      width={800}
      onOk={() => {
        form.validateFields().then(values => {
          onSave(values);
        });
      }}
      onCancel={onClose}
    >
      <StyledModalContent>
        <Form
          form={form}
          id={formId}
          layout="vertical"
          initialValues={{
            iNewsID: newsObject.id,
            iNewsTypeID: newsObject.newsTypeId,
            iRubrik: newsObject.header,
            iLank: newsObject.link,
            iInledning: newsObject.introduction,
            iTexten: newsObject.text,
            iExpireDate: newsObject.expireDate,
            iUpdateModificationDate: true,
            iFileID: newsObject.fileId,
            iFileData: null,
            iFiles:
              newsObject.fileId !== 0
                ? [
                    {
                      uid: newsObject.fileId?.toString(),
                      name: newsObject.fileName,
                      type: newsObject.fileType,
                      size: newsObject.fileSize,
                      status: 'done',
                      isOriginalFile: true
                    }
                  ]
                : []
          }}
          onValuesChange={() => hasErrors(form).then(notValid => setValid(!notValid))}
        >
          <FormItem name="iNewsID">
            <Input type="hidden" />
          </FormItem>
          <FormItem name="iNewsTypeID">
            <Select
              style={{ minWidth: 174 }}
              options={[
                { value: 1, label: t('modules.News') },
                { value: 2, label: t('news.LongTimeNews') },
                { value: 10, label: t('news.Banner') },
                { value: 3, label: t('news.Educations') }
              ]}
            />
          </FormItem>
          <FormItem
            name="iRubrik"
            label={t('news.Header')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'news.Header')
              }
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
                message: errorRequiredField(t, 'news.Introduction')
              }
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
                message: errorRequiredField(t, 'news.ExpireDate')
              }
            ]}
            normalize={(value: dayjs.Dayjs) => (value ? value.format(dateFormat) : null)}
            getValueProps={(value: string | undefined) => ({ value: value ? dayjs(value, dateFormat) : null })}
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
