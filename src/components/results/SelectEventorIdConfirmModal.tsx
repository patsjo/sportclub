import { Form, InputNumber, Modal } from 'antd';
import { ModalFuncProps } from 'antd/lib/modal';
import { TFunction } from 'i18next';
import FormItem from '../formItems/FormItem';

const { confirm } = Modal;

export const SelectEventorIdConfirmModal = (t: TFunction): Promise<number | undefined> =>
  new Promise((resolve) => {
    let confirmObject: number | undefined;
    let confirmModal: {
      destroy: () => void;
      update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
    };
    // eslint-disable-next-line prefer-const
    confirmModal = confirm({
      title: t('results.KnownEventorId'),
      content: (
        <Form
          id={'selectEventorId' + Math.floor(Math.random() * 1000000000000000)}
          layout="vertical"
          initialValues={{
            iEventorId: undefined,
          }}
        >
          <FormItem name="iEventorId" label="Event Id">
            <InputNumber
              onChange={(value) => {
                confirmObject = (value ?? undefined) as number | undefined;
                confirmModal.update({
                  okButtonProps: {
                    disabled: confirmObject == null,
                  },
                });
              }}
            />
          </FormItem>
        </Form>
      ),
      okText: t('common.Next'),
      okButtonProps: {
        disabled: true,
      },
      cancelText: t('common.Cancel'),
      onOk() {
        resolve(confirmObject);
      },
      onCancel() {
        resolve(undefined);
      },
    });
  });
