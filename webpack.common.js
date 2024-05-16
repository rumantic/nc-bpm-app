/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');
const fileLoader = {
	loader: 'file-loader',
	options: {
		name: '[path][name]-[sha1:hash:hex:8].[ext]',
		outputPath: '../assets/',
	},
};
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
	entry: {
		filelist: [
			path.join(__dirname, 'src', 'filelist.ts'),
		],
		admin: [
			path.join(__dirname, 'src', 'admin.ts'),
		],
		main: [
			path.join(__dirname, 'src', 'modeler.ts'),
		],
	},
	output: {
		path: path.resolve(__dirname, './js'),
		publicPath: '/js/',
		filename: '[name].js',
		chunkFilename: 'chunks/[name]-[hash].js',
	},
	performance: {
		maxAssetSize: 2 * 1024 * 1024,
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							babelrc: false,
						},
					},
					'ts-loader',
				],
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'vue-style-loader', 'css-loader'],
			},
			{
				test: /\.scss$/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.(png|jpg|gif)(\?.+)?$/,
				type: 'asset/resource',
			},
			{
				test: /.*\.(ttf|woff|woff2|eot)(\?.+)?$/,
				type: 'asset/resource',
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader'
			  },
			{
				test: /\.svg$/,
				loader: 'svg-inline-loader'
			}
		],
	},
	plugins: [
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
		}),
		new ESLintPlugin(),
		new VueLoaderPlugin(),
	],
	resolve: {
		extensions: ['*', '.tsx', '.ts', '.js', '.scss'],
		fallback: {
			path: require.resolve('path-browserify'),
		},
		symlinks: false,
	},
};
