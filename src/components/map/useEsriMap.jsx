import React from 'react';
import { setDefaultOptions, loadModules } from 'esri-loader';

const openStreetMapLayerId = 'OpenStreetMapLayer';

export const backgroundLayerIds = [openStreetMapLayerId];

const useEsriMap = (globalStateModel, clubModel) => {
  React.useEffect(() => {
    if (globalStateModel.map != null || globalStateModel.mapLoading) {
      return;
    }
    globalStateModel.setMapLoading();
    setDefaultOptions({ version: '4.19', css: true });
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
      'esri/geometry/Extent',
      'esri/widgets/Home',
      'esri/widgets/Fullscreen',
      'esri/widgets/LayerList',
      'esri/widgets/Expand',
      'esri/core/watchUtils',
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
        Extent,
        Home,
        Fullscreen,
        LayerList,
        Expand,
        watchUtils,
      ]) => {
        const osmLayer = new OpenStreetMapLayer({ id: openStreetMapLayerId });
        const map = new Map({
          basemap: {
            baseLayers: [osmLayer],
          },
        });

        clubModel.map.layers.forEach((layer) => {
          const OrienteeringTileLayer = BaseTileLayer.createSubclass({
            properties: {
              urlTemplates: [],
              fullExtent: layer.fullExtent,
            },

            getTileUrl: function (level, row, col) {
              return this.urlTemplates[Math.floor(Math.random() * Math.floor(this.urlTemplates.length))]
                .replace('{z}', level)
                .replace('{x}', col)
                .replace('{y}', row);
            },
          });

          const orienteeringLayer = new OrienteeringTileLayer({
            id: layer.id,
            title: layer.title,
            visible: layer.visible,
            urlTemplates: layer.urlTemplates,
            minScale: layer.minScale,
            maxScale: layer.maxScale,
          });
          orienteeringLayer.defaultVisible = layer.visible;
          map.add(orienteeringLayer);
        });

        globalStateModel.setMap(
          map,
          MapView,
          GraphicsLayer,
          Graphic,
          Circle,
          WebMercatorUtils,
          Extent,
          geometryEngine,
          watchUtils,
          Home,
          Fullscreen,
          LayerList,
          Expand
        );
      }
    );
  }, []);

  return globalStateModel.map != null;
};

export default useEsriMap;
