const IMAGES = {
	'100': {
		iron: require('../assets/badges/finish/100/iron.png'),
		bronze: require('../assets/badges/finish/100/bronze.png'),
		gold: require('../assets/badges/finish/100/gold.png'),
		platinum: require('../assets/badges/finish/100/platinum.png'),
		diamond: require('../assets/badges/finish/100/diamond.png'),
	},
};

export function finishImage(key, levelName) {
	const track = IMAGES[String(key)];
	if (!track) return null;
	const tier = levelName && track[levelName] ? levelName : 'iron';
	return track[tier];
}
