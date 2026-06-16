/**
 * Etykieta rzutu na tarczy (np. T20, D10, 15, Bull).
 * @param {number} baseValue segment (1–25)
 * @param {'double'|'triple'|null} modifier
 */
export function formatDartLabel(baseValue, modifier) {
	if (baseValue === 25) {
		if (modifier === 'double') return 'Bull';
		return '25';
	}
	if (modifier === 'triple') return `T${baseValue}`;
	if (modifier === 'double') return `D${baseValue}`;
	return String(baseValue);
}

export function formatVisitDartsLine(labels) {
	if (!labels?.length) return '';
	return labels.join(', ');
}
