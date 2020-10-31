import { types } from "mobx-state-tree";
import { RaceClubs } from "./resultModel";

const Logo = types.model({
  url: types.string,
  width: types.integer,
  height: types.integer
});

const Color = types.model({
  main: types.string,
  contrastText: types.maybe(types.string)
});

const Palette = types.model({
  primary: Color,
  secondary: Color,
  error: Color,
  contrastThreshold: types.maybe(types.integer),
  tonalOffset: types.maybe(types.number),
  type: types.maybe(types.string)
});

const Typography = types.model({
  fontFamily: types.string,
  fontSize: types.integer,
  htmlFontSize: types.maybe(types.integer),
  useNextVariants: types.optional(types.boolean, true)
});

const Theme = types.model({
  palette: Palette,
  typography: Typography
});

const Link = types.model({
  name: types.string,
  url: types.string
});

const Module = types
  .model({
    name: types.string,
    addUrl: types.maybe(types.string),
    deleteUrl: types.maybe(types.string),
    updateUrl: types.maybe(types.string),
    queryUrl: types.maybe(types.string)
  })
  .views(self => ({
    get hasSubMenus() {
      return self.name !== "Eventor" && self.name !== "ScoringBoard" && self.name !== "HTMLEditor";
    }
  }));

const Sponsor = types.model({
  name: types.string,
  logo: Logo,
  url: types.maybe(types.string),
  active: types.boolean
});

const Eventor = types.model({
  url: types.optional(types.string, "https://eventor.orientering.se/Events"),
  eventsUrl: types.optional(types.string, "https://eventor.orientering.se/api/events"),
  organisationUrl: types.optional(types.string, "https://eventor.orientering.se/api/organisation/"),
  entryFeeUrl: types.optional(types.string, "https://eventor.orientering.se/api/entryfees/events/"),
  entriesUrl: types.optional(types.string, "https://eventor.orientering.se/api/entries"),
  startUrl: types.optional(types.string, "https://eventor.orientering.se/api/starts/organisation"),
  classesUrl: types.optional(types.string, "https://eventor.orientering.se/api/eventclasses"),
  resultUrl: types.optional(types.string, "https://eventor.orientering.se/api/results/organisation"),
  lengthUrl: types.optional(types.string, "https://eventor.orientering.se/Events/StartList"),
  competitorsUrl: types.optional(types.string, "https://eventor.orientering.se/api/competitors"),
  personResultUrl: types.optional(types.string, "https://eventor.orientering.se/api/results/person"),
  externalLoginUrl: types.optional(types.string, "https://eventor.orientering.se/api/externalLoginUrl"),
  headers: types.maybe(types.string),
  apiKey: types.maybe(types.string),
  organisationId: types.integer,
  oRingenOrganisationId: types.optional(types.integer, 611)
});

export const MobxClubModel = types
  .model({
    title: types.string,
    titleLogo: types.maybe(Logo),
    mapCenter: types.array(types.number),
    defaultLanguage: types.enumeration("Lang", ["sv", "en"]),
    logo: Logo,
    attachmentUrl: types.optional(types.string, "/showfile.php?iFileID="),
    loginUrl: types.optional(types.string, "/log_in.php"),
    logoutUrl: types.optional(types.string, "/log_out.php"),
    theme: Theme,
    modules: types.array(Module),
    links: types.array(Link),
    sports: types.array(types.string),
    eventor: types.maybe(Eventor),
    raceClubs: types.maybe(RaceClubs),
    corsProxy: types.maybe(types.string),
    oldUrl: types.maybe(types.string),
    sponsors: types.array(Sponsor),
    facebookUrl: types.maybe(types.string)
  })
  .actions(self => ({
    setRaceClubs(raceClubs) {
      const selectedClubId = raceClubs.clubs.find(club => (club.eventorOrganisationId = self.eventor.organisationId))
        .clubId;
      self.raceClubs = { ...raceClubs, selectedClub: selectedClubId };
    }
  }))
  .views(self => ({
    module(name) {
      const module = self.modules.find(module => module.name === name);
      return module ? module : {};
    }
  }));
