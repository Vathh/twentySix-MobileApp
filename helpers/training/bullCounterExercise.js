/**
 * Walka o licznik. Jedna lotka, inner 4, outer 2, pudło 0.
 * Czas z definicji (domyślnie 3 minuty). Wynik to suma punktów.
 * Lista lotek zostaje na telefonie. Na serwer: wynik, trafienia, aims (Bull/Inner/Outer).
 */

export const BULL_COUNTER_MECHANIC = 'bull_counter';
export const DEFAULT_DURATION_MS = 180000;
export const INNER_POINTS = 4;
export const OUTER_POINTS = 2;
export const BULL_COUNTER_AIM = 'Inner';
export const BULL_COUNTER_AIM_TEXT = 'Celuj w czerwony środek. Używaj tylko jednej lotki.';

const POINTS = {
	inner: INNER_POINTS,
	outer: OUTER_POINTS,
	miss: 0,
};

export function canPlayBullCounter(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === BULL_COUNTER_MECHANIC
		&& definition.inactive !== true,
	);
}

export function bullCounterDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function startBullCounterSession(definition, clientSessionId, now = Date.now()) {
	const durationMs = bullCounterDurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		darts: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

function dartPoints(dart) {
	return POINTS[dart?.ring] ?? 0;
}

function dartHits(dart) {
	return dart?.ring === 'inner' || dart?.ring === 'outer';
}

/** Wynik na liczniku. Każda lotka podbija od razu. */
export function bullCounterScore(darts) {
	let score = 0;
	for (const dart of darts ?? []) {
		score += dartPoints(dart);
	}
	return score;
}

export function recordBullCounterDart(session, ring) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	if (ring !== 'inner' && ring !== 'outer' && ring !== 'miss') {
		return session;
	}
	return {
		...session,
		darts: [...session.darts, { aim: BULL_COUNTER_AIM, ring }],
	};
}

export function undoBullCounterDart(session) {
	if (!session || session.darts.length === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu zostawia rzucone lotki i zamyka ćwiczenie. */
export function expireBullCounter(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		status: 'completed',
	};
}

/**
 * Skuteczność: cały Bull + Inner i Outer osobno (każda lotka = próba).
 *
 * @returns {{ hits: number, attempts: number, percent: number, aims: Array<{ aim: string, attempts: number, hits: number, percent: number }> }}
 */
export function bullCounterStats(session) {
	const darts = session?.darts ?? [];
	const attempts = darts.length;
	let bullHits = 0;
	let innerHits = 0;
	let outerHits = 0;
	for (const dart of darts) {
		if (dart?.ring === 'inner') {
			innerHits += 1;
			bullHits += 1;
		} else if (dart?.ring === 'outer') {
			outerHits += 1;
			bullHits += 1;
		}
	}
	const percent = attempts === 0 ? 0 : Math.round((bullHits * 100) / attempts);
	const row = (aim, hits) => ({
		aim,
		attempts,
		hits,
		percent: attempts === 0 ? 0 : Math.round((hits * 100) / attempts),
	});
	const aims = attempts > 0
		? [row('Bull', bullHits), row('Inner', innerHits), row('Outer', outerHits)]
		: [];
	return { hits: bullHits, attempts, percent, aims };
}

export function bullCounterCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: bullCounterScore(session.darts),
		stats: bullCounterStats(session),
		sync: 'pending',
	};
}
