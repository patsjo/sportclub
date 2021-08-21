import React, { Component } from 'react';
import { Button, Modal, Spin, Steps, message } from 'antd';
import { LeftOutlined, RightOutlined, PlusOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { observer, inject, Provider } from 'mobx-react';
import { getSnapshot } from 'mobx-state-tree';
import { withTranslation } from 'react-i18next';
import styled from 'styled-components';
import { RaceWizard, getLocalStorage } from '../../models/resultWizardModel';
import { PostJsonData } from '../../utils/api';
import InvoiceWizardStep0Input from './InvoiceWizardStep0Input';
import InvoiceWizardStep1ChooseRace from './InvoiceWizardStep1ChooseRace';
import InvoiceWizardStep2EditRace from './InvoiceWizardStep2EditRace';
import { SpinnerDiv } from '../styled/styled';

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
const InvoiceWizardModal = inject(
  'clubModel',
  'sessionModel'
)(
  observer(
    class InvoiceWizardModal extends Component {
      static propTypes = {
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
      };

      constructor(props) {
        super(props);
        this.raceWizardModel = RaceWizard.create(getLocalStorage());
        this.state = {
          wizardStep: -1,
          nextStepValid: true,
          inputForm: undefined,
          loaded: false,
          saving: false,
        };
      }

      componentDidMount() {
        const self = this;
        const { clubModel, sessionModel, onClose } = this.props;
        const url = clubModel.modules.find((module) => module.name === 'Results').queryUrl;

        const clubsPromise = PostJsonData(
          url,
          {
            iType: 'CLUBS',
          },
          true,
          sessionModel.authorizationHeader
        );

        Promise.all([clubsPromise])
          .then(([clubsJson]) => {
            clubModel.setRaceClubs(clubsJson);
            self.setState({
              wizardStep: 0,
              loaded: true,
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
        this.setState({ wizardStep, nextStepValid: false });
      }

      prev() {
        let wizardStep = this.state.wizardStep - 1;
        this.setState({
          wizardStep,
          nextStepValid: wizardStep === 0 || (wizardStep === 1 && this.raceWizardModel.selectedEventorId),
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
        const resultsModule = clubModel.modules.find((module) => module.name === 'Results');
        const saveUrl = raceEvent.eventId === -1 ? resultsModule.addUrl : resultsModule.updateUrl;
        const snapshot = getSnapshot(raceEvent);

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
            self.props.onClose();
          })
          .catch((e) => {
            message.error(e.message);
            self.setState({
              saving: false,
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
              maskClosable={false}
              title={t('results.InvoiceVerifier')}
              visible={self.props.open}
              onCancel={self.props.onClose}
              width="calc(100% - 80px)"
              style={{ top: 40, minWidth: 1250 }}
              footer={[
                <Button variant="contained" disabled={wizardStep < 1} onClick={() => self.prev()}>
                  <LeftOutlined />
                  {t('common.Previous')}
                </Button>,
                <Button
                  variant="contained"
                  disabled={!loaded || !nextStepValid}
                  loading={saving}
                  onClick={() => (wizardStep === 2 ? self.save() : self.next())}
                >
                  {wizardStep === 2 ? t('common.Save') : t('common.Next')}
                  {wizardStep === 2 ? null : <RightOutlined />}
                </Button>,
                <Button variant="contained" onClick={self.props.onClose} loading={false}>
                  {t('common.Cancel')}
                </Button>,
              ]}
            >
              <StyledModalContent>
                <StyledSteps current={wizardStep}>
                  <Step key="InvoiceWizardModalStep0" title={t('results.Step0Input')} />
                  <Step key="InvoiceWizardModalStep1" title={t('results.Step1ChooseRace')} />
                  <Step key="InvoiceWizardModalStep2" title={t('results.Step2EditRace')} />
                </StyledSteps>
                {wizardStep === 0 ? (
                  <InvoiceWizardStep0Input onMount={(form) => self.setState({ inputForm: form })} />
                ) : null}
                {wizardStep >= 1 && this.raceWizardModel.existInEventor ? (
                  <InvoiceWizardStep1ChooseRace
                    onValidate={self.onValidate.bind(self)}
                    visible={wizardStep === 1}
                    onFailed={() => self.prev()}
                  />
                ) : null}
                {wizardStep >= 2 ? (
                  <InvoiceWizardStep2EditRace
                    onValidate={self.onValidate.bind(self)}
                    visible={wizardStep === 2}
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

const InvoiceWizardModalWithI18n = withTranslation()(InvoiceWizardModal); // pass `t` function to App

export default InvoiceWizardModalWithI18n;
