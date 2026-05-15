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
import { Circle as CircleStyle, Fill, Icon, Stroke, Style, Text } from 'ol/style';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ILineStringGeometry } from '../../models/graphic';
import { useMapStore } from '../../utils/mapStore';
import { IMapTracksFormProps } from './MapTrack';
import finishSvg from './trackMarkings/finish.svg?raw';
import { mapProjection } from './useOpenLayersMap';

const maxWhitespaceResolution = 3;
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

const lineToMultiPointByResolution = (line: LineString, resolution: number, pixelSpacing: number = 60): MultiPoint => {
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
const lineStyleCache: Record<string, Style[]> = {};

const recolorSvg = (svgString: string | undefined, color: string): string | undefined => {
  if (!svgString) return undefined;
  // replace fill="#xxxx" and fill='#xxxx'
  let out = svgString.replace(/fill=["']#([^"']+)["']/g, `fill="${color}"`);
  // replace style="...fill:#xxxx..."
  out = out.replace(/style=["']([^"']*)["']/g, (m, styleContent) => {
    const newStyle = styleContent.replace(/fill:\s*#([0-9a-fA-F]+)/g, `fill: ${color}`);
    return `style="${newStyle}"`;
  });
  return out;
};
const colorWithTransparency = (hex: string | undefined, transparentFraction = 0.75): string => {
  const fallback = '#aa00aa';
  if (!hex) hex = fallback;
  // normalize #rrggbb or #rrggbbaa
  const m = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(hex);
  if (!m) return hex;
  const rgb = m[1];
  const alphaHex = m[2];
  const existingOpacity = alphaHex ? parseInt(alphaHex, 16) / 255 : 1;
  const targetOpacity = 1 - transparentFraction; // e.g. 0.25 for 75% transparent
  const newOpacity = Math.min(existingOpacity, targetOpacity);
  const newAlpha = Math.round(newOpacity * 255);
  const newAlphaHex = newAlpha.toString(16).padStart(2, '0');
  return `#${rgb}${newAlphaHex}`;
};
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
  const key = `${lineColor}_${resolution > maxSymbolMarkingResolution ? 'noSymbol' : resolution <= maxWhitespaceResolution ? 'withSymbolAndWhitespace' : 'withSymbol'}`;
  if (!lineStyleCache[key] && resolution > maxSymbolMarkingResolution)
    lineStyleCache[key] = [
      new Style({
        stroke: new Stroke({
          color: lineColor,
          width: 3
        })
      })
    ];
  else if (!lineStyleCache[key]) {
    lineStyleCache[key] = [];
    if (resolution <= maxWhitespaceResolution) {
      lineStyleCache[key] = [
        new Style({
          stroke: new Stroke({
            color: '#ffffffc0',
            width: 10,
            offset: -10
          })
        }),
        new Style({
          stroke: new Stroke({
            color: '#ffffffc0',
            width: 10,
            offset: 10
          })
        })
      ];
    }

    lineStyleCache[key].push(
      new Style({
        stroke: new Stroke({
          color: lineColor,
          width: 3,
          offset: -5
        })
      }),
      new Style({
        stroke: new Stroke({
          color: lineColor,
          width: 3,
          offset: 5
        })
      })
    );
  }

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

  const finishSvgForFeature = (feature as FeatureLike).get('finishSvg') as string | undefined;
  const finishStyle =
    resolution > maxSymbolMarkingResolution
      ? []
      : [
          new Style({
            image: new Icon({
              src: `data:image/svg+xml;utf8,${encodeURIComponent(finishSvgForFeature ?? finishSvg)}`,
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
    return [...lineStyleCache[key], ...finishStyle, ...kmStyles];

  const iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(symbolSvg)}`;

  if (!iconCache[iconUrl]) {
    iconCache[iconUrl] = new Icon({
      src: iconUrl,
      scale: 1
    });
  }
  return [
    ...lineStyleCache[key],
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
  const baseSource = useMemo(() => new VectorSource<Feature<LineString>>({ wrapX: false }), []);
  const editSource = useMemo(() => new VectorSource<Feature<LineString>>({ wrapX: false }), []);
  const editFeaturesCollection = useMemo(() => new Collection<Feature<LineString>>(), []);

  useEffect(() => {
    baseSource.clear();
    editSource.clear();
    const items = tracks?.slice().reverse() ?? [];
    for (const track of items) {
      const isEdit = !!editTrackIds?.includes(track.trackId);
      const baseFill = getFillColorFromSvg(track.symbolSvg);
      const nonEditLineColor = colorWithTransparency(baseFill, 0.75);
      const feat = new Feature<LineString>({
        geometry: new LineString(
          track.line.path.map(coordinate => fromLonLat([coordinate.longitude, coordinate.latitude], mapProjection))
        ),
        trackId: track.trackId,
        symbolSvg: isEdit ? track.symbolSvg : recolorSvg(track.symbolSvg, nonEditLineColor),
        trackCenter: track.trackCenter,
        name: track.name,
        lineColor: isEdit ? getFillColorFromSvg(track.symbolSvg) : nonEditLineColor,
        orderBy: track.orderBy
      });
      // recolor finish flag per-feature for non-edit tracks
      if (!isEdit) {
        feat.set('finishSvg', recolorSvg(finishSvg, nonEditLineColor));
      }
      if (isEdit) editSource.addFeature(feat);
      else baseSource.addFeature(feat);
    }
    // sync collection used by Modify interaction
    editFeaturesCollection.clear();
    editFeaturesCollection.extend(editSource.getFeatures());
  }, [tracks, editTrackIds, baseSource, editSource, editFeaturesCollection]);

  const vertexStyle = useMemo(
    () =>
      new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color: '#000000', width: 2 })
        })
      }),
    []
  );

  const vertexSource = useMemo(() => new VectorSource<Feature<Point>>({ wrapX: false }), []);
  const vertexLayer = useMemo(
    () => new VectorLayer({ source: vertexSource, style: vertexStyle }),
    [vertexSource, vertexStyle]
  );

  const updateVertexSource = useCallback(() => {
    vertexSource.clear();
    const editFeats = editSource.getFeatures();
    for (const f of editFeats) {
      const geom = f.getGeometry() as LineString | undefined;
      if (!geom) continue;
      const coords = geom.getCoordinates();
      for (const c of coords) {
        const p = new Feature<Point>({ geometry: new Point(c), trackId: f.get('trackId') });
        vertexSource.addFeature(p);
      }
    }
  }, [editSource, vertexSource]);

  useEffect(() => {
    const onAdd = () => updateVertexSource();
    const onRemove = () => updateVertexSource();
    const onChange = () => updateVertexSource();
    editSource.on('addfeature', onAdd);
    editSource.on('removefeature', onRemove);
    editSource.on('changefeature', onChange);
    updateVertexSource();
    return () => {
      editSource.un('addfeature', onAdd);
      editSource.un('removefeature', onRemove);
      editSource.un('changefeature', onChange);
    };
  }, [editSource, updateVertexSource]);

  const modify = useMemo(
    () =>
      new Modify({
        features: editFeaturesCollection,
        style: vertexStyle
      }),
    [editFeaturesCollection, vertexStyle]
  );

  const draw = useMemo(() => new Draw({ source: editSource, type: 'LineString' }), [editSource]);
  const snapBase = useMemo(() => (canSnap ? new Snap({ source: baseSource }) : undefined), [baseSource, canSnap]);
  const snapEdit = useMemo(() => (canSnap ? new Snap({ source: editSource }) : undefined), [editSource, canSnap]);

  const baseLayer = useMemo(() => new VectorLayer({ source: baseSource, style: styleFunction }), [baseSource]);
  const editLayer = useMemo(() => new VectorLayer({ source: editSource, style: styleFunction }), [editSource]);

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
      map.addLayer(baseLayer);
      map.addLayer(editLayer);
      map.addLayer(vertexLayer);
      map.addInteraction(modify);
      map.addInteraction(draw);
      if (snapBase) map.addInteraction(snapBase);
      if (snapEdit) map.addInteraction(snapEdit);
      document.addEventListener('keydown', onKeydown);
      drawEndKey = draw.on('drawend', onDrawEnd);
      modifyEndKey = modify.on('modifyend', onModifyEnd);

      return () => {
        if (drawEndKey) draw.removeEventListener('drawend', drawEndKey.listener);
        if (modifyEndKey) modify.removeEventListener('modifyend', modifyEndKey.listener);
        document.removeEventListener('keydown', onKeydown);
        if (snapBase) map.removeInteraction(snapBase);
        if (snapEdit) map.removeInteraction(snapEdit);
        map.removeInteraction(draw);
        map.removeInteraction(modify);
        map.removeLayer(vertexLayer);
        map.removeLayer(editLayer);
        map.removeLayer(baseLayer);
      };
    }
  }, [baseLayer, editLayer, modify, map, draw, snapBase, snapEdit, onDrawEnd, onModifyEnd, vertexLayer]);

  return null;
};

export default EditableMapTracksLayer;
