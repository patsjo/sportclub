import React, { useState, lazy, Suspense } from 'react';
import { inject, observer } from 'mobx-react';
import { AuditOutlined } from '@ant-design/icons';
import MenuItem from '../MenuItem';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
const ResultsWizardModal = lazy(() => import('../../results/ResultsWizardModal'));
const InvoiceWizardModal = lazy(() => import('../../results/InvoiceWizardModal'));

const moduleName = 'Results';
const ResultsSubMenus = inject(
  'clubModel',
  'globalStateModel',
  'sessionModel'
)(
  observer((props) => {
    const { t } = useTranslation();
    const { clubModel, globalStateModel, sessionModel } = props;
    const moduleInfo = clubModel.module('Results');
    const [addResultsWizardModalIsOpen, setAddResultsWizardModalIsOpen] = useState(false);
    const [invoiceWizardModalIsOpen, setInvoiceWizardModalIsOpen] = useState(false);
    const [addOldResultsWizardModalIsOpen, setAddOldResultsWizardModalIsOpen] = useState(false);
    const history = useHistory();

    return (
      <>
        {addResultsWizardModalIsOpen ? (
          <Suspense fallback={null}>
            <ResultsWizardModal
              open={addResultsWizardModalIsOpen}
              onClose={() => setAddResultsWizardModalIsOpen(false)}
            />
          </Suspense>
        ) : null}
        {invoiceWizardModalIsOpen ? (
          <Suspense fallback={null}>
            <InvoiceWizardModal open={invoiceWizardModalIsOpen} onClose={() => setInvoiceWizardModalIsOpen(false)} />
          </Suspense>
        ) : null}
        <MenuItem
          key={'menuItem#results'}
          icon={moduleName + 'Icon'}
          name={t('results.Latest')}
          disabled={!sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            globalStateModel.setDashboard(history, '/results');
          }}
        />
        <MenuItem
          key={'menuItem#resultsIndividual'}
          icon="user"
          name={t('results.Individual')}
          disabled={!sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            globalStateModel.setDashboard(history, '/results/individual');
          }}
        />
        <MenuItem
          key={'menuItem#resultsAdd'}
          icon="plus"
          name={t('results.Add')}
          disabled={!moduleInfo.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            setTimeout(() => setAddResultsWizardModalIsOpen(true), 0);
          }}
        />
        <MenuItem
          key={'menuItem#resultsInvoiceVerifier'}
          icon={<AuditOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />}
          name={t('results.InvoiceVerifier')}
          disabled={!moduleInfo.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            setTimeout(() => setInvoiceWizardModalIsOpen(true), 0);
          }}
        />
        <MenuItem
          key={'menuItem#resultsFees'}
          icon="euro"
          name={t('results.FeeToClub')}
          disabled={!sessionModel.loggedIn}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            globalStateModel.setDashboard(history, '/results/fees');
          }}
        />
        <MenuItem
          key={'menuItem#resultsConvert'}
          icon="cloud-upload"
          name={t('results.Convert')}
          disabled={true || !sessionModel.loggedIn || !sessionModel.isAdmin}
          isSubMenu
          onClick={() => {
            globalStateModel.setValue('rightMenuVisible', false);
            setTimeout(() => setAddOldResultsWizardModalIsOpen(true), 0);
          }}
        />
      </>
    );
  })
);

export default ResultsSubMenus;
