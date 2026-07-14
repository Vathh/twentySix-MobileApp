/**
 * Czy cofnięcie wizyty dotknie już zakończonego lega (reopen + cofnięcie licznika legów).
 */
export function wouldUndoClosedLeg(state) {
	if (!state) {
		return false;
	}

	const currentLeg = state.currentLeg ?? null;
	const visits = state.visits ?? [];
	const finishedLegs = state.legs ?? [];
	const legNumber =
		state.turn?.legNumber ?? currentLeg?.legNumber ?? 0;

	if (currentLeg?.open === true && visits.length > 0) {
		return false;
	}

	if (currentLeg == null && finishedLegs.length > 0) {
		return true;
	}

	if (currentLeg?.open === false) {
		return true;
	}

	if (currentLeg?.open === true && visits.length === 0) {
		if (finishedLegs.length > 0) {
			return true;
		}
		if (legNumber > 1) {
			return true;
		}
	}

	return false;
}

/**
 * @param {object|null} state
 * @param {number|null} fallbackLegId
 * @returns {number|null}
 */
export function resolveUndoLegId(state, fallbackLegId = null) {
	if (!state) {
		return fallbackLegId;
	}

	if (state.currentLeg?.id != null) {
		return state.currentLeg.id;
	}

	const finishedLegs = state.legs ?? [];
	if (finishedLegs.length === 0) {
		return fallbackLegId;
	}

	const lastFinished = finishedLegs.reduce((latest, leg) =>
		(leg.legNumber ?? 0) >= (latest.legNumber ?? 0) ? leg : latest,
	);

	return lastFinished.id ?? fallbackLegId;
}

export const CLOSED_LEG_UNDO_TITLE = 'Cofnąć zakończony leg?';

export const CLOSED_LEG_UNDO_MESSAGE =
	'To cofnie ostatnią wizytę i ponownie otworzy zakończony leg. Upewnij się, że to zamierzone — operacja zmienia wynik meczu.';
