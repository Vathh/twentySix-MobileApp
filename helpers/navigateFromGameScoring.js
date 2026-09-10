/**
 * Wyjście z root GameScoring do ekranu w stacku Graj (zalogowany)
 * albo replace na root stacku (gość).
 */
export function navigateFromGameScoring(navigation, screenName, params = {}) {
	const state = navigation.getState?.();
	const routeNames = state?.routeNames ?? [];

	if (routeNames.includes('MainTabs')) {
		navigation.navigate('MainTabs', {
			screen: 'Graj',
			params: {
				screen: screenName,
				params,
			},
		});
		return;
	}

	if (typeof navigation.replace === 'function') {
		navigation.replace(screenName, params);
		return;
	}

	navigation.navigate(screenName, params);
}

/** Wejście na root `GameScoring` z zagnieżdżonego stacku (lobby w tabie Graj). */
export function navigateToGameScoring(navigation, params) {
	let nav = navigation;
	for (let i = 0; i < 8; i += 1) {
		const parent = nav?.getParent?.();
		if (!parent) {
			break;
		}
		nav = parent;
	}
	nav.navigate('GameScoring', params);
}
