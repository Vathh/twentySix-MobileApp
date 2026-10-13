const IMAGES = {
	'9': {
		iron: require('../assets/badges/qf/9/iron.png'),
		bronze: require('../assets/badges/qf/9/bronze.png'),
		gold: require('../assets/badges/qf/9/gold.png'),
		platinum: require('../assets/badges/qf/9/platinum.png'),
		diamond: require('../assets/badges/qf/9/diamond.png'),
	},
	'10': {
		iron: require('../assets/badges/qf/10/iron.png'),
		bronze: require('../assets/badges/qf/10/bronze.png'),
		gold: require('../assets/badges/qf/10/gold.png'),
		platinum: require('../assets/badges/qf/10/platinum.png'),
		diamond: require('../assets/badges/qf/10/diamond.png'),
	},
	'11': {
		iron: require('../assets/badges/qf/11/iron.png'),
		bronze: require('../assets/badges/qf/11/bronze.png'),
		gold: require('../assets/badges/qf/11/gold.png'),
		platinum: require('../assets/badges/qf/11/platinum.png'),
		diamond: require('../assets/badges/qf/11/diamond.png'),
	},
	'12': {
		iron: require('../assets/badges/qf/12/iron.png'),
		bronze: require('../assets/badges/qf/12/bronze.png'),
		gold: require('../assets/badges/qf/12/gold.png'),
		platinum: require('../assets/badges/qf/12/platinum.png'),
		diamond: require('../assets/badges/qf/12/diamond.png'),
	},
	'13': {
		iron: require('../assets/badges/qf/13/iron.png'),
		bronze: require('../assets/badges/qf/13/bronze.png'),
		gold: require('../assets/badges/qf/13/gold.png'),
		platinum: require('../assets/badges/qf/13/platinum.png'),
		diamond: require('../assets/badges/qf/13/diamond.png'),
	},
	'14': {
		iron: require('../assets/badges/qf/14/iron.png'),
		bronze: require('../assets/badges/qf/14/bronze.png'),
		gold: require('../assets/badges/qf/14/gold.png'),
		platinum: require('../assets/badges/qf/14/platinum.png'),
		diamond: require('../assets/badges/qf/14/diamond.png'),
	},
	'15': {
		iron: require('../assets/badges/qf/15/iron.png'),
		bronze: require('../assets/badges/qf/15/bronze.png'),
		gold: require('../assets/badges/qf/15/gold.png'),
		platinum: require('../assets/badges/qf/15/platinum.png'),
		diamond: require('../assets/badges/qf/15/diamond.png'),
	},
	'16': {
		iron: require('../assets/badges/qf/16/iron.png'),
		bronze: require('../assets/badges/qf/16/bronze.png'),
		gold: require('../assets/badges/qf/16/gold.png'),
		platinum: require('../assets/badges/qf/16/platinum.png'),
		diamond: require('../assets/badges/qf/16/diamond.png'),
	},
	'17': {
		iron: require('../assets/badges/qf/17/iron.png'),
		bronze: require('../assets/badges/qf/17/bronze.png'),
		gold: require('../assets/badges/qf/17/gold.png'),
		platinum: require('../assets/badges/qf/17/platinum.png'),
		diamond: require('../assets/badges/qf/17/diamond.png'),
	},
	'18': {
		iron: require('../assets/badges/qf/18/iron.png'),
		bronze: require('../assets/badges/qf/18/bronze.png'),
		gold: require('../assets/badges/qf/18/gold.png'),
		platinum: require('../assets/badges/qf/18/platinum.png'),
		diamond: require('../assets/badges/qf/18/diamond.png'),
	},
	'19': {
		iron: require('../assets/badges/qf/19/iron.png'),
		bronze: require('../assets/badges/qf/19/bronze.png'),
		gold: require('../assets/badges/qf/19/gold.png'),
		platinum: require('../assets/badges/qf/19/platinum.png'),
		diamond: require('../assets/badges/qf/19/diamond.png'),
	},
};

export function qfImage(key, levelName) {
	const track = IMAGES[String(key)];
	if (!track) return null;
	const tier = levelName && track[levelName] ? levelName : 'iron';
	return track[tier];
}