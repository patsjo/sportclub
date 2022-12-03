/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const ckeditorPlugin = require('./craco-ckeditor-plugin');
const CracoLessPlugin = require('craco-less');
const CKEditorWebpackPlugin = require('@ckeditor/ckeditor5-dev-webpack-plugin');
const ENV = process.env.NODE_ENV;
const babelPlugins = [
  ['babel-plugin-import', { libraryName: 'antd', libraryDirectory: 'es', style: true }],
  ['babel-plugin-styled-components', { displayName: true }],
];
const babelTestPlugins = [];

module.exports = {
  webpack: {
    alias: {},
    plugins: {
      add: [
        new CKEditorWebpackPlugin({ language: 'sv', addMainLanguageTranslationsToAllAssets: true }),
      ],
    },
  },
  plugins: [
    {
      plugin: ckeditorPlugin,
      options: { preText: 'WEBPACK CKEDITOR5 CONFIG' },
    },
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {
              'link-color': '#1454a3',
              'text-color': '#231F20',
              'label-color': '#707070',
              'icon-color-hover': '#0F73DC',
              'border-color-base': '#948F8F',
              'primary-color': '#1075E0',
              'btn-font-weight': 'bold',
              'btn-default-color': '#1075E0',
              'btn-default-border': '#1075E0',
              'btn-default-ghost-color': '#1075E0',
              'btn-default-ghost-border': '#948F8F',
              'input-placeholder-color': '#C2C2C2C2',
              'disabled-color': 'rgba(0,0,0,0.55)',
              'error-color': '#C71D1D',
              'text-color-secondary': 'rgba(0,0,0,0.55)',
              'form-vertical-label-padding': '0 0 2px',
            },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
  babel: { plugins: ENV === 'test' ? babelTestPlugins : babelPlugins },
};
