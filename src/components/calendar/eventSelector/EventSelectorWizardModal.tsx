import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, message, Modal, Spin, Steps } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { IRaceClubsProps } from 'models/resultModel';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import { EventSelectorWizard, getLocalStorage } from '../../../models/eventSelectorWizardModel';
import { PostJsonData } from '../../../utils/api';
import { SpinnerDiv } from '../../styled/styled';
import EventSelectorWizardStep0Input from './EventSelectorWizardStep0Input';
import EventSelectorWizardStep1ChooseRace from './EventSelectorWizardStep1ChooseRace';

const StyledModalContent = styled.div``;
const StyledSteps = styled(Steps)`
  &&& {
    margin-bottom: 16px;
  }
`;
const { Step } = Steps;

interface IEventSelectorWizardModalProps {
  open: boolean;
  onClose: () => void;
}
const EventSelectorWizardModal = observer(({ open, onClose }: IEventSelectorWizardModalProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const [wizardStep, setWizardStep] = useState(-1);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [inputForm, setInputForm] = useState<FormInstance>();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const eventSelectorWizardModel = useMemo(() => new EventSelectorWizard(getLocalStorage()), []);

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

  return (
    <Modal
      closable={false}
      maskClosable={false}
      title={t('calendar.EventSelector')}
      open={open}
      onCancel={onClose}
      width="calc(100% - 80px)"
      style={{ top: 40, minWidth: 560 }}
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
      ]}
    >
      <StyledModalContent>
        <StyledSteps current={wizardStep}>
          <Step key="EventSelectorWizardModalStep0" title={t('results.Step0Input')} />
          <Step key="EventSelectorWizardModalStep1" title={t('results.Step1ChooseRace')} />
        </StyledSteps>
        {wizardStep === 0 ? (
          <EventSelectorWizardStep0Input
            eventSelectorWizardModel={eventSelectorWizardModel}
            onMount={(form) => setInputForm(form)}
          />
        ) : null}
        {wizardStep >= 1 ? (
          <EventSelectorWizardStep1ChooseRace
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
    </Modal>
  );
});

export default EventSelectorWizardModal;
