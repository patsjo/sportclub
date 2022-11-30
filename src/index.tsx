import 'antd/dist/antd.css';
import * as moment from 'moment';
import 'ol/ol.css';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './fonts/Arvo-Bold.ttf';
import './fonts/Arvo-BoldItalic.ttf';
import './fonts/Arvo-Italic.ttf';
import './fonts/Arvo-Regular.ttf';
import './i18n';
import './index.css';

moment.updateLocale('en', {
  week: {
    dow: 1, // First day of week is Monday
    doy: 4, // First week of year must contain 4 January (7 + 1 - 4)
  },
});

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(<App />);
