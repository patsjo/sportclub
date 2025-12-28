import { observer } from 'mobx-react';
import { MapBrowserEvent } from 'ol';
import Feature from 'ol/Feature';
import { Control, FullScreen, ZoomToExtent } from 'ol/control';
import { Options } from 'ol/control/ZoomToExtent';
import { Extent, buffer, getSize } from 'ol/extent';
import { Circle, Geometry, GeometryCollection, Point } from 'ol/geom';
import { fromCircle } from 'ol/geom/Polygon';
import { Vector as VectorLayer } from 'ol/layer';
import * as proj from 'ol/proj';
import { fromLonLat } from 'ol/proj';
import RenderFeature from 'ol/render/Feature';
import { Vector as VectorSource } from 'ol/source';
import * as wgs84Sphere from 'ol/sphere';
import { Fill, Icon, Stroke, Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import { getUid } from 'ol/util';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import { IGraphic } from '../../models/graphic';
import { IExtentProps } from '../../models/mobxClubModel';
import { useMobxStore } from '../../utils/mobxStore';
import LayerList from './LayerList';
import { LayerListControl } from './LayerListControl';
import Loader from './Loader';
import { TrackingControl } from './TrackingControl';
import { mapProjection, useOpenLayersMap } from './useOpenLayersMap';

class HomeExtent extends ZoomToExtent {
  constructor(options: Options) {
    super(options);
  }

  public setExtent(extent: Extent | null) {
    this.extent = extent ?? this.extent;
  }
}

interface IMapDivProps {
  height: string;
  width: string;
}
const MapDiv = styled.div<IMapDivProps>`
  height: ${props => props.height};
  width: ${props => props.width};
  position: relative;
`;
const MapContainerDiv = styled.div`
  height: 100%;
  width: 100%;
  &&& .ol-full-screen {
    left: unset;
    right: 0.5em;
    top: 0.5em;
  }
  &&& .ol-zoom-extent {
    left: unset;
    right: 0.5em;
    top: 2.5em;
  }
  .ol-layerlist {
    left: unset;
    right: 0.5em;
    top: 4.5em;
  }
  .ol-layerlist-selected {
    background-color: rgba(255, 190, 32, 0.6);
  }
  .ol-tracking {
    left: unset;
    right: 0.5em;
    top: 6.5em;
  }
  .ol-tracking-selected {
    background-color: rgba(255, 190, 32, 0.6);
  }
`;
const MapInfo = styled.div`
  background-color: rgba(0, 60, 136, 0.8);
  border-color: rgba(255, 255, 255, 0.8);
  border-style: solid;
  border-width: 3px;
  border-radius: 4px;
  color: white;
  font-size: 9pt;
  padding: 2px 6px;
  position: absolute;
  bottom: 0.5em;
  right: 0.5em;
  display: none;
`;

const MapInfoText = styled.div`
  white-space: nowrap;
  min-width: 60px;
  max-width: 360px;
  text-overflow: ellipsis;
  overflow-x: hidden;
`;

export const DirectionPngUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QIIEx8SFao54QAAAZ9JREFUWMPV2L9Lw0AUB/Dvu9R26A3i3+AfITgIcdNJQbAQB+ciDuJi5vgPVFxFLVpE8C8wIMX/KA622rqc0NImud9p3pYEjk/eXS7vHsFShEl2BOAWwA+AszTmrzbGJUu4DoBHAIG49QsgSmM+qBy4BAebSHKEs4YkhzgrSHKMM0aSB5wRkjzhtJHkEaeFJM84ZSTJ4BjhaTKF1WAETKbolCGZTOZMcNH22tL7Ysx+mGTHWkBb03q608xFirELkczHmjNBMg8fhBGS+cCZIEkVt7UZ4GKviQ3OtKF3HyP0P8dSWxBTzdzlfssIp5rJRphkByrTut62UuMiKH7Hf+Q3A9Bzteby4mE4wv1wXPoOAHqNss26LHavvwqfv1+1dXBzie6KhbkqmZv9WM5ZGvM3ACeukRq4KI35CwOANObPLpGauMHcRu0KaYJb+JO4QJrgcutB1788lQKWPFbRWtU1eS71lUt/qZLfEVLqXFL/Q1Mtjp21OLjXovVRi+aRBtJ/+00BWV0DUwJZfQu4ALk6TfQZ5CGAG3HZFYWwcfwBUbAXA/xsjAAAAAAASUVORK5CYII=';

const DirectionSymbol = {
  type: 'picture-marker',
  url: DirectionPngUrl,
  width: 40,
  height: 40,
  xoffset: -5,
  yoffset: -5
};

const highlightStyle = new Style({
  image: new CircleStyle({
    radius: 25,
    stroke: new Stroke({
      color: 'rgba(255, 190, 32, 0.6)',
      width: 8
    })
  })
});

export const OrienteeringSymbol = {
  type: 'picture-marker',
  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AEYFRQg5uEz8gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABBUlEQVQ4y62UQarCMBBA34Ru1UN4CE8ggrpRUMRNBRW8gCcTBBe6EPFKttVO/qL+yue32qQGQmASHm8mmUgElm+NVosAgMEAej2wHmwRSFPYbsHaJ7DTgc0GVN1hUQTTKTweIPIEWvuaLjBVWCzgcMjDgXe9kgT6fbhc/oSNV81UYbX6B/MzVIVuF67Xwm3jZJYkEIalsOqGItk6GsHp9PaoqQS73WAy+Qj7DPw1C0PY7Sol8z7lOIbxGI7HyqU2pWbWwnrtBCs3TNOstwvemZuhCNzvsFx6wYoNh0M4n7070uRmcQzzeS3Yy1AVZjPY72v/sRKBzW+17mg2CWi3M9g3oI0GP97CWNsUQOxvAAAAAElFTkSuQmCC',
  width: 20,
  height: 20
};

const getExtent = (graphics: IGraphic[] | undefined) => {
  if (!graphics?.length) return undefined;
  const extent = buffer(
    new GeometryCollection(
      graphics.map(graphic => {
        const coordinate =
          graphic.geometry.type === 'circle'
            ? fromLonLat(graphic.geometry.center!, mapProjection)
            : fromLonLat([graphic.geometry.longitude, graphic.geometry.latitude], mapProjection);
        const radius = graphic.geometry.type === 'circle' ? graphic.geometry.radius : 500;
        const polygon = fromCircle(new Circle(coordinate, getMapLength(coordinate, radius)));
        return polygon;
      })
    ).getExtent(),
    1.2
  );
  const size = getSize(extent);
  return buffer(extent, Math.min(...size) * 0.2);
};

const getMapLength = (point: number[], units: number) =>
  units > 0
    ? (units * units) /
      wgs84Sphere.getDistance(
        proj.transform(point, mapProjection, 'EPSG:4326'),
        proj.transform([point[0] + units, point[1]], mapProjection, 'EPSG:4326')
      )
    : 0;

interface IOSMOrienteeringMapProps {
  containerId: string;
  height: string;
  width: string;
  defaultExtent?: IExtentProps;
  defaultGraphics?: IGraphic[];
  useAllWidgets?: boolean;
  useDefaultGraphicsAsHome?: boolean;
  mapCenter?: number[];
  onClick?: (graphicsLayer: VectorLayer, graphic: Feature<Point>) => void;
  onHighlightClick?: (graphic: Feature<Point>) => void;
}

const OSMOrienteeringMap = observer(
  ({
    containerId,
    height,
    width,
    defaultExtent = undefined,
    defaultGraphics = undefined,
    useAllWidgets = false,
    useDefaultGraphicsAsHome = false,
    mapCenter,
    onClick,
    onHighlightClick = undefined
  }: IOSMOrienteeringMapProps) => {
    const { globalStateModel, clubModel } = useMobxStore();
    const { t } = useTranslation();
    const [graphicsLayer, setGraphicsLayer] = React.useState<VectorLayer | undefined>();
    const map = useOpenLayersMap();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInfoRef = useRef<HTMLDivElement>(null);
    const homeExtent = useRef<HomeExtent>(null);
    const highlight = useRef<boolean>(false);
    const currentUids = useRef<string>(null);
    const mapinfoControl = useRef<Control>(null);
    const [loaded, setLoaded] = useState(false);
    const [layerListVisible, setLayerListVisible] = useState(false);
    const [trackingText, setTrackingText] = useState<string>();
    const [highlightText, setHighlightText] = useState<string>();

    const onMapClick = useCallback(
      (event: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>, newGraphicsLayer: VectorLayer) => {
        const highlighted: Feature<Point>[] = [];
        map!.forEachFeatureAtPixel(
          event.pixel,
          feature => {
            highlighted.push(feature as Feature<Point>);
            return undefined;
          },
          {
            layerFilter: layer => layer === newGraphicsLayer
          }
        );

        onClick?.(
          newGraphicsLayer,
          new Feature<Point>({
            geometry: new Point(event.coordinate),
            symbol: OrienteeringSymbol
          })
        );
        const highLightedDirections = highlighted.filter(g => g.getProperties().attributes?.direction);
        if (highLightedDirections.length > 0 && onHighlightClick !== undefined) {
          onHighlightClick(highLightedDirections[0]);
        }
      },
      [map, onClick, onHighlightClick]
    );

    const onMapPointerMove = useCallback(
      (
        event: MapBrowserEvent<KeyboardEvent | WheelEvent | PointerEvent>,
        newGraphicsLayer: VectorLayer,
        highlightLayer: VectorLayer
      ) => {
        const highlighted: (RenderFeature | Feature<Geometry>)[] = [];
        map!.forEachFeatureAtPixel(
          event.pixel,
          feature => {
            highlighted.push(feature);
            return undefined;
          },
          {
            layerFilter: layer => layer === newGraphicsLayer
          }
        );

        let text: string | undefined = undefined;

        if (highlighted.length) {
          text = highlighted
            .filter(g => !g.getProperties().attributes.direction)
            .map(g => g.getProperties().attributes)
            .map(a => `${a.time ? a.time : ''} ${a.name}`)
            .join('<br/>');
          const directionText = highlighted.some(g => g.getProperties().attributes.direction)
            ? t('map.ClickForDirection')
            : '';
          text = `${text}${
            text && text.length && directionText && directionText.length ? '<br/>' : ''
          }${directionText}`;
          const highlightedUids = highlighted.map(g => getUid(g));
          const existingFeature = highlightLayer
            ?.getSource()
            ?.getFeatures()
            .find(() => true);

          if (existingFeature) {
            existingFeature.getGeometry()?.setCoordinates(event.coordinate);
          } else {
            highlightLayer.getSource()?.addFeature(new Feature<Point>(new Point(event.coordinate)));
          }

          if (highlight.current && currentUids.current === JSON.stringify(highlightedUids)) {
            return;
          }
          currentUids.current = JSON.stringify(highlightedUids);
        }
        if (text && text.length) {
          highlight.current = true;
        } else {
          highlightLayer.getSource()?.clear();
          currentUids.current = null;
          highlight.current = false;
          text = undefined;
        }

        setHighlightText(text);
      },
      [map, t]
    );

    React.useEffect(() => {
      if (map && mapRef.current && mapInfoRef.current && !loaded) {
        setLoaded(true);
        map.setTarget(mapRef.current);

        let extent = map.getView().calculateExtent();
        if (defaultExtent) {
          const xyMin = fromLonLat([defaultExtent.xmin, defaultExtent.ymin], mapProjection);
          const xyMax = fromLonLat([defaultExtent.xmax, defaultExtent.ymax], mapProjection);
          extent = [...xyMin, ...xyMax];
          const size = extent && getSize(extent);
          if (extent && size)
            map.getView().fit(buffer(extent, Math.min(...size) * 0.2), {
              maxZoom: 16,
              duration: 800
            });
        } else if (clubModel.map?.center) {
          map.getView().setCenter(fromLonLat(clubModel.map.center, mapProjection));
          map.getView().setZoom(clubModel.map.defaultZoomLevel);
          extent = map.getView().calculateExtent();
        } else if (mapCenter) {
          const center = fromLonLat(mapCenter, mapProjection);
          const extentHalfWidth = getMapLength(center, 500);
          extent = [
            center[0] - extentHalfWidth,
            center[1] - extentHalfWidth,
            center[0] + extentHalfWidth,
            center[1] + extentHalfWidth
          ];
          const size = extent && getSize(extent);
          if (extent && size)
            map.getView().fit(buffer(extent, Math.min(...size) * 0.2), {
              maxZoom: 16,
              duration: 800
            });
        }
        const homeIconContainer = document.createElement('span');
        homeIconContainer.innerHTML =
          '<svg viewBox="64 64 896 896" focusable="false" data-icon="home" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M946.5 505L560.1 118.8l-25.9-25.9a31.5 31.5 0 00-44.4 0L77.5 505a63.9 63.9 0 00-18.8 46c.4 35.2 29.7 63.3 64.9 63.3h42.5V940h691.8V614.3h43.4c17.1 0 33.2-6.7 45.3-18.8a63.6 63.6 0 0018.7-45.3c0-17-6.7-33.1-18.8-45.2zM568 868H456V664h112v204zm217.9-325.7V868H632V640c0-22.1-17.9-40-40-40H432c-22.1 0-40 17.9-40 40v228H238.1V542.3h-96l370-369.7 23.1 23.1L882 542.3h-96.1z"></path></svg>';
        homeExtent.current = new HomeExtent({
          extent: extent,
          label: homeIconContainer
        });
        map.addControl(homeExtent.current);

        if (useAllWidgets) {
          map.addControl(new FullScreen());
          map.addControl(new LayerListControl({ setLayerListVisible }));
          map.addControl(new TrackingControl({ map, view: map.getView(), containerId, t, setTrackingText }));
        }

        const newGraphicsLayer = new VectorLayer({
          source: new VectorSource({
            wrapX: false
          })
        });
        const highlightLayer = new VectorLayer({
          source: new VectorSource(),
          style: highlightStyle
        });

        map.addLayer(newGraphicsLayer);
        map.addLayer(highlightLayer);

        if (onClick || onHighlightClick) {
          map.on('click', event => onMapClick(event, newGraphicsLayer));
        }
        if (onHighlightClick) {
          mapinfoControl.current = new Control({
            element: mapInfoRef.current
          });
          map.addControl(mapinfoControl.current);
          map.on('pointermove', event => onMapPointerMove(event, newGraphicsLayer, highlightLayer));
        }

        setGraphicsLayer(newGraphicsLayer);
      }
    }, [
      map,
      clubModel,
      loaded,
      defaultExtent,
      mapCenter,
      useAllWidgets,
      onClick,
      onHighlightClick,
      containerId,
      t,
      onMapClick,
      onMapPointerMove
    ]);

    React.useEffect(() => {
      const zoomGraphics = defaultGraphics?.filter(
        graphic =>
          graphic.geometry.type !== 'point' ||
          graphic.geometry.longitude !== clubModel.map!.center[0] ||
          graphic.geometry.latitude !== clubModel.map!.center[1]
      );
      if (useDefaultGraphicsAsHome && homeExtent.current && graphicsLayer && zoomGraphics?.length) {
        homeExtent.current.setExtent(getExtent(zoomGraphics) ?? null);
      }
    }, [useDefaultGraphicsAsHome, graphicsLayer, defaultGraphics, clubModel.map]);

    React.useEffect(() => {
      if (mapInfoRef.current) {
        const text =
          trackingText && highlightText ? `${highlightText}<br/>${trackingText}` : (trackingText ?? highlightText);
        if (text && text.length) {
          const mapInfoTextDiv = document.getElementById(`${containerId}#orienteeringMapInfoText`);

          if (mapInfoTextDiv) mapInfoTextDiv.innerHTML = text;
          if (mapInfoRef.current) mapInfoRef.current.style.display = 'block';
        } else {
          if (mapInfoRef.current) mapInfoRef.current.style.display = 'none';
        }
      }
    }, [trackingText, highlightText, containerId]);

    React.useEffect(() => {
      if (map && graphicsLayer) {
        const updateGraphics = async (graphics?: IGraphic[]) => {
          if (!map || !graphicsLayer || !graphics) return;
          graphicsLayer.getSource()?.clear();
          graphicsLayer.getSource()?.addFeatures(
            graphics.map(graphic => {
              const feature =
                graphic.geometry.type === 'circle'
                  ? new Feature<Circle>({
                      geometry: new Circle(
                        fromLonLat(graphic.geometry.center!, mapProjection),
                        getMapLength(fromLonLat(graphic.geometry.center!, mapProjection), graphic.geometry.radius)
                      ),
                      attributes: graphic.attributes
                    })
                  : new Feature<Point>({
                      geometry: new Point(
                        fromLonLat([graphic.geometry.longitude, graphic.geometry.latitude], mapProjection)
                      ),
                      attributes: graphic.attributes
                    });

              feature.setStyle(
                graphic.geometry.type === 'circle' && graphic.symbol && graphic.symbol.type === 'simple-fill'
                  ? new Style({
                      geometry: function (feature) {
                        return feature.get('modifyGeometry') || feature.getGeometry();
                      },
                      fill: new Fill({
                        color: graphic.symbol.color
                      }),
                      stroke: new Stroke({
                        color: graphic.symbol.outline.color,
                        width: graphic.symbol.outline.width
                      })
                    })
                  : graphic.geometry.type === 'circle' && graphic.symbol && graphic.symbol.type === 'gradient-fill'
                    ? new Style({
                        renderer(coordinates, state) {
                          if (
                            graphic.geometry.type !== 'circle' ||
                            !graphic.symbol ||
                            graphic.symbol.type !== 'gradient-fill'
                          )
                            return;
                          const [[x, y], [x1, y1]] = coordinates as number[][];
                          const ctx = state.context;
                          const dx = x1 - x;
                          const dy = y1 - y;
                          const radius = Math.sqrt(dx * dx + dy * dy);

                          const innerRadius = 0;
                          const outerRadius = radius * 1.2;

                          const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
                          gradient.addColorStop(
                            0,
                            `rgba(${graphic.symbol.color![0]},${graphic.symbol.color![1]},${graphic.symbol.color![2]},0)`
                          );
                          gradient.addColorStop(
                            0.6,
                            `rgba(${graphic.symbol.color![0]},${graphic.symbol.color![1]},${graphic.symbol.color![2]},0)`
                          );
                          gradient.addColorStop(
                            1,
                            `rgba(${graphic.symbol.color![0]},${graphic.symbol.color![1]},${graphic.symbol.color![2]},${
                              graphic.symbol.color![3]
                            })`
                          );
                          ctx.beginPath();
                          ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
                          ctx.fillStyle = gradient;
                          ctx.fill();

                          ctx.lineWidth = graphic.symbol.outline.width;
                          ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
                          ctx.strokeStyle = `rgba(${graphic.symbol.outline.color![0]},${
                            graphic.symbol.outline.color![1]
                          },${graphic.symbol.outline.color![2]},${graphic.symbol.outline.color![3]})`;
                          ctx.stroke();
                        }
                      })
                    : graphic.geometry.type === 'point'
                      ? new Style({
                          image:
                            graphic.symbol && graphic.symbol.type === 'picture-marker'
                              ? new Icon({
                                  src: graphic.symbol.url,
                                  scale: 25 / graphic.symbol.width,
                                  size: [graphic.symbol.width, graphic.symbol.height]
                                })
                              : new Icon({
                                  src: OrienteeringSymbol.url,
                                  scale: 15 / OrienteeringSymbol.width,
                                  size: [OrienteeringSymbol.width, OrienteeringSymbol.height]
                                })
                        })
                      : undefined
              );

              return feature;
            })
          );
          if (onHighlightClick !== undefined) {
            graphicsLayer.getSource()?.addFeatures(
              graphics
                .filter(graphic => graphic.geometry.type === 'point')
                .map(graphic => {
                  const feature = new Feature<Point>({
                    geometry: new Point(
                      graphic.geometry.type === 'point'
                        ? fromLonLat([graphic.geometry.longitude, graphic.geometry.latitude], mapProjection)
                        : [0, 0]
                    ),
                    attributes: { direction: true }
                  });
                  feature.setStyle(
                    new Style({
                      image: new Icon({
                        anchor: [DirectionSymbol.xoffset, DirectionSymbol.yoffset],
                        anchorXUnits: 'pixels',
                        anchorYUnits: 'pixels',
                        src: DirectionSymbol.url,
                        scale: 15 / DirectionSymbol.width,
                        size: [DirectionSymbol.width, DirectionSymbol.height]
                      })
                    })
                  );
                  return feature;
                })
            );
          }
          const graphicsExists = graphics.some(
            graphic =>
              graphic.geometry.type !== 'point' ||
              graphic.geometry.longitude !== clubModel.map!.center[0] ||
              graphic.geometry.latitude !== clubModel.map!.center[1]
          );
          if (clubModel.map?.center && !mapCenter && !defaultExtent && !graphicsExists) {
            map.getView().setCenter(fromLonLat(clubModel.map.center, mapProjection));
            map.getView().setZoom(clubModel.map.defaultZoomLevel);
          } else if (graphicsExists) {
            const geometriesExtent = graphicsLayer.getSource()?.getExtent();
            const size = geometriesExtent && getSize(geometriesExtent);
            if (geometriesExtent && size)
              map.getView().fit(buffer(geometriesExtent, Math.min(...size) * 0.2), {
                maxZoom: 16,
                duration: 800
              });
          }
        };
        if (defaultGraphics && Array.isArray(defaultGraphics)) {
          updateGraphics(defaultGraphics);
        } else if (globalStateModel.graphics && globalStateModel.graphics.length > 0) {
          updateGraphics(globalStateModel.graphics);
          globalStateModel.setUpdateGraphicCallback(updateGraphics);

          return () => {
            globalStateModel.setUpdateGraphicCallback(async () => {
              console.warn('globalStateModel.updateGraphics not set.');
            });
          };
        }
      }
    }, [
      map,
      graphicsLayer,
      defaultGraphics,
      clubModel.map,
      globalStateModel,
      onHighlightClick,
      mapCenter,
      defaultExtent
    ]);

    return (
      <MapDiv key="map" height={height} width={width}>
        <Loader />
        <MapContainerDiv ref={mapRef} key={containerId} id={containerId} />
        <MapInfo ref={mapInfoRef} key={`${containerId}#orienteeringMapInfo`} id={`${containerId}#orienteeringMapInfo`}>
          <MapInfoText id={`${containerId}#orienteeringMapInfoText`} />
        </MapInfo>
        <LayerList map={map} visible={layerListVisible} />
      </MapDiv>
    );
  }
);

export default OSMOrienteeringMap;
