import { cast, IAnyModelType, Instance, SnapshotIn, SnapshotOrInstance, types } from 'mobx-state-tree';
import { IRaceClubsSnapshotIn, RaceClubs } from './resultModel';

type ModuleNameTypes =
  | 'News'
  | 'Calendar'
  | 'Stars'
  | 'ScoringBoard'
  | 'Eventor'
  | 'Results'
  | 'Users'
  | 'Photo'
  | 'HTMLEditor';

const League = types
  .model({
    rankingLeagueAgeLimit: types.optional(types.integer, 0),
    rankingRelayLeagueAgeLimit: types.optional(types.integer, 0),
    points1000LeagueAgeLimit: types.optional(types.integer, 0),
    pointsLeagueAgeLimit: types.optional(types.integer, 0),
  })
  .views((self) => ({
    get grandSlamAgeLimit() {
      return Math.max(
        self.rankingLeagueAgeLimit,
        self.rankingRelayLeagueAgeLimit,
        self.points1000LeagueAgeLimit,
        self.pointsLeagueAgeLimit
      );
    },
  }));

const Logo = types.model({
  url: types.string,
  width: types.integer,
  height: types.integer,
});

const Color = types.model({
  main: types.string,
  contrastText: types.maybe(types.string),
});

const Palette = types.model({
  primary: Color,
  secondary: Color,
  error: Color,
  contrastThreshold: types.maybe(types.integer),
  tonalOffset: types.maybe(types.number),
  type: types.maybe(types.string),
});

const Typography = types.model({
  fontFamily: types.string,
  fontSize: types.integer,
  htmlFontSize: types.maybe(types.integer),
  useNextVariants: types.optional(types.boolean, true),
});

const Theme = types.model({
  palette: Palette,
  typography: Typography,
});

const Link = types.model({
  name: types.string,
  url: types.string,
});

const Module = types
  .model({
    name: types.string,
    addUrl: types.maybe(types.string),
    deleteUrl: types.maybe(types.string),
    updateUrl: types.maybe(types.string),
    queryUrl: types.maybe(types.string),
    league: types.optional(League, {}),
  })
  .views((self) => ({
    get hasSubMenus() {
      return (
        self.name !== 'Eventor' &&
        self.name !== 'ScoringBoard' &&
        self.name !== 'Stars' &&
        self.name !== 'HTMLEditor' &&
        self.name !== 'Users'
      );
    },
  }));
export type IModule = Instance<typeof Module>;

const Sponsor = types.model({
  name: types.string,
  logo: Logo,
  url: types.maybe(types.string),
  active: types.boolean,
});
export type ISponsorSnapshotIn = SnapshotIn<typeof Sponsor>;

const Eventor = types.model({
  url: types.optional(types.string, 'https://eventor.orientering.se/Events'),
  eventsUrl: types.optional(types.string, 'https://eventor.orientering.se/api/events'),
  organisationUrl: types.optional(types.string, 'https://eventor.orientering.se/api/organisation/'),
  entryFeeUrl: types.optional(types.string, 'https://eventor.orientering.se/api/entryfees/events/'),
  entriesUrl: types.optional(types.string, 'https://eventor.orientering.se/api/entries'),
  startUrl: types.optional(types.string, 'https://eventor.orientering.se/api/starts/organisation'),
  classesUrl: types.optional(types.string, 'https://eventor.orientering.se/api/eventclasses'),
  resultUrl: types.optional(types.string, 'https://eventor.orientering.se/api/results/organisation'),
  lengthUrl: types.optional(types.string, 'https://eventor.orientering.se/Events/StartList'),
  competitorsUrl: types.optional(types.string, 'https://eventor.orientering.se/api/competitors'),
  personResultUrl: types.optional(types.string, 'https://eventor.orientering.se/api/results/person'),
  externalLoginUrl: types.optional(types.string, 'https://eventor.orientering.se/api/externalLoginUrl'),
  organisationId: types.integer,
  districtOrganisationId: types.integer,
  oRingenOrganisationId: types.optional(types.integer, 611),
});

const Extent = types.model({
  xmin: types.number,
  ymin: types.number,
  xmax: types.number,
  ymax: types.number,
});
type IExtent = SnapshotOrInstance<typeof Extent>;

