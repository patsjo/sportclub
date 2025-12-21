import { CopyOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, message, Popconfirm, Select, Spin } from 'antd';
import { ClassicEditor } from 'ckeditor5';
import copy from 'copy-to-clipboard';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { ICouncilModel, IGroupModel, IUserModel } from '../../models/userModel';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors } from '../../utils/formHelper';
import { getPageId } from '../../utils/htmlEditorMenuHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { IHtmlPageGroupResponse, IHtmlPageResponse } from '../../utils/responseInterfaces';
import FormItem from '../formItems/FormItem';
import { SpinnerDiv } from '../styled/styled';
import CustomCKEditor from './CustomCKEditor';

const DefaultData = '<p>Här lägger man in all text och bilder</p>';
export const DefaultMenuPath = '/Exempel/Sida1';

const StyledButton = styled(Button)`
  &&& {
    margin-right: 8px;
  }
`;

const StyledContainer = styled.div``;

interface IHtmlEditorFormProps {
  iPageID: number;
  iMenuPath: string;
  iGroupIds: number[];
}

const HtmlEditor = observer(() => {
  const [messageApi, contextHolder] = message.useMessage();
  const location = useLocation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [pageId, setPageId] = useState(-1);
  const pageIdFromLocation = useMemo(
    () =>
      location.pathname === '/page/new'
        ? -1
        : globalStateModel.htmlEditorMenu
          ? (getPageId(globalStateModel.htmlEditorMenu, decodeURI(location.pathname)) ?? -1000)
          : undefined,
    [globalStateModel.htmlEditorMenu, location.pathname]
  );
  const [error, setError] = useState<string | undefined>();
  const [isReadOnly, setIsReadOnly] = useState(location.pathname !== '/page/new');
  const [isEditable, setEditable] = useState(location.pathname === '/page/new');
  const [form] = Form.useForm<IHtmlEditorFormProps>();
  const [data, setData] = useState(DefaultData);
  const [menuPath, setMenuPath] = useState(DefaultMenuPath);
  const [groups, setGroups] = useState<IHtmlPageGroupResponse[]>([]);
  const [valid, setValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const formId = useMemo(() => 'htmlEditorForm' + Math.floor(Math.random() * 1000000000000000), []);
  const htmlEditorModule = clubModel.modules.find(module => module.name === 'HTMLEditor');
  const filesModule = clubModel.modules.find(module => module.name === 'Files');
  const navigate = useNavigate();
  const [currentEditor, setCurrentEditor] = useState<ClassicEditor>();

  useEffect(() => {
    if (pageIdFromLocation === undefined) return;
    else if (pageIdFromLocation === -1000) {
      setError('404 - Page not found');
      setLoading(false);
      return;
    }

    setError(undefined);
    setLoading(true);
    if (location.pathname === '/page/new' || !htmlEditorModule) {
      setPageId(-1);
      setData(DefaultData);
      setMenuPath(DefaultMenuPath);
      setEditable(true);
      setIsReadOnly(false);
      form.setFieldsValue({
        iPageID: -1,
        iMenuPath: DefaultMenuPath,
        iGroupIds: []
      });
      const url = clubModel.modules.find(module => module.name === 'Users')?.queryUrl;

      PostJsonData<{ users: IUserModel[]; groups: IGroupModel[]; councils: ICouncilModel[] }>(
        url,
        {},
        true,
        sessionModel.authorizationHeader
      )
        .then(data => {
          setLoading(false);
          if (data) setGroups(data.groups.map(g => ({ ...g, selected: false })));
        })
        .catch(e => {
          setLoading(false);
          setError(e.message);
        });
      return;
    }
    setEditable(false);
    setIsReadOnly(true);
    PostJsonData<IHtmlPageResponse>(
      htmlEditorModule.queryUrl,
      {
        iType: 'PAGE',
        iPageID: pageIdFromLocation,
        username: sessionModel.username,
        password: sessionModel.password
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(pageResponse => {
        setLoading(false);
        if (pageResponse) {
          setPageId(pageResponse.pageId);
          if (pageResponse.pageId > 0) {
            setData(pageResponse.data);
            setMenuPath(pageResponse.menuPath);
          } else {
            setData(DefaultData);
            setMenuPath(DefaultMenuPath);
          }
          setGroups(pageResponse.groups);
          setEditable(pageResponse.isEditable);
          form.setFieldsValue({
            iPageID: pageResponse.pageId,
            iMenuPath: pageResponse.pageId > 0 ? pageResponse.menuPath : DefaultMenuPath,
            iGroupIds: pageResponse.groups.filter(group => group.selected).map(group => group.groupId)
          });
        }
      })
      .catch(e => {
        setLoading(false);
        setError(e.message);
      });
  }, [
    htmlEditorModule?.queryUrl,
    sessionModel.authorizationHeader,
    sessionModel.username,
    sessionModel.password,
    location.pathname,
    pageIdFromLocation,
    form,
    htmlEditorModule,
    clubModel.modules
  ]);

  const onSave = useCallback(() => {
    if (!valid || !currentEditor) {
      return;
    }
    const htmlData = currentEditor.getData();
    const saveUrl = pageId < 0 ? htmlEditorModule?.addUrl : htmlEditorModule?.updateUrl;

    setSaving(true);
    form.validateFields().then(values => {
      PostJsonData<{ iPageID: number }>(
        saveUrl,
        {
          ...values,
          iData: htmlData,
          iPageID: pageId,
          iGroupIds: values.iGroupIds,
          username: sessionModel.username,
          password: sessionModel.password
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(pageResponse => {
          setSaving(false);
          if (pageResponse) {
            setPageId(pageResponse.iPageID);
            setData(htmlData);
            globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, messageApi);
            if (values.iMenuPath !== location.pathname) navigate(values.iMenuPath, { replace: true });
          }
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setSaving(false);
        });
    });
  }, [
    valid,
    currentEditor,
    pageId,
    htmlEditorModule,
    form,
    sessionModel,
    globalStateModel,
    filesModule,
    messageApi,
    location.pathname,
    navigate
  ]);

  return (
    <>
      {loading || saving ? (
        <SpinnerDiv>
          <Spin size="large" />
        </SpinnerDiv>
      ) : error ? (
        <Alert showIcon message="Error" description={error} type="error" />
      ) : (
        <StyledContainer>
          {!isReadOnly ? (
            <Form
              form={form}
              id={formId}
              layout="vertical"
              initialValues={{
                iPageID: pageId,
                iMenuPath: menuPath,
                iGroupIds: groups.filter(group => group.selected).map(group => group.groupId)
              }}
              onValuesChange={() => hasErrors(form).then(notValid => setValid(!notValid))}
            >
              <FormItem name="iPageID">
                <Input type="hidden" />
              </FormItem>
              <FormItem
                name="iMenuPath"
                label={t('htmlEditor.Path')}
                rules={[
                  {
                    required: true,
                    message: errorRequiredField(t, 'htmlEditor.Path')
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
                    }
                  }
                ]}
              >
                <Input />
              </FormItem>
              <FormItem name="iGroupIds" label={t('htmlEditor.Groups')}>
                <Select
                  allowClear
                  mode="multiple"
                  style={{ minWidth: 174 }}
                  options={groups.map(group => ({ value: group.groupId, label: group.description }))}
                />
              </FormItem>
            </Form>
          ) : null}
          <CustomCKEditor isReadOnly={isReadOnly} data={data} onReady={setCurrentEditor} />
          {pageId > 0 ? (
            <StyledButton
              icon={<CopyOutlined />}
              onClick={() => {
                copy(`${window.location.origin}/${menuPath.startsWith('/') ? menuPath.substr(1) : menuPath}`);
                message.success(
                  `${t('htmlEditor.CopyUrl')}: ${window.location.origin}/${
                    menuPath.startsWith('/') ? menuPath.substr(1) : menuPath
                  }`
                );
              }}
            >
              {t('htmlEditor.CopyUrl')}
            </StyledButton>
          ) : null}
          {!isReadOnly ? (
            <>
              {pageId > 0 ? (
                <StyledButton loading={saving} onClick={() => setIsReadOnly(true)}>
                  {t('common.Cancel')}
                </StyledButton>
              ) : null}
              <StyledButton type="primary" loading={saving} disabled={!valid} onClick={onSave}>
                {t('common.Save')}
              </StyledButton>
            </>
          ) : pageId > 0 && (sessionModel.isAdmin || isEditable) ? (
            <>
              <Popconfirm
                title={t('common.Confirm')}
                okText={t('common.Yes')}
                cancelText={t('common.No')}
                onConfirm={() => {
                  setSaving(true);
                  PostJsonData(
                    htmlEditorModule?.deleteUrl,
                    {
                      iPageID: pageId,
                      username: sessionModel.username,
                      password: sessionModel.password
                    },
                    true,
                    sessionModel.authorizationHeader
                  )
                    .then(() => {
                      globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, filesModule, sessionModel, messageApi);
                      navigate('/', { replace: true });
                    })
                    .catch(e => {
                      if (e?.message) message.error(e.message);
                      setSaving(false);
                    });
                }}
              >
                <StyledButton type="primary" danger={true} loading={saving}>
                  {t('common.Delete')}
                </StyledButton>
              </Popconfirm>
              <StyledButton loading={saving} onClick={() => setIsReadOnly(false)}>
                {t('common.Edit')}
              </StyledButton>
            </>
          ) : null}
        </StyledContainer>
      )}
      {contextHolder}
    </>
  );
});

export default HtmlEditor;
