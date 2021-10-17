import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, message, Modal, Spin, Steps } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { observer } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { IRaceClubsSnapshotIn } from 'models/resultModel';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { ResultWizardStoreProvider } from 'utils/resultWizardStore';
import { getLocalStorage, RaceWizard } from '../../models/resultWizardModel';
import { PostJsonData } from '../../utils/api';
import { SpinnerDiv } from '../styled/styled';
import InvoiceWizardStep0Input from './InvoiceWizardStep0Input';
import InvoiceWizardStep1ChooseRace from './InvoiceWizardStep1ChooseRace';
import InvoiceWizardStep2EditRace from './InvoiceWizardStep2EditRace';

const { info } = Modal;
const StyledModalContent = styled.div``;
const StyledSteps = styled(Steps)`
  &&& {
    margin-bottom: 16px;
  }
`;
const { Step } = Steps;

interface IInvoiceWizardModalProps {
  open: boolean;
  onClose: () => void;
}
const InvoiceWizardModal = observer(({ open, onClose }: IInvoiceWizardModalProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const raceWizardModel = useRef(RaceWizard.create(getLocalStorage()));
  const [wizardStep, setWizardStep] = useState(-1);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [inputForm, setInputForm] = useState<FormInstance>();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const next = useCallback(() => {
    setNextStepValid(false);
    setWizardStep((oldStep) => oldStep + 1);
  }, []);

  const prev = useCallback(() => {
    setNextStepValid(wizardStep === 1 || (wizardStep === 2 && raceWizardModel.current.selectedEventorId != null));
    setWizardStep((oldStep) => oldStep - 1);
  }, [wizardStep]);

  const onValidate = useCallback((valid: boolean) => {
    setNextStepValid(valid);
  }, []);

  const save = useCallback(() => {
    const { raceEvent } = raceWizardModel.current;
    const resultsModule = clubModel.modules.find((module) => module.name === 'Results');
    const saveUrl = raceEvent?.eventId === -1 ? resultsModule?.addUrl : resultsModule?.updateUrl;

    if (!raceEvent || !saveUrl) return;

    setSaving(true);
    const snapshot = getSnapshot(raceEvent);

    PostJsonData(
      saveUrl,
      {
        ...snapshot,
        iType: 'EVENT_VERIFY',
        username: sessionModel.username,
        password: sessionModel.password,
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(() => {
        onClose();
      })
      .catch((e) => {
        message.error(e.message);
        setSaving(false);
      });
  }, []);

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData(
      url,
      {
        iType: 'CLUBS',
      },
      true,
      sessionModel.authorizationHeader
    )
      .then((clubsJson: IRaceClubsSnapshotIn) => {
        clubModel.setRaceClubs(clubsJson);
        setWizardStep(0);
        setLoaded(true);
      })
      .catch((e) => {
        message.error(e.message);
        onClose && onClose();
      });
  }, []);

  return (
    <ResultWizardStoreProvider store={{ raceWizardModel: raceWizardModel.current }}>
      <Modal
        closable={false}
        maskClosable={false}
        title={t('results.InvoiceVerifier')}
        visible={open}
        onCancel={onClose}
        width="calc(100% - 80px)"
        style={{ top: 40, minWidth: 1250 }}
        footer={[
          <Button disabled={wizardStep < 1} onClick={() => prev()}>
            <LeftOutlined />
            {t('common.Previous')}
          </Button>,
          <Button
            type="primary"
            disabled={!loaded || !nextStepValid}
            loading={saving}
            onClick={() => (wizardStep === 2 ? save() : next())}
          >
            {wizardStep === 2 ? t('common.Save') : t('common.Next')}
            {wizardStep === 2 ? null : <RightOutlined />}
          </Button>,
          <Button onClick={onClose} loading={false}>
            {t('common.Cancel')}
          </Button>,
        ]}
      >
        <StyledModalContent>
          <StyledSteps current={wizardStep}>
            <Step key="InvoiceWizardModalStep0" title={t('results.Step0Input')} />
            <Step key="InvoiceWizardModalStep1" title={t('results.Step1ChooseRace')} />
            <Step key="InvoiceWizardModalStep2" title={t('results.Step2EditRace')} />
          </StyledSteps>
          {wizardStep === 0 ? <InvoiceWizardStep0Input onMount={setInputForm} /> : null}
          {wizardStep >= 1 && raceWizardModel.current.existInEventor ? (
            <InvoiceWizardStep1ChooseRace onValidate={onValidate} visible={wizardStep === 1} onFailed={() => prev()} />
          ) : null}
          {wizardStep >= 2 ? (
            <InvoiceWizardStep2EditRace onValidate={onValidate} visible={wizardStep === 2} onFailed={() => prev()} />
          ) : null}
          {!loaded ? (
            <SpinnerDiv>
              <Spin size="large" />
            </SpinnerDiv>
          ) : null}
        </StyledModalContent>
      </Modal>
    </ResultWizardStoreProvider>
  );
});

export default InvoiceWizardModal;