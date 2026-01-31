import { useLocalObservable } from 'mobx-react';
import Map from 'ol/Map';
import React from 'react';

const MapStoreContext = React.createContext<Map | null>(null);

interface IMapStoreProvider {
  children: React.ReactNode;
  store: Map;
}
export const MapStoreProvider = ({ children, store }: IMapStoreProvider) => {
  const observableStore = useLocalObservable(() => store);
  return <MapStoreContext.Provider value={observableStore}>{children}</MapStoreContext.Provider>;
};

export const useMapStore = () => React.useContext<Map | null>(MapStoreContext);
