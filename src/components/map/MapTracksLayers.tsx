import { message } from 'antd';
import { Feature } from 'ol';
import { buffer, getSize } from 'ol/extent';
import { GeometryCollection, LineString } from 'ol/geom';
import GroupLayer from 'ol/layer/Group';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ILineStringGeometry } from '../../models/graphic';
import { PostJsonData } from '../../utils/api';
import { useMapStore } from '../../utils/mapStore';
import { useMobxStore } from '../../utils/mobxStore';
import { getFillColorFromSvg, styleFunction } from './EditableMapTracksLayer';
import { IMapTracksFormProps } from './MapTrack';
import { mapProjection } from './useOpenLayersMap';

export const getExtent = (graphics: ILineStringGeometry[] | undefined) => {
  if (!graphics?.length) return undefined;
  const extent = buffer(
    new GeometryCollection(
      graphics.map(
        graphic =>
          new LineString(
            graphic.path.map(coordinate => fromLonLat([coordinate.longitude, coordinate.latitude], mapProjection))
          )
      )
    ).getExtent(),
    1.2
  );
  const size = getSize(extent);
  return buffer(extent, Math.min(...size) * 0.2);
};

interface IMapTracksLayersProps {
  onLoad?: (tracks: IMapTracksFormProps['tracks'] | undefined) => void;
}

const MapTracksLayers = ({ onLoad }: IMapTracksLayersProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const map = useMapStore();
  const [tracks, setTracks] = useState<IMapTracksFormProps['tracks']>();
  const graphicLayers = useMemo(
    () =>
      tracks
        ?.reduce(
          (map, t) => {
            const item = map.find(g => g.trackCenter === t.trackCenter);
            if (!item) map.push({ trackCenter: t.trackCenter, tracks: [t], minOrder: t.orderBy });
            else {
              item.tracks.push(t);
              item.minOrder = Math.min(item.minOrder, t.orderBy);
            }
            return map;
          },
          [] as { trackCenter: string; tracks: typeof tracks; minOrder: number }[]
        )
        ?.sort((a, b) => a.minOrder - b.minOrder)
        ?.map(
          g =>
            new GroupLayer({
              properties: {
                type: 'track-group',
                id: `track-group-${g.trackCenter}`,
                title: g.trackCenter,
                zoomExtent: getExtent(g.tracks.map(t => t.line)),
                defaultVisible: g.tracks.some(t => t.showByDefault)
              },
              layers: g.tracks.reverse().map(
                track =>
                  new VectorLayer({
                    properties: {
                      type: 'track',
                      id: `track-${track.trackId}`,
                      title: track.name,
                      zoomExtent: getExtent([track.line]),
                      defaultVisible: !g.tracks.some(t => t.showByDefault) || track.showByDefault
                    },
                    source: new VectorSource<Feature<LineString>>({
                      wrapX: false,
                      features: [
                        new Feature<LineString>({
                          geometry: new LineString(
                            track.line.path.map(coordinate =>
                              fromLonLat([coordinate.longitude, coordinate.latitude], mapProjection)
                            )
                          ),
                          trackId: track.trackId,
                          symbolSvg: track.symbolSvg,
                          trackCenter: track.trackCenter,
                          name: track.name,
                          lineColor: getFillColorFromSvg(track.symbolSvg),
                          orderBy: track.orderBy
                        })
                      ]
                    }),
                    style: styleFunction
                  })
              ),
              extent: getExtent(g.tracks.map(t => t.line))
            })
        ) ?? [],
    [tracks]
  );

  useEffect(() => {
    if (map && tracks) {
      const allTracksGroupLayer = new GroupLayer({
        properties: {
          type: 'track-group',
          id: `all-track-groups`,
          title: t('map.Tracks'),
          zoomExtent: getExtent(tracks.map(t => t.line)),
          defaultVisible: tracks.some(t => t.showByDefault)
        },
        layers: graphicLayers,
        extent: getExtent(tracks.map(t => t.line))
      });
      map.addLayer(allTracksGroupLayer);
      const allMapLayers =
        map
          .getAllLayers()
          ?.filter(l => l.getProperties().type === 'track' || l.getProperties().type === 'track-group') ?? [];

      allMapLayers.forEach(l => {
        const visible = l.getProperties().defaultVisible;
        if (visible !== undefined && !visible) l.setVisible(false);
      });

      return () => {
        map.removeLayer(allTracksGroupLayer);
      };
    }
  }, [graphicLayers, map, t, tracks]);

  useEffect(() => {
    if (tracks) return;
    const url = clubModel.map?.queryUrl;
    if (!url || !clubModel.eventor?.organisationsUrl) return;

    PostJsonData<IMapTracksFormProps['tracks']>(url, {}, true, sessionModel.authorizationHeader)
      .then(allTracks => {
        setTracks(allTracks);
        onLoad?.(allTracks);
      })
      .catch(e => {
        if (e?.message) message.error(e.message);
      });
  }, [clubModel, sessionModel, tracks, onLoad]);

  return null;
};

export default MapTracksLayers;
