import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import MapTracksLayers from './MapTracksLayers';
import OSMOrienteeringMap from './OSMOrienteeringMap';

const MapContainer = styled.div`
  position: absolute;
  top: 64px;
  left: 0;
  /* dvh is the visible height on a phone (vh includes the area behind the browser bars), vh is the fallback */
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
  width: 100vw;
`;

const Maps = () => {
  const { t } = useTranslation();
  const { globalStateModel, clubModel, sessionModel } = useMobxStore();

  useEffect(() => {
    globalStateModel.setGraphics(['calendar', 'event'], []);
  }, [globalStateModel]);

  if (clubModel.map?.requireLogin && !sessionModel.loggedIn) {
    return <div>{t('map.requireLogin')}</div>;
  }

  return (
    <MapContainer>
      <OSMOrienteeringMap
        key="mapOnly"
        useAllWidgets
        height="100%"
        width="100%"
        containerId="mapOnly"
        mapCenter={clubModel.map?.center}
        defaultExtent={clubModel.map?.fullExtent}
      >
        <MapTracksLayers />
      </OSMOrienteeringMap>
    </MapContainer>
  );
};

export default Maps;
