/**
 * Reguły wizyty per-dart (501 double out) — ocena po każdej lotce.
 */

/** Czy lotka zamyka lega dublem (D1–D20 lub Bull = 50). */
export function isDoubleFinishDart(dartLabel) {
	if (!dartLabel) return false;
	if (dartLabel === 'Bull') return true;
	return dartLabel.startsWith('D');
}

/**
 * @returns {{ bust: boolean, checkout: boolean }}
 */
export function evaluatePerDartVisitAfterDart(visitStart, visitTotal, dartLabel) {
	if (visitTotal > visitStart) {
		return { bust: true, checkout: false };
	}

	const remaining = visitStart - visitTotal;

	if (remaining === 1) {
		return { bust: true, checkout: false };
	}

	if (remaining === 0) {
		if (isDoubleFinishDart(dartLabel)) {
			return { bust: false, checkout: true };
		}
		return { bust: true, checkout: false };
	}

	return { bust: false, checkout: false };
}
