import { Modal } from 'antd';
import { TFunction } from 'i18next';

const { confirm } = Modal;

export const ConfirmOverwriteOrEdit = (t: TFunction): Promise<boolean> =>
  new Promise((resolve) => {
    confirm({
      title: t('results.Step2EditRace'),
      okText: t('results.Overwrite'),
      cancelText: t('common.Edit'),
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      },
    });
  });
