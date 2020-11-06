import { types } from "mobx-state-tree";

const switchCharacters = str => {
  let retVal = "";
  for (let i = 0; i < str.length; i++) {
    if (i % 2 === 1 && str.charAt(i) !== "=") {
      retVal += str.charAt(i) + str.charAt(i - 1);
    } else if (i % 2 === 1) {
      retVal += str.charAt(i - 1) + str.charAt(i);
    } else if (i === str.length - 1) {
      retVal += str.charAt(i);
    }
  }
  return retVal;
};

const setLocalStorage = ({ username, password, rememberLogin }) => {
  if (!rememberLogin) {
    localStorage.removeItem("sessionData");
    return;
  }

  const obj = {
    username: rememberLogin ? username : "",
    password: rememberLogin ? password : "",
    rememberLogin
  };

  localStorage.setItem("sessionData", btoa(switchCharacters(btoa(JSON.stringify(obj)))));
};

export const getLocalStorage = () => {
  try {
    const sessionData = localStorage.getItem("sessionData");

    if (!sessionData) {
      return {
        username: "",
        password: "",
        rememberLogin: false,
        canReadLocalStorage: true,
        isAdmin: false
      };
    }

    return { ...JSON.parse(atob(switchCharacters(atob(sessionData)))), isAdmin: false, canReadLocalStorage: true };
  } catch (error) {
    return {
      username: "",
      password: "",
      rememberLogin: false,
      canReadLocalStorage: false,
      isAdmin: false
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
    isAdmin: types.boolean,
    eventorPersonId: types.maybe(types.string),
    canReadLocalStorage: types.optional(types.boolean, false)
  })
  .volatile(self => ({
    loggedIn: false
  }))
  .views(self => ({
    get authorizationHeader() {
      return {
        Authorization: "Basic " + btoa(self.username + ":" + self.password)
      };
    }
  }))
  .actions(self => {
    return {
      setLogin(username, password, rememberLogin) {
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
      setSuccessfullyLogin(id, name, isAdmin, eventorPersonId) {
        self.id = '' + id;
        self.name = name;
        self.loggedIn = true;
        self.isAdmin = isAdmin;
        self.eventorPersonId = '' + eventorPersonId;
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
      }
    };
  });
