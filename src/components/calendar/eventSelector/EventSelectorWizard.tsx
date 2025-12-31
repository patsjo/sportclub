import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Spin, Steps, message } from 'antd';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import {
  EventSelectorWizard as EventSelectorWizardModel,
  getLocalStorage
} from '../../../models/eventSelectorWizardModel';
import { IRaceClubsProps } from '../../../models/resultModel';
import { PostJsonData } from '../../../utils/api';
import { useMobxStore } from '../../../utils/mobxStore';
import { IEventorOrganisation, IEventorOrganisations } from '../../../utils/responseEventorInterfaces';
import { useSize } from '../../../utils/useSize';
import FullScreenWizard from '../../styled/FullscreenWizard';
import { SpinnerDiv } from '../../styled/styled';
import EventSelectorWizardStep0Input from './EventSelectorWizardStep0Input';
import EventSelectorWizardStep1ChooseRace from './EventSelectorWizardStep1ChooseRace';

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
  const [eventorOrganisations, setEventorOrganisations] = useState<IEventorOrganisation[]>([]);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { height: stepsHeight } = useSize(stepsRef, false, true, 'offset');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const eventSelectorWizardModel = useMemo(
    () => new EventSelectorWizardModel(getLocalStorage(clubModel.eventor)),
    [clubModel.eventor]
  );
  const navigate = useNavigate();

  const next = useCallback(() => {
    setWizardStep(prevStep => prevStep + 1);
    setNextStepValid(false);
  }, []);

  const prev = useCallback(() => {
    setWizardStep(prevStep => prevStep - 1);
    setNextStepValid(true);
  }, []);

  const onValidate = useCallback((valid: boolean) => {
    setNextStepValid(valid);
  }, []);

  const onClose = useCallback(() => {
    globalStateModel.setDashboard(navigate, '/');
  }, [globalStateModel, navigate]);

  const save = useCallback(() => {
    const calendarModule = clubModel.modules.find(module => module.name === 'Calendar');
    const saveUrl = calendarModule?.addUrl;
    if (!saveUrl) return;

    setSaving(true);

    const snapshot = toJS(eventSelectorWizardModel);
    const data = {
      queryStartDate: snapshot.queryStartDate,
      queryEndDate: snapshot.queryEndDate,
      events: snapshot.selectedEvents
    };

    PostJsonData(
      saveUrl,
      {
        ...data,
        iType: 'EVENTS',
        username: sessionModel.username,
        password: sessionModel.password
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(() => {
        onClose();
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
        setSaving(false);
      });
  }, [
    clubModel.modules,
    eventSelectorWizardModel,
    sessionModel.username,
    sessionModel.password,
    sessionModel.authorizationHeader,
    onClose
  ]);

  useEffect(() => {
    if (loaded) return;
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url || !clubModel.eventor?.organisationsUrl) return;

    const clubsPromise = PostJsonData<IRaceClubsProps>(
      url,
      {
        iType: 'CLUBS'
      },
      true,
      sessionModel.authorizationHeader
    );
    const organisationsPromise = PostJsonData<IEventorOrganisations>(
      clubModel.eventorCorsProxy,
      {
        csurl: encodeURIComponent(clubModel.eventor.organisationsUrl + '?includeProperties=false')
      },
      true
    );

    Promise.all([clubsPromise, organisationsPromise])
      .then(([clubsJson, organisationsJson]) => {
        if (clubsJson) {
          clubModel.setRaceClubs(clubsJson);
          setWizardStep(0);
          setLoaded(true);
        }
        setEventorOrganisations(organisationsJson?.Organisation ?? []);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
        onClose?.();
      });
  }, [clubModel, sessionModel, onClose, loaded]);

  return (
    <FullScreenWizard
      title={t('calendar.EventSelector')}
      footer={[
        <Button key="prevButton" disabled={wizardStep < 1} onClick={prev}>
          <LeftOutlined />
          {t('common.Previous')}
        </Button>,
        <Button
          key={wizardStep === 1 ? 'saveButton' : 'nextButton'}
          disabled={!loaded || !nextStepValid}
          loading={saving}
          onClick={wizardStep === 1 ? save : next}
        >
          {wizardStep === 1 ? t('common.Save') : t('common.Next')}
          {wizardStep === 1 ? null : <RightOutlined />}
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
            items={[{ title: t('results.Step0Input') }, { title: t('results.Step1ChooseRace') }]}
          />
        </StyledFullWidth>
        {wizardStep === 0 ? (
          <EventSelectorWizardStep0Input
            height={Math.max(228, contentOffsetHeight - (stepsHeight ?? 32))}
            eventSelectorWizardModel={eventSelectorWizardModel}
            eventorOrganisations={eventorOrganisations}
          />
        ) : null}
        {wizardStep >= 1 ? (
          <EventSelectorWizardStep1ChooseRace
            height={Math.max(128, contentOffsetHeight - (stepsHeight ?? 32))}
            eventSelectorWizardModel={eventSelectorWizardModel}
            eventorOrganisations={eventorOrganisations}
            visible={wizardStep === 1}
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
  );
});

export default EventSelectorWizard;
