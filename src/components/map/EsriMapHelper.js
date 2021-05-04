import { setDefaultOptions, loadModules } from 'esri-loader';

const openStreetMapLayerId = 'OpenStreetMapLayer';

export const backgroundLayerIds = [openStreetMapLayerId];

export const getEsriMap = async (globalStateModel, clubModel) => {
  if (globalStateModel.map != null) {
    return globalStateModel.map;
  }
  setDefaultOptions({ version: '4.19', css: true });

  const [EsriMap, EsriBaseTileLayer, EsriOpenStreetMapLayer] = await loadModules([
    'esri/Map',
    'esri/layers/BaseTileLayer',
    'esri/layers/OpenStreetMapLayer',
  ]);

  const osmLayer = new EsriOpenStreetMapLayer({ id: openStreetMapLayerId });
  const esriMap = new EsriMap({
    basemap: {
      baseLayers: [osmLayer],
    },
  });

  clubModel.map.layers.forEach((layer) => {
    const OrienteeringTileLayer = EsriBaseTileLayer.createSubclass({
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
    esriMap.add(orienteeringLayer);
  });

  return esriMap;
};
