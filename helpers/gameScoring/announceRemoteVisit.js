import { hidesX01MatchFields } from '../matchFormat/matchFormat.js';
import { playVisitScore } from '../gameSounds';
import { isVisitComplete } from './visitUtils.js';

function isX01MatchState(state) {
	const format = state?.meta?.matchFormat;
	if (!format) {
		return true;
	}
	return !hidesX01MatchFields(format);
}

/**
 * Lektor wizyty przeciwnika (each_own): nowa kompletna wizyta z WS, nie z własnego OK.
 * Pierwszy hydrate (brak prev) — cisza, żeby nie odtwarzać historii.
 */
export function announceRemoteVisit(prevVisits, nextState) {
	if (!nextState || !isX01MatchState(nextState)) {
		return;
	}
	if (!Array.isArray(prevVisits)) {
		return;
	}
	const prevComplete = prevVisits.filter(isVisitComplete);
	const nextComplete = (nextState.visits ?? []).filter(isVisitComplete);
	if (nextComplete.length <= prevComplete.length) {
		return;
	}
	const visit = nextComplete[nextComplete.length - 1];
	const score = visit?.bust ? 0 : Number(visit?.score);
	playVisitScore(score);
}
