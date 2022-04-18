import { Instance, SnapshotIn, types } from 'mobx-state-tree';

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

const setLocalStorage = ({ username, password, rememberLogin }: ISessionModelSnapshotIn) => {
  if (!rememberLogin) {
    localStorage.removeItem('sessionData');
    return;
  }

  const obj: ILocalStorageLogin = {
    username: rememberLogin ? username : '',
    password: rememberLogin ? password : '',
    rememberLogin,
  };

  localStorage.setItem('sessionData', btoa(switchCharacters(btoa(JSON.stringify(obj)))));
};

export const getLocalStorage = (): ISessionModelSnapshotIn => {
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
      ...(JSON.parse(atob(switchCharacters(atob(sessionData)))) as ILocalStorageLogin),
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

export const SessionModel = types
  .model({
    username: types.maybe(types.string),
    password: types.maybe(types.string),
    rememberLogin: types.optional(types.boolean, false),
    id: types.maybe(types.string),
    name: types.maybe(types.string),
    isAdmin: types.optional(types.boolean, false),
    eventorPersonId: types.maybe(types.integer),
    canReadLocalStorage: types.optional(types.boolean, false),
  })
  .volatile((self) => ({
    loggedIn: false,
  }))
  .views((self) => ({
    get authorizationHeader() {
      return {
        Authorization: 'Basic ' + btoa(self.username + ':' + self.password),
      };
    },
  }))
  .actions((self) => {
    return {
      setLogin(username: string, password: string, rememberLogin: boolean) {
        self.username = username;
        self.password = password;
        self.rememberLogin = rememberLogin;
        try {
          setLocalStorage(self);
          self.canReadLocalStorage = true;
        } catch (error) {
          self.canReadLocalStorage = false;
        }
      },
      setSuccessfullyLogin(id: string, name: string, isAdmin: boolean, eventorPersonId: number) {
        self.id = '' + id;
        self.name = name;
        self.loggedIn = true;
        self.isAdmin = isAdmin;
        self.eventorPersonId = eventorPersonId;
      },
      setFailedLogin() {
        self.id = undefined;
        self.name = undefined;
        self.loggedIn = false;
        self.isAdmin = false;
        self.eventorPersonId = undefined;
      },
      setLogout() {
        self.id = undefined;
        self.name = undefined;
        self.loggedIn = false;
        self.isAdmin = false;
        self.eventorPersonId = undefined;
      },
    };
  });
export type ISessionModel = Instance<typeof SessionModel>;
export type ISessionModelSnapshotIn = SnapshotIn<typeof SessionModel>;
