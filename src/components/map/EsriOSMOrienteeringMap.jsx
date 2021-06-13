import React from 'react';
import styled from 'styled-components';
import { message } from 'antd';
import { loadModules } from 'esri-loader';
import { backgroundLayerIds } from './EsriMapHelper.js';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react';
import Loader from './Loader';

const MapDiv = styled.div`
  height: ${(props) => props.height};
  width: ${(props) => props.width};
  marginbottom: 12px;
  position: relative;
`;
const MapContainerDiv = styled.div`
  height: 100%;
  width: 100%;
`;
const MapInfo = styled.div`
  background-color: white;
  color: black;
  font-size: 9pt;
  padding: 4px;
  visibility: hidden;
`;

export const DirectionPngUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QIIEx8SFao54QAAAZ9JREFUWMPV2L9Lw0AUB/Dvu9R26A3i3+AfITgIcdNJQbAQB+ciDuJi5vgPVFxFLVpE8C8wIMX/KA622rqc0NImud9p3pYEjk/eXS7vHsFShEl2BOAWwA+AszTmrzbGJUu4DoBHAIG49QsgSmM+qBy4BAebSHKEs4YkhzgrSHKMM0aSB5wRkjzhtJHkEaeFJM84ZSTJ4BjhaTKF1WAETKbolCGZTOZMcNH22tL7Ysx+mGTHWkBb03q608xFirELkczHmjNBMg8fhBGS+cCZIEkVt7UZ4GKviQ3OtKF3HyP0P8dSWxBTzdzlfssIp5rJRphkByrTut62UuMiKH7Hf+Q3A9Bzteby4mE4wv1wXPoOAHqNss26LHavvwqfv1+1dXBzie6KhbkqmZv9WM5ZGvM3ACeukRq4KI35CwOANObPLpGauMHcRu0KaYJb+JO4QJrgcutB1788lQKWPFbRWtU1eS71lUt/qZLfEVLqXFL/Q1Mtjp21OLjXovVRi+aRBtJ/+00BWV0DUwJZfQu4ALk6TfQZ5CGAG3HZFYWwcfwBUbAXA/xsjAAAAAAASUVORK5CYII=';

const DirectionSymbol = {
  type: 'picture-marker', // autocasts as new PictureMarkerSymbol()
  url: DirectionPngUrl,
  width: '15px',
  height: '15px',
  xoffset: '10px',
  yoffset: '-10px',
};

const OrienteeringSymbol = {
  type: 'picture-marker', // autocasts as new PictureMarkerSymbol()
  url:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AEYFRQg5uEz8gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABBUlEQVQ4y62UQarCMBBA34Ru1UN4CE8ggrpRUMRNBRW8gCcTBBe6EPFKttVO/qL+yue32qQGQmASHm8mmUgElm+NVosAgMEAej2wHmwRSFPYbsHaJ7DTgc0GVN1hUQTTKTweIPIEWvuaLjBVWCzgcMjDgXe9kgT6fbhc/oSNV81UYbX6B/MzVIVuF67Xwm3jZJYkEIalsOqGItk6GsHp9PaoqQS73WAy+Qj7DPw1C0PY7Sol8z7lOIbxGI7HyqU2pWbWwnrtBCs3TNOstwvemZuhCNzvsFx6wYoNh0M4n7070uRmcQzzeS3Yy1AVZjPY72v/sRKBzW+17mg2CWi3M9g3oI0GP97CWNsUQOxvAAAAAElFTkSuQmCC',
  width: '15px',
  height: '15px',
};

