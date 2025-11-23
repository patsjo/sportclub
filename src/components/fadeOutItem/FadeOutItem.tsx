import { Button, message, Modal, Popconfirm } from 'antd';
import { observer } from 'mobx-react';
import { IModule } from '../../models/mobxClubModel';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { useSize } from '../../utils/useSize';

interface IItemProps {
  maxHeight?: number;
}
const ItemHolder = styled.div<IItemProps & { paddingBottom: number }>`
  max-height: ${({ maxHeight, paddingBottom }) => (maxHeight ? maxHeight : 300) + paddingBottom}px;
  overflow: hidden;
  padding-bottom: ${({ paddingBottom }) => paddingBottom}px;
`;
const ItemFadeOut = styled.div<IItemProps & { height: number | undefined }>`
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  break-inside: avoid-column;
  max-height: ${({ maxHeight }) => (maxHeight ? maxHeight : 300)}px;
  overflow: hidden;
  padding-left: 0;
  padding-right: 0;
  position: relative;
  cursor: pointer;
  ${({ maxHeight, height }) =>
    height != null &&
    height > (maxHeight ? maxHeight : 300) &&
    `
  -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 70px), transparent);
  mask-image: linear-gradient(to bottom, black calc(100% - 70px), transparent);
  `}
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
  paddingBottom?: number;
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
    paddingBottom = 24,
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
    const fadeOutRef = useRef<HTMLDivElement>(null);
    const { height } = useSize(fadeOutRef, ['height'], 'client');

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
      <ItemHolder ref={ref} maxHeight={maxHeight} paddingBottom={paddingBottom}>
        <ItemFadeOut
          onClick={openModal}
          maxHeight={maxHeight}
          height={height != null ? height - paddingBottom : undefined}
        >
          <div ref={fadeOutRef}>{content}</div>
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
  },
);

export default FadeOutItem;
