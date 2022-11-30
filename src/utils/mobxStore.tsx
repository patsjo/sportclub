import { useLocalObservable } from 'mobx-react';
import { GlobalStateModel, IGlobalStateModel } from 'models/globalStateModel';
import { IMobxClubModel, MobxClubModel } from 'models/mobxClubModel';
import { ISessionModel, SessionModel } from 'models/sessionModel';
import React from 'react';

interface IMobxStore {
  clubModel: IMobxClubModel;
  globalStateModel: IGlobalStateModel;
  sessionModel: ISessionModel;
}

const MobxStoreContext = React.createContext<IMobxStore>({
  clubModel: new MobxClubModel({
    title: 'No store provider',
    defaultLanguage: 'en',
    logo: { url: 'https://', width: 0, height: 0 },
    theme: {
      palette: {
        primary: {
          main: '#5882E4',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#ffffff',
          contrastText: '#000000',
        },
        error: {
          main: '#aa3333',
          contrastText: '#000000',
        },
        contrastThreshold: 3,
        tonalOffset: 0.2,
      },
      typography: {
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
        fontSize: 12,
      },
    },
  }),
  globalStateModel: new GlobalStateModel(),
  sessionModel: new SessionModel(),
});

interface IMobxStoreProvider {
  children: React.ReactNode;
  store: IMobxStore;
}
export const MobxStoreProvider = ({ children, store }: IMobxStoreProvider) => {
  const observableStore = useLocalObservable(() => store);
  return <MobxStoreContext.Provider value={observableStore}>{children}</MobxStoreContext.Provider>;
};

export const useMobxStore = () => React.useContext<IMobxStore>(MobxStoreContext);
