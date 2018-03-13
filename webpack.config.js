const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = (env = {}) => {
    const tsCheckerPlugin = new ForkTsCheckerWebpackPlugin({
        watch: ['./src'],
    });

    const config = {
        module: {
            rules: [{
                test: /\.ts$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: !env.production,
                    },
                },
            }],
        },
        resolve: {
            modules: [
                path.resolve(__dirname, 'node_modules'),
                path.resolve(__dirname),
            ],
            extensions: ['.ts', '.js'],
        }
    };

    if (env.production) {
        Object.assign(config, {
            devtool: 'source-map',
            entry: './src/index.ts',
            output: {
                filename: 'general.js',
                path: path.resolve(__dirname, 'dist'),
                publicPath: '/dist/',
                libraryTarget: 'umd',
                library: 'General',
            },
            plugins: [new webpack.optimize.UglifyJsPlugin({sourceMap: true})],
        });
    } else if (env.demo) {
        Object.assign(config, {
            devtool: 'source-map',
            entry: './demo/index.ts',
            output: {
                filename: 'demo.js',
                path: path.resolve(__dirname, 'dist'),
                publicPath: '/dist/',
            },
            plugins: [
                tsCheckerPlugin,
                new webpack.optimize.UglifyJsPlugin({sourceMap: true}),
            ],
        });
    } else {
        Object.assign(config, {
            devtool: 'eval-source-map',
            entry: './demo/index.ts',
            output: {
                filename: 'demo.js',
                path: path.resolve(__dirname, 'dist'),
                publicPath: '/dist/',
            },
            plugins: [tsCheckerPlugin],
            devServer: {
                host: '0.0.0.0',
                port: 3000,
            },
        });
    }

    return config;
};
