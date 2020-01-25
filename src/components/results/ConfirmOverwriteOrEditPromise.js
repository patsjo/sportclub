import { Modal } from "antd";

const { confirm } = Modal;

export const ConfirmOverwriteOrEdit = t =>
  new Promise(resolve => {
    confirm({
      title: t("results.Step2EditRace"),
      okText: t("results.Overwrite"),
      cancelText: t("common.Edit"),
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      }
    });
  });
