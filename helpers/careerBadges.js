const IMAGES = {
	podium: {
		iron: require('../assets/badges/career/podium/iron.png'),
		bronze: require('../assets/badges/career/podium/bronze.png'),
		gold: require('../assets/badges/career/podium/gold.png'),
		platinum: require('../assets/badges/career/podium/platinum.png'),
		diamond: require('../assets/badges/career/podium/diamond.png'),
	},
	win_streak: {
		iron: require('../assets/badges/career/win_streak/iron.png'),
		bronze: require('../assets/badges/career/win_streak/bronze.png'),
		gold: require('../assets/badges/career/win_streak/gold.png'),
		platinum: require('../assets/badges/career/win_streak/platinum.png'),
		diamond: require('../assets/badges/career/win_streak/diamond.png'),
	},
	appearances: {
		iron: require('../assets/badges/career/appearances/iron.png'),
		bronze: require('../assets/badges/career/appearances/bronze.png'),
		gold: require('../assets/badges/career/appearances/gold.png'),
		platinum: require('../assets/badges/career/appearances/platinum.png'),
		diamond: require('../assets/badges/career/appearances/diamond.png'),
	},
	titles: {
		iron: require('../assets/badges/career/titles/iron.png'),
		bronze: require('../assets/badges/career/titles/bronze.png'),
		gold: require('../assets/badges/career/titles/gold.png'),
		platinum: require('../assets/badges/career/titles/platinum.png'),
		diamond: require('../assets/badges/career/titles/diamond.png'),
	},
};

export function careerImage(key, levelName) {
	const track = IMAGES[String(key)];
	if (!track) return null;
	const tier = levelName && track[levelName] ? levelName : 'iron';
	return track[tier];
}
