import { types } from "mobx-state-tree";

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

const Module = types.model({
  name: types.string,
  queryUrl: types.maybe(types.string)
});

const Eventor = types.model({
  eventsUrl: types.optional(
    types.string,
    "https://eventor.orientering.se/api/events"
  ),
  entriesUrl: types.optional(
    types.string,
    "https://eventor.orientering.se/api/entries"
  ),
  startUrl: types.optional(
    types.string,
    "https://eventor.orientering.se/api/starts/organisation"
  ),
  classesUrl: types.optional(
    types.string,
    "https://eventor.orientering.se/api/eventclasses"
  ),
  resultUrl: types.optional(
    types.string,
    "https://eventor.orientering.se/api/results/organisation"
  ),
  lengthUrl: types.optional(
    types.string,
    "https://eventor.orientering.se/Events/StartList"
  ),
  headers: types.maybe(types.string),
  apiKey: types.maybe(types.string),
  organisationId: types.integer,
  oRingenOrganisationId: types.optional(types.integer, 611)
});

export const MobxClubModel = types.model({
  title: types.string,
  titleLogo: types.maybe(Logo),
  defaultLanguage: types.enumeration("Lang", ["sv", "en"]),
  logo: Logo,
  attachmentUrl: types.optional(types.string, "/showfile.php?iFileID="),
  theme: Theme,
  modules: types.array(Module),
  links: types.array(Link),
  sports: types.array(types.string),
  eventor: types.maybe(Eventor),
  corsProxy: types.maybe(types.string)
});
