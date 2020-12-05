import React from 'react';
import { setDefaultOptions, loadModules } from 'esri-loader';

const openStreetMapLayerId = 'OpenStreetMapLayer';
const orienteeringTileLayerId = 'OrienteeringTileLayer';

export const backgroundLayerIds = [openStreetMapLayerId, orienteeringTileLayerId];

const useEsriMap = (globalStateModel) => {
  React.useEffect(() => {
    if (globalStateModel.map != null || globalStateModel.mapLoading) {
      return;
    }
    globalStateModel.setMapLoading();
    setDefaultOptions({ version: '4.17', css: true });
    loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/BaseTileLayer',
      'esri/layers/GraphicsLayer',
      'esri/layers/OpenStreetMapLayer',
      'esri/Graphic',
      'esri/geometry/Circle',
      'esri/geometry/geometryEngine',
      'esri/geometry/support/webMercatorUtils',
    ]).then(
      ([
        Map,
        MapView,
        BaseTileLayer,
        GraphicsLayer,
        OpenStreetMapLayer,
        Graphic,
        Circle,
        geometryEngine,
        WebMercatorUtils,
      ]) => {
        const osmLayer = new OpenStreetMapLayer({ id: openStreetMapLayerId });
        const map = new Map({
          basemap: {
            baseLayers: [osmLayer],
          },
        });

        const OrienteeringTileLayer = BaseTileLayer.createSubclass({
          properties: {
            urlTemplates: [],
          },

          getTileUrl: function (level, row, col) {
            return this.urlTemplates[Math.floor(Math.random() * Math.floor(this.urlTemplates.length))]
              .replace('{z}', level)
              .replace('{x}', col)
              .replace('{y}', row);
          },
        });

        const orienteeringLayer = new OrienteeringTileLayer({
          urlTemplates: [
            'https://tiler4.oobrien.com/oterrain_global/{z}/{x}/{y}.png',
            'https://tiler5.oobrien.com/oterrain_global/{z}/{x}/{y}.png',
            'https://tiler6.oobrien.com/oterrain_global/{z}/{x}/{y}.png',
          ],
          id: orienteeringTileLayerId,
          title: 'Orienteering layer',
          minScale: 150000,
        });

        map.add(orienteeringLayer);

        globalStateModel.setMap(map, MapView, GraphicsLayer, Graphic, Circle, WebMercatorUtils, geometryEngine);
      }
    );
  }, []);

  return globalStateModel.map != null;
};

export default useEsriMap;
