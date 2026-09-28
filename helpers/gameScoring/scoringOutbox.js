import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Lokalna kolejka niewysłanych operacji scoringu (turniej / FFA).
 * Klucz: scoring-outbox:tournament:{kind}:{gameId} | scoring-outbox:ffa:{lobbyId}
 */

export async function loadOutbox(key) {
	if (!key) {
		return [];
	}
	try {
		const raw = await AsyncStorage.getItem(key);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export async function saveOutbox(key, entries) {
	if (!key) {
		return;
	}
	if (!entries?.length) {
		await AsyncStorage.removeItem(key);
		return;
	}
	await AsyncStorage.setItem(key, JSON.stringify(entries));
}

export async function clearOutbox(key) {
	if (!key) {
		return;
	}
	await AsyncStorage.removeItem(key);
}

/**
 * @param {string} key
 * @param {{ op: string, legId?: number|null, payload?: object, clientVisitId?: string|null }} entry
 */
export async function enqueueOutbox(key, entry) {
	const list = await loadOutbox(key);
	const next = [...list];

	if (entry.op === 'recordVisit' && entry.clientVisitId) {
		const idx = next.findIndex(
			(e) =>
				e.op === 'recordVisit' &&
				e.clientVisitId === entry.clientVisitId,
		);
		const item = {
			...entry,
			createdAt: entry.createdAt ?? Date.now(),
		};
		if (idx >= 0) {
			next[idx] = item;
		} else {
			next.push(item);
		}
	} else if (entry.op === 'closeLeg') {
		const idx = next.findIndex(
			(e) => e.op === 'closeLeg' && e.legId === entry.legId,
		);
		const item = {
			...entry,
			createdAt: entry.createdAt ?? Date.now(),
		};
		if (idx >= 0) {
			next[idx] = item;
		} else {
			next.push(item);
		}
	} else {
		next.push({
			...entry,
			createdAt: entry.createdAt ?? Date.now(),
		});
	}

	await saveOutbox(key, next);
	return next;
}

export async function peekOutbox(key) {
	const list = await loadOutbox(key);
	return list[0] ?? null;
}

/** Usuwa pierwszy wpis (po udanym flushu). */
export async function dequeueOutbox(key) {
	const list = await loadOutbox(key);
	if (list.length === 0) {
		return [];
	}
	const rest = list.slice(1);
	await saveOutbox(key, rest);
	return rest;
}
