/**
 * Kolejny zawodnik rozpoczynający leg (product: opener poprzedniego + 1, cyklicznie).
 * @param {number} currentLegOpenerIndex
 * @param {number} playerCount
 * @returns {number}
 */
export function computeNextLegOpener(currentLegOpenerIndex, playerCount) {
	if (playerCount <= 0) {
		return 0;
	}
	return (currentLegOpenerIndex + 1) % playerCount;
}
