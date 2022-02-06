import 'antd/dist/antd.css';
import * as moment from 'moment';
import 'ol/ol.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import './fonts/Arvo-Bold.ttf';
import './fonts/Arvo-BoldItalic.ttf';
import './fonts/Arvo-Italic.ttf';
import './fonts/Arvo-Regular.ttf';
import './i18n';
import './index.css';
import * as serviceWorker from './serviceWorker';

moment.updateLocale('en', {
  week: {
    dow: 1, // First day of week is Monday
    doy: 4, // First week of year must contain 4 January (7 + 1 - 4)
  },
});

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
