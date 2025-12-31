import { LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Modal, Popconfirm, Space, Spin, Steps, Switch, Typography, message } from 'antd';
import { ModalFuncProps } from 'antd/lib/modal';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { MouseEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { IRaceClubsProps, IRaceEventProps } from '../../models/resultModel';
import { IRaceWizard, RaceWizard, getLocalStorage } from '../../models/resultWizardModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';
import {
  EventClassificationIdTypes,
  LightConditionTypes,
  PaymentTypes,
  SportCodeTypes,
  difficulties,
  distances,
  lightConditions
} from '../../utils/resultConstants';
import {
  ConvertSecondsToTime,
  ConvertTimeToSeconds,
  GetPointRunTo1000,
  GetRaceOldPoint,
  GetRacePoint,
  GetRanking
} from '../../utils/resultHelper';
import { ResultWizardStoreProvider } from '../../utils/resultWizardStore';
import { useSize } from '../../utils/useSize';
import FullScreenWizard from '../styled/FullscreenWizard';
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

const StyledFullWidth = styled.div`
  width: 100%;
  padding-bottom: 8px;
`;
const StyledModalContent = styled.div``;

const ResultsWizard = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const raceWizardModel = useRef<IRaceWizard>(new RaceWizard(getLocalStorage()));
  const [wizardStep, setWizardStep] = useState(0);
  const [nextStepValid, setNextStepValid] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contentOffsetHeight, setContentOffsetHeight] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { height: stepsHeight } = useSize(stepsRef, false, true, 'offset');
  const [ctrlAltDown, setCtrlAltDown] = useState(false);
  const [autoUpdateResultWithSameClass, setAutoUpdateResultWithSameClass] = useState(true);
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();

  const next: MouseEventHandler<HTMLElement> = useCallback(
    e => {
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
        ConfirmOverwriteOrEdit(t, modal).then((overwrite: boolean) => {
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
    [wizardStep, t, modal]
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
      const raceEventClassification = clubModel.raceClubs?.eventClassifications.find(
        ec => ec.eventClassificationId === raceEvent?.eventClassificationId
      );
      const resultsModule = clubModel.modules.find(module => module.name === 'Results');
      const saveUrl = raceEvent?.eventId === -1 ? resultsModule?.addUrl : resultsModule?.updateUrl;

      if (!saveUrl || !raceEvent) return;

      setSaving(true);
      raceEvent.results.forEach(result => {
        const eventClassification = !result.deviantEventClassificationId
          ? raceEventClassification
          : clubModel.raceClubs?.eventClassifications.find(
              ec => ec.eventClassificationId === result.deviantEventClassificationId
            );
        const raceClassClassification = eventClassification?.classClassifications.find(
          cc => cc.classClassificationId === result.classClassificationId
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
              difficulty: difficulties.black
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
        result.setNumberValueOrNull(
          'pointsOld',
          GetRaceOldPoint(eventClassification!, raceClassClassification!, result)
        );
        result.setNumberValueOrNull(
          'points1000',
          GetPointRunTo1000(eventClassification!, raceClassClassification!, result)
        );
      });

      raceEvent.teamResults.forEach(result => {
        const eventClassification = !result.deviantEventClassificationId
          ? raceEventClassification
          : clubModel.raceClubs?.eventClassifications.find(
              ec => ec.eventClassificationId === result.deviantEventClassificationId
            );
        const raceClassClassification = eventClassification?.classClassifications.find(
          cc => cc.classClassificationId === result.classClassificationId
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
              difficulty: difficulties.black
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

      PostJsonData<IRaceEventProps>(
        saveUrl,
        {
          ...snapshot,
          iType: 'EVENT',
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
    [
      clubModel.modules,
      clubModel.raceClubs?.eventClassifications,
      onClose,
      sessionModel.authorizationHeader,
      sessionModel.password,
      sessionModel.username
    ]
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

  const onNoEventorConnection = useCallback(() => {
    raceWizardModel.current.setBooleanValue('existInEventor', false);
    raceWizardModel.current.setNumberValueOrNull('selectedEventId', -1);
    setNextStepValid(raceWizardModel.current.raceEvent != null && raceWizardModel.current.raceEvent.valid);
    setWizardStep(2);
  }, []);

  const onKnownEventorId = useCallback(async () => {
    const eventorId = await SelectEventorIdConfirmModal(t, modal);
    if (eventorId == null) return;
    raceWizardModel.current.setBooleanValue('existInEventor', true);
    raceWizardModel.current.setNumberValueOrNull('selectedEventId', -1);
    raceWizardModel.current.setNumberValueOrNull('selectedEventorId', eventorId);
    setNextStepValid(
      raceWizardModel.current.selectedEventorId != null && raceWizardModel.current.selectedEventorRaceId != null
    );
    setWizardStep(1);
  }, [t, modal]);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      setCtrlAltDown(event.altKey && event.ctrlKey);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      setCtrlAltDown(event.altKey && event.ctrlKey);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return (
    <ResultWizardStoreProvider store={{ raceWizardModel: raceWizardModel.current }}>
      <FullScreenWizard
        title={t('results.Add')}
        footer={[
          wizardStep === 2 ? (
            <Space>
              <Switch checked={autoUpdateResultWithSameClass} onChange={setAutoUpdateResultWithSameClass} />
              <Typography.Text onClick={() => setAutoUpdateResultWithSameClass(oldValue => !oldValue)}>
                {t('results.AutoUpdateResultWithSameClass')}
              </Typography.Text>
            </Space>
          ) : null,
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
          wizardStep === 2 ? (
            <Button
              onClick={() => {
                const resultObject: IExtendedRaceResult = {
                  resultId: -100000 - Math.floor(Math.random() * 100000000),
                  competitorId: -1,
                  className: '',
                  fee: 0,
                  isAwardTouched: false
                };
                const allResultObject: Partial<IExtendedRaceResult> = {};
                const teamResultObject: IExtendedRaceTeamResult = {
                  teamResultId: -100000 - Math.floor(Math.random() * 100000000),
                  competitorId: -1,
                  className: '',
                  stage: -1,
                  stageText: '',
                  totalStages: 1
                };
                const allTeamResultObject: Partial<IExtendedRaceTeamResult> = {};
                let confirmModal: {
                  destroy: () => void;
                  update: (configUpdate: ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps)) => void;
                };

                // eslint-disable-next-line prefer-const
                confirmModal = modal.confirm({
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
                        autoUpdateResultWithSameClass={autoUpdateResultWithSameClass}
                        competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
                        onChange={changes => Object.assign(resultObject, changes)}
                        onChangeAll={changes => Object.assign(allResultObject, changes)}
                        onValidate={valid =>
                          confirmModal.update({
                            okButtonProps: {
                              disabled: !valid
                            }
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
                        autoUpdateResultWithSameClass={autoUpdateResultWithSameClass}
                        competitorsOptions={clubModel.raceClubs.selectedClub?.competitorsOptions ?? []}
                        onChange={changes => Object.assign(teamResultObject, changes)}
                        onChangeAll={changes => Object.assign(allTeamResultObject, changes)}
                        onValidate={valid =>
                          confirmModal.update({
                            okButtonProps: {
                              disabled: !valid
                            }
                          })
                        }
                      />
                    ) : null,
                  okText: t('common.Save'),
                  okButtonProps: {
                    disabled: true
                  },
                  cancelText: t('common.Cancel'),
                  onOk() {
                    if (raceWizardModel.current.raceEvent?.isRelay) {
                      raceWizardModel.current.raceEvent.addTeamResult(teamResultObject);
                      if (Object.keys(allTeamResultObject).length > 0) {
                        const resultsWithSameClass = raceWizardModel.current.raceEvent?.teamResults.filter(
                          r =>
                            r.className === teamResultObject.className &&
                            r.stage === teamResultObject.stage &&
                            r.teamResultId !== teamResultObject.teamResultId
                        );
                        resultsWithSameClass?.forEach(r => r.setValues(allTeamResultObject));
                      }
                    } else {
                      raceWizardModel.current.raceEvent?.addResult(resultObject);
                      if (Object.keys(allResultObject).length > 0) {
                        const resultsWithSameClass = raceWizardModel.current.raceEvent?.results.filter(
                          r => r.className === resultObject.className && r.resultId !== resultObject.resultId
                        );
                        resultsWithSameClass?.forEach(r => r.setValues(allResultObject));
                      }
                    }
                    onValidate(!!raceWizardModel.current.raceEvent?.valid);
                  }
                });
              }}
            >
              <PlusOutlined />
              {t('results.AddCompetitor')}
            </Button>
          ) : null,
          wizardStep === 3 && raceWizardModel.current.existInEventor ? (
            <Button disabled={!loaded || !nextStepValid} loading={saving} onClick={saveAndNextEvent}>
              <LeftOutlined />
              {t('common.SaveAndNextEvent')}
            </Button>
          ) : null,
          wizardStep === 0 ? (
            <Button onClick={onNoEventorConnection}>
              {t('results.AddWithoutEventor')}
              <RightOutlined />
            </Button>
          ) : null,
          wizardStep === 0 ? (
            <Button onClick={onKnownEventorId}>
              {t('results.KnownEventorId')}
              <RightOutlined />
            </Button>
          ) : null,
          <Button
            key={wizardStep === 0 && ctrlAltDown ? 'recalculateButton' : wizardStep === 3 ? 'saveButton' : 'nextButton'}
            type="primary"
            disabled={!loaded || !nextStepValid}
            loading={saving}
            onClick={e => (wizardStep === 3 ? save(true) : next(e))}
          >
            {wizardStep === 0 && ctrlAltDown
              ? t('common.Recalculate')
              : wizardStep === 3
                ? t('common.Save')
                : t('common.Next')}
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
          )
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
                { title: t('results.Step2EditRace') },
                { title: t('results.Step3Ranking') }
              ]}
            />
          </StyledFullWidth>
          {wizardStep === 0 ? <ResultWizardStep0Input /> : null}
          {wizardStep >= 1 && raceWizardModel.current.existInEventor ? (
            <ResultWizardStep1ChooseRace
              height={Math.max(128, contentOffsetHeight - (stepsHeight ?? 32))}
              visible={wizardStep === 1}
              onValidate={onValidate}
              onFailed={prev}
            />
          ) : null}
          {wizardStep === -100 ? (
            <ResultWizardStep1ChooseRaceRerun onFailed={prev} onSave={() => save(false)} onClose={onClose} />
          ) : null}
          {wizardStep >= 2 ? (
            <ResultWizardStep2EditRace
              height={Math.max(276, contentOffsetHeight - (stepsHeight ?? 32))}
              autoUpdateResultWithSameClass={autoUpdateResultWithSameClass}
              visible={wizardStep === 2}
              onValidate={onValidate}
              onFailed={prev}
            />
          ) : null}
          {wizardStep === 3 ? <ResultWizardStep3Ranking saving={saving} onValidate={onValidate} /> : null}
          {!loaded ? (
            <SpinnerDiv>
              <Spin size="large" />
            </SpinnerDiv>
          ) : null}
        </StyledModalContent>
      </FullScreenWizard>
      {contextHolder}
    </ResultWizardStoreProvider>
  );
});

export default ResultsWizard;
