import { hidesX01MatchFields } from '../matchFormat/matchFormat.js';
import { isVisitComplete } from './visitUtils.js';

function isX01MatchState(state) {
	const format = state?.meta?.matchFormat;
	if (!format) {
		return true;
	}
	return !hidesX01MatchFields(format);
}

function legNumberOf(close) {
	const leg = Number(close?.legNumber);
	return Number.isFinite(leg) ? leg : 0;
}

/**
 * Co zagrać po stanie z websocketu.
 * `silent` — pierwszy hydrate, undo zamknięcia lega, albo brak nowej wizyty.
 * Zamknięcie lega (wyższy lastLegClose albo koniec meczu) wygrywa z lektorem wyniku.
 *
 * @param {{ visits?: unknown, lastLegClose?: { legNumber?: number } | null, status?: string | null } | null} prev
 * @param {object | null} nextState
 * @returns {'silent' | 'gameshot' | 'gameshot-match' | { type: 'score', score: number }}
 */
export function remoteAnnouncement(prev, nextState) {
	if (!nextState || !isX01MatchState(nextState)) {
		return 'silent';
	}
	if (!prev || !Array.isArray(prev.visits)) {
		return 'silent';
	}

	const prevLeg = legNumberOf(prev.lastLegClose);
	const nextLeg = legNumberOf(nextState.meta?.lastLegClose);
	const nextStatus = nextState.meta?.status ?? null;
	const becameFinished = prev.status !== 'finished' && nextStatus === 'finished';

	if (nextLeg < prevLeg) {
		return 'silent';
	}
	if (nextLeg > prevLeg || becameFinished) {
		return nextStatus === 'finished' ? 'gameshot-match' : 'gameshot';
	}

	const prevComplete = prev.visits.filter(isVisitComplete);
	const nextComplete = (nextState.visits ?? []).filter(isVisitComplete);
	if (nextComplete.length <= prevComplete.length) {
		return 'silent';
	}
	const visit = nextComplete[nextComplete.length - 1];
	if (visit?.closedLeg) {
		return nextStatus === 'finished' ? 'gameshot-match' : 'gameshot';
	}
	const score = visit?.bust ? 0 : Number(visit?.score);
	return { type: 'score', score };
}
