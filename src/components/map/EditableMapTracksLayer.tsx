import { Feature } from 'ol';
import Collection from 'ol/Collection';
import { EventsKey } from 'ol/events';
import { FeatureLike } from 'ol/Feature';
import { LineString, MultiPoint, Point } from 'ol/geom';
import Draw, { DrawEvent } from 'ol/interaction/Draw';
import Modify, { ModifyEvent } from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { getLength } from 'ol/sphere.js';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ILineStringGeometry } from '../../models/graphic';
import { useMapStore } from '../../utils/mapStore';
import { IMapTracksFormProps } from './MapTrack';
import finishSvg from './trackMarkings/finish.svg?raw';
import { mapProjection } from './useOpenLayersMap';

const maxKmMarkingResolution = 25;
const maxSymbolMarkingResolution = 75;
const maxResolutionForTracks = 250;

const getAngleAtDistance = (line: LineString, distance: number): number | null => {
  const coordinates = line.getCoordinates();

  if (coordinates.length < 2) {
    return null;
  }

  let accumulated = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [x1, y1] = coordinates[i];
    const [x2, y2] = coordinates[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segmentLength = Math.hypot(dx, dy);

    if (accumulated + segmentLength >= distance) {
      // We are inside this segment → compute angle
      return Math.atan2(dy, dx);
    }

    accumulated += segmentLength;
  }

  // Distance exceeds line length → angle of last segment
  const [x1, y1] = coordinates[coordinates.length - 2];
  const [x2, y2] = coordinates[coordinates.length - 1];

  return Math.atan2(y2 - y1, x2 - x1);
};

