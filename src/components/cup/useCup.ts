import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  ICupProps,
  ICupResultProps,
  ICupSeasonProps,
  ICupSeasonSettings,
  normalizeSeasonSettings
} from '../../models/cupModel';
import { PostJsonData } from '../../utils/api';
import { useMobxStore } from '../../utils/mobxStore';

const normalizeCup = (cup: ICupProps): ICupProps => ({
  ...cup,
  seasons: (cup.seasons ?? []).map((season): ICupSeasonProps => ({
    ...season,
    settings: normalizeSeasonSettings(season.settings as Partial<ICupSeasonSettings> | null),
    races: season.races ?? [],
    reports: season.reports ?? []
  }))
});

const basicAuthorization = (username?: string, password?: string) => ({
  Authorization: 'Basic ' + window.btoa(`${username}:${password}`)
});

/** Calls the cup module, query or save/delete, with the login of the session */
export const useCupApi = () => {
  const { clubModel, sessionModel } = useMobxStore();
  const cupModule = clubModel.module('Cup');
  const queryUrl = cupModule?.queryUrl;
  const updateUrl = cupModule?.updateUrl;
  const deleteUrl = cupModule?.deleteUrl;
  // Primitive dependencies, sessionModel.authorizationHeader is a new object every time it is read
  const { username, password } = sessionModel;

  const query = useCallback(
    <T>(data: Record<string, unknown>, throwError = true) =>
      queryUrl
        ? PostJsonData<T>(queryUrl, data, throwError, basicAuthorization(username, password))
        : Promise.resolve(undefined),
    [queryUrl, username, password]
  );

  const save = useCallback(
    <T>(data: Record<string, unknown>) =>
      updateUrl
        ? PostJsonData<T>(updateUrl, { ...data, username, password }, true, basicAuthorization(username, password))
        : Promise.reject(new Error('Missing cup updateUrl')),
    [updateUrl, password, username]
  );

  const remove = useCallback(
    (data: Record<string, unknown>) =>
      deleteUrl
        ? PostJsonData(deleteUrl, { ...data, username, password }, true, basicAuthorization(username, password))
        : Promise.reject(new Error('Missing cup deleteUrl')),
    [deleteUrl, password, username]
  );

  return { query, save, remove, enabled: !!queryUrl };
};

export const showCupError = (e: unknown) => {
  const msg = (e as { message?: string } | undefined)?.message;
  if (msg) message.error(msg);
};

const cupsChangedEvent = 'sportclub-cups-changed';
/** Tells the toolbar and menus that a cup is added, changed or deleted */
export const notifyCupsChanged = () => window.dispatchEvent(new Event(cupsChangedEvent));

/** All cups, inactive cups only for admins */
export const useCups = (includeInactive: boolean) => {
  const { query } = useCupApi();
  const [cups, setCups] = useState<ICupProps[]>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onChanged = () => setReloadKey(k => k + 1);
    window.addEventListener(cupsChangedEvent, onChanged);
    return () => window.removeEventListener(cupsChangedEvent, onChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    query<ICupProps[]>({ iType: 'CUPS', iIncludeInactive: includeInactive }, false).then(response => {
      if (!cancelled) setCups(Array.isArray(response) ? response : []);
    });
    return () => {
      cancelled = true;
    };
  }, [includeInactive, query, reloadKey]);

  return { cups, reload: useCallback(() => setReloadKey(k => k + 1), []) };
};

/** One cup with its seasons, races and reports */
export const useCup = (slug: string | undefined, reloadDependency: unknown) => {
  const { query } = useCupApi();
  const [cup, setCup] = useState<ICupProps | null>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    query<ICupProps>({ iType: 'CUP', iSlug: slug })
      .then(response => {
        if (!cancelled) setCup(response ? normalizeCup(response) : null);
      })
      .catch(() => {
        if (!cancelled) setCup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [query, slug, reloadKey, reloadDependency]);

  return { cup, reload: useCallback(() => setReloadKey(k => k + 1), []) };
};

/** All results in the races of a season */
export const useCupSeasonResults = (seasonId: number | undefined, reloadDependency: unknown) => {
  const { query } = useCupApi();
  // Kept together with the season, so the results of another season are never shown
  const [loaded, setLoaded] = useState<{ seasonId: number; results: ICupResultProps[] }>();

  useEffect(() => {
    if (seasonId == null) return;
    let cancelled = false;
    query<ICupResultProps[]>({ iType: 'RESULTS', iSeasonId: seasonId })
      .then(response => {
        if (!cancelled) setLoaded({ seasonId, results: Array.isArray(response) ? response : [] });
      })
      .catch(e => {
        showCupError(e);
        if (!cancelled) setLoaded({ seasonId, results: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [query, seasonId, reloadDependency]);

  return loaded && loaded.seasonId === seasonId ? loaded.results : undefined;
};
