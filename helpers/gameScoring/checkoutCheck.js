const CHECKOUT_BOGEYS = new Set([159, 162, 163, 165, 166, 168, 169]);

/** Suma, którą da się zamknąć jedną wizytą: 2–170, bez wyników niemożliwych od 100. */
export function canFinishWithCheck(remaining) {
	const score = Number(remaining);
	return Number.isInteger(score) && score >= 2 && score <= 170 && !CHECKOUT_BOGEYS.has(score);
}
