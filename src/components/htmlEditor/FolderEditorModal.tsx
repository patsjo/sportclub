import { LinkOutlined } from '@ant-design/icons';
import { Form, Input, message, Modal, Select, Switch } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { ModalFuncProps } from 'antd/lib/modal';
import { TFunction } from 'i18next';
import { IGlobalStateModel } from 'models/globalStateModel';
import { IMobxClubModel } from 'models/mobxClubModel';
import { ISessionModel } from 'models/sessionModel';
import styled from 'styled-components';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors, IFile, maxByteSize } from '../../utils/formHelper';
import FormItem from '../formItems/FormItem';
import { ICouncilModel, IGroupModel, IUserModel } from 'models/userModel';
import { IFileResponse, IFolderResponse } from 'utils/responseInterfaces';
import UploadDragger from 'components/formItems/UploadDragger';
import { fileAsBase64, getFileType } from 'utils/fileHelper';

const { TextArea } = Input;
const { confirm } = Modal;
declare type ConfigUpdate = ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps);

const HelpText = styled.div`
  margin-top: 20px;
  font-style: italic;
`;

export const FolderEditorModal = async (
  t: TFunction,
  folderId: number,
  form: FormInstance<IFolderResponse>,
  globalStateModel: IGlobalStateModel,
  sessionModel: ISessionModel,
  clubModel: IMobxClubModel
): Promise<IFolderResponse | null | undefined> => {
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
    sessionModel.authorizationHeader
  )) as { users: IUserModel[]; groups: IGroupModel[]; councils: ICouncilModel[] };
  const foldersJson = (await PostJsonData(
    filesModule?.queryUrl,
    { iType: 'FOLDERS', username: sessionModel.username, password: sessionModel.password },
    true,
    sessionModel.authorizationHeader
  )) as IFolderResponse[];
  if (folderId >= 0) {
    const folderJson = foldersJson.find((folder) => folder.folderId === folderId);
    form && form.setFieldsValue(folderJson ?? {});
  } else {
    form &&
      form.setFieldsValue({
        folderId: -1,
        folderName: '',
        parentFolderId: 0,
        preStory: null,
        postStory: null,
        needPassword: false,
        allowedGroupId: 0,
      });
  }

  return await new Promise((resolve, reject) => {
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ConfigUpdate) => void;
    };

    // eslint-disable-next-line prefer-const
    confirmModal = confirm({
      title: folderId < 0 ? t('files.AddFolder') : t('files.EditFolder'),
      icon: <LinkOutlined />,
      content: (
        <Form
          form={form}
          id={formId}
          layout="vertical"
          initialValues={{
            folderId: -1,
            folderName: '',
            parentFolderId: 0,
            preStory: null,
            postStory: null,
            needPassword: false,
            allowedGroupId: 0,
          }}
          onValuesChange={async (changedValues: Partial<IFolderResponse>) =>
            hasErrors(form).then((notValid) =>
              confirmModal.update({
                okButtonProps: {
                  danger: notValid && folderId > 0,
                  disabled: folderId > 0 ? false : notValid,
                },
                okText: notValid && folderId > 0 ? t('common.Delete') : t('common.Save'),
              })
            )
          }
        >
          <FormItem name="folderId">
            <Input type="hidden" />
          </FormItem>
          <FormItem
            name="parentFolderId"
            label={t('files.Folder')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'files.Folder'),
              },
            ]}
          >
            <Select
              options={[{ folderId: 0, menuPath: '/' }, ...foldersJson].map((folder) => ({
                value: folder.folderId,
                label: folder.menuPath,
              }))}
            />
          </FormItem>
          <FormItem
            name="folderName"
            label={t('files.FolderName')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'files.FolderName'),
              },
            ]}
          >
            <Input />
          </FormItem>
          <FormItem name="preStory" label={t('files.PreStory')}>
            <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </FormItem>
          <FormItem name="postStory" label={t('files.PostStory')}>
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
          {folderId > 0 ? <HelpText>{t('htmlEditor.MenuLinkHelpText')}</HelpText> : null}
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
          const saveUrl = folderId < 0 ? filesModule?.addUrl : filesModule?.updateUrl;

          confirmModal.update({
            okButtonProps: {
              loading: true,
            },
          });

          if (notValid && folderId > 0) {
            PostJsonData(
              deleteUrl,
              {
                iType: 'FOLDER',
                folderId: folderId,
                username: sessionModel.username,
                password: sessionModel.password,
              },
              true,
              sessionModel.authorizationHeader
            )
              .then(() => {
                globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, message);
                resolve(null);
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
                  iType: 'FOLDER',
                  username: sessionModel.username,
                  password: sessionModel.password,
                },
                true,
                sessionModel.authorizationHeader
              )
                .then((folderResponse: IFolderResponse) => {
                  globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, message);
                  resolve(folderResponse);
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
};
