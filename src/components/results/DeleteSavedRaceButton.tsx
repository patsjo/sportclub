import { DeleteOutlined } from '@ant-design/icons';
import { Button, ButtonProps, message, Popconfirm } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';

interface IDeleteSavedRaceButtonProps {
  eventId: number;
  name: string;
  /** Called when the race is deleted */
  onDeleted: (eventId: number) => void;
  size?: ButtonProps['size'];
  /** Only the icon, e.g. in a table row */
  iconOnly?: boolean;
  disabled?: boolean;
}

/** Deletes a saved race with all results, after a confirm. Only shown for administrators. */
const DeleteSavedRaceButton = observer(
  ({ eventId, name, onDeleted, size, iconOnly, disabled }: IDeleteSavedRaceButtonProps) => {
    const { t } = useTranslation();
    const { clubModel, sessionModel } = useMobxStore();
    const [deleting, setDeleting] = useState(false);
    const deleteUrl = clubModel.modules.find(module => module.name === 'Results')?.deleteUrl;

    const onDelete = useCallback(async () => {
      if (!deleteUrl) return;
      setDeleting(true);
      try {
        await PostJsonData(
          deleteUrl,
          {
            iType: 'EVENT',
            eventId
          },
          true,
          sessionModel.authorizationHeader
        );
        message.success(t('results.RaceDeleted', { name }));
        onDeleted(eventId);
      } catch (e) {
        message.error(
          `${t('results.DeleteRaceFailed', { name })}${e instanceof Error && e.message ? `: ${e.message}` : ''}`
        );
      } finally {
        setDeleting(false);
      }
    }, [deleteUrl, eventId, name, onDeleted, sessionModel, t]);

    if (!sessionModel.isAdmin || !deleteUrl || eventId <= 0) return null;

    return (
      <Popconfirm
        title={t('results.DeleteRace')}
        description={<div style={{ maxWidth: 360 }}>{t('results.DeleteRaceConfirm', { name })}</div>}
        okText={t('common.Delete')}
        okButtonProps={{ danger: true }}
        cancelText={t('common.Cancel')}
        onConfirm={onDelete}
        onPopupClick={e => e.stopPropagation()}
      >
        <Button
          danger
          size={size}
          icon={<DeleteOutlined />}
          loading={deleting}
          disabled={disabled}
          title={t('results.DeleteRace')}
          onClick={e => e.stopPropagation()}
        >
          {iconOnly ? null : t('results.DeleteRace')}
        </Button>
      </Popconfirm>
    );
  }
);

export default DeleteSavedRaceButton;
