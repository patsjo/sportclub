import { IRaceWizard, RaceWizard } from 'models/resultWizardModel';
import moment from 'moment';
import React from 'react';
import { payments } from './resultConstants';

interface IResultWizardStore {
  raceWizardModel: IRaceWizard;
}

const ResultWizardStoreContext = React.createContext<IResultWizardStore>({
  raceWizardModel: new RaceWizard({
    queryStartDate: moment().startOf('year').format('YYYY-MM-DD'),
    queryEndDate: moment().format('YYYY-MM-DD'),
    paymentModel: payments.defaultFee0And100IfNotStarted,
    queryIncludeExisting: false,
    existInEventor: true,
  }),
});

interface IResultWizardStoreProvider {
  children: React.ReactNode;
  store: IResultWizardStore;
}
export const ResultWizardStoreProvider = ({ children, store }: IResultWizardStoreProvider) => {
  return <ResultWizardStoreContext.Provider value={store}>{children}</ResultWizardStoreContext.Provider>;
};

export const useResultWizardStore = () => React.useContext<IResultWizardStore>(ResultWizardStoreContext);
