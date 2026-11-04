import { message } from 'antd';
import dayjs from 'dayjs';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ICupCategory, ICupRaceProps, ICupResultProps } from '../../models/cupModel';
import { IResultListType } from '../../models/iof.xsd-3.0';
import { IMobxClubModel } from '../../models/mobxClubModel';
import { PostJsonData } from '../../utils/api';
import { filterToCupClasses, iofResultListToCupResults } from '../../utils/cupHelper';
import { dateFormat } from '../../utils/formHelper';
import { correctPhpEventorProxyXmlResponseForResult } from '../../utils/iofXsd30ResponseHelper';
import { useMobxStore } from '../../utils/mobxStore';
import { useCupApi } from './useCup';

export type CupEventorRace = Pick<ICupRaceProps, 'cupRaceId' | 'eventorId' | 'eventorRaceId' | 'useTotalResult'>;

/** The full result list of a race from Eventor (everyone, all clubs), as cup results */
export const fetchEventorCupResults = async (
  clubModel: IMobxClubModel,
  race: CupEventorRace
): Promise<ICupResultProps[]> => {
  if (!clubModel.eventor || !clubModel.eventorCorsProxy || !race.eventorId) return [];
  const response = await PostJsonData<IResultListType>(
    clubModel.eventorCorsProxy,
    {
      csurl: encodeURIComponent(
        `${clubModel.eventor.iofResultUrl}?eventId=${race.eventorId}` +
          (race.eventorRaceId ? `&eventRaceId=${race.eventorRaceId}` : '') +
          `&includeSplitTimes=false&totalResult=${race.useTotalResult ? 'true' : 'false'}`
      )
    },
    true
  );
  return iofResultListToCupResults(
    correctPhpEventorProxyXmlResponseForResult(response),
    race.cupRaceId,
    race.eventorRaceId,
    race.useTotalResult,
    clubModel.eventor.organisationId
  );
};

/**
 * For seasons with all participants: fetches the result lists from Eventor and saves them to the cup.
 * Participants from other clubs are only saved in the cup, never in the clubs own result tables.
 * The backend keeps the club members from the clubs own results, when the race is imported.
 */
export const useCupEventorImport = () => {
  const { t } = useTranslation();
  const { clubModel } = useMobxStore();
  const { save } = useCupApi();

  return useCallback(
    async (races: (CupEventorRace & { raceDate?: string; categories?: ICupCategory[]; seasonYear?: number })[]) => {
      const today = dayjs().format(dateFormat);
      // No results in Eventor for races that has not been run yet
      const toImport = races.filter(r => r.eventorId && (!r.raceDate || r.raceDate <= today));
      if (!toImport.length) return;

      const hide = message.loading(t('cup.FetchingEventorResults'), 0);
      let nofSaved = 0;
      const failed: number[] = [];
      for (const race of toImport) {
        try {
          // Only the classes in the categories of the season
          const results = filterToCupClasses(
            await fetchEventorCupResults(clubModel, race),
            race.categories,
            race.seasonYear
          );
          if (results.length === 0) continue;
          const response = await save<{ nofSaved: number }>({
            iType: 'EVENTOR_RESULTS',
            iCupRaceId: race.cupRaceId,
            iResults: results
          });
          nofSaved += response?.nofSaved ?? 0;
        } catch {
          failed.push(race.cupRaceId);
        }
      }
      hide();
      if (nofSaved) message.success(t('cup.EventorResultsSaved', { count: nofSaved }));
      if (failed.length) message.warning(t('cup.EventorResultsFailed', { count: failed.length }));
    },
    [clubModel, save, t]
  );
};
