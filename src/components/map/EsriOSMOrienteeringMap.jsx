import React from "react";
import styled from "styled-components";
import { setDefaultOptions, loadModules } from "esri-loader";

const MapDiv = styled.div`
  height: 100%;
  width: 100%;
`;

const EsriOSMOrienteeringMap = ({ containerId, mapCenter }) => {
  const [map, setMap] = React.useState();
  const [mapView, setMapView] = React.useState();

  React.useEffect(() => {
    setDefaultOptions({ css: true });
    loadModules(["esri/layers/OpenStreetMapLayer", "esri/Map", "esri/views/MapView", "esri/layers/BaseTileLayer"]).then(
      ([OpenStreetMapLayer, Map, MapView, BaseTileLayer]) => {
        var osmLayer = new OpenStreetMapLayer();
        var map = new Map({
          basemap: {
            baseLayers: [osmLayer]
          }
        });

        var view = new MapView({
          map: map,
          container: containerId, // Reference to the map object created before the scene
          zoom: 12, // Sets zoom level based on level of detail (LOD)
          center: mapCenter
        });

        var OrienteeringTileLayer = BaseTileLayer.createSubclass({
          properties: {
            urlTemplate: null
          },

          getTileUrl: function(level, row, col) {
            return this.urlTemplate
              .replace("{z}", level)
              .replace("{x}", col)
              .replace("{y}", row);
          }
        });

        var orienteeringLayer = new OrienteeringTileLayer({
          urlTemplate: "https://tiler4.oobrien.com/oterrain_global/{z}/{x}/{y}.png",
          title: "Orienteering layer"
        });

        map.add(orienteeringLayer);

        view.when(() => {
          setMap(map);
          setMapView(view);
        });

        return () => {
          setMapView(undefined);
          setMap(undefined);
        };
      }
    );
  }, []);

  return <MapDiv id={containerId} />;
};

export default EsriOSMOrienteeringMap;
