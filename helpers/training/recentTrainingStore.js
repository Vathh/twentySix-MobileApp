import AsyncStorage from '@react-native-async-storage/async-storage';
import { placeRecent, RECENT_TRAINING_LIMIT } from './recentTraining';

/**
 * Ostatnio używane żyją tylko na tym telefonie, osobno dla każdego konta, które się tu loguje.
 * Nie idą na serwer. Zapis woła start sesji (punkt 5), nie otwarcie szczegółów.
 */
export function recentTrainingStorageKey(userId) {
	return `@twentysix/training-recent/${userId ?? 'device'}`;
}

export async function loadRecentTraining(userId) {
	const raw = await AsyncStorage.getItem(recentTrainingStorageKey(userId));
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, RECENT_TRAINING_LIMIT) : [];
	} catch {
		return [];
	}
}

export async function rememberRecentTraining(userId, entry) {
	const current = await loadRecentTraining(userId);
	const next = placeRecent(current, entry);
	await AsyncStorage.setItem(recentTrainingStorageKey(userId), JSON.stringify(next));
	return next;
}
