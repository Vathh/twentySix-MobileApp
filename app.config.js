const appJson = require('./app.json');

/**
 * Czysty HTTP zostaje dla lokalnego API. Build produkcyjny (EAS, profil production)
 * dostaje EXPO_PUBLIC_ALLOW_CLEARTEXT=0 i łączy się tylko po HTTPS.
 */
function allowsCleartext() {
	if (process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === '0') {
		return false;
	}
	if (process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === '1') {
		return true;
	}
	if (process.env.EAS_BUILD_PROFILE === 'production') {
		return false;
	}
	const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
	if (apiUrl.startsWith('https://')) {
		return false;
	}
	return true;
}

module.exports = () => {
	const expo = JSON.parse(JSON.stringify(appJson.expo));
	expo.plugins = (expo.plugins || []).map((plugin) => {
		if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') {
			return plugin;
		}
		const options = plugin[1] || {};
		return [
			'expo-build-properties',
			{
				...options,
				android: {
					...(options.android || {}),
					usesCleartextTraffic: allowsCleartext(),
				},
			},
		];
	});

	return { expo };
};
