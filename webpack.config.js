const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

module.exports = (_, args) => {
    const production = args.mode === 'production' && !args.demo;

    const config = {
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: !production,
                        },
                    },
                },
            ],
        },

        resolve: {
            extensions: ['.ts', '.js'],
        },

        devtool: 'source-map',

        devServer: {
            host: '0.0.0.0',
            port: 3000,
            stats: {
                modules: false,
            },
            disableHostCheck: true,
        },
    };

    if (production) {
        Object.assign(config, {
            entry: './src/index.ts',
            output: {
                filename: 'general.js',
                path: path.resolve(__dirname, 'dist'),
                publicPath: '/dist/',
                libraryTarget: 'umd',
                library: 'General',
            },
        });
    } else {
        Object.assign(config, {
            entry: './demo/index.ts',
            output: {
                filename: 'demo.js',
                path: path.resolve(__dirname, 'dist'),
                publicPath: '/dist/',
            },
            plugins: [
                new ForkTsCheckerWebpackPlugin({
                    watch: ['./src', './demo'],
                }),
            ],
        });
    }

    return config;
};
