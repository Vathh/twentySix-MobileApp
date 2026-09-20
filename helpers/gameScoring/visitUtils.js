import { pid } from './pid.js';

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
