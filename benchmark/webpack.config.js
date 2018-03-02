const webpack = require('webpack');
const path = require('path');

const env = process.env.NODE_ENV;
const config = {
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /(node_modules)/,
                use: 'ts-loader'
            }
        ]
    },
    resolve: {
        modules: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname)
        ],
        extensions: ['.ts', '.js']
    },
    devtool: 'source-map',
    entry: {
        generalize: './src/worker/generalize.ts',
        markerArray: './src/markerArray.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/dist/',
        libraryTarget: 'commonjs'
    },
    plugins:[
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: true
        })
    ]
};


module.exports = config;
