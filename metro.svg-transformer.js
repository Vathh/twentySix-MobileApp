const expoTransformer = require('@expo/metro-config/babel-transformer');

/**
 * SVG jako string w JS, nie jako native asset.
 * W release na Androidzie pliki .svg lądują w android_res i nie da się ich
 * odczytać przez File / fetch — stąd puste intro i brak logo w headerze.
 */
module.exports.transform = function transform(args) {
	if (typeof args.filename === 'string' && args.filename.endsWith('.svg')) {
		return expoTransformer.transform({
			...args,
			src: `module.exports = ${JSON.stringify(args.src)};`,
			filename: `${args.filename}.js`,
		});
	}
	return expoTransformer.transform(args);
};
