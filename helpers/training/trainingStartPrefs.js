import AsyncStorage from '@react-native-async-storage/async-storage';

export const START_TAB_FAVORITES = 'favorites';
export const START_TAB_RECENT = 'recent';

export function trainingStartTabKey(userId) {
	return `@twentysix/training-start-tab/${userId ?? 'device'}`;
}

export async function loadTrainingStartTab(userId) {
	const raw = await AsyncStorage.getItem(trainingStartTabKey(userId));
	return raw === START_TAB_RECENT ? START_TAB_RECENT : START_TAB_FAVORITES;
}

export async function saveTrainingStartTab(userId, tab) {
	const next = tab === START_TAB_RECENT ? START_TAB_RECENT : START_TAB_FAVORITES;
	await AsyncStorage.setItem(trainingStartTabKey(userId), next);
	return next;
}
