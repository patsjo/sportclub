import { types } from "mobx-state-tree";

const Geometry = types.model({
  longitude: types.number,
  latitude: types.number
});

const Attributes = types.model({
  name: types.string,
  time: types.maybe(types.string),
  type: types.union(types.literal("logo"), types.literal("event"), types.literal("calendar"))
});

const MapSymbol = types.model({
  type: types.literal("picture-marker"),
  url: types.string,
  width: types.string,
  height: types.string
});

export const Graphic = types.model({
  geometry: types.compose(Geometry),
  attributes: types.compose(Attributes),
  symbol: types.maybe(types.compose(MapSymbol))
});
