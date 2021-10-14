export default {
  title: 'Karlskrona Volleyboll',
  defaultLanguage: 'sv',
  logo: {
    url: 'https://www.kfumkarlskrona.se/images/club_frontpage_02.gif',
    width: 149,
    height: 141,
  },
  theme: {
    palette: {
      primary: {
        main: '#003399',
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
  modules: [{ name: 'News' }, { name: 'Calendar' }, { name: 'Address' }, { name: 'Photo' }],
  links: [{ name: 'SVBF', url: 'www.volleyboll.se' }],
  sports: ['Volleyboll', 'Beachvolley'],
};
