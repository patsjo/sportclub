import { LinkOutlined } from '@ant-design/icons';
import { Form, Input, Modal, Select, Switch } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { ModalFuncProps } from 'antd/lib/modal';
import { TFunction } from 'i18next';
import { IGlobalStateModel } from '../../models/globalStateModel';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { ISessionModel } from '../../models/sessionModel';
import styled from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors, IFile, maxByteSize } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import { ICouncilModel, IGroupModel, IUserModel } from '../../models/userModel';
import { IFileResponse, IFolderResponse } from '../../utils/responseInterfaces';
import UploadDragger from '../formItems/UploadDragger';
import { fileAsBase64, getFileType } from '../../utils/fileHelper';
import { MessageInstance } from 'antd/lib/message/interface';

const { TextArea } = Input;
const { confirm } = Modal;
declare type ConfigUpdate = ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps);

const HelpText = styled.div`
  margin-top: 20px;
  font-style: italic;
`;

export const FileEditorModal = async (
  t: TFunction,
  fileId: number,
  form: FormInstance<
    IFileResponse & { files: IFile[]; fileData?: string | null; mimeType?: string | null; fileSize?: number }
  >,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel,
  messageApi: MessageInstance,
): Promise<IFileResponse | null | undefined> => {
  const formId = 'fileEditorForm' + Math.floor(Math.random() * 1000000000000000);
  const filesModule = clubModel.modules.find((module) => module.name === 'Files');
  const usersModule = clubModel.modules.find((module) => module.name === 'Users');
  if (!filesModule?.queryUrl || !usersModule?.queryUrl) {
    return;
  }
  const usersJson = (await PostJsonData(
    usersModule?.queryUrl,
    { username: sessionModel.username, password: sessionModel.password },
    true,
    sessionModel.authorizationHeader,
  )) as { users: IUserModel[]; groups: IGroupModel[]; councils: ICouncilModel[] };
  const foldersJson = (await PostJsonData(
    filesModule?.queryUrl,
    { iType: 'FOLDERS', username: sessionModel.username, password: sessionModel.password },
    true,
    sessionModel.authorizationHeader,
  )) as IFolderResponse[];
  if (fileId >= 0) {
    const fileJson = (await PostJsonData(
      filesModule?.queryUrl,
      { iType: 'FILE', fileId: fileId, username: sessionModel.username, password: sessionModel.password },
      true,
      sessionModel.authorizationHeader,
    )) as IFileResponse;
    form && form.setFieldsValue({ ...fileJson, files: [] });
  } else {
    form &&
      form.setFieldsValue({
        fileId: -1,
        fileName: null,
        folderId: undefined,
        story: null,
        needPassword: false,
        allowedGroupId: 0,
        orderField: 0,
        files: [],
      });
  }
  return await new Promise((resolve, reject) => {
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ConfigUpdate) => void;
    };

    // eslint-disable-next-line prefer-const
    confirmModal = confirm({
      title: fileId < 0 ? t('files.UploadFile') : t('files.EditFile'),
      icon: <LinkOutlined />,
      content: (
        <Form
          form={form}
          id={formId}
          layout="vertical"
          initialValues={{
            fileId: fileId,
            fileName: null,
            folderId: null,
            story: null,
            needPassword: false,
            allowedGroupId: 0,
            orderField: null,
            files: [],
          }}
          onValuesChange={async (changedValues: Partial<IFileResponse & { files: IFile[] }>) =>
            hasErrors(form).then((notValid) =>
              confirmModal.update({
                okButtonProps: {
                  danger: notValid && fileId > 0,
                  disabled: fileId > 0 ? false : notValid,
                },
                okText: notValid && fileId > 0 ? t('common.Delete') : t('common.Save'),
              }),
            )
          }
        >
          <FormItem name="fileId">
            <Input type="hidden" />
          </FormItem>
          <FormItem
            name="folderId"
            label={t('files.Folder')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'files.Folder'),
              },
            ]}
          >
            <Select options={foldersJson.map((folder) => ({ value: folder.folderId, label: folder.menuPath }))} />
          </FormItem>
          <FormItem
            name="fileName"
            label={t('files.FileName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'files.FileName'),
              },
            ]}
          >
            <Input />
          </FormItem>
          <FormItem name="story" label={t('files.Story')}>
            <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </FormItem>
          <FormItem name="needPassword" label={t('files.NeedPassword')} valuePropName="checked">
            <Switch />
          </FormItem>
          <FormItem name="allowedGroupId" label={t('files.AllowedGroup')}>
            <Select
              options={[{ groupId: 0, description: `[${t('common.All')}]` }, ...usersJson.groups].map((group) => ({
                value: group.groupId,
                label: group.description,
              }))}
            />
          </FormItem>
          <FormItem name="orderField">
            <Input type="hidden" />
          </FormItem>
          {fileId < 0 ? (
            <>
              <UploadDragger
                form={form}
                fieldName="files"
                maxByteSize={maxByteSize}
                multiple={false}
                onChange={async (files) => {
                  if (files?.length && files[0].originFileObj) {
                    const fileData = await fileAsBase64(files[0].originFileObj);
                    form.setFieldsValue({
                      fileData,
                      mimeType: getFileType(files[0]),
                      fileSize: files[0].size,
                      fileName: files[0].name,
                    });
                  } else {
                    form.setFieldsValue({ fileData: null, mimeType: undefined, fileSize: undefined, fileName: null });
                  }
                }}
              />
              <FormItem name="mimeType">
                <Input type="hidden" />
              </FormItem>
              <FormItem name="fileSize">
                <Input type="hidden" />
              </FormItem>
              <FormItem
                name="fileData"
                rules={[
                  {
                    required: true,
                    message: t('files.FileIsRequired') ?? undefined,
                  },
                ]}
              >
                <Input type="hidden" />
              </FormItem>
            </>
          ) : (
            <HelpText>{t('htmlEditor.MenuLinkHelpText')}</HelpText>
          )}
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
          const filesModule = clubModel.modules.find((module) => module.name === 'Files');
          const deleteUrl = filesModule?.deleteUrl;
          const saveUrl = fileId < 0 ? filesModule?.addUrl : filesModule?.updateUrl;

          confirmModal.update({
            okButtonProps: {
              loading: true,
            },
          });

          if (notValid && fileId > 0) {
            PostJsonData(
              deleteUrl,
              {
                iType: 'FILE',
                fileId: fileId,
                username: sessionModel.username,
                password: sessionModel.password,
              },
              true,
              sessionModel.authorizationHeader,
            )
              .then(() => {
                globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, messageApi);
                resolve(null);
              })
              .catch((e) => {
                messageApi.error(e.message);
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
                  iType: 'FILE',
                  fileId: values.fileId,
                  folderId: values.folderId,
                  fileName: values.fileName,
                  story: values.story,
                  needPassword: values.needPassword,
                  allowedGroupId: values.allowedGroupId,
                  fileData: values.fileData,
                  fileSize: values.fileSize,
                  mimeType: values.mimeType,
                  orderField: values.orderField,
                  username: sessionModel.username,
                  password: sessionModel.password,
                },
                true,
                sessionModel.authorizationHeader,
              )
                .then((fileResponse: IFileResponse) => {
                  globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, messageApi);
                  resolve(fileResponse);
                })
                .catch((e) => {
                  messageApi.error(e.message);
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
};
