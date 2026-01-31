import { IMobxClubModelProps } from '../../models/mobxClubModel';

const varendgn: IMobxClubModelProps = {
  title: 'Värend GN',
  clubInfo: {
    name: 'Värend GN',
    organisationNumber: '829502-8958',
    address1: 'c/o Lars-Åke Sjökvist',
    address2: 'Sjövallavägen 55',
    zip: '352 59',
    city: 'Växjö'
  },
  defaultLanguage: 'sv',
  map: {
    center: [14.85774, 56.91077],
    defaultZoomLevel: 12,
    saveUrl: 'https://varendgn.se/map/tracks/save.php',
    queryUrl: 'https://varendgn.se/map/tracks/jsonMapTracksQuery.php',
    layers: []
  },
  loginUrl: 'https://varendgn.se/log_in.php',
  logoutUrl: 'https://varendgn.se/log_out.php',
  attachmentUrl: 'https://varendgn.se/showfile.php?iFileID=',
  invoice: {
    breakMonthDay: '1130',
    daysToDueDate: 21,
    account: '421 20 09-7',
    accountType: 'Postgiro',
    message: 'Tävlingsavgift, {name}'
  },
  titleLogo: {
    url: 'https://varendgn.se/images/club_frontpage_03.png',
    width: 420,
    height: 80
  },
  logo: {
    url: 'https://varendgn.se/images/icons/vgn.png',
    width: 300,
    height: 300
  },
  theme: {
    palette: {
      primary: {
        main: '#e00000',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#ffffff',
        contrastText: '#000000'
      },
      error: {
        main: '#aa3333',
        contrastText: '#000000'
      },
      contrastThreshold: 3,
      tonalOffset: 0.2
    },
    typography: {
      fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
      fontSize: 12
    }
  },
  modules: [
    {
      name: 'News',
      addUrl: 'https://varendgn.se/nyheter/save.php',
      deleteUrl: 'https://varendgn.se/nyheter/delete.php',
      updateUrl: 'https://varendgn.se/nyheter/save.php',
      queryUrl: 'https://varendgn.se/nyheter/jsonNewsQuery.php'
    },
    {
      name: 'Calendar',
      queryUrl: 'https://varendgn.se/kalender/jsonCalendarQuery.php',
      addUrl: 'https://varendgn.se/kalender/saveCalendar.php',
      deleteUrl: 'https://varendgn.se/kalender/delete.php',
      updateUrl: 'https://varendgn.se/kalender/saveCalendar.php'
    },
    { name: 'ScoringBoard' },
    { name: 'Eventor' },
    {
      name: 'Results',
      addUrl: 'https://varendgn.se/result/save.php',
      deleteUrl: 'https://varendgn.se/result/delete.php',
      updateUrl: 'https://varendgn.se/result/save.php',
      queryUrl: 'https://varendgn.se/result/jsonResultQuery.php'
    },
    {
      name: 'Users',
      addUrl: 'https://varendgn.se/users/save.php',
      deleteUrl: 'https://varendgn.se/users/delete.php',
      updateUrl: 'https://varendgn.se/users/save.php',
      queryUrl: 'https://varendgn.se/users/jsonUserQuery.php'
    },
    { name: 'Photo' },
    {
      name: 'HTMLEditor',
      addUrl: 'https://varendgn.se/htmlEditor/save.php',
      deleteUrl: 'https://varendgn.se/htmlEditor/delete.php',
      updateUrl: 'https://varendgn.se/htmlEditor/save.php',
      queryUrl: 'https://varendgn.se/htmlEditor/jsonHtmlEditorQuery.php'
    },
    {
      name: 'Files',
      addUrl: 'https://varendgn.se/files/save.php',
      deleteUrl: 'https://varendgn.se/files/delete.php',
      updateUrl: 'https://varendgn.se/files/save.php',
      queryUrl: 'https://varendgn.se/files/jsonFilesQuery.php'
    }
  ],
  links: [{ name: 'SOFT', url: 'https://www.svenskorientering.se' }],
  sports: ['Orientering'],
  eventor: {
    organisationId: 584,
    districtOrganisationId: 2,
    defaultOrganisationIdsNearbyAndClub: ['584', '449', '450', '239', '281', '112'],
    defaultParentOrganisationIdsNational: [],
    defaultParentOrganisationIdsDistrict: ['2', '7', '12', '16']
  },
  corsProxy: 'https://varendgn.se/proxy.php?csurl=',
  eventorCorsProxy: 'https://varendgn.se/eventorProxyWithCache.php',
  oldUrl: 'https://varendgn.se/old/',
  sponsors: []
};

export default varendgn;
