/**
 * Zlewa powtórzone wartości QF/HF w pary { value, count }.
 * QF rośnie (mniej lotek pierwsze), HF maleje (wyższy wynik pierwszy).
 */
export function groupAchievementValues(values, order = 'asc') {
	const counts = new Map();
	for (const raw of values ?? []) {
		const value = Number(raw);
		if (!Number.isFinite(value) || value <= 0) {
			continue;
		}
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	const grouped = [...counts.entries()].map(([value, count]) => ({ value, count }));
	grouped.sort((a, b) => (order === 'desc' ? b.value - a.value : a.value - b.value));
	return grouped;
}
