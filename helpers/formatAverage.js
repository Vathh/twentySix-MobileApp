/**
 * Średnia 3-dartowa — zawsze format xx.xx (np. 9 → "9.00").
 */
export function formatAverage(value) {
	if (value == null || value === '' || value === '-') {
		return '-';
	}
	const n = Number(value);
	if (Number.isNaN(n)) {
		return '-';
	}
	return n.toFixed(2);
}

export function hasAverage(value) {
	return value != null && value !== '' && !Number.isNaN(Number(value));
}
