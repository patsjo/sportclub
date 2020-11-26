import React from "react";
import ReactDOM from "react-dom";
import 'antd/dist/antd.css';
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import "./i18n";
import './fonts/Arvo-Regular.ttf';
import './fonts/Arvo-Italic.ttf';
import './fonts/Arvo-Bold.ttf';
import './fonts/Arvo-BoldItalic.ttf';
import moment from 'moment';

moment.updateLocale("en", { week: {
    dow: 1, // First day of week is Monday
    doy: 4  // First week of year must contain 4 January (7 + 1 - 4)
  }});

ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
