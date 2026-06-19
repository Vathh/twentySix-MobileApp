import { pid } from './pid.js';
import { isVisitComplete } from './visitUtils.js';

/**
 * Wyznacza indeks gracza, który ma teraz rzucać.
 * @param {object} params
 * @param {Array} params.players — lista graczy z UI
 * @param {number} params.N
 * @param {Array} params.visits — wizyty bieżącego lega
 * @param {number|null} params.explicitIndex — z sesji FFA (null = inferuj)
 * @param {number|null} params.legOpenerIndex — gdy brak wizyt
 * @param {boolean} params.legOpen
 */
export function inferCurrentPlayerIndex({
	players,
	N,
	visits,
	explicitIndex = null,
	legOpenerIndex = 0,
	legOpen = true,
}) {
	if (explicitIndex != null) {
		return explicitIndex;
	}

	if (visits.length > 0) {
		const last = visits[visits.length - 1];
		const lastPid = pid(last.playerId);
		const lastIdx = players.findIndex(
			(p) => pid(p.playerId ?? p.id) === lastPid,
		);
		if (lastIdx >= 0) {
			if (last.bust || !isVisitComplete(last)) {
				return lastIdx;
			}
			return (lastIdx + 1) % N;
		}
	}

	if (legOpen) {
		return legOpenerIndex ?? 0;
	}

	return 0;
}
