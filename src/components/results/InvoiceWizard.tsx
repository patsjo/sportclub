import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Spin, Steps, message } from 'antd';
import FullScreenWizard from 'components/styled/FullscreenWizard';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { IRaceClubsProps } from 'models/resultModel';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { ResultWizardStoreProvider } from 'utils/resultWizardStore';
import { useSize } from 'utils/useSize';
import { RaceWizard, getLocalStorage } from '../../models/resultWizardModel';
import { PostJsonData } from '../../utils/api';
import { SpinnerDiv } from '../styled/styled';
import InvoiceWizardStep0Input from './InvoiceWizardStep0Input';
import InvoiceWizardStep1ChooseRace from './InvoiceWizardStep1ChooseRace';
import InvoiceWizardStep2EditRace from './InvoiceWizardStep2EditRace';

const { Step } = Steps;
const StyledFullWidth = styled.div`
  width: 100%;
  padding-bottom: 8px;
`;
const StyledModalContent = styled.div``;

const InvoiceWizard = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const raceWizardModel = useRef(new RaceWizard(getLocalStorage()));
  const [wizardStep, setWizardStep] = useState(-1);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [contentOffsetHeight, setContentOffsetHeight] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { height: stepsHeight } = useSize(stepsRef, ['height'], 'offset');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const next = useCallback(() => {
    setNextStepValid(false);
    setWizardStep((oldStep) => oldStep + 1);
  }, []);

  const prev = useCallback(() => {
    setNextStepValid(wizardStep === 1 || (wizardStep === 2 && raceWizardModel.current.selectedEventId != null));
    setWizardStep((oldStep) => oldStep - 1);
  }, [wizardStep]);

  const onValidate = useCallback((valid: boolean) => {
    setNextStepValid(valid);
  }, []);

  const onClose = useCallback(() => {
    globalStateModel.setDashboard(navigate, '/');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const save = useCallback((shouldClose = true, onSuccess = () => {}) => {
    const { raceEvent } = raceWizardModel.current;
    const resultsModule = clubModel.modules.find((module) => module.name === 'Results');
    const saveUrl = raceEvent?.eventId === -1 ? resultsModule?.addUrl : resultsModule?.updateUrl;

    if (!raceEvent || !saveUrl) return;

    setSaving(true);
    const snapshot = toJS(raceEvent);

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
        setSaving(false);
        onSuccess();
        shouldClose && onClose();
      })
      .catch((e) => {
        message.error(e.message);
        setSaving(false);
      });
  }, []);

  const saveAndNextEvent = useCallback(() => {
    save(false, () => {
      raceWizardModel.current.raceEvent?.eventId != null &&
        raceWizardModel.current.addImportedId(raceWizardModel.current.raceEvent?.eventId);
      raceWizardModel.current.setRaceEvent(null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorRaceId', null);
      setNextStepValid(false);
      setWizardStep(1);
    });
  }, [save]);

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
      .then((clubsJson: IRaceClubsProps) => {
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
      <FullScreenWizard
        title={t('results.InvoiceVerifier')}
        footer={[
          <Button disabled={wizardStep < 1} onClick={() => prev()}>
            <LeftOutlined />
            {t('common.Previous')}
          </Button>,
          wizardStep === 2 ? (
            <Button disabled={!loaded || !nextStepValid} loading={saving} onClick={(e) => saveAndNextEvent()}>
              <LeftOutlined />
              {t('common.SaveAndNextEvent')}
            </Button>
          ) : null,
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
        ].filter((component) => !!component)}
        onContentOffsetHeight={setContentOffsetHeight}
      >
        <StyledModalContent>
          <StyledFullWidth ref={stepsRef}>
            <Steps current={wizardStep}>
              <Step key="InvoiceWizardModalStep0" title={t('results.Step0Input')} />
              <Step key="InvoiceWizardModalStep1" title={t('results.Step1ChooseRace')} />
              <Step key="InvoiceWizardModalStep2" title={t('results.Step2EditRace')} />
            </Steps>
          </StyledFullWidth>
          {wizardStep === 0 ? <InvoiceWizardStep0Input /> : null}
          {wizardStep >= 1 && raceWizardModel.current.existInEventor ? (
            <InvoiceWizardStep1ChooseRace
              height={Math.max(160, contentOffsetHeight - (stepsHeight ?? 32))}
              onValidate={onValidate}
              visible={wizardStep === 1}
              onFailed={() => prev()}
            />
          ) : null}
          {wizardStep >= 2 ? (
            <InvoiceWizardStep2EditRace
              height={Math.max(228, contentOffsetHeight - (stepsHeight ?? 32))}
              onValidate={onValidate}
              visible={wizardStep === 2}
              onFailed={() => prev()}
            />
          ) : null}
          {!loaded ? (
            <SpinnerDiv>
              <Spin size="large" />
            </SpinnerDiv>
          ) : null}
        </StyledModalContent>
      </FullScreenWizard>
    </ResultWizardStoreProvider>
  );
});

export default InvoiceWizard;
