/** Najwyżej trzy różne pozycje. Klucz łączy rodzaj i id, więc plan i ćwiczenie o tym samym numerze są osobne. */
export const RECENT_TRAINING_LIMIT = 3;

export function recentTrainingKey(entry) {
	return `${entry.kind}:${entry.id}`;
}

/**
 * Najnowsza pozycja jest pierwsza. Ponowienie tej samej przesuwa ją na początek i nie tworzy drugiej.
 *
 * @param {Array<{ id: number, kind: string, name: string, key?: string }>} items
 * @param {{ id: number, kind: string, name: string }} entry
 */
export function placeRecent(items, entry, limit = RECENT_TRAINING_LIMIT) {
	const key = recentTrainingKey(entry);
	const next = [
		{ id: entry.id, kind: entry.kind, name: entry.name, key },
		...(Array.isArray(items) ? items : []).filter((item) => item && item.key !== key),
	];
	return next.slice(0, limit);
}
