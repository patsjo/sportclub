import React from 'react';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { message } from 'antd';
import { backgroundLayerIds } from './useEsriMap';
import { useTranslation } from 'react-i18next';

const MapDiv = styled.div`
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

const EsriOSMOrienteeringMap = inject('globalStateModel')(
  observer(
    ({ globalStateModel, containerId, mapCenter, graphics = [], onClick = () => {}, onHighlightClick = () => {} }) => {
      const { t } = useTranslation();
      const [graphicsLayer, setGraphicsLayer] = React.useState();
      const [mapView, setMapView] = React.useState();

      React.useEffect(() => {
        if (globalStateModel.map && !globalStateModel.mapLoading) {
          const visibleViewLayerIds = [...backgroundLayerIds, containerId];

          const view = new globalStateModel.MapView({
            map: globalStateModel.map,
            container: containerId, // Reference to the map object created before the scene
            zoom: 12, // Sets zoom level based on level of detail (LOD)
            center: mapCenter,
            highlightOptions: {
              color: 'orange',
            },
          });
          view.ui.add(`${containerId}#orienteeringMapInfo`, 'top-right');

          const onTouchEvent = view.on('pointer-down', (event) => {
            const point = globalStateModel.WebMercatorUtils.webMercatorToGeographic(view.toMap(event));
            onClick(
              newGraphicsLayer,
              new globalStateModel.Graphic({
                geometry: { type: 'point', longitude: point.x, latitude: point.y },
                symbol: OrienteeringSymbol,
              })
            );
          });

          const onLayerViewCreate = view.on('layerview-create', (event) => {
            if (globalStateModel.map.layers.items.some((l) => l.id === event.layer.id)) {
              event.layerView.visible = visibleViewLayerIds.includes(event.layer.id);
            }
          });

          let newGraphicsLayer = globalStateModel.map.layers.items.find((l) => l.id === containerId);
          if (!newGraphicsLayer) {
            newGraphicsLayer = new globalStateModel.GraphicsLayer({
              id: containerId,
              title: 'Graphics layer',
            });

            globalStateModel.map.add(newGraphicsLayer);
          }

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
                  if (highLightedDirections.length) {
                    onHighlightClick(newGraphicsLayer, highLightedDirections[0]);
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
          };
        }
      }, [globalStateModel.map, globalStateModel.mapLoading]);

      React.useEffect(() => {
        if (mapView && graphicsLayer) {
          graphicsLayer.removeAll();
          graphicsLayer.addMany(
            graphics.map(
              (graphic) =>
                new globalStateModel.Graphic({
                  geometry:
                    graphic.geometry.type === 'circle'
                      ? new globalStateModel.Circle(graphic.geometry)
                      : {
                          ...graphic.geometry,
                        },
                  attributes: graphic.attributes,
                  symbol: graphic.symbol ? graphic.symbol : OrienteeringSymbol,
                })
            )
          );
          graphicsLayer.addMany(
            graphics
              .filter((graphic) => graphic.geometry.type === 'point')
              .map(
                (graphic) =>
                  new globalStateModel.Graphic({
                    geometry: {
                      ...graphic.geometry,
                    },
                    attributes: { direction: true },
                    symbol: DirectionSymbol,
                  })
              )
          );
          mapView.goTo(graphicsLayer.graphics.items);
        }
      }, [mapView, graphics, graphics.length, graphicsLayer]);

      return (
        <>
          <MapDiv id={containerId} />
          <MapInfo id={`${containerId}#orienteeringMapInfo`}>
            <div id={`${containerId}#orienteeringMapInfoText`} />
          </MapInfo>
        </>
      );
    }
  )
);

export default EsriOSMOrienteeringMap;
