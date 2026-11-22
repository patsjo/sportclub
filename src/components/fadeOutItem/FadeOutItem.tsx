import { Button, message, Popconfirm } from 'antd';
import { observer } from 'mobx-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IModule } from '../../models/mobxClubModel';
import { SocialTargetType } from '../../models/socialModel';
import { useMobxStore } from '../../utils/mobxStore';
import { useIsMobile } from '../../utils/useIsMobile';
import { useSize } from '../../utils/useSize';
import SocialBar from '../social/SocialBar';
import SocialSection from '../social/SocialSection';
import { ScrollBodyModal } from '../styled/ScrollBodyModal';

interface IItemProps {
  maxHeight?: number;
}
const ItemHolder = styled.div<IItemProps & { paddingBottom: number; extraHeight: number }>`
  max-height: ${({ maxHeight, paddingBottom, extraHeight }) => (maxHeight ? maxHeight : 300) + paddingBottom + extraHeight}px;
  overflow: hidden;
  padding-bottom: ${({ paddingBottom }) => paddingBottom}px;
`;
const ItemFadeOut = styled.div<IItemProps & { height: number | undefined }>`
  break-inside: avoid;
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
  mask-image: linear-gradient(to bottom, black calc(100% - 70px), transparent);
  `}
`;

interface IContentProps {
  columns: number;
}
const StyledModalContent = styled.div<IContentProps>`
  columns: ${props => props.columns} 200px;
  column-gap: 1em;
  column-rule: 1px dotted #ccc;
`;

export interface IFadeOutItemSocial {
  targetType: SocialTargetType;
  targetId: string | number;
  /** On the card: full = always the buttons, compact = only when someone has reacted, none = only in the modal */
  card?: 'full' | 'compact' | 'none';
}

interface IFadeOutItemProps {
  ref?: React.ForwardedRef<HTMLDivElement>;
  /** Reactions and comments */
  social?: IFadeOutItemSocial;
  content: React.ReactNode;
  module: IModule;
  /** Stays at the top of the dialog when the content scrolls */
  modalTitle?: React.ReactNode;
  modalContent: React.ReactNode;
  modalColumns: number;
  editFormContent?: React.ReactElement<{ open?: boolean; onClose?: () => void }>;
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
    modalTitle,
    modalContent,
    modalColumns,
    editFormContent,
    paddingBottom = 24,
    deletePromise,
    onDelete,
    deleteAllPromise,
    onDeleteAll,
    maxHeight,
    social
  }: IFadeOutItemProps) => {
    const { sessionModel } = useMobxStore();
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [saving, setSaving] = useState(false);
    const [showModalItem, setShowModalItem] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const fadeOutRef = useRef<HTMLDivElement>(null);
    const { height } = useSize(fadeOutRef, false, true, 'client');

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
                onDelete?.();
                closeModal();
              })
              .catch(e => {
                if (e?.message) message.error(e.message);
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
                onDeleteAll?.();
                closeModal();
              })
              .catch(e => {
                if (e?.message) message.error(e.message);
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
            onClose: closeModal
          })
        : null;

    return (
      <ItemHolder
        ref={ref}
        maxHeight={maxHeight}
        paddingBottom={paddingBottom}
        extraHeight={social && social.card !== 'none' ? 32 : 0}
      >
        <ItemFadeOut
          maxHeight={maxHeight}
          height={height != null ? height - paddingBottom : undefined}
          onClick={openModal}
        >
          <div ref={fadeOutRef}>{content}</div>
        </ItemFadeOut>
        {social && social.card !== 'none' ? (
          <SocialBar
            targetType={social.targetType}
            targetId={social.targetId}
            compact={social.card === 'compact'}
            onComments={openModal}
          />
        ) : null}
        <ScrollBodyModal
          closable={false}
          maskClosable={false}
          open={showModalItem}
          title={modalTitle}
          // % of the visible area (100vw also counts a scrollbar and made the dialog wider than the screen)
          width="min(800px, max(min(560px, calc(100% - 16px)), calc(100% - 80px)))"
          style={{ top: isMobile ? 8 : 40, paddingBottom: isMobile ? 8 : undefined }}
          footer={[
            ShowDeleteAllButton,
            ShowDeleteButton,
            ShowEditButton,
            <Button key="closeButton" type="primary" loading={saving} onClick={closeModal}>
              {t('common.Close')}
            </Button>
          ]}
          onCancel={closeModal}
        >
          <StyledModalContent columns={modalColumns}>{modalContent}</StyledModalContent>
          {social && showModalItem ? <SocialSection targetType={social.targetType} targetId={social.targetId} /> : null}
        </ScrollBodyModal>
        {EditFormContent}
      </ItemHolder>
    );
  }
);

export default FadeOutItem;
