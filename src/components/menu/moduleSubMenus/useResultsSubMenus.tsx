import { AreaChartOutlined, AuditOutlined } from '@ant-design/icons';
import { message } from 'antd';
import dayjs from 'dayjs';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IRaceClubsProps, IRaceCompetitor } from '../../../models/resultModel';
import { PostJsonData } from '../../../utils/api';
import { useMobxStore } from '../../../utils/mobxStore';
import { getMenuItem } from '../MenuItem';

const RenounceModal = lazy(() => import('../../results/RenounceModal'));

export const useResultsSubMenus = () => {
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
  const competitorExcludeTime = competitor?.excludeTime;
  const daysSinceRenounce = useMemo(
    () => (!competitorExcludeTime ? 0 : dayjs().diff(dayjs(competitorExcludeTime), 'days')),
    [competitorExcludeTime]
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
    const url = resultsModule?.queryUrl;
    if (!url || !sessionModel.loggedIn || !sessionModel.eventorPersonId) return;

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
  }, [
    clubModel,
    resultsModule?.queryUrl,
    sessionModel.authorizationHeader,
    sessionModel.eventorPersonId,
    sessionModel.loggedIn
  ]);

  return {
    renounceModal:
      renounceModalIsOpen && competitor ? (
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
      ) : null,
    resultsMenuItems: [
      getMenuItem(
        'menuItem#resultsStatistics',
        <AreaChartOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />,
        t('results.Statistics'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/statistics');
        },
        true
      ),
      getMenuItem(
        'menuItem#results',
        'ResultsIcon',
        t('results.Latest'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results');
        },
        true,
        1,
        !sessionModel.loggedIn
      ),
      getMenuItem(
        'menuItem#resultsIndividual',
        'user',
        t('results.Individual'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/individual');
        },
        true,
        1,
        !sessionModel.loggedIn
      ),
      getMenuItem(
        'menuItem#resultsAdd',
        'plus',
        t('results.Add'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/import');
        },
        true,
        1,
        !resultsModule?.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin
      ),
      getMenuItem(
        'menuItem#resultsInvoiceVerifier',
        <AuditOutlined style={{ verticalAlign: 'middle', fontSize: 18 }} />,
        t('results.InvoiceVerifier'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/verifyinvoice');
        },
        true,
        1,
        !resultsModule?.addUrl || !sessionModel.loggedIn || !sessionModel.isAdmin
      ),
      getMenuItem(
        'menuItem#resultsFees',
        'euro',
        t('results.Invoices'),
        () => {
          globalStateModel.setRightMenuVisible(false);
          globalStateModel.setDashboard(navigate, '/results/fees');
        },
        true,
        1,
        !sessionModel.loggedIn
      ),
      sessionModel.loggedIn &&
      sessionModel.eventorPersonId &&
      (loadingCompetitor || (competitor && !competitor.excludeResults))
        ? getMenuItem(
            'menuItem#resultsRenounce',
            loadingCompetitor ? 'loading' : 'frown',
            t('results.Renounce'),
            () => {
              globalStateModel.setRightMenuVisible(false);
              setTimeout(() => setRenounceModalIsOpen(true), 0);
            },
            true,
            1,
            loadingCompetitor
          )
        : null,
      sessionModel.loggedIn && sessionModel.eventorPersonId && competitor && competitor.excludeResults
        ? getMenuItem(
            'menuItem#resultsRegretRenounce',
            'smile',
            t('results.RegretRenounce'),
            () => {
              globalStateModel.setRightMenuVisible(false);
              setTimeout(() => onRegretRenounce(), 0);
            },
            true,
            1,
            daysSinceRenounce < 30
          )
        : null
    ].filter(item => item !== null)
  };
};
