import React, { Component } from "react";
import { Button, Icon, Modal, Spin, Steps, message } from "antd";
import PropTypes from "prop-types";
import { observer, inject, Provider } from "mobx-react";
import { getSnapshot } from "mobx-state-tree";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import { EventSelectorWizard, getLocalStorage } from "../../../models/eventSelectorWizardModel";
import { PostJsonData } from "../../../utils/api";
import EventSelectorWizardStep0Input from "./EventSelectorWizardStep0Input";
import EventSelectorWizardStep1ChooseRace from "./EventSelectorWizardStep1ChooseRace";
import { SpinnerDiv } from "../../styled/styled";

const StyledModalContent = styled.div``;
const StyledSteps = styled(Steps)`
  &&& {
    margin-bottom: 16px;
  }
`;
const { Step } = Steps;

// @inject("clubModel")
// @observer
const EventSelectorWizardModal = inject(
  "clubModel",
  "sessionModel"
)(
  observer(
    class EventSelectorWizardModal extends Component {
      static propTypes = {
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired
      };

      constructor(props) {
        super(props);
        this.eventSelectorWizardModel = EventSelectorWizard.create(getLocalStorage());
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
        const url = clubModel.modules.find(module => module.name === "Results").queryUrl;

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
          .catch(e => {
            message.error(e.message);
            onClose && onClose();
          });
      }

      next() {
        let wizardStep = this.state.wizardStep + 1;
        this.setState({ wizardStep, nextStepValid: false });
      }

      prev() {
        let wizardStep = this.state.wizardStep - 1;
        this.setState({
          wizardStep,
          nextStepValid: true
        });
      }

      onValidate(valid) {
        this.setState({ nextStepValid: valid });
      }

      save() {
        const self = this;
        this.setState({ saving: true });
        const { sessionModel, clubModel } = this.props;

        const calendarModule = clubModel.modules.find(module => module.name === "Calendar");
        const saveUrl = calendarModule.addUrl;
        const snapshot = getSnapshot(this.eventSelectorWizardModel);
        const data = {
          queryStartDate: snapshot.queryStartDate,
          queryEndDate: snapshot.queryEndDate,
          events: JSON.stringify(snapshot.selectedEvents)
        };

        PostJsonData(
          saveUrl,
          {
            ...data,
            iType: "EVENTS",
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
          .catch(e => {
            message.error(e.message);
            self.setState({
              saving: false
            });
          });
      }

      render() {
        const self = this;
        const { t } = self.props;
        const { wizardStep, loaded, nextStepValid, saving } = self.state;

        return (
          <Provider eventSelectorWizardModel={self.eventSelectorWizardModel}>
            <Modal
              closable={false}
              centered={true}
              title={t("calendar.EventSelector")}
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
                  disabled={!loaded || !nextStepValid}
                  loading={saving}
                  onClick={() => (wizardStep === 1 ? self.save() : self.next())}
                >
                  {wizardStep === 1 ? t("common.Save") : t("common.Next")}
                  {wizardStep === 1 ? null : <Icon type="right" />}
                </Button>,
                <Button variant="contained" onClick={self.props.onClose} loading={false}>
                  {t("common.Cancel")}
                </Button>
              ]}
            >
              <StyledModalContent>
                <StyledSteps current={wizardStep}>
                  <Step key="EventSelectorWizardModalStep0" title={t("results.Step0Input")} />
                  <Step key="EventSelectorWizardModalStep1" title={t("results.Step1ChooseRace")} />
                </StyledSteps>
                {wizardStep === 0 ? (
                  <EventSelectorWizardStep0Input onMount={form => self.setState({ inputForm: form })} />
                ) : null}
                {wizardStep >= 1 ? (
                  <EventSelectorWizardStep1ChooseRace
                    onValidate={self.onValidate.bind(self)}
                    visible={wizardStep === 1}
                    onFailed={() => self.prev()}
                  />
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

const EventSelectorWizardModalWithI18n = withTranslation()(EventSelectorWizardModal); // pass `t` function to App

export default EventSelectorWizardModalWithI18n;
