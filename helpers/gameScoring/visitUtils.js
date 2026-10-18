import { pid } from './pid.js';

/**
 * Punkt startowy z odpowiedzi scoringu (surowa albo znormalizowana).
 * Brak formatu zostawia `fallback` — zwykle lokalne 501, zanim przyjdzie stan meczu.
 */
export function startingScoreFromScoringState(state, fallback = 501) {
	if (!state || typeof state !== 'object') {
		return fallback;
	}
	const candidates = [
		state.meta?.matchFormat?.startingScore,
		state.meta?.startingScore,
		state.game?.matchFormat?.startingScore,
		state.game?.startingScore,
		state.session?.matchFormat?.startingScore,
		state.session?.startingScore,
	];
	for (const value of candidates) {
		const score = Number(value);
		if (Number.isFinite(score) && score > 0) {
			return score;
		}
	}
	return fallback;
}

export const isVisitComplete = (visit) =>
	visit?.bust ||
	visit?.closedLeg ||
	(visit?.dartsInVisit != null && visit.dartsInVisit >= 3);

/**
 * Remaining gracza z logu wizyt (stan z API), nie z React state.
 * Po undo lastSync jest aktualizowany synchronicznie — wcześniej niż playerStates.
 */
export function remainingFromPlayerVisits(visits, playerId, startingScore = 501) {
	const mine = (visits ?? []).filter(
		(visit) => pid(visit.playerId) === pid(playerId) && isVisitComplete(visit),
	);
	if (mine.length === 0) {
		return startingScore;
	}
	const last = mine[mine.length - 1];
	if (last.remainingAfter != null && last.remainingAfter !== '') {
		return Number(last.remainingAfter);
	}
	if (last.bust) {
		return last.remainingBefore != null
			? Number(last.remainingBefore)
			: startingScore;
	}
	let remaining = startingScore;
	for (const visit of mine) {
		remaining = visit.bust ? remaining : Math.max(0, remaining - (visit.score ?? 0));
	}
	return remaining;
}
