/**
 * Scoring z presją. Warianty: jeden sektor albo rotacja 20, 19, 18 co lotkę.
 * Single 1, double 2, triple 3. Pudło i zły sektor zerują serię.
 * W trakcie widać bieżącą serię. Wynik ćwiczenia to najwyższa seria.
 * Lista lotek zostaje na telefonie.
 */

export const SCORING_PRESSURE_MECHANIC = 'scoring_under_pressure';
export const SCORING_PRESSURE_VARIANTS = ['20', '19', '18', '20/19/18'];
export const DEFAULT_SCORING_PRESSURE_VARIANT = '20';
export const DEFAULT_DURATION_MS = 300000;
export const VISIT_SIZE = 3;

const ROTATION = [20, 19, 18];
const RINGS = new Set(['single', 'double', 'triple', 'miss']);
const POINTS = { single: 1, double: 2, triple: 3 };

export function canPlayScoringPressure(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === SCORING_PRESSURE_MECHANIC
		&& definition.inactive !== true,
	);
}

export function scoringPressureVariant(value) {
	return SCORING_PRESSURE_VARIANTS.includes(value) ? value : DEFAULT_SCORING_PRESSURE_VARIANT;
}

export function scoringPressureDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function startScoringPressureSession(definition, clientSessionId, variant, now = Date.now()) {
	const durationMs = scoringPressureDurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		variant: scoringPressureVariant(variant ?? definition?.variant),
		darts: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

export function scoringPressureInstruction(variant) {
	if (scoringPressureVariant(variant) === '20/19/18') {
		return [
			{ text: 'Celuj kolejno po jednej lotce w sektor ' },
			{ text: '20', strong: true },
			{ text: ', ' },
			{ text: '19', strong: true },
			{ text: ' i ' },
			{ text: '18', strong: true },
			{ text: '.' },
		];
	}
	return [
		{ text: 'Celuj w sektor ' },
		{ text: scoringPressureVariant(variant), strong: true },
		{ text: '.' },
	];
}

export function currentScoringPressureAim(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const length = session.darts?.length ?? 0;
	const variant = scoringPressureVariant(session.variant);
	return {
		number: variant === '20/19/18' ? ROTATION[length % VISIT_SIZE] : Number(variant),
		dartNumber: (length % VISIT_SIZE) + 1,
		rotation: variant === '20/19/18',
	};
}

function pointsFor(session, dart) {
	if (dart.ring === 'miss') {
		return 0;
	}
	const aim = currentScoringPressureAim(session);
	const number = session.variant === '20/19/18' ? dart.number : (dart.number ?? aim.number);
	if (number !== aim.number) {
		return 0;
	}
	return POINTS[dart.ring] ?? 0;
}

export function recordScoringPressureDart(session, dart) {
	if (!session || session.status !== 'playing' || !RINGS.has(dart?.ring)) {
		return session;
	}
	const aim = currentScoringPressureAim(session);
	return {
		...session,
		darts: [...session.darts, { aim: aim.number, points: pointsFor(session, dart) }],
	};
}

export function undoScoringPressureDart(session) {
	if (!session || session.darts.length === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu zostawia rzucone lotki. Każda lotka jest już rozliczona. */
export function expireScoringPressure(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		status: 'completed',
	};
}

export function scoringPressureStreak(darts) {
	let streak = 0;
	for (const dart of darts ?? []) {
		streak = dart?.points > 0 ? streak + dart.points : 0;
	}
	return streak;
}

export function scoringPressureBest(darts) {
	let streak = 0;
	let best = 0;
	for (const dart of darts ?? []) {
		if (dart?.points > 0) {
			streak += dart.points;
			if (streak > best) {
				best = streak;
			}
		} else {
			streak = 0;
		}
	}
	return best;
}

function percentOf(hits, attempts) {
	if (attempts === 0) {
		return 0;
	}
	return Math.round((hits * 100) / attempts);
}

/**
 * Skuteczność per sektor, w kolejności pierwszego celu.
 *
 * @returns {{ hits: number, attempts: number, percent: number, aims: Array<{ aim: string, attempts: number, hits: number, percent: number }> }}
 */
export function scoringPressureStats(session) {
	const darts = session?.darts ?? [];
	const aims = [];
	const byAim = new Map();
	let hits = 0;
	for (const dart of darts) {
		const key = String(dart?.aim);
		if (dart?.points > 0) {
			hits += 1;
		}
		let row = byAim.get(key);
		if (!row) {
			row = { aim: key, attempts: 0, hits: 0 };
			byAim.set(key, row);
			aims.push(row);
		}
		row.attempts += 1;
		if (dart?.points > 0) {
			row.hits += 1;
		}
	}
	return {
		hits,
		attempts: darts.length,
		percent: percentOf(hits, darts.length),
		aims: aims.map((row) => ({ ...row, percent: percentOf(row.hits, row.attempts) })),
	};
}

export function scoringPressureCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		variant: session.variant,
		completedAt,
		score: scoringPressureBest(session.darts),
		stats: scoringPressureStats(session),
		sync: 'pending',
	};
}
