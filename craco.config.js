const CracoLessPlugin = require('craco-less');
const { styles } = require('@ckeditor/ckeditor5-dev-utils');
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const enableCKEWebpackConfigPlugin = (webpackConfig, { env, paths }) => {
  // Extract the oneOf array from the relevant webpack.module.rules object
  let oneOf;
  let ix;
  ix = webpackConfig.module.rules.findIndex((item) => {
    return item.hasOwnProperty('oneOf');
  });
  oneOf = webpackConfig.module.rules[ix].oneOf;
  // Add the SVG and CSS loaders to the oneOf array
  const additions = [
    {
        test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
        use: ['raw-loader'],
    },
    {
        test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
        use: [
            {
                loader: 'style-loader',
                options: {
                    injectType: 'singletonStyleTag',
                    attributes: {
                        'data-cke': true,
                    },
                },
            },
            {
                loader: 'postcss-loader',
                options: {
                    postcssOptions: styles.getPostCssConfig( {
                        themeImporter: {
                            themePath: require.resolve('@ckeditor/ckeditor5-theme-lark'),
                        },
                        minify: true,
                    }),
                },
            },
        ],
    }
  ];
  additions.forEach((item, index) => {
    oneOf.push(item);
  });
  // Modify cssRegex
  let loader;
  loader = oneOf.find((item) => {
    if (item.test !== undefined) return item.test.toString() === cssRegex.toString();
  });
  loader && (loader.exclude = [cssModuleRegex, /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/]);
  // Modify cssModuleRegex
  loader = oneOf.find((item) => {
    if (item.test !== undefined) return item.test.toString() === cssModuleRegex.toString();
  });
  loader && (loader.exclude = [/ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/]);
  // Modify file-loader
  loader = oneOf.find((item) => {
    if (item.loader !== undefined) return item.loader.toString() === require.resolve('file-loader').toString();
  });
  loader &&
    (loader.exclude = [
      /\.(js|mjs|jsx|ts|tsx)$/,
      /\.html$/,
      /\.json$/,
      /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
      /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
    ]);
  loader &&
    (loader.options = {
      name: 'static/media/[name].[hash:8].[ext]',
    });
  // Always return a config object.
  return webpackConfig;
};

module.exports = {
  webpack: {
    alias: {},
    plugins: [],
    configure: (webpackConfig, { env, paths }) => {
      return enableCKEWebpackConfigPlugin(webpackConfig, { env, paths });
    },
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {
              '@link-color': '#1454a3',
              '@text-color': '#231F20',
              '@label-color': '#707070',
              '@icon-color-hover': '#0F73DC',
              '@border-color-base': '#948F8F',
              '@primary-color': '#1075E0',
              '@btn-font-weight': 'bold',
              '@btn-default-color': '@primary-color',
              '@btn-default-border': '#1075E0',
              '@btn-default-ghost-color': '@primary-color',
              '@btn-default-ghost-border': '#948F8F',
              '@input-placeholder-color': '#C2C2C2C2',
              '@disabled-color': 'rgba(0,0,0,0.55)',
              '@error-color': '#C71D1D',
              '@text-color-secondary': 'rgba(0,0,0,0.55)',
              '@form-vertical-label-padding': '0 0 2px',
            },
            javascriptEnabled: true,
          },
        },
      },
    },
  ]
};
