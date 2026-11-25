/**
 * Lokalny cache rekordów treningowych (PB ćwiczeń + definicji).
 * Odczyt na ekranie startu; sieć przy wejściu w Trening (TTL), ekranie Rekordy,
 * po wipe oraz optymistycznie po ukończeniu sesji.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTrainingRecords } from './trainingApi.js';
import {
	EMPTY_RECORDS,
	isRecordsCacheStale,
	mergeCompletionIntoBundle,
	normalizeRecordVariant,
	normalizeRecordsBundle,
} from './recordsBundle.js';

export {
	EMPTY_RECORDS,
	isRecordsCacheStale,
	mergeCompletionIntoBundle,
	normalizeRecordVariant,
} from './recordsBundle.js';

/** 30 min — odśwież przy wejściu w Trening, nie co tick. */
export const RECORDS_CACHE_TTL_MS = 30 * 60 * 1000;

export function recordsCacheKey(userId) {
	return `@twentysix/training-records/${userId ?? 'device'}`;
}

export async function loadCachedRecords(userId) {
	const raw = await AsyncStorage.getItem(recordsCacheKey(userId));
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return null;
		}
		return normalizeRecordsBundle(parsed);
	} catch {
		return null;
	}
}

export async function saveCachedRecords(userId, bundle) {
	const next = normalizeRecordsBundle(bundle);
	const payload = {
		items: next.items,
		definitions: next.definitions,
		savedAt: new Date().toISOString(),
	};
	await AsyncStorage.setItem(recordsCacheKey(userId), JSON.stringify(payload));
	return payload;
}

export async function clearRecordsCache(userId) {
	await AsyncStorage.removeItem(recordsCacheKey(userId));
}

/** Pełny fetch z API i zapis cache. */
export async function refreshRecords(userId, accessToken) {
	if (!accessToken) {
		return null;
	}
	const result = await fetchTrainingRecords(accessToken);
	if (!result.ok) {
		return null;
	}
	return saveCachedRecords(userId, {
		items: result.data?.items,
		definitions: result.data?.definitions,
	});
}

/** Fetch tylko gdy brak cache albo TTL minął. */
export async function refreshRecordsIfStale(userId, accessToken, ttlMs = RECORDS_CACHE_TTL_MS) {
	const cached = await loadCachedRecords(userId);
	if (cached && !isRecordsCacheStale(cached, Date.now(), ttlMs)) {
		return cached;
	}
	const fresh = await refreshRecords(userId, accessToken);
	return fresh ?? cached;
}

/** Optymistyczny bump PB po finish — bez czekania na API. */
export async function applyCompletionToRecordsCache(userId, record) {
	if (!record) {
		return loadCachedRecords(userId);
	}
	const current = (await loadCachedRecords(userId)) ?? EMPTY_RECORDS;
	const next = mergeCompletionIntoBundle(current, record);
	return saveCachedRecords(userId, next);
}
