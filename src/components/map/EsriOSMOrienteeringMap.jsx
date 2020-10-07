import React from "react";
import styled from "styled-components";
import { setDefaultOptions, loadModules } from "esri-loader";

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

const OrienteeringSymbol = {
  type: "picture-marker", // autocasts as new PictureMarkerSymbol()
  url:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AEYFRQg5uEz8gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABBUlEQVQ4y62UQarCMBBA34Ru1UN4CE8ggrpRUMRNBRW8gCcTBBe6EPFKttVO/qL+yue32qQGQmASHm8mmUgElm+NVosAgMEAej2wHmwRSFPYbsHaJ7DTgc0GVN1hUQTTKTweIPIEWvuaLjBVWCzgcMjDgXe9kgT6fbhc/oSNV81UYbX6B/MzVIVuF67Xwm3jZJYkEIalsOqGItk6GsHp9PaoqQS73WAy+Qj7DPw1C0PY7Sol8z7lOIbxGI7HyqU2pWbWwnrtBCs3TNOstwvemZuhCNzvsFx6wYoNh0M4n7070uRmcQzzeS3Yy1AVZjPY72v/sRKBzW+17mg2CWi3M9g3oI0GP97CWNsUQOxvAAAAAElFTkSuQmCC",
  width: "15px",
  height: "15px"
};

const EsriOSMOrienteeringMap = ({ containerId, mapCenter, graphics = [], onClick = () => {} }) => {
  const GraphicRef = React.useRef();
  const CircleRef = React.useRef();
  const geometryEngineRef = React.useRef();
  const [graphicsLayer, setGraphicsLayer] = React.useState();
  const [mapView, setMapView] = React.useState();

  React.useEffect(() => {
    setDefaultOptions({ version: "4.14", css: true });
    loadModules([
      "esri/layers/OpenStreetMapLayer",
      "esri/layers/GraphicsLayer",
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/BaseTileLayer",
      "esri/Graphic",
      "esri/geometry/Circle",
      "esri/geometry/geometryEngine"
    ]).then(([OpenStreetMapLayer, GraphicsLayer, Map, MapView, BaseTileLayer, Graphic, Circle, geometryEngine]) => {
      GraphicRef.current = Graphic;
      CircleRef.current = Circle;
      geometryEngineRef.current = geometryEngine;
      const osmLayer = new OpenStreetMapLayer();
      const map = new Map({
        basemap: {
          baseLayers: [osmLayer]
        }
      });

      const view = new MapView({
        map: map,
        container: containerId, // Reference to the map object created before the scene
        zoom: 12, // Sets zoom level based on level of detail (LOD)
        center: mapCenter,
        highlightOptions: {
          color: "orange"
        }
      });
      view.ui.add(`${containerId}#orienteeringMapInfo`, "top-right");

      const OrienteeringTileLayer = BaseTileLayer.createSubclass({
        properties: {
          urlTemplates: []
        },

        getTileUrl: function (level, row, col) {
          return this.urlTemplates[Math.floor(Math.random() * Math.floor(this.urlTemplates.length))]
            .replace("{z}", level)
            .replace("{x}", col)
            .replace("{y}", row);
        }
      });

      const orienteeringLayer = new OrienteeringTileLayer({
        urlTemplates: [
          "https://tiler4.oobrien.com/oterrain_global/{z}/{x}/{y}.png",
          "https://tiler5.oobrien.com/oterrain_global/{z}/{x}/{y}.png",
          "https://tiler6.oobrien.com/oterrain_global/{z}/{x}/{y}.png"
        ],
        title: "Orienteering layer",
        minScale: 150000
      });

      map.add(orienteeringLayer);

      const newGraphicsLayer = new GraphicsLayer({
        title: "Graphics layer"
      });

      map.add(newGraphicsLayer);

      const onClickEvent = view.on("click", (event) => {
        onClick(
          newGraphicsLayer,
          new Graphic({
            geometry: { type: "point", ...event.mapPoint },
            symbol: OrienteeringSymbol
          })
        );
      });

      view.when(() => {
        view.whenLayerView(newGraphicsLayer).then((layerView) => {
          let highlight, currentUids;

          const highlightGraphics = (event) => {
            const highlighted = newGraphicsLayer.graphics.items.filter((g) => {
              const p = view.toScreen(g.geometry);
              return g.attributes && Math.abs(p.x - event.x) < 8 && Math.abs(p.y - event.y) < 8;
            });

            if (highlighted.length) {
              const text = highlighted
                .map((g) => g.attributes)
                .map((a) => `${a.time ? a.time : ""} ${a.name}`)
                .join("<br/>");
              const highlightedUids = highlighted.map((g) => g.uid);

              if (highlight && currentUids !== JSON.stringify(highlightedUids)) {
                highlight.remove();
                highlight = null;
                return;
              }

              if (highlight) {
                return;
              }

              document.getElementById(`${containerId}#orienteeringMapInfo`) &&
                (document.getElementById(`${containerId}#orienteeringMapInfo`).style.visibility = "visible");
              document.getElementById(`${containerId}#orienteeringMapInfoText`) &&
                (document.getElementById(`${containerId}#orienteeringMapInfoText`).innerHTML = text);

              currentUids = JSON.stringify(highlightedUids);
              highlight = layerView.highlight(highlightedUids);
            } else {
              // remove the highlight if no features are
              // returned from the hitTest
              highlight && highlight.remove();
              highlight = null;
              document.getElementById(`${containerId}#orienteeringMapInfo`) &&
                (document.getElementById(`${containerId}#orienteeringMapInfo`).style.visibility = "hidden");
            }
          };
          view.on("pointer-move", highlightGraphics);
          view.on("pointer-down", highlightGraphics);
          setMapView(view);
          setGraphicsLayer(newGraphicsLayer);
        });
      });

      return () => {
        onClickEvent && onClickEvent.remove();
      };
    });
  }, []);

  React.useEffect(() => {
    if (mapView && graphicsLayer) {
      graphicsLayer.removeAll();
      graphicsLayer.addMany(
        graphics.map(
          (graphic) =>
            new GraphicRef.current({
              geometry:
                graphic.geometry.type === "circle"
                  ? new CircleRef.current(graphic.geometry)
                  : {
                      ...graphic.geometry
                    },
              attributes: graphic.attributes,
              symbol: graphic.symbol ? graphic.symbol : OrienteeringSymbol
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
};

export default EsriOSMOrienteeringMap;
