import { ExclamationCircleFilled } from '@ant-design/icons';
import { Modal, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ICupDeleteCountdownModalProps {
  /** What is deleted, e.g. the name of the cup or the season */
  title: string;
  description: string;
  /** The delete button can only be clicked after this many seconds */
  seconds?: number;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * The second confirmation before something big is deleted (a whole cup or season), after the
 * popconfirm. The delete button is locked during a countdown, so it can not be clicked by mistake.
 * Mounted only while open, the countdown starts over every time.
 */
const CupDeleteCountdownModal = ({
  title,
  description,
  seconds = 20,
  onDelete,
  onClose
}: ICupDeleteCountdownModalProps) => {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Modal
      open
      title={
        <span>
          <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />
          {title}
        </span>
      }
      okText={secondsLeft > 0 ? t('cup.DeleteIn', { count: secondsLeft }) : t('common.Delete')}
      okButtonProps={{ danger: true, disabled: secondsLeft > 0, loading: deleting }}
      cancelText={t('common.Cancel')}
      maskClosable={false}
      onOk={async () => {
        setDeleting(true);
        try {
          await onDelete();
        } finally {
          setDeleting(false);
        }
      }}
      onCancel={onClose}
    >
      <Typography.Paragraph>{description}</Typography.Paragraph>
      <Typography.Paragraph strong type="danger">
        {t('cup.DeleteCannotBeUndone')}
      </Typography.Paragraph>
    </Modal>
  );
};

export default CupDeleteCountdownModal;
