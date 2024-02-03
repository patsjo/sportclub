import { action, computed, makeObservable, observable } from 'mobx';

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

export interface ILocalStorageLogin {
  username?: string;
  password?: string;
  rememberLogin: boolean;
}

const setLocalStorage = ({ username, password, rememberLogin }: ISessionModelProps) => {
  if (!rememberLogin) {
    localStorage.removeItem('sessionData');
    return;
  }

  const obj: ILocalStorageLogin = {
    username: rememberLogin ? username : '',
    password: rememberLogin ? password : '',
    rememberLogin,
  };

  localStorage.setItem('sessionData', window.btoa(switchCharacters(window.btoa(JSON.stringify(obj)))));
};

export const getLocalStorage = (): ISessionModelProps => {
  try {
    const sessionData = localStorage.getItem('sessionData');

    if (!sessionData) {
      return {
        username: '',
        password: '',
        rememberLogin: false,
        canReadLocalStorage: true,
        isAdmin: false,
      };
    }

    return {
      ...(JSON.parse(window.atob(switchCharacters(window.atob(sessionData)))) as ILocalStorageLogin),
      isAdmin: false,
      canReadLocalStorage: true,
    };
  } catch (error) {
    return {
      username: '',
      password: '',
      rememberLogin: false,
      canReadLocalStorage: false,
      isAdmin: false,
    };
  }
};

interface ISessionModelProps {
  username?: string;
  password?: string;
  rememberLogin: boolean;
  id?: string;
  name?: string;
  isAdmin: boolean;
  eventorPersonId?: number;
  canReadLocalStorage: boolean;
}

export interface ISessionModel extends ISessionModelProps {
  loggedIn: boolean;
  setLogin: (username: string, password: string, rememberLogin: boolean) => void;
  setSuccessfullyLogin: (id: string, name: string, isAdmin: boolean, eventorPersonId: number) => void;
  setFailedLogin: () => void;
  setLogout: () => void;
  authorizationHeader: {
    Authorization: string;
  };
}

export class SessionModel implements ISessionModel {
  loggedIn = false;
  username?: string;
  password?: string;
  rememberLogin = false;
  id?: string;
  name?: string;
  isAdmin = false;
  eventorPersonId?: number;
  canReadLocalStorage = false;

  constructor(options?: Partial<ISessionModelProps>) {
    options && Object.assign(this, options);
    makeObservable(this, {
      username: observable,
      password: observable,
      rememberLogin: observable,
      id: observable,
      name: observable,
      isAdmin: observable,
      eventorPersonId: observable,
      canReadLocalStorage: observable,
      setLogin: action.bound,
      setSuccessfullyLogin: action.bound,
      setFailedLogin: action.bound,
      setLogout: action.bound,
      authorizationHeader: computed,
    });
  }

  public setLogin(username: string, password: string, rememberLogin: boolean) {
    this.username = username;
    this.password = password;
    this.rememberLogin = rememberLogin;
    try {
      setLocalStorage(this);
      this.canReadLocalStorage = true;
    } catch (error) {
      this.canReadLocalStorage = false;
    }
  }

  public setSuccessfullyLogin(id: string, name: string, isAdmin: boolean, eventorPersonId: number) {
    this.id = '' + id;
    this.name = name;
    this.loggedIn = true;
    this.isAdmin = isAdmin;
    this.eventorPersonId = eventorPersonId;
  }

  public setFailedLogin() {
    this.id = undefined;
    this.name = undefined;
    this.loggedIn = false;
    this.isAdmin = false;
    this.eventorPersonId = undefined;
  }

  public setLogout() {
    this.id = undefined;
    this.name = undefined;
    this.loggedIn = false;
    this.isAdmin = false;
    this.eventorPersonId = undefined;
  }

  get authorizationHeader() {
    return {
      Authorization: 'Basic ' + window.btoa(`${this.username}:${this.password}`),
    };
  }
}
