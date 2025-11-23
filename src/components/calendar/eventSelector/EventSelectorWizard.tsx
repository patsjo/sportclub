import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Spin, Steps, message } from 'antd';
import FullScreenWizard from '../../styled/FullscreenWizard';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { IRaceClubsProps } from '../../../models/resultModel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useMobxStore } from '../../../utils/mobxStore';
import { useSize } from '../../../utils/useSize';
import {
  EventSelectorWizard as EventSelectorWizardModel,
  getLocalStorage,
} from '../../../models/eventSelectorWizardModel';
import { PostJsonData } from '../../../utils/api';
import { SpinnerDiv } from '../../styled/styled';
import EventSelectorWizardStep0Input from './EventSelectorWizardStep0Input';
import EventSelectorWizardStep1ChooseRace from './EventSelectorWizardStep1ChooseRace';

const { Step } = Steps;
const StyledFullWidth = styled.div`
  width: 100%;
  padding-bottom: 8px;
`;
const StyledModalContent = styled.div``;

const EventSelectorWizard = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const [wizardStep, setWizardStep] = useState(-1);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [contentOffsetHeight, setContentOffsetHeight] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { height: stepsHeight } = useSize(stepsRef, ['height'], 'offset');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const eventSelectorWizardModel = useMemo(() => new EventSelectorWizardModel(getLocalStorage()), []);
  const navigate = useNavigate();

  const next = () => {
    setWizardStep((prevStep) => prevStep + 1);
    setNextStepValid(false);
  };

  const prev = () => {
    setWizardStep((prevStep) => prevStep - 1);
    setNextStepValid(true);
  };

  const onValidate = (valid: boolean) => {
    setNextStepValid(valid);
  };

  const onClose = useCallback(() => {
    globalStateModel.setDashboard(navigate, '/');
  }, []);

  const save = useCallback(() => {
    const calendarModule = clubModel.modules.find((module) => module.name === 'Calendar');
    const saveUrl = calendarModule?.addUrl;
    if (!saveUrl) return;

    setSaving(true);

    const snapshot = toJS(eventSelectorWizardModel);
    const data = {
      queryStartDate: snapshot.queryStartDate,
      queryEndDate: snapshot.queryEndDate,
      events: snapshot.selectedEvents,
    };

    PostJsonData(
      saveUrl,
      {
        ...data,
        iType: 'EVENTS',
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
  }, [sessionModel, clubModel]);

  useEffect(() => {
    if (loaded) return;
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
  }, [clubModel, sessionModel, onClose, loaded]);

  return (
    <FullScreenWizard
      title={t('calendar.EventSelector')}
      footer={[
        <Button disabled={wizardStep < 1} onClick={() => prev()}>
          <LeftOutlined />
          {t('common.Previous')}
        </Button>,
        <Button
          disabled={!loaded || !nextStepValid}
          loading={saving}
          onClick={() => (wizardStep === 1 ? save() : next())}
        >
          {wizardStep === 1 ? t('common.Save') : t('common.Next')}
          {wizardStep === 1 ? null : <RightOutlined />}
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
            <Step key="EventSelectorWizardModalStep0" title={t('results.Step0Input')} />
            <Step key="EventSelectorWizardModalStep1" title={t('results.Step1ChooseRace')} />
          </Steps>
        </StyledFullWidth>
        {wizardStep === 0 ? (
          <EventSelectorWizardStep0Input
            height={Math.max(228, contentOffsetHeight - (stepsHeight ?? 32))}
            eventSelectorWizardModel={eventSelectorWizardModel}
          />
        ) : null}
        {wizardStep >= 1 ? (
          <EventSelectorWizardStep1ChooseRace
            height={Math.max(128, contentOffsetHeight - (stepsHeight ?? 32))}
            eventSelectorWizardModel={eventSelectorWizardModel}
            onValidate={onValidate}
            visible={wizardStep === 1}
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
  );
});

export default EventSelectorWizard;
