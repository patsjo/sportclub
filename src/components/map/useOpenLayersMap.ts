import { IAnyLayer, IMapGroupLayer } from '../../models/mobxClubModel';
import { defaults as defaultControls } from 'ol/control';
import { Group as GroupLayer, Tile as TileLayer } from 'ol/layer';
import BaseLayer from 'ol/layer/Base';
import Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import { OSM, XYZ } from 'ol/source';
import View from 'ol/View';
import { useEffect, useState } from 'react';
import { useMobxStore } from '../../utils/mobxStore';
const openStreetMapLayerId = 'OpenStreetMapLayer';

export const mapProjection = 'EPSG:3857';
export const backgroundLayerIds = [openStreetMapLayerId];

const getDefaultLayerVisible = (layers: IAnyLayer[], id: string): boolean | undefined => {
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].id === id) return layers[i].visible;
    if (layers[i].type === 'group') {
      const visible = getDefaultLayerVisible((layers[i] as IMapGroupLayer).layers, id);
      if (visible !== undefined) return visible;
    }
  }

  return undefined;
};

const getMapLayers = (layers: IAnyLayer[]): BaseLayer[] => {
  const mapLayers: BaseLayer[] = [];

  layers.forEach((layer) => {
    const pMin = fromLonLat([layer.fullExtent.xmin, layer.fullExtent.ymin], mapProjection);
    const pMax = fromLonLat([layer.fullExtent.xmax, layer.fullExtent.ymax], mapProjection);
    if (layer.type === 'group') {
      const groupLayer = new GroupLayer({
        properties: {
          type: layer.type,
          id: layer.id,
          title: layer.title,
          zoomExtent: [pMin[0], pMin[1], pMax[0], pMax[1]],
        },
        layers: getMapLayers(layer.layers),
        extent: [pMin[0], pMin[1], pMax[0], pMax[1]],
      });
      mapLayers.push(groupLayer);
      //Layer don't work if visibility is set false on this layer instance (must by done in map)
    } else {
      const zMin = fromLonLat(
        layer.zoomExtent
          ? [layer.zoomExtent.xmin, layer.zoomExtent.ymin]
          : [layer.fullExtent.xmin, layer.fullExtent.ymin],
        mapProjection
      );
      const zMax = fromLonLat(
        layer.zoomExtent
          ? [layer.zoomExtent.xmax, layer.zoomExtent.ymax]
          : [layer.fullExtent.xmax, layer.fullExtent.ymax],
        mapProjection
      );
      const orienteeringTileLayer = new TileLayer({
        properties: {
          type: layer.type,
          id: layer.id,
          title: layer.title,
          zoomExtent: [zMin[0], zMin[1], zMax[0], zMax[1]],
        },
        source: new XYZ({
          url: layer.urlTemplate,
        }),
        minZoom: layer.minZoomLevel,
        maxZoom: layer.maxZoomLevel,
        extent: [pMin[0], pMin[1], pMax[0], pMax[1]],
      });
      mapLayers.push(orienteeringTileLayer);
      //Layer don't work if visibility is set false on this layer instance (must by done in map)
    }
  });

  return mapLayers;
};

export const useOpenLayersMap = () => {
  const { clubModel } = useMobxStore();
  const [init, setInit] = useState(true);
  const [map, setMap] = useState<Map>();

  useEffect(() => {
    if (map || !init) return;
    setInit(false);

    const openLayersMap = new Map({
      controls: defaultControls({ zoom: true, rotate: false, attribution: true }),
      target: undefined,
      layers: [
        new TileLayer({
          source: new OSM({ maxZoom: clubModel.map?.maxZoomLevel }),
        }),
      ],
      view: new View({
        projection: mapProjection,
        center: clubModel.map?.center,
        zoom: clubModel.map?.defaultZoomLevel,
        minZoom: clubModel.map?.minZoomLevel,
        maxZoom: clubModel.map?.maxZoomLevel,
      }),
    });

    const layers = getMapLayers(clubModel.map!.layers);
    layers.forEach((layer) => openLayersMap.addLayer(layer));

    const allMapLayers = openLayersMap.getAllLayers()?.filter((l) => l.getProperties().id) ?? [];

    allMapLayers.forEach((l) => {
      const visible = getDefaultLayerVisible(clubModel.map!.layers, l.getProperties().id);
      if (visible !== undefined && !visible) l.setVisible(false);
    });

    setMap(openLayersMap);
  }, [map, init]);

  return map;
};
