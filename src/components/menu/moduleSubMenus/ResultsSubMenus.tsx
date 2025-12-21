import { AreaChartOutlined, AuditOutlined } from '@ant-design/icons';
import { message } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IRaceClubsProps, IRaceCompetitor } from '../../../models/resultModel';
import { PostJsonData } from '../../../utils/api';
import { useMobxStore } from '../../../utils/mobxStore';
import MenuItem from '../MenuItem';

const RenounceModal = lazy(() => import('../../results/RenounceModal'));

const ResultsSubMenus = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const resultsModule = React.useMemo(
    () => clubModel.modules.find(module => module.name === 'Results'),
    [clubModel.modules]
  );
  const [renounceModalIsOpen, setRenounceModalIsOpen] = useState(false);
  const [competitor, setCompetitor] = useState<IRaceCompetitor>();
  const [loadingCompetitor, setLoadingCompetitor] = useState(true);
  const navigate = useNavigate();
  const daysSinceRenounce = useMemo(
    () => (!competitor?.excludeTime ? 0 : dayjs().diff(dayjs(competitor.excludeTime), 'days')),
    [competitor?.excludeTime]
  );

  const onRegretRenounce = useCallback(() => {
    const saveUrl = clubModel.modules.find(module => module.name === 'Results')?.updateUrl;
    if (!saveUrl) return;

    const oldCompetitor = competitor;
    setCompetitor(undefined);

    PostJsonData(
      saveUrl,
      {
        iType: 'COMPETITOR_REGRET_RENOUNCE',
        iCompetitorId: oldCompetitor?.competitorId,
        username: sessionModel.username,
        password: sessionModel.password
      },
      true,
      sessionModel.authorizationHeader
    )
      .then(() => {
        oldCompetitor?.regretRenounce();
        setCompetitor(oldCompetitor);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
        setCompetitor(oldCompetitor);
      });
  }, [sessionModel, competitor, clubModel.modules]);

  useEffect(() => {
    const url = clubModel.modules.find(module => module.name === 'Results')?.queryUrl;
    if (!url || !sessionModel.loggedIn || !sessionModel.eventorPersonId) return;

    setLoadingCompetitor(true);

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
          if (clubModel.raceClubs?.selectedClub) {
            setCompetitor(clubModel.raceClubs.selectedClub.competitorByEventorId(sessionModel.eventorPersonId!));
          }
        }
        setLoadingCompetitor(false);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
        setLoadingCompetitor(false);
      });
  }, [clubModel, sessionModel.authorizationHeader, sessionModel.eventorPersonId, sessionModel.loggedIn]);

  return (
    <>
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
        key={'menuItem#resultsStatistics'}
        isSubMenu
        icon={<AreaChartOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />}
        name={t('results.Statistics')}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/statistics');
        }}
      />
      <MenuItem
        key={'menuItem#results'}
        isSubMenu
        icon={'ResultsIcon'}
        name={t('results.Latest')}
        disabled={!sessionModel.loggedIn}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results');
        }}
      />
      <MenuItem
        key={'menuItem#resultsIndividual'}
        isSubMenu
        icon="user"
        name={t('results.Individual')}
        disabled={!sessionModel.loggedIn}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/individual');
        }}
      />
      <MenuItem
        key={'menuItem#resultsAdd'}
        isSubMenu
        icon="plus"
        name={t('results.Add')}
        disabled={!resultsModule?.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/import');
        }}
      />
      <MenuItem
        key={'menuItem#resultsInvoiceVerifier'}
        isSubMenu
        icon={<AuditOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />}
        name={t('results.InvoiceVerifier')}
        disabled={!resultsModule?.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/verifyinvoice');
        }}
      />
      <MenuItem
        key={'menuItem#resultsFees'}
        isSubMenu
        icon="euro"
        name={t('results.Invoices')}
        disabled={!sessionModel.loggedIn}
        onClick={() => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/fees');
        }}
      />
      {/*
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
      />*/}
      {sessionModel.loggedIn &&
      sessionModel.eventorPersonId &&
      (loadingCompetitor || (competitor && !competitor.excludeResults)) ? (
        <MenuItem
          key={'menuItem#resultsRenounce'}
          isSubMenu
          icon={loadingCompetitor ? 'loading' : 'frown'}
          name={t('results.Renounce')}
          disabled={loadingCompetitor}
          onClick={() => {
            globalStateModel.setRightMenuVisible(false);
            setTimeout(() => setRenounceModalIsOpen(true), 0);
          }}
        />
      ) : null}
      {sessionModel.loggedIn && sessionModel.eventorPersonId && competitor && competitor.excludeResults ? (
        <MenuItem
          key={'menuItem#resultsRegretRenounce'}
          isSubMenu
          icon="smile"
          name={t('results.RegretRenounce')}
          disabled={daysSinceRenounce < 30}
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
