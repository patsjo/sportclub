import React, { Component } from "react";
import { Button, Icon, Modal, Spin, Steps, message } from "antd";
import PropTypes from "prop-types";
import { observer, inject, Provider } from "mobx-react";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import { RaceWizard, getLocalStorage } from "../../models/resultWizardModel";
import { PostJsonData } from "../../utils/api";
import ResultWizardStep0Input from "./ResultsWizardStep0Input";
import ResultWizardStep1ChooseRace from "./ResultsWizardStep1ChooseRace";
import ResultWizardStep2EditRace from "./ResultsWizardStep2EditRace";

const StyledModalContent = styled.div``;
const StyledSteps = styled(Steps)`
  &&& {
    margin-bottom: 16px;
  }
`;
const SpinnerDiv = styled.div`
  text-align: center;
  width: 100%;
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
          inputForm: undefined,
          loaded: false
        };
      }

      componentDidMount() {
        const self = this;
        const { clubModel, sessionModel, onClose } = this.props;
        const url = clubModel.modules.find(module => module.name === "Results").queryUrl;

        PostJsonData(
          url,
          {
            iType: "CLUBS"
          },
          true,
          sessionModel.authorizationHeader
        )
          .then(clubsJson => {
            clubModel.setRaceClubs(clubsJson);
            self.setState({
              wizardStep: 0,
              loaded: true
            });
          })
          .catch(e => {
            message.error(e.message);
            onClose && onClose();
          });
      }

      next() {
        let wizardStep = this.state.wizardStep + 1;
        if (wizardStep === 1 && !this.raceWizardModel.existInEventor) {
          wizardStep++;
        }
        this.setState({ wizardStep });
      }

      prev() {
        let wizardStep = this.state.wizardStep - 1;
        if (wizardStep === 1 && !this.raceWizardModel.existInEventor) {
          wizardStep--;
        }
        this.setState({ wizardStep });
      }

      save() {
        this.props.onClose();
      }

      render() {
        const self = this;
        const { t } = self.props;
        const { wizardStep, loaded } = self.state;

        return (
          <Provider raceWizardModel={this.raceWizardModel}>
            <Modal
              closable={false}
              centered={true}
              title={t("results.Add")}
              visible={self.props.open}
              onCancel={self.props.onClose}
              width="calc(100% - 80px)"
              footer={[
                <Button variant="contained" disabled={wizardStep < 1} onClick={() => self.prev()}>
                  <Icon type="left" />
                  {t("common.Previous")}
                </Button>,
                <Button
                  variant="contained"
                  disabled={
                    !loaded || !(wizardStep === 0 || (wizardStep === 1 && this.raceWizardModel.selectedEventorId))
                  }
                  onClick={() => (wizardStep === 3 ? self.save() : self.next())}
                >
                  {wizardStep === 3 ? t("common.Save") : t("common.Next")}
                  {wizardStep === 3 ? null : <Icon type="right" />}
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
                  <Step key="ResultsWizardModalStep3" title={t("results.Step3SaveRace")} />
                </StyledSteps>
                {wizardStep === 0 ? (
                  <ResultWizardStep0Input onMount={form => self.setState({ inputForm: form })} />
                ) : null}
                {wizardStep >= 1 ? (
                  <ResultWizardStep1ChooseRace visible={wizardStep === 1} onFailed={() => self.prev()} />
                ) : null}
                {wizardStep >= 2 ? (
                  <ResultWizardStep2EditRace visible={wizardStep === 2} onFailed={() => self.prev()} />
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
