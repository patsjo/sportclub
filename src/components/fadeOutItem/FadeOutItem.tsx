import { Button, message, Modal, Popconfirm } from 'antd';
import { observer } from 'mobx-react';
import { IModule } from 'models/mobxClubModel';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';

interface IItemProps {
  maxHeight?: number;
}
const ItemHolder = styled.div<IItemProps>`
  max-height: ${(props) => (props.maxHeight ? props.maxHeight : 300)}px;
  overflow: hidden;
  margin-bottom: 12px;
`;
const ItemFadeOut = styled.div<IItemProps>`
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  break-inside: avoid-column;
  max-height: ${(props) => (props.maxHeight ? props.maxHeight : 300)}px;
  overflow: hidden;
  padding-left: 0;
  padding-right: 0;
  position: relative;
  cursor: pointer;
  :after {
    content: '';
    position: absolute;
    top: ${(props) => (props.maxHeight ? props.maxHeight - 50 : 250)}px;
    right: 0;
    width: 100%;
    height: 50px;
    background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiP…dpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==);
    background-size: 100%;
    background-image: -webkit-gradient(
      linear,
      50% 0%,
      50% 100%,
      color-stop(0%, rgba(255, 255, 255, 0)),
      color-stop(80%, #ffffff),
      color-stop(100%, #ffffff)
    );
    background-image: -moz-linear-gradient(top, rgba(255, 255, 255, 0) 0%, #ffffff 80%, #ffffff 100%);
    background-image: -webkit-linear-gradient(top, rgba(255, 255, 255, 0) 0%, #ffffff 80%, #ffffff 100%);
    background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, #ffffff 80%, #ffffff 100%);
    pointer-events: none;
  }
`;

interface IContentProps {
  columns: number;
}
const StyledModalContent = styled.div<IContentProps>`
  -webkit-columns: ${(props) => props.columns} 200px;
  -moz-columns: ${(props) => props.columns} 200px;
  columns: ${(props) => props.columns} 200px;
  -webkit-column-gap: 1em;
  -moz-column-gap: 1em;
  column-gap: 1em;
  -webkit-column-rule: 1px dotted #ccc;
  -moz-column-rule: 1px dotted #ccc;
  column-rule: 1px dotted #ccc;
`;

interface IFadeOutItemProps {
  ref?: React.ForwardedRef<HTMLDivElement>;
  content: React.ReactNode;
  module: IModule;
  modalContent: React.ReactNode;
  modalColumns: number;
  editFormContent?: React.ReactElement;
  deletePromise?: () => Promise<void>;
  onDelete?: () => void;
  deleteAllPromise?: () => Promise<void>;
  onDeleteAll?: () => void;
  maxHeight?: number;
}
const FadeOutItem = observer(
  ({
    ref,
    content,
    module,
    modalContent,
    modalColumns,
    editFormContent,
    deletePromise,
    onDelete,
    deleteAllPromise,
    onDeleteAll,
    maxHeight,
  }: IFadeOutItemProps) => {
    const { sessionModel } = useMobxStore();
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [showModalItem, setShowModalItem] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    const openModal = () => {
      setShowModalItem(true);
    };

    const openEdit = () => {
      setShowModalItem(false);
      setShowEdit(true);
    };

    const closeModal = () => {
      setSaving(false);
      setShowModalItem(false);
      setShowEdit(false);
    };

    const ShowEditButton =
      editFormContent != null && module.updateUrl != null && sessionModel.loggedIn ? (
        <Button loading={saving} onClick={openEdit}>
          {t('common.Edit')}
        </Button>
      ) : null;

    const ShowDeleteButton =
      module.deleteUrl != null && deletePromise && sessionModel.loggedIn ? (
        <Popconfirm
          title={t('common.Confirm')}
          okText={t('common.Yes')}
          cancelText={t('common.No')}
          onConfirm={() => {
            setSaving(true);
            deletePromise()
              .then(() => {
                onDelete && onDelete();
                closeModal();
              })
              .catch((e) => {
                message.error(e.message);
                setSaving(false);
              });
          }}
        >
          <Button type="primary" danger={true} loading={saving}>
            {t('common.Delete')}
          </Button>
        </Popconfirm>
      ) : null;

    const ShowDeleteAllButton =
      module.deleteUrl != null && deleteAllPromise && sessionModel.loggedIn ? (
        <Popconfirm
          title={t('common.Confirm')}
          okText={t('common.Yes')}
          cancelText={t('common.No')}
          onConfirm={() => {
            setSaving(true);
            deleteAllPromise()
              .then(() => {
                onDeleteAll && onDeleteAll();
                closeModal();
              })
              .catch((e) => {
                message.error(e.message);
                setSaving(false);
              });
          }}
        >
          <Button type="primary" danger={true} loading={saving}>
            {t('common.DeleteAll')}
          </Button>
        </Popconfirm>
      ) : null;

    const EditFormContent =
      showEdit && editFormContent
        ? React.cloneElement(editFormContent, {
            open: showEdit,
            onClose: closeModal,
          })
        : null;

    return (
      <ItemHolder ref={ref} maxHeight={maxHeight}>
        <ItemFadeOut onClick={openModal} maxHeight={maxHeight}>
          {content}
        </ItemFadeOut>
        <Modal
          closable={false}
          maskClosable={false}
          open={showModalItem}
          onCancel={closeModal}
          width="calc(100% - 80px)"
          style={{ top: 40, minWidth: 560, maxWidth: 800 }}
          footer={[
            ShowDeleteAllButton,
            ShowDeleteButton,
            ShowEditButton,
            <Button type="primary" onClick={closeModal} loading={saving}>
              {t('common.Close')}
            </Button>,
          ]}
        >
          <StyledModalContent columns={modalColumns}>{modalContent}</StyledModalContent>
        </Modal>
        {EditFormContent}
      </ItemHolder>
    );
  }
);

export default FadeOutItem;