const EsriOSMOrienteeringMap = observer(
  ({
    globalStateModel,
    clubModel,
    containerId,
    height,
    width,
    defaultGraphics = undefined,
    useAllWidgets = false,
    onClick = () => {},
    onHighlightClick = undefined,
  }) => {
    const { t } = useTranslation();
    const [graphicsLayer, setGraphicsLayer] = React.useState();
    const [mapView, setMapView] = React.useState();

    React.useEffect(() => {
      if (globalStateModel.map) {
        const visibleViewLayerIds = [
          ...backgroundLayerIds,
          ...clubModel.map.layers.filter((l) => l.visible).map((l) => l.id),
          containerId,
        ];

        const esriLoad = async () => {
          const [
            EsriMapView,
            EsriGraphicsLayer,
            EsriGraphic,
            EsriWebMercatorUtils,
            EsriExtent,
            EsriHomeWidget,
            EsriFullscreenWidget,
            EsriLayerListWidget,
            EsriExpandWidget,
            EsriTrackWidget,
            EsriWatchUtils,
          ] = await loadModules([
            'esri/views/MapView',
            'esri/layers/GraphicsLayer',
            'esri/Graphic',
            'esri/geometry/support/webMercatorUtils',
            'esri/geometry/Extent',
            'esri/widgets/Home',
            'esri/widgets/Fullscreen',
            'esri/widgets/LayerList',
            'esri/widgets/Expand',
            'esri/widgets/Track',
            'esri/core/watchUtils',
          ]);

          const view = new EsriMapView({
            map: globalStateModel.map,
            container: containerId, // Reference to the map object created before the scene
            extent: clubModel.map.fullExtent,
            highlightOptions: {
              color: 'orange',
            },
            constraints: {
              minScale: clubModel.map.minScale,
              maxScale: clubModel.map.maxScale,
            },
          });
          view.ui.add(`${containerId}#orienteeringMapInfo`, 'top-right');

          const homeWidget = new EsriHomeWidget({
            view: view,
          });
          view.ui.add(homeWidget, 'top-left');

          let layerListTriggerActionEvent;

          if (useAllWidgets) {
            function defineActions(event) {
              const item = event.item;
              item.actionsSections = [
                [
                  {
                    title: t('map.GoToFullExtent'),
                    className: 'esri-icon-search',
                    id: 'full-extent',
                  },
                ],
              ];
            }

            const layerList = new EsriLayerListWidget({
              view: view,
              container: document.createElement('div'),
              listItemCreatedFunction: defineActions,
            });

            layerListTriggerActionEvent = layerList.on('trigger-action', (event) => {
              console.log(event);

              // Capture the action id.
              var id = event.action.id;

              if (id === 'full-extent') {
                const extent = new EsriExtent(clubModel.map.getLayerFullExtent(event.item.layer.id));
                view.goTo(extent).then(() => {});
              }
            });

            const layerListExpand = new EsriExpandWidget({
              expandIconClass: 'esri-icon-layer-list',
              view: view,
              content: layerList,
              autoCollapse: true,
              mode: 'floating',
            });
            view.ui.add(layerListExpand, 'top-left');

            const fullscreen = new EsriFullscreenWidget({
              view: view,
            });
            view.ui.add(fullscreen, 'top-left');

            const trackWidget = new EsriTrackWidget({
              view: view,
              scale: 4000,
            });
            view.ui.add(trackWidget, 'top-left');
          }

          let newGraphicsLayer = globalStateModel.map.layers.items.find((l) => l.id === containerId);
          if (!newGraphicsLayer) {
            newGraphicsLayer = new EsriGraphicsLayer({
              id: containerId,
              title: 'Graphics layer',
              listMode: 'hide',
            });

            globalStateModel.map.add(newGraphicsLayer);
          }

          const onTouchEvent = view.on('pointer-down', (event) => {
            const point = EsriWebMercatorUtils.webMercatorToGeographic(view.toMap(event));
            onClick(
              newGraphicsLayer,
              new EsriGraphic({
                geometry: { type: 'point', longitude: point.x, latitude: point.y },
                symbol: OrienteeringSymbol,
              })
            );
          });

          const onLayerViewCreate = view.on('layerview-create', (event) => {
            if (globalStateModel.map.layers.items.some((l) => l.id === event.layer.id)) {
              event.layerView.visible = visibleViewLayerIds.includes(event.layer.id);
              if (event.layer.listMode === 'show' && !event.layerView.handleWhenLayerFalse) {
                event.layerView.handleWhenLayerFalse = EsriWatchUtils.whenFalse(event.layer, 'visible', (visible) => {
                  event.layerView.visible = visible;
                });
                event.layerView.handleWhenLayerTrue = EsriWatchUtils.whenTrue(event.layer, 'visible', (visible) => {
                  event.layerView.visible = visible;
                });
              }
            }
          });

          view.on('layerview-destroy', function (event) {
            event.layerView.handleWhenLayerFalse && event.layer.handleWhenLayerFalse.remove();
            event.layerView.handleWhenLayerTrue && event.layer.handleWhenLayerTrue.remove();
            event.layerView.handleWhenLayerFalse = undefined;
            event.layerView.handleWhenLayerTrue = undefined;
          });

          view
            .when(() => {
              view.whenLayerView(newGraphicsLayer).then((layerView) => {
                let highlight, currentUids, highlighted;

                const highlightGraphics = (event) => {
                  highlighted = newGraphicsLayer.graphics.items.filter((g) => {
                    const p = view.toScreen(g.geometry);
                    return (
                      g.attributes &&
                      ((!g.attributes.direction && Math.abs(p.x - event.x) < 8 && Math.abs(p.y - event.y) < 8) ||
                        (g.attributes.direction && Math.abs(p.x + 10 - event.x) + Math.abs(p.y + 10 - event.y) < 10))
                    );
                  });

                  if (highlighted.length) {
                    let text = highlighted
                      .filter((g) => !g.attributes.direction)
                      .map((g) => g.attributes)
                      .map((a) => `${a.time ? a.time : ''} ${a.name}`)
                      .join('<br/>');
                    text = `${text}${text && text.length ? '<br/>' : ''}${
                      highlighted.some((g) => g.attributes.direction) ? t('map.ClickForDirection') : ''
                    }`;
                    const highlightedUids = highlighted.map((g) => g.uid);

                    if (highlight && currentUids !== JSON.stringify(highlightedUids)) {
                      highlight.remove();
                      highlight = null;
                      return;
                    }

                    if (highlight) {
                      return;
                    }

                    if (text && text.length) {
                      document.getElementById(`${containerId}#orienteeringMapInfo`) &&
                        (document.getElementById(`${containerId}#orienteeringMapInfo`).style.visibility = 'visible');
                      document.getElementById(`${containerId}#orienteeringMapInfoText`) &&
                        (document.getElementById(`${containerId}#orienteeringMapInfoText`).innerHTML = text);
                    }

                    currentUids = JSON.stringify(highlightedUids);
                    highlight = layerView.highlight(highlightedUids);
                  } else {
                    // remove the highlight if no features are
                    // returned from the hitTest
                    highlight && highlight.remove();
                    highlight = null;
                    document.getElementById(`${containerId}#orienteeringMapInfo`) &&
                      (document.getElementById(`${containerId}#orienteeringMapInfo`).style.visibility = 'hidden');
                  }
                };
                const highlightGraphicsClick = (event) => {
                  highlightGraphics(event);
                  const highLightedDirections = highlighted.filter((g) => g.attributes.direction);
                  if (highLightedDirections.length && onHighlightClick !== undefined) {
                    onHighlightClick(highLightedDirections[0]);
                  }
                };
                view.on('pointer-move', highlightGraphics);
                view.on('pointer-up', highlightGraphicsClick);
                setMapView(view);
                setGraphicsLayer(newGraphicsLayer);
              });
            })
            .catch((e) => {
              message.error(e.message);
            });

          return () => {
            onTouchEvent && onTouchEvent.remove();
            onLayerViewCreate && onLayerViewCreate.remove();
            layerListTriggerActionEvent && layerListTriggerActionEvent.remove();
          };
        };

        esriLoad();
      }
    }, [globalStateModel.map]);

    React.useEffect(() => {
      if (mapView && graphicsLayer) {
        const updateGraphics = async (graphics) => {
          const [EsriGraphic, EsriCircle] = await loadModules(['esri/Graphic', 'esri/geometry/Circle']);
          graphicsLayer.removeAll();
          graphicsLayer.addMany(
            graphics.map(
              (graphic) =>
                new EsriGraphic({
                  geometry:
                    graphic.geometry.type === 'circle'
                      ? new EsriCircle(graphic.geometry)
                      : {
                          ...graphic.geometry,
                        },
                  attributes: graphic.attributes,
                  symbol: graphic.symbol ? graphic.symbol : OrienteeringSymbol,
                })
            )
          );
          if (onHighlightClick !== undefined) {
            graphicsLayer.addMany(
              graphics
                .filter((graphic) => graphic.geometry.type === 'point')
                .map(
                  (graphic) =>
                    new EsriGraphic({
                      geometry: {
                        ...graphic.geometry,
                      },
                      attributes: { direction: true },
                      symbol: DirectionSymbol,
                    })
                )
            );
          }
          mapView.goTo(graphicsLayer.graphics.items).then(() => {});
        };
        if (defaultGraphics && Array.isArray(defaultGraphics)) {
          updateGraphics(defaultGraphics);
        } else {
          updateGraphics(globalStateModel.graphics);
          globalStateModel.setUpdateGraphicCallback(updateGraphics);

          return () => {
            globalStateModel.setUpdateGraphicCallback(async () => {});
          };
        }
      }
    }, [mapView, graphicsLayer, defaultGraphics]);

    return (
      <MapDiv key="map" height={height} width={width}>
        <Loader view={mapView} />
        <MapContainerDiv key={containerId} id={containerId} />
        <MapInfo key={`${containerId}#orienteeringMapInfo`} id={`${containerId}#orienteeringMapInfo`}>
          <div id={`${containerId}#orienteeringMapInfoText`} />
        </MapInfo>
      </MapDiv>
    );
  }
);

export default EsriOSMOrienteeringMap;
