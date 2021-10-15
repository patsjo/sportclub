import { CopyOutlined } from '@ant-design/icons';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { StickyPanelView } from '@ckeditor/ckeditor5-ui';
import { Alert, Button, Form, Input, message, Popconfirm, Select, Spin } from 'antd';
import copy from 'copy-to-clipboard';
import { observer } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { IHtmlPageGroupResponse, IHtmlPageResponse } from 'utils/responseInterfaces';
import { PostJsonData } from '../../utils/api';
import { errorRequiredField, hasErrors } from '../../utils/formHelper';
import { getPageId } from '../../utils/htmlEditorMenuHelper';
import FormItem from '../formItems/FormItem';
import { SpinnerDiv } from '../styled/styled';
import ClassicEditor, { ckEditorConfig } from './ckeditor';
import './ckeditor5.css';

const DefaultData = '<p>Här lägger man in all text och bilder</p>';
export const DefaultMenuPath = '/Exempel/Sida1';
const Option = Select.Option;

const StyledButton = styled(Button)`
  &&& {
    margin-right: 8px;
  }
`;

const StyledCKEditor = styled(CKEditor)`
  &&& {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  &&& .ck.ck-toolbar {
    ${(props) => (props.isReadOnly ? 'display: none;' : '')}
  }
`;

interface IHtmlEditorProps {
  path: string;
}
const HtmlEditor = observer(({ path }: IHtmlEditorProps) => {
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const { t } = useTranslation();
  const [currentEditor, setCurrentEditor] = useState<ClassicEditor>();
  const [pageId, setPageId] = useState(-1);
  const [error, setError] = useState<string | undefined>();
  const [isReadOnly, setIsReadOnly] = useState(path !== '/page/new');
  const [isEditable, setEditable] = useState(path === '/page/new');
  const [form] = Form.useForm();
  const [data, setData] = useState(DefaultData);
  const [menuPath, setMenuPath] = useState(DefaultMenuPath);
  const [groups, setGroups] = useState<IHtmlPageGroupResponse[]>([]);
  const [valid, setValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(path !== '/page/new');
  const formId = 'htmlEditorForm' + Math.floor(Math.random() * 1000000000000000);
  const htmlEditorModule = clubModel.modules.find((module) => module.name === 'HTMLEditor');
  const toolbarContainer = useRef<StickyPanelView>();
  const history = useHistory();

  useEffect(() => {
    if (currentEditor) {
      currentEditor.isReadOnly = isReadOnly;
    }
  }, [currentEditor, isReadOnly]);

  useEffect(() => {
    setError(undefined);
    if (path === '/page/new' || globalStateModel.htmlEditorMenu === undefined || !htmlEditorModule) {
      setPageId(-1);
      setData(DefaultData);
      setMenuPath(DefaultMenuPath);
      setGroups([]);
      setEditable(true);
      setIsReadOnly(false);
      form.setFieldsValue({
        iPageID: -1,
        iMenuPath: DefaultMenuPath,
        iGroupIds: [],
      });
      return;
    }
    setLoading(true);
    setEditable(false);
    setIsReadOnly(true);
    const pageId = globalStateModel.htmlEditorMenu && getPageId(getSnapshot(globalStateModel.htmlEditorMenu)!, path);
    if (!pageId) {
      setError('404 - Page not found');
      setLoading(false);
      return;
    }
    PostJsonData(
      htmlEditorModule.queryUrl,
      {
        iType: 'PAGE',
        iPageID: pageId,
        username: sessionModel.username,
        password: sessionModel.password,
      },
      true,
      sessionModel.authorizationHeader
    )
      .then((pageResponse: IHtmlPageResponse) => {
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
          iGroupIds: pageResponse.groups.filter((group) => group.selected).map((group) => group.groupId),
        });
        setLoading(false);
      })
      .catch((e) => {
        setLoading(false);
        setError(e.message);
      });
  }, [
    htmlEditorModule?.queryUrl,
    sessionModel.authorizationHeader,
    sessionModel.username,
    sessionModel.password,
    globalStateModel.htmlEditorMenu,
    path,
    form,
  ]);

  useEffect(() => {
    if (currentEditor && toolbarContainer.current) {
      try {
        if (isReadOnly) {
          currentEditor.ui.view.top.remove(toolbarContainer.current as any);
        } else {
          currentEditor.ui.view.top.add(toolbarContainer.current as any);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [currentEditor, isReadOnly]);

  const onSave = useCallback(() => {
    if (!valid || !currentEditor) {
      return;
    }
    const htmlData = currentEditor.getData();
    const saveUrl = pageId < 0 ? htmlEditorModule?.addUrl : htmlEditorModule?.updateUrl;

    setSaving(true);
    form.validateFields().then((values) => {
      PostJsonData(
        saveUrl,
        {
          ...values,
          iData: htmlData,
          iPageID: pageId,
          iGroupIds: values.iGroupIds,
          username: sessionModel.username,
          password: sessionModel.password,
        },
        true,
        sessionModel.authorizationHeader
      )
        .then((pageResponse) => {
          setPageId(pageResponse.pageId);
          setData(htmlData);
          setSaving(false);
          htmlEditorModule && globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, sessionModel, message);
        })
        .catch((e) => {
          message.error(e.message);
          setSaving(false);
        });
    });
  }, [globalStateModel, sessionModel, htmlEditorModule, currentEditor, form, pageId, valid]);

  return loading || saving ? (
    <SpinnerDiv>
      <Spin size="large" />
    </SpinnerDiv>
  ) : error ? (
    <Alert message="Error" description={error} type="error" showIcon />
  ) : (
    <>
      {!isReadOnly ? (
        <Form
          form={form}
          id={formId}
          layout="vertical"
          initialValues={{
            iPageID: pageId,
            iMenuPath: menuPath,
            iGroupIds: groups.filter((group) => group.selected).map((group) => group.groupId),
          }}
          onValuesChange={() => hasErrors(form).then((notValid) => setValid(!notValid))}
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
                message: errorRequiredField(t, 'htmlEditor.Path'),
              },
            ]}
          >
            <Input />
          </FormItem>
          <FormItem name="iGroupIds" label={t('htmlEditor.Groups')}>
            <Select mode="multiple" allowClear style={{ minWidth: 174 }}>
              {groups.map((group) => (
                <Option value={group.groupId}>{group.description}</Option>
              ))}
            </Select>
          </FormItem>
        </Form>
      ) : null}
      <StyledCKEditor
        editor={ClassicEditor}
        isReadOnly={isReadOnly}
        config={ckEditorConfig}
        data={data}
        onReady={(editor: ClassicEditor) => {
          toolbarContainer.current = editor.ui.view.stickyPanel;
          setCurrentEditor(editor);
        }}
      />
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
            <StyledButton onClick={() => setIsReadOnly(true)} loading={saving}>
              {t('common.Cancel')}
            </StyledButton>
          ) : null}
          <StyledButton type="primary" onClick={onSave} loading={saving}>
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
                  password: sessionModel.password,
                },
                true,
                sessionModel.authorizationHeader
              )
                .then(() => {
                  globalStateModel.setDashboard(history, '/');
                })
                .catch((e) => {
                  message.error(e.message);
                  setSaving(false);
                });
            }}
          >
            <StyledButton type="primary" danger={true} loading={saving}>
              {t('common.Delete')}
            </StyledButton>
          </Popconfirm>
          <StyledButton onClick={() => setIsReadOnly(false)} loading={saving}>
            {t('common.Edit')}
          </StyledButton>
        </>
      ) : null}
    </>
  );
});

export default HtmlEditor;
