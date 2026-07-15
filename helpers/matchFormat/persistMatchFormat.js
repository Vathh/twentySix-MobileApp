import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MATCH_FORMAT, normalizeMatchFormat } from './matchFormat';

const STORAGE_KEYS = {
	training: '@twentysix/trainingMatchFormat',
	quickGame: '@twentysix/quickGameMatchFormat',
};

export async function loadPersistedMatchFormat(context) {
	const key = STORAGE_KEYS[context];
	if (!key) {
		return { ...DEFAULT_MATCH_FORMAT };
	}

	try {
		const raw = await AsyncStorage.getItem(key);
		if (!raw) {
			return { ...DEFAULT_MATCH_FORMAT };
		}

		return normalizeMatchFormat(JSON.parse(raw));
	} catch {
		return { ...DEFAULT_MATCH_FORMAT };
	}
}

export async function savePersistedMatchFormat(context, format) {
	const key = STORAGE_KEYS[context];
	if (!key) {
		return;
	}

	await AsyncStorage.setItem(key, JSON.stringify(normalizeMatchFormat(format)));
}
