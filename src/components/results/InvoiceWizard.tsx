import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Spin, Steps, message } from 'antd';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { IRaceClubsProps, IRaceEventProps } from '../../models/resultModel';
import { IRaceWizard, RaceWizard, getLocalStorage } from '../../models/resultWizardModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import { ResultWizardStoreProvider } from '../../utils/resultWizardStore';
import { useSize } from '../../utils/useSize';
import FullScreenWizard from '../styled/FullscreenWizard';
import { SpinnerDiv } from '../styled/styled';
import InvoiceWizardStep0Input from './InvoiceWizardStep0Input';
import InvoiceWizardStep1ChooseRace from './InvoiceWizardStep1ChooseRace';
import InvoiceWizardStep2EditRace from './InvoiceWizardStep2EditRace';

const StyledFullWidth = styled.div`
  width: 100%;
  padding-bottom: 8px;
`;
const StyledModalContent = styled.div``;

const InvoiceWizard = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const raceWizardModel = useRef<IRaceWizard>(new RaceWizard(getLocalStorage()));
  const [wizardStep, setWizardStep] = useState(-1);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [contentOffsetHeight, setContentOffsetHeight] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { height: stepsHeight } = useSize(stepsRef, false, true, 'offset');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const next = useCallback(() => {
    setNextStepValid(false);
    setWizardStep(oldStep => oldStep + 1);
  }, []);

  const prev = useCallback(() => {
    const nextStep = wizardStep - 1;
    if (nextStep === 1) {
      raceWizardModel.current.setRaceEvent(null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorRaceId', null);
    }
    setNextStepValid(wizardStep === 1 || (wizardStep === 2 && raceWizardModel.current.selectedEventId != null));
    setWizardStep(nextStep);
  }, [wizardStep]);

  const onValidate = useCallback((valid: boolean) => {
    setNextStepValid(valid);
  }, []);

  const onClose = useCallback(() => {
    globalStateModel.setDashboard(navigate, '/');
  }, [globalStateModel, navigate]);

  const save = useCallback(
    (shouldClose = true, onSuccess?: (event?: IRaceEventProps) => void) => {
      const { raceEvent } = raceWizardModel.current;
      const resultsModule = clubModel.modules.find(module => module.name === 'Results');
      const saveUrl = raceEvent?.eventId === -1 ? resultsModule?.addUrl : resultsModule?.updateUrl;

      if (!raceEvent || !saveUrl) return;

      setSaving(true);
      const snapshot = toJS(raceEvent);

      PostJsonData<IRaceEventProps>(
        saveUrl,
        {
          ...snapshot,
          iType: 'EVENT_VERIFY',
          username: sessionModel.username,
          password: sessionModel.password
        },
        true,
        sessionModel.authorizationHeader
      )
        .then(event => {
          setSaving(false);
          onSuccess?.(event);
          if (shouldClose) onClose();
        })
        .catch(e => {
          if (e?.message) message.error(e.message);
          setSaving(false);
        });
    },
    [clubModel.modules, onClose, sessionModel.authorizationHeader, sessionModel.password, sessionModel.username]
  );

  const saveAndNextEvent = useCallback(() => {
    save(false, (event?: IRaceEventProps) => {
      if (event != null) raceWizardModel.current.addImportedRace(event, raceWizardModel.current.raceEvent?.eventId);
      raceWizardModel.current.setRaceEvent(null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorRaceId', null);
      setNextStepValid(false);
      setWizardStep(1);
    });
  }, [save]);

  useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url) return;

    PostJsonData<IRaceClubsProps>(
      url,
      {
        iType: 'CLUBS'
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(clubsJson => {
        if (clubsJson) {
          clubModel.setRaceClubs(clubsJson);
          setWizardStep(0);
        }
        setLoaded(true);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
        onClose?.();
      });
  }, [clubModel, onClose, sessionModel.authorizationHeader]);

  return (
    <ResultWizardStoreProvider store={{ raceWizardModel: raceWizardModel.current }}>
      <FullScreenWizard
        title={t('results.InvoiceVerifier')}
        footer={[
          <Button key="prevButton" disabled={wizardStep < 1} onClick={prev}>
            <LeftOutlined />
            {t('common.Previous')}
          </Button>,
          wizardStep === 2 ? (
            <Button disabled={!loaded || !nextStepValid} loading={saving} onClick={saveAndNextEvent}>
              <LeftOutlined />
              {t('common.SaveAndNextEvent')}
            </Button>
          ) : null,
          <Button
            key={wizardStep === 2 ? 'saveButton' : 'nextButton'}
            type="primary"
            disabled={!loaded || !nextStepValid}
            loading={saving}
            onClick={() => (wizardStep === 2 ? save() : next())}
          >
            {wizardStep === 2 ? t('common.Save') : t('common.Next')}
            {wizardStep === 2 ? null : <RightOutlined />}
          </Button>,
          <Button key="cancelButton" loading={false} onClick={onClose}>
            {t('common.Cancel')}
          </Button>
        ].filter(component => !!component)}
        onContentOffsetHeight={setContentOffsetHeight}
      >
        <StyledModalContent>
          <StyledFullWidth ref={stepsRef}>
            <Steps
              current={wizardStep}
              items={[
                { title: t('results.Step0Input') },
                { title: t('results.Step1ChooseRace') },
                { title: t('results.Step2EditRace') }
              ]}
            />
          </StyledFullWidth>
          {wizardStep === 0 ? <InvoiceWizardStep0Input /> : null}
          {wizardStep >= 1 && raceWizardModel.current.existInEventor ? (
            <InvoiceWizardStep1ChooseRace
              height={Math.max(160, contentOffsetHeight - (stepsHeight ?? 32))}
              visible={wizardStep === 1}
              onValidate={onValidate}
              onFailed={prev}
            />
          ) : null}
          {wizardStep >= 2 ? (
            <InvoiceWizardStep2EditRace
              height={Math.max(228, contentOffsetHeight - (stepsHeight ?? 32))}
              visible={wizardStep === 2}
              onValidate={onValidate}
              onFailed={prev}
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
