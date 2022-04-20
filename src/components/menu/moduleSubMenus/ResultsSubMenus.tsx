import { AuditOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { observer } from 'mobx-react';
import { IRaceClubsSnapshotIn, IRaceCompetitor } from 'models/resultModel';
import moment from 'moment';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { PostJsonData } from 'utils/api';
import { useMobxStore } from 'utils/mobxStore';
import MenuItem from '../MenuItem';
const ResultsWizardModal = lazy(() => import('../../results/ResultsWizardModal'));
const InvoiceWizardModal = lazy(() => import('../../results/InvoiceWizardModal'));
const RenounceModal = lazy(() => import('../../results/RenounceModal'));

const ResultsSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const resultsModule = React.useMemo(() => clubModel.modules.find((module) => module.name === 'Results'), []);
  const [addResultsWizardModalIsOpen, setAddResultsWizardModalIsOpen] = useState(false);
  const [invoiceWizardModalIsOpen, setInvoiceWizardModalIsOpen] = useState(false);
  const [addOldResultsWizardModalIsOpen, setAddOldResultsWizardModalIsOpen] = useState(false);
  const [renounceModalIsOpen, setRenounceModalIsOpen] = useState(false);
  const [competitor, setCompetitor] = useState<IRaceCompetitor>();
  const [loadingCompetitor, setLoadingCompetitor] = useState(true);
  const history = useHistory();
  const daysSinceRenounce = useMemo(
    () => (!competitor?.excludeTime ? 0 : moment().diff(moment(competitor.excludeTime), 'days')),
    [competitor?.excludeTime]
  );

  const onRegretRenounce = useCallback(() => {
    const saveUrl = clubModel.modules.find((module) => module.name === 'Results')?.updateUrl;
    if (!saveUrl) return;

    const oldCompetitor = competitor;
    setCompetitor(undefined);

    PostJsonData(
      saveUrl,
      {
        iType: 'COMPETITOR_REGRET_RENOUNCE',
        iCompetitorId: oldCompetitor?.competitorId,
        username: sessionModel.username,
        password: sessionModel.password,
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(() => {
        oldCompetitor?.regretRenounce();
        setCompetitor(oldCompetitor);
      })
      .catch((e) => {
        message.error(e.message);
        setCompetitor(oldCompetitor);
      });
  }, [sessionModel, competitor, clubModel.modules]);

  useEffect(() => {
    const url = clubModel.modules.find((module) => module.name === 'Results')?.queryUrl;
    if (!url || !sessionModel.loggedIn || !sessionModel.eventorPersonId) return;

    setLoadingCompetitor(true);

    PostJsonData(
      url,
      {
        iType: 'CLUBS',
      },
      true,
      sessionModel.authorizationHeader
    )
      .then((clubsJson: IRaceClubsSnapshotIn) => {
        clubModel.setRaceClubs(clubsJson);
        if (clubModel.raceClubs?.selectedClub) {
          setCompetitor(clubModel.raceClubs.selectedClub.competitorByEventorId(sessionModel.eventorPersonId!));
        }
        setLoadingCompetitor(false);
      })
      .catch((e) => {
        message.error(e.message);
        setLoadingCompetitor(false);
      });
  }, [sessionModel.loggedIn]);

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
      {renounceModalIsOpen && competitor ? (
        <Suspense fallback={null}>
          <RenounceModal
            competitor={competitor}
            open={renounceModalIsOpen}
            onClose={() => {
              setRenounceModalIsOpen(false);
              setCompetitor(competitor);
            }}
          />
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
      {sessionModel.loggedIn &&
      sessionModel.eventorPersonId &&
      (loadingCompetitor || (competitor && !competitor.excludeResults)) ? (
        <MenuItem
          key={'menuItem#resultsRenounce'}
          icon={loadingCompetitor ? 'loading' : 'frown'}
          name={t('results.Renounce')}
          disabled={loadingCompetitor}
          isSubMenu
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            setTimeout(() => setRenounceModalIsOpen(true), 0);
          }}
        />
      ) : null}
      {sessionModel.loggedIn && sessionModel.eventorPersonId && competitor && competitor.excludeResults ? (
        <MenuItem
          key={'menuItem#resultsRegretRenounce'}
          icon="smile"
          name={t('results.RegretRenounce')}
          disabled={daysSinceRenounce < 30}
          isSubMenu
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            setTimeout(() => onRegretRenounce(), 0);
          }}
        />
      ) : null}
    </>
  );
});

export default ResultsSubMenus;
