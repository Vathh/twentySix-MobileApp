/**
 * Luźne rzuty. Sam czas, bez celu, bez lotek i bez skuteczności.
 * Koniec czasu zamyka ćwiczenie. Zapisujemy długość sesji.
 */

export const LOOSE_THROWS_MECHANIC = 'loose_throws';
export const DEFAULT_DURATION_MS = 180000;

export function canPlayLooseThrows(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === LOOSE_THROWS_MECHANIC
		&& definition.inactive !== true,
	);
}

export function looseDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function startLooseThrowsSession(definition, clientSessionId, now = Date.now()) {
	const durationMs = looseDurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		durationMs,
		endsAt: now + durationMs,
	};
}

/** Koniec czasu zamyka ćwiczenie. Drugie wywołanie nic nie zmienia. */
export function expireLooseThrows(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		status: 'completed',
	};
}

/** Zapis ukończenia. Bez trafień i bez lotek. Zostaje czas ćwiczenia. */
export function looseThrowsCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: null,
		stats: {
			elapsedSeconds: Math.round((session?.durationMs ?? 0) / 1000),
		},
		sync: 'pending',
	};
}
