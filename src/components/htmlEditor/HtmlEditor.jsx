import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { observer, inject } from 'mobx-react';
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor, { ckEditorConfig } from './ckeditor';
import styled from 'styled-components';
import { Button, Form, Input, Popconfirm, Select, Spin, message } from 'antd';
import { PostJsonData } from '../../utils/api';
import { SpinnerDiv } from '../styled/styled';
import FormItem from '../formItems/FormItem';
import { hasErrors, errorRequiredField } from '../../utils/formHelper';
import { getPageId } from '../../utils/htmlEditorMenuHelper';
import { CopyOutlined } from '@ant-design/icons';
import copy from 'copy-to-clipboard';
import { useHistory } from 'react-router-dom';
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

const HtmlEditor = inject(
  'clubModel',
  'globalStateModel',
  'sessionModel'
)(
  observer(({ clubModel, globalStateModel, sessionModel, path }) => {
    const { t } = useTranslation();
    const [currentEditor, setCurrentEditor] = useState();
    const [pageId, setPageId] = useState();
    const [isReadOnly, setIsReadOnly] = useState(path !== '/page/new');
    const [isEditable, setEditable] = useState(path === '/page/new');
    const [form] = Form.useForm();
    const [data, setData] = useState(DefaultData);
    const [menuPath, setMenuPath] = useState(DefaultMenuPath);
    const [groups, setGroups] = useState([]);
    const [valid, setValid] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(path !== '/page/new');
    const formId = 'htmlEditorForm' + Math.floor(Math.random() * 10000000000000000);
    const htmlEditorModule = clubModel.modules.find((module) => module.name === 'HTMLEditor');
    const toolbarContainer = useRef();
    const history = useHistory();

    useEffect(() => {
      if (currentEditor) {
        currentEditor.isReadOnly = isReadOnly;
      }
    }, [currentEditor, isReadOnly]);

    useEffect(() => {
      if (path === '/page/new' || globalStateModel.htmlEditorMenu === undefined) {
        return;
      }
      setLoading(true);
      setEditable(false);
      setIsReadOnly(true);
      const pageId = getPageId(globalStateModel.htmlEditorMenu.toJSON(), path);
      if (!pageId) {
        message.error('Page not found');
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
        .then((pageResponse) => {
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
          message.error(e.message);
          setLoading(false);
        });
    }, [
      htmlEditorModule.queryUrl,
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
            currentEditor.ui.view.top.remove(toolbarContainer.current);
          } else {
            currentEditor.ui.view.top.add(toolbarContainer.current);
          }
        } catch (e) {}
      }
    }, [currentEditor, isReadOnly]);

    const onSave = useCallback(() => {
      if (!valid || !currentEditor) {
        return;
      }
      const htmlData = currentEditor.getData();
      const saveUrl = pageId < 0 ? htmlEditorModule.addUrl : htmlEditorModule.updateUrl;

      setSaving(true);
      form.validateFields().then((values) => {
        values.iData = new Blob([htmlData], { type: 'text/plain', lastModified: new Date(0) });
        values.iData.name = 'data.html';
        PostJsonData(
          saveUrl,
          {
            ...values,
            iPageID: pageId,
            iGroupIds: JSON.stringify(values.iGroupIds),
            username: sessionModel.username,
            password: sessionModel.password,
            jsonResponse: true,
          },
          true,
          sessionModel.authorizationHeader
        )
          .then((pageResponse) => {
            setPageId(pageResponse.pageId);
            setData(htmlData);
            setSaving(false);
            globalStateModel.fetchHtmlEditorMenu(htmlEditorModule, sessionModel, message);
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
          onInit={(editor) => {
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
            <StyledButton onClick={() => setIsReadOnly(true)} loading={saving}>
              {t('common.Cancel')}
            </StyledButton>
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
                  htmlEditorModule.deleteUrl,
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
              <StyledButton type="danger" loading={saving}>
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
  })
);

export default HtmlEditor;
