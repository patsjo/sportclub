import { theme, Typography } from 'antd';
import Feature, { FeatureLike } from 'ol/Feature';
import Map from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultControls } from 'ol/control';
import { boundingExtent } from 'ol/extent';
import { Point } from 'ol/geom';
import HeatmapLayer from 'ol/layer/Heatmap';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import ClusterSource from 'ol/source/Cluster';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { GetYears, HasCoordinates } from '../../utils/statisticsHelper';
import { IEventLocation } from './ChartInterface';
import StatisticsYearSelect from './StatisticsYearSelect';

const maxTooltipEvents = 6;
const fitPadding = [40, 40, 40, 40];
const fitMaxZoom = 11;

const Wrapper = styled.div`
  display: block;
  margin: 0 8px 32px 8px;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 8px;
  h5.ant-typography {
    margin: 0;
  }
`;

const MapDiv = styled.div<{ $borderColor: string }>`
  position: relative;
  width: 100%;
  height: 450px;
  border: 1px solid ${props => props.$borderColor};
  border-radius: 8px;
  overflow: hidden;
`;

const Tooltip = styled.div`
  position: absolute;
  z-index: 10;
  pointer-events: none;
  background-color: rgba(0, 60, 136, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  max-width: 320px;
  white-space: nowrap;
  div {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

interface ITooltip {
  x: number;
  y: number;
  flip: boolean;
  lines: string[];
}

const getStarts = (features: FeatureLike[]) =>
  features.reduce((sum, feature) => sum + ((feature.get('starts') as number | undefined) ?? 0), 0);

const clusterStyleCache: Record<string, Style> = {};
const clusterStyle = (cluster: FeatureLike) => {
  const text = getStarts(cluster.get('features') as FeatureLike[]).toString();
  if (!clusterStyleCache[text]) {
    clusterStyleCache[text] = new Style({
      image: new CircleStyle({
        radius: 8 + 3.5 * text.length,
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.85)' }),
        stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.35)', width: 1 })
      }),
      text: new Text({
        text,
        font: 'bold 11px sans-serif',
        fill: new Fill({ color: '#262626' })
      })
    });
  }
  return clusterStyleCache[text];
};

interface IGeographicHeatmapProps {
  data: IEventLocation[];
}

const GeographicHeatmap = ({ data }: IGeographicHeatmapProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const hasFitted = useRef(false);
  const [source] = useState(() => new VectorSource<Feature<Point>>());
  const [map, setMap] = useState<Map>();
  const [year, setYear] = useState<number | undefined>();
  const [tooltip, setTooltip] = useState<ITooltip>();
  const locations = useMemo(() => data.filter(HasCoordinates), [data]);
  const years = useMemo(() => GetYears(locations), [locations]);
  const withoutEventCenter = useMemo(() => {
    const missing = data.filter(d => !HasCoordinates(d) && (year === undefined || d.year === year));
    return { starts: missing.reduce((sum, d) => sum + d.starts, 0), events: missing.length };
  }, [data, year]);

  useEffect(() => {
    if (!mapDivRef.current) return;

    const clusterSource = new ClusterSource<Feature<Point>>({ distance: 50, minDistance: 20, source });
    const clusterLayer = new VectorLayer({ source: clusterSource, style: clusterStyle });
    const newMap = new Map({
      target: mapDivRef.current,
      controls: defaultControls({ zoom: true, rotate: false, attribution: true }),
      layers: [
        new TileLayer({ source: new OSM() }),
        new HeatmapLayer<Feature<Point>>({
          source,
          blur: 22,
          radius: 12,
          opacity: 0.85,
          weight: feature => (feature.get('weight') as number | undefined) ?? 0.5
        }),
        clusterLayer
      ],
      view: new View({ center: fromLonLat([15, 62]), zoom: 4 })
    });

    const getClusterFeatures = (pixel: number[]) => {
      const cluster = newMap.forEachFeatureAtPixel(pixel, feature => feature, {
        layerFilter: layer => layer === clusterLayer
      });
      return (cluster?.get('features') as Feature<Point>[] | undefined) ?? [];
    };

    newMap.on('pointermove', event => {
      if (event.dragging) return;
      const features = getClusterFeatures(event.pixel);
      newMap.getTargetElement().style.cursor = features.length ? 'pointer' : '';
      if (!features.length) {
        setTooltip(undefined);
        return;
      }
      const sorted = [...features].sort((a, b) => (b.get('starts') as number) - (a.get('starts') as number));
      const lines = sorted
        .slice(0, maxTooltipEvents)
        .map(f => `${f.get('year')} ${f.get('name')}: ${t('chart.Starts', { count: f.get('starts') as number })}`);
      if (sorted.length > maxTooltipEvents) {
        lines.push(t('chart.MoreEvents', { count: sorted.length - maxTooltipEvents }));
      }
      setTooltip({
        x: event.pixel[0],
        y: event.pixel[1],
        flip: event.pixel[0] > (newMap.getSize()?.[0] ?? 0) / 2,
        lines
      });
    });

    newMap.on('click', event => {
      const features = getClusterFeatures(event.pixel);
      if (features.length > 1) {
        const extent = boundingExtent(features.map(f => f.getGeometry()!.getCoordinates()));
        newMap.getView().fit(extent, { padding: fitPadding, maxZoom: fitMaxZoom + 3, duration: 500 });
      }
    });

    newMap.getViewport().addEventListener('mouseleave', () => setTooltip(undefined));
    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
      newMap.dispose();
      hasFitted.current = false;
      setMap(undefined);
    };
  }, [source, t]);

  useEffect(() => {
    const selected = year === undefined ? locations : locations.filter(l => l.year === year);
    const maxStarts = selected.reduce((max, l) => Math.max(max, l.starts), 1);

    source.clear();
    source.addFeatures(
      selected.map(
        l =>
          new Feature<Point>({
            geometry: new Point(fromLonLat([l.longitude, l.latitude])),
            name: l.name,
            year: l.year,
            starts: l.starts,
            weight: 0.15 + 0.85 * Math.sqrt(l.starts / maxStarts)
          })
      )
    );

    const extent = source.getExtent();
    if (!map || !selected.length || !extent) return;
    map.updateSize();
    map.getView().fit(extent, {
      padding: fitPadding,
      maxZoom: fitMaxZoom,
      duration: hasFitted.current ? 600 : 0
    });
    hasFitted.current = true;
  }, [map, source, locations, year]);

  return (
    <Wrapper>
      <Header>
        <Typography.Title level={5}>{t('chart.geographicSpread')}</Typography.Title>
        <StatisticsYearSelect years={years} value={year} onChange={setYear} />
        <Typography.Text type="secondary">{t('chart.HeatmapHint')}</Typography.Text>
      </Header>
      <MapDiv $borderColor={token.colorBorderSecondary}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        {tooltip ? (
          <Tooltip
            style={{
              left: tooltip.x + (tooltip.flip ? -14 : 14),
              top: tooltip.y + 14,
              transform: tooltip.flip ? 'translateX(-100%)' : undefined
            }}
          >
            {tooltip.lines.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </Tooltip>
        ) : null}
      </MapDiv>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t('chart.MissingEventCenter', {
          count: withoutEventCenter.starts,
          competitions: t('chart.Competitions', { count: withoutEventCenter.events })
        })}
      </Typography.Text>
    </Wrapper>
  );
};

export default GeographicHeatmap;
