import { HookAPI } from 'antd/lib/modal/useModal';
import { TFunction } from 'i18next';

export const ConfirmOverwriteOrEdit = (t: TFunction, modal: HookAPI): Promise<boolean> =>
  new Promise(resolve => {
    modal.confirm({
      title: t('results.Step2EditRace'),
      okText: t('results.Overwrite'),
      cancelText: t('common.Edit'),
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      }
    });
  });
