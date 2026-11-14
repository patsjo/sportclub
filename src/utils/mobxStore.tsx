import { useLocalObservable } from 'mobx-react';
import React from 'react';
import { GlobalStateModel, IGlobalStateModel } from '../models/globalStateModel';
import { IMobxClubModel, MobxClubModel } from '../models/mobxClubModel';
import { ISessionModel, SessionModel } from '../models/sessionModel';
import { SocialModel } from '../models/socialModel';

interface IMobxStore {
  clubModel: IMobxClubModel;
  globalStateModel: IGlobalStateModel;
  sessionModel: ISessionModel;
  socialModel: SocialModel;
}

const defaultClubModel = new MobxClubModel({
  title: 'No store provider',
  clubInfo: {
    name: 'No store provider',
    organisationNumber: '',
    address1: '',
    zip: '',
    city: ''
  },
  defaultLanguage: 'en',
  logo: { url: 'https://', width: 0, height: 0 },
  theme: {
    palette: {
      primary: {
        main: '#5882E4',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#ffffff',
        contrastText: '#000000'
      },
      error: {
        main: '#aa3333',
        contrastText: '#000000'
      },
      contrastThreshold: 3,
      tonalOffset: 0.2
    },
    typography: {
      fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
      fontSize: 12
    }
  }
});
const defaultSessionModel = new SessionModel();

const MobxStoreContext = React.createContext<IMobxStore>({
  clubModel: defaultClubModel,
  globalStateModel: new GlobalStateModel(),
  sessionModel: defaultSessionModel,
  socialModel: new SocialModel(defaultClubModel, defaultSessionModel)
});

interface IMobxStoreProvider {
  children: React.ReactNode;
  /** Without socialModel a new one is made, e.g. for a map in a modal */
  store: Omit<IMobxStore, 'socialModel'> & { socialModel?: SocialModel };
}
export const MobxStoreProvider = ({ children, store }: IMobxStoreProvider) => {
  const observableStore = useLocalObservable<IMobxStore>(() => ({
    ...store,
    socialModel: store.socialModel ?? new SocialModel(store.clubModel, store.sessionModel)
  }));
  return <MobxStoreContext.Provider value={observableStore}>{children}</MobxStoreContext.Provider>;
};

export const useMobxStore = () => React.useContext<IMobxStore>(MobxStoreContext);
