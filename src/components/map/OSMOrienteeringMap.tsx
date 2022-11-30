import { observer } from 'mobx-react';
import { IGraphic } from 'models/graphic';
import { Control, FullScreen, ZoomToExtent } from 'ol/control';
import Feature from 'ol/Feature';
import { Circle, Geometry, Point } from 'ol/geom';
import { Vector as VectorLayer } from 'ol/layer';
import * as proj from 'ol/proj';
import { fromLonLat } from 'ol/proj';
import RenderFeature from 'ol/render/Feature';
import { Vector as VectorSource } from 'ol/source';
import * as wgs84Sphere from 'ol/sphere';
import { Fill, Icon, Stroke, Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMobxStore } from 'utils/mobxStore';
import LayerList from './LayerList';
import { LayerListControl } from './LayerListControl';
import Loader from './Loader';
import { TrackingControl } from './TrackingControl';
import { mapProjection, useOpenLayersMap } from './useOpenLayersMap';

interface IMapDivProps {
  height: string;
  width: string;
}
const MapDiv = styled.div`
  height: ${(props: IMapDivProps) => props.height};
  width: ${(props: IMapDivProps) => props.width};
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
  yoffset: -5,
};

const highlightStyle = new Style({
  image: new CircleStyle({
    radius: 25,
    stroke: new Stroke({
      color: 'rgba(255, 190, 32, 0.6)',
      width: 8,
    }),
  }),
});

export const OrienteeringSymbol = {
  type: 'picture-marker',
  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AEYFRQg5uEz8gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABBUlEQVQ4y62UQarCMBBA34Ru1UN4CE8ggrpRUMRNBRW8gCcTBBe6EPFKttVO/qL+yue32qQGQmASHm8mmUgElm+NVosAgMEAej2wHmwRSFPYbsHaJ7DTgc0GVN1hUQTTKTweIPIEWvuaLjBVWCzgcMjDgXe9kgT6fbhc/oSNV81UYbX6B/MzVIVuF67Xwm3jZJYkEIalsOqGItk6GsHp9PaoqQS73WAy+Qj7DPw1C0PY7Sol8z7lOIbxGI7HyqU2pWbWwnrtBCs3TNOstwvemZuhCNzvsFx6wYoNh0M4n7070uRmcQzzeS3Yy1AVZjPY72v/sRKBzW+17mg2CWi3M9g3oI0GP97CWNsUQOxvAAAAAElFTkSuQmCC',
  width: 20,
  height: 20,
};

interface IOSMOrienteeringMapProps {
  containerId: string;
  height: string;
  width: string;
  defaultGraphics?: IGraphic[];
  useAllWidgets?: boolean;
  mapCenter?: number[];
  onClick?: (graphicsLayer: VectorLayer<VectorSource<Geometry>>, graphic: Feature<Point>) => void;
  onHighlightClick?: (graphic: Feature<Point>) => void;
}

const OSMOrienteeringMap = observer(
  ({
    containerId,
    height,
    width,
    defaultGraphics = undefined,
    useAllWidgets = false,
    mapCenter,
    onClick,
    onHighlightClick = undefined,
  }: IOSMOrienteeringMapProps) => {
    const { globalStateModel, clubModel } = useMobxStore();
    const { t } = useTranslation();
    const [graphicsLayer, setGraphicsLayer] = React.useState<VectorLayer<VectorSource<Geometry>> | undefined>();
    const map = useOpenLayersMap();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInfoRef = useRef<HTMLDivElement>(null);
    const highlight = useRef<boolean>(false);
    const currentUids = useRef<string>();
    const mapinfoControl = useRef<Control>();
    const [loaded, setLoaded] = useState(false);
    const [layerListVisible, setLayerListVisible] = useState(false);
    const [trackingText, setTrackingText] = useState<string>();
    const [highlightText, setHighlightText] = useState<string>();

    const onMapClick = (event: any, newGraphicsLayer: VectorLayer<VectorSource<Geometry>>) => {
      const highlighted: Feature<Point>[] = [];
      map!.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          highlighted.push(feature as Feature<Point>);
          return undefined;
        },
        {
          layerFilter: (layer) => layer === newGraphicsLayer,
        }
      );

      onClick &&
        onClick(
          newGraphicsLayer,
          new Feature<Point>({
            geometry: new Point(event.coordinate),
            symbol: OrienteeringSymbol,
          })
        );
      const highLightedDirections = highlighted.filter((g: any) => g.getProperties().attributes?.direction);
      if (highLightedDirections.length > 0 && onHighlightClick !== undefined) {
        onHighlightClick(highLightedDirections[0]);
      }
    };

    const onMapPointerMove = (
      event: any,
      newGraphicsLayer: VectorLayer<VectorSource<Geometry>>,
      highlightLayer: VectorLayer<VectorSource<Point>>
    ) => {
      const highlighted: (RenderFeature | Feature<Geometry>)[] = [];
      map!.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          highlighted.push(feature);
          return undefined;
        },
        {
          layerFilter: (layer) => layer === newGraphicsLayer,
        }
      );

      let text: string | undefined = undefined;

      if (highlighted.length) {
        text = highlighted
          .filter((g) => !g.getProperties().attributes.direction)
          .map((g) => g.getProperties().attributes)
          .map((a) => `${a.time ? a.time : ''} ${a.name}`)
          .join('<br/>');
        const directionText = highlighted.some((g: any) => g.getProperties().attributes.direction)
          ? t('map.ClickForDirection')
          : '';
        text = `${text}${text && text.length && directionText && directionText.length ? '<br/>' : ''}${directionText}`;
        const highlightedUids = highlighted.map((g: any) => g.uid);
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
        currentUids.current = undefined;
        highlight.current = false;
        text = undefined;
      }

      setHighlightText(text);
    };

    const getMapLength = (point: number[], units: number) =>
      units > 0
        ? (units * units) /
          wgs84Sphere.getDistance(
            proj.transform(point, mapProjection, 'EPSG:4326'),
            proj.transform([point[0] + units, point[1]], mapProjection, 'EPSG:4326')
          )
        : 0;

    React.useEffect(() => {
      if (map && mapRef.current && mapInfoRef.current && !loaded) {
        setLoaded(true);
        map.setTarget(mapRef.current);
        mapCenter && map.getView().setCenter(fromLonLat(mapCenter, mapProjection));

        let defaultExtent = map.getView().calculateExtent();
        if (clubModel.map?.center) {
          map.getView().setCenter(fromLonLat(clubModel.map.center, mapProjection));
          map.getView().setZoom(clubModel.map.defaultZoomLevel);
          defaultExtent = map.getView().calculateExtent();
        } else if (mapCenter) {
          const center = fromLonLat(mapCenter, mapProjection);
          const extentHalfWidth = getMapLength(center, 500);
          defaultExtent = [
            center[0] - extentHalfWidth,
            center[1] - extentHalfWidth,
            center[0] + extentHalfWidth,
            center[1] + extentHalfWidth,
          ];
        }
        const homeIconContainer = document.createElement('span');
        homeIconContainer.innerHTML =
          '<svg viewBox="64 64 896 896" focusable="false" data-icon="home" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M946.5 505L560.1 118.8l-25.9-25.9a31.5 31.5 0 00-44.4 0L77.5 505a63.9 63.9 0 00-18.8 46c.4 35.2 29.7 63.3 64.9 63.3h42.5V940h691.8V614.3h43.4c17.1 0 33.2-6.7 45.3-18.8a63.6 63.6 0 0018.7-45.3c0-17-6.7-33.1-18.8-45.2zM568 868H456V664h112v204zm217.9-325.7V868H632V640c0-22.1-17.9-40-40-40H432c-22.1 0-40 17.9-40 40v228H238.1V542.3h-96l370-369.7 23.1 23.1L882 542.3h-96.1z"></path></svg>';
        map.addControl(
          new ZoomToExtent({
            extent: defaultExtent,
            label: homeIconContainer,
          })
        );

        if (useAllWidgets) {
          map.addControl(new FullScreen());
          map.addControl(new LayerListControl({ setLayerListVisible }));
          map.addControl(new TrackingControl({ map, view: map.getView(), containerId, t, setTrackingText }));
        }

        const newGraphicsLayer = new VectorLayer({
          source: new VectorSource({
            wrapX: false,
          }),
        });
        const highlightLayer = new VectorLayer({
          source: new VectorSource<Point>(),
          style: highlightStyle,
        });

        map.addLayer(newGraphicsLayer);
        map.addLayer(highlightLayer);

        if (onClick || onHighlightClick) {
          map.on('click', (event: any) => onMapClick(event, newGraphicsLayer));
        }
        if (onHighlightClick) {
          mapinfoControl.current = new Control({
            element: mapInfoRef.current,
          });
          map.addControl(mapinfoControl.current);
          map.on('pointermove', (event: any) => onMapPointerMove(event, newGraphicsLayer, highlightLayer));
        }

        setGraphicsLayer(newGraphicsLayer);
      }
    }, [map, clubModel, loaded]);

    React.useEffect(() => {
      if (mapInfoRef.current) {
        const text =
          trackingText && highlightText ? `${highlightText}<br/>${trackingText}` : trackingText ?? highlightText;
        if (text && text.length) {
          const mapInfoTextDiv = document.getElementById(`${containerId}#orienteeringMapInfoText`);

          mapInfoTextDiv && (mapInfoTextDiv.innerHTML = text);
          mapInfoRef.current && (mapInfoRef.current.style.display = 'block');
        } else {
          mapInfoRef.current && (mapInfoRef.current.style.display = 'none');
        }
      }
    }, [trackingText, highlightText]);

    React.useEffect(() => {
      if (map && graphicsLayer) {
        const updateGraphics = async (graphics?: IGraphic[]) => {
          if (!map || !graphicsLayer || !graphics) return;
          graphicsLayer.getSource()?.clear();
          graphicsLayer.getSource()?.addFeatures(
            graphics.map((graphic) => {
              const feature =
                graphic.geometry.type === 'circle'
                  ? new Feature<Circle>({
                      geometry: new Circle(
                        fromLonLat(graphic.geometry.center!, mapProjection),
                        getMapLength(fromLonLat(graphic.geometry.center!, mapProjection), graphic.geometry.radius)
                      ),
                      attributes: graphic.attributes,
                    })
                  : new Feature<Point>({
                      geometry: new Point(
                        fromLonLat([graphic.geometry.longitude, graphic.geometry.latitude], mapProjection)
                      ),
                      attributes: graphic.attributes,
                    });

              feature.setStyle(
                graphic.geometry.type === 'circle' && graphic.symbol && graphic.symbol.type === 'simple-fill'
                  ? new Style({
                      geometry: function (feature) {
                        return feature.get('modifyGeometry') || feature.getGeometry();
                      },
                      fill: new Fill({
                        color: graphic.symbol.color,
                      }),
                      stroke: new Stroke({
                        color: graphic.symbol.outline.color,
                        width: graphic.symbol.outline.width,
                      }),
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
                      },
                    })
                  : graphic.geometry.type === 'point'
                  ? new Style({
                      image:
                        graphic.symbol && graphic.symbol.type === 'picture-marker'
                          ? new Icon({
                              src: graphic.symbol.url,
                              scale: 25 / graphic.symbol.width,
                              imgSize: [graphic.symbol.width, graphic.symbol.height],
                            })
                          : new Icon({
                              src: OrienteeringSymbol.url,
                              scale: 15 / OrienteeringSymbol.width,
                              imgSize: [OrienteeringSymbol.width, OrienteeringSymbol.height],
                            }),
                    })
                  : undefined
              );

              return feature;
            })
          );
          if (onHighlightClick !== undefined) {
            graphicsLayer.getSource()?.addFeatures(
              graphics
                .filter((graphic) => graphic.geometry.type === 'point')
                .map((graphic) => {
                  const feature = new Feature<Point>({
                    geometry: new Point(
                      graphic.geometry.type === 'point'
                        ? fromLonLat([graphic.geometry.longitude, graphic.geometry.latitude], mapProjection)
                        : [0, 0]
                    ),
                    attributes: { direction: true },
                  });
                  feature.setStyle(
                    new Style({
                      image: new Icon({
                        anchor: [DirectionSymbol.xoffset, DirectionSymbol.yoffset],
                        anchorXUnits: 'pixels',
                        anchorYUnits: 'pixels',
                        src: DirectionSymbol.url,
                        scale: 15 / DirectionSymbol.width,
                        imgSize: [DirectionSymbol.width, DirectionSymbol.height],
                      }),
                    })
                  );
                  return feature;
                })
            );
          }
          if (
            clubModel.map?.center &&
            !graphics.some(
              (graphic) =>
                graphic.geometry.type !== 'point' ||
                graphic.geometry.longitude !== clubModel.map!.center[0] ||
                graphic.geometry.latitude !== clubModel.map!.center[1]
            )
          ) {
            map.getView().setCenter(fromLonLat(clubModel.map.center, mapProjection));
            map.getView().setZoom(clubModel.map.defaultZoomLevel);
          } else {
            const geometriesExtent = graphicsLayer.getSource()?.getExtent();
            geometriesExtent &&
              map.getView().fit(geometriesExtent, {
                padding: [40, 40, 40, 40],
                maxZoom: 16,
                duration: 800,
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
    }, [map, graphicsLayer, defaultGraphics, clubModel.map]);

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
