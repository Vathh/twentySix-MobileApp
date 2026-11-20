import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCORING_MODES } from '../../hooks/useGameSettings';

/**
 * Sposób wpisywania w Treningu żyje na tym telefonie, osobno dla konta.
 * Ustawienie meczu go nie zmienia.
 */
const memory = new Map();

export function trainingInputModeKey(userId) {
	return `@twentysix/training-input-mode/${userId ?? 'device'}`;
}

export function normalizeTrainingInputMode(mode) {
	return mode === SCORING_MODES.PER_DART ? SCORING_MODES.PER_DART : SCORING_MODES.SUM;
}

export async function loadTrainingInputMode(userId) {
	const key = trainingInputModeKey(userId);
	if (memory.has(key)) {
		return memory.get(key);
	}
	const raw = await AsyncStorage.getItem(key);
	const mode = normalizeTrainingInputMode(raw);
	memory.set(key, mode);
	return mode;
}

export async function saveTrainingInputMode(userId, mode) {
	const key = trainingInputModeKey(userId);
	const next = normalizeTrainingInputMode(mode);
	memory.set(key, next);
	await AsyncStorage.setItem(key, next);
	return next;
}
