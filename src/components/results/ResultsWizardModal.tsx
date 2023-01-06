import { LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { Button, message, Modal, Popconfirm, Spin, Steps } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { ModalFuncProps } from 'antd/lib/modal';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { IRaceClubsProps } from 'models/resultModel';
import { getLocalStorage, IRaceWizard, RaceWizard } from 'models/resultWizardModel';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { PostJsonData } from 'utils/api';
import { useMobxStore } from 'utils/mobxStore';
import {
  difficulties,
  distances,
  EventClassificationIdTypes,
  lightConditions,
  LightConditionTypes,
  PaymentTypes,
  SportCodeTypes,
} from 'utils/resultConstants';
import {
  ConvertSecondsToTime,
  ConvertTimeToSeconds,
  GetPointRunTo1000,
  GetRaceOldPoint,
  GetRacePoint,
  GetRanking,
} from 'utils/resultHelper';
import { ResultWizardStoreProvider } from 'utils/resultWizardStore';
import { SpinnerDiv, StyledIcon } from '../styled/styled';
import { ConfirmOverwriteOrEdit } from './ConfirmOverwriteOrEditPromise';
import EditResultIndividual, { IExtendedRaceResult } from './EditResultIndividual';
import EditResultRelay, { IExtendedRaceTeamResult } from './EditResultRelay';
import ResultWizardStep0Input from './ResultsWizardStep0Input';
import ResultWizardStep1ChooseRace from './ResultsWizardStep1ChooseRace';
import ResultWizardStep1ChooseRaceRerun from './ResultsWizardStep1ChooseRaceRerun';
import ResultWizardStep2EditRace from './ResultsWizardStep2EditRace';
import ResultWizardStep3Ranking from './ResultsWizardStep3Ranking';
import { SelectEventorIdConfirmModal } from './SelectEventorIdConfirmModal';

const { confirm } = Modal;
const StyledModalContent = styled.div``;
const StyledSteps = styled(Steps)`
  &&& {
    margin-bottom: 16px;
  }
`;
const { Step } = Steps;

interface IResultsWizardModalProps {
  open: boolean;
  onClose: () => void;
}
const ResultsWizardModal = observer(({ open, onClose }: IResultsWizardModalProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const raceWizardModel = useRef<IRaceWizard>(new RaceWizard(getLocalStorage()));
  const [wizardStep, setWizardStep] = useState(0);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [inputForm, setInputForm] = useState<FormInstance>();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const next = useCallback(
    (e) => {
      let nextStep = wizardStep + 1;
      if (nextStep === 1 && e.altKey && e.ctrlKey) {
        nextStep = -100;
      } else if (nextStep === 1 && !raceWizardModel.current.existInEventor) {
        nextStep++;
      }
      if (
        nextStep === 2 &&
        raceWizardModel.current.eventExistInEventor &&
        raceWizardModel.current.selectedEventId &&
        raceWizardModel.current.selectedEventId > 0
      ) {
        ConfirmOverwriteOrEdit(t).then((overwrite: boolean) => {
          raceWizardModel.current.setBooleanValue('overwrite', overwrite);
          setNextStepValid(false);
          setWizardStep(nextStep);
        });
        return;
      } else if (nextStep === 2) {
        raceWizardModel.current.setBooleanValue('overwrite', raceWizardModel.current.eventExistInEventor);
      }
      setNextStepValid(false);
      setWizardStep(nextStep);
    },
    [
      wizardStep,
      raceWizardModel.current.existInEventor,
      raceWizardModel.current.overwrite,
      raceWizardModel.current.selectedEventId,
    ]
  );

  const prev = useCallback(() => {
    let nextStep = wizardStep - 1;
    if (nextStep === 1 && !raceWizardModel.current.existInEventor) {
      nextStep--;
    }
    if (nextStep === 0) {
      raceWizardModel.current.setBooleanValue('existInEventor', true);
      raceWizardModel.current.setNumberValueOrNull('selectedEventId', -1);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorId', null);
    }
    setNextStepValid(
      nextStep === 0 ||
        (nextStep === 1 &&
          raceWizardModel.current.selectedEventorId != null &&
          raceWizardModel.current.selectedEventorRaceId != null) ||
        (nextStep === 2 && raceWizardModel.current.raceEvent != null && raceWizardModel.current.raceEvent.valid)
    );
    setWizardStep(nextStep);
  }, [
    wizardStep,
    raceWizardModel.current.existInEventor,
    raceWizardModel.current.raceEvent,
    raceWizardModel.current.selectedEventId,
  ]);

  const onValidate = useCallback((valid: boolean) => {
    setNextStepValid(valid);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const save = useCallback((shouldClose = true, onSuccess = () => {}) => {
    const { raceEvent } = raceWizardModel.current;
    const raceEventClassification = clubModel.raceClubs?.eventClassifications.find(
      (ec) => ec.eventClassificationId === raceEvent?.eventClassificationId
    );
    const resultsModule = clubModel.modules.find((module) => module.name === 'Results');
    const saveUrl = raceEvent?.eventId === -1 ? resultsModule?.addUrl : resultsModule?.updateUrl;

    if (!saveUrl || !raceEvent) return;

    setSaving(true);
    raceEvent.results.forEach((result) => {
      const eventClassification = !result.deviantEventClassificationId
        ? raceEventClassification
        : clubModel.raceClubs?.eventClassifications.find(
            (ec) => ec.eventClassificationId === result.deviantEventClassificationId
          );
      const raceClassClassification = eventClassification?.classClassifications.find(
        (cc) => cc.classClassificationId === result.classClassificationId
      );

      result.setNumberValueOrNull(
        'ranking',
        GetRanking(
          raceEvent.rankingBasetimePerKilometer!,
          raceEvent.rankingBasepoint!,
          result,
          raceEvent.sportCode,
          raceEvent.raceLightCondition ?? lightConditions.day
        )
      );
      if (
        result.missingTime &&
        raceEvent.sportCode === 'OL' &&
        raceEvent.raceDistance !== 'Sprint' &&
        result.difficulty &&
        [difficulties.black, difficulties.blue, difficulties.purple].includes(result.difficulty)
      ) {
        const speedRanking = GetRanking(
          raceEvent.rankingBasetimePerKilometer!,
          raceEvent.rankingBasepoint!,
          {
            ...result,
            competitorTime: ConvertSecondsToTime(
              ConvertTimeToSeconds(result.competitorTime) - ConvertTimeToSeconds(result.missingTime)
            ),
            difficulty: difficulties.black,
          },
          raceEvent.sportCode as SportCodeTypes,
          raceEvent.raceLightCondition as LightConditionTypes
        );
        result.setNumberValueOrNull('speedRanking', speedRanking);

        const technicalRanking =
          result.ranking != null && speedRanking != null ? result.ranking - 0.9 * speedRanking : null;
        result.setNumberValueOrNull('technicalRanking', technicalRanking);
      } else {
        result.setNumberValueOrNull('speedRanking', null);
        result.setNumberValueOrNull('technicalRanking', null);
      }
      result.setNumberValueOrNull('points', GetRacePoint(eventClassification!, raceClassClassification!, result));
      result.setNumberValueOrNull('pointsOld', GetRaceOldPoint(eventClassification!, raceClassClassification!, result));
      result.setNumberValueOrNull(
        'points1000',
        GetPointRunTo1000(eventClassification!, raceClassClassification!, result)
      );
    });

    raceEvent.teamResults.forEach((result) => {
      const eventClassification = !result.deviantEventClassificationId
        ? raceEventClassification
        : clubModel.raceClubs?.eventClassifications.find(
            (ec) => ec.eventClassificationId === result.deviantEventClassificationId
          );
      const raceClassClassification = eventClassification?.classClassifications.find(
        (cc) => cc.classClassificationId === result.classClassificationId
      );

      result.setNumberValueOrNull(
        'ranking',
        GetRanking(
          raceEvent.rankingBasetimePerKilometer!,
          raceEvent.rankingBasepoint!,
          result,
          raceEvent.sportCode as SportCodeTypes,
          raceEvent.raceLightCondition as LightConditionTypes
        )
      );
      if (
        result.missingTime &&
        raceEvent.sportCode === 'OL' &&
        raceEvent.raceDistance !== 'Sprint' &&
        result.difficulty &&
        [difficulties.black, difficulties.blue, difficulties.purple].includes(result.difficulty)
      ) {
        const speedRanking = GetRanking(
          raceEvent.rankingBasetimePerKilometer!,
          raceEvent.rankingBasepoint!,
          {
            ...result,
            competitorTime: ConvertSecondsToTime(
              ConvertTimeToSeconds(result.competitorTime) - ConvertTimeToSeconds(result.missingTime)
            ),
            difficulty: difficulties.black,
          },
          raceEvent.sportCode as SportCodeTypes,
          raceEvent.raceLightCondition as LightConditionTypes
        );
        result.setNumberValueOrNull('speedRanking', speedRanking);

        const technicalRanking =
          result.ranking != null && speedRanking != null ? result.ranking - 0.9 * speedRanking : null;
        result.setNumberValueOrNull('technicalRanking', technicalRanking);
      } else {
        result.setNumberValueOrNull('speedRanking', null);
        result.setNumberValueOrNull('technicalRanking', null);
      }
      result.setNumberValueOrNull(
        'points1000',
        GetPointRunTo1000(eventClassification!, raceClassClassification!, result)
      );
    });

    const snapshot = toJS(raceEvent);

    PostJsonData(
      saveUrl,
      {
        ...snapshot,
        iType: 'EVENT',
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
      raceWizardModel.current.raceEvent?.eventorRaceId != null &&
        raceWizardModel.current.addImportedId(raceWizardModel.current.raceEvent?.eventorRaceId);
      raceWizardModel.current.setRaceEvent(null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorId', null);
      raceWizardModel.current.setNumberValueOrNull('selectedEventorRaceId', null);
      setNextStepValid(false);
      setWizardStep(1);
    });
  }, [save]);

  const onNoEventorConnection = useCallback(() => {
    raceWizardModel.current.setBooleanValue('existInEventor', false);
    raceWizardModel.current.setNumberValueOrNull('selectedEventId', -1);
    setNextStepValid(raceWizardModel.current.raceEvent != null && raceWizardModel.current.raceEvent.valid);
    setWizardStep(2);
  }, []);

  const onKnownEventorId = useCallback(async () => {
    const eventorId = await SelectEventorIdConfirmModal(t);
    if (eventorId == null) return;
    raceWizardModel.current.setBooleanValue('existInEventor', true);
    raceWizardModel.current.setNumberValueOrNull('selectedEventId', -1);
    raceWizardModel.current.setNumberValueOrNull('selectedEventorId', eventorId);
    setNextStepValid(
      raceWizardModel.current.selectedEventorId != null && raceWizardModel.current.selectedEventorRaceId != null
    );
    setWizardStep(1);
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
      <Modal
        closable={false}
        maskClosable={false}
        title={t('results.Add')}
        open={open}
        onCancel={onClose}
        width="calc(100% - 80px)"
        style={{ top: 40, minWidth: 1250 }}
        footer={[
          wizardStep === 2 ? (
            <Popconfirm
              title={t('common.Confirm')}
              okText={t('common.Yes')}
              cancelText={t('common.No')}
              onConfirm={prev}
            >
              <Button>
                <LeftOutlined />
                {t('common.Previous')}
              </Button>
            </Popconfirm>
          ) : (
            <Button disabled={wizardStep < 1} onClick={prev}>
              <LeftOutlined />
              {t('common.Previous')}
            </Button>
          ),
          <Button
            style={wizardStep === 2 ? {} : { display: 'none' }}
            onClick={() => {
              const resultObject: IExtendedRaceResult = {
                resultId: -100000 - Math.floor(Math.random() * 100000000),
                competitorId: -1,
                className: '',
                fee: 0,
                isAwardTouched: false,
              };
              const teamResultObject: IExtendedRaceTeamResult = {
                teamResultId: -100000 - Math.floor(Math.random() * 100000000),
                competitorId: -1,
                className: '',
                stage: 1,
                stageText: '',
                totalStages: 1,
              };
              let confirmModal: {
                destroy: () => void;
                update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
              };
              // eslint-disable-next-line prefer-const
              confirmModal = confirm({
                width: 800,
                icon: <StyledIcon type="plus" />,
                title: t('results.AddCompetitor'),
                content:
                  clubModel.raceClubs &&
                  raceWizardModel.current.raceEvent &&
                  !raceWizardModel.current.raceEvent?.isRelay ? (
                    <EditResultIndividual
                      clubModel={clubModel}
                      sessionModel={sessionModel}
                      raceWizardModel={raceWizardModel.current}
                      meetsAwardRequirements={raceWizardModel.current.raceEvent.meetsAwardRequirements}
                      isSprint={raceWizardModel.current.raceEvent.raceDistance === distances.sprint}
                      raceDate={raceWizardModel.current.raceEvent.raceDate ?? ''}
                      paymentModel={raceWizardModel.current.raceEvent.paymentModel as PaymentTypes}
                      eventClassificationId={
                        raceWizardModel.current.raceEvent.eventClassificationId as EventClassificationIdTypes
                      }
                      result={resultObject}
                      results={raceWizardModel.current.raceEvent.results}
                      competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
                      onValidate={(valid) =>
                        confirmModal.update({
                          okButtonProps: {
                            disabled: !valid,
                          },
                        })
                      }
                    />
                  ) : clubModel.raceClubs && raceWizardModel.current.raceEvent ? (
                    <EditResultRelay
                      clubModel={clubModel}
                      sessionModel={sessionModel}
                      raceWizardModel={raceWizardModel.current}
                      eventClassificationId={
                        raceWizardModel.current.raceEvent.eventClassificationId as EventClassificationIdTypes
                      }
                      raceLightCondition={raceWizardModel.current.raceEvent.raceLightCondition as LightConditionTypes}
                      result={teamResultObject}
                      results={raceWizardModel.current.raceEvent.teamResults}
                      competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
                      onValidate={(valid) =>
                        confirmModal.update({
                          okButtonProps: {
                            disabled: !valid,
                          },
                        })
                      }
                    />
                  ) : null,
                okText: t('common.Save'),
                okButtonProps: {
                  disabled: true,
                },
                cancelText: t('common.Cancel'),
                onOk() {
                  if (raceWizardModel.current.raceEvent?.isRelay) {
                    raceWizardModel.current.raceEvent.addTeamResult(teamResultObject);
                  } else {
                    raceWizardModel.current.raceEvent?.addResult(resultObject);
                  }
                  onValidate(!!raceWizardModel.current.raceEvent?.valid);
                },
              });
            }}
          >
            <PlusOutlined />
            {t('results.AddCompetitor')}
          </Button>,
          wizardStep === 3 && raceWizardModel.current.existInEventor ? (
            <Button disabled={!loaded || !nextStepValid} loading={saving} onClick={(e) => saveAndNextEvent()}>
              <LeftOutlined />
              {t('common.SaveAndNextEvent')}
            </Button>
          ) : null,
          wizardStep === 0 ? (
            <Button onClick={(e) => onNoEventorConnection()}>
              {t('results.AddWithoutEventor')}
              <RightOutlined />
            </Button>
          ) : null,
          wizardStep === 0 ? (
            <Button onClick={(e) => onKnownEventorId()}>
              {t('results.KnownEventorId')}
              <RightOutlined />
            </Button>
          ) : null,
          <Button
            type="primary"
            disabled={!loaded || !nextStepValid}
            loading={saving}
            onClick={(e) => (wizardStep === 3 ? save(true) : next(e))}
          >
            {wizardStep === 3 ? t('common.Save') : t('common.Next')}
            {wizardStep === 3 ? null : <RightOutlined />}
          </Button>,
          wizardStep >= 2 ? (
            <Popconfirm
              title={t('common.Confirm')}
              okText={t('common.Yes')}
              cancelText={t('common.No')}
              onConfirm={onClose}
            >
              <Button loading={false}>{t('common.Cancel')}</Button>
            </Popconfirm>
          ) : (
            <Button loading={false} onClick={onClose}>
              {t('common.Cancel')}
            </Button>
          ),
        ]}
      >
        <StyledModalContent>
          <StyledSteps current={wizardStep}>
            <Step key="ResultsWizardModalStep0" title={t('results.Step0Input')} />
            <Step key="ResultsWizardModalStep1" title={t('results.Step1ChooseRace')} />
            <Step key="ResultsWizardModalStep2" title={t('results.Step2EditRace')} />
            <Step key="ResultsWizardModalStep3" title={t('results.Step3Ranking')} />
          </StyledSteps>
          {wizardStep === 0 ? <ResultWizardStep0Input onMount={setInputForm} /> : null}
          {wizardStep >= 1 && raceWizardModel.current.existInEventor ? (
            <ResultWizardStep1ChooseRace onValidate={onValidate} visible={wizardStep === 1} onFailed={prev} />
          ) : null}
          {wizardStep === -100 ? (
            <ResultWizardStep1ChooseRaceRerun onFailed={prev} onSave={() => save(false)} onClose={onClose} />
          ) : null}
          {wizardStep >= 2 ? (
            <ResultWizardStep2EditRace onValidate={onValidate} visible={wizardStep === 2} onFailed={prev} />
          ) : null}
          {wizardStep === 3 ? <ResultWizardStep3Ranking saving={saving} onValidate={onValidate} /> : null}
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

export default ResultsWizardModal;
