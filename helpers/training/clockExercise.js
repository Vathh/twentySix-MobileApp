/**
 * Zegar szybki i zegar doubli. Jedna lotka na sektor, pudło przechodzi dalej.
 * Szybki: 1 punkt za trafienie.
 * Double: D1–D20 = 3, Outer Bull = 3, Inner Bull = 6.
 */

export const CLOCK_MECHANIC = 'clock_1_20_bull';
export const DOUBLES_CLOCK_MECHANIC = 'doubles_clock';
export const DOUBLES_AIM_TEXT = 'Celuj kolejno po jednej lotce w pole podwójne tych sektorów';
export const CLOCK_LENGTH = 21;
export const VISIT_SIZE = 3;

export function canPlayClock(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& (definition.exerciseKey === CLOCK_MECHANIC || definition.exerciseKey === DOUBLES_CLOCK_MECHANIC)
		&& definition.inactive !== true,
	);
}

/**
 * Liczba lotek z definicji ucina sekwencję od sektora 1. Powyżej 21 zostaje pełny zegar.
 *
 * @param {number|null|undefined} dartCount
 * @returns {Array<{ kind: 'sector', number: number } | { kind: 'bull' }>}
 */
export function clockTargets(dartCount) {
	const count = Number(dartCount);
	const requested = Number.isInteger(count) && count > 0 ? count : CLOCK_LENGTH;
	const length = Math.min(requested, CLOCK_LENGTH);
	const targets = [];
	for (let number = 1; number <= 20 && targets.length < length; number += 1) {
		targets.push({ kind: 'sector', number });
	}
	if (targets.length < length) {
		targets.push({ kind: 'bull' });
	}
	return targets;
}

export function targetLabel(target) {
	return target?.kind === 'bull' ? 'Bull' : String(target?.number ?? '');
}

/**
 * @param {{ kind: string, number?: number }} target
 * @param {{ number?: number, ring?: string }|null|undefined} dart
 */
export function dartHitsTarget(target, dart) {
	if (!target || !dart) {
		return false;
	}
	if (target.kind === 'bull') {
		return dart.ring === 'outer' || dart.ring === 'inner';
	}
	return dart.number === target.number
		&& (dart.ring === 'single' || dart.ring === 'double' || dart.ring === 'triple');
}

export function startClockSession(definition, clientSessionId) {
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		targets: clockTargets(definition.dartCount),
		darts: [],
	};
}

export function throwDart(session, dart) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const darts = [...session.darts, dart];
	return {
		...session,
		darts,
		status: darts.length >= session.targets.length ? 'completed' : 'playing',
	};
}

export function undoDart(session) {
	if (!session || session.darts.length === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

export function currentTarget(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	return session.targets[session.darts.length] ?? null;
}

/**
 * Trójka celów aktualnego podejścia. Ostatnie podejście może być krótsze.
 *
 * @returns {{ targets: Array, activeOffset: number, windowStart: number }|null}
 */
export function currentVisit(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const index = session.darts.length;
	if (index >= session.targets.length) {
		return null;
	}
	const start = Math.floor(index / VISIT_SIZE) * VISIT_SIZE;
	return {
		targets: session.targets.slice(start, Math.min(start + VISIT_SIZE, session.targets.length)),
		activeOffset: index - start,
		windowStart: start,
	};
}

/**
 * Lotka zgodna z celem albo pudło. W zegarze doubli trafienie sektora jest doublem.
 * Przy Bullu w doubli: bullRing = 'inner' | 'outer'.
 */
export function outcomeDart(target, hit, session, bullRing = 'outer') {
	if (!hit) {
		return { number: 0, ring: 'miss' };
	}
	if (target?.kind === 'bull') {
		const ring = session?.exerciseKey === DOUBLES_CLOCK_MECHANIC && bullRing === 'inner'
			? 'inner'
			: 'outer';
		return { number: 25, ring };
	}
	const ring = session?.exerciseKey === DOUBLES_CLOCK_MECHANIC ? 'double' : 'single';
	return { number: target.number, ring };
}

export function recordOutcome(session, hit, bullRing = 'outer') {
	const target = currentTarget(session);
	if (!target) {
		return session;
	}
	return throwDart(session, outcomeDart(target, hit, session, bullRing));
}

/**
 * Procent zaokrąglony do całości. Pusta sesja ma 0.
 *
 * @returns {{ hits: number, attempts: number, percent: number }}
 */
export function clockStats(session) {
	const attempts = session?.darts?.length ?? 0;
	let hits = 0;
	for (let index = 0; index < attempts; index += 1) {
		if (dartHitsTarget(session.targets[index], session.darts[index])) {
			hits += 1;
		}
	}
	const percent = attempts === 0 ? 0 : Math.round((hits * 100) / attempts);
	return { hits, attempts, percent };
}

/** Punkty jednej lotki w zegarze doubli. */
export function doublesClockDartPoints(target, dart) {
	if (!dartHitsTarget(target, dart)) {
		return 0;
	}
	if (target?.kind === 'bull') {
		return dart?.ring === 'inner' ? 6 : 3;
	}
	return 3;
}

/** Szybki: 1 punkt za trafienie. Doubli: D1–D20 i Outer = 3, Inner = 6. */
export function clockScore(session) {
	if (session?.exerciseKey !== DOUBLES_CLOCK_MECHANIC) {
		return clockStats(session).hits;
	}
	const darts = session?.darts ?? [];
	const targets = session?.targets ?? [];
	let score = 0;
	for (let index = 0; index < darts.length; index += 1) {
		score += doublesClockDartPoints(targets[index], darts[index]);
	}
	return score;
}

/** Zapis ukończenia. Bez lotek. */
export function clockCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: clockScore(session),
		stats: clockStats(session),
		sync: 'pending',
	};
}
