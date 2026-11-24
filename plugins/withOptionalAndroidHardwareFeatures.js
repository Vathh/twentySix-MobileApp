const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Play filtruje urządzenia po implied/required <uses-feature>.
 * Portrait (orientation: portrait) i Wi‑Fi (ACCESS_WIFI_STATE) nie są krytyczne
 * dla instalacji — oznaczamy je jako opcjonalne, żeby closed/production
 * nie blokowały się na Desktop / Android XR.
 */
const OPTIONAL_FEATURES = [
	'android.hardware.screen.portrait',
	'android.hardware.wifi',
];

function upsertOptionalFeature(features, name) {
	const existing = features.find((feature) => feature.$?.['android:name'] === name);
	if (existing) {
		existing.$['android:required'] = 'false';
		return;
	}
	features.push({
		$: {
			'android:name': name,
			'android:required': 'false',
		},
	});
}

function withOptionalAndroidHardwareFeatures(config) {
	return withAndroidManifest(config, (configWithManifest) => {
		const manifest = configWithManifest.modResults.manifest;
		const current = manifest['uses-feature'];
		const features = !current ? [] : Array.isArray(current) ? [...current] : [current];

		for (const name of OPTIONAL_FEATURES) {
			upsertOptionalFeature(features, name);
		}

		manifest['uses-feature'] = features;
		return configWithManifest;
	});
}

module.exports = withOptionalAndroidHardwareFeatures;
