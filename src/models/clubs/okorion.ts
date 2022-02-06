import { IMobxClubModelSnapshotIn } from 'models/mobxClubModel';

const okorion: IMobxClubModelSnapshotIn = {
  title: 'OK Orion',
  defaultLanguage: 'sv',
  map: {
    center: [15.82939, 56.20045],
    defaultZoomLevel: 16,
    layers: [
      {
        type: 'group',
        id: 'OrienteeringTileLayers',
        title: 'OK Orions kartor 2021',
        layers: [
          {
            type: 'base-tile',
            id: 'OrienteeringTileLayerOverview',
            title: 'Översikt',
            urlTemplate: 'https://okorion.com/maptiles/orienteering/wgs84/{z}/{x}/{y}.png',
            minZoomLevel: 7,
            maxZoomLevel: 14.9999999999999,
            fullExtent: {
              xmin: 15.39838,
              ymin: 56.06166,
              xmax: 16.08225,
              ymax: 56.39629,
            },
          },
          {
            type: 'base-tile',
            id: 'OrienteeringTileLayer',
            title: 'Orienteringskarta',
            urlTemplate: 'https://okorion.com/maptiles/orienteering/wgs84/{z}/{x}/{y}.png',
            minZoomLevel: 15,
            maxZoomLevel: 17,
            fullExtent: {
              xmin: 15.39838,
              ymin: 56.06166,
              xmax: 16.08225,
              ymax: 56.39629,
            },
            zoomExtent: {
              xmin: 15.847,
              ymin: 56.158,
              xmax: 15.853,
              ymax: 56.162,
            },
          },
        ],
      },
    ],
  },
  loginUrl: 'https://okorion.com/log_in.php',
  logoutUrl: 'https://okorion.com/log_out.php',
  attachmentUrl: 'https://okorion.com/showfile.php?iFileID=',
  titleLogo: {
    url: 'https://okorion.com/images/okorion_text.png',
    width: 375,
    height: 45,
  },
  logo: {
    url: 'https://okorion.com/images/okorion_logo.png',
    width: 379,
    height: 423,
  },
  theme: {
    palette: {
      primary: {
        main: '#5882E4',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#ffffff',
        contrastText: '#000000',
      },
      error: {
        main: '#aa3333',
        contrastText: '#000000',
      },
      contrastThreshold: 3,
      tonalOffset: 0.2,
    },
    typography: {
      fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
      fontSize: 12,
    },
  },
  modules: [
    {
      name: 'News',
      addUrl: 'https://okorion.com/news/save.php',
      deleteUrl: 'https://okorion.com/news/delete.php',
      updateUrl: 'https://okorion.com/news/save.php',
      queryUrl: 'https://okorion.com/news/jsonNewsQuery.php',
    },
    {
      name: 'Calendar',
      queryUrl: 'https://okorion.com/calendar/jsonCalendarQuery.php',
      addUrl: 'https://okorion.com/calendar/saveCalendar.php',
      deleteUrl: 'https://okorion.com/calendar/delete.php',
      updateUrl: 'https://okorion.com/calendar/saveCalendar.php',
    },
    { name: 'Stars' },
    { name: 'ScoringBoard' },
    { name: 'Eventor' },
    {
      name: 'Results',
      addUrl: 'https://okorion.com/result/save.php',
      deleteUrl: 'https://okorion.com/result/delete.php',
      updateUrl: 'https://okorion.com/result/save.php',
      queryUrl: 'https://okorion.com/result/jsonResultQuery.php',
      league: {
        rankingLeagueAgeLimit: 15,
        rankingRelayLeagueAgeLimit: 15,
        points1000LeagueAgeLimit: 0,
        pointsLeagueAgeLimit: 15,
      },
    },
    { name: 'Address' },
    { name: 'Photo' },
    {
      name: 'HTMLEditor',
      addUrl: 'https://okorion.com/htmlEditor/save.php',
      deleteUrl: 'https://okorion.com/htmlEditor/delete.php',
      updateUrl: 'https://okorion.com/htmlEditor/save.php',
      queryUrl: 'https://okorion.com/htmlEditor/jsonHtmlEditorQuery.php',
    },
  ],
  links: [{ name: 'SOFT', url: 'https://www.svenskorientering.se' }],
  sports: ['Orientering'],
  eventor: {
    organisationId: 288,
    districtOrganisationId: 7,
  },
  corsProxy: 'https://okorion.com/proxy.php?csurl=',
  eventorCorsProxy: 'https://okorion.com/eventorProxyWithCache.php',
  sponsors: [
    {
      name: 'Affärsverken',
      logo: {
        url: 'https://okorion.com/images/sponsors/affarsverken.jpg',
        width: 2358,
        height: 766,
      },
      url: 'https://www.affarsverken.se/',
      active: false,
    },
    {
      name: 'Bergkvarabuss',
      logo: {
        url: 'https://okorion.com/images/sponsors/bergkvarabuss.svg',
        width: 280,
        height: 48,
      },
      url: 'https://bergkvarabuss.se/',
      active: true,
    },
    {
      name: 'BLT',
      logo: {
        url: 'https://okorion.com/images/sponsors/blt.svg',
        width: 300,
        height: 61,
      },
      url: 'https://blt.se/',
      active: false,
    },
    {
      name: 'EY',
      logo: {
        url: 'https://okorion.com/images/sponsors/ey.svg',
        width: 97,
        height: 103,
      },
      url: 'https://www.ey.com/sv_se',
      active: true,
    },
    {
      name: 'eye do',
      logo: {
        url: 'https://okorion.com/images/sponsors/eyedo.png',
        width: 375,
        height: 239,
      },
      url: 'http://www.eye-do.se/',
      active: true,
    },
    {
      name: 'ICA Supermarket Jämjö',
      logo: {
        url: 'https://okorion.com/images/sponsors/ica-jamjo.png',
        width: 500,
        height: 313,
      },
      url: 'https://www.ica.se/butiker/supermarket/karlskrona/ica-supermarket-jamjo-2450/start/',
      active: true,
    },
    {
      name: 'Jämjö El',
      logo: {
        url: 'https://okorion.com/images/sponsors/jamjoel.jpg',
        width: 2196,
        height: 424,
      },
      url: 'https://www.jamjoel.se/',
      active: false,
    },
    {
      name: 'Karlskronahem',
      logo: {
        url: 'https://okorion.com/images/sponsors/karlskronahem.svg',
        width: 220,
        height: 63,
      },
      url: 'https://www.karlskronahem.se/',
      active: false,
    },
    {
      name: 'Karlskrona kommun',
      logo: {
        url: 'https://okorion.com/images/sponsors/bla-karlskrona-kommun.png',
        width: 2537,
        height: 643,
      },
      url: 'https://www.karlskrona.se/',
      active: true,
    },
    {
      name: 'Länsförsäkringar Blekinge',
      logo: {
        url: 'https://okorion.com/images/sponsors/lansforsakringar.png',
        width: 501,
        height: 100,
      },
      url: 'https://www.lansforsakringar.se/blekinge/',
      active: true,
    },
    {
      name: 'Roxtec',
      logo: {
        url: 'https://okorion.com/images/sponsors/roxtec.svg',
        width: 165,
        height: 41,
      },
      url: 'https://www.roxtec.com/sv/',
      active: false,
    },
    {
      name: 'S-GROUP Solutions',
      logo: {
        url: 'https://okorion.com/images/sponsors/sgroupsolutions.png',
        width: 387,
        height: 80,
      },
      url: 'https://www.sgroup-solutions.se/',
      active: true,
    },
    {
      name: 'Stensborgs VVS',
      logo: {
        url: 'https://okorion.com/images/sponsors/stensborg.png',
        width: 707,
        height: 158,
      },
      active: true,
    },
    {
      name: 'Swedbank',
      logo: {
        url: 'https://okorion.com/images/sponsors/swedbank.png',
        width: 300,
        height: 64,
      },
      url: 'https://www.swedbank.se/',
      active: false,
    },
    {
      name: 'Sydöstran',
      logo: {
        url: 'https://okorion.com/images/sponsors/sydostran.svg',
        width: 300,
        height: 61,
      },
      url: 'https://sydostran.se/',
      active: false,
    },
    {
      name: 'Trimtex',
      logo: {
        url: 'https://okorion.com/images/sponsors/trimtex.png',
        width: 740,
        height: 137,
      },
      url: 'https://trimtex.se/',
      active: true,
    },
    {
      name: 'WSP',
      logo: {
        url: 'https://okorion.com/images/sponsors/wsp.png',
        width: 1781,
        height: 848,
      },
      url: 'https://www.wsp.com/sv-SE',
      active: true,
    },
    {
      name: 'XL Bygg Jämjö',
      logo: {
        url: 'https://okorion.com/images/sponsors/xlbygg_jamjo.png',
        width: 315,
        height: 95,
      },
      url: 'https://www.xlbygg.se/jamjo/',
      active: false,
    },
  ],
  facebookUrl: 'https://www.facebook.com/okorion',
};

export default okorion;
