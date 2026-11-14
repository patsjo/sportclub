import { IMobxClubModel } from '../models/mobxClubModel';
import { ISessionInfo, ISessionModel } from '../models/sessionModel';
import { PostJsonData } from './api';

/**
 * Automatic login with Google ("One Tap", Google Identity Services), every time the page starts and no one
 * is logged in. The first time Google asks which account to use, after that the same account logs in
 * automatically. After a logout Google asks again (choose the account, or click "Continue as" when there
 * is only one), then it is automatic again.
 */

interface IGoogleCredentialResponse {
  credential?: string;
}

interface IGoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: IGoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: IGoogleAccountsId } };
  }
}

const scriptUrl = 'https://accounts.google.com/gsi/client';
// Set when the user logs out, then the account must be chosen again (the name is kept from an older version)
const chooseAccountKey = 'sportclubGoogleAutoLoginOff';
let scriptLoading: Promise<IGoogleAccountsId> | undefined;

const mustChooseAccount = () => {
  try {
    return localStorage.getItem(chooseAccountKey) === '1';
  } catch {
    return false;
  }
};

const setMustChooseAccount = (choose: boolean) => {
  try {
    if (choose) localStorage.setItem(chooseAccountKey, '1');
    else localStorage.removeItem(chooseAccountKey);
  } catch {
    // Private mode etc., then Google decides (it also remembers the logout)
  }
};

const loadGoogleScript = () => {
  scriptLoading ??= new Promise<IGoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google?.accounts?.id
        ? resolve(window.google.accounts.id)
        : reject(new Error(`${scriptUrl} has no google.accounts.id`));
    script.onerror = () => {
      scriptLoading = undefined;
      script.remove();
      reject(new Error(`Could not load ${scriptUrl}`));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
};

/** A login with Google (also with the button), makes it automatic again */
export const onLoginProvider = (provider?: string | null) => {
  if (provider === 'GOOGLE') setMustChooseAccount(false);
};

/** When the user logs out, Google asks for the account the next time instead of logging in directly */
export const stopGoogleAutoLogin = () => {
  setMustChooseAccount(true);
  window.google?.accounts?.id?.disableAutoSelect();
};

/** When the page has started and no one is logged in */
export const startGoogleAutoLogin = async (
  clubModel: IMobxClubModel,
  sessionModel: ISessionModel,
  onLoggedIn: (info: ISessionInfo) => void,
  onError: (error: unknown) => void
) => {
  const clientId = clubModel.socialLogin?.googleClientId;
  if (!clientId || sessionModel.loggedIn || sessionModel.isGuest) return;

  try {
    const accountsId = await loadGoogleScript();
    // The web page must be in "Authorized JavaScript origins" of the Google client, otherwise Google answers
    // "Error 401: invalid_client" (no registered origin). The login button doesn't need it, it goes via the server.
    accountsId.initialize({
      client_id: clientId,
      // After a logout the account must be chosen (or "Continue as" clicked) before it is automatic again
      auto_select: !mustChooseAccount(),
      cancel_on_tap_outside: true,
      context: 'signin',
      itp_support: true,
      use_fedcm_for_prompt: true,
      callback: response => {
        if (!response.credential) return;
        PostJsonData<ISessionInfo>(
          clubModel.loginUrl,
          { googleCredential: response.credential },
          true,
          { 'X-Requested-With': 'XMLHttpRequest' },
          1
        )
          .then(json => {
            if (json?.token) {
              sessionModel.setSession(json);
              onLoggedIn(json);
            }
          })
          .catch(onError);
      }
    });
    // Logged in another way while the script loaded
    if (sessionModel.loggedIn || sessionModel.isGuest) return;
    accountsId.prompt();
  } catch (error) {
    onError(error);
  }
};
