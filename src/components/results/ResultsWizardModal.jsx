import React, { Component } from "react";
import { Button, Modal, Spin, Steps, message } from "antd";
import { LeftOutlined, RightOutlined, PlusOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import { observer, inject, Provider } from "mobx-react";
import { getSnapshot } from "mobx-state-tree";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import { RaceWizard, getLocalStorage } from "../../models/resultWizardModel";
import { PostJsonData } from "../../utils/api";
import ResultWizardStep0Input from "./ResultsWizardStep0Input";
import ResultWizardStep1ChooseRace from "./ResultsWizardStep1ChooseRace";
import ResultWizardStep2EditRace from "./ResultsWizardStep2EditRace";
import ResultWizardStep3Ranking from "./ResultsWizardStep3Ranking";
import { SpinnerDiv, StyledIcon } from "../styled/styled";
import EditResultIndividual from "./EditResultIndividual";
import EditResultRelay from "./EditResultRelay";
import { GetRanking, GetRacePoint, GetRaceOldPoint, GetPointRunTo1000 } from "../../utils/resultHelper";
import { ConfirmOverwriteOrEdit } from "./ConfirmOverwriteOrEditPromise";

const { info } = Modal;
const StyledModalContent = styled.div``;
const StyledSteps = styled(Steps)`
  &&& {
    margin-bottom: 16px;
  }
`;
const { Step } = Steps;

// @inject("clubModel")
// @observer
const ResultsWizardModal = inject(
  "clubModel",
  "sessionModel"
)(
  observer(
    class ResultsWizardModal extends Component {
      static propTypes = {
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.raceWizardModel = RaceWizard.create(getLocalStorage());
        this.state = {
          wizardStep: -1,
          nextStepValid: true,
          inputForm: undefined,
          loaded: false,
          saving: false
        };
      }

      componentDidMount() {
        const self = this;
        const { clubModel, sessionModel, onClose } = this.props;
        const url = clubModel.modules.find((module) => module.name === "Results").queryUrl;

        const clubsPromise = PostJsonData(
          url,
          {
            iType: "CLUBS"
          },
          true,
          sessionModel.authorizationHeader
        );

        Promise.all([clubsPromise])
          .then(([clubsJson]) => {
            clubModel.setRaceClubs(clubsJson);
            self.setState({
              wizardStep: 0,
              loaded: true
            });
          })
          .catch((e) => {
            message.error(e.message);
            onClose && onClose();
          });
      }

      next() {
        const self = this;
        let wizardStep = this.state.wizardStep + 1;
        if (wizardStep === 1 && !this.raceWizardModel.existInEventor) {
          wizardStep++;
        }
        if (wizardStep === 2 && this.raceWizardModel.overwrite && this.raceWizardModel.selectedEventId > 0) {
          ConfirmOverwriteOrEdit(this.props.t).then((overwrite) => {
            self.raceWizardModel.setValue("overwrite", overwrite);
            self.setState({ wizardStep, nextStepValid: false });
          });
          return;
        }
        this.setState({ wizardStep, nextStepValid: false });
      }

      prev() {
        let wizardStep = this.state.wizardStep - 1;
        if (wizardStep === 1 && !this.raceWizardModel.existInEventor) {
          wizardStep--;
        }
        this.setState({
          wizardStep,
          nextStepValid:
            wizardStep === 0 ||
            (wizardStep === 1 && this.raceWizardModel.selectedEventorId) ||
            (wizardStep === 2 && this.raceWizardModel.raceEvent && this.raceWizardModel.raceEvent.valid)
        });
      }

      onValidate(valid) {
        this.setState({ nextStepValid: valid });
      }

      save() {
        const self = this;
        this.setState({ saving: true });
        const { clubModel, sessionModel } = this.props;
        const { raceEvent } = this.raceWizardModel;
        const raceEventClassification = clubModel.raceClubs.eventClassifications.find(
          (ec) => ec.eventClassificationId === raceEvent.eventClassificationId
        );
        const resultsModule = clubModel.modules.find((module) => module.name === "Results");
        const saveUrl = raceEvent.eventId === -1 ? resultsModule.addUrl : resultsModule.updateUrl;

        raceEvent.results.forEach((result) => {
          const eventClassification = !result.deviantEventClassificationId
            ? raceEventClassification
            : clubModel.raceClubs.eventClassifications.find(
                (ec) => ec.eventClassificationId === result.deviantEventClassificationId
              );
          const raceClassClassification = eventClassification.classClassifications.find(
            (cc) => cc.classClassificationId === result.classClassificationId
          );

          result.setValue(
            "ranking",
            GetRanking(
              raceEvent.rankingBasetimePerKilometer,
              raceEvent.rankingBasepoint,
              result,
              raceEvent.sportCode,
              raceEvent.raceLightCondition
            )
          );
          result.setValue("points", GetRacePoint(eventClassification, raceClassClassification, result));
          result.setValue("pointsOld", GetRaceOldPoint(eventClassification, raceClassClassification, result));
          result.setValue("points1000", GetPointRunTo1000(eventClassification, raceClassClassification, result));
        });

        raceEvent.teamResults.forEach((result) => {
          const eventClassification = !result.deviantEventClassificationId
            ? raceEventClassification
            : clubModel.raceClubs.eventClassifications.find(
                (ec) => ec.eventClassificationId === result.deviantEventClassificationId
              );
          const raceClassClassification = eventClassification.classClassifications.find(
            (cc) => cc.classClassificationId === result.classClassificationId
          );

          result.setValue(
            "ranking",
            GetRanking(
              raceEvent.rankingBasetimePerKilometer,
              raceEvent.rankingBasepoint,
              result,
              raceEvent.sportCode,
              raceEvent.raceLightCondition
            )
          );
          result.setValue("points1000", GetPointRunTo1000(eventClassification, raceClassClassification, result));
        });

        const snapshot = getSnapshot(raceEvent);
        const data = {
          ...snapshot,
          results: JSON.stringify(snapshot.results),
          teamResults: JSON.stringify(snapshot.teamResults)
        };

        PostJsonData(
          saveUrl,
          {
            ...data,
            iType: "EVENT",
            username: sessionModel.username,
            password: sessionModel.password,
            jsonResponse: true
          },
          true,
          sessionModel.authorizationHeader
        )
          .then(() => {
            self.props.onClose();
          })
          .catch((e) => {
            message.error(e.message);
            self.setState({
              saving: false
            });
          });
      }

      render() {
        const self = this;
        const { t, clubModel } = self.props;
        const { wizardStep, loaded, nextStepValid, saving } = self.state;

        return (
          <Provider raceWizardModel={self.raceWizardModel}>
            <Modal
              closable={false}
              title={t("results.Add")}
              visible={self.props.open}
              onCancel={self.props.onClose}
              width="calc(100% - 80px)"
              style={{ minWidth: 1250 }}
              footer={[
                <Button variant="contained" disabled={wizardStep < 1} onClick={() => self.prev()}>
                  <LeftOutlined />
                  {t("common.Previous")}
                </Button>,
                <Button
                  variant="contained"
                  style={wizardStep === 2 ? {} : { display: "none" }}
                  onClick={() => {
                    const resultObject = self.raceWizardModel.raceEvent.isRelay
                      ? { teamResultId: -1000 - Math.floor(Math.random() * 100000000) }
                      : { resultId: -1000 - Math.floor(Math.random() * 100000000) };
                    let confirmModal;
                    confirmModal = info({
                      width: 800,
                      icon: <StyledIcon type="plus" />,
                      title: t("results.AddCompetitor"),
                      content: !self.raceWizardModel.raceEvent.isRelay ? (
                        <EditResultIndividual
                          clubModel={clubModel}
                          paymentModel={self.raceWizardModel.raceEvent.paymentModel}
                          eventClassificationId={self.raceWizardModel.raceEvent.eventClassificationId}
                          result={resultObject}
                          results={self.raceWizardModel.raceEvent.results}
                          competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
                          onValidate={(valid) =>
                            confirmModal.update({
                              okButtonProps: {
                                disabled: !valid
                              }
                            })
                          }
                        />
                      ) : (
                        <EditResultRelay
                          clubModel={clubModel}
                          raceDate={self.raceWizardModel.raceEvent.raceDate}
                          eventClassificationId={self.raceWizardModel.raceEvent.eventClassificationId}
                          raceLightCondition={self.raceWizardModel.raceEvent.raceLightCondition}
                          result={resultObject}
                          results={self.raceWizardModel.raceEvent.teamResults}
                          competitorsOptions={clubModel.raceClubs.selectedClub.competitorsOptions}
                          onValidate={(valid) =>
                            confirmModal.update({
                              okButtonProps: {
                                disabled: !valid
                              }
                            })
                          }
                        />
                      ),
                      okText: t("common.Save"),
                      okButtonProps: {
                        disabled: true
                      },
                      cancelText: t("common.Cancel"),
                      onOk() {
                        if (self.raceWizardModel.raceEvent.isRelay) {
                          self.raceWizardModel.raceEvent.addTeamResult(resultObject);
                        } else {
                          self.raceWizardModel.raceEvent.addResult(resultObject);
                        }
                      }
                    });
                  }}
                >
                  <PlusOutlined />
                  {t("results.AddCompetitor")}
                </Button>,
                <Button
                  variant="contained"
                  disabled={!loaded || !nextStepValid}
                  loading={saving}
                  onClick={() => (wizardStep === 3 ? self.save() : self.next())}
                >
                  {wizardStep === 3 ? t("common.Save") : t("common.Next")}
                  {wizardStep === 3 ? null : <RightOutlined />}
                </Button>,
                <Button variant="contained" onClick={self.props.onClose} loading={false}>
                  {t("common.Cancel")}
                </Button>
              ]}
            >
              <StyledModalContent>
                <StyledSteps current={wizardStep}>
                  <Step key="ResultsWizardModalStep0" title={t("results.Step0Input")} />
                  <Step key="ResultsWizardModalStep1" title={t("results.Step1ChooseRace")} />
                  <Step key="ResultsWizardModalStep2" title={t("results.Step2EditRace")} />
                  <Step key="ResultsWizardModalStep3" title={t("results.Step3Ranking")} />
                </StyledSteps>
                {wizardStep === 0 ? (
                  <ResultWizardStep0Input onMount={(form) => self.setState({ inputForm: form })} />
                ) : null}
                {wizardStep >= 1 && this.raceWizardModel.existInEventor ? (
                  <ResultWizardStep1ChooseRace
                    onValidate={self.onValidate.bind(self)}
                    visible={wizardStep === 1}
                    onFailed={() => self.prev()}
                  />
                ) : null}
                {wizardStep >= 2 ? (
                  <ResultWizardStep2EditRace
                    onValidate={self.onValidate.bind(self)}
                    visible={wizardStep === 2}
                    onFailed={() => self.prev()}
                  />
                ) : null}
                {wizardStep === 3 ? (
                  <ResultWizardStep3Ranking saving={saving} onValidate={self.onValidate.bind(self)} />
                ) : null}
                {!loaded ? (
                  <SpinnerDiv>
                    <Spin size="large" />
                  </SpinnerDiv>
                ) : null}
              </StyledModalContent>
            </Modal>
          </Provider>
        );
      }
    }
  )
);

const ResultsWizardModalWithI18n = withTranslation()(ResultsWizardModal); // pass `t` function to App

export default ResultsWizardModalWithI18n;
