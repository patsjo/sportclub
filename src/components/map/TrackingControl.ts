import { TFunction } from 'i18next';
import { Control } from 'ol/control';
import { getWidth } from 'ol/extent';
import Feature, { FeatureLike } from 'ol/Feature';
import Geolocation from 'ol/Geolocation';
import { Geometry, Point, Polygon } from 'ol/geom';
import { Vector as VectorLayer } from 'ol/layer';
import Map from 'ol/Map';
import * as proj from 'ol/proj';
import { Vector as VectorSource } from 'ol/source';
import * as wgs84Sphere from 'ol/sphere';
import { Circle as CircleStyle, Fill as FillStyle, Icon as IconStyle, Stroke as StrokeStyle, Style } from 'ol/style';
import View from 'ol/View';
import { ConvertSecondsToTime, FormatTime } from '../../utils/resultHelper';
import { mapProjection } from './useOpenLayersMap';

const maxAccuracy = 25;
const trackingCanvas = document.createElement('canvas');
const trackingContext = trackingCanvas.getContext('2d');
trackingCanvas.width = 31;
trackingCanvas.height = 31;
trackingContext!.strokeStyle = 'rgba(224,48,32,0.9)';
trackingContext!.lineWidth = 2.5;
trackingContext!.arc(15, 15, 10, 0, 2 * Math.PI, true);
trackingContext!.moveTo(0, 15);
trackingContext!.lineTo(10, 15);
trackingContext!.moveTo(30, 15);
trackingContext!.lineTo(20, 15);
trackingContext!.moveTo(15, 0);
trackingContext!.lineTo(15, 10);
trackingContext!.moveTo(15, 30);
trackingContext!.lineTo(15, 20);
trackingContext!.stroke();

export class TrackingControl extends Control {
  private geolocation?: Geolocation;
  private map: Map;
  private view: View;
  private containerId: string;
  private t: TFunction;
  private accuracy: number;
  private positions: (number[] | undefined)[];
  private latestPosition?: number[];
  private accuracyFeature?: Feature<Polygon>;
  private positionFeature?: Feature<Point>;
  private positionLayer?: VectorLayer;
  private oldPositionsLayer?: VectorLayer;
  private intervalId?: NodeJS.Timeout;
  private setTrackingText: (htmlText?: string) => void;

  constructor(options: {
    map: Map;
    view: View;
    containerId: string;
    t: TFunction;
    setTrackingText: (htmlText?: string) => void;
  }) {
    const button = document.createElement('button');
    button.innerHTML =
      '<svg viewBox="64 64 896 896" focusable="false" data-icon="aim" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M952 474H829.8C812.5 327.6 696.4 211.5 550 194.2V72c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v122.2C327.6 211.5 211.5 327.6 194.2 474H72c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h122.2C211.5 696.4 327.6 812.5 474 829.8V952c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V829.8C696.4 812.5 812.5 696.4 829.8 550H952c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zM512 756c-134.8 0-244-109.2-244-244s109.2-244 244-244 244 109.2 244 244-109.2 244-244 244z"></path><path d="M512 392c-32.1 0-62.1 12.4-84.8 35.2-22.7 22.7-35.2 52.7-35.2 84.8s12.5 62.1 35.2 84.8C449.9 619.4 480 632 512 632s62.1-12.5 84.8-35.2C619.4 574.1 632 544 632 512s-12.5-62.1-35.2-84.8A118.57 118.57 0 00512 392z"></path></svg>';

    const element = document.createElement('div');
    element.className = 'ol-selectable ol-control ol-tracking';
    element.appendChild(button);

    super({
      element: element,
    });

    this.map = options.map;
    this.view = options.view;
    this.containerId = options.containerId;
    this.positions = [];
    this.accuracy = maxAccuracy;
    this.t = options.t;
    this.setTrackingText = options.setTrackingText;
    button.addEventListener('click', this.trackingOnOff.bind(this), false);
  }

