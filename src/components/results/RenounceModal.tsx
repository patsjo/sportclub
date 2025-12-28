import { Button, message, Modal, Popconfirm, Switch } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IRaceCompetitor } from '../../models/resultModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';

const StyledModalContent = styled.div``;

interface IRenounceModalProps {
  competitor: IRaceCompetitor;
  open: boolean;
  onClose: () => void;
}
const RenounceModal = observer(({ competitor, open, onClose }: IRenounceModalProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [canSave, setCanSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSave = useCallback(() => {
    const saveUrl = clubModel.modules.find(module => module.name === 'Results')?.updateUrl;
    if (!saveUrl) return;
    setSaving(true);

    PostJsonData(
      saveUrl,
      {
        iType: 'COMPETITOR_RENOUNCE',
        iCompetitorId: competitor.competitorId,
        username: sessionModel.username,
        password: sessionModel.password
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(() => {
        competitor.renounce();
        setSaving(false);
        onClose();
      })
      .catch(e => {
        setSaving(false);
        if (e?.message) message.error(e.message);
      });
  }, [
    clubModel.modules,
    competitor,
    onClose,
    sessionModel.authorizationHeader,
    sessionModel.password,
    sessionModel.username
  ]);

  return (
    <Modal
      closable={false}
      maskClosable={false}
      title={t('results.Renounce')}
      open={open}
      width="calc(100% - 80px)"
      style={{ top: 40, maxWidth: 900 }}
      footer={[
        <Popconfirm
          key="confirmSaveButton"
          title={t('common.Confirm')}
          okText={t('common.Yes')}
          cancelText={t('common.No')}
          onConfirm={onSave}
        >
          <Button type="primary" disabled={!canSave} loading={saving}>
            {t('common.Save')}
          </Button>
        </Popconfirm>,
        <Button key="cancelButton" loading={false} onClick={onClose}>
          {t('common.Cancel')}
        </Button>
      ]}
      onCancel={onClose}
    >
      <StyledModalContent>
        <ul>
          <li>{t('results.RenounceBullet1')}</li>
          <li>{t('results.RenounceBullet2')}</li>
          <li>{t('results.RenounceBullet3')}</li>
          <li>{t('results.RenounceBullet4')}</li>
        </ul>
        <Switch checked={canSave} onChange={setCanSave} />
        &nbsp;
        {t('results.RenounceConfirm')}
      </StyledModalContent>
    </Modal>
  );
});

export default RenounceModal;
