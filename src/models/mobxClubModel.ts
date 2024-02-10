import { action, computed, makeObservable, observable } from 'mobx';
import { IRaceClubs, IRaceClubsProps, RaceClubs } from './resultModel';
import { PickRequired } from './typescriptPartial';

type ModuleNameTypes =
  | 'News'
  | 'Calendar'
  | 'Stars'
  | 'ScoringBoard'
  | 'Eventor'
  | 'Results'
  | 'Users'
  | 'Photo'
  | 'HTMLEditor'
  | 'Files';

interface ILeagueProps {
  rankingLeagueAgeLimit: number;
  rankingRelayLeagueAgeLimit: number;
  points1000LeagueAgeLimit: number;
  pointsLeagueAgeLimit: number;
}
class League implements ILeagueProps {
  rankingLeagueAgeLimit = 0;
  rankingRelayLeagueAgeLimit = 0;
  points1000LeagueAgeLimit = 0;
  pointsLeagueAgeLimit = 0;

  constructor(options?: Partial<ILeagueProps>) {
    options && Object.assign(this, options);
    makeObservable(this, {
      rankingLeagueAgeLimit: observable,
      rankingRelayLeagueAgeLimit: observable,
      points1000LeagueAgeLimit: observable,
      pointsLeagueAgeLimit: observable,
      grandSlamAgeLimit: computed,
    });
  }

  get grandSlamAgeLimit() {
    return Math.max(
      this.rankingLeagueAgeLimit,
      this.rankingRelayLeagueAgeLimit,
      this.points1000LeagueAgeLimit,
      this.pointsLeagueAgeLimit
    );
  }
}

interface ILogoProps {
  url: string;
  width: number;
  height: number;
}

interface IColorProps {
  main: string;
  contrastText?: string;
}

interface IPaletteProps {
  primary: IColorProps;
  secondary: IColorProps;
  error: IColorProps;
  contrastThreshold?: number;
  tonalOffset?: number;
  type?: string;
}

interface ITypographyProps {
  fontFamily: string;
  fontSize: number;
  htmlFontSize?: number;
  useNextVariants?: boolean;
}

interface IThemeProps {
  palette: IPaletteProps;
  typography: ITypographyProps;
}

interface ILinkProps {
  name: string;
  url: string;
}

interface IModuleProps {
  name: ModuleNameTypes;
  addUrl?: string;
  deleteUrl?: string;
  updateUrl?: string;
  queryUrl?: string;
  league?: ILeagueProps;
}

export interface IModule extends Omit<IModuleProps, 'league'> {
  league: League;
  hasSubMenus: boolean;
}

class Module implements IModule {
  name: ModuleNameTypes;
  addUrl?: string;
  deleteUrl?: string;
  updateUrl?: string;
  queryUrl?: string;
  league: League;

  constructor({ name, ...options }: PickRequired<IModuleProps, 'name'>) {
    this.name = name;
    if (options) {
      const { league, ...rest } = options;
      Object.assign(this, rest);
      this.league = new League(league);
    } else {
      this.league = new League();
    }

    makeObservable(this, {
      name: observable,
      addUrl: observable,
      deleteUrl: observable,
      updateUrl: observable,
      queryUrl: observable,
      league: observable,
      hasSubMenus: computed,
    });
  }

  get hasSubMenus() {
    return (
      this.name !== 'Eventor' &&
      this.name !== 'ScoringBoard' &&
      this.name !== 'Stars' &&
      this.name !== 'HTMLEditor' &&
      this.name !== 'Files' &&
      this.name !== 'Users'
    );
  }
}

export interface ISponsorProps {
  name: string;
  logo: ILogoProps;
  url?: string;
  active: boolean;
}

interface IEventorProps {
  url?: string;
  eventsUrl?: string;
  organisationUrl?: string;
  entryFeeUrl?: string;
  entriesUrl?: string;
  startUrl?: string;
  classesUrl?: string;
  iofResultUrl?: string;
  resultUrl?: string;
  lengthUrl?: string;
  competitorsUrl?: string;
  personResultUrl?: string;
  externalLoginUrl?: string;
  organisationId: number;
  districtOrganisationId: number;
  oRingenOrganisationId?: number;
}

