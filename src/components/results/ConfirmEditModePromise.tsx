import { CloudDownloadOutlined, EditOutlined, FileDoneOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';
import { TFunction } from 'i18next';

/** How a race that is already saved is opened */
export type EditMode = 'edit' | 'overwrite' | 'autoComplete';

/** The choice of how a saved race is opened, undefined when the dialog is closed */
export const ConfirmEditMode = (
  t: TFunction,
  modal: ReturnType<typeof Modal.useModal>[0]
): Promise<EditMode | undefined> =>
  new Promise(resolve => {
    let resolved = false;
    const choose = (mode: EditMode | undefined) => {
      if (resolved) return;
      resolved = true;
      resolve(mode);
      instance.destroy();
    };
    const instance = modal.confirm({
      title: t('results.Step2EditRace'),
      width: 560,
      closable: true,
      maskClosable: true,
      content: (
        <Space orientation="vertical" size={4}>
          <Typography.Text>
            <b>{t('common.Edit')}:</b> {t('results.EditModeEditDescription')}
          </Typography.Text>
          <Typography.Text>
            <b>{t('results.AutoComplete')}:</b> {t('results.EditModeAutoCompleteDescription')}
          </Typography.Text>
          <Typography.Text>
            <b>{t('results.Overwrite')}:</b> {t('results.EditModeOverwriteDescription')}
          </Typography.Text>
        </Space>
      ),
      footer: (
        <Space wrap style={{ marginTop: 12, width: '100%', justifyContent: 'flex-end' }}>
          <Button icon={<EditOutlined />} onClick={() => choose('edit')}>
            {t('common.Edit')}
          </Button>
          <Button icon={<FileDoneOutlined />} type="primary" onClick={() => choose('autoComplete')}>
            {t('results.AutoComplete')}
          </Button>
          <Button icon={<CloudDownloadOutlined />} onClick={() => choose('overwrite')}>
            {t('results.Overwrite')}
          </Button>
        </Space>
      ),
      onCancel() {
        choose(undefined);
      },
      afterClose() {
        choose(undefined);
      }
    });
  });
