/**
 * Zegar szybki. Jedna lotka na sektor, pudło przechodzi dalej.
 * Lotki żyją tylko w trakcie; na serwer idą trafienia i procent.
 */

export const CLOCK_MECHANIC = 'clock_1_20_bull';
export const CLOCK_LENGTH = 21;
export const VISIT_SIZE = 3;

export function canPlayClock(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === CLOCK_MECHANIC
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
 * @returns {{ targets: Array, activeOffset: number }|null}
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
	};
}

/** Lotka zgodna z celem albo pudło. Pierścień nie ma znaczenia poza zaliczeniem. */
export function outcomeDart(target, hit) {
	if (!hit) {
		return { number: 0, ring: 'miss' };
	}
	if (target?.kind === 'bull') {
		return { number: 25, ring: 'outer' };
	}
	return { number: target.number, ring: 'single' };
}

export function recordOutcome(session, hit) {
	const target = currentTarget(session);
	if (!target) {
		return session;
	}
	return throwDart(session, outcomeDart(target, hit));
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

/** Zapis ukończenia. Bez lotek. Wynik punktowy tego ćwiczenia nie istnieje. */
export function clockCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: null,
		stats: clockStats(session),
		sync: 'pending',
	};
}
