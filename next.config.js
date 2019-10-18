/* eslint-disable */
const withLess = require('@zeit/next-less');
const lessToJS = require('less-vars-to-js');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');
const path = require('path');

// Where your antd-custom.less file lives
const themeVariables = lessToJS(
  fs.readFileSync(
    path.resolve(__dirname, './assets/antd-custom.less'),
    'utf8',
  )
);

const isDev = process.env.NODE_ENV !== 'production';

// fix antd bug in dev development
const devAntd = '@import "~antd/dist/antd.less";\n';
const stylesData = fs.readFileSync(
  path.resolve(__dirname, './assets/_styles.less'),
  'utf-8'
);
fs.writeFileSync(
  path.resolve(__dirname, './assets/self-styles.less'),
  isDev ? `${devAntd}${stylesData}` : stylesData,
  'utf-8'
);

// fix: prevents error when .css files are required by node
if (typeof require !== 'undefined') {
  require.extensions['.less'] = () => {}
}

const srcFolder = [
  path.resolve('components'),
  path.resolve('constants'),
  path.resolve('containers'),
  path.resolve('core'),
  path.resolve('middlewares'),
  path.resolve('pages'),
  path.resolve('redux')
]

module.exports = withLess({
  lessLoaderOptions: {
    javascriptEnabled: true,
    modifyVars: themeVariables,
    localIdentName: '[local]___[hash:base64:5]',
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
    if (!dev) {
      config.plugins.push(
        ...[
          new BundleAnalyzerPlugin({
            analyzerMode: 'disabled',
            // For all options see https://github.com/th0r/webpack-bundle-analyzer#as-plugin
            generateStatsFile: true,
            // Will be available at `.next/stats.json`
            statsFilename: 'stats.json'
          }),
          // 代替uglyJsPlugin
          new TerserPlugin({
            cache: true,
            terserOptions: {
              ecma: 6,
              warnings: false,
              extractComments: false, // remove comment
              compress: {
                drop_console: true // remove console
              },
              ie8: false
            }
          }),
      ]);
      config.module.rules.push({
        test: /\.js$/,
        include: srcFolder,
        options: {
          workerParallelJobs: 50,
          // additional node.js arguments
          workerNodeArgs: ['--max-old-space-size=1024'],
        },
        loader: 'thread-loader'
      });
      config.devtool = 'source-map';
    } else {
      config.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        include: srcFolder,
        options: {
          configFile: path.resolve('.eslintrc'),
          eslint: {
            configFile: path.resolve(__dirname, '.eslintrc')
          }
        },
        loader: 'eslint-loader'
      });
      config.devtool = 'cheap-module-inline-source-map';
    }
    return config;
  },
  webpackDevMiddleware: config => {
    // Perform customizations to webpack dev middleware config
    // console.log(config, '@@')
    // Important: return the modified config
    return config;
  },
  serverRuntimeConfig: { // Will only be available on the server side
    rootDir: path.join(__dirname, './'),
    PORT: isDev ? 3006 : (process.env.PORT || 5999)
  },
  publicRuntimeConfig: { // Will be available on both server and client
    staticFolder: '/static',
    isDev, // Pass through env variables
  },
  env: {
    SERVER_HOST: 'http://www.luffyzhou.cn'
  }
});