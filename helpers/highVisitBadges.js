const IMAGES = {
	'100': {
		iron: require('../assets/badges/visits/100/iron.png'),
		bronze: require('../assets/badges/visits/100/bronze.png'),
		gold: require('../assets/badges/visits/100/gold.png'),
		platinum: require('../assets/badges/visits/100/platinum.png'),
		diamond: require('../assets/badges/visits/100/diamond.png'),
	},
	'140': {
		iron: require('../assets/badges/visits/140/iron.png'),
		bronze: require('../assets/badges/visits/140/bronze.png'),
		gold: require('../assets/badges/visits/140/gold.png'),
		platinum: require('../assets/badges/visits/140/platinum.png'),
		diamond: require('../assets/badges/visits/140/diamond.png'),
	},
	'180': {
		iron: require('../assets/badges/visits/180/iron.png'),
		bronze: require('../assets/badges/visits/180/bronze.png'),
		gold: require('../assets/badges/visits/180/gold.png'),
		platinum: require('../assets/badges/visits/180/platinum.png'),
		diamond: require('../assets/badges/visits/180/diamond.png'),
	},
};

export function highVisitImage(key, levelName) {
	const track = IMAGES[String(key)];
	if (!track) return null;
	const tier = levelName && track[levelName] ? levelName : 'iron';
	return track[tier];
}

/** Pozycja rysunku w kwadratowej ramce. Bez danych — cały plik, jak object-contain. */
export function badgeArtworkStyle(artwork) {
	if (artwork?.width == null || artwork?.height == null) {
		return { width: '100%', height: '100%' };
	}

	return {
		position: 'absolute',
		width: `${Number(artwork.width)}%`,
		height: `${Number(artwork.height)}%`,
		left: `${Number(artwork.left) || 0}%`,
		top: `${Number(artwork.top) || 0}%`,
	};
}