  trackingOnOff() {
    if (!this.geolocation) {
      this.element.className = 'ol-selectable ol-control ol-tracking ol-tracking-selected';
      this.geolocation = new Geolocation({
        projection: this.view.getProjection(),
        trackingOptions: {
          enableHighAccuracy: true,
        },
      });
      this.positions = [];
      this.accuracyFeature = new Feature();
      this.accuracyFeature.setStyle(
        new Style({
          renderer(coordinates, state) {
            let minX: number | undefined;
            let maxX: number | undefined;
            let minY: number | undefined;
            (coordinates[0] as number[][]).forEach((coord) => {
              minX = minX ? Math.min(minX, coord[0]) : coord[0];
              maxX = maxX ? Math.max(maxX, coord[0]) : coord[0];
              minY = minY ? Math.min(minY, coord[1]) : coord[1];
            });
            const radius = (maxX! - minX!) / 2;
            const x = minX! + radius;
            const y = minY! + radius;
            const ctx = state.context;

            const innerRadius = 0;
            const outerRadius = radius * 1.2;

            const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
            gradient.addColorStop(0, 'rgba(224,48,32,0)');
            gradient.addColorStop(0.6, 'rgba(224,48,32,0)');
            gradient.addColorStop(1, 'rgba(224,48,32,0.75)');
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
            ctx.strokeStyle = 'rgba(224,48,32,0.75)';
            ctx.stroke();
          },
        }),
      );

      this.positionFeature = new Feature();
      this.positionFeature.setStyle(
        new Style({
          image: new IconStyle({
            size: [31, 31],
            img: trackingCanvas,
          }),
        }),
      );
      this.positionLayer = new VectorLayer({
        source: new VectorSource({
          features: [this.accuracyFeature, this.positionFeature],
        }),
      });
      this.map.addLayer(this.positionLayer);
      this.oldPositionsLayer = new VectorLayer({
        style: new Style({
          image: new CircleStyle({
            radius: 4,
            fill: new FillStyle({
              color: 'rgba(224,48,32, 0.6)',
            }),
            stroke: new StrokeStyle({
              color: 'rgba(255, 255, 255, 0.6)',
              width: 2,
            }),
          }),
        }),
        source: new VectorSource({
          features: [],
        }),
      });
      this.map.addLayer(this.oldPositionsLayer);
      this.onGeoLocationChange();
      this.geolocation.on('change', this.onGeoLocationChange.bind(this));
      this.geolocation.setTracking(true);
      this.intervalId = setInterval(this.addPosition.bind(this), 5000);
    } else {
      this.setTrackingText(undefined);
      this.geolocation.setTracking(false);
      this.element.className = 'ol-selectable ol-control ol-tracking';
      this.geolocation.un('change', this.onGeoLocationChange);
      this.view.animate({
        rotation: 0,
        duration: 500,
      });
      this.map.render();
      this.geolocation = undefined;
      this.positions = [];
      this.latestPosition = undefined;
      this.positionLayer && this.map.removeLayer(this.positionLayer);
      this.positionLayer = undefined;
      this.oldPositionsLayer && this.map.removeLayer(this.oldPositionsLayer);
      this.oldPositionsLayer = undefined;
      this.positionFeature = undefined;
      this.accuracyFeature = undefined;
      this.intervalId && clearInterval(this.intervalId);
    }
  }

  onGeoLocationChange() {
    if (!this.geolocation || !this.accuracyFeature || !this.positionFeature) return;
    const position = this.geolocation.getPosition();
    let speed = this.geolocation.getSpeed() || 0;
    if (speed < 0.3) speed = 0;
    const heading = speed === 0 ? 0 : this.geolocation.getHeading() || 0;
    const m = Date.now();

    this.accuracy = this.geolocation.getAccuracy() ?? 500;
    this.positionFeature.setGeometry(position ? new Point(position) : undefined);
    if (this.accuracy > maxAccuracy)
      this.accuracyFeature.setGeometry(this.geolocation.getAccuracyGeometry() ?? undefined);
    else this.accuracyFeature.setGeometry(undefined);

    const minPerKm = speed > 0 ? FormatTime(ConvertSecondsToTime(Math.round(1000 / speed))) : '--:--';
    const currentAccuracy = this.geolocation.getAccuracy();

    const description = `${this.t('map.Speed')}: ${minPerKm} min/km<br/>${this.t('map.GPSAccuracy')}: ${
      currentAccuracy !== undefined ? parseFloat(currentAccuracy.toPrecision(2)) : 'X'
    } m`;
    this.setTrackingText(description);

    this.latestPosition = this.accuracy <= maxAccuracy * 2.5 ? position : undefined;

    if (!position) return;

    const accuracyGeometry = this.accuracyFeature.getGeometry();
    const unitsPerMeter = accuracyGeometry
      ? getWidth(accuracyGeometry.getExtent()) / (2 * this.accuracy)
      : this.view.getProjection().getMetersPerUnit()!;
    const extentSizeHalf = (unitsPerMeter * Math.max(100, this.accuracy * 4, speed * 20)) / 2;
    const center =
      this.accuracy <= maxAccuracy * 2.5
        ? this.getCenterWithHeading(position, -heading, this.view.getResolution()!)
        : position;
    const extent = [
      center[0] - extentSizeHalf,
      center[1] - extentSizeHalf,
      center[0] + extentSizeHalf,
      center[1] + extentSizeHalf,
    ];
    const resolution = Math.max(this.view.getResolutionForExtent(extent), this.view.getMinResolution());
    this.view.animate({
      center,
      resolution,
      rotation: speed === 0 ? undefined : this.accuracy <= maxAccuracy * 2.5 ? -heading : 0,
      duration: 500,
    });
    this.map.render();
  }

  radToDeg(rad: number) {
    return (rad * 360) / (Math.PI * 2);
  }

  degToRad(deg: number) {
    return (deg * Math.PI * 2) / 360;
  }

  mod(n: number) {
    return ((n % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }

  addPosition() {
    this.positions = [this.latestPosition, ...this.positions];
    this.positions = this.positions.slice(0, 8640);

    const coordsOutsideAccuracy: number[][] = [];

    this.positions.forEach((pos) => {
      if (pos && this.latestPosition) {
        const dist = wgs84Sphere.getDistance(
          proj.transform(this.latestPosition, mapProjection, 'EPSG:4326'),
          proj.transform(pos, mapProjection, 'EPSG:4326'),
        );
        if (dist > Math.max(0.15 * this.accuracy, 0.75 * maxAccuracy)) coordsOutsideAccuracy.push(pos);
      }
    });
    const features = coordsOutsideAccuracy.map(
      (coord) =>
        new Feature<Point>({
          geometry: new Point(coord),
        }),
    );
    this.oldPositionsLayer?.getSource()?.clear();
    this.oldPositionsLayer?.getSource()?.addFeatures(features);
  }

  getCenterWithHeading(position: number[], rotation: number, resolution: number) {
    const size = this.map.getSize();
    const height = size![1];

    return [
      position[0] - (Math.sin(rotation) * height * resolution * 1) / 8,
      position[1] + (Math.cos(rotation) * height * resolution * 1) / 8,
    ];
  }
}