class Eventor implements IEventorProps {
  url = 'https://eventor.orientering.se/Events';
  eventsUrl = 'https://eventor.orientering.se/api/events';
  organisationUrl = 'https://eventor.orientering.se/api/organisation/';
  entryFeeUrl = 'https://eventor.orientering.se/api/entryfees/events/';
  entriesUrl = 'https://eventor.orientering.se/api/entries';
  startUrl = 'https://eventor.orientering.se/api/starts/organisation';
  classesUrl = 'https://eventor.orientering.se/api/eventclasses';
  iofResultUrl = 'https://eventor.orientering.se/api/results/event/iofxml';
  resultUrl = 'https://eventor.orientering.se/api/results/organisation';
  lengthUrl = 'https://eventor.orientering.se/Events/StartList';
  competitorsUrl = 'https://eventor.orientering.se/api/competitors';
  personResultUrl = 'https://eventor.orientering.se/api/results/person';
  externalLoginUrl = 'https://eventor.orientering.se/api/externalLoginUrl';
  organisationId = 0;
  districtOrganisationId = 0;
  oRingenOrganisationId = 611;

  constructor(options?: Partial<IEventorProps>) {
    options && Object.assign(this, options);
  }
}

export interface IExtentProps {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface IMapTileLayerProps {
  type: 'base-tile';
  id: string;
  title: string;
  visible?: boolean;
  urlTemplate: string;
  minZoomLevel?: number;
  maxZoomLevel?: number;
  fullExtent: IExtentProps;
  zoomExtent?: IExtentProps;
}

class MapTileLayer implements IMapTileLayerProps {
  readonly type = 'base-tile';
  id = '';
  title = '';
  visible = true;
  urlTemplate = '';
  minZoomLevel = 2;
  maxZoomLevel = 17;
  fullExtent: IExtentProps = {
    xmin: 0,
    ymin: 0,
    xmax: 0,
    ymax: 0,
  };
  zoomExtent?: IExtentProps;

  constructor(options: PickRequired<IMapTileLayerProps, 'id' | 'title' | 'urlTemplate' | 'fullExtent'>) {
    Object.assign(this, options);

    makeObservable(this, {
      id: observable,
      title: observable,
      visible: observable,
      urlTemplate: observable,
      minZoomLevel: observable,
      maxZoomLevel: observable,
      fullExtent: observable,
      zoomExtent: observable,
    });
  }
}

interface IMapGroupLayerProps {
  type: 'group';
  id: string;
  title: string;
  visible?: boolean;
  layers: IAnyLayerProps[];
}

export interface IMapGroupLayer extends Omit<IMapGroupLayerProps, 'layers'> {
  layers: IAnyLayer[];
  fullExtent: IExtentProps;
}

class MapGroupLayer implements IMapGroupLayer {
  readonly type = 'group';
  id = '';
  title = '';
  visible = true;
  layers: IAnyLayer[] = [];

  constructor(options: PickRequired<IMapGroupLayerProps, 'id' | 'title'>) {
    if (options) {
      const { layers, ...rest } = options;
      Object.assign(this, rest);
      if (layers)
        this.layers = layers.map((l) =>
          l.type === 'base-tile'
            ? new MapTileLayer(l as IMapTileLayerProps)
            : new MapGroupLayer(l as IMapGroupLayerProps)
        );
    }

    makeObservable(this, {
      id: observable,
      title: observable,
      visible: observable,
      layers: observable,
      fullExtent: computed,
    });
  }

  get fullExtent(): IExtentProps {
    const extent: IExtentProps = {
      xmin: 99999999999999,
      ymin: 99999999999999,
      xmax: -99999999999999,
      ymax: -99999999999999,
    };
    this.layers.forEach((layer) => {
      if (extent.xmin > layer.fullExtent.xmin) extent.xmin = layer.fullExtent.xmin;
      if (extent.ymin > layer.fullExtent.ymin) extent.ymin = layer.fullExtent.ymin;
      if (extent.xmax < layer.fullExtent.xmax) extent.xmax = layer.fullExtent.xmax;
      if (extent.ymax < layer.fullExtent.ymax) extent.ymax = layer.fullExtent.ymax;
    });
    return extent;
  }
}

type IAnyLayerProps = IMapTileLayerProps | IMapGroupLayerProps;
export type IAnyLayer = IMapTileLayerProps | IMapGroupLayer;

interface IMapProps {
  center: number[];
  defaultZoomLevel?: number;
  minZoomLevel?: number;
  maxZoomLevel?: number;
  layers: IAnyLayerProps[];
}

interface IMap extends Omit<IMapProps, 'layers' | 'defaultZoomLevel' | 'minZoomLevel' | 'maxZoomLevel'> {
  layers: IAnyLayer[];
  fullExtent: IExtentProps;
  defaultZoomLevel: number;
  minZoomLevel: number;
  maxZoomLevel: number;
  getLayerFullExtent: (id: string) => IExtentProps | undefined;
}

class Map implements IMap {
  center: number[] = [0, 0];
  defaultZoomLevel = 0;
  minZoomLevel = 2;
  maxZoomLevel = 17;
  layers: IAnyLayer[] = [];

