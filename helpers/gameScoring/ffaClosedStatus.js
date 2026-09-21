export function ffaSessionStatus(state) {
	return state?.session?.status ?? state?.game?.status ?? state?.meta?.status ?? null;
}

export function isFfaAbortedState(state) {
	return ffaSessionStatus(state) === 'aborted';
}

export function isFfaFinishedState(state) {
	return ffaSessionStatus(state) === 'finished';
}

export function isH2hCancelledState(state) {
	if (!state || typeof state !== 'object') {
		return false;
	}
	return state.cancelled === true
		|| state.game?.status === 'cancelled'
		|| state.meta?.status === 'cancelled';
}

/**
 * @returns {boolean} true gdy payload oznacza skasowaną grę — przerwij dalsze apply.
 */
export function consumeFfaAbortPayload(state, { setGameClosed, onAborted, handledRef }) {
	if (!isFfaAbortedState(state)) {
		return false;
	}
	if (!handledRef.current) {
		handledRef.current = true;
		setGameClosed(true);
		onAborted?.();
	}
	return true;
}

/**
 * @returns {boolean} true gdy payload oznacza anulowany mecz H2H.
 */
export function consumeH2hCancelledPayload(state, { setGameClosed, onAborted, handledRef }) {
	if (!isH2hCancelledState(state)) {
		return false;
	}
	if (!handledRef.current) {
		handledRef.current = true;
		setGameClosed(true);
		onAborted?.();
	}
	return true;
}
