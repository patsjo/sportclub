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
  font-size: 10pt;
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
  const geometryEngineRef = React.useRef();

  React.useEffect(() => {
    setDefaultOptions({ css: true });
    loadModules([
      "esri/layers/OpenStreetMapLayer",
      "esri/layers/GraphicsLayer",
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/BaseTileLayer",
      "esri/Graphic",
      "esri/geometry/geometryEngine"
    ]).then(([OpenStreetMapLayer, GraphicsLayer, Map, MapView, BaseTileLayer, Graphic, geometryEngine]) => {
      GraphicRef.current = Graphic;
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
      view.ui.add("orienteeringMapInfo", "top-right");

      const OrienteeringTileLayer = BaseTileLayer.createSubclass({
        properties: {
          urlTemplates: []
        },

        getTileUrl: function(level, row, col) {
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
        title: "Orienteering layer"
      });

      map.add(orienteeringLayer);

      const graphicsLayer = new GraphicsLayer({
        title: "Graphics layer",
        graphics: graphics.map(
          graphic =>
            new Graphic({
              geometry: {
                type: "point", // autocasts as new Point()
                ...graphic.geometry
              },
              attributes: graphic.attributes,
              symbol: graphic.symbol ? graphic.symbol : OrienteeringSymbol
            })
        )
      });

      map.add(graphicsLayer);

      const onClickEvent = view.on("click", event => {
        onClick(
          graphicsLayer,
          new Graphic({
            geometry: event.mapPoint,
            symbol: OrienteeringSymbol
          })
        );
      });

      view.when(() => {
        view.whenLayerView(graphicsLayer).then(layerView => {
          const eventHandler = event => {
            // the hitTest() checks to see if any graphics in the view
            // intersect the x, y coordinates of the pointer
            view.hitTest(event).then(getGraphics);
          };

          view.on("pointer-move", eventHandler);
          view.on("pointer-down", eventHandler);

          let highlight, currentUid;

          const getGraphics = response => {
            // the topmost graphic from the hurricanesLayer
            // and display select attribute values from the
            // graphic to the user
            if (response.results.length) {
              const graphics = response.results
                .filter(function(result) {
                  return result.graphic.layer === graphicsLayer;
                })
                .map(r => r.graphic);
              const text = graphics
                .map(g => g.attributes)
                .map(a => `${a.time ? a.time : ""} ${a.name}`)
                .join("<br/>");

              if (highlight && currentUid !== graphics[0].uid) {
                highlight.remove();
                highlight = null;
                return;
              }

              if (highlight) {
                return;
              }

              document.getElementById("orienteeringMapInfo").style.visibility = "visible";
              document.getElementById("orienteeringMapInfoText").innerHTML = text;

              currentUid = graphics[0].uid;
              highlight = layerView.highlight(currentUid);
            } else {
              // remove the highlight if no features are
              // returned from the hitTest
              highlight.remove();
              highlight = null;
              document.getElementById("orienteeringMapInfo").style.visibility = "hidden";
            }
          };
          view.goTo(graphicsLayer.graphics.items);
        });
      });

      return () => {
        onClickEvent && onClickEvent.remove();
      };
    });
  }, []);

  return (
    <>
      <MapDiv id={containerId} />
      <MapInfo id="orienteeringMapInfo">
        <div id="orienteeringMapInfoText" />
      </MapInfo>
    </>
  );
};

export default EsriOSMOrienteeringMap;
