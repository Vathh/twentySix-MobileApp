/** Najwyżej sześć różnych pozycji. Klucz łączy rodzaj, id i wariant. */
export const RECENT_TRAINING_LIMIT = 6;

export function recentTrainingKey(entry) {
	const variant = entry?.variant != null && entry.variant !== '' ? String(entry.variant) : '';
	if (entry?.kind === 'exercise' && variant) {
		return `exercise:${entry.id}:${variant}`;
	}
	return `${entry.kind}:${entry.id}`;
}

/**
 * Najnowsza pozycja jest pierwsza. Ponowienie tej samej przesuwa ją na początek i nie tworzy drugiej.
 *
 * @param {Array<object>} items
 * @param {{ id: string|number, kind: string, name: string, variant?: string|null, exerciseKey?: string }} entry
 */
export function placeRecent(items, entry, limit = RECENT_TRAINING_LIMIT) {
	const key = recentTrainingKey(entry);
	const variant = entry?.variant != null && entry.variant !== '' ? String(entry.variant) : null;
	const next = [
		{
			id: entry.id,
			kind: entry.kind,
			name: entry.name,
			key,
			...(entry.exerciseKey ? { exerciseKey: entry.exerciseKey } : {}),
			...(variant ? { variant } : {}),
		},
		...(Array.isArray(items) ? items : []).filter((item) => item && item.key !== key),
	];
	return next.slice(0, limit);
}
