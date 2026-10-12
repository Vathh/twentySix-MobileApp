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
