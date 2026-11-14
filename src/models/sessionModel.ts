import { actionBound, computed, makeObservable, observable } from 'mobx';

export type OAuthProvider = 'GOOGLE' | 'FACEBOOK';

/** What log_in.php answers, token only when a new login is made */
export interface ISessionInfo {
  id: number | string;
  name: string;
  isAdmin: boolean;
  eventorPersonId?: number | null;
  competitorId?: number | null;
  isGuest?: boolean;
  oauthId?: number | null;
  provider?: OAuthProvider | null;
  pictureUrl?: string | null;
  pendingAccessRequests?: number;
  token?: string;
  rememberLogin?: boolean;
}

/** The username is remembered for the login form, the password is never saved */
interface ILocalStorageLogin {
  username?: string;
  rememberLogin: boolean;
  token?: string;
}

const storageKey = 'sportclubLogin';
// Old versions saved the username and password (only obfuscated) here
const oldStorageKey = 'sessionData';

const switchCharacters = (str: string): string => {
  let retVal = '';
  for (let i = 0; i < str.length; i++) {
    if (i % 2 === 1 && str.charAt(i) !== '=') {
      retVal += str.charAt(i) + str.charAt(i - 1);
    } else if (i % 2 === 1) {
      retVal += str.charAt(i - 1) + str.charAt(i);
    } else if (i === str.length - 1) {
      retVal += str.charAt(i);
    }
  }
  return retVal;
};

/** The username and password saved by an old version, to login once and change to a token */
export const readOldStoredPassword = (): { username: string; password: string } | undefined => {
  try {
    const sessionData = localStorage.getItem(oldStorageKey);
    if (!sessionData) return undefined;
    const old = JSON.parse(window.atob(switchCharacters(window.atob(sessionData)))) as {
      username?: string;
      password?: string;
      rememberLogin?: boolean;
    };
    return old.rememberLogin && old.username && old.password
      ? { username: old.username, password: old.password }
      : undefined;
  } catch {
    return undefined;
  }
};

/** When the old login is changed to a token, or Eventor says no */
export const removeOldStoredPassword = () => {
  try {
    localStorage.removeItem(oldStorageKey);
  } catch {
    // Nothing to remove when the storage can't be read
  }
};

export const getLocalStorage = (): ISessionModelProps => {
  try {
    const stored = localStorage.getItem(storageKey);
    const local: ILocalStorageLogin = stored ? JSON.parse(stored) : { rememberLogin: false };
    // Without "Remember me" the token only lives in this tab
    const token = local.rememberLogin ? local.token : (sessionStorage.getItem(storageKey) ?? undefined);

    return {
      username: local.username ?? '',
      rememberLogin: local.rememberLogin,
      token,
      canReadLocalStorage: true,
      isAdmin: false
    };
  } catch {
    return {
      username: '',
      rememberLogin: false,
      canReadLocalStorage: false,
      isAdmin: false
    };
  }
};

const setLocalStorage = ({
  username,
  rememberLogin,
  token
}: Pick<ISessionModelProps, 'username' | 'rememberLogin' | 'token'>) => {
  const local: ILocalStorageLogin = {
    username: rememberLogin ? username : undefined,
    rememberLogin,
    token: rememberLogin ? token : undefined
  };
  localStorage.setItem(storageKey, JSON.stringify(local));
  if (!rememberLogin && token) sessionStorage.setItem(storageKey, token);
  else sessionStorage.removeItem(storageKey);
};

interface ISessionModelProps {
  username?: string;
  rememberLogin: boolean;
  token?: string;
  id?: string;
  name?: string;
  isAdmin: boolean;
  eventorPersonId?: number;
  competitorId?: number;
  canReadLocalStorage: boolean;
}

export interface ISessionModel extends ISessionModelProps {
  /** A user (member), not a guest */
  loggedIn: boolean;
  /** Logged in with Google/Facebook, but not linked to a user, can only react and comment */
  isGuest: boolean;
  provider?: OAuthProvider;
  pictureUrl?: string;
  pendingAccessRequests: number;
  /** A user or a guest, can react and comment */
  canInteract: boolean;
  setSession: (info: ISessionInfo, username?: string) => void;
  setFailedLogin: () => void;
  setLogout: () => void;
  authorizationHeader: Record<string, string>;
}

export class SessionModel implements ISessionModel {
  loggedIn = false;
  isGuest = false;
  username?: string;
  rememberLogin = false;
  token?: string;
  id?: string;
  name?: string;
  isAdmin = false;
  eventorPersonId?: number;
  competitorId?: number;
  provider?: OAuthProvider;
  pictureUrl?: string;
  pendingAccessRequests = 0;
  canReadLocalStorage = false;

  constructor(options?: Partial<ISessionModelProps>) {
    if (options) Object.assign(this, options);
    makeObservable(this, {
      loggedIn: observable,
      isGuest: observable,
      username: observable,
      rememberLogin: observable,
      token: observable,
      id: observable,
      name: observable,
      isAdmin: observable,
      eventorPersonId: observable,
      competitorId: observable,
      provider: observable,
      pictureUrl: observable,
      pendingAccessRequests: observable,
      canReadLocalStorage: observable,
      canInteract: computed,
      setSession: actionBound,
      setFailedLogin: actionBound,
      setLogout: actionBound,
      authorizationHeader: computed
    });
  }

  get canInteract() {
    return this.loggedIn || this.isGuest;
  }

  /** The answer from log_in.php, saves a new token */
  public setSession(info: ISessionInfo, username?: string) {
    const id = Number(info.id);
    this.id = id > 0 ? '' + id : undefined;
    this.name = info.name;
    this.loggedIn = id > 0;
    this.isGuest = !this.loggedIn && !!info.isGuest;
    this.isAdmin = this.loggedIn && info.isAdmin;
    this.eventorPersonId = info.eventorPersonId ?? undefined;
    this.competitorId = info.competitorId ?? undefined;
    this.provider = info.provider ?? undefined;
    this.pictureUrl = info.pictureUrl ?? undefined;
    this.pendingAccessRequests = info.pendingAccessRequests ?? 0;

    if (info.token) {
      this.token = info.token;
      this.rememberLogin = !!info.rememberLogin;
      if (username !== undefined) this.username = username;
      this.saveStorage();
    }
  }

  public setFailedLogin() {
    this.clear();
  }

  public setLogout() {
    this.clear();
  }

  private clear() {
    this.id = undefined;
    this.name = undefined;
    this.loggedIn = false;
    this.isGuest = false;
    this.isAdmin = false;
    this.eventorPersonId = undefined;
    this.competitorId = undefined;
    this.provider = undefined;
    this.pictureUrl = undefined;
    this.pendingAccessRequests = 0;
    this.token = undefined;
    this.saveStorage();
  }

  private saveStorage() {
    try {
      setLocalStorage(this);
      this.canReadLocalStorage = true;
    } catch {
      this.canReadLocalStorage = false;
    }
  }

  /** Sent on every request, the server knows the login from the token */
  get authorizationHeader(): Record<string, string> {
    return this.token ? { Authorization: 'Bearer ' + this.token } : {};
  }
}