const lineToMultiPointByResolution = (line: LineString, resolution: number, pixelSpacing: number = 40): MultiPoint => {
  const spacing = pixelSpacing * resolution;
  const length = line.getLength();

  const coords = [];
  for (let d = 0; d <= length; d += spacing) {
    coords.push(line.getCoordinateAt(d / length));
  }

  return new MultiPoint(coords);
};
const lineToPointArrayByKm = (
  line: LineString,
  resolution: number,
  markerLinePixelLength: number = 40
): { point: Point; textRotation: number; markerLine: LineString }[] => {
  const lengthInMeter = getLength(line);
  if (lengthInMeter === 0) return [];
  const length = line.getLength();
  const spacing = (1000 * length) / lengthInMeter;
  const halfMarkerLineLength = (markerLinePixelLength * resolution) / 2;

  const items: { point: Point; textRotation: number; markerLine: LineString }[] = [];
  for (let d = 0; d <= length; d += spacing) {
    if (d <= 0) continue;
    const frac = d / length;
    const coord = line.getCoordinateAt(frac);
    const point = new Point(coord);
    const lineAngle = getAngleAtDistance(line, d) ?? 0;
    if (lineAngle === null) continue;
    const angle90 = lineAngle + Math.PI / 2;
    let textRotation = -lineAngle;
    if (textRotation < Math.PI / 2) textRotation += Math.PI;
    if (textRotation > Math.PI / 2) textRotation -= Math.PI;
    const markerLine = new LineString([
      [coord[0] - halfMarkerLineLength * Math.cos(angle90), coord[1] - halfMarkerLineLength * Math.sin(angle90)],
      [coord[0] + halfMarkerLineLength * Math.cos(angle90), coord[1] + halfMarkerLineLength * Math.sin(angle90)]
    ]);
    items.push({ point, textRotation, markerLine });
  }

  return items;
};
const iconCache: Record<string, Icon> = {};
const lineStyleCache: Record<string, Style> = {};
export const styleFunction = (feature: FeatureLike, resolution: number): Style | Style[] => {
  if (resolution > maxResolutionForTracks) return [];
  let symbolSvg = feature.get('symbolSvg') as string | undefined;

  if (symbolSvg) {
    symbolSvg = symbolSvg
      .replace(/<svg\s+([^>]*?)\s+width=['"].*?['"]\s*([^>]*?)>/g, '<svg $1 $2>')
      .replace(/<svg\s+([^>]*?)\s+height=['"].*?['"]\s*([^>]*?)>/g, '<svg $1 $2>')
      .replace(/<svg([^>]*)/, '<svg$1 width="24" height="24"');
  }

  const lineColor = feature.get('lineColor') as string;
  if (!lineStyleCache[lineColor])
    lineStyleCache[lineColor] = new Style({
      stroke: new Stroke({
        color: lineColor,
        width: 6,
        lineDash: [0, 8]
      })
    });

  let kmStyles: Style[] = [];
  const geomForKm = (feature.getGeometry && feature.getGeometry()) as LineString | undefined;
  if (geomForKm && geomForKm.getType && geomForKm.getType() === 'LineString' && resolution <= maxKmMarkingResolution) {
    const kmPoints = lineToPointArrayByKm(geomForKm, resolution);
    kmStyles = [
      ...kmPoints.map(
        (item, i) =>
          new Style({
            geometry: item.point,
            text: new Text({
              text: `${i + 1} km`,
              font: 'bold 12px sans-serif',
              fill: new Fill({ color: lineColor }),
              stroke: new Stroke({ color: '#ffffff', width: 5 }),
              offsetY: -24,
              rotation: item.textRotation
            })
          })
      ),
      ...kmPoints.map(
        item =>
          new Style({
            geometry: item.markerLine,
            stroke: new Stroke({
              color: lineColor,
              width: 4
            })
          })
      )
    ];
  }

  const finishStyle =
    resolution > maxSymbolMarkingResolution
      ? []
      : [
          new Style({
            image: new Icon({
              src: `data:image/svg+xml;utf8,${encodeURIComponent(finishSvg)}`,
              scale: 1,
              anchor: [0, 1]
            }),
            geometry: f => {
              const geom = f.getGeometry();
              if (geom?.getType() === 'LineString') {
                return new Point((geom as LineString).getLastCoordinate());
              }
              return geom;
            }
          })
        ];

  if (!symbolSvg || resolution > maxSymbolMarkingResolution)
    return [lineStyleCache[lineColor], ...finishStyle, ...kmStyles];

  const iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(symbolSvg)}`;

  if (!iconCache[iconUrl]) {
    iconCache[iconUrl] = new Icon({
      src: iconUrl,
      scale: 1
    });
  }
  return [
    lineStyleCache[lineColor],
    new Style({
      image: iconCache[iconUrl],
      geometry: f => {
        const geom = f.getGeometry();
        if (geom?.getType() === 'LineString') {
          return lineToMultiPointByResolution(geom as LineString, resolution);
        }
        return geom;
      }
    }),
    ...finishStyle,
    ...kmStyles
  ];
};
export const getFillColorsFromSvg = (svgString: string | undefined): string[] => {
  if (!svgString) return [];
  const regex = /fill=["']#([^"']+)["']/g;
  const colors: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(svgString)) !== null) {
    colors.push(`#${match[1]}`);
  }
  return colors;
};
export const getFillColorFromSvg = (svgString: string | undefined, index = 0): string => {
  const fallback = '#aa00aa';
  if (!svgString) return fallback;
  const colors = getFillColorsFromSvg(svgString);
  if (index < 0) index = 0;
  return colors.length >= index ? colors[index] : fallback;
};

interface IEditableMapTracksLayerProps {
  tracks: IMapTracksFormProps['tracks'] | undefined;
  editTrackIds?: string[];
  onDrawComplete?: (geometry: ILineStringGeometry) => void;
  onModifyComplete?: (geometries: { trackId: string; geometry: ILineStringGeometry }[]) => void;
}

const EditableMapTracksLayer = ({
  tracks,
  editTrackIds,
  onDrawComplete,
  onModifyComplete
}: IEditableMapTracksLayerProps) => {
  const [canSnap, setCanSnap] = useState(true);
  const map = useMapStore();
  const source = useMemo(
    () =>
      new VectorSource<Feature<LineString>>({
        wrapX: false,
        features: tracks
          ?.slice()
          .reverse()
          .map(
            track =>
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
          )
      }),
    [tracks]
  );
  const modify = useMemo(
    () =>
      new Modify({
        features: new Collection(source.getFeatures().filter(f => editTrackIds?.includes(f.get('trackId'))))
      }),
    [source, editTrackIds]
  );
  const draw = useMemo(
    () =>
      new Draw({
        source: source,
        type: 'LineString'
      }),
    [source]
  );
  const snap = useMemo(() => (canSnap ? new Snap({ source: source }) : undefined), [source, canSnap]);
  const graphicsLayer = useMemo(
    () =>
      new VectorLayer({
        source: source,
        style: styleFunction
      }),
    [source]
  );

  const onDrawEnd = useCallback(
    (event: DrawEvent) => {
      const geometry = event.feature.getGeometry() as LineString;
      onDrawComplete?.({
        type: 'line',
        path: geometry.getCoordinates().map(coordinate => {
          const coordinates = toLonLat(coordinate, mapProjection);
          return { longitude: coordinates[0], latitude: coordinates[1] };
        })
      });
    },
    [onDrawComplete]
  );

  const onModifyEnd = useCallback(
    (event: ModifyEvent) => {
      const geometries = event.features.getArray().map(feature => {
        const geometry = feature.getGeometry() as LineString;
        const line: ILineStringGeometry = {
          type: 'line',
          path: geometry.getCoordinates().map(coordinate => {
            const coordinates = toLonLat(coordinate, mapProjection);
            return { longitude: coordinates[0], latitude: coordinates[1] };
          })
        };
        return { trackId: feature.getProperties().trackId, geometry: line };
      });

      onModifyComplete?.(geometries);
    },
    [onModifyComplete]
  );

  useEffect(() => {
    const onKeyDownToggleSnap = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.shiftKey) {
        e.preventDefault();
        setCanSnap(s => !s);
      }
    };

    document.addEventListener('keydown', onKeyDownToggleSnap);
    return () => document.removeEventListener('keydown', onKeyDownToggleSnap);
  }, []);

  useEffect(() => {
    if (map) {
      let drawEndKey: EventsKey | undefined = undefined;
      let modifyEndKey: EventsKey | undefined = undefined;
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          draw.abortDrawing();
        }
        if (e.key === 'Backspace') {
          draw.removeLastPoint();
        }
      };
      map.addLayer(graphicsLayer);
      map.addInteraction(modify);
      map.addInteraction(draw);
      if (snap) map.addInteraction(snap);
      document.addEventListener('keydown', onKeydown);
      drawEndKey = draw.on('drawend', onDrawEnd);
      modifyEndKey = modify.on('modifyend', onModifyEnd);

      return () => {
        if (drawEndKey) draw.removeEventListener('drawend', drawEndKey.listener);
        if (modifyEndKey) modify.removeEventListener('modifyend', modifyEndKey.listener);
        document.removeEventListener('keydown', onKeydown);
        if (snap) map.removeInteraction(snap);
        map.removeInteraction(draw);
        map.removeInteraction(modify);
        map.removeLayer(graphicsLayer);
      };
    }
  }, [graphicsLayer, modify, map, draw, snap, onDrawEnd, onModifyEnd]);

  return null;
};

export default EditableMapTracksLayer;
