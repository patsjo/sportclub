import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localeData from 'dayjs/plugin/localeData';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import 'ol/ol.css';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './fonts/Arvo-Bold.ttf';
import './fonts/Arvo-BoldItalic.ttf';
import './fonts/Arvo-Italic.ttf';
import './fonts/Arvo-Regular.ttf';
import './i18n';
import './index.css';

dayjs.extend(isoWeek);
dayjs.extend(localeData);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);
dayjs.extend(updateLocale);

dayjs.locale('en');
dayjs.updateLocale('en', {
  weekStart: 1,
});

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(<App />);
