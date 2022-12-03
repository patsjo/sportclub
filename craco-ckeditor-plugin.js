/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { assetModuleByName, addBeforeAssetModule, loaderByName, getAssetModule, getLoader } = require('@craco/craco');
const { styles } = require('@ckeditor/ckeditor5-dev-utils');

module.exports = {
  overrideWebpackConfig: ({ webpackConfig, cracoConfig, pluginOptions, context: { env, paths } }) => {
    if (pluginOptions.preText) {
      console.log(pluginOptions.preText);
    }

    // eslint-disable-next-line no-prototype-builtins
    const rule = ix = webpackConfig.module.rules.find((item) => item.hasOwnProperty('oneOf'));
    const assetModules = [
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
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: styles.getPostCssConfig({
                themeImporter: {
                  themePath: require.resolve('@ckeditor/ckeditor5-theme-lark'),
                },
                minify: true,
              }),
            },
          },
        ],
      },
    ];

    assetModules.forEach((assetModule) => {
      rule.oneOf = [assetModule, ...rule.oneOf];
      //addBeforeAssetModule(webpackConfig, assetModuleByName('file-loader'), assetModule);
    });

    return webpackConfig;
  },
};
