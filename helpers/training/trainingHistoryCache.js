import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_SYNCED = 5;

let tail = Promise.resolve();

function exclusive(task) {
	const run = tail.then(task, task);
	tail = run.then(() => undefined, () => undefined);
	return run;
}

export function trainingHistoryCacheKey(userId) {
	return `@twentysix/training-history-cache/${userId ?? 'device'}`;
}

export async function loadHistoryCache(userId) {
	const raw = await AsyncStorage.getItem(trainingHistoryCacheKey(userId));
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

async function saveHistoryCache(userId, items) {
	await AsyncStorage.setItem(trainingHistoryCacheKey(userId), JSON.stringify(items));
}

/** Trzyma najwyżej pięć najnowszych zsynchronizowanych sesji (bez wolnej gry). */
export function rememberSyncedHistory(userId, items) {
	return exclusive(async () => {
		const incoming = (Array.isArray(items) ? items : [])
			.filter((row) => row && row.sync === 'synced' && row.kind !== 'free_play');
		if (incoming.length === 0) {
			return loadHistoryCache(userId);
		}
		const current = await loadHistoryCache(userId);
		const map = new Map();
		for (const row of [...incoming, ...current]) {
			const key = row.clientSessionId || String(row.id);
			if (!map.has(key)) {
				map.set(key, row);
			}
		}
		const next = [...map.values()]
			.sort((a, b) => {
				const ta = Date.parse(a.completedAt || '') || 0;
				const tb = Date.parse(b.completedAt || '') || 0;
				return tb - ta;
			})
			.slice(0, MAX_SYNCED);
		await saveHistoryCache(userId, next);
		return next;
	});
}

export function clearHistoryCache(userId) {
	return exclusive(async () => {
		await AsyncStorage.removeItem(trainingHistoryCacheKey(userId));
		return [];
	});
}
