import { message } from 'antd';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IRaceClubsProps } from '../../models/resultModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';

/**
 * The competitors an administrator can link a user to, the same list as on the competitors tab.
 * Use it in an observer component.
 */
export const useCompetitorOptions = (messageApi: ReturnType<typeof message.useMessage>[0]) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();

  useEffect(() => {
    const resultsUrl = clubModel.module('Results')?.queryUrl;
    if (clubModel.raceClubs || !resultsUrl || !sessionModel.isAdmin) return;
    PostJsonData<IRaceClubsProps>(resultsUrl, { iType: 'CLUBS' }, true, sessionModel.authorizationHeader)
      .then(clubsJson => {
        if (clubsJson) clubModel.setRaceClubs(clubsJson);
      })
      .catch(e => messageApi.warning(`${t('accounts.CompetitorsLoadFailed')} (${resultsUrl}: ${e?.message})`));
  }, [clubModel, messageApi, sessionModel.authorizationHeader, sessionModel.isAdmin, t]);

  const selectedClub = clubModel.raceClubs?.selectedClub;
  const competitorOptions = useMemo(() => selectedClub?.competitorsOptions ?? [], [selectedClub?.competitorsOptions]);
  const competitorName = (competitorId?: number | null) =>
    competitorId ? selectedClub?.competitorById(competitorId)?.fullName : undefined;

  return { competitorOptions, competitorName };
};
