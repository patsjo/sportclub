import { message } from 'antd';
import { TFunction } from 'i18next';
import { IMobxClubModel } from '../models/mobxClubModel';
import { ISessionInfo, ISessionModel, readOldStoredPassword, removeOldStoredPassword } from '../models/sessionModel';
import { FetchError, PostJsonData } from './api';

const oauthParams = ['oauthCode', 'oauthError'];

/** The current page without the parameters from an earlier Google/Facebook login */
const currentUrlWithoutOAuth = () => {
  const url = new URL(window.location.href);
  oauthParams.forEach(param => url.searchParams.delete(param));
  return url.toString();
};

/** oauth/google.php or oauth/facebook.php, that returns to this page */
export const oauthLoginUrl = (providerUrl: string, rememberLogin: boolean) =>
  `${providerUrl}${providerUrl.includes('?') ? '&' : '?'}returnUrl=${encodeURIComponent(
    currentUrlWithoutOAuth()
  )}&remember=${rememberLogin ? 1 : 0}`;

/** The one time code (or error) Google/Facebook returned with, removed from the address bar */
const takeOAuthReturn = (): { code?: string; error?: string } => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('oauthCode') ?? undefined;
  const error = params.get('oauthError') ?? undefined;
  if (code || error) window.history.replaceState(window.history.state, '', currentUrlWithoutOAuth());
  return { code, error };
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const isRejected = (error: unknown) => error instanceof FetchError && (error.status === 401 || error.status === 403);

const postLogin = (clubModel: IMobxClubModel, data: object, headers: Record<string, string> = {}) =>
  PostJsonData<ISessionInfo>(clubModel.loginUrl, data, true, { ...headers, 'X-Requested-With': 'XMLHttpRequest' }, 1);

/**
 * When the page starts: finishes a Google/Facebook login, checks the saved token,
 * or changes a password saved by an old version into a token.
 */
export const restoreLogin = async (
  clubModel: IMobxClubModel,
  sessionModel: ISessionModel,
  messageApi: ReturnType<typeof message.useMessage>[0],
  t: TFunction
) => {
  const oauth = takeOAuthReturn();

  if (oauth.error) {
    messageApi.error(
      oauth.error === 'cancelled'
        ? t('login.OAuthError.cancelled')
        : oauth.error === 'config'
          ? t('login.OAuthError.config')
          : t('login.OAuthError.profile'),
      10
    );
  }
  if (oauth.code) {
    try {
      const json = await postLogin(clubModel, { oauthCode: oauth.code });
      if (json?.token) {
        sessionModel.setSession(json);
        if (json.isGuest) messageApi.info(t('login.WelcomeGuest', { name: json.name }), 8);
        return;
      }
    } catch (error) {
      messageApi.error(`${t('login.OAuthError.exchange')} (${clubModel.loginUrl}: ${errorText(error)})`, 10);
    }
  }

  if (sessionModel.token) {
    try {
      const json = await postLogin(clubModel, {}, sessionModel.authorizationHeader);
      if (json) sessionModel.setSession(json);
      return;
    } catch (error) {
      if (isRejected(error)) {
        // The token has expired or the account is removed
        sessionModel.setFailedLogin();
      } else {
        // Keeps the token, the server may answer the next time
        messageApi.warning(`${t('login.RestoreFailed')} (${clubModel.loginUrl}: ${errorText(error)})`, 10);
      }
      return;
    }
  }

  const old = readOldStoredPassword();
  if (old) {
    try {
      const json = await postLogin(clubModel, { ...old, rememberLogin: true });
      if (json?.token) {
        sessionModel.setSession(json, old.username);
        removeOldStoredPassword();
      }
    } catch (error) {
      // Tries again next time, unless Eventor said no
      if (isRejected(error)) removeOldStoredPassword();
      console.warn(`The old saved login could not be changed to a token (${clubModel.loginUrl}): ${errorText(error)}`);
    }
  }
};
