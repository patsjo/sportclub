import { AuditOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react';
import React, { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useMobxStore } from 'utils/mobxStore';
import MenuItem from '../MenuItem';
const ResultsWizardModal = lazy(() => import('../../results/ResultsWizardModal'));
const InvoiceWizardModal = lazy(() => import('../../results/InvoiceWizardModal'));

const ResultsSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const resultsModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'Results'), []);
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
        icon={'ResultsIcon'}
        name={t('results.Latest')}
        disabled={!sessionModel.loggedIn}
        isSubMenu
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
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
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(history, '/results/individual');
        }}
      />
      <MenuItem
        key={'menuItem#resultsAdd'}
        icon="plus"
        name={t('results.Add')}
        disabled={!resultsModule?.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
        isSubMenu
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddResultsWizardModalIsOpen(true), 0);
        }}
      />
      <MenuItem
        key={'menuItem#resultsInvoiceVerifier'}
        icon={<AuditOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />}
        name={t('results.InvoiceVerifier')}
        disabled={!resultsModule?.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
        isSubMenu
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
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
          globalStateModel.setRightMenuVisible(false);
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
          globalStateModel.setRightMenuVisible(false);
          setTimeout(() => setAddOldResultsWizardModalIsOpen(true), 0);
        }}
      />
    </>
  );
});

export default ResultsSubMenus;
