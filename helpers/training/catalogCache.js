import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	fetchTrainingCatalog,
	fetchTrainingDefinition,
} from './trainingApi';
import { saveCachedDefinition } from './definitionCache';
import { refreshFavorites } from './favoritesCache';
import { refreshRecordsIfStale } from './recordsCache';

const CATALOG_KINDS = ['plans', 'exercises', 'challenges', 'events'];

export function catalogListKey(userId, kind) {
	return `@twentysix/training-catalog/${userId ?? 'device'}/${kind}`;
}

export async function loadCachedCatalog(userId, kind) {
	const raw = await AsyncStorage.getItem(catalogListKey(userId, kind));
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed?.items) ? parsed.items : null;
	} catch {
		return null;
	}
}

export async function saveCachedCatalog(userId, kind, items) {
	await AsyncStorage.setItem(
		catalogListKey(userId, kind),
		JSON.stringify({
			items: Array.isArray(items) ? items : [],
			savedAt: new Date().toISOString(),
		}),
	);
}

function sameCatalog(left, right) {
	const a = Array.isArray(left) ? left : [];
	const b = Array.isArray(right) ? right : [];
	if (a.length !== b.length) {
		return false;
	}
	return a.every((item, index) => {
		const other = b[index];
		return item?.id === other?.id
			&& Boolean(item?.favorite) === Boolean(other?.favorite)
			&& Boolean(item?.inactive) === Boolean(other?.inactive)
			&& String(item?.name ?? '') === String(other?.name ?? '');
	});
}

/**
 * Ściąga listę z API, zapisuje lokalnie i dociąga pełne definicje (bez eventów — te wymagają sieci).
 * @returns {{ items: array, changed: boolean }|null}
 */
export async function refreshCatalogKind(userId, accessToken, kind) {
	if (!accessToken || !kind) {
		return null;
	}
	const result = await fetchTrainingCatalog(accessToken, kind);
	if (!result.ok) {
		return null;
	}
	const items = Array.isArray(result.data?.items) ? result.data.items : [];
	const previous = await loadCachedCatalog(userId, kind);
	await saveCachedCatalog(userId, kind, items);
	if (kind !== 'events') {
		await prefetchDefinitions(userId, accessToken, items);
	}
	return {
		items,
		changed: !sameCatalog(previous, items),
	};
}

async function prefetchDefinitions(userId, accessToken, items) {
	const list = Array.isArray(items) ? items : [];
	const jobs = list.map(async (item) => {
		if (!item?.id) {
			return;
		}
		const result = await fetchTrainingDefinition(accessToken, item.id);
		if (result.ok && result.data) {
			await saveCachedDefinition(userId, result.data);
		}
	});
	await Promise.all(jobs);
}

/** Prefetch przy wejściu w Trening: listy + definicje + ulubione + rekordy (TTL) w tle. */
export async function prefetchTrainingCatalogs(userId, accessToken) {
	if (!accessToken) {
		return;
	}
	await Promise.all([
		...CATALOG_KINDS.map((kind) => refreshCatalogKind(userId, accessToken, kind)),
		refreshFavorites(userId, accessToken),
		refreshRecordsIfStale(userId, accessToken),
	]);
}
