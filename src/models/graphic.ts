import { SnapshotIn, types } from 'mobx-state-tree';

export type GraphicAttributeTypesType = 'calendar' | 'event';

const PointGeometry = types.model({
  type: types.literal('point'),
  longitude: types.number,
  latitude: types.number,
});

const CircleGeometry = types.model({
  type: types.literal('circle'),
  center: types.array(types.number),
  geodesic: types.boolean,
  radius: types.integer,
  radiusUnit: types.literal('kilometers'),
});

const Attributes = types.model({
  name: types.string,
  time: types.maybe(types.string),
  type: types.union(types.literal('logo'), types.literal('event'), types.literal('calendar')),
});

const OutlineSymbol = types.model({
  color: types.array(types.number),
  width: types.integer,
});

const PictureMarkerSymbol = types.model({
  type: types.literal('picture-marker'),
  url: types.string,
  width: types.string,
  height: types.string,
});

const SimpleFillSymbol = types.model({
  type: types.literal('simple-fill'),
  color: types.array(types.number),
  style: types.literal('solid'),
  outline: OutlineSymbol,
});

export const Graphic = types.model({
  geometry: types.union(PointGeometry, CircleGeometry),
  attributes: types.maybe(Attributes),
  symbol: types.maybe(types.union(PictureMarkerSymbol, SimpleFillSymbol)),
});
export type IGraphic = SnapshotIn<typeof Graphic>;
