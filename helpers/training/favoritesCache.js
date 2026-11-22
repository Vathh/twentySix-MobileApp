import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTrainingFavorites } from './trainingApi';

export const EMPTY_FAVORITES = {
	challenges: [],
	plans: [],
	exercises: [],
};

export function favoritesCacheKey(userId) {
	return `@twentysix/training-favorites/${userId ?? 'device'}`;
}

function normalizeLists(data) {
	return {
		challenges: Array.isArray(data?.challenges) ? data.challenges : [],
		plans: Array.isArray(data?.plans) ? data.plans : [],
		exercises: Array.isArray(data?.exercises) ? data.exercises : [],
	};
}

function listKeyForKind(kind) {
	if (kind === 'challenge') {
		return 'challenges';
	}
	if (kind === 'plan') {
		return 'plans';
	}
	if (kind === 'exercise') {
		return 'exercises';
	}
	return null;
}

export async function loadCachedFavorites(userId) {
	const raw = await AsyncStorage.getItem(favoritesCacheKey(userId));
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return null;
		}
		return normalizeLists(parsed);
	} catch {
		return null;
	}
}

export async function saveCachedFavorites(userId, lists) {
	const next = normalizeLists(lists);
	await AsyncStorage.setItem(
		favoritesCacheKey(userId),
		JSON.stringify({
			...next,
			savedAt: new Date().toISOString(),
		}),
	);
	return next;
}

/**
 * @returns {typeof EMPTY_FAVORITES|null}
 */
export async function refreshFavorites(userId, accessToken) {
	if (!accessToken) {
		return null;
	}
	const result = await fetchTrainingFavorites(accessToken);
	if (!result.ok) {
		return null;
	}
	return saveCachedFavorites(userId, result.data);
}

function favoriteMatchKey(row) {
	const exerciseKey = row?.exerciseKey || row?.id;
	const variant = row?.variant != null && row.variant !== '' ? String(row.variant) : '';
	if (row?.kind === 'exercise' || (!row?.kind && exerciseKey)) {
		return variant ? `exercise:${exerciseKey}:${variant}` : `exercise:${exerciseKey}`;
	}
	return `${row?.kind}:${row?.id}`;
}

/** Po dodaniu gwiazdki — dopisz kartę do lokalnej listy ulubionych. */
export async function applyFavoriteCreated(userId, kind, item) {
	const key = listKeyForKind(kind);
	if (!key || !item) {
		return loadCachedFavorites(userId);
	}
	const current = (await loadCachedFavorites(userId)) ?? EMPTY_FAVORITES;
	const nextKey = favoriteMatchKey({ ...item, kind: item.kind || kind });
	const rows = (current[key] ?? []).filter((row) => favoriteMatchKey({ ...row, kind }) !== nextKey);
	return saveCachedFavorites(userId, {
		...current,
		[key]: [...rows, { ...item, favorite: true }],
	});
}

/**
 * Po zdjęciu gwiazdki — usuń po id / exerciseKey / wariancie.
 * @param {string|number|Array| { exerciseKey?: string, id?: string, variant?: string }} ids
 */
export async function applyFavoriteRemoved(userId, kind, ids) {
	const key = listKeyForKind(kind);
	if (!key) {
		return loadCachedFavorites(userId);
	}
	const list = Array.isArray(ids) ? ids : [ids];
	const gone = new Set(list.map((row) => {
		if (row && typeof row === 'object') {
			return favoriteMatchKey({ ...row, kind: row.kind || kind });
		}
		return kind === 'exercise' ? `exercise:${row}` : `${kind}:${row}`;
	}));
	const current = (await loadCachedFavorites(userId)) ?? EMPTY_FAVORITES;
	return saveCachedFavorites(userId, {
		...current,
		[key]: (current[key] ?? []).filter((row) => !gone.has(favoriteMatchKey({ ...row, kind }))),
	});
}

export async function replaceFavoriteList(userId, kind, items) {
	const key = listKeyForKind(kind) || kind;
	if (!key || !['challenges', 'plans', 'exercises'].includes(key)) {
		return loadCachedFavorites(userId);
	}
	const current = (await loadCachedFavorites(userId)) ?? EMPTY_FAVORITES;
	return saveCachedFavorites(userId, {
		...current,
		[key]: Array.isArray(items) ? items : [],
	});
}