  constructor(options: Partial<IMapProps>) {
    if (options) {
      const { layers, ...rest } = options;
      Object.assign(this, rest);
      if (layers)
        this.layers = layers.map((l) =>
          l.type === 'base-tile'
            ? new MapTileLayer(l as IMapTileLayerProps)
            : new MapGroupLayer(l as IMapGroupLayerProps)
        );
    }

    makeObservable(this, {
      center: observable,
      defaultZoomLevel: observable,
      minZoomLevel: observable,
      maxZoomLevel: observable,
      layers: observable,
      fullExtent: computed,
    });
  }

  getLayerFullExtent(id: string): IExtentProps | undefined {
    return this.layers.find((l) => l.id === id)?.fullExtent;
  }

  get fullExtent(): IExtentProps {
    const extent: IExtentProps = {
      xmin: 99999999999999,
      ymin: 99999999999999,
      xmax: -99999999999999,
      ymax: -99999999999999,
    };
    this.layers.forEach((layer) => {
      if (extent.xmin > layer.fullExtent.xmin) extent.xmin = layer.fullExtent.xmin;
      if (extent.ymin > layer.fullExtent.ymin) extent.ymin = layer.fullExtent.ymin;
      if (extent.xmax < layer.fullExtent.xmax) extent.xmax = layer.fullExtent.xmax;
      if (extent.ymax < layer.fullExtent.ymax) extent.ymax = layer.fullExtent.ymax;
    });
    return extent;
  }
}

export interface IMobxClubModelProps {
  title: string;
  titleLogo?: ILogoProps;
  map?: IMapProps;
  defaultLanguage: 'sv' | 'en';
  logo: ILogoProps;
  attachmentUrl: string;
  loginUrl: string;
  logoutUrl: string;
  theme: IThemeProps;
  modules: IModuleProps[];
  links: ILinkProps[];
  sports: string[];
  eventor?: IEventorProps;
  raceClubs?: IRaceClubsProps;
  corsProxy?: string;
  eventorCorsProxy?: string;
  oldUrl?: string;
  sponsors: ISponsorProps[];
  facebookUrl?: string;
}

export interface IMobxClubModel extends Omit<IMobxClubModelProps, 'map' | 'modules' | 'raceClubs' | 'eventor'> {
  map?: IMap;
  modules: IModule[];
  raceClubs?: IRaceClubs;
  eventor?: Eventor;
  setRaceClubs: (raceClubs: IRaceClubsProps) => void;
  module: (name: ModuleNameTypes) => IModule | undefined;
}

export class MobxClubModel implements IMobxClubModel {
  title = 'sportclub';
  titleLogo?: ILogoProps;
  map?: IMap;
  defaultLanguage: 'sv' | 'en' = 'sv';
  logo: ILogoProps;
  attachmentUrl = '/showfile.php?iFileID=';
  loginUrl = '/log_in.php';
  logoutUrl = '/log_out.php';
  theme: IThemeProps;
  modules: IModule[] = [];
  links: ILinkProps[] = [];
  sports: string[] = [];
  eventor?: Eventor;
  raceClubs?: IRaceClubs;
  corsProxy?: string;
  eventorCorsProxy?: string;
  oldUrl?: string;
  sponsors: ISponsorProps[] = [];
  facebookUrl?: string;

  constructor(options: PickRequired<IMobxClubModelProps, 'title' | 'logo' | 'theme'>) {
    const { title, logo, theme, map, modules, raceClubs, eventor, ...rest } = options;
    Object.assign(this, rest);
    this.title = title;
    this.logo = logo;
    this.theme = theme;
    if (map) this.map = new Map(map);
    if (modules) this.modules = modules.map((m) => new Module(m));
    if (raceClubs) this.raceClubs = new RaceClubs(raceClubs);
    if (eventor) this.eventor = new Eventor(eventor);

    if (options?.theme?.typography.useNextVariants === undefined) this.theme.typography.useNextVariants = true;

    makeObservable(this, {
      title: observable,
      titleLogo: observable,
      map: observable,
      defaultLanguage: observable,
      logo: observable,
      attachmentUrl: observable,
      loginUrl: observable,
      logoutUrl: observable,
      theme: observable,
      modules: observable,
      links: observable,
      sports: observable,
      eventor: observable,
      raceClubs: observable,
      corsProxy: observable,
      eventorCorsProxy: observable,
      oldUrl: observable,
      sponsors: observable,
      facebookUrl: observable,
      setRaceClubs: action.bound,
    });
  }

  setRaceClubs(raceClubs: IRaceClubsProps) {
    this.raceClubs = new RaceClubs(raceClubs);
    this.eventor?.organisationId && this.raceClubs.setSelectedClubByEventorId(this.eventor.organisationId);
  }

  module(name: ModuleNameTypes) {
    return this.modules.find((module) => module.name === name);
  }
}
