import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import OSMOrienteeringMap from './OSMOrienteeringMap';

const MapContainer = styled.div`
  position: absolute;
  top: 64px;
  left: 0;
  height: calc(100vh - 64px);
  width: 100vw;
`;

const Maps = () => {
  const { clubModel } = useMobxStore();

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
      />
    </MapContainer>
  );
};

export default Maps;
