import { IMobxClubModelSnapshotIn } from 'models/mobxClubModel';

const varendgn: IMobxClubModelSnapshotIn = {
  title: 'Värend GN',
  defaultLanguage: 'sv',
  map: {
    center: [14.893426, 56.960593],
    maxScale: 3500,
    layers: [
      {
        type: 'base-tile',
        id: 'OrienteeringTileLayer',
        title: 'Openstreetmap orienteering',
        urlTemplates: [
          'https://tiler4.oobrien.com/oterrain_global/{z}/{x}/{y}.png',
          'https://tiler5.oobrien.com/oterrain_global/{z}/{x}/{y}.png',
          'https://tiler6.oobrien.com/oterrain_global/{z}/{x}/{y}.png',
        ],
        minScale: 150000,
        fullExtent: {
          xmin: 15.829884 - 0.06,
          ymin: 56.200408 - 0.025,
          xmax: 15.829884 + 0.06,
          ymax: 56.200408 + 0.025,
        },
      },
    ],
    fullExtent: {
      xmin: 14.893426 - 0.015,
      ymin: 56.960593 - 0.006,
      xmax: 14.893426 + 0.015,
      ymax: 56.960593 + 0.006,
    },
  },
  loginUrl: 'https://varendgn.se/log_in.php',
  logoutUrl: 'https://varendgn.se/log_out.php',
  attachmentUrl: 'https://varendgn.se/showfile.php?iFileID=',
  titleLogo: {
    url: 'https://varendgn.se/images/club_frontpage_03.png',
    width: 420,
    height: 80,
  },
  logo: {
    url: 'https://varendgn.se/images/icons/vgn.png',
    width: 300,
    height: 300,
  },
  theme: {
    palette: {
      primary: {
        main: '#e00000',
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
      addUrl: 'https://varendgn.se/nyheter/save.php',
      deleteUrl: 'https://varendgn.se/nyheter/delete.php',
      updateUrl: 'https://varendgn.se/nyheter/save.php',
      queryUrl: 'https://varendgn.se/nyheter/jsonNewsQuery.php',
    },
    {
      name: 'Calendar',
      queryUrl: 'https://varendgn.se/kalender/jsonCalendarQuery.php',
      addUrl: 'https://varendgn.se/kalender/saveCalendar.php',
      deleteUrl: 'https://varendgn.se/kalender/delete.php',
      updateUrl: 'https://varendgn.se/kalender/saveCalendar.php',
    },
    { name: 'ScoringBoard' },
    { name: 'Eventor' },
    {
      name: 'Results',
      addUrl: 'https://varendgn.se/result/save.php',
      deleteUrl: 'https://varendgn.se/result/delete.php',
      updateUrl: 'https://varendgn.se/result/save.php',
      queryUrl: 'https://varendgn.se/result/jsonResultQuery.php',
    },
    { name: 'Address' },
    { name: 'Photo' },
    {
      name: 'HTMLEditor',
      addUrl: 'https://varendgn.se/htmlEditor/save.php',
      deleteUrl: 'https://varendgn.se/htmlEditor/delete.php',
      updateUrl: 'https://varendgn.se/htmlEditor/save.php',
      queryUrl: 'https://varendgn.se/htmlEditor/jsonHtmlEditorQuery.php',
    },
  ],
  links: [{ name: 'SOFT', url: 'http://www.svenskorientering.se' }],
  sports: ['Orientering'],
  eventor: {
    organisationId: 584,
    districtOrganisationId: 2,
  },
  corsProxy: 'https://varendgn.se/proxy.php?csurl=',
  eventorCorsProxy: 'https://varendgn.se/eventorProxyWithCache.php',
  oldUrl: 'https://varendgn.se/old/',
  sponsors: [],
};

export default varendgn;
