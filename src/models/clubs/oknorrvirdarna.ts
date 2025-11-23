import { IMobxClubModelProps } from '../../models/mobxClubModel';

const varendgn: IMobxClubModelProps = {
  title: 'OK Norrvirdarna',
  clubInfo: {
    name: 'OK Norrvirdarna',
    organisationNumber: '829501-4339',
    address1: 'c/o Lars-Åke Sjökvist',
    address2: 'Sjövallavägen 55',
    zip: '352 59',
    city: 'Växjö',
  },
  defaultLanguage: 'sv',
  map: {
    center: [14.5900805, 57.1636313],
    defaultZoomLevel: 12,
    layers: [],
  },
  loginUrl: 'https://oknorrvirdarna.se/log_in.php',
  logoutUrl: 'https://oknorrvirdarna.se/log_out.php',
  attachmentUrl: 'https://oknorrvirdarna.se/showfile.php?iFileID=',
  invoice: {
    breakMonthDay: '1231',
    daysToDueDate: 31,
    account: '10 68 79-0',
    accountType: 'Postgiro',
    message: 'Tävlingsavgift, {name}',
  },
  titleLogo: {
    url: 'https://oknorrvirdarna.se/images/norrvirdarna_text.png',
    width: 1088,
    height: 100,
  },
  logo: {
    url: 'https://oknorrvirdarna.se/images/oknorrvirdarna.png',
    width: 359,
    height: 360,
  },
  theme: {
    palette: {
      primary: {
        main: '#017540',
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
      addUrl: 'https://oknorrvirdarna.se/news/save.php',
      deleteUrl: 'https://oknorrvirdarna.se/news/delete.php',
      updateUrl: 'https://oknorrvirdarna.se/news/save.php',
      queryUrl: 'https://oknorrvirdarna.se/news/jsonNewsQuery.php',
    },
    {
      name: 'Calendar',
      queryUrl: 'https://oknorrvirdarna.se/calendar/jsonCalendarQuery.php',
      addUrl: 'https://oknorrvirdarna.se/calendar/saveCalendar.php',
      deleteUrl: 'https://oknorrvirdarna.se/calendar/delete.php',
      updateUrl: 'https://oknorrvirdarna.se/calendar/saveCalendar.php',
    },
    { name: 'Stars' },
    { name: 'ScoringBoard' },
    { name: 'Eventor' },
    {
      name: 'Results',
      addUrl: 'https://oknorrvirdarna.se/result/save.php',
      deleteUrl: 'https://oknorrvirdarna.se/result/delete.php',
      updateUrl: 'https://oknorrvirdarna.se/result/save.php',
      queryUrl: 'https://oknorrvirdarna.se/result/jsonResultQuery.php',
      league: {
        rankingLeagueAgeLimit: 15,
        rankingRelayLeagueAgeLimit: 15,
        points1000LeagueAgeLimit: 0,
        pointsLeagueAgeLimit: 0,
      },
    },
    {
      name: 'Users',
      addUrl: 'https://oknorrvirdarna.se/users/save.php',
      deleteUrl: 'https://oknorrvirdarna.se/users/delete.php',
      updateUrl: 'https://oknorrvirdarna.se/users/save.php',
      queryUrl: 'https://oknorrvirdarna.se/users/jsonUserQuery.php',
    },
    { name: 'Photo' },
    {
      name: 'HTMLEditor',
      addUrl: 'https://oknorrvirdarna.se/htmlEditor/save.php',
      deleteUrl: 'https://oknorrvirdarna.se/htmlEditor/delete.php',
      updateUrl: 'https://oknorrvirdarna.se/htmlEditor/save.php',
      queryUrl: 'https://oknorrvirdarna.se/htmlEditor/jsonHtmlEditorQuery.php',
    },
    {
      name: 'Files',
      addUrl: 'https://oknorrvirdarna.se/files/save.php',
      deleteUrl: 'https://oknorrvirdarna.se/files/delete.php',
      updateUrl: 'https://oknorrvirdarna.se/files/save.php',
      queryUrl: 'https://oknorrvirdarna.se/files/jsonFilesQuery.php',
    },
  ],
  links: [{ name: 'SOFT', url: 'https://www.svenskorientering.se' }],
  sports: ['Orientering'],
  eventor: {
    organisationId: 281,
    districtOrganisationId: 2,
  },
  corsProxy: 'https://oknorrvirdarna.se/proxy.php?csurl=',
  eventorCorsProxy: 'https://oknorrvirdarna.se/eventorProxyWithCache.php',
  oldUrl: 'https://idrottonline.se/OKNorrvirdarna-Orientering',
  sponsors: [],
  facebookUrl: 'https://www.facebook.com/oknorrvirdarna',
};

export default varendgn;