const MapTileLayer = types
  .model({
    type: types.literal('base-tile'),
    id: types.string,
    title: types.string,
    visible: types.optional(types.boolean, true),
    urlTemplate: types.string,
    minZoomLevel: types.optional(types.number, 2),
    maxZoomLevel: types.optional(types.number, 17),
    fullExtent: Extent,
    zoomExtent: types.maybe(Extent),
  })
  .views((self) => ({
    getByLayerId(id: string) {
      if (self.id === id) return self;
      return undefined;
    },
  }));

const AnyLayer = types.union({
  eager: false,
  dispatcher: (snapshot): IAnyModelType => (snapshot.type === 'group' ? MapGroupLayer : MapTileLayer),
});

const MapGroupLayer = types
  .model({
    type: types.literal('group'),
    id: types.string,
    title: types.string,
    visible: types.optional(types.boolean, true),
    layers: types.array(AnyLayer),
  })
  .views((self) => ({
    get fullExtent(): IExtent {
      const extent: IExtent = {
        xmin: 99999999999999,
        ymin: 99999999999999,
        xmax: -99999999999999,
        ymax: -99999999999999,
      };
      self.layers.forEach((layer) => {
        if (extent.xmin > layer.fullExtent.xmin) extent.xmin = layer.fullExtent.xmin;
        if (extent.ymin > layer.fullExtent.ymin) extent.ymin = layer.fullExtent.ymin;
        if (extent.xmax < layer.fullExtent.xmax) extent.xmax = layer.fullExtent.xmax;
        if (extent.ymax < layer.fullExtent.ymax) extent.ymax = layer.fullExtent.ymax;
      });
      return extent;
    },
    getByLayerId(id: string) {
      if (self.id === id) return self;
      for (let i = 0; i < self.layers.length; i++) {
        const layer = self.layers[i].getByLayerId(id);
        if (layer) return layer;
      }
    },
  }));

const Map = types
  .model({
    center: types.array(types.number),
    defaultZoomLevel: types.optional(types.integer, 0),
    minZoomLevel: types.optional(types.number, 2),
    maxZoomLevel: types.optional(types.number, 17),
    layers: types.array(AnyLayer),
  })
  .views((self) => ({
    getLayerFullExtent(id: string): IExtent | undefined {
      for (let i = 0; i < self.layers.length; i++) {
        const layer = self.layers[i].getByLayerId(id);
        if (layer) return layer.fullExtent.toJSON();
      }
      return undefined;
    },
  }));

export type IAnyLayer = Instance<typeof AnyLayer>;

export const MobxClubModel = types
  .model({
    title: types.string,
    titleLogo: types.maybe(Logo),
    map: types.maybe(Map),
    defaultLanguage: types.enumeration('Lang', ['sv', 'en']),
    logo: Logo,
    attachmentUrl: types.optional(types.string, '/showfile.php?iFileID='),
    loginUrl: types.optional(types.string, '/log_in.php'),
    logoutUrl: types.optional(types.string, '/log_out.php'),
    theme: Theme,
    modules: types.array(Module),
    links: types.array(Link),
    sports: types.array(types.string),
    eventor: types.maybe(Eventor),
    raceClubs: types.maybe(RaceClubs),
    corsProxy: types.maybe(types.string),
    eventorCorsProxy: types.maybe(types.string),
    oldUrl: types.maybe(types.string),
    sponsors: types.array(Sponsor),
    facebookUrl: types.maybe(types.string),
  })
  .actions((self) => ({
    setRaceClubs(raceClubs: IRaceClubsSnapshotIn) {
      const selectedClub = raceClubs.clubs?.find((club) => club.eventorOrganisationId === self.eventor?.organisationId);
      self.raceClubs = cast({ ...raceClubs, selectedClub: selectedClub?.clubId as any });
    },
  }))
  .views((self) => ({
    module(name: ModuleNameTypes) {
      const module = self.modules.find((module) => module.name === name);
      return module ? module : {};
    },
  }));
export type IMobxClubModel = Instance<typeof MobxClubModel>;
export type IMobxClubModelSnapshotIn = SnapshotIn<typeof MobxClubModel>;
