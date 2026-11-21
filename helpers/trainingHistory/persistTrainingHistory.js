import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@twentysix/trainingHistory';
const MAX_GAMES = 100;

export async function loadTrainingHistory() {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		return Array.isArray(list) ? list : [];
	} catch {
		return [];
	}
}

export async function getTrainingGameById(id) {
	const list = await loadTrainingHistory();
	return list.find((g) => g.id === id) ?? null;
}

export async function saveTrainingGame(game) {
	if (!game?.id) return;
	try {
		const list = await loadTrainingHistory();
		const next = [game, ...list.filter((g) => g.id !== game.id)].slice(
			0,
			MAX_GAMES,
		);
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch (e) {
		console.warn('trainingHistory save failed', e);
	}
}

/** Czyści lokalną historię Wolnej gry (Moje treningi). Nie rusza kariery. */
export async function clearTrainingHistory() {
	try {
		await AsyncStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.warn('trainingHistory clear failed', e);
	}
}
