/**
 * Składa listę „Moje treningi”: pending/error lokalne, cache synced, wolna gra, strona z API.
 */

export const HISTORY_KINDS = [
	{ key: 'plan', label: 'Plany' },
	{ key: 'exercise', label: 'Ćwiczenia' },
	{ key: 'challenge', label: 'Wyzwania' },
	{ key: 'event', label: 'Eventy' },
	{ key: 'free_play', label: 'Wolna gra' },
];

export const HISTORY_DAY_OPTIONS = [7, 30, 90];

export function kindLabel(kind) {
	return HISTORY_KINDS.find((row) => row.key === kind)?.label
		?? (kind === 'free_play' ? 'Wolna gra' : kind);
}

export function formatHistoryDate(iso) {
	if (!iso) {
		return '';
	}
	try {
		return new Date(iso).toLocaleDateString('pl-PL', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	} catch {
		return '';
	}
}

export function activeFilterCount(kinds, days) {
	let count = 0;
	if (Array.isArray(kinds) && kinds.length > 0) {
		count += 1;
	}
	if (days === 7 || days === 30 || days === 90) {
		count += 1;
	}
	return count;
}

export function sinceMs(days, now = Date.now()) {
	if (![7, 30, 90].includes(days)) {
		return null;
	}
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - days);
	return start.getTime();
}

export function matchesFilters(item, kinds, days, now = Date.now()) {
	if (Array.isArray(kinds) && kinds.length > 0 && !kinds.includes(item.kind)) {
		return false;
	}
	const min = sinceMs(days, now);
	if (min == null) {
		return true;
	}
	const stamp = Date.parse(item.completedAt || item.playedAt || '');
	if (!Number.isFinite(stamp)) {
		return false;
	}
	return stamp >= min;
}

export function freePlayToHistoryItem(game) {
	if (!game?.id) {
		return null;
	}
	const names = (game.players ?? []).map((p) => p.name).filter(Boolean);
	const name = names.length === 0
		? 'Wolna gra'
		: names.length === 2
			? `${names[0]} vs ${names[1]}`
			: names.join(', ');
	return {
		id: `free:${game.id}`,
		localId: game.id,
		clientSessionId: `free:${game.id}`,
		kind: 'free_play',
		kindLabel: 'Wolna gra',
		name,
		completedAt: game.playedAt,
		score: null,
		scoreLabel: game.winnerName ? `Wygrywa: ${game.winnerName}` : null,
		sync: 'synced',
		source: 'free_play',
		raw: game,
	};
}

export function outboxToHistoryItem(record) {
	if (!record?.clientSessionId) {
		return null;
	}
	const kind = record.exerciseKey ? 'exercise' : (record.kind || 'plan');
	return {
		id: `local:${record.clientSessionId}`,
		clientSessionId: record.clientSessionId,
		kind,
		kindLabel: kindLabel(kind),
		name: record.name || kindLabel(kind),
		definitionId: record.definitionId ?? null,
		exerciseKey: record.exerciseKey ?? null,
		completedAt: record.completedAt,
		score: record.score,
		stats: record.stats,
		items: record.items,
		results: record.results,
		sync: record.sync === 'rejected' ? 'rejected' : 'pending',
		source: 'outbox',
		raw: record,
	};
}

export function serverToHistoryItem(row) {
	if (!row) {
		return null;
	}
	return {
		id: row.id,
		clientSessionId: row.clientSessionId,
		kind: row.kind,
		kindLabel: row.kindLabel || kindLabel(row.kind),
		name: row.name,
		definitionId: row.definitionId ?? null,
		exerciseKey: row.exerciseKey ?? null,
		completedAt: row.completedAt,
		score: row.score,
		stats: row.stats,
		sync: 'synced',
		source: 'server',
		raw: row,
	};
}

/** Deduplikacja po clientSessionId; nowsze / pending wygrywają z samym cache. */
export function mergeHistoryLists({ outbox = [], cache = [], freePlay = [], remote = [] }, kinds, days, now = Date.now()) {
	const map = new Map();
	const put = (item) => {
		if (!item || !matchesFilters(item, kinds, days, now)) {
			return;
		}
		const key = item.clientSessionId || String(item.id);
		const prev = map.get(key);
		if (!prev) {
			map.set(key, item);
			return;
		}
		const rank = (row) => {
			if (row.sync === 'pending' || row.sync === 'rejected') {
				return 3;
			}
			if (row.source === 'server') {
				return 2;
			}
			return 1;
		};
		if (rank(item) >= rank(prev)) {
			map.set(key, item);
		}
	};

	for (const row of outbox) {
		put(outboxToHistoryItem(row));
	}
	for (const row of cache) {
		put(row);
	}
	for (const row of freePlay) {
		put(freePlayToHistoryItem(row));
	}
	for (const row of remote) {
		put(serverToHistoryItem(row));
	}

	return [...map.values()].sort((a, b) => {
		const ta = Date.parse(a.completedAt || '') || 0;
		const tb = Date.parse(b.completedAt || '') || 0;
		if (tb !== ta) {
			return tb - ta;
		}
		return String(b.id).localeCompare(String(a.id));
	});
}

export function syncStatusLabel(sync) {
	if (sync === 'pending') {
		return 'Do zsynchronizowania';
	}
	if (sync === 'rejected') {
		return 'Błąd synchronizacji';
	}
	return null;
}

export function serverKindsFromFilter(kinds) {
	if (!Array.isArray(kinds) || kinds.length === 0) {
		return null;
	}
	const server = kinds.filter((key) => key !== 'free_play');
	return server.length > 0 ? server : [];
}
