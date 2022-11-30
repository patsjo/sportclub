export type GraphicAttributeTypesType = 'calendar' | 'event';

interface IPointGeometry {
  type: 'point';
  longitude: number;
  latitude: number;
}

interface ICircleGeometry {
  type: 'circle';
  center: number[];
  geodesic: true;
  radius: number;
}

interface IAttributes {
  name: string;
  time?: string;
  type: 'logo' | 'event' | 'calendar';
}

interface IOutlineSymbol {
  color: number[];
  width: number;
}

interface IPictureMarkerSymbol {
  type: 'picture-marker';
  url: string;
  width: number;
  height: number;
}

interface ISimpleFillSymbol {
  type: 'simple-fill' | 'gradient-fill';
  color: number[];
  style: 'solid';
  outline: IOutlineSymbol;
}

export interface IGraphic {
  geometry: IPointGeometry | ICircleGeometry;
  attributes?: IAttributes;
  symbol?: IPictureMarkerSymbol | ISimpleFillSymbol;
}
